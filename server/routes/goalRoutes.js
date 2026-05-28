import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import SmartGoal from '../models/SmartGoal.js';
import GamificationEngine from '../services/GamificationEngine.js';

const router = express.Router();

// @desc    Create a new SMART Goal
// @route   POST /api/goals
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { domain, title, description, targetMetric, unit, priority, deadline } = req.body;

    const newGoal = await SmartGoal.create({
      userId,
      domain,
      title,
      description,
      targetMetric,
      unit,
      priority,
      deadline
    });

    // Award XP for setting a goal!
    const gamification = await GamificationEngine.logEvent(userId, 'GOAL_SET', { goalId: newGoal._id });

    res.status(201).json({ success: true, data: newGoal, gamification });
  } catch (error) {
    console.error('Goal Creation Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Get all active goals for a user
// @route   GET /api/goals
router.get('/', authenticateToken, async (req, res) => {
  try {
    const goals = await SmartGoal.find({ userId: req.user.userId }).sort({ deadline: 1 });
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    console.error('Fetch Goals Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;