/**
 * Mock Fitband Service
 * Returns deterministic mock health metrics per fitband account profile.
 */

const MOCK_PROFILES = {
  gargi_fitband: {
    steps: 9120,
    heartRate: 68,
    restingHeartRate: 62,
    sleepHours: 7.8,
    calories: 520,
    hrv: 72,
    distanceKm: 6.4,
    deviceName: 'Gargi Fitband Pro',
    deviceModel: 'GFP-2024',
    firmware: '2.1.4',
    battery: 87,
  },
  anjali_fitband: {
    steps: 7345,
    heartRate: 74,
    restingHeartRate: 66,
    sleepHours: 7.2,
    calories: 430,
    hrv: 58,
    distanceKm: 5.8,
    deviceName: 'Anjali Fitband',
    deviceModel: 'AFP-2024',
    firmware: '2.0.8',
    battery: 73,
  },
};

export const getMetrics = (accountName = 'anjali_fitband') => {
  const normalized = String(accountName || '').trim().toLowerCase();
  const profileKey = normalized.endsWith('_fitband') && MOCK_PROFILES[normalized]
    ? normalized
    : normalized.endsWith('_fitband')
      ? normalized
      : 'anjali_fitband';
  const profile = MOCK_PROFILES[profileKey] || MOCK_PROFILES.anjali_fitband;

  console.log(`[Mock Fitband Service] Mock metric fetch for ${profileKey}`);

  return {
    source: profileKey,
    steps: profile.steps,
    heartRate: profile.heartRate,
    restingHeartRate: profile.restingHeartRate,
    sleepHours: profile.sleepHours,
    calories: profile.calories,
    hrv: profile.hrv,
    distanceKm: profile.distanceKm,
    deviceName: profile.deviceName,
    deviceModel: profile.deviceModel,
    firmware: profile.firmware,
    battery: profile.battery,
    device: {
      name: profile.deviceName,
      model: profile.deviceModel,
      firmware: profile.firmware,
      battery: profile.battery,
    },
  };
};

export default {
  getMetrics,
};
