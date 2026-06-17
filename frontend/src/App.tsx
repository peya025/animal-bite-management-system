import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SetupWizard from './pages/Setup/SetupWizard';
import './App.css';

// Temporary simple dashboard component
function SimpleDashboard() {
  const userData = localStorage.getItem('userData');
  const clinicData = localStorage.getItem('clinicData');
  const user = userData ? JSON.parse(userData) : null;
  const clinic = clinicData ? JSON.parse(clinicData) : null;
  
  // Check if clinic setup is complete
  if (clinic && !clinic.is_setup_complete && user?.role === 'admin') {
    window.location.href = '/setup';
    return null;
  }
  
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 10px 0', color: '#111827' }}>
                Welcome, {user?.name || 'User'}!
              </h1>
              <p style={{ margin: 0, color: '#6b7280' }}>
                Role: <strong>{user?.role || 'N/A'}</strong> | 
                Clinic: <strong>{clinic?.name || 'N/A'}</strong>
              </p>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <StatCard title="Total Patients" value="0" icon="👥" color="#3b82f6" />
          <StatCard title="Active Cases" value="0" icon="🩺" color="#ef4444" />
          <StatCard title="Pending Vaccinations" value="0" icon="💉" color="#f59e0b" />
          <StatCard title="Today's Queue" value="0" icon="📋" color="#10b981" />
        </div>

        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#111827' }}>✅ Login Successful!</h2>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            You have successfully logged in to the Animal Bite Management System. 
            The full dashboard with role-specific features will be available once 
            we restore the complete components.
          </p>
          <div style={{ marginTop: '20px', padding: '15px', background: '#f3f4f6', borderRadius: '8px' }}>
            <strong>Next Steps:</strong>
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
              <li>Dashboard layout and navigation</li>
              <li>Patient management</li>
              <li>Bite case tracking</li>
              <li>Vaccination schedules</li>
              <li>Queue management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '5px' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: '#6b7280' }}>{title}</div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/dashboard" element={<SimpleDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
