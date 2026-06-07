import DailyUpdate from '../models/DailyUpdate.js';
import DailyTracking from '../models/DailyTracking.js';
import OnboardingProfile from '../models/OnboardingProfile.js';
import SmartGoal from '../models/SmartGoal.js';
import { createNotification, resolveNotifications } from '../services/notificationService.js';

export const getTodayDailyUpdate = async (req, res) => {
  const userId = req.user.userId;
  const date = resolveDate(req.query.date);
  const [todayUpdate, activeGoals] = await Promise.all([
    DailyUpdate.findOne({ userId, date }).lean(),
    SmartGoal.find({ userId, status: 'active' }).sort({ deadline: 1 }).lean(),
  ]);

  res.status(200).json({
    success: true,
    completed: Boolean(todayUpdate),
    data: todayUpdate,
    activeGoals: activeGoals.map(formatGoal),
  });
};

export const createDailyUpdate = async (req, res) => {
  const userId = req.user.userId;
  const date = resolveDate(req.body.date);
  const existing = await DailyUpdate.findOne({ userId, date }).lean();

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Today's Twin Check-In is already completed.",
      data: existing,
    });
  }

  const payload = normalizePayload(req.body);
  const update = await DailyUpdate.create({ userId, date, ...payload, completed: true });
  const effects = await applyDailyUpdateEffects(userId, date, payload);

  await createNotifications(userId, effects);

  res.status(201).json({
    success: true,
    message: 'Daily Twin Update completed successfully.',
    data: update,
    effects,
  });
};

export const getDailyUpdateHistory = async (req, res) => {
  const updates = await DailyUpdate.find({ userId: req.user.userId }).sort({ date: -1 }).limit(60).lean();
  res.status(200).json({ success: true, data: updates });
};

export const getStreakCalendar = async (req, res) => {
  const profile = await OnboardingProfile.findOne({ userId: req.user.userId }).sort({ updatedAt: -1 }).lean();
  res.status(200).json({
    success: true,
    data: {
      currentStreak: profile?.currentStreak || 0,
      completedDailyGoals: profile?.completedDailyGoals || [],
      lastGoalCompletionDate: profile?.lastGoalCompletionDate || '',
      streakStarted: Boolean(profile?.streakStarted),
    },
  });
};

