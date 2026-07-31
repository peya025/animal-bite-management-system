# Laravel Sanctum & CORS Setup Guide

## Why You Need Sanctum and CORS

### Laravel Sanctum
**Sanctum** provides API authentication for:
- Single-page applications (React/Vue frontend)
- Mobile applications (Flutter)
- Simple token-based API authentication

**Benefits:**
- Secure token authentication
- Session-based authentication for SPAs
- Simple to implement
- Built-in token management
- Perfect for frontend-backend separation

### CORS (Cross-Origin Resource Sharing)
**CORS** is essential because:
- Your frontend (http://localhost:5173) and backend (http://localhost:8000) run on different ports
- Browsers block cross-origin requests by default
- CORS allows your React app to communicate with Laravel API

## What Has Been Configured

### 1. Sanctum Installation ✅
- Package already installed in `composer.json`
- Configuration published to `config/sanctum.php`
- Migration created for `personal_access_tokens` table
- User model updated with `HasApiTokens` trait

### 2. CORS Configuration ✅
- Created `config/cors.php` with proper settings
- Allowed origins: localhost:5173, 127.0.0.1:5173
- Allowed methods: All HTTP methods
- Credentials support: Enabled

### 3. Middleware Setup ✅
- Sanctum middleware added to API routes
- CORS automatically handled by Laravel

### 4. API Routes Created ✅
```
POST /api/register    - Register new user
POST /api/login       - Login and get token
POST /api/logout      - Logout (requires auth)
GET  /api/me          - Get authenticated user
GET  /api/user        - Get user info (requires auth)
```

### 5. Environment Configuration ✅
Added to `.env`:
```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
```

## How to Use in React Frontend

### 1. Install Axios
```bash
cd frontend
npm install axios
```

### 2. Create API Client (`src/api/client.ts`)
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add token to requests if it exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### 3. Create Auth Service (`src/api/authService.ts`)
```typescript
import apiClient from './client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
  };
  token: string;
  token_type: string;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/register', data);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/login', credentials);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/logout');
    localStorage.removeItem('auth_token');
  },

  async getUser() {
    const response = await apiClient.get('/me');
    return response.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },
};
```

### 4. Use in Login Component
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/authService';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await authService.login({ email, password });
      console.log('Logged in:', response.user);
      navigate('/dashboard'); // Redirect after login
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Testing the Setup

### 1. Test Registration (Using curl or Postman)
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }'
```

### 2. Test Login
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Response will include a token:
```json
{
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com"
  },
  "token": "1|xxxxxxxxxxxxx",
  "token_type": "Bearer"
}
```

### 3. Test Authenticated Request
```bash
curl -X GET http://localhost:8000/api/me \
  -H "Authorization: Bearer 1|xxxxxxxxxxxxx"
```

## Common Issues and Solutions

### Issue 1: CORS Error
**Error:** "Access to XMLHttpRequest has been blocked by CORS policy"

**Solution:**
- Ensure backend is running on `http://localhost:8000`
- Ensure frontend is running on `http://localhost:5173`
- Check `config/cors.php` has correct origins
- Clear Laravel cache: `php artisan config:clear`

### Issue 2: 401 Unauthorized
**Solution:**
- Verify token is being sent in Authorization header
- Check token hasn't expired
- Ensure user exists in database

### Issue 3: Token Not Working
**Solution:**
- Clear browser localStorage
- Re-login to get new token
- Check `personal_access_tokens` table in database

### Issue 4: Session Not Persisting
**Solution:**
- Ensure `withCredentials: true` in Axios config
- Check `SANCTUM_STATEFUL_DOMAINS` in `.env`
- Make sure `supports_credentials` is true in `cors.php`

## Security Best Practices

1. **Never commit `.env` file** - Contains sensitive configuration
2. **Use HTTPS in production** - Protect tokens in transit
3. **Set token expiration** - Configure in `sanctum.php`
4. **Validate all inputs** - Always use Laravel validation
5. **Rate limiting** - Add throttle middleware to auth routes
6. **Strong passwords** - Enforce minimum 8 characters
7. **Token rotation** - Revoke old tokens on logout

## Production Configuration

For production, update `.env`:
```env
APP_URL=https://yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com
```

Update `config/cors.php`:
```php
'allowed_origins' => [
    env('FRONTEND_URL'),
],
```

## Additional Resources

- [Laravel Sanctum Documentation](https://laravel.com/docs/sanctum)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Axios Documentation](https://axios-http.com/)
