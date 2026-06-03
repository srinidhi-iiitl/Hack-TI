import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createFinance, getFinance, getFinanceAnalytics,
  getFinanceTrajectory, getMarketAnalysis, updateFinance,
} from '../controllers/financeController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import DailyTracking from '../models/DailyTracking.js';
import GamificationEngine from '../services/GamificationEngine.js';
import { todayKey } from '../services/domainDataService.js';

const router = express.Router();

router.get('/',                authenticateToken, asyncHandler(getFinance));
router.post('/',               authenticateToken, asyncHandler(createFinance));
router.put('/',                authenticateToken, asyncHandler(updateFinance));
router.get('/analytics',       authenticateToken, asyncHandler(getFinanceAnalytics));
router.get('/trajectory',      authenticateToken, asyncHandler(getFinanceTrajectory));
router.get('/market-analysis', authenticateToken, asyncHandler(getMarketAnalysis));

// FIXED: transaction - was findOneAndUpdate (bypasses post-save hook) → now find+save
router.post('/transaction', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, amount, category, isImpulse } = req.body;
    const today = todayKey();

    let daily = await DailyTracking.findOne({ userId, dateString: today });
    if (!daily) daily = new DailyTracking({ userId, dateString: today });

    daily._prevSnapshot = {
      health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: [] },
      finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
    };

    daily.finance.transactions.push({ amount, category, type, isImpulse: isImpulse || false });

    if (type === 'expense') {
      daily.finance.moneySpent    = (daily.finance.moneySpent    || 0) + Number(amount);
    } else if (type === 'income') {
      daily.finance.moneyCredited = (daily.finance.moneyCredited || 0) + Number(amount);
    }

    await daily.save(); // post-save hook fires GoalSyncEngine

    const eventName    = type === 'expense' ? 'EXPENSE_LOGGED' : 'INCOME_LOGGED';
    const gamification = await GamificationEngine.logEvent(userId, eventName, { amount, category });

    res.status(200).json({ success: true, gamification });
  } catch (error) {
    console.error('Finance Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