async function applyDailyUpdateEffects(userId, date, payload) {
  const [dailyLog, profile] = await Promise.all([
    getOrCreateDailyLog(userId, date),
    OnboardingProfile.findOne({ userId }).sort({ updatedAt: -1 }),
  ]);

  // Snapshot BEFORE mutation
  dailyLog._prevSnapshot = {
    health: {
      caloriesConsumed: dailyLog.health.caloriesConsumed || 0,
      proteinConsumed: dailyLog.health.proteinConsumed || 0,
      waterLiters: dailyLog.health.waterLiters || 0,
      sleepHours: dailyLog.health.sleepHours || 0,
      workouts: (dailyLog.health.workouts || []).map(w => ({ type: w.type, durationMinutes: w.durationMinutes }))
    },
    finance: {
      moneySpent: dailyLog.finance.moneySpent || 0,
      moneyCredited: dailyLog.finance.moneyCredited || 0
    },
    career: {
      studyHours: dailyLog.career.studyHours || 0,
      completedCourses: dailyLog.career.completedCourses || 0,
      githubCommits: dailyLog.career.githubCommits || 0,
      projectsCompleted: dailyLog.career.projectsCompleted || 0
    }
  };

  const previousScores = profile ? {
    healthScore: deriveHealthScore(profile),
    financeScore: Number(profile.financialHealth || 0),
    careerScore: Number(profile.productivityScore || 0),
  } : {};

  dailyLog.health.waterLiters = payload.health.waterIntake;
  if (payload.health.sleepHours > 0) {
    dailyLog.health.sleepHours = payload.health.sleepHours;
  }
  dailyLog.health.workouts = payload.health.exercised ? [{ type: 'Daily check-in', durationMinutes: 30 }] : [];
  dailyLog.finance.moneySpent = payload.finance.spending;
  dailyLog.finance.transactions = buildTransactions(payload.finance);

  // Compile today's holdings from check-in
  const newHoldings = [];
  if (payload.finance.boughtShares && payload.finance.boughtShareDetails.amount > 0) {
    newHoldings.push({
      assetName: payload.finance.boughtShareDetails.stockName || 'Shares',
      value: payload.finance.boughtShareDetails.amount,
      shares: payload.finance.boughtShareDetails.quantity || 1
    });
  }
  if (payload.finance.insurancePurchased && payload.finance.insuranceDetails.amount > 0) {
    newHoldings.push({
      assetName: payload.finance.insuranceDetails.providerName || 'LIC Insurance',
      value: payload.finance.insuranceDetails.amount,
      shares: 1
    });
  }

  // Get previous holdings snapshot from latest log
  const latestLogWithHoldings = await DailyTracking.findOne({
    userId,
    'finance.holdings.0': { $exists: true },
    dateString: { $ne: date }
  }).sort({ dateString: -1 });

  let mergedHoldings = latestLogWithHoldings?.finance?.holdings ? [...latestLogWithHoldings.finance.holdings.map(h => h.toObject?.() || h)] : [];

  // Merge bought holdings
  newHoldings.forEach(h => {
    const existingIdx = mergedHoldings.findIndex(m => m.assetName?.toLowerCase() === h.assetName?.toLowerCase());
    if (existingIdx !== -1) {
      mergedHoldings[existingIdx].shares += h.shares;
      mergedHoldings[existingIdx].value += h.value;
    } else {
      mergedHoldings.push(h);
    }
  });

  // Deduct sold holdings
  if (payload.finance.soldShares && payload.finance.soldShareDetails.quantity > 0) {
    const sellStock = payload.finance.soldShareDetails.stockName || 'Shares';
    const sellQty = payload.finance.soldShareDetails.quantity;
    const sellAmt = payload.finance.soldShareDetails.amount;
    const existingIdx = mergedHoldings.findIndex(m => m.assetName?.toLowerCase() === sellStock.toLowerCase());
    if (existingIdx !== -1) {
      mergedHoldings[existingIdx].shares = Math.max(0, mergedHoldings[existingIdx].shares - sellQty);
      mergedHoldings[existingIdx].value = Math.max(0, mergedHoldings[existingIdx].value - sellAmt);
      if (mergedHoldings[existingIdx].shares === 0) {
        mergedHoldings.splice(existingIdx, 1);
      }
    }
  }

  console.log(`[DailyUpdateController] applyDailyUpdateEffects: saving DailyTracking dailyLog for userId=${userId}`);
  dailyLog.finance.holdings = mergedHoldings;
  dailyLog._skipGoalSync = true;
  await dailyLog.save();

  console.log(`[DailyUpdateController] applyDailyUpdateEffects: executing explicit GoalSyncEngine`);
  const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');
  const syncResult = await GoalSyncEngine.syncGoalsFromDailyLog(
    userId,
    dailyLog,
    dailyLog._prevSnapshot || null
  );

  const goalsUpdated = [...(syncResult || [])];
  const selectedGoalIds = getSelectedGoalIds(payload.goal);
  let manualGoalUpdates = 0;

  if (selectedGoalIds.length && payload.goal.goalCompleted) {
    const goals = await SmartGoal.find({ _id: { $in: selectedGoalIds }, userId });
    const autoSyncedGoalIds = new Set(goalsUpdated.map((item) => String(item.goalId)));
    for (const goal of goals) {
      if (autoSyncedGoalIds.has(String(goal._id))) continue;

      const before = goal.currentMetric;
      const addedByCheckIn = calculateManualGoalIncrement(goal);
      if (addedByCheckIn <= 0) continue;

      goal.currentMetric = Math.min(Number(goal.currentMetric || 0) + addedByCheckIn, Number(goal.targetMetric || 1));
      goal.lastLoggedAt = new Date();
      goal.streak = Number(goal.streak || 0) + 1;
      goal.progressLogs.push({ value: addedByCheckIn, note: 'Daily Twin Check-In', loggedAt: new Date() });
      await goal.save();

      const added = goal.currentMetric - before;
      
      console.log(`[DailyUpdateController] applyDailyUpdateEffects: logging manual check-in goal event`);
      // Let's log gamification event for manual goal completed if it wasn't already in syncResult
      const { default: GamificationEngine } = await import('../services/GamificationEngine.js');
      const eventName = goal.status === 'completed' ? 'GOAL_COMPLETED' : 'GOAL_PROGRESS_LOGGED';
      const gamificationResult = await GamificationEngine.logEvent(userId, eventName, {
        goalId: goal._id,
        addedValue: added || addedByCheckIn
      });

      goalsUpdated.push({
        goalId: goal._id,
        title: goal.title,
        domain: goal.domain,
        added: added || addedByCheckIn,
        current: goal.currentMetric,
        target: goal.targetMetric,
        unit: goal.unit,
        completed: goal.status === 'completed',
        xpEarned: gamificationResult ? gamificationResult.xpAwarded : 0
      });
      manualGoalUpdates += 1;
    }
  }

  if (profile) {
    const scoreDelta = calculateScoreDelta(payload);
    profile.wellnessBalance = clamp(Number(profile.wellnessBalance || 60) + scoreDelta.health, 15, 96);
    profile.financialHealth = clamp(Number(profile.financialHealth || 60) + scoreDelta.finance, 5, 98);
    profile.productivityScore = clamp(Number(profile.productivityScore || 60) + scoreDelta.career, 20, 98);
    profile.burnoutRisk = clamp(Number(profile.burnoutRisk || 35) + scoreDelta.burnout, 0, 100);

    if (selectedGoalIds.length) {
      updateDashboardStreak(profile, date, payload.goal.goalCompleted, selectedGoalIds);
    }

    await profile.save();
  }

  const nextScores = profile ? {
    healthScore: deriveHealthScore(profile),
    financeScore: Number(profile.financialHealth || 0),
    careerScore: Number(profile.productivityScore || 0),
  } : {};

  const { default: GamificationService } = await import('../services/GamificationService.js');
  await GamificationService.evaluateRules(userId);

  const { default: GamificationProfile } = await import('../models/GamificationProfile.js');
  const gamificationProfile = await GamificationProfile.findOne({ userId });
  const totalXP = gamificationProfile ? gamificationProfile.totalXP : 0;

  return {
    goalUpdated: manualGoalUpdates > 0,
    goalsUpdated,
    totalXP,
    goalProgress: goalsUpdated,
    previousScores,
    nextScores,
    scoreDrops: {
      health: Number.isFinite(previousScores.healthScore) && nextScores.healthScore < previousScores.healthScore - 8,
      finance: Number.isFinite(previousScores.financeScore) && nextScores.financeScore < previousScores.financeScore - 8,
      career: Number.isFinite(previousScores.careerScore) && nextScores.careerScore < previousScores.careerScore - 8,
    },
  };
}

