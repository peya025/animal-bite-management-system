import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

import { resolveDefaultAuthorizedRoute } from '../shared/utils/accessControl';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const defaultRoute = resolveDefaultAuthorizedRoute(user);
    return <Navigate to={defaultRoute} state={{ accessDenied: true, from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
