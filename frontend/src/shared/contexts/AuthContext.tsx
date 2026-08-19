import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Clinic, LoginCredentials, AuthContextType } from '../types';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [clinic,    setClinic]    = useState<Clinic | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedToken  = authService.getToken();
    const storedUser   = authService.getUser();
    const storedClinic = localStorage.getItem('clinicData');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      if (storedClinic) setClinic(JSON.parse(storedClinic));
    }
    setIsLoading(false);
  }, []);

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

  const logout = () => {
    setUser(null);
    setClinic(null);
    setToken(null);
    authService.logout();
    navigate(ROUTES.LOGIN, { replace: true });
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
