import express from 'express';
import UserGamification from '../models/UserGamification.js';
import BadgeDefinition from '../models/BadgeDefinition.js';
// ✅ Import the engine so we can award XP!
import GamificationEngine from '../services/GamificationEngine.js'; 
import { authenticateToken } from '../middleware/auth.js'; 

const router = express.Router();

// @desc    Get user's gamification profile
// @route   GET /api/gamification/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; 

    let gamification = await UserGamification.findOne({ userId });
    
    if (!gamification) {
      return res.status(200).json({
        success: true,
        data: {
          totalXP: 0,
          level: 1,
          streaks: {
            finance: { current: 0, best: 0 },
            health: { current: 0, best: 0 },
            career: { current: 0, best: 0 }
          },
          badges: [],
          weeklyXP: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: gamification
    });
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Get all available badges
// @route   GET /api/gamification/badges
router.get('/badges', async (req, res) => {
  try {
    const badges = await BadgeDefinition.find({});
    res.status(200).json({
      success: true,
      data: badges
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ NEW: Handle the Morning Gamified Sync
// @route   POST /api/gamification/daily-sync
router.post('/daily-sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sleepTime, wakeTime, amountCredited, amountSpent, spendCategory } = req.body;

    // Process Gamification XP via the Engine
    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'DAILY_SYNC_COMPLETED', 
      { sleepTime, wakeTime, amountCredited, amountSpent, spendCategory }
    );

    // Later: We will save this data to LifeProfile here!

    res.status(200).json({
      success: true,
      message: 'Daily sync complete. Systems updated.',
      gamification: gamificationResult
    });

  } catch (error) {
    console.error('Daily Sync Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;