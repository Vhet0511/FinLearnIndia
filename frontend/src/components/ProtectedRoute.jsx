import { Navigate } from 'react-router-dom';
import { getRole, homePathForRole } from '../auth.js';

// Frontend-only guard for the prototype. It is NOT real security.
export default function ProtectedRoute({ role, children }) {
  const currentRole = getRole();

  if (!currentRole) {
    return <Navigate to="/login" replace />;
  }
  if (currentRole !== role) {
    // Logged in with the other role: send them back to their own dashboard.
    return <Navigate to={homePathForRole(currentRole)} replace />;
  }
  return children;
}