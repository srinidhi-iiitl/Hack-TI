import express from 'express';
import { logWorkout, logSleep } from '../controllers/healthController.js';
import { authenticateToken } from '../middleware/auth.js'; 
import DailyTracking from '../models/DailyTracking.js';
import GamificationEngine from '../services/GamificationEngine.js';

const router = express.Router();

// ✅ EXISTING ROUTES
router.post('/workout', authenticateToken, logWorkout);
router.post('/sleep', authenticateToken, logSleep);

// ✅ NEW: Log Vitals & Mood
router.post('/vitals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { stressLevel, mood, waterLiters } = req.body;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Update the Daily Tracking database
    await DailyTracking.findOneAndUpdate(
      { userId, dateString: today },
      { 
        $set: { 'health.stressLevel': stressLevel, 'health.mood': mood }, 
        $inc: { 'health.waterLiters': waterLiters } 
      },
      { new: true, upsert: true }
    );

    // Award XP
    const gamification = await GamificationEngine.logEvent(userId, 'VITALS_LOGGED', { stressLevel, mood });
    res.status(200).json({ success: true, gamification });
    
  } catch (error) {
    console.error('Vitals Route Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ✅ NEW: Log Medications
router.post('/meds', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { medName } = req.body;
    
    const today = new Date().toISOString().split('T')[0];

    // Push the new medication into the Daily Tracking array
    await DailyTracking.findOneAndUpdate(
      { userId, dateString: today },
      { $push: { 'health.medicationsTaken': { name: medName } } },
      { new: true, upsert: true }
    );

    // Award XP
    const gamification = await GamificationEngine.logEvent(userId, 'MEDS_TAKEN', { medName });
    res.status(200).json({ success: true, gamification });
    
  } catch (error) {
    console.error('Meds Route Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;