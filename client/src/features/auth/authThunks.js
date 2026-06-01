import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { dispatch, rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
    const { token, user } = response.data.data;

    persistSession({ token, user });
    dispatch({ type: 'auth/loginSuccess', payload: { token, user } });

    return { token, user };
  } catch (error) {
    clearPersistedSession();
    dispatch({ type: 'auth/loginFailure' });
    return rejectWithValue(error.response?.data?.message || 'Login failed.');
  }
});

export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { dispatch, rejectWithValue }) => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    clearPersistedSession();
    dispatch({ type: 'auth/logout' });
    return rejectWithValue('No token found');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = response.data.data;

    persistSession({ token, user });
    dispatch({ type: 'auth/loginSuccess', payload: { token, user } });

    return { token, user };
  } catch (error) {
    clearPersistedSession();
    dispatch({ type: 'auth/logout' });
    return rejectWithValue(error.response?.data?.message || 'Session expired.');
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { dispatch }) => {
  const token = localStorage.getItem('authToken');

  try {
    if (token) {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Local logout still wins if the server is unavailable.
  } finally {
    clearPersistedSession();
    dispatch({ type: 'auth/logout' });
  }
});

function persistSession({ token, user }) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearPersistedSession() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('lifetwinOnboardingProfile');
  localStorage.removeItem('digitalTwinDashboardData');
}