async function createNotifications(userId, effects) {
  await resolveNotifications(userId, { category: 'daily-update', subType: 'reminder' });
  await createNotification({
    userId,
    category: 'daily-update',
    subType: 'completed',
    title: 'Daily Twin Update Completed',
    message: "Thank you for updating today's activities.",
    priority: 'low',
    actionLink: '/daily-update',
  });

  if (effects.goalUpdated) {
    await createNotification({
      userId,
      category: 'goal',
      subType: 'daily-goal-completed',
      title: 'Daily Goal Completed',
      message: 'Daily goal completed.',
      priority: 'medium',
      motivation: 'Consistency is your superpower.',
      actionLink: '/goals',
    });
  }

  if (effects.scoreDrops.health) {
    await createNotification({
      userId,
      category: 'health',
      subType: 'health-score',
      title: 'Health Alert',
      message: 'Health score dropped.',
      priority: 'high',
      actionLink: '/health',
      sendEmail: true,
    });
  }

  if (effects.scoreDrops.finance) {
    await createNotification({
      userId,
      category: 'finance',
      subType: 'finance-score',
      title: 'Finance Alert',
      message: 'Finance score dropped.',
      priority: 'high',
      actionLink: '/finance',
      sendEmail: true,
    });
  }

  if (effects.scoreDrops.career) {
    await createNotification({
      userId,
      category: 'career',
      subType: 'career-score',
      title: 'Career Alert',
      message: 'Career score dropped.',
      priority: 'high',
      actionLink: '/career',
      sendEmail: true,
    });
  }
}

