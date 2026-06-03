import express from 'express';
import {
  createHealth, getHealth, getHealthAnalytics, getHealthTrajectory,
  getPeriods, getPregnancy, logSleep, logWorkout,
  savePeriods, savePregnancy, updateHealth,
} from '../controllers/healthController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import DailyTracking from '../models/DailyTracking.js';
import GamificationEngine from '../services/GamificationEngine.js';
import { todayKey } from '../services/domainDataService.js';

const router = express.Router();

router.get('/',           authenticateToken, asyncHandler(getHealth));
router.post('/',          authenticateToken, asyncHandler(createHealth));
router.put('/',           authenticateToken, asyncHandler(updateHealth));
router.get('/analytics',  authenticateToken, asyncHandler(getHealthAnalytics));
router.get('/trajectory', authenticateToken, asyncHandler(getHealthTrajectory));
router.get('/periods',    authenticateToken, asyncHandler(getPeriods));
router.post('/periods',   authenticateToken, asyncHandler(savePeriods));
router.get('/pregnancy',  authenticateToken, asyncHandler(getPregnancy));
router.post('/pregnancy', authenticateToken, asyncHandler(savePregnancy));
router.get('/status',     (req, res) => res.status(200).json({ success: true, message: 'Server is running' }));
router.post('/workout',   authenticateToken, logWorkout);
router.post('/sleep',     authenticateToken, logSleep);

// FIXED: vitals - was findOneAndUpdate (bypasses post-save hook) → now find+save
router.post('/vitals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { stressLevel, mood, waterLiters } = req.body;
    const today = todayKey();

    let daily = await DailyTracking.findOne({ userId, dateString: today });
    if (!daily) daily = new DailyTracking({ userId, dateString: today });

    daily._prevSnapshot = {
      health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: (daily.health.workouts||[]).map(w=>({type:w.type,durationMinutes:w.durationMinutes})) },
      finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
    };

    if (stressLevel !== undefined) daily.health.stressLevel = stressLevel;
    if (mood        !== undefined) daily.health.mood        = mood;
    if (waterLiters !== undefined) daily.health.waterLiters = (daily.health.waterLiters||0) + Number(waterLiters);

    await daily.save(); // post-save hook fires GoalSyncEngine

    const gamification = await GamificationEngine.logEvent(userId, 'VITALS_LOGGED', { stressLevel, mood, waterLiters });
    res.status(200).json({ success: true, gamification });
  } catch (error) {
    console.error('Vitals Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// FIXED: meds - same pattern fix
router.post('/meds', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { medName } = req.body;
    const today = todayKey();

    let daily = await DailyTracking.findOne({ userId, dateString: today });
    if (!daily) daily = new DailyTracking({ userId, dateString: today });

    daily._prevSnapshot = {
      health:  { caloriesConsumed: daily.health.caloriesConsumed||0, proteinConsumed: daily.health.proteinConsumed||0, waterLiters: daily.health.waterLiters||0, sleepHours: daily.health.sleepHours||0, workouts: [] },
      finance: { moneySpent: daily.finance.moneySpent||0, moneyCredited: daily.finance.moneyCredited||0 },
    };

    daily.health.medicationsTaken.push({ name: medName });
    await daily.save();

    const gamification = await GamificationEngine.logEvent(userId, 'MEDS_TAKEN', { medName });
    res.status(200).json({ success: true, gamification });
  } catch (error) {
    console.error('Meds Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
