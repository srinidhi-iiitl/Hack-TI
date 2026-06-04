import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const emptyState = {
  github: {
    connected: false,
    username: '',
    profileUrl: '',
  },
  leetcode: {
    connected: false,
    username: '',
    profileUrl: '',
  },
  linkedin: {
    connected: false,
    profileUrl: '',
  },
};

const initialState = {
  ...emptyState,
  loading: false,
  saving: false,
  error: '',
  hydrated: false,
};

export const fetchCareerIntegrations = createAsyncThunk(
  'careerIntegrations/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/career-integrations`, {
        headers: authHeaders(),
      });
      return response.data.data || {};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not load career integrations.');
    }
  }
);

export const saveCareerIntegrations = createAsyncThunk(
  'careerIntegrations/save',
  async (updates, { getState, rejectWithValue }) => {
    try {
      const current = selectCareerIntegrationLinks(getState());
      const next = normalizeCareerLinks({ ...current, ...(updates || {}) });
      const response = await axios.put(
        `${API_BASE_URL}/api/career-integrations`,
        { careerIntegrations: next },
        { headers: authHeaders() }
      );
      return response.data.data || next;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not save career integrations.');
    }
  }
);

export const disconnectCareerIntegration = createAsyncThunk(
  'careerIntegrations/disconnect',
  async (provider, { getState, dispatch, rejectWithValue }) => {
    if (!['github', 'leetcode', 'linkedin'].includes(provider)) {
      return rejectWithValue('Unknown career integration.');
    }

    const current = selectCareerIntegrationLinks(getState());
    return dispatch(saveCareerIntegrations({ ...current, [provider]: '' })).unwrap();
  }
);

const careerIntegrationSlice = createSlice({
  name: 'careerIntegrations',
  initialState,
  reducers: {
    setCareerIntegrationLinks(state, action) {
      applyCareerLinks(state, action.payload || {});
      state.error = '';
    },
    clearCareerIntegrationError(state) {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCareerIntegrations.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchCareerIntegrations.fulfilled, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        applyCareerLinks(state, action.payload);
      })
      .addCase(fetchCareerIntegrations.rejected, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        state.error = action.payload || 'Could not load career integrations.';
      })
      .addCase(saveCareerIntegrations.pending, (state) => {
        state.saving = true;
        state.error = '';
      })
      .addCase(saveCareerIntegrations.fulfilled, (state, action) => {
        state.saving = false;
        state.hydrated = true;
        applyCareerLinks(state, action.payload);
      })
      .addCase(saveCareerIntegrations.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Could not save career integrations.';
      });
  },
});

export const { setCareerIntegrationLinks, clearCareerIntegrationError } = careerIntegrationSlice.actions;
export default careerIntegrationSlice.reducer;

export function selectCareerIntegrationLinks(state) {
  const career = state.careerIntegrations || emptyState;
  return {
    github: career.github?.profileUrl || '',
    leetcode: career.leetcode?.profileUrl || '',
    linkedin: career.linkedin?.profileUrl || '',
  };
}

function applyCareerLinks(state, links) {
  const normalized = normalizeCareerLinks(links);
  state.github = buildGithubState(normalized.github);
  state.leetcode = buildLeetcodeState(normalized.leetcode);
  state.linkedin = buildLinkedinState(normalized.linkedin);
}

function normalizeCareerLinks(links = {}) {
  return {
    github: normalizeGithubUrl(links.github),
    leetcode: normalizeLeetcodeUrl(links.leetcode),
    linkedin: normalizeLinkedinUrl(links.linkedin),
  };
}

function buildGithubState(profileUrl = '') {
  return {
    connected: Boolean(profileUrl),
    username: extractGithubUsername(profileUrl),
    profileUrl,
  };
}

function buildLeetcodeState(profileUrl = '') {
  return {
    connected: Boolean(profileUrl),
    username: extractLeetcodeUsername(profileUrl),
    profileUrl,
  };
}

function buildLinkedinState(profileUrl = '') {
  return {
    connected: Boolean(profileUrl),
    profileUrl,
  };
}

function normalizeGithubUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const username = extractGithubUsername(trimmed);
  return username ? `https://github.com/${username}` : trimmed;
}

function normalizeLeetcodeUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const username = extractLeetcodeUsername(trimmed);
  return username ? `https://leetcode.com/u/${username}` : trimmed;
}

function normalizeLinkedinUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://linkedin.com/in/${trimmed.replace(/^@/, '')}`;
}

function extractGithubUsername(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`);
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function extractLeetcodeUsername(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://leetcode.com/u/${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] === 'u' ? parts[1] || '' : parts[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` };
}
