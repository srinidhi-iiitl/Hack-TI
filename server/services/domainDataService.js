import DailyTracking from '../models/DailyTracking.js';
import LifeProfile from '../models/LifeProfile.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getOrCreateDailyTracking(userId, dateString = todayKey()) {
  return DailyTracking.findOneAndUpdate(
    { userId, dateString },
    { $setOnInsert: { userId, dateString } },
    { new: true, upsert: true },
  );
}

export async function getOrCreateLifeProfile(userId) {
  return LifeProfile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true },
  );
}

export async function getLatestOnboardingProfile(userId) {
  return OnboardingProfile.findOne({ userId }).sort({ updatedAt: -1 });
}

export function buildTrajectory(values = []) {
  return values.map((value, index) => ({
    date: value.dateString || value.createdAt?.toISOString?.().slice(0, 10) || `point-${index + 1}`,
    health: value.health || {},
    finance: value.finance || {},
  }));
}

export function scoreFromParts(parts) {
  const cleanParts = parts.map((part) => Number(part) || 0);
  if (!cleanParts.length) return 0;
  return Math.round(cleanParts.reduce((sum, part) => sum + part, 0) / cleanParts.length);
}
