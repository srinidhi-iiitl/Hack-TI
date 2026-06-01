import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getSettings() {
  const response = await axios.get(`${API_BASE_URL}/api/settings`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function updateSettings(settings) {
  const response = await axios.put(`${API_BASE_URL}/api/settings`, settings, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function processAssistantCommand(command) {
  const response = await axios.post(
    `${API_BASE_URL}/api/assistant/command`,
    { command },
    { headers: authHeaders() },
  );
  return response.data;
}

export async function createGoalFromAssistant(action) {
  const response = await axios.post(
    `${API_BASE_URL}/api/goals`,
    {
      domain: action.domain || 'career',
      title: action.title,
      description: action.description || '',
      targetMetric: Number(action.targetMetric || 1),
      unit: action.unit || 'milestone',
      priority: action.priority || 'medium',
      deadline: action.deadline,
    },
    { headers: authHeaders() },
  );
  return response.data;
}

export async function getDashboardForAssistant() {
  const response = await axios.get(`${API_BASE_URL}/api/dashboard`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getFinanceForAssistant() {
  const response = await axios.get(`${API_BASE_URL}/api/finance`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function runSimulationForAssistant(payload = {}) {
  const currentResponse = await axios.get(`${API_BASE_URL}/api/simulation/current`, {
    headers: authHeaders(),
  });
  const current = {
    ...(currentResponse.data?.data?.current || {}),
    ...(payload.current || {}),
  };
  const simulated = {
    ...(currentResponse.data?.data?.simulated || current),
    ...(payload.simulated || {}),
  };

  const response = await axios.post(
    `${API_BASE_URL}/api/simulation/run`,
    { current, simulated },
    { headers: authHeaders() },
  );
  return response.data;
}
