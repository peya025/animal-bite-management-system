import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { User, Clinic, LoginCredentials, AuthContextType } from '../types';
import authService from '../services/auth.service';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes max inactivity
export const WARNING_TIMEOUT_MS = 55 * 60 * 1000; // 55 minutes of inactivity (5 min warning before timeout)
export const LAST_ACTIVITY_KEY = 'lastActivityAt';
const USER_ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
  'pointerdown',
] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300);

  const navigate = useNavigate();
  const location = useLocation();
  const clinicRevision = useRef(0);
  const lastRecordedRef = useRef(Date.now());

  const recordActivity = (force = false) => {
    const now = Date.now();
    if (force || now - lastRecordedRef.current >= 2000) {
      lastRecordedRef.current = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      setShowWarning(false);
    }
  };

  // Hydrate from localStorage on mount & check for expired session
  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUser = authService.getUser();
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
      lastRecordedRef.current = Date.now();
    }
    if (!storedToken || !storedUser) setIsLoading(false);
  }, [navigate]);

  // Reset inactivity timer on navigation route changes
  useEffect(() => {
    if (token && user) {
      recordActivity(true);
    }
  }, [location.pathname, location.search, token, user]);

  // Sync clinic updates across components / events
  useEffect(() => {
    const handleClinicUpdate = (event: CustomEvent<Clinic>) => {
      if (event.detail) {
        clinicRevision.current += 1;
        setClinic(event.detail);
        localStorage.setItem('clinicData', JSON.stringify(event.detail));
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'clinicData' && event.newValue) {
        try {
          clinicRevision.current += 1;
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

  // Refresh restored sessions and returning tabs through the existing clinic source.
  useEffect(() => {
    if (!token) return;
    let active = true;
    const refreshClinic = async () => {
      const revision = clinicRevision.current;
      try {
        const currentUser = await authService.getCurrentUser();
        // A Save Changes response takes precedence over an older in-flight refresh.
        if (active && revision === clinicRevision.current && authService.getToken() === token && currentUser.clinic) {
          setClinic(currentUser.clinic);
          localStorage.setItem('clinicData', JSON.stringify(currentUser.clinic));
          window.dispatchEvent(new CustomEvent('clinic-updated', { detail: currentUser.clinic }));
        }
      } catch {
        // Keep the cached clinic available when the server is temporarily offline.
      }
    };
    void refreshClinic().finally(() => { if (active) setIsLoading(false); });
    window.addEventListener('focus', refreshClinic);
    return () => { active = false; window.removeEventListener('focus', refreshClinic); };
  }, [token]);

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

  // Active idle-timeout watcher, user activity listeners, and warning modal
  useEffect(() => {
    if (!token || !user) return;

    const handleUserActivity = () => {
      recordActivity(false);
    };

    USER_ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const handleWindowFocus = () => {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      const now = Date.now();
      if (lastActivity && now - lastActivity >= IDLE_TIMEOUT_MS) {
        setShowWarning(false);
        authService.clearAuthSession();
        setUser(null);
        setClinic(null);
        setToken(null);
        navigate('/login?reason=idle-timeout', { replace: true });
      } else {
        recordActivity(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleWindowFocus();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        const newTime = Number(event.newValue);
        if (Date.now() - newTime < WARNING_TIMEOUT_MS) {
          setShowWarning(false);
        }
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    const checkInterval = setInterval(() => {
      const currentToken = localStorage.getItem('authToken');
      if (!currentToken) return;

      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      if (!lastActivity) return;

      const elapsed = Date.now() - lastActivity;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        setShowWarning(false);
        authService.clearAuthSession();
        setUser(null);
        setClinic(null);
        setToken(null);
        navigate('/login?reason=idle-timeout', { replace: true });
      } else if (elapsed >= WARNING_TIMEOUT_MS) {
        setShowWarning(true);
        const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setRemainingSeconds(remaining);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      USER_ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
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
      lastRecordedRef.current = Date.now();

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
    setShowWarning(false);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setClinic(null);
      setToken(null);
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const formatRemainingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs === 0) {
      return `${mins} minute${mins > 1 ? 's' : ''}`;
    }
    if (mins > 0) {
      return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${secs} second${secs > 1 ? 's' : ''}`;
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

  return (
    <AuthContext.Provider value={value}>
      {children}
      {!!token && !!user && (
        <Dialog
          open={showWarning}
          onClose={() => recordActivity(true)}
          maxWidth="xs"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: '16px',
                p: 1,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              },
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                flexShrink: 0,
              }}
            >
              <WarningAmberRoundedIcon />
            </Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Session Timeout Warning
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body1" sx={{ color: '#334155', mb: 1.5, fontWeight: 500 }}>
              Your session will expire in {formatRemainingTime(remainingSeconds)} due to inactivity.
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.5 }}>
              Please interact with the system or click <strong>Continue Session</strong> to remain logged in.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={logout}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#cbd5e1',
                color: '#64748b',
                borderRadius: '8px',
                '&:hover': {
                  borderColor: '#94a3b8',
                  backgroundColor: '#f8fafc',
                },
              }}
            >
              Log Out
            </Button>
            <Button
              variant="contained"
              onClick={() => recordActivity(true)}
              autoFocus
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: '#0d9488',
                borderRadius: '8px',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#0f766e',
                  boxShadow: 'none',
                },
              }}
            >
              Continue Session
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
