import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import healthApi, { mapMetricsToDeviceData } from '../../services/healthIntegrationApi.js';

const DEFAULT_PROVIDER = 'anjali_fitband';

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
      const statusRes = await healthApi.getIntegrationStatus();
      const status = statusRes.data || {};

      let deviceData = {};
      if (status.connected && status.provider) {
        const metricsRes = await healthApi.getMetrics(status.provider);
        deviceData = mapMetricsToDeviceData(metricsRes.data?.metrics || {});
      }

      return {
        connected: status.connected,
        provider: status.provider || DEFAULT_PROVIDER,
        integrationLink: status.integrationLink || status.provider || '',
        lastSync: status.lastSync || new Date().toISOString(),
        deviceData,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not load health integration.');
    }
  }
);

export const saveHealthIntegration = createAsyncThunk(
  'healthIntegration/save',
  async ({ integrationLink }, { rejectWithValue }) => {
    try {
      const link = String(integrationLink || '').trim();

      if (link.endsWith('_fitband')) {
        const connectRes = await healthApi.connectMockDevice(link);
        const data = connectRes.data || {};
        const metricsRes = await healthApi.getMetrics(link);
        const deviceData = mapMetricsToDeviceData(metricsRes.data?.metrics || {});
        return {
          connected: data.connected,
          provider: data.provider || link,
          integrationLink: data.integrationLink || link,
          lastSync: new Date().toISOString(),
          deviceData,
        };
      }

      if (link.includes('googlefit')) {
        const connectRes = await healthApi.connectGoogleFit(link);
        if (connectRes.url) {
          window.location.href = connectRes.url;
        }
        return {
          connected: false,
          provider: link,
          integrationLink: link,
          lastSync: null,
          deviceData: {},
        };
      }

      return rejectWithValue('Invalid integration link.');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not save health integration.');
    }
  }
);

export const disconnectHealthIntegration = createAsyncThunk(
  'healthIntegration/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      const res = await healthApi.disconnect();
      return res.data || {};
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
