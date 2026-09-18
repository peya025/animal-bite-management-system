import { useState, useEffect } from 'react';
import { APP_NAME } from '../../../constants';
import { LoginRoot } from '../styles/Login.styles';

// Tier 9 — Google Identity Services type declaration (loaded via CDN script in index.html)
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

/** Role → dashboard path mapping for Google SSO redirect */
const ROLE_DASHBOARD: Record<string, string> = {
  treatment:    '/nurse/patients',
  triage:       '/doctor/patients',
  registration: '/patients',
  admin:        '/dashboard',
  developer:    '/dashboard',
};

function resolveLandingRoute(user: any): string {
  if (!user) return '/dashboard';

  const roles = user.roles || [];
  const hasIntake = roles.some((r: any) => r.slug === 'intake_nurse');
  const hasFollowUp = roles.some((r: any) => r.slug === 'follow_up_nurse');

  // Solo / Dual-role Nurse: check active_station_mode preference
  if (hasIntake && hasFollowUp) {
    const activeStation = localStorage.getItem('active_station_mode');
    if (activeStation === 'follow_up') return '/nurse/patients';
    return '/queue';
  }

  // Single-role Intake Nurse
  if (hasIntake) {
    localStorage.setItem('active_station_mode', 'intake');
    return '/queue';
  }

  // Single-role Follow-up Nurse
  if (hasFollowUp) {
    localStorage.setItem('active_station_mode', 'follow_up');
    return '/nurse/patients';
  }

  // Roles with default_route from backend roles table
  if (roles.length > 0 && roles[0].default_route) {
    return roles[0].default_route;
  }

  // Legacy role fallbacks
  if (user.role === 'triage') return '/queue';
  if (user.role === 'registration') return '/patients';
  if (user.role === 'treatment') return '/queue';

  return '/dashboard';
}

