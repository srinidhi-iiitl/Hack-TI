import GamificationEngine from '../services/GamificationEngine.js';
import DailyTracking from '../models/DailyTracking.js';
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
  const onboarding = await getLatestOnboardingProfile(req.user.userId);
  res.status(200).json({
    success: true,
    data: {
      sentiment: 'neutral',
      riskLevel: onboarding?.financialStressLevel || 5,
      recommendation: 'Keep emergency savings stable before increasing high-risk exposure.',
      source: 'fallback',
    },
  });
};

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
