import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import App from '../App.jsx';
import { restoreSession } from '../features/auth/authThunks.js';

function AuthBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return <App />;
}

export default AuthBootstrap;
