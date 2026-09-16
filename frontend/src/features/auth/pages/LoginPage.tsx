import { useState, useEffect } from 'react';
import { APP_NAME } from '../../../constants';
import { LoginRoot } from '../styles/Login.styles';

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
  if (user.role === 'registration') return '/registration';
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
