/**
 * Authentication service.
 * Handles login, logout, registration, and local storage token management.
 */
import api from './api';
import type { LoginCredentials, LoginResponse, User } from '../types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/login', {
      email: credentials.email,
      password: credentials.password,
    });
    if (response.data.token) {
      localStorage.setItem('authToken',  response.data.token);
      localStorage.setItem('userData',   JSON.stringify(response.data.user));
      localStorage.setItem('clinicData', JSON.stringify(response.data.clinic));
    }
    return response.data;
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
    const response = await api.get<{ user: User }>('/me');
    return response.data.user;
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/register', data);
    if (response.data.token) {
      localStorage.setItem('authToken',  response.data.token);
      localStorage.setItem('userData',   JSON.stringify(response.data.user));
      localStorage.setItem('clinicData', JSON.stringify(response.data.clinic));
    }
    return response.data;
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
