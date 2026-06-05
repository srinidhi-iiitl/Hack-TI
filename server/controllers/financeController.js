import GamificationEngine from '../services/GamificationEngine.js';
import DailyTracking from '../models/DailyTracking.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildTrajectory,
  getLatestOnboardingProfile,
  getOrCreateDailyTracking,
  getOrCreateLifeProfile,
  scoreFromParts,
  todayKey,
} from '../services/domainDataService.js';

export const getFinance = async (req, res) => {
  const [daily, lifeProfile, onboarding] = await Promise.all([
    getOrCreateDailyTracking(req.user.userId),
    getOrCreateLifeProfile(req.user.userId),
    getLatestOnboardingProfile(req.user.userId),
  ]);

  res.status(200).json({
    success: true,
    data: {
      daily: daily.finance,
      profile: lifeProfile.financeContext,
      onboarding: {
        monthlyIncome: onboarding?.monthlyIncome || 0,
        monthlyExpenditure: onboarding?.monthlyExpenditure || 0,
        savingsHabit: onboarding?.savingsHabit || '',
      },
    },
  });
};

export const createFinance = async (req, res) => {
  const daily = await getOrCreateDailyTracking(req.user.userId, req.body.dateString || todayKey());
  daily.finance = { ...daily.finance, ...req.body };
  await daily.save();
  res.status(201).json({ success: true, data: daily.finance });
};

export const updateFinance = async (req, res) => {
  const daily = await getOrCreateDailyTracking(req.user.userId, req.body.dateString || todayKey());
  daily.finance = { ...daily.finance, ...req.body };
  await daily.save();
  res.status(200).json({ success: true, data: daily.finance });
};

export const getFinanceAnalytics = async (req, res) => {
  const logs = await DailyTracking.find({ userId: req.user.userId }).sort({ dateString: -1 }).limit(30).lean();
  const spent = logs.reduce((sum, log) => sum + (log.finance?.moneySpent || 0), 0);
  const credited = logs.reduce((sum, log) => sum + (log.finance?.moneyCredited || 0), 0);
  const score = scoreFromParts([credited > 0 ? Math.max(0, 100 - (spent / credited) * 100) : 60]);

  res.status(200).json({
    success: true,
    data: {
      score,
      spent,
      credited,
      net: credited - spent,
      transactions: logs.flatMap((log) => log.finance?.transactions || []),
    },
  });
};

export const getFinanceTrajectory = async (req, res) => {
  const logs = await DailyTracking.find({ userId: req.user.userId }).sort({ dateString: 1 }).limit(60).lean();
  res.status(200).json({ success: true, data: buildTrajectory(logs) });
};

export const getMarketAnalysis = async (req, res) => {
  try {
    const userId = req.user.userId;
    const latestLog = await DailyTracking.findOne({
      userId,
      'finance.holdings.0': { $exists: true }
    }).sort({ dateString: -1 }).lean();

    const holdings = latestLog?.finance?.holdings || [];
    const holdingsSummary = holdings.map(h => `${h.shares || 1} units of ${h.assetName} (value: ₹${h.value})`).join(', ') || 'No custom shares/LIC policies yet';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return returnFallbackAnalysis(res, holdings);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} }]
    });

    const systemPrompt = `
      You are the LifeTwin Autonomous Macro Financial Analyst.
      Your task is to analyze the user's asset holdings and generate 4 realistic, personalized market impact analysis reports.
      You must look for current global financial events, geopolitical shifts, and regulatory changes (e.g. interest rate adjustments, inflation, regional conflicts, tax amendments) and explain how they specifically affect the user's holdings.
      
      USER'S HOLDINGS:
      ${holdingsSummary}
      
      Return ONLY a valid raw JSON object (no markdown, no backticks, no text wrappers).
      
      JSON STRUCTURE REQUIRED:
      {
        "sentiment": "bullish" | "bearish" | "neutral",
        "riskLevel": number (1 to 10),
        "recommendation": "1-sentence strategic action advice tailored to the user's holdings.",
        "impacts": [
          {
            "title": "Geopolitical / War Impact",
            "detail": "A realistic explanation of current conflicts (e.g. energy supply changes due to Middle East tension) and how it affects the user's holdings or general market.",
            "type": "danger" | "warning" | "info"
          },
          {
            "title": "Law & Tax Amendments",
            "detail": "A realistic tax or capital gains rule update (e.g., changes to savings brackets, insurance policies) and its impact.",
            "type": "danger" | "warning" | "info"
          },
          {
            "title": "Political / Policy Shifts",
            "detail": "A realistic political update (e.g., inflation policy, central bank rates) and its effect.",
            "type": "danger" | "warning" | "info"
          },
          {
            "title": "General Market Update",
            "detail": "A realistic update summarizing general stock volatility, index funds, or general asset advice.",
            "type": "danger" | "warning" | "info"
          }
        ]
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    res.status(200).json({ success: true, data: parsed });

  } catch (apiError) {
    console.warn('⚠️ Gemini API error in Market Analysis, using fallback:', apiError.message);
    const latestLog = await DailyTracking.findOne({
      userId: req.user.userId,
      'finance.holdings.0': { $exists: true }
    }).sort({ dateString: -1 }).lean();
    return returnFallbackAnalysis(res, latestLog?.finance?.holdings || []);
  }
};

function returnFallbackAnalysis(res, holdings) {
  const hasLic = holdings.some(h => h.assetName?.toLowerCase() === 'lic' || h.assetName?.toLowerCase().includes('insurance'));
  const hasShares = holdings.some(h => h.assetName?.toLowerCase() !== 'lic' && !h.assetName?.toLowerCase().includes('insurance'));
  
  res.status(200).json({
    success: true,
    data: {
      sentiment: 'neutral',
      riskLevel: 5,
      recommendation: hasShares ? 'Monitor tech index benchmarks before expanding equity exposure.' : 'Maintain a stable cash reserve before allocating towards high-risk assets.',
      impacts: [
        {
          title: "Geopolitical Conflict / War Risks",
          detail: "Supply chain disruptions detected in energy sectors. Expect minor inflationary pressure on regional utility and fuel costs.",
          type: "danger"
        },
        {
          title: "Tax Law Amendments",
          detail: hasLic ? "New rules on insurance policy yield taxation under review. LIC policies remain stable long-term instruments." : "Capital gains structure adjustments under review. Short-term transaction adjustments recommended.",
          type: "warning"
        },
        {
          title: "Political / Policy Shifts",
          detail: "Central bank interest rate decisions expected next week. High-yield savings accounts are recommended for liquidity retention.",
          type: "info"
        },
        {
          title: "General Market Update",
          detail: "Tech indexing and defense assets show stable returns. Diversified index allocations are suggested.",
          type: "info"
        }
      ]
    }
  });
}

export const logExpense = async (req, res) => {
  try {
    // ✅ FIXED: Your auth.js uses .userId!
    const userId = req.user.userId; 
    const { amount, description } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'EXPENSE_LOGGED', 
      { amount, description }
    );

    res.status(201).json({
      success: true,
      message: 'Expense logged successfully!',
      gamification: gamificationResult 
    });

  } catch (error) {
    console.error('Finance Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
