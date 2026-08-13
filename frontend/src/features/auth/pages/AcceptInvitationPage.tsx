import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoginRoot } from '../styles/Login.styles';

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/staff-invitations/validate/${token}`, {
        headers: { 'Accept': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.valid) {
        setError(data.message || 'Invalid or expired invitation');
        setLoading(false);
        return;
      }
      
      setInvitation(data.invitation);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to validate invitation. Please check your internet connection.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !password || !passwordConfirmation) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    if (phone && phone.length !== 11) {
      setError('Phone number must be exactly 11 digits');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`http://localhost:8000/api/staff-invitations/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name,
          password,
          password_confirmation: passwordConfirmation,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create account');
      }

      // Store auth data and redirect to dashboard
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('clinicData', JSON.stringify(data.user.clinic));

      // Redirect to dashboard
      window.location.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <LoginRoot>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6b7280' }}>Validating invitation...</p>
        </div>
      </LoginRoot>
    );
  }

  if (error && !invitation) {
    return (
      <LoginRoot>
        <div className="info-panel">
          <div className="logo-container">
            <div className="logo-wrapper">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1>Invalid Invitation</h1>
            <p className="tagline">{error}</p>
          </div>
        </div>

        <div className="form-panel">
          <div className="form-header">
            <h2>Something went wrong</h2>
            <p>This invitation link is invalid or has expired</p>
          </div>

          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>{error}</p>
          </div>

          <button 
            onClick={() => navigate('/login')}
            style={{
              width: '100%',
              padding: '14px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go to Login
          </button>
        </div>
      </LoginRoot>
    );
  }

  return (
    <LoginRoot>
      <div className="info-panel">
        <div className="logo-container">
          <div className="logo-wrapper">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <h1>Welcome!</h1>
          <p className="tagline">Create your account to join {invitation?.clinic_name}</p>
        </div>
        
        <div className="minimal-footer">
          <div className="version-badge">Staff Invitation</div>
        </div>
      </div>

      <div className="form-panel">
        <div className="form-header">
          <h2>Create your account</h2>
          <p>You've been invited as <strong>{invitation?.role}</strong> staff</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div className="input-group">
            <label>Email Address (Pre-filled)</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input type="email" value={invitation?.email || ''} disabled 
                style={{ background: '#f9fafb', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div className="input-group">
            <label>Full Name *</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input 
                type="text" 
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Phone Number (Optional)</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <input 
                type="tel" 
                placeholder="09123456789"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password *</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <button 
                type="button" 
                className="visibility-toggle" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.26 3.64m-5.88-2.88a3 3 0 0 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
              Must be at least 8 characters
            </p>
          </div>

          <div className="input-group">
            <label>Confirm Password *</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={passwordConfirmation}
                onChange={e => setPasswordConfirmation(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            {passwordConfirmation && password !== passwordConfirmation && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
                <span>Passwords do not match</span>
              </p>
            )}
          </div>

          <button type="submit" className="login-button" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner"></span>
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#ecfdf5',
          borderRadius: '12px',
          fontSize: '13px',
          color: 'var(--primary-dark)'
        }}>
          <strong>Note:</strong> After creating your account, you'll be automatically logged in.
        </div>
      </div>
    </LoginRoot>
  );
}
