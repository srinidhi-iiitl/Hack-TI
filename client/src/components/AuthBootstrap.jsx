import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import App from '../App.jsx';
import { restoreSession } from '../features/auth/authThunks.js';
import { fetchCareerIntegrations } from '../features/careerIntegrations/careerIntegrationSlice.js';
import { fetchHealthIntegration } from '../features/healthIntegration/healthIntegrationSlice.js';

function AuthBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession())
      .unwrap()
      .then(() => {
        dispatch(fetchCareerIntegrations());
        dispatch(fetchHealthIntegration());
      })
      .catch(() => {});
  }, [dispatch]);

  return <App />;
}

export default AuthBootstrap;
