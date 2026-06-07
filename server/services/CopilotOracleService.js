import { GoogleGenerativeAI } from '@google/generative-ai';
import DailyTracking from '../models/DailyTracking.js';
import LifeProfile from '../models/LifeProfile.js';
import SmartGoal from '../models/SmartGoal.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let geminiQuotaBlockedUntil = 0;

function hasUsableGeminiKey() {
  const key = String(process.env.GEMINI_API_KEY || '').trim();
  return key.length > 30 && !key.includes('your_') && !key.toLowerCase().includes('placeholder');
}

function extractJsonObject(text = '') {
  const cleaned = String(text).replace(/```json/g, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

function normalizeOracleAdvice(value, fallback) {
  const advice = value && typeof value === 'object' ? value : {};
  return {
    verdict: String(advice.verdict || fallback.verdict),
    riskLevel: ['Low', 'Medium', 'High'].includes(advice.riskLevel) ? advice.riskLevel : fallback.riskLevel,
    impacts: Array.isArray(advice.impacts) ? advice.impacts.slice(0, 4) : fallback.impacts,
    action: String(advice.action || fallback.action),
  };
}

function getRetryDelayMs(error) {
  const message = String(error?.message || error || '');
  const retryMatch = message.match(/retryDelay":"(\d+)s"/i) || message.match(/retry in ([\d.]+)s/i);
  if (!retryMatch) return 60_000;
  return Math.max(Math.ceil(Number(retryMatch[1]) * 1000), 15_000);
}

function isQuotaError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('429 too many requests') || message.includes('quota exceeded') || message.includes('free_tier_requests');
}

function buildLocalOracleAdvice(userQuestion = '', dailyLog = null, activeGoals = []) {
  const question = String(userQuestion).toLowerCase();
  const spentToday = Number(dailyLog?.finance?.moneySpent || 0);
  const hasFinanceGoal = activeGoals.some((goal) => goal.domain === 'finance');
  const hasHealthGoal = activeGoals.some((goal) => goal.domain === 'health');
  const isDinner = /\bdinner|eat out|restaurant|outside food|delivery|order food\b/i.test(question);
  const isSpending = /\bspend|buy|purchase|budget|money|dinner|restaurant\b/i.test(question);

  if (isDinner) {
    return {
      verdict: hasFinanceGoal || hasHealthGoal
        ? 'Dinner outside is okay if you keep it planned, but it can affect both your spending and health goals today.'
        : 'Dinner outside is fine if it fits your budget and you choose a lighter meal.',
      riskLevel: spentToday > 2500 ? 'High' : hasFinanceGoal || hasHealthGoal ? 'Medium' : 'Low',
      impacts: [
        hasHealthGoal && { domain: 'Health', detail: 'Restaurant meals can push calories, salt, and oil higher than home food.' },
        hasFinanceGoal && { domain: 'Finance', detail: `You have already spent Rs ${spentToday.toLocaleString('en-IN')} today, so dinner should stay within a fixed limit.` },
        { domain: 'Career', detail: 'A short planned dinner is low risk, but late timing can reduce recovery and focus tomorrow.' },
      ].filter(Boolean),
      action: 'Set a dinner budget before leaving and choose one protein-rich main dish instead of adding multiple extras.',
    };
  }

  if (isSpending) {
    return {
      verdict: 'Make the spend only if it supports an active goal or stays inside today\'s budget.',
      riskLevel: spentToday > 2500 ? 'High' : 'Medium',
      impacts: [
        { domain: 'Finance', detail: `Today's tracked spending is Rs ${spentToday.toLocaleString('en-IN')}.` },
        { domain: 'Health', detail: 'Money stress can affect recovery if spending feels unplanned.' },
      ],
      action: 'Decide the maximum amount first, then log the expense after purchase.',
    };
  }

  return {
    verdict: 'I can answer this from your current goals and daily signals, but Gemini is unavailable right now so this is a local fallback.',
    riskLevel: 'Medium',
    impacts: activeGoals.slice(0, 3).map((goal) => ({
      domain: goal.domain?.charAt(0).toUpperCase() + goal.domain?.slice(1),
      detail: `"${goal.title}" is currently at ${goal.currentMetric}/${goal.targetMetric} ${goal.unit}.`,
    })),
    action: 'Retry after checking the Gemini API key, or ask a more specific health, finance, or career question.',
  };
}

class CopilotOracleService {

