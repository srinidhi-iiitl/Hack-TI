import express from 'express';
import {
  createHealth,
  getHealth,
  getHealthAnalytics,
  getHealthTrajectory,
  getPeriods,
  getPregnancy,
  logSleep,
  logWorkout,
  savePeriods,
  savePregnancy,
  updateHealth,
} from '../controllers/healthController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import DailyTracking from '../models/DailyTracking.js';
import GamificationEngine from '../services/GamificationEngine.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getHealth));
router.post('/', authenticateToken, asyncHandler(createHealth));
router.put('/', authenticateToken, asyncHandler(updateHealth));
router.get('/analytics', authenticateToken, asyncHandler(getHealthAnalytics));
router.get('/trajectory', authenticateToken, asyncHandler(getHealthTrajectory));
router.get('/periods', authenticateToken, asyncHandler(getPeriods));
router.post('/periods', authenticateToken, asyncHandler(savePeriods));
router.get('/pregnancy', authenticateToken, asyncHandler(getPregnancy));
router.post('/pregnancy', authenticateToken, asyncHandler(savePregnancy));
router.get('/status', (req, res) => res.status(200).json({ success: true, message: 'Server is running' }));

router.post('/workout', authenticateToken, logWorkout);
router.post('/sleep', authenticateToken, logSleep);

router.post('/vitals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { stressLevel, mood, waterLiters } = req.body;
    const today = new Date().toISOString().split('T')[0];

    await DailyTracking.findOneAndUpdate(
      { userId, dateString: today },
      {
        $set: { 'health.stressLevel': stressLevel, 'health.mood': mood },
        $inc: { 'health.waterLiters': waterLiters },
      },
      { new: true, upsert: true },
    );

    const gamification = await GamificationEngine.logEvent(userId, 'VITALS_LOGGED', { stressLevel, mood });
    res.status(200).json({ success: true, gamification });
  } catch (error) {
    console.error('Vitals Route Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.post('/meds', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { medName } = req.body;
    const today = new Date().toISOString().split('T')[0];

    await DailyTracking.findOneAndUpdate(
      { userId, dateString: today },
      { $push: { 'health.medicationsTaken': { name: medName } } },
      { new: true, upsert: true },
    );

    const gamification = await GamificationEngine.logEvent(userId, 'MEDS_TAKEN', { medName });
    res.status(200).json({ success: true, gamification });
  } catch (error) {
    console.error('Meds Route Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
