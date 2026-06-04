import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import careerIntegrationReducer from '../features/careerIntegrations/careerIntegrationSlice';
import dailyUpdateReducer from '../features/dailyUpdate/dailyUpdateSlice';
import healthIntegrationReducer from '../features/healthIntegration/healthIntegrationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    careerIntegrations: careerIntegrationReducer,
    dailyUpdate: dailyUpdateReducer,
    healthIntegration: healthIntegrationReducer,
  },
});

export default store;
