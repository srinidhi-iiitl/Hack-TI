import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  connectFitbandIntegration,
  connectGithubIntegration,
  connectIntegration,
  connectLeetcodeIntegration,
  connectLinkedinIntegration,
  disconnectIntegration,
  getGithubIntegration,
  getIntegrationStatus,
  getLeetcodeIntegration,
  updateIntegration,
  getHackerrankIntegration,   // NEW
  getCodeforcesIntegration,   // NEW
} from '../controllers/integrationController.js';
import OnboardingProfile from '../models/OnboardingProfile.js';
import DailyTracking from '../models/DailyTracking.js';
import DailyUpdate from '../models/DailyUpdate.js';
import Upload from '../models/Upload.js';
import { todayKey } from '../services/domainDataService.js';

const router = express.Router();

const simulateNetwork = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── /health — UNCHANGED ───────────────────────────────────────────────────────
router.get('/health', authenticateToken, async (req, res) => {
  await simulateNetwork(800);

  const today  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const userId = String(req.user?.userId || 'default');
  const seed   = parseInt(today, 10) + userId.charCodeAt(0) + (userId.charCodeAt(1) || 0);

  const rng = (offset, min, max) => {
    const x = Math.sin(seed + offset) * 10000;
    const t = x - Math.floor(x);
    return Math.floor(t * (max - min + 1)) + min;
  };

  const steps          = rng(1, 5500, 11800);
  const sleepHours     = parseFloat((rng(2, 45, 85) / 10).toFixed(1));
  const avgHeartRate   = rng(3, 62, 84);
  const restingHR      = rng(4, 58, 78);
  const hrv            = rng(5, 32, 78);
  const activeCalories = rng(6, 280, 880);

  const mockHealthData = {
    source: 'Fitbit (Demo)', lastSync: new Date().toISOString(),
    metrics: { steps, activeCalories, sleepHours, avgHeartRate, restingHeartRate: restingHR, hrv },
  };

  let goalsUpdated = [];
  let totalXP = 0;
  try {
    const userId = req.user.userId;
    const todayStr = todayKey();
    let daily = await DailyTracking.findOne({ userId, dateString: todayStr });
    if (!daily) daily = new DailyTracking({ userId, dateString: todayStr });

    daily._prevSnapshot = {
      health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: (daily.health.workouts||[]).map(w=>({type:w.type,durationMinutes:w.durationMinutes})) },
      finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
    };

    if (sleepHours     > (daily.health.sleepHours      || 0)) daily.health.sleepHours      = sleepHours;
    if (activeCalories > (daily.health.caloriesConsumed || 0)) daily.health.caloriesConsumed = activeCalories;

    if (!daily.health.vitals) daily.health.vitals = {};
    if (steps > (daily.health.vitals.steps || 0)) {
      daily.health.vitals.steps = steps;
      daily.markModified('health.vitals');
    }

    console.log(`[IntegrationRoutes] /health: saving DailyTracking dailyLog for userId=${userId}`);
    daily._skipGoalSync = true;
    await daily.save();

    console.log(`[IntegrationRoutes] /health: executing explicit GoalSyncEngine`);
    const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');
    goalsUpdated = await GoalSyncEngine.syncGoalsFromDailyLog(
      userId,
      daily,
      daily._prevSnapshot || null
    );

    const { default: GamificationService } = await import('../services/GamificationService.js');
    await GamificationService.evaluateRules(userId);

    const { default: GamificationProfile } = await import('../models/GamificationProfile.js');
    const profile = await GamificationProfile.findOne({ userId });
    totalXP = profile ? profile.totalXP : 0;
  } catch (syncErr) {
    console.error('Integration health sync error:', syncErr.message);
  }

  res.status(200).json({ success: true, data: mockHealthData, totalXP, goalProgress: goalsUpdated, goalsUpdated });
});

