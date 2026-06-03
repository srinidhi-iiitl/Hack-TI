import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getGithubIntegration, getLeetcodeIntegration, postLinkedinIntegration } from '../controllers/integrationController.js';
import DailyTracking from '../models/DailyTracking.js';
import { todayKey } from '../services/domainDataService.js';

const router = express.Router();

const simulateNetwork = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── FIXED: /health ────────────────────────────────────────────────────────────
// Now writes fetched mock data into DailyTracking so GoalSyncEngine fires
// and the sync banner on Goals page goes green.
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
    source:   'Fitbit (Demo)',
    lastSync: new Date().toISOString(),
    metrics:  { steps, activeCalories, sleepHours, avgHeartRate, restingHeartRate: restingHR, hrv },
  };

  // ── NEW: Write to DailyTracking so Goals sync banner activates ──
  try {
    const todayStr = todayKey();
    let daily = await DailyTracking.findOne({ userId: req.user.userId, dateString: todayStr });
    if (!daily) daily = new DailyTracking({ userId: req.user.userId, dateString: todayStr });

    daily._prevSnapshot = {
      health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: (daily.health.workouts||[]).map(w=>({type:w.type,durationMinutes:w.durationMinutes})) },
      finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
    };

    // Only write if the value is greater (don't overwrite manual logs with mock)
    if (sleepHours > (daily.health.sleepHours || 0)) {
      daily.health.sleepHours = sleepHours;
    }
    if (activeCalories > (daily.health.caloriesConsumed || 0)) {
      daily.health.caloriesConsumed = activeCalories;
    }

    await daily.save(); // triggers GoalSyncEngine post-save hook
  } catch (syncErr) {
    // Never block the API response if sync fails
    console.error('Integration health sync error:', syncErr.message);
  }

  res.status(200).json({ success: true, data: mockHealthData });
});

// ── FIXED: /finance ───────────────────────────────────────────────────────────
// Now writes transaction data into DailyTracking on fetch.
router.get('/finance', authenticateToken, async (req, res) => {
  await simulateNetwork(2000);

  const mockFinanceData = {
    source:         'Plaid Banking',
    lastSync:       new Date().toISOString(),
    creditScore:    Math.floor(Math.random() * (850 - 650) + 650),
    accountBalance: 4250.75,
    metrics: {
      monthlySavingsRate:    '12%',
      unusualSpikeDetected:  true,
    },
    recentTransactions: [
      { id: 'txn_1', vendor: 'Starbucks',         amount: 5.40,    category: 'food',          timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'txn_2', vendor: 'Netflix',            amount: 15.99,   category: 'entertainment', timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: 'txn_3', vendor: 'Tech Corp Salary',   amount: 2500.00, category: 'income',        timestamp: new Date(Date.now() - 432000000).toISOString() },
      { id: 'txn_4', vendor: 'UberEats Delivery',  amount: 45.50,   category: 'food',          timestamp: new Date(Date.now() - 4000000).toISOString() },
    ],
  };

  // ── NEW: Write today's expense total into DailyTracking ──
  try {
    const todayStr = todayKey();
    const todayISO = new Date().toISOString().split('T')[0];

    // Sum only today's expense transactions from mock data
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

      // Only add delta not already tracked
      const alreadyTracked = daily.finance.moneySpent || 0;
      const delta = todayExpenses - alreadyTracked;
      if (delta > 0) {
        daily.finance.moneySpent = todayExpenses;
        await daily.save(); // triggers GoalSyncEngine
      }
    }
  } catch (syncErr) {
    console.error('Integration finance sync error:', syncErr.message);
  }

  res.status(200).json({ success: true, data: mockFinanceData });
});

// ── Unchanged: /career ────────────────────────────────────────────────────────
router.get('/career', authenticateToken, async (req, res) => {
  await simulateNetwork(1200);
  const mockCareerData = {
    source:                  'GitHub & LinkedIn Connect',
    lastSync:                new Date().toISOString(),
    githubCommitsThisWeek:   Math.floor(Math.random() * (45 - 5) + 5),
    topLanguages:            ['JavaScript', 'Python', 'C++'],
    recentCertificates:      ['Advanced React Patterns', 'GenAI Prompt Engineering'],
    linkedInProfileStrength: 'All-Star',
    hoursInMeetingsToday:    (Math.random() * (6 - 1) + 1).toFixed(1),
    learning: {
      courseraActiveCourse: 'Advanced Machine Learning',
      courseProgress:       '65%'
    },
  };
  res.status(200).json({ success: true, data: mockCareerData });
});

// ── Unchanged: onboarding verification routes ─────────────────────────────────
router.get('/github/:username(*)',   authenticateToken, getGithubIntegration);
router.get('/leetcode/:username(*)', authenticateToken, getLeetcodeIntegration);
router.post('/linkedin',             authenticateToken, postLinkedinIntegration);

export default router;