async function getOrCreateDailyLog(userId, dateString) {
  let dailyLog = await DailyTracking.findOne({ userId, dateString });
  if (!dailyLog) dailyLog = await DailyTracking.create({ userId, dateString });
  return dailyLog;
}

function normalizePayload(body = {}) {
  return {
    health: {
      waterIntake: num(body.health?.waterIntake),
      exercised: Boolean(body.health?.exercised),
      ateProperly: Boolean(body.health?.ateProperly),
      sleepHours: num(body.health?.sleepHours),
      healthConcern: Boolean(body.health?.healthConcern),
      concernTypes: Array.isArray(body.health?.concernTypes) ? body.health.concernTypes : [],
      concernDescription: String(body.health?.concernDescription || '').trim(),
    },
    finance: {
      spending: num(body.finance?.spending),
      boughtShares: Boolean(body.finance?.boughtShares),
      boughtShareDetails: shareDetails(body.finance?.boughtShareDetails),
      soldShares: Boolean(body.finance?.soldShares),
      soldShareDetails: shareDetails(body.finance?.soldShareDetails),
      insurancePurchased: Boolean(body.finance?.insurancePurchased),
      insuranceDetails: {
        providerName: String(body.finance?.insuranceDetails?.providerName || '').trim(),
        amount: num(body.finance?.insuranceDetails?.amount),
      },
    },
    career: {
      studyHours: num(body.career?.studyHours),
      completedCourse: Boolean(body.career?.completedCourse),
      appliedJobs: Boolean(body.career?.appliedJobs),
      workedOnProject: Boolean(body.career?.workedOnProject),
    },
    goal: {
      goalId: body.goal?.goalId || null,
      goalIds: normalizeGoalIds(body.goal),
      goalCompleted: Boolean(body.goal?.goalCompleted),
    },
  };
}

function normalizeGoalIds(goal = {}) {
  const rawGoalIds = Array.isArray(goal.goalIds) ? goal.goalIds : [];
  const allIds = [...rawGoalIds, goal.goalId].filter(Boolean).map((id) => String(id));
  return Array.from(new Set(allIds));
}

function getSelectedGoalIds(goal = {}) {
  return normalizeGoalIds(goal);
}

function calculateManualGoalIncrement(goal) {
  const target = Number(goal.targetMetric || 1);
  const current = Number(goal.currentMetric || 0);
  const remaining = Math.max(target - current, 0);
  if (remaining <= 0) return 0;

  const now = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const daysLeft = deadline && Number.isFinite(deadline.getTime())
    ? Math.max(Math.ceil((deadline - now) / 86400000), 1)
    : 30;

  const dailySlice = Math.ceil(remaining / Math.min(daysLeft, 30));
  return Math.max(1, Math.min(dailySlice, remaining));
}

