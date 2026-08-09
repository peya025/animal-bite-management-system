import { useState } from 'react';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { SetupWizardRoot } from '../styles/SetupWizard.styles';
import { ROUTES } from '../../../shared/config/routes';

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
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
    { number: 1, title: 'Admin Account', icon: '👤' },
    { number: 2, title: 'Customize', icon: '🎨' },
    { number: 3, title: 'Clinic Profile', icon: '🏥' },
    { number: 4, title: 'Confirm', icon: '✓' },
    { number: 5, title: 'Done', icon: '🎉' },
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

  return (
    <SetupWizardRoot>
      {currentStep === 0 && <WelcomeScreen onStart={() => setCurrentStep(1)} />}
      
      {currentStep > 0 && (
        <>
          {/* Progress Steps */}
          <div className="setup-header">
            <div className="setup-logo">
              <div className="logo-circle">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <span className="logo-text">ABC Management System</span>
            </div>
          </div>

          <div className="setup-container">
            <div className="step-indicators">
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
                  <div className="step-number">{step.number}</div>
                  <div className="step-title">{step.title}</div>
                </div>
              ))}
            </div>

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

            <div className="setup-actions">
              {currentStep > 1 && currentStep < 5 && (
                <button className="btn-back" onClick={handleBack}>
                  Back
                </button>
              )}
              {currentStep < 5 && (
                <button className="btn-next" onClick={handleNext}>
                  {currentStep === 4 ? 'Complete Setup' : 'Next'}
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
      <div className="welcome-content">
        <div className="welcome-header">
          <h1 className="welcome-title">ABC Management System</h1>
          <div className="welcome-logo">
            <div className="animal-bite-logo">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="#10b981" strokeWidth="2"/>
              </svg>
              <span className="logo-badge">Animal Bite Center</span>
            </div>
          </div>
        </div>

        <div className="welcome-illustration">
          <div className="illustration-content">
            <span className="illustration-icon">✓</span>
            <span className="illustration-icon">💉</span>
            <span className="illustration-icon">🏥</span>
          </div>
        </div>

        <div className="welcome-text">
          <h2>Let's set up your workspace in just a few steps.</h2>
          <p>This will only take a moment.</p>
        </div>

        <button className="btn-start" onClick={onStart}>
          Start Setup
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <input
          type="text"
          value={data.clinicName}
          onChange={(e) => setData({ ...data, clinicName: e.target.value })}
          placeholder="Tagoloan Rural Health Unit"
          required
        />
      </div>

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#6b7280', fontWeight: 600 }}>
          Administrator Details
        </h3>

        <div className="form-group">
          <label>Your Full Name *</label>
          <input
            type="text"
            value={data.adminName}
            onChange={(e) => setData({ ...data, adminName: e.target.value })}
            placeholder="Dr. Juan Dela Cruz"
            required
          />
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input
            type="email"
            value={data.adminEmail}
            onChange={(e) => setData({ ...data, adminEmail: e.target.value })}
            placeholder="admin@clinic.com"
            required
          />
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            You'll use this email to log in
          </p>
        </div>

        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            value={data.adminPassword}
            onChange={(e) => setData({ ...data, adminPassword: e.target.value })}
            placeholder="Minimum 8 characters"
            required
          />
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            Must contain uppercase, lowercase, and a number
          </p>
        </div>

        <div className="form-group">
          <label>Confirm Password *</label>
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
          {data.adminPasswordConfirm && !passwordsMatch && (
            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
              ⚠️ Passwords do not match
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomizeStep({ data, setData }: any) {
  return (
    <div className="step-content">
      <h2>Customize Your App</h2>
      <p className="step-description">Personalize the look and feel of your application</p>

      <div className="form-group">
        <label>Application Name</label>
        <input
          type="text"
          value={data.appName}
          onChange={(e) => setData({ ...data, appName: e.target.value })}
          placeholder="My Animal Bite Center"
        />
      </div>

      <div className="form-group">
        <label>Logo (Optional)</label>
        <div className="file-upload">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setData({ ...data, logo: e.target.files?.[0] || null })}
          />
          <p className="file-hint">Upload your clinic logo (PNG, JPG, max 2MB)</p>
        </div>
      </div>

      <div className="form-group">
        <label>Primary Color</label>
        <div className="color-picker">
          <input
            type="color"
            value={data.primaryColor}
            onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
          />
          <span className="color-value">{data.primaryColor}</span>
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
        <textarea
          value={data.address}
          onChange={(e) => setData({ ...data, address: e.target.value })}
          placeholder="123 Main Street, City, Province"
          rows={3}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Phone *</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
            maxLength={11}
            placeholder="09123456789"
            required
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            placeholder="contact@clinic.com"
            required
          />
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
        <h3>Admin Account</h3>
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
        <h3>Customization</h3>
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
        <h3>Clinic Information</h3>
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
      <div className="success-icon">🎉</div>
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
