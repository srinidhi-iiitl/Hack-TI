import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      Authorization: `Bearer ${token || ''}`,
      Accept: 'application/json',
    },
  };
};

export const isFitbandAccount = (provider) => String(provider || '').endsWith('_fitband');
export const isGoogleFitAccount = (provider) => String(provider || '').includes('googlefit');

export const getHealthProviderLabel = (accountName = '', fallbackProvider = '') => {
  const name = String(accountName || fallbackProvider || '').trim().toLowerCase();
  if (!name) return fallbackProvider || 'Unknown';
  if (name.includes('googlefit')) return 'Google Fit';
  if (name.includes('fitbit')) return 'Fitbit';
  if (name === 'gargi_fitband') return 'Gargi Fitband';
  if (name === 'anjali_fitband') return 'Anjali Fitband';
  return fallbackProvider || accountName;
};

export const mapMetricsToDeviceData = (rawMetrics = {}) => {
  const device = rawMetrics.device || {};
  return {
    ...rawMetrics,
    steps: rawMetrics.steps ?? null,
    sleepHours: rawMetrics.sleepHours ?? null,
    hrv: rawMetrics.hrv ?? null,
    restingHeartRate: rawMetrics.restingHeartRate ?? null,
    distanceKm: rawMetrics.distanceKm ?? null,
    avgHeartRate: rawMetrics.avgHeartRate ?? rawMetrics.heartRate ?? null,
    activeCalories: rawMetrics.activeCalories ?? rawMetrics.calories ?? null,
    deviceName: device.name ?? rawMetrics.deviceName ?? null,
    deviceModel: device.model ?? rawMetrics.deviceModel ?? null,
    firmware: device.firmware ?? rawMetrics.firmware ?? null,
    battery: device.battery ?? rawMetrics.battery ?? null,
  };
};

export const connectGoogleFit = async (integrationLink = 'anjali_googlefit') => {
  console.log('[1] OAuth Start - connectGoogleFit called');
  const response = await axios.post(
    `${API_BASE_URL}/api/health/integration`,
    { integrationLink },
    getHeaders()
  );
  return response.data;
};

export const connectMockDevice = async (integrationLink) => {
  console.log('[Mock Fitband] connectMockDevice called for', integrationLink);
  const response = await axios.post(
    `${API_BASE_URL}/api/health/integration`,
    { integrationLink },
    getHeaders()
  );
  return response.data;
};

export const getIntegrationStatus = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/health/integration`, getHeaders());
  return response.data;
};

export const getMetrics = async (provider) => {
  if (isGoogleFitAccount(provider)) {
    console.log('[Google Fit] getMetrics called for Google Fit');
    const response = await axios.get(`${API_BASE_URL}/api/health/google/live`, getHeaders());
    return response.data;
  }
  if (isFitbandAccount(provider)) {
    console.log('[Mock Fitband] getMetrics called for', provider);
    const response = await axios.get(`${API_BASE_URL}/api/health/integration/metrics`, getHeaders());
    return response.data;
  }
  throw new Error(`Unsupported health provider: ${provider}`);
};

export const disconnect = async () => {
  const response = await axios.delete(`${API_BASE_URL}/api/health/integration`, getHeaders());
  return response.data;
};

export const fetchWeatherAdvice = async (latitude, longitude) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/health/weather-advice`,
    { latitude, longitude },
    getHeaders()
  );
  return response.data;
};

export default {
  connectGoogleFit,
  connectMockDevice,
  getIntegrationStatus,
  getMetrics,
  disconnect,
  fetchWeatherAdvice,
  getHealthProviderLabel,
  mapMetricsToDeviceData,
  isFitbandAccount,
  isGoogleFitAccount,
};
