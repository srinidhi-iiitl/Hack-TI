import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DEFAULT_PROVIDER = 'gargi_fitband';

const initialState = {
  connected: false,
  provider: DEFAULT_PROVIDER,
  integrationLink: '',
  lastSync: null,
  deviceData: {},
  loading: false,
  saving: false,
  error: '',
  hydrated: false,
};

export const fetchHealthIntegration = createAsyncThunk(
  'healthIntegration/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const integration = await axios.get(`${API_BASE_URL}/api/health-integration`, { headers: authHeaders() });
      let deviceData = {};
      if (integration.data?.data?.connected) {
        deviceData = await fetchMockDeviceData();
      }
      return { ...(integration.data.data || {}), deviceData };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not load health integration.');
    }
  }
);

export const saveHealthIntegration = createAsyncThunk(
  'healthIntegration/save',
  async ({ integrationLink, provider = DEFAULT_PROVIDER }, { rejectWithValue }) => {
    try {
      const integration = await axios.put(
        `${API_BASE_URL}/api/health-integration`,
        { integrationLink, provider },
        { headers: authHeaders() },
      );
      const deviceData = await fetchMockDeviceData();
      return { ...(integration.data.data || {}), deviceData };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not save health integration.');
    }
  }
);

export const disconnectHealthIntegration = createAsyncThunk(
  'healthIntegration/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      const integration = await axios.delete(`${API_BASE_URL}/api/health-integration`, { headers: authHeaders() });
      return integration.data.data || {};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not disconnect health integration.');
    }
  }
);

const healthIntegrationSlice = createSlice({
  name: 'healthIntegration',
  initialState,
  reducers: {
    clearHealthIntegrationError(state) {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHealthIntegration.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchHealthIntegration.fulfilled, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        applyHealthIntegration(state, action.payload);
      })
      .addCase(fetchHealthIntegration.rejected, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        state.error = action.payload || 'Could not load health integration.';
      })
      .addCase(saveHealthIntegration.pending, (state) => {
        state.saving = true;
        state.error = '';
      })
      .addCase(saveHealthIntegration.fulfilled, (state, action) => {
        state.saving = false;
        state.hydrated = true;
        applyHealthIntegration(state, action.payload);
      })
      .addCase(saveHealthIntegration.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Could not save health integration.';
      })
      .addCase(disconnectHealthIntegration.pending, (state) => {
        state.saving = true;
        state.error = '';
      })
      .addCase(disconnectHealthIntegration.fulfilled, (state, action) => {
        state.saving = false;
        applyHealthIntegration(state, action.payload);
        state.deviceData = {};
      })
      .addCase(disconnectHealthIntegration.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Could not disconnect health integration.';
      });
  },
});

export const { clearHealthIntegrationError } = healthIntegrationSlice.actions;
export default healthIntegrationSlice.reducer;

function applyHealthIntegration(state, payload = {}) {
  state.connected = Boolean(payload.connected);
  state.provider = payload.provider || DEFAULT_PROVIDER;
  state.integrationLink = payload.integrationLink || '';
  state.lastSync = payload.lastSync || null;
  state.deviceData = payload.deviceData || {};
}

async function fetchMockDeviceData() {
  const response = await axios.get(`${API_BASE_URL}/api/integrations/health`, { headers: authHeaders() });
  const metrics = response.data?.data?.metrics || {};
  return { ...metrics, sleepHours: metrics.sleepHours != null ? parseFloat(metrics.sleepHours) : metrics.sleepHours };
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` };
}
