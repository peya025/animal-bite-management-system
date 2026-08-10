import { useState } from 'react';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { SetupWizardRoot } from '../styles/SetupWizard.styles';
import { ROUTES } from '../../../shared/config/routes';

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [setupData, setSetupData] = useState({
    // Step 1: Admin Account
    clinicName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    
    // Step 2: Customize
    appName: 'Animal Bite Center',
    logo: null as File | null,
    primaryColor: '#10b981',
    
    // Step 3: Clinic Profile
    address: '',
    phone: '',
    email: '',
  });

  const steps = [
    {
      number: 1,
      title: 'Admin Account',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      number: 2,
      title: 'Customize',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19c.4892.5.7338.75.8948.5732.1611-.1767.1111-.5049.011-.1611-.1706-1.2789-.0041-2.4293.5087-3.4293s1.3433-1.7936 2.3772-2.2718c1.0338-.4782 2.213-.6144 3.3305-.3904 1.1175.2241 2.1091.7959 2.8383 1.6386" />
          <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
          <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
          <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
        </svg>
      )
    },
    {
      number: 3,
      title: 'Clinic Profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
          <path d="M10 9h4M12 7v4" />
        </svg>
      )
    },
    {
      number: 4,
      title: 'Confirm',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    },
    {
      number: 5,
      title: 'Done',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      )
    },
  ];

  const handleNext = async () => {
    // Step 1: Admin Account Creation (PUBLIC - no auth required)
    if (currentStep === 1) {
      if (!setupData.clinicName || !setupData.adminName || !setupData.adminEmail || 
          !setupData.adminPassword || !setupData.adminPasswordConfirm) {
        alert('Please fill in all required fields');
        return;
      }
      
      if (setupData.adminPassword !== setupData.adminPasswordConfirm) {
        alert('Passwords do not match');
        return;
      }
      
      if (setupData.adminPassword.length < 8) {
        alert('Password must be at least 8 characters');
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/setup/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            clinic_name: setupData.clinicName,
            admin_name: setupData.adminName,
            admin_email: setupData.adminEmail,
            admin_password: setupData.adminPassword,
            admin_password_confirmation: setupData.adminPasswordConfirm,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          const msg = error.message || (error.errors ? Object.values(error.errors).flat().join(', ') : 'Failed to create admin account');
          alert(msg);
          return;
        }

        const data = await response.json();
        
        // Store authentication token
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('clinicData', JSON.stringify(data.clinic));

        // Proceed to next step (now authenticated!)
        setCurrentStep(2);
        return;

      } catch (error) {
        console.error('Setup initialization error:', error);
        alert('Failed to create admin account. Please try again.');
        return;
      }
    }

    // Validate Step 3 (Clinic Profile) before proceeding
    if (currentStep === 3) {
      if (!setupData.address || !setupData.phone || !setupData.email) {
        alert('Please fill in all required fields (Address, Phone, Email)');
        return;
      }
      if (setupData.phone.length !== 11) {
        alert('Phone number must be exactly 11 digits');
        return;
      }
    }

    if (currentStep === 4) {
      // Show confirmation modal before completing setup
      setShowConfirmModal(true);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) { // Don't allow going back from Step 1 (admin creation)
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteSetup = async () => {
    setShowConfirmModal(false);
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        window.location.href = ROUTES.LOGIN;
        return;
      }

      const jsonHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',       // ← required so Laravel returns JSON errors
        'Authorization': `Bearer ${token}`,
      };
      
      // Step 1: Update clinic information
      const updateResponse = await fetch('http://localhost:8000/api/setup/clinic', {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({
          name:           setupData.clinicName,
          address:        setupData.address,
          contact_number: setupData.phone,   // ← backend column is contact_number
          email:          setupData.email,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        // If unauthenticated, token is stale — force re-login
        if (updateResponse.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('clinicData');
          alert('Your session has expired. Please log in again.');
          window.location.href = ROUTES.LOGIN;
          return;
        }
        const msg = errorData.message
          || (errorData.errors ? Object.values(errorData.errors).flat().join(', ') : 'Unknown error');
        alert(`Failed to update clinic information: ${msg}`);
        return;
      }

      await updateResponse.json();

      // Step 2: Mark setup as complete
      const completeResponse = await fetch('http://localhost:8000/api/setup/complete', {
        method: 'POST',
        headers: jsonHeaders,
      });

      if (completeResponse.ok) {
        const data = await completeResponse.json();
        
        // Update localStorage with latest clinic data
        localStorage.setItem('clinicData', JSON.stringify(data.clinic));
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.clinic) {
          userData.clinic.is_setup_complete   = true;
          userData.clinic.setup_completed_at  = data.clinic.setup_completed_at;
          userData.clinic.name                = data.clinic.name;
          userData.clinic.address             = data.clinic.address;
          userData.clinic.contact_number      = data.clinic.contact_number;
          userData.clinic.email               = data.clinic.email;
        }
        localStorage.setItem('userData', JSON.stringify(userData));

        setShowSuccessModal(true);
        setTimeout(() => {
          window.location.href = ROUTES.DASHBOARD;
        }, 2000);
      } else {
        const errorData = await completeResponse.json();
        alert(`Failed to complete setup: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Setup error:', error);
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const progressWidth = `${((currentStep - 1) / (steps.length - 1)) * 100}%`;

  return (
    <SetupWizardRoot className={isDarkMode ? 'theme-dark' : 'theme-light'}>
      {/* Background blobs for luxury ambient blur */}
      <div className="ambient-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Sparkling star particles */}
      <div className="sparkles-container">
        <div className="sparkle sparkle-1">
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/>
          </svg>
        </div>
        <div className="sparkle sparkle-2">
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/>
          </svg>
        </div>
        <div className="sparkle sparkle-3">
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/>
          </svg>
        </div>
        <div className="sparkle sparkle-4">
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/>
          </svg>
        </div>
        <div className="sparkle sparkle-5">
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/>
          </svg>
        </div>
      </div>

      {/* Floating Theme Toggle in Welcome Screen */}
      {currentStep === 0 && (
        <button
          className="theme-toggle-floating"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      )}

      {currentStep === 0 && <WelcomeScreen onStart={() => setCurrentStep(1)} />}
      
      {currentStep > 0 && (
        <>
          {/* Progress Steps Header */}
          <div className="setup-header">
            <div className="setup-logo">
              <div className="logo-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="logo-text">ABC Setup Wizard</span>
            </div>

            {/* Theme Toggle Button inside Header */}
            <button
              className="theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          <div className="setup-container">
            {/* Dynamic Squircle Progress Stepper */}
            <div className="step-indicators">
              <div className="step-indicators-progress" style={{ width: progressWidth }}></div>
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`step-indicator ${
                    index + 1 === currentStep
                      ? 'active'
                      : index + 1 < currentStep
                      ? 'completed'
                      : ''
                  }`}
                >
                  <div className="step-number">
                    {index + 1 < currentStep ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : step.icon}
                  </div>
                  <div className="step-title">{step.title}</div>
                </div>
              ))}
            </div>

            {/* Stepper Card Content */}
            <div className="setup-content">
              {currentStep === 1 && (
                <AdminAccountStep data={setupData} setData={setSetupData} />
              )}
              {currentStep === 2 && (
                <CustomizeStep data={setupData} setData={setSetupData} />
              )}
              {currentStep === 3 && (
                <ClinicProfileStep data={setupData} setData={setSetupData} />
              )}
              {currentStep === 4 && (
                <ConfirmStep data={setupData} />
              )}
              {currentStep === 5 && (
                <DoneStep />
              )}
            </div>

            {/* Actions Bar */}
            <div className="setup-actions">
              {currentStep > 1 && currentStep < 5 && (
                <button className="btn-back" onClick={handleBack}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Back
                </button>
              )}
              {currentStep < 5 && (
                <button className="btn-next" onClick={handleNext}>
                  {currentStep === 4 ? 'Complete Setup' : 'Next'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {currentStep === 4 ? (
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
                    ) : (
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirm Setup Modal */}
      {showConfirmModal && (
        <ConfirmationDialog
          variant="warning"
          title="Complete Setup?"
          message="Once you complete the setup, your clinic profile will be saved and you'll be redirected to the dashboard. Make sure all information is correct."
          confirmLabel="Yes, complete setup"
          onConfirm={handleCompleteSetup}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <ConfirmationDialog
          variant="success"
          title="Setup Complete!"
          message="Your clinic profile has been saved. Redirecting you to the dashboard…"
          hideCancel
        />
      )}
    </SetupWizardRoot>
  );
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-logo-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 className="welcome-title">ABC Management System</h1>
        <p className="welcome-subtitle">Setup & Workspace Configuration</p>

        <div className="welcome-illustration">
          <div className="illustration-content">
            <div className="illustration-item">
              <span className="illustration-icon">🛡️</span>
              <span className="illustration-label">Secure</span>
            </div>
            <div className="illustration-item">
              <span className="illustration-icon">💉</span>
              <span className="illustration-label">Vaccines</span>
            </div>
            <div className="illustration-item">
              <span className="illustration-icon">🏥</span>
              <span className="illustration-label">Clinics</span>
            </div>
          </div>
        </div>

        <div className="welcome-text">
          <h2>Let's set up your workspace in a few simple steps.</h2>
          <p>We'll configure your admin account, personalize your branding, and finalize your clinic details.</p>
        </div>

        <button className="btn-start" onClick={onStart}>
          Start Setup
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function AdminAccountStep({ data, setData }: any) {
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  return (
    <div className="step-content">
      <h2>Create Admin Account</h2>
      <p className="step-description">
        Set up the clinic and create your administrator account
      </p>

      <div className="form-group">
        <label>Clinic Name *</label>
        <div className="input-with-icon">
          <input
            type="text"
            value={data.clinicName}
            onChange={(e) => setData({ ...data, clinicName: e.target.value })}
            placeholder="Tagoloan Rural Health Unit"
            required
          />
          <div className="input-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1.5px solid #cbd5e1' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '20px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Administrator Details
        </h3>

        <div className="form-group">
          <label>Your Full Name *</label>
          <div className="input-with-icon">
            <input
              type="text"
              value={data.adminName}
              onChange={(e) => setData({ ...data, adminName: e.target.value })}
              placeholder="Dr. Juan Dela Cruz"
              required
            />
            <div className="input-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <div className="input-with-icon">
            <input
              type="email"
              value={data.adminEmail}
              onChange={(e) => setData({ ...data, adminEmail: e.target.value })}
              placeholder="admin@clinic.com"
              required
            />
            <div className="input-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
            You'll use this email to log in
          </p>
        </div>

        <div className="form-group">
          <label>Password *</label>
          <div className="input-with-icon">
            <input
              type="password"
              value={data.adminPassword}
              onChange={(e) => setData({ ...data, adminPassword: e.target.value })}
              placeholder="Minimum 8 characters"
              required
            />
            <div className="input-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
            Must contain uppercase, lowercase, and a number
          </p>
        </div>

        <div className="form-group">
          <label>Confirm Password *</label>
          <div className="input-with-icon">
            <input
              type="password"
              value={data.adminPasswordConfirm}
              onChange={(e) => {
                setData({ ...data, adminPasswordConfirm: e.target.value });
                setPasswordsMatch(e.target.value === data.adminPassword || e.target.value === '');
              }}
              placeholder="Re-enter password"
              required
            />
            <div className="input-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
          {data.adminPasswordConfirm && !passwordsMatch && (
            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', fontWeight: 600 }}>
              ⚠️ Passwords do not match
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomizeStep({ data, setData }: any) {
  const presets = [
    { name: 'Emerald Green', value: '#10b981' },
    { name: 'Royal Blue', value: '#3b82f6' },
    { name: 'Warm Amber', value: '#f59e0b' },
    { name: 'Deep Purple', value: '#8b5cf6' },
    { name: 'Crimson Red', value: '#ef4444' },
  ];

  return (
    <div className="step-content">
      <h2>Customize Your App</h2>
      <p className="step-description">Personalize the look and feel of your application</p>

      <div className="form-group">
        <label>Application Name</label>
        <div className="input-with-icon">
          <input
            type="text"
            value={data.appName}
            onChange={(e) => setData({ ...data, appName: e.target.value })}
            placeholder="My Animal Bite Center"
          />
          <div className="input-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Logo (Optional)</label>
        {!data.logo ? (
          <label className="file-upload-card">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setData({ ...data, logo: e.target.files?.[0] || null })}
            />
            <div className="file-upload-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <p className="file-upload-text">
              <span>Click to upload</span> or drag and drop
            </p>
            <p className="file-upload-hint">PNG, JPG or SVG (max. 2MB)</p>
          </label>
        ) : (
          <div className="file-uploaded-preview">
            <img
              src={URL.createObjectURL(data.logo)}
              alt="Logo Preview"
              className="file-preview-thumbnail"
            />
            <div className="file-preview-info">
              <p className="file-preview-name">{data.logo.name}</p>
              <p className="file-preview-size">{(data.logo.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              className="btn-remove-file"
              onClick={() => setData({ ...data, logo: null })}
              title="Remove logo"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Primary Theme Color</label>
        
        {/* Preset color swatches */}
        <div className="preset-colors" style={{ marginTop: '8px', marginBottom: '18px' }}>
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`preset-color-btn ${data.primaryColor === preset.value ? 'active' : ''}`}
              style={{ background: preset.value }}
              onClick={() => setData({ ...data, primaryColor: preset.value })}
              title={preset.name}
            />
          ))}
        </div>

        {/* Custom hex selector */}
        <div className="color-picker-wrapper">
          <input
            type="color"
            className="color-picker-input"
            value={data.primaryColor}
            onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
          />
          <div className="color-picker-details">
            <span className="color-picker-label">Custom Theme Hex</span>
            <span className="color-picker-hex">{data.primaryColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClinicProfileStep({ data, setData }: any) {
  return (
    <div className="step-content">
      <h2>Clinic Profile</h2>
      <p className="step-description">Enter additional clinic information</p>

      <div className="form-group">
        <label>Address *</label>
        <div className="input-with-icon">
          <textarea
            value={data.address}
            onChange={(e) => setData({ ...data, address: e.target.value })}
            placeholder="123 Main Street, City, Province"
            rows={3}
            required
            style={{ paddingLeft: '44px' }}
          />
          <div className="input-icon-wrapper" style={{ top: '16px', alignItems: 'flex-start' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Phone *</label>
          <div className="input-with-icon">
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              maxLength={11}
              placeholder="09123456789"
              required
            />
            <div className="input-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Email *</label>
          <div className="input-with-icon">
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              placeholder="contact@clinic.com"
              required
            />
            <div className="input-icon-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmStep({ data }: any) {
  return (
    <div className="step-content">
      <h2>Confirm Your Setup</h2>
      <p className="step-description">Please review your information before completing</p>

      <div className="confirm-section">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Admin Account
        </h3>
        <div className="confirm-item">
          <span className="confirm-label">Admin Name:</span>
          <span className="confirm-value">{data.adminName}</span>
        </div>
        <div className="confirm-item">
          <span className="confirm-label">Admin Email:</span>
          <span className="confirm-value">{data.adminEmail}</span>
        </div>
        <div className="confirm-item">
          <span className="confirm-label">Password:</span>
          <span className="confirm-value">••••••••</span>
        </div>
      </div>

      <div className="confirm-section">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19c.4892.5.7338.75.8948.5732.1611-.1767.1111-.5049.011-.1611" />
          </svg>
          Customization
        </h3>
        <div className="confirm-item">
          <span className="confirm-label">App Name:</span>
          <span className="confirm-value">{data.appName}</span>
        </div>
        <div className="confirm-item">
          <span className="confirm-label">Primary Color:</span>
          <span className="confirm-value">
            <span className="color-preview" style={{ background: data.primaryColor }}></span>
            {data.primaryColor}
          </span>
        </div>
      </div>

      <div className="confirm-section">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
            <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
          </svg>
          Clinic Information
        </h3>
        <div className="confirm-item">
          <span className="confirm-label">Name:</span>
          <span className="confirm-value">{data.clinicName}</span>
        </div>
        <div className="confirm-item">
          <span className="confirm-label">Address:</span>
          <span className="confirm-value">{data.address}</span>
        </div>
        <div className="confirm-item">
          <span className="confirm-label">Phone:</span>
          <span className="confirm-value">{data.phone}</span>
        </div>
        <div className="confirm-item">
          <span className="confirm-label">Email:</span>
          <span className="confirm-value">{data.email}</span>
        </div>
      </div>
    </div>
  );
}

function DoneStep() {
  return (
    <div className="step-content done-step">
      <div className="success-checkmark-wrapper">
        <svg width="90" height="90" viewBox="0 0 52 52">
          <circle className="success-checkmark-circle" cx="26" cy="26" r="25" />
          <path className="success-checkmark-check" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
      </div>
      <h2>Setup Complete!</h2>
      <p>Your Animal Bite Center is ready to use.</p>
      <button 
        className="btn-dashboard"
        onClick={() => window.location.href = ROUTES.DASHBOARD}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
