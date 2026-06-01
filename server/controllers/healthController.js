import GamificationEngine from '../services/GamificationEngine.js';
import DailyTracking from '../models/DailyTracking.js';
import {
  buildTrajectory,
  getOrCreateDailyTracking,
  getOrCreateLifeProfile,
  scoreFromParts,
  todayKey,
} from '../services/domainDataService.js';

export const getHealth = async (req, res) => {
  const [daily, lifeProfile] = await Promise.all([
    getOrCreateDailyTracking(req.user.userId),
    getOrCreateLifeProfile(req.user.userId),
  ]);
  const score = scoreFromParts([
    Math.min(100, (daily.health?.sleepHours || 0) * 12),
    Math.min(100, (daily.health?.waterLiters || 0) * 25),
    Math.min(100, (daily.health?.workouts?.length || 0) * 25),
  ]);

  res.status(200).json({
    success: true,
    data: {
      score,
      daily: daily.health,
      profile: lifeProfile.healthContext,
      reproductiveHealth: lifeProfile.reproductiveHealth,
      pregnancy: lifeProfile.pregnancy,
    },
  });
};

export const createHealth = async (req, res) => {
  const daily = await getOrCreateDailyTracking(req.user.userId, req.body.dateString || todayKey());
  daily.health = { ...daily.health, ...req.body };
  await daily.save();
  res.status(201).json({ success: true, data: daily.health });
};

export const updateHealth = async (req, res) => {
  const daily = await getOrCreateDailyTracking(req.user.userId, req.body.dateString || todayKey());
  daily.health = { ...daily.health, ...req.body };
  await daily.save();
  res.status(200).json({ success: true, data: daily.health });
};

export const getHealthAnalytics = async (req, res) => {
  const logs = await DailyTracking.find({ userId: req.user.userId }).sort({ dateString: -1 }).limit(30).lean();
  const latest = logs[0]?.health || {};
  const score = scoreFromParts([
    Math.min(100, (latest.sleepHours || 0) * 12),
    Math.min(100, (latest.waterLiters || 0) * 25),
    Math.min(100, (latest.workouts?.length || 0) * 25),
  ]);

  res.status(200).json({
    success: true,
    data: {
      score,
      averages: {
        sleepHours: average(logs.map((log) => log.health?.sleepHours)),
        waterLiters: average(logs.map((log) => log.health?.waterLiters)),
      },
      totalWorkouts: logs.reduce((sum, log) => sum + (log.health?.workouts?.length || 0), 0),
    },
  });
};

export const getHealthTrajectory = async (req, res) => {
  const logs = await DailyTracking.find({ userId: req.user.userId }).sort({ dateString: 1 }).limit(60).lean();
  res.status(200).json({ success: true, data: buildTrajectory(logs) });
};

export const getPeriods = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  res.status(200).json({ success: true, data: profile.reproductiveHealth });
};

export const savePeriods = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  profile.reproductiveHealth = { ...profile.reproductiveHealth, ...req.body, isTracking: true };
  await profile.save();
  res.status(201).json({ success: true, data: profile.reproductiveHealth });
};

export const getPregnancy = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  res.status(200).json({ success: true, data: profile.pregnancy });
};

export const savePregnancy = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  profile.pregnancy = { ...profile.pregnancy, ...req.body, isTracking: true };
  await profile.save();
  res.status(201).json({ success: true, data: profile.pregnancy });
};

// @desc    Log a workout and award XP
// @route   POST /api/health-metrics/workout
export const logWorkout = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId from your auth middleware
    const userId = req.user.userId; 
    const { type, duration } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'WORKOUT_LOGGED', 
      { type, duration }
    );

    res.status(201).json({
      success: true,
      message: 'Workout logged successfully!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Health Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Log sleep and award XP
// @route   POST /api/health-metrics/sleep
export const logSleep = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId
    const userId = req.user.userId; 
    const { hours } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'SLEEP_LOGGED', 
      { hours }
    );

    res.status(201).json({
      success: true,
      message: 'Sleep logged successfully!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Health Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

function average(values) {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!numbers.length) return 0;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1));
}