function calculateScoreDelta(payload) {
  const concernPenalty = payload.health.healthConcern ? -8 : 2;
  const sleepDelta = payload.health.sleepHours > 0
    ? payload.health.sleepHours >= 7 ? 5 : payload.health.sleepHours < 5 ? -6 : 1
    : 0;
  const health = clamp(
    (payload.health.waterIntake >= 2 ? 3 : -2)
    + (payload.health.exercised ? 5 : -1)
    + (payload.health.ateProperly ? 3 : -2)
    + sleepDelta
    + concernPenalty,
    -12,
    12,
  );
  const finance = clamp(
    (payload.finance.spending > 3000 ? -6 : 2)
    + (payload.finance.insurancePurchased ? 3 : 0)
    + (payload.finance.boughtShares ? 2 : 0)
    + (payload.finance.soldShares ? 1 : 0),
    -10,
    10,
  );
  const career = clamp(
    (payload.career.studyHours >= 2 ? 4 : -2)
    + (payload.career.completedCourse ? 4 : 0)
    + (payload.career.appliedJobs ? 3 : 0)
    + (payload.career.workedOnProject ? 4 : 0),
    -8,
    12,
  );

  return { health, finance, career, burnout: (payload.health.sleepHours > 0 && payload.health.sleepHours < 5) || payload.health.healthConcern ? 5 : -3 };
}

function buildTransactions(finance) {
  const transactions = [];
  if (finance.spending > 0) transactions.push({ amount: finance.spending, category: 'Daily spending', type: 'expense' });
  if (finance.boughtShares && finance.boughtShareDetails.amount > 0) {
    transactions.push({ amount: finance.boughtShareDetails.amount, category: `Bought ${finance.boughtShareDetails.stockName || 'shares'}`, type: 'expense' });
  }
  if (finance.soldShares && finance.soldShareDetails.amount > 0) {
    transactions.push({ amount: finance.soldShareDetails.amount, category: `Sold ${finance.soldShareDetails.stockName || 'shares'}`, type: 'income' });
  }
  if (finance.insurancePurchased && finance.insuranceDetails.amount > 0) {
    transactions.push({ amount: finance.insuranceDetails.amount, category: `Insurance ${finance.insuranceDetails.providerName || ''}`.trim(), type: 'expense' });
  }
  return transactions;
}

function updateDashboardStreak(profile, date, goalCompleted, goalIds = []) {
  const existing = Array.isArray(profile.completedDailyGoals) ? profile.completedDailyGoals : [];
  profile.completedDailyGoals = [
    ...existing.filter((entry) => entry.date !== date),
    { date, goals: goalCompleted ? goalIds : [], goalCompleted, completed: goalCompleted, completedAt: new Date() },
  ];
  profile.lastGoalCompletionDate = date;
  profile.streakStarted = true;
  profile.currentStreak = calculateCurrentStreak(profile.completedDailyGoals, date);
}

function formatGoal(goal) {
  const progress = goal.targetMetric > 0 ? Math.round((goal.currentMetric / goal.targetMetric) * 100) : 0;
  return {
    _id: goal._id,
    title: goal.title,
    domain: goal.domain,
    progress,
    currentMetric: goal.currentMetric,
    targetMetric: goal.targetMetric,
    unit: goal.unit,
    todayTarget: `Add 1 ${goal.unit || 'milestone'} today`,
  };
}

function shareDetails(value = {}) {
  return {
    stockName: String(value.stockName || '').trim(),
    quantity: num(value.quantity),
    amount: num(value.amount),
  };
}

function deriveHealthScore(profile) {
  return clamp(Math.round((100 - Number(profile.burnoutRisk || 0)) * 0.35 + Number(profile.wellnessBalance || 0) * 0.65), 35, 96);
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function calculateCurrentStreak(entries, fromDate) {
  const completedDates = new Set(
    entries
      .filter((entry) => entry.goalCompleted !== false && entry.completed !== false)
      .map((entry) => entry.date),
  );
  let cursor = new Date(`${fromDate}T00:00:00`);
  let streak = 0;

  while (completedDates.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function resolveDate(value) {
  const candidate = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  return todayKey();
}

function num(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(Math.round(value), min), max);
}
