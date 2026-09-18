import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Clinic, LoginCredentials, AuthContextType } from '../types';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'lastActivityAt';
const USER_ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [clinic,    setClinic]    = useState<Clinic | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Hydrate from localStorage on mount & check for expired session
  useEffect(() => {
    const storedToken  = authService.getToken();
    const storedUser   = authService.getUser();
    const storedClinic = localStorage.getItem('clinicData');
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);

    if (storedToken && storedUser) {
      if (lastActivity && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        authService.clearAuthSession();
        setIsLoading(false);
        navigate('/login?reason=idle-timeout', { replace: true });
        return;
      }

      setToken(storedToken);
      setUser(storedUser);
      if (storedClinic) {
        try {
          setClinic(JSON.parse(storedClinic));
        } catch {
          // ignore
        }
      }
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
    setIsLoading(false);
  }, [navigate]);

  // Active idle-timeout watcher and user activity listeners
  useEffect(() => {
    if (!token || !user) return;

    let lastRecorded = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to at most once every 3 seconds
      if (now - lastRecorded >= 3000) {
        lastRecorded = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      }
    };

    USER_ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const currentToken = localStorage.getItem('authToken');
      if (!currentToken) return;

      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      if (lastActivity && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        authService.clearAuthSession();
        setUser(null);
        setClinic(null);
        setToken(null);
        navigate('/login?reason=idle-timeout', { replace: true });
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      USER_ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [token, user, navigate]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setToken(response.token);
      setUser(response.user);
      setClinic(response.clinic);

      if (!response.clinic?.is_setup_complete && response.user.role === 'admin') {
        navigate(ROUTES.SETUP);
      } else {
        navigate(ROUTES.DASHBOARD);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setClinic(null);
      setToken(null);
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const value: AuthContextType = {
    user,
    clinic,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
