import { BrowserRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Career from './pages/Career';
import Copilot from './pages/Copilot';
import Dashboard from './pages/Dashboard';
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

// ✅ Import the Gamification Provider and the Toast Overlay
import { GamificationProvider } from './context/GamificationContext';
import ToastOverlay from './components/ToastOverlay';

function App() {
  return (
    // ✅ The Provider MUST wrap everything!
    <GamificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/health" element={<Health />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/career" element={<Career />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/simulation" element={<Simulation />} />
          </Route>
        </Routes>
      </BrowserRouter>
      
      {/* ✅ The Toast Overlay sits here, listening for XP! */}
      <ToastOverlay />
    </GamificationProvider>
  );
}

export default App;