import express from 'express';
import multer from 'multer';
import VisionAIService from '../services/VisionAIService.js';
import { authenticateToken } from '../middleware/auth.js';
import GamificationEngine from '../services/GamificationEngine.js';
import DailyTracking from '../models/DailyTracking.js';
import CopilotOracleService from '../services/CopilotOracleService.js';

const router = express.Router();

// Configure Multer to store uploaded files in memory temporarily
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// @desc    Upload an image for AI Analysis
// @route   POST /api/ai/analyze
// @access  Private
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // 'food', 'finance', or 'medical'
    const contextType = req.body.contextType; 
    
    // Convert the image buffer into Base64 format for Gemini
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Send it to the Brain!
    const aiAnalysis = await VisionAIService.analyzeImage(mimeType, base64Data, contextType);

    if (!aiAnalysis) {
      return res.status(500).json({ success: false, message: 'AI failed to process the image.' });
    }

    res.status(200).json({
      success: true,
      data: aiAnalysis
    });

  } catch (error) {
    console.error('AI Upload Route Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});


// @desc    Save the AI parsed data to the user's dashboard and award XP
// @route   POST /api/ai/save
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contextType, extractedData } = req.body;

    // 1. Get today's date string (e.g., "2026-05-28")
    const today = new Date().toISOString().split('T')[0];

    // 2. Find or create today's tracking record
    let dailyLog = await DailyTracking.findOne({ userId, dateString: today });
    if (!dailyLog) {
      dailyLog = new DailyTracking({ userId, dateString: today });
    }

    // 3. Setup Gamification Event
    let eventName = '';

    // 4. Update the Daily Log based on what the AI found!
    if (contextType === 'food') {
      eventName = 'AI_MEAL_LOGGED';
      dailyLog.health.caloriesConsumed += (extractedData.calories || 0);
      dailyLog.health.proteinConsumed += (extractedData.protein || 0);
    } 
    else if (contextType === 'finance') {
      eventName = 'AI_RECEIPT_LOGGED';
      if (extractedData.type === 'expense') {
        dailyLog.finance.moneySpent += (extractedData.totalAmount || 0);
      } else {
        dailyLog.finance.moneyCredited += (extractedData.totalAmount || 0);
      }
    } 
    else if (contextType === 'medical') {
      eventName = 'AI_MEDICAL_LOGGED';
      // Medical data doesn't trigger daily math, it triggers long-term AI advice
    }

    // 5. Save the updated log to MongoDB
    await dailyLog.save();

    // 6. Trigger Gamification XP
    const gamificationResult = await GamificationEngine.logEvent(userId, eventName, extractedData);

    res.status(200).json({
      success: true,
      message: 'Data synchronized with Digital Twin successfully.',
      gamification: gamificationResult,
      dailyLog // Sending the updated log back to the frontend
    });

  } catch (error) {
    console.error('AI Save Route Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
// @desc    Conversational Cross-Domain Advisory Engine
// @route   POST /api/ai/consult
// @access  Private
router.post('/consult', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Consultation parameter missing.' });
    }

    const advice = await CopilotOracleService.generateCrossDomainAdvice(userId, question);

    res.status(200).json({
      success: true,
      advice
    });
  } catch (error) {
    console.error('Consult route failure:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;