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
import DailyTracking from '../models/DailyTracking.js';
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

  try {
    const todayStr = todayKey();
    let daily = await DailyTracking.findOne({ userId: req.user.userId, dateString: todayStr });
    if (!daily) daily = new DailyTracking({ userId: req.user.userId, dateString: todayStr });

    daily._prevSnapshot = {
      health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: (daily.health.workouts||[]).map(w=>({type:w.type,durationMinutes:w.durationMinutes})) },
      finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
    };

    if (sleepHours     > (daily.health.sleepHours      || 0)) daily.health.sleepHours      = sleepHours;
    if (activeCalories > (daily.health.caloriesConsumed || 0)) daily.health.caloriesConsumed = activeCalories;

    await daily.save();
  } catch (syncErr) {
    console.error('Integration health sync error:', syncErr.message);
  }

  res.status(200).json({ success: true, data: mockHealthData });
});

// ── /finance — UNCHANGED ──────────────────────────────────────────────────────
router.get('/finance', authenticateToken, async (req, res) => {
  await simulateNetwork(2000);

  const mockFinanceData = {
    source: 'Plaid Banking', lastSync: new Date().toISOString(),
    creditScore: Math.floor(Math.random() * (850 - 650) + 650),
    accountBalance: 4250.75,
    metrics: { monthlySavingsRate: '12%', unusualSpikeDetected: true },
    recentTransactions: [
      { id: 'txn_1', vendor: 'Starbucks',        amount: 5.40,    category: 'food',          timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'txn_2', vendor: 'Netflix',           amount: 15.99,   category: 'entertainment', timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: 'txn_3', vendor: 'Tech Corp Salary',  amount: 2500.00, category: 'income',        timestamp: new Date(Date.now() - 432000000).toISOString() },
      { id: 'txn_4', vendor: 'UberEats Delivery', amount: 45.50,   category: 'food',          timestamp: new Date(Date.now() - 4000000).toISOString() },
    ],
  };

  try {
    const todayStr = todayKey();
    const todayISO = new Date().toISOString().split('T')[0];
    const todayExpenses = mockFinanceData.recentTransactions
      .filter(t => t.category !== 'income' && t.timestamp.startsWith(todayISO))
      .reduce((sum, t) => sum + t.amount, 0);

    if (todayExpenses > 0) {
      let daily = await DailyTracking.findOne({ userId: req.user.userId, dateString: todayStr });
      if (!daily) daily = new DailyTracking({ userId: req.user.userId, dateString: todayStr });

      daily._prevSnapshot = {
        health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: [] },
        finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
      };

      const delta = todayExpenses - (daily.finance.moneySpent || 0);
      if (delta > 0) { daily.finance.moneySpent = todayExpenses; await daily.save(); }
    }
  } catch (syncErr) {
    console.error('Integration finance sync error:', syncErr.message);
  }

  res.status(200).json({ success: true, data: mockFinanceData });
});

// ── /career — UNCHANGED ───────────────────────────────────────────────────────
router.get('/career', authenticateToken, async (req, res) => {
  await simulateNetwork(1200);
  res.status(200).json({
    success: true,
    data: {
      source: 'GitHub & LinkedIn Connect', lastSync: new Date().toISOString(),
      githubCommitsThisWeek:   Math.floor(Math.random() * (45 - 5) + 5),
      topLanguages:            ['JavaScript', 'Python', 'C++'],
      recentCertificates:      ['Advanced React Patterns', 'GenAI Prompt Engineering'],
      linkedInProfileStrength: 'All-Star',
      hoursInMeetingsToday:    (Math.random() * (6 - 1) + 1).toFixed(1),
      learning: { courseraActiveCourse: 'Advanced Machine Learning', courseProgress: '65%' },
    },
  });
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
