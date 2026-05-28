import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import DailyTracking from '../models/DailyTracking.js';
import GamificationEngine from '../services/GamificationEngine.js';

const router = express.Router();

// @desc    Log a new financial transaction (Income or Expense)
// @route   POST /api/finance/transaction
router.post('/transaction', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, amount, category, isImpulse } = req.body; // type: 'income' | 'expense'
    
    const today = new Date().toISOString().split('T')[0];

    // Prepare the database update
    const updateQuery = {
      $push: { 'finance.transactions': { amount, category, type, isImpulse } }
    };
    
    // Automatically increment today's totals based on the type
    if (type === 'expense') {
      updateQuery.$inc = { 'finance.moneySpent': amount };
    } else if (type === 'income') {
      updateQuery.$inc = { 'finance.moneyCredited': amount };
    }

    // Save to the DailyTracker
    await DailyTracking.findOneAndUpdate(
      { userId, dateString: today },
      updateQuery,
      { new: true, upsert: true }
    );

    // Trigger Gamification
    const eventName = type === 'expense' ? 'EXPENSE_LOGGED' : 'INCOME_LOGGED';
    const gamification = await GamificationEngine.logEvent(userId, eventName, { amount, category });

    res.status(200).json({ success: true, gamification });
    
  } catch (error) {
    console.error('Finance Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;