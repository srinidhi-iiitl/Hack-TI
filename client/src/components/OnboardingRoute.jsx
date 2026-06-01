import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function OnboardingRoute({ children }) {
  const { isAuthenticated, loading, token } = useSelector((state) => state.auth);
  const activeToken = token || localStorage.getItem('authToken');
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !activeToken) {
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      setCheckingOnboarding(true);

      axios.get(`${API_BASE_URL}/api/onboarding`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
        .then((response) => {
          if (isMounted) setOnboardingCompleted(Boolean(response.data.completed));
        })
        .catch(() => {
          if (isMounted) setOnboardingCompleted(false);
        })
        .finally(() => {
          if (isMounted) setCheckingOnboarding(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [activeToken, isAuthenticated]);

  if (loading || checkingOnboarding) {
    return null;
  }

  if (!isAuthenticated && !activeToken) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default OnboardingRoute;
