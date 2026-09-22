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

  // Sync clinic updates across components / events
  useEffect(() => {
    const handleClinicUpdate = (event: CustomEvent<Clinic>) => {
      if (event.detail) {
        setClinic(event.detail);
        localStorage.setItem('clinicData', JSON.stringify(event.detail));
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'clinicData' && event.newValue) {
        try {
          setClinic(JSON.parse(event.newValue));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('clinic-updated' as any, handleClinicUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('clinic-updated' as any, handleClinicUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Dynamically update document title and favicon based on active clinic branding
  useEffect(() => {
    if (clinic?.name) {
      document.title = clinic.subtitle ? `${clinic.name} — ${clinic.subtitle}` : clinic.name;
    }

    const backendBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    const activeFavicon = clinic?.logo_url
      ? clinic.logo_url
      : clinic?.logo_path
        ? `${backendBase}/storage/${clinic.logo_path}`
        : '/assets/abtcare-app-icon.png';

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = activeFavicon;
    }
  }, [clinic]);

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

  const updateClinic = (newClinic: Clinic) => {
    setClinic(newClinic);
    localStorage.setItem('clinicData', JSON.stringify(newClinic));
    window.dispatchEvent(new CustomEvent('clinic-updated', { detail: newClinic }));
  };

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
    updateClinic,
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
