import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

function PublicRoute({ children }) {
  const { isAuthenticated, loading, token } = useSelector((state) => state.auth);
  const hasPersistedToken = Boolean(token || localStorage.getItem('authToken'));

  if (loading) {
    return null;
  }

  if (isAuthenticated || hasPersistedToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PublicRoute;
