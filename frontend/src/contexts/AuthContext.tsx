import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Clinic, LoginCredentials, AuthContextType } from '../types';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const storedToken = authService.getToken();
      const storedUser = authService.getUser();
      const storedClinic = localStorage.getItem('clinicData');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        if (storedClinic) {
          setClinic(JSON.parse(storedClinic));
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setToken(response.token);
      setUser(response.user);
      setClinic(response.clinic);
      
      // Redirect based on clinic setup status
      if (!response.clinic.setup_completed && response.user.role === 'admin') {
        navigate('/setup');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setClinic(null);
    setToken(null);
    navigate('/login');
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
