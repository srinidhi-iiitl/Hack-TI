import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createFinance,
  getFinance,
  getFinanceAnalytics,
  getFinanceTrajectory,
  getMarketAnalysis,
  updateFinance,
} from '../controllers/financeController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import DailyTracking from '../models/DailyTracking.js';
import GamificationEngine from '../services/GamificationEngine.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getFinance));
router.post('/', authenticateToken, asyncHandler(createFinance));
router.put('/', authenticateToken, asyncHandler(updateFinance));
router.get('/analytics', authenticateToken, asyncHandler(getFinanceAnalytics));
router.get('/trajectory', authenticateToken, asyncHandler(getFinanceTrajectory));
router.get('/market-analysis', authenticateToken, asyncHandler(getMarketAnalysis));

router.post('/transaction', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, amount, category, isImpulse } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const updateQuery = {
      $push: { 'finance.transactions': { amount, category, type, isImpulse } },
    };

    if (type === 'expense') {
      updateQuery.$inc = { 'finance.moneySpent': amount };
    } else if (type === 'income') {
      updateQuery.$inc = { 'finance.moneyCredited': amount };
    }

    await DailyTracking.findOneAndUpdate(
      { userId, dateString: today },
      updateQuery,
      { new: true, upsert: true },
    );

    const eventName = type === 'expense' ? 'EXPENSE_LOGGED' : 'INCOME_LOGGED';
    const gamification = await GamificationEngine.logEvent(userId, eventName, { amount, category });

    res.status(200).json({ success: true, gamification });
  } catch (error) {
    console.error('Finance Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
