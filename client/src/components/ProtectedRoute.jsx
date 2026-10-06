import { Navigate, useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function ProtectedRoute({ children, adminOnly = false }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Keep the query string too, so a scanned QR link (?token=...) survives the login detour.
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
return (
  <>
    <AppHeader />
    {children}
  </>
);
export default ProtectedRoute;
