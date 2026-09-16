/**
 * Axios instance with Bearer token injection and 401 auto-redirect.
 * This is the single API client used across the entire application.
 */
import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'lastActivityAt';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
});

// Attach the auth token to every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (token && lastActivity && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('clinicData');
      window.location.href = '/login?reason=idle-timeout';
      return Promise.reject(new Error('Clinical workstation session expired due to inactivity.'));
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    return config;
  },
  error => Promise.reject(error),
);

// On 401, clear storage and bounce to login
api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login'; // Can't import ROUTES here — circular dep risk, literal is safe
    }
    return Promise.reject(error);
  },
);

export default api;
