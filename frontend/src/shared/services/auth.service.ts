/**
 * Authentication service.
 * Handles login, logout, registration, and local storage token management.
 */
import api from './api';
import type { LoginCredentials, LoginResponse, User } from '../types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<any>('/login', {
      email: credentials.email,
      password: credentials.password,
    });

    const data = response.data;
    // Backend returns { user: { ...clinic }, token } — clinic is nested inside user
    const clinic = data.user?.clinic ?? data.clinic ?? null;

    if (data.token) {
      localStorage.setItem('authToken',  data.token);
      localStorage.setItem('userData',   JSON.stringify(data.user));
      localStorage.setItem('clinicData', JSON.stringify(clinic));
    }

    // Normalise to the shape AuthContext expects: { token, user, clinic }
    return {
      token:  data.token,
      user:   data.user,
      clinic: clinic,
    };
  }

  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('clinicData');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<any>('/me');
    // Backend returns flat user object (no wrapping { user: ... } key)
    return response.data.user ?? response.data;
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<LoginResponse> {
    const response = await api.post<any>('/register', data);
    const res = response.data;
    const clinic = res.user?.clinic ?? res.clinic ?? null;

    if (res.token) {
      localStorage.setItem('authToken',  res.token);
      localStorage.setItem('userData',   JSON.stringify(res.user));
      localStorage.setItem('clinicData', JSON.stringify(clinic));
    }

    return { token: res.token, user: res.user, clinic };
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getUser(): User | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

export default new AuthService();
