import { useState } from 'react';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { SetupWizardRoot } from '../styles/SetupWizard.styles';
import { ROUTES } from '../../../shared/config/routes';

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [setupData, setSetupData] = useState({
    // Step 1: Customize
    appName: 'Animal Bite Center',
    logo: null as File | null,
    primaryColor: '#10b981',
    
    // Step 2: Clinic Profile
    clinicName: '',
    address: '',
    phone: '',
    email: '',
    
    // Step 3: Confirm (review all data)
  });

  const steps = [
    { number: 1, title: 'Customize', icon: '🎨' },
    { number: 2, title: 'Clinic Profile', icon: '🏥' },
    { number: 3, title: 'Confirm', icon: '✓' },
    { number: 4, title: 'Done', icon: '🎉' },
  ];

  const handleNext = () => {
    // Validate Step 2 (Clinic Profile) before proceeding
    if (currentStep === 2) {
      if (!setupData.clinicName || !setupData.address || !setupData.phone || !setupData.email) {
        alert('Please fill in all required fields (Clinic Name, Address, Phone, Email)');
        return;
      }
    }

    if (currentStep === 3) {
      // Show confirmation modal before completing setup
      setShowConfirmModal(true);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
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
      
      // Step 1: Update clinic information
      console.log('Updating clinic information...');
      const updateResponse = await fetch('http://localhost:8000/api/setup/clinic', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: setupData.clinicName,
          address: setupData.address,
          phone: setupData.phone,
          email: setupData.email,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error('Update clinic failed:', errorData);
        alert(`Failed to update clinic information: ${errorData.message || 'Unknown error'}`);
        return;
      }

      const updateData = await updateResponse.json();
      console.log('Clinic updated successfully:', updateData);

      // Step 2: Mark setup as complete
      console.log('Marking setup as complete...');
      const completeResponse = await fetch('http://localhost:8000/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (completeResponse.ok) {
        const data = await completeResponse.json();
        console.log('Setup completed successfully:', data);
        
        // Update localStorage with clinic data
        localStorage.setItem('clinicData', JSON.stringify(data.clinic));
        
        // Update user data in localStorage to reflect setup completion
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.clinic) {
          userData.clinic.is_setup_complete = true;
          userData.clinic.setup_completed_at = data.clinic.setup_completed_at;
          userData.clinic.name = data.clinic.name;
          userData.clinic.address = data.clinic.address;
          userData.clinic.phone = data.clinic.phone;
          userData.clinic.email = data.clinic.email;
        }
        localStorage.setItem('userData', JSON.stringify(userData));

        // Show success modal then redirect
        setShowSuccessModal(true);
        setTimeout(() => {
          window.location.href = ROUTES.DASHBOARD;
        }, 2000);
      } else {
        const errorData = await completeResponse.json();
        console.error('Complete setup failed:', errorData);
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
                <CustomizeStep data={setupData} setData={setSetupData} />
              )}
              {currentStep === 2 && (
                <ClinicProfileStep data={setupData} setData={setSetupData} />
              )}
              {currentStep === 3 && (
                <ConfirmStep data={setupData} />
              )}
              {currentStep === 4 && (
                <DoneStep />
              )}
            </div>

            <div className="setup-actions">
              {currentStep > 1 && currentStep < 4 && (
                <button className="btn-back" onClick={handleBack}>
                  Back
                </button>
              )}
              {currentStep < 4 && (
                <button className="btn-next" onClick={handleNext}>
                  {currentStep === 3 ? 'Complete Setup' : 'Next'}
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
      <p className="step-description">Enter your clinic information</p>

      <div className="form-group">
        <label>Clinic Name *</label>
        <input
          type="text"
          value={data.clinicName}
          onChange={(e) => setData({ ...data, clinicName: e.target.value })}
          placeholder="Animal Bite Treatment Center"
          required
        />
      </div>

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
            onChange={(e) => setData({ ...data, phone: e.target.value })}
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
