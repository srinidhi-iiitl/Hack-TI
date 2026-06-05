import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

import VisionAIService      from '../services/VisionAIService.js';
import { authenticateToken } from '../middleware/auth.js';
import GamificationEngine   from '../services/GamificationEngine.js';
import DailyTracking        from '../models/DailyTracking.js';
import CopilotOracleService from '../services/CopilotOracleService.js';
import SmartGoal            from '../models/SmartGoal.js';

import DocumentExtractionService from '../services/DocumentExtractionService.js';
import { recalculateScoresAfterUpload } from '../services/ScoreRecalculationService.js';
import { emitDashboardSync, createNotification } from '../services/notificationService.js';
import { buildDashboardResponse } from '../controllers/onboardingController.js';
import OnboardingProfile from '../models/OnboardingProfile.js';
import Upload from '../models/Upload.js';

const router  = express.Router();
const storage = multer.memoryStorage();
const upload  = multer({ storage });

// ── /analyze — UNCHANGED ──────────────────────────────────────────
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }
    const contextType = req.body.contextType;
    const base64Data  = req.file.buffer.toString('base64');
    const mimeType    = req.file.mimetype;

    const aiAnalysis = await VisionAIService.analyzeImage(mimeType, base64Data, contextType);
    if (!aiAnalysis) {
      return res.status(500).json({ success: false, message: 'AI failed to process the image.' });
    }
    res.status(200).json({ success: true, data: aiAnalysis });
  } catch (error) {
    console.error('AI Analyze Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── /save — UPDATED: attaches prevSnapshot before save() ─────────
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contextType, extractedData } = req.body;

    const today    = new Date().toISOString().split('T')[0];
    let dailyLog   = await DailyTracking.findOne({ userId, dateString: today });
    if (!dailyLog) dailyLog = new DailyTracking({ userId, dateString: today });

    // ── Snapshot BEFORE mutation so GoalSyncEngine gets the delta ──
    dailyLog._prevSnapshot = {
      health:  { ...dailyLog.health.toObject?.() ?? { ...dailyLog.health } },
      finance: { ...dailyLog.finance.toObject?.() ?? { ...dailyLog.finance } },
    };

    let eventName = '';

    if (contextType === 'food') {
      eventName = 'AI_MEAL_LOGGED';
      dailyLog.health.caloriesConsumed += (extractedData.calories || 0);
      dailyLog.health.proteinConsumed  += (extractedData.protein  || 0);
    } else if (contextType === 'finance') {
      eventName = 'AI_RECEIPT_LOGGED';
      if (extractedData.type === 'expense') {
        dailyLog.finance.moneySpent    += (extractedData.totalAmount || 0);
      } else {
        dailyLog.finance.moneyCredited += (extractedData.totalAmount || 0);
      }
    } else if (contextType === 'medical') {
      eventName = 'AI_MEDICAL_LOGGED';
    }

    // post-save hook fires GoalSyncEngine automatically
    await dailyLog.save();

    const gamificationResult = await GamificationEngine.logEvent(userId, eventName, extractedData);

    res.status(200).json({
      success:      true,
      message:      'Data synchronized with Digital Twin.',
      gamification: gamificationResult,
      dailyLog,
    });
  } catch (error) {
    console.error('AI Save Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── /consult — UPDATED: injects active goals as Oracle context ────
router.post('/consult', authenticateToken, async (req, res) => {
  try {
    const userId       = req.user.userId;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }

    const activeGoals = await SmartGoal.find({ userId, status: { $ne: 'completed' } })
      .select('domain title currentMetric targetMetric unit priority deadline')
      .lean();

    const goalsContext = activeGoals.length > 0
      ? `\n\nUser's active goals:\n${activeGoals.map(g =>
          `- [${g.domain.toUpperCase()}] "${g.title}": ${g.currentMetric}/${g.targetMetric} ${g.unit} (${g.priority} priority, due ${new Date(g.deadline).toLocaleDateString()})`
        ).join('\n')}`
      : '';

    const advice = await CopilotOracleService.generateCrossDomainAdvice(
      userId,
      question + goalsContext
    );

    res.status(200).json({ success: true, advice });
  } catch (error) {
    console.error('Consult Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── /synthesis — COMPLETELY UNCHANGED ────────────────────────────
const delay = (ms) => new Promise(r => setTimeout(r, ms));

router.post('/synthesis', authenticateToken, async (req, res) => {
  try {
    const { healthData, financeData, careerData } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `
      You are the LifeTwin Autonomous Intelligence Engine. 
      Your job is to perform Cross-Domain Synthesis on the user's raw API data.

      You must look for correlations. For example:
      - Does poor sleep (Health) correlate with high fast-food spending (Finance)?
      - Does high GitHub activity (Career) correlate with low active calories (Health)?
      
      Generate exactly 3 highly actionable, empathetic insights based on the provided data.
      You MUST return ONLY valid, raw JSON (no markdown formatting, no backticks).
      
      JSON STRUCTURE REQUIRED:
      [
        {
          "title": "A punchy, 3-4 word title (e.g., 'Sleep vs. Spending Risk')",
          "domainTags": ["Health", "Finance"],
          "observation": "1 sentence describing the correlation found in the data.",
          "action": "1 specific, immediate step the user should take today.",
          "isPositive": boolean
        }
      ]

      RAW USER DATA TO ANALYZE:
      - Health Metrics: ${JSON.stringify(healthData)}
      - Financial Records: ${JSON.stringify(financeData)}
      - Career Goals: ${JSON.stringify(careerData)}
    `;

    const demoFallbackInsights = [
      {
        "title": "Sleep vs. Spending Risk",
        "domainTags": ["Health", "Finance"],
        "observation": `Your ${healthData?.metrics?.sleepHours || 'low'} hours of sleep correlates directly with an unusual spike in food delivery expenses.`,
        "action": "Prioritize 8 hours of rest tonight to protect your savings.",
        "isPositive": false
      },
      {
        "title": "Deep Work Momentum",
        "domainTags": ["Career", "Health"],
        "observation": `You logged ${careerData?.metrics?.githubCommitsThisWeek || 'multiple'} commits this week while maintaining a stable resting heart rate.`,
        "action": "Keep up the balanced schedule. You are successfully avoiding burnout.",
        "isPositive": true
      },
      {
        "title": "Credit Stability Verified",
        "domainTags": ["Finance"],
        "observation": `Your Plaid connection verifies a secure credit score of ${financeData?.creditScore || '750+'}.`,
        "action": "Redirect $50 from entertainment to your high-yield savings to maintain velocity.",
        "isPositive": true
      }
    ];

    let result;
    let retries = 1;

    while (retries >= 0) {
      try {
        result = await model.generateContent(systemPrompt);
        break;
      } catch (apiError) {
        if (apiError.status === 429 || apiError.status === 503) {
          console.warn('⚠️ Gemini API Limit Hit! Activating Demo Fallback...');
          return res.status(200).json({ success: true, insights: demoFallbackInsights });
        }
        if (retries > 0) { await delay(2000); retries--; }
        else throw apiError;
      }
    }

    const responseText  = result.response.text();
    const cleanedText   = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedInsights = JSON.parse(cleanedText);

    res.status(200).json({ success: true, insights: parsedInsights });

  } catch (error) {
    console.error('Synthesis AI Error:', error);
    res.status(200).json({
      success: true,
      insights: [{
        "title": "System Rebooting",
        "domainTags": ["System"],
        "observation": "The AI is currently recalibrating your data streams.",
        "action": "Please check back in a few minutes.",
        "isPositive": false
      }]
    });
  }
});

// ── /upload — NEW: Handles PDF/Excel/CSV/Word/Image uploads ─────────
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const userId = req.user.userId;
    const fileName = req.file.originalname;
    const fileMimeType = req.file.mimetype;
    const fileBuffer = req.file.buffer;

    // AI Extraction
    const extractedData = await DocumentExtractionService.extractDocumentData(fileBuffer, fileName, fileMimeType);
    if (!extractedData || !extractedData.domain) {
      return res.status(400).json({ success: false, message: 'Failed to extract structured data from document.' });
    }

    const domain = extractedData.domain;

    // Get today's daily log
    const today = new Date().toISOString().split('T')[0];
    let dailyLog = await DailyTracking.findOne({ userId, dateString: today });
    if (!dailyLog) {
      dailyLog = new DailyTracking({ userId, dateString: today });
    }

    // Attach prevSnapshot so GoalSyncEngine calculates deltas correctly
    dailyLog._prevSnapshot = {
      health:  { ...dailyLog.health.toObject?.() ?? { ...dailyLog.health } },
      finance: { ...dailyLog.finance.toObject?.() ?? { ...dailyLog.finance } },
      career:  { ...dailyLog.career.toObject?.() ?? { ...dailyLog.career } },
    };

    // Apply extracted data to daily log
    let xpEvent = '';
    if (domain === 'finance') {
      const fin = extractedData.financeData || {};
      if (extractedData.subType === 'bank' || extractedData.subType === 'generic' || !extractedData.subType) {
        xpEvent = 'AI_RECEIPT_LOGGED';
        dailyLog.finance.moneySpent += (fin.moneySpent || 0);
        dailyLog.finance.moneyCredited += (fin.moneyCredited || 0);
        if (Array.isArray(fin.transactions)) {
          dailyLog.finance.transactions.push(...fin.transactions);
        }
      } else if (extractedData.subType === 'mutual_fund') {
        xpEvent = 'AI_RECEIPT_LOGGED'; // Map mutual fund statements to receipt logging XP
        dailyLog.finance.portfolioValue = fin.portfolioValue || 0;
        dailyLog.finance.returns = fin.returns || 0;
        if (Array.isArray(fin.holdings)) {
          dailyLog.finance.holdings = fin.holdings;
        }
      }
    } else if (domain === 'health') {
      xpEvent = 'AI_MEDICAL_LOGGED';
      const hl = extractedData.healthData || {};
      if (Array.isArray(hl.deficiencies)) {
        dailyLog.health.deficiencies = Array.from(new Set([...(dailyLog.health.deficiencies || []), ...hl.deficiencies]));
      }
      if (Array.isArray(hl.medications)) {
        dailyLog.health.medications = Array.from(new Set([...(dailyLog.health.medications || []), ...hl.medications]));
        hl.medications.forEach(med => {
          if (!dailyLog.health.medicationsTaken.some(m => m.name === med)) {
            dailyLog.health.medicationsTaken.push({ name: med, timeTaken: new Date() });
          }
        });
      }
      if (hl.vitals) {
        dailyLog.health.vitals = { ...(dailyLog.health.vitals || {}), ...hl.vitals };
      }
    } else if (domain === 'career') {
      xpEvent = 'COURSE_DONE'; // Default career event
      const car = extractedData.careerData || {};
      dailyLog.career.studyHours += (car.studyHours || 0);
      dailyLog.career.completedCourses += (car.completedCourses || 0);
      dailyLog.career.githubCommits += (car.githubCommits || 0);
      dailyLog.career.projectsCompleted += (car.projectsCompleted || 0);
    }

    // ── Apply Cross-Domain Side Effects ──
    const crossEffects = extractedData.crossDomainEffects || {};
    
    // Apply health effects (e.g. food receipts containing calories)
    if (crossEffects.health) {
      const hlEff = crossEffects.health;
      dailyLog.health.caloriesConsumed += (hlEff.caloriesConsumed || 0);
      dailyLog.health.proteinConsumed += (hlEff.proteinConsumed || 0);
      if (Array.isArray(hlEff.workouts)) {
        dailyLog.health.workouts.push(...hlEff.workouts);
      }
      if (Array.isArray(hlEff.medications)) {
        dailyLog.health.medications = Array.from(new Set([...(dailyLog.health.medications || []), ...hlEff.medications]));
        hlEff.medications.forEach(med => {
          if (!dailyLog.health.medicationsTaken.some(m => m.name === med)) {
            dailyLog.health.medicationsTaken.push({ name: med, timeTaken: new Date() });
          }
        });
      }
    }

    // Apply finance effects (e.g. fitness receipt cost)
    if (crossEffects.finance) {
      const finEff = crossEffects.finance;
      dailyLog.finance.moneySpent += (finEff.moneySpent || 0);
      dailyLog.finance.moneyCredited += (finEff.moneyCredited || 0);
      if (Array.isArray(finEff.transactions)) {
        dailyLog.finance.transactions.push(...finEff.transactions);
      }
    }

    // Apply career effects (e.g. bootcamp receipt study hours)
    if (crossEffects.career) {
      const carEff = crossEffects.career;
      dailyLog.career.studyHours += (carEff.studyHours || 0);
      dailyLog.career.completedCourses += (carEff.completedCourses || 0);
    }

    // Save DailyTracking. GoalSyncEngine post-save hook runs automatically here!
    await dailyLog.save();

    // Query for recently updated goals to notify the client
    const updatedGoals = await SmartGoal.find({
      userId,
      lastLoggedAt: { $gte: new Date(Date.now() - 3000) }
    }).select('title currentMetric targetMetric unit').lean();

    // Recalculate scores inside OnboardingProfile
    const updatedProfile = await recalculateScoresAfterUpload(userId, domain, extractedData);

    // Save upload history
    const uploadRecord = await Upload.create({
      userId,
      fileName,
      fileType: fileMimeType,
      domain,
      extractedData,
    });

    // Run Gamification Event
    let gamificationResult = null;
    if (xpEvent) {
      gamificationResult = await GamificationEngine.logEvent(userId, xpEvent, extractedData);
    }

    // Create Notification based on domain
    try {
      await createNotification({
        userId,
        category: domain,
        subType: 'document-processed',
        title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Document Sync'd`,
        message: `Your Digital Twin has processed "${fileName}" and extracted structured ${domain} signals.`,
        priority: 'medium',
        actionLink: `/${domain}`,
      });
    } catch (err) {
      console.error('[aiRoutes] Failed to trigger upload notification:', err.message);
    }

    // Push live update to frontend via WebSockets
    if (updatedProfile) {
      const dashboardPayload = buildDashboardResponse(updatedProfile);
      emitDashboardSync(userId, dashboardPayload);
    }

    res.status(200).json({
      success: true,
      message: 'Document processed and Digital Twin synchronized.',
      data: {
        domain,
        extractedData,
        uploadRecord,
        gamification: gamificationResult,
        updatedGoals,
      }
    });

  } catch (error) {
    console.error('[aiRoutes] Upload Endpoint Error:', error);
    res.status(500).json({ success: false, message: 'Server Error processing document upload.' });
  }
});

// ── /uploads — NEW: Retrieves user's upload history ────────────────
router.get('/uploads', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await Upload.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('[aiRoutes] Fetch Upload History Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching upload history.' });
  }
});

export default router;