export default function Login() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  // Tier 9 — Google SSO states
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError]     = useState('');
  const [gisReady, setGisReady]           = useState(false);

  useEffect(() => {
    const token    = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    if (token && userData) {
      try {
        const u = JSON.parse(userData);
        window.location.replace(resolveLandingRoute(u));
      } catch {
        window.location.replace('/dashboard');
      }
    }
  }, []);

  // Tier 9 — Inject GIS script and initialise once
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;  // SSO disabled if env var not set

    const existingScript = document.getElementById('gis-script');
    if (existingScript) { setGisReady(true); return; }

    const script = document.createElement('script');
    script.id    = 'gis-script';
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setGisReady(true);
    };
    document.head.appendChild(script);
  }, []);

  /** Called by GIS SDK with the credential (ID Token) after user picks a Google account */
  const handleGoogleCredential = async (response: { credential: string }) => {
    setGoogleLoading(true);
    setGoogleError('');
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (!res.ok) {
        // 403 = clinic-level rejection (no account / deactivated / role not allowed)
        setGoogleError(data.message || 'Google Sign-In was rejected. Contact your clinic administrator.');
        return;
      }

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('clinicData', JSON.stringify(data.user?.clinic ?? null));

      const role = data.user?.role as string ?? 'admin';
      window.location.replace(ROLE_DASHBOARD[role] ?? '/dashboard');
    } catch {
      setGoogleError('Google Sign-In failed. Please try again or use email & password.');
    } finally {
      setGoogleLoading(false);
    }
  };

  /** Trigger the GIS One-Tap / popup flow */
  const handleGoogleSignIn = () => {
    if (!gisReady || !window.google) {
      setGoogleError('Google Sign-In is not available. Check your internet connection.');
      return;
    }
    window.google.accounts.id.prompt();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) { setError('Please fill in all fields'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid credentials');

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      // clinic is nested inside user in the backend response
      localStorage.setItem('clinicData', JSON.stringify(data.user?.clinic ?? null));
      window.location.replace(resolveLandingRoute(data.user));
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleLogin = async (roleEmail: string, preferredStation?: 'intake' | 'follow_up' | 'combined') => {
    setEmail(roleEmail);
    setPassword('password123');
    setError('');
    setLoading(true);

    if (preferredStation) {
      localStorage.setItem('active_station_mode', preferredStation);
    }

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: roleEmail, password: 'password123' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid credentials');

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('clinicData', JSON.stringify(data.user?.clinic ?? null));
      window.location.replace(resolveLandingRoute(data.user));
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginRoot>
      <div className="info-panel">
        <div className="logo-container">
          <div className="logo-wrapper">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <h1>{APP_NAME}</h1>
          <p className="tagline">Animal Bite Management & Monitoring System</p>
        </div>
        <div className="minimal-footer">
          <div className="version-badge">v2.0</div>
        </div>
      </div>

      <div className="form-panel">
        <div className="form-header">
          <h2>Welcome back</h2>
          <p>Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input type="email" placeholder="doctor@animalcare.org"
                value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              <button type="button" className="visibility-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.26 3.64m-5.88-2.88a3 3 0 0 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-footer">
            <label className="remember-me">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} disabled={loading} />
              <span>Remember me</span>
            </label>
            <a href="#forgot" className="forgot-password" onClick={e => {
              e.preventDefault();
              setError('Password reset link will be sent to your email');
              setTimeout(() => setError(''), 3000);
            }}>
              Forgot password?
            </a>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <><span className="spinner"></span>Signing in...</>
            ) : (
              <>
                Sign in
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* ── Tier 9: Google SSO Sign-In ── */}
        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>or</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
            </div>

            {/* 403 / rejection security banner */}
            {googleError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', marginBottom: 10,
                background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                fontSize: 12.5, color: '#b91c1c', lineHeight: 1.5,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 9v4"/><path d="M12 17h.01"/>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                <span><strong>Access Restricted:</strong> {googleError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading || !gisReady}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '10px 16px',
                background: '#ffffff', border: '1.5px solid #dadce0', borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: '#3c4043', cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                opacity: (!gisReady || googleLoading) ? 0.6 : 1,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
            >
              {googleLoading ? (
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: '#dadce0', borderTopColor: '#4285F4' }} />
              ) : (
                /* Official Google "G" logo */
                <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in with Google…' : 'Sign in with Google'}
            </button>
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: '6px 0 0', lineHeight: 1.4 }}>
              Only verified clinic staff accounts are permitted. Unauthorized Google accounts are blocked.
            </p>
          </div>
        )}

        {/* Seeded Demo Accounts Quick Access Grid */}
        <div className="seeded-demo-container">
          <div className="seeded-demo-header">
            SEEDED DEMO ACCOUNTS — PASSWORD: password123
          </div>
          <div className="seeded-demo-grid">
            <button
              type="button"
              className="role-demo-btn"
              onClick={() => handleQuickRoleLogin('developer@clinic.com')}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Developer</span>
            </button>

            <button
              type="button"
              className="role-demo-btn"
              onClick={() => handleQuickRoleLogin('admin@clinic.com')}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Administrator</span>
            </button>

            <button
              type="button"
              className="role-demo-btn"
              onClick={() => handleQuickRoleLogin('registration@clinic.com')}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Registration Staff</span>
            </button>

            <button
              type="button"
              className="role-demo-btn"
              onClick={() => handleQuickRoleLogin('triage@clinic.com')}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Triage Doctor</span>
            </button>

            {/* ── DUAL-NURSE WORKSTATIONS ── */}
            <div style={{
              gridColumn: 'span 2',
              marginTop: '8px',
              paddingTop: '10px',
              borderTop: '1px dashed var(--gray-200, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary, #0f766e)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nursing Workstations (Dual-Nurse Architecture)
              </span>
            </div>

            <button
              type="button"
              className="role-demo-btn"
              onClick={() => handleQuickRoleLogin('nurse1@clinic.com', 'intake')}
              disabled={loading}
              style={{
                borderLeft: '3px solid #0284c7',
                background: '#f0f9ff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '2px',
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span style={{ fontWeight: 700, color: '#0369a1', fontSize: '13.5px' }}>Nurse 1: Intake</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, paddingLeft: '24px' }}>
                Maria Santos, RN · Day 0 / Queue
              </span>
            </button>

            <button
              type="button"
              className="role-demo-btn"
              onClick={() => handleQuickRoleLogin('nurse2@clinic.com', 'follow_up')}
              disabled={loading}
              style={{
                borderLeft: '3px solid #059669',
                background: '#f0fdf4',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '2px',
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span style={{ fontWeight: 700, color: '#047857', fontSize: '13.5px' }}>Nurse 2: Follow-up</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, paddingLeft: '24px' }}>
                Juan Reyes, RN · Patient List
              </span>
            </button>

            <button
              type="button"
              className="role-demo-btn"
              onClick={() => handleQuickRoleLogin('treatment@clinic.com', 'combined')}
              disabled={loading}
              style={{
                gridColumn: 'span 2',
                borderLeft: '3px solid #0f766e',
                background: '#f0fdfa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#0f766e', fontSize: '13.5px' }}>
                    Solo Nurse (Combined Work — Nurse 1 & 2)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    Elena Cruz, RN · Both Roles Assigned · Top Station Switcher
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0f766e',
                background: '#ccfbf1',
                padding: '3px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}>
                Dual Roles
              </span>
            </button>
          </div>
        </div>
      </div>
    </LoginRoot>
  );
}