  // ── UNCHANGED ─────────────────────────────────────────────────────────────
  static async generateCrossDomainAdvice(userId, userQuestion) {
    try {
      const todayString = new Date().toISOString().split('T')[0];

      const [dailyLog, lifeProfile, activeGoals] = await Promise.all([
        DailyTracking.findOne({ userId, dateString: todayString }),
        LifeProfile.findOne({ userId }),
        SmartGoal.find({ userId, status: { $in: ['active', 'at-risk'] } })
      ]);

      const formattedGoals = activeGoals.map(g =>
        `[${g.domain.toUpperCase()}] ${g.title}: Aiming for ${g.targetMetric}${g.unit} by ${new Date(g.deadline).toDateString()}. Current progress: ${g.currentMetric}${g.unit}. Priority: ${g.priority}.`
      ).join('\n');

      const fallbackAdvice = buildLocalOracleAdvice(userQuestion, dailyLog, activeGoals);

      if (!hasUsableGeminiKey()) {
        console.warn('Oracle Engine using local fallback: GEMINI_API_KEY is missing or invalid.');
        return JSON.stringify(fallbackAdvice);
      }

      if (Date.now() < geminiQuotaBlockedUntil) {
        console.warn(`Oracle Engine using local fallback: Gemini quota cooldown active for ${Math.ceil((geminiQuotaBlockedUntil - Date.now()) / 1000)}s.`);
        return JSON.stringify(fallbackAdvice);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const systemContext = `
        You are LifeTwin Copilot, an omniscient, predictive advisor. You analyze how a choice in one domain cascadingly impacts others.
        
        USER'S ACTIVE S.M.A.R.T GOALS:
        ${formattedGoals || 'No active goals set yet.'}

        USER METRIC PROFILE:
        - Health Target: ${lifeProfile?.healthContext?.dailyCalorieTarget || 2000} kcal/day. 
        - Finance Profile: Spent today: ₹${dailyLog?.finance?.moneySpent || 0}, Credited today: ₹${dailyLog?.finance?.moneyCredited || 0}
        - Current Stress Level recorded: ${dailyLog?.health?.stressLevel || 'Moderate'}
        
        CRITICAL RULES:
        1. Always align your advice with the user's active SMART Goals.
        2. You MUST return ONLY valid, raw JSON (no markdown formatting, no backticks).
        
        JSON STRUCTURE REQUIRED:
        {
          "verdict": "A punchy, 1-2 sentence final decision.",
          "riskLevel": "Low" | "Medium" | "High",
          "impacts": [
            { "domain": "Health" | "Finance" | "Career", "detail": "1 short sentence explaining the ripple effect." }
          ],
          "action": "One specific, immediate step the user should take right now."
        }
      `;

      const response     = await model.generateContent([systemContext, userQuestion]);
      const responseText = response.response.text();
      const parsed       = JSON.parse(extractJsonObject(responseText));
      return JSON.stringify(normalizeOracleAdvice(parsed, fallbackAdvice));

    } catch (error) {
      if (isQuotaError(error)) {
        const retryDelayMs = getRetryDelayMs(error);
        geminiQuotaBlockedUntil = Date.now() + retryDelayMs;
        console.warn(`Oracle Engine quota limit reached. Using local fallback for ${Math.ceil(retryDelayMs / 1000)}s.`);
      } else {
        console.error('Oracle Engine Error:', error?.message || error);
      }
      return JSON.stringify(buildLocalOracleAdvice(userQuestion));
    }
  }

  // ── NEW: Generate personalised AI roadmap for a single goal ───────────────
  static async generateGoalRoadmap(userId, goal) {
    try {
      if (!hasUsableGeminiKey() || Date.now() < geminiQuotaBlockedUntil) {
        throw new Error('Gemini unavailable; using roadmap fallback.');
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Pull today's log for extra context
      const todayString = new Date().toISOString().split('T')[0];
      const dailyLog    = await DailyTracking.findOne({ userId, dateString: todayString });

      const daysLeft     = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);
      const pct          = Math.round((goal.currentMetric / goal.targetMetric) * 100);
      const remaining    = goal.targetMetric - goal.currentMetric;
      const weeklyTarget = daysLeft > 0
        ? Math.ceil(remaining / Math.max(daysLeft / 7, 1))
        : remaining;

      const prompt = `
        You are a world-class life coach and strategic advisor embedded inside a Digital Twin app.
        
        Generate a detailed, actionable roadmap for this specific SMART goal.
        
        GOAL DETAILS:
        - Title: "${goal.title}"
        - Domain: ${goal.domain}
        - Progress: ${goal.currentMetric} / ${goal.targetMetric} ${goal.unit} (${pct}% done)
        - Days remaining: ${daysLeft}
        - Priority: ${goal.priority}
        - Current streak: ${goal.streak || 0} days
        
        CONTEXT:
        - Today's calories tracked: ${dailyLog?.health?.caloriesConsumed || 0}
        - Today's money spent: ₹${dailyLog?.finance?.moneySpent || 0}
        - Note: Progress updates autonomously from connected data streams (meal scans, receipt scans, health logs)
        
        INSTRUCTIONS:
        - The roadmap must feel personal, not generic.
        - Milestones must use the actual unit (${goal.unit}).
        - Daily actions must be specific and achievable in under 15 minutes.
        - Risks must be specific to this goal type, not generic advice.
        - You MUST return ONLY valid raw JSON (no markdown, no backticks).
        
        JSON STRUCTURE:
        {
          "overview": "2-3 sentence personalised strategy overview for this exact goal",
          "weeklyTarget": ${weeklyTarget},
          "milestones": [
            { "label": "25% milestone", "target": ${Math.round(goal.targetMetric * 0.25)}, "tip": "Specific advice for this milestone" },
            { "label": "50% milestone", "target": ${Math.round(goal.targetMetric * 0.5)},  "tip": "Specific advice for this milestone" },
            { "label": "75% milestone", "target": ${Math.round(goal.targetMetric * 0.75)}, "tip": "Specific advice for this milestone" },
            { "label": "Goal complete", "target": ${goal.targetMetric},                    "tip": "What to do after achieving it" }
          ],
          "dailyActions": [
            "Specific daily action 1 (under 15 min)",
            "Specific daily action 2 (under 15 min)",
            "Specific daily action 3 (under 15 min)"
          ],
          "risks": [
            "Most common failure mode for this specific goal type",
            "Second biggest risk given user's current progress"
          ]
        }
      `;

      const response    = await model.generateContent(prompt);
      const raw         = response.response.text();
      const cleaned     = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed      = JSON.parse(cleaned);

      // Always ensure weeklyTarget is set
      if (!parsed.weeklyTarget) parsed.weeklyTarget = weeklyTarget;

      return parsed;

    } catch (error) {
      if (isQuotaError(error)) {
        const retryDelayMs = getRetryDelayMs(error);
        geminiQuotaBlockedUntil = Date.now() + retryDelayMs;
        console.warn(`Roadmap Gemini quota limit reached. Using fallback for ${Math.ceil(retryDelayMs / 1000)}s.`);
      } else if (error?.message !== 'Gemini unavailable; using roadmap fallback.') {
        console.error('Roadmap Generation Error:', error);
      }

      // Graceful fallback — never returns null
      const daysLeft     = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);
      const remaining    = goal.targetMetric - goal.currentMetric;
      const weeklyTarget = Math.ceil(remaining / Math.max(daysLeft / 7, 1));

      return {
        overview: `To reach ${goal.targetMetric} ${goal.unit}, you need to add ${weeklyTarget} ${goal.unit} per week. Your Digital Twin is tracking this automatically from your connected data streams.`,
        weeklyTarget,
        milestones: [
          { label: '25% milestone', target: Math.round(goal.targetMetric * 0.25), tip: 'Build the habit first. Consistency beats intensity at this stage.' },
          { label: '50% milestone', target: Math.round(goal.targetMetric * 0.5),  tip: 'Halfway there. Reassess your strategy and double down on what is working.' },
          { label: '75% milestone', target: Math.round(goal.targetMetric * 0.75), tip: 'The final stretch. Protect your streak and avoid backsliding.' },
          { label: 'Goal complete', target: goal.targetMetric,                    tip: 'Celebrate the win, then immediately set the next level target.' },
        ],
        dailyActions: [
          'Check your progress dashboard for 60 seconds every morning',
          'Log one related data point (meal scan, receipt scan) to trigger auto-sync',
          'Review your weekly target every Sunday and adjust pace if needed',
        ],
        risks: [
          'Skipping data syncs breaks the streak and stalls progress tracking',
          'Setting a deadline too aggressive leads to early abandonment — reassess if needed',
        ],
      };
    }
  }
}

export default CopilotOracleService;
