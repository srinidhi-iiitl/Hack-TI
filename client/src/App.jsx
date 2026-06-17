import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import OnboardingRoute from './components/OnboardingRoute';
import MainLayout from './layouts/MainLayout';
import Career from './pages/Career';
import Copilot from './pages/Copilot';
import Dashboard from './pages/Dashboard';
import DailyUpdate from './pages/DailyUpdate';
import Finance from './pages/Finance';
import Goals from './pages/Goals';
import Health from './pages/Health';
import Intelligence from './pages/Intelligence';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import Simulation from './pages/Simulation';
import Landing from './pages/Landing';
import DocumentUpload from './pages/DocumentUpload';
import { GamificationProvider } from './context/GamificationContext';
import { IntegrationProvider } from './context/IntegrationContext';
import { DashboardSyncProvider } from './context/DashboardSyncContext';
import { ThemeProvider } from './context/ThemeContext';
import ToastOverlay from './components/ToastOverlay';
import axios from 'axios';

// Set up global response interceptor to detect successful data mutation requests
axios.interceptors.response.use(
  (response) => {
    const url = response.config?.url || '';
    const method = response.config?.method?.toLowerCase() || '';

    const isMutative = ['post', 'put', 'delete', 'patch'].includes(method) && (
      url.includes('/api/goals') ||
      url.includes('/api/health') ||
      url.includes('/api/finance') ||
      url.includes('/api/career') ||
      url.includes('/api/daily-update') ||
      url.includes('/api/gamification') ||
      url.includes('/api/integrations') ||
      url.includes('/api/meal-plans') ||
      url.includes('/api/ai')
    );

    // Check if the response was successful and represents a mutative action affecting goals/gamification
    if (
      response.status >= 200 &&
      response.status < 300 &&
      isMutative
    ) {
      console.log(`[Axios Interceptor] Ingestion/Sync request success to ${url}, dispatching dashboard-data-updated and gamification-updated events.`);
      window.dispatchEvent(new Event('dashboard-data-updated'));
      window.dispatchEvent(new Event('gamification-updated'));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider } from './context/languageContext.js';
import PageTranslationHost from './components/PageTranslationHost.jsx';

function App() {
  return (
    // The Provider MUST wrap everything!
    <ThemeProvider>
      <GamificationProvider>
        <IntegrationProvider>
          <DashboardSyncProvider>
            <LanguageProvider>
            <BrowserRouter>
          <PageTranslationHost />
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <Onboarding />
                </OnboardingRoute>
              }
            />

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/health" element={<ErrorBoundary><Health /></ErrorBoundary>} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/career" element={<Career />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/ai-intelligence" element={<Intelligence />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/copilot" element={<Copilot />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/daily-update" element={<DailyUpdate />} />
              <Route path="/document-upload" element={<DocumentUpload />} />
            </Route>
          </Routes>
        </BrowserRouter>
            </LanguageProvider>
        
        <ToastOverlay />
          </DashboardSyncProvider>
        </IntegrationProvider>
      </GamificationProvider>
    </ThemeProvider>
  );
}

export default App;
