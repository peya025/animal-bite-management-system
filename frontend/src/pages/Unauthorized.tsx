import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resolveDefaultAuthorizedRoute } from '../shared/utils/accessControl';

/**
 * Legacy Unauthorized page replacement:
 * Seamlessly bounces authenticated users to their role default page with an access denied popup,
 * or unauthenticated users to /login. The static unauthorized error page is never shown.
 */
export default function Unauthorized() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const defaultRoute = resolveDefaultAuthorizedRoute(user);
    navigate(defaultRoute, { replace: true, state: { accessDenied: true } });
  }, [isAuthenticated, user, isLoading, navigate]);

  return null;
}