// ── /finance — UNCHANGED ──────────────────────────────────────────────────────
router.get('/finance', authenticateToken, async (req, res) => {
  try {
    await simulateNetwork(1000);
    const userId = req.user.userId;

    // 1. Get onboarding profile for monthly baseline salary/spending
    const onboarding = await OnboardingProfile.findOne({ userId }).sort({ updatedAt: -1 }).lean();
    const baseSalary = onboarding?.monthlyIncome || 0;
    const baseExpenditure = onboarding?.monthlyExpenditure || 0;

    // 2. Fetch current month's real user finance inputs
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const dateStringPrefix = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`;

    const [dailyUpdatesThisMonth, financeUploadsThisMonth] = await Promise.all([
      DailyUpdate.find({
        userId,
        date: { $regex: new RegExp('^' + dateStringPrefix) }
      }).lean(),
      Upload.find({
        userId,
        domain: 'finance',
        createdAt: { $gte: startOfMonth }
      }).sort({ createdAt: -1 }).lean(),
    ]);

    const actualSpentThisMonth = dailyUpdatesThisMonth.reduce((sum, update) => sum + extractDailyUpdateExpenseTotal(update), 0);
    const actualCreditedThisMonth = dailyUpdatesThisMonth.reduce((sum, update) => sum + extractDailyUpdateIncomeTotal(update), 0);
    const uploadedExpenseTotal = financeUploadsThisMonth.reduce((sum, upload) => sum + extractUploadExpenseTotal(upload), 0);
    const uploadedIncomeTotal = financeUploadsThisMonth.reduce((sum, upload) => sum + extractUploadIncomeTotal(upload), 0);

    // 3. Fetch latest holdings
    const latestLogWithHoldings = await DailyTracking.findOne({
      userId,
      'finance.holdings.0': { $exists: true }
    }).sort({ dateString: -1 }).lean();

    const holdings = latestLogWithHoldings?.finance?.holdings || [];
    const portfolioValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);

    // 4. Calculate total salary & monthly expenses
    const liveExpenseTotal = actualSpentThisMonth + uploadedExpenseTotal;
    const totalSalary = baseSalary + actualCreditedThisMonth + uploadedIncomeTotal;
    const monthlyExpenses = liveExpenseTotal > 0 ? baseExpenditure + liveExpenseTotal : baseExpenditure;
    const expenseSource = liveExpenseTotal > 0 ? 'onboarding_daily_update_uploads' : 'onboarding';

    // Calculate savings rate
    const savingsRate = totalSalary > 0 ? Math.round(((totalSalary - monthlyExpenses) / totalSalary) * 100) : 0;

    const dynamicFinanceData = {
      source: 'Plaid Sync & Twin DB',
      lastSync: new Date().toISOString(),
      creditScore: onboarding?.creditScore || 725,
      accountBalance: Math.max(0, totalSalary - monthlyExpenses),
      totalSalary,
      monthlyExpenses,
      expenseSource,
      expenseSourceDetail: liveExpenseTotal > 0
        ? 'Onboarding monthly expenditure plus current-month daily updates and uploaded finance documents.'
        : 'Onboarding monthly expenditure baseline.',
      expenseBreakdown: {
        onboardingBaseline: baseExpenditure,
        dailyUpdateSpending: actualSpentThisMonth,
        uploadedDocumentSpending: uploadedExpenseTotal,
      },
      portfolioValue,
      holdings,
      metrics: {
        monthlySavingsRate: `${savingsRate}%`,
        unusualSpikeDetected: baseExpenditure > 0 && monthlyExpenses > baseExpenditure * 1.15
      },
      recentTransactions: [
        ...dailyUpdatesThisMonth.flatMap(update => extractDailyUpdateTransactions(update)),
        ...financeUploadsThisMonth.flatMap(upload => extractUploadTransactions(upload)),
      ].slice(0, 15)
    };

    const { default: GamificationProfile } = await import('../models/GamificationProfile.js');
    const profile = await GamificationProfile.findOne({ userId });
    const totalXP = profile ? profile.totalXP : 0;
    const goalsUpdated = [];

    res.status(200).json({ success: true, data: dynamicFinanceData, totalXP, goalProgress: goalsUpdated, goalsUpdated });
  } catch (error) {
    console.error('Integration Finance Sync Error:', error);
    res.status(500).json({ success: false, message: 'Server Error synchronizing finance integration' });
  }
});

// ── /career — UNCHANGED ───────────────────────────────────────────────────────
function extractUploadExpenseTotal(upload) {
  return extractUploadTransactions(upload)
    .filter(transaction => transaction.type !== 'income' && transaction.type !== 'credit')
    .reduce((sum, transaction) => sum + positiveNumber(transaction.amount), 0);
}

function extractDailyUpdateExpenseTotal(update) {
  const finance = update.finance || {};
  return positiveNumber(finance.spending)
    + positiveNumber(finance.boughtShareDetails?.amount)
    + positiveNumber(finance.insuranceDetails?.amount);
}

function extractDailyUpdateIncomeTotal(update) {
  return positiveNumber(update.finance?.soldShareDetails?.amount);
}

function extractDailyUpdateTransactions(update) {
  const finance = update.finance || {};
  const transactions = [];

  if (positiveNumber(finance.spending) > 0) {
    transactions.push({
      id: `${update._id}-spending`,
      date: update.date,
      merchant: 'Daily Update',
      amount: positiveNumber(finance.spending),
      category: 'Daily spending',
      type: 'expense',
      source: 'Daily Update',
    });
  }

  if (finance.boughtShares && positiveNumber(finance.boughtShareDetails?.amount) > 0) {
    transactions.push({
      id: `${update._id}-bought-shares`,
      date: update.date,
      merchant: finance.boughtShareDetails?.stockName || 'Shares',
      amount: positiveNumber(finance.boughtShareDetails?.amount),
      category: 'Investment',
      type: 'expense',
      source: 'Daily Update',
    });
  }

  if (finance.insurancePurchased && positiveNumber(finance.insuranceDetails?.amount) > 0) {
    transactions.push({
      id: `${update._id}-insurance`,
      date: update.date,
      merchant: finance.insuranceDetails?.providerName || 'Insurance',
      amount: positiveNumber(finance.insuranceDetails?.amount),
      category: 'Insurance',
      type: 'expense',
      source: 'Daily Update',
    });
  }

  if (finance.soldShares && positiveNumber(finance.soldShareDetails?.amount) > 0) {
    transactions.push({
      id: `${update._id}-sold-shares`,
      date: update.date,
      merchant: finance.soldShareDetails?.stockName || 'Shares',
      amount: positiveNumber(finance.soldShareDetails?.amount),
      category: 'Investment',
      type: 'income',
      source: 'Daily Update',
    });
  }

  return transactions;
}

function extractUploadIncomeTotal(upload) {
  return extractUploadTransactions(upload)
    .filter(transaction => transaction.type === 'income' || transaction.type === 'credit')
    .reduce((sum, transaction) => sum + positiveNumber(transaction.amount), 0);
}

function extractUploadTransactions(upload) {
  const finance = upload.extractedData?.financeData || {};
  const transactions = Array.isArray(finance.transactions) ? finance.transactions : [];
  const normalized = transactions
    .map((transaction, index) => ({
      id: `${upload._id || upload.fileName}-${index}`,
      date: normalizeTransactionDate(transaction.date || upload.createdAt),
      merchant: transaction.merchant || transaction.vendorName || upload.fileName,
      amount: positiveNumber(transaction.amount || transaction.totalAmount),
      category: transaction.category || inferFinanceCategory(upload.fileName),
      type: transaction.type === 'income' || transaction.type === 'credit' ? 'income' : 'expense',
      source: 'Uploaded finance document',
    }))
    .filter(transaction => transaction.amount > 0);

  if (!normalized.length && positiveNumber(finance.moneySpent) > 0) {
    normalized.push({
      id: `${upload._id || upload.fileName}-spent`,
      date: normalizeTransactionDate(upload.createdAt),
      merchant: upload.fileName,
      amount: positiveNumber(finance.moneySpent),
      category: inferFinanceCategory(upload.fileName),
      type: 'expense',
      source: 'Uploaded finance document',
    });
  }

  if (positiveNumber(finance.moneyCredited) > 0) {
    normalized.push({
      id: `${upload._id || upload.fileName}-credited`,
      date: normalizeTransactionDate(upload.createdAt),
      merchant: upload.fileName,
      amount: positiveNumber(finance.moneyCredited),
      category: 'Income',
      type: 'income',
      source: 'Uploaded finance document',
    });
  }

  return normalized;
}

function inferFinanceCategory(fileName = '') {
  const value = String(fileName).toLowerCase();
  if (/food|grocery|restaurant|swiggy|zomato/.test(value)) return 'Food';
  if (/rent|maintenance|electric|utility|bill/.test(value)) return 'Bills';
  if (/cloth|fashion|apparel/.test(value)) return 'Clothing';
  if (/travel|flight|hotel|fuel|cab|taxi/.test(value)) return 'Travel';
  if (/medical|health|pharmacy|hospital/.test(value)) return 'Healthcare';
  if (/course|tuition|education|book/.test(value)) return 'Education';
  if (/stock|share|mutual|fund|lic|insurance|invest/.test(value)) return 'Investment';
  return 'Finance Document';
}

function normalizeTransactionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayKey();
  return date.toISOString().split('T')[0];
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

router.get('/career', authenticateToken, async (req, res) => {
  await simulateNetwork(1200);
  const commits = Math.floor(Math.random() * (45 - 5) + 5);
  const mockCareerData = {
    source: 'GitHub & LinkedIn Connect', lastSync: new Date().toISOString(),
    githubCommitsThisWeek:   commits,
    topLanguages:            ['JavaScript', 'Python', 'C++'],
    recentCertificates:      ['Advanced React Patterns', 'GenAI Prompt Engineering'],
    linkedInProfileStrength: 'All-Star',
    hoursInMeetingsToday:    (Math.random() * (6 - 1) + 1).toFixed(1),
    learning: { courseraActiveCourse: 'Advanced Machine Learning', courseProgress: '65%' },
  };

  let goalsUpdated = [];
  let totalXP = 0;
  try {
    const userId = req.user.userId;
    const todayStr = todayKey();
    let daily = await DailyTracking.findOne({ userId, dateString: todayStr });
    if (!daily) daily = new DailyTracking({ userId, dateString: todayStr });

    daily._prevSnapshot = {
      health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: (daily.health.workouts||[]).map(w=>({type:w.type,durationMinutes:w.durationMinutes})) },
      finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
      career:  { studyHours: daily.career.studyHours||0, completedCourses: daily.career.completedCourses||0, githubCommits: daily.career.githubCommits||0, projectsCompleted: daily.career.projectsCompleted||0 }
    };

    if (commits > (daily.career.githubCommits || 0)) {
      daily.career.githubCommits = commits;
    }

    console.log(`[IntegrationRoutes] /career: saving DailyTracking dailyLog for userId=${userId}`);
    daily._skipGoalSync = true;
    await daily.save();

    console.log(`[IntegrationRoutes] /career: executing explicit GoalSyncEngine`);
    const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');
    goalsUpdated = await GoalSyncEngine.syncGoalsFromDailyLog(
      userId,
      daily,
      daily._prevSnapshot || null
    );

    const { default: GamificationService } = await import('../services/GamificationService.js');
    await GamificationService.evaluateRules(userId);

    const { default: GamificationProfile } = await import('../models/GamificationProfile.js');
    const profile = await GamificationProfile.findOne({ userId });
    totalXP = profile ? profile.totalXP : 0;
  } catch (syncErr) {
    console.error('Integration career sync error:', syncErr.message);
  }

  res.status(200).json({ success: true, data: mockCareerData, totalXP, goalProgress: goalsUpdated, goalsUpdated });
});

// ── Status / connect / disconnect — UNCHANGED ─────────────────────────────────
router.get('/',           authenticateToken, asyncHandler(getIntegrationStatus));
router.get('/status',     authenticateToken, asyncHandler(getIntegrationStatus));
router.post('/connect',   authenticateToken, asyncHandler(connectIntegration));
router.post('/disconnect', authenticateToken, asyncHandler(disconnectIntegration));
router.post('/github',    authenticateToken, asyncHandler(connectGithubIntegration));
router.post('/leetcode',  authenticateToken, asyncHandler(connectLeetcodeIntegration));
router.post('/linkedin',  authenticateToken, asyncHandler(connectLinkedinIntegration));
router.post('/fitband',   authenticateToken, asyncHandler(connectFitbandIntegration));
router.put('/update',     authenticateToken, asyncHandler(updateIntegration));
router.delete('/',        authenticateToken, asyncHandler(disconnectIntegration));

// ── Onboarding verification routes — UNCHANGED ────────────────────────────────
router.get('/github/:username(*)',   authenticateToken, getGithubIntegration);
router.get('/leetcode/:username(*)', authenticateToken, getLeetcodeIntegration);

// ── NEW: HackerRank and Codeforces routes ─────────────────────────────────────
router.get('/hackerrank/:username(*)', authenticateToken, getHackerrankIntegration);
router.get('/codeforces/:handle(*)',   authenticateToken, getCodeforcesIntegration);

export default router;
