import GamificationEngine from '../services/GamificationEngine.js';
import DailyTracking from '../models/DailyTracking.js';
import {
  buildTrajectory,
  getOrCreateDailyTracking,
  getOrCreateLifeProfile,
  scoreFromParts,
  todayKey,
} from '../services/domainDataService.js';

// ── Unchanged controllers ─────────────────────────────────────────────────────

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
        sleepHours: average(logs.map((l) => l.health?.sleepHours)),
        waterLiters: average(logs.map((l) => l.health?.waterLiters)),
      },
      totalWorkouts: logs.reduce((sum, l) => sum + (l.health?.workouts?.length || 0), 0),
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

// ── FIXED: logWorkout — now writes to DailyTracking ──────────────────────────
// Previously only fired gamification. Now saves workout to DailyTracking
// so GoalSyncEngine can map durationMinutes → matching workout/exercise goals.
export const logWorkout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, duration } = req.body;
    const today  = todayKey();

    // 1. Find or create today's log
    let daily = await DailyTracking.findOne({ userId, dateString: today });
    if (!daily) daily = new DailyTracking({ userId, dateString: today });

    // 2. Snapshot BEFORE mutation so GoalSyncEngine gets the delta only
    daily._prevSnapshot = {
      health:  { ...snapshotHealth(daily.health) },
      finance: { ...snapshotFinance(daily.finance) },
    };

    // 3. Append workout entry
    daily.health.workouts.push({ type: type || 'General', durationMinutes: Number(duration) || 0 });

    // 4. Save — post-save hook fires GoalSyncEngine automatically
    await daily.save();

    // 5. Gamification
    const gamification = await GamificationEngine.logEvent(userId, 'WORKOUT_LOGGED', { type, duration });

    res.status(201).json({ success: true, message: 'Workout logged!', gamification });
  } catch (error) {
    console.error('logWorkout Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── FIXED: logSleep — now writes to DailyTracking ────────────────────────────
// Previously only fired gamification. Now saves sleepHours to DailyTracking
// so GoalSyncEngine can map sleepHours → matching sleep goals.
export const logSleep = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { hours } = req.body;
    const today   = todayKey();

    // 1. Find or create today's log
    let daily = await DailyTracking.findOne({ userId, dateString: today });
    if (!daily) daily = new DailyTracking({ userId, dateString: today });

    // 2. Snapshot BEFORE mutation
    daily._prevSnapshot = {
      health:  { ...snapshotHealth(daily.health) },
      finance: { ...snapshotFinance(daily.finance) },
    };

    // 3. Set sleep hours (replace, not increment — you only sleep once per day)
    daily.health.sleepHours = Number(hours) || 0;

    // 4. Save — post-save hook fires GoalSyncEngine automatically
    await daily.save();

    // 5. Gamification
    const gamification = await GamificationEngine.logEvent(userId, 'SLEEP_LOGGED', { hours });

    res.status(201).json({ success: true, message: 'Sleep logged!', gamification });
  } catch (error) {
    console.error('logSleep Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Safe snapshot that handles both Mongoose subdocs and plain objects
function snapshotHealth(health) {
  if (!health) return { caloriesConsumed: 0, proteinConsumed: 0, waterLiters: 0, sleepHours: 0, workouts: [] };
  return {
    caloriesConsumed: health.caloriesConsumed || 0,
    proteinConsumed:  health.proteinConsumed  || 0,
    waterLiters:      health.waterLiters      || 0,
    sleepHours:       health.sleepHours       || 0,
    workouts:         (health.workouts || []).map(w => ({ type: w.type, durationMinutes: w.durationMinutes })),
  };
}

function snapshotFinance(finance) {
  if (!finance) return { moneySpent: 0, moneyCredited: 0 };
  return {
    moneySpent:    finance.moneySpent    || 0,
    moneyCredited: finance.moneyCredited || 0,
  };
}

function average(values) {
  const numbers = values.map(Number).filter((v) => Number.isFinite(v) && v > 0);
  if (!numbers.length) return 0;
  return Number((numbers.reduce((s, v) => s + v, 0) / numbers.length).toFixed(1));
}
