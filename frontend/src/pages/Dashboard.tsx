import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import StatCard from '../components/Dashboard/StatCard';
import dashboardService, { DashboardStats } from '../services/dashboardService';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={loadDashboardData}>Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  // Render role-specific dashboard
  switch (user?.role) {
    case 'admin':
      return <AdminDashboard stats={stats} />;
    case 'registration':
      return <RegistrationDashboard stats={stats} />;
    case 'triage':
      return <TriageDashboard stats={stats} />;
    case 'treatment':
      return <TreatmentDashboard stats={stats} />;
    default:
      return (
        <DashboardLayout>
          <div className="dashboard-error">
            <p>Unknown user role</p>
          </div>
        </DashboardLayout>
      );
  }
}

// Admin Dashboard
function AdminDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Complete system overview and management</p>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Total Patients"
            value={stats?.total_patients || 0}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="Active Cases"
            value={stats?.active_cases || 0}
            icon="🩺"
            color="red"
          />
          <StatCard
            title="Pending Vaccinations"
            value={stats?.pending_vaccinations || 0}
            icon="💉"
            color="yellow"
          />
          <StatCard
            title="Today's Queue"
            value={stats?.today_queue || 0}
            icon="📋"
            color="green"
          />
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Recent Patients</h3>
            <div className="patient-list">
              {stats?.recent_patients && stats.recent_patients.length > 0 ? (
                stats.recent_patients.map((patient: any) => (
                  <div key={patient.id} className="patient-item">
                    <div className="patient-avatar">{patient.first_name?.charAt(0)}</div>
                    <div className="patient-info">
                      <p className="patient-name">{patient.first_name} {patient.last_name}</p>
                      <p className="patient-number">{patient.patient_number}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">No patients yet</p>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="action-btn action-primary">
                <span>👥</span>
                Manage Users
              </button>
              <button className="action-btn action-secondary">
                <span>⚙️</span>
                Clinic Settings
              </button>
              <button className="action-btn action-secondary">
                <span>📊</span>
                View Reports
              </button>
              <button className="action-btn action-secondary">
                <span>📧</span>
                Send Invitations
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Registration Staff Dashboard
function RegistrationDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Registration Dashboard</h1>
          <p>Manage patient registration and queue</p>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Total Patients"
            value={stats?.total_patients || 0}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="Today's Queue"
            value={stats?.today_queue || 0}
            icon="📋"
            color="green"
          />
        </div>

        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button className="action-btn action-primary">
              <span>➕</span>
              Register New Patient
            </button>
            <button className="action-btn action-secondary">
              <span>📋</span>
              Add to Queue
            </button>
            <button className="action-btn action-secondary">
              <span>🔍</span>
              Search Patients
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Triage Staff Dashboard
function TriageDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Triage Dashboard</h1>
          <p>Assess patients and manage bite cases</p>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Active Cases"
            value={stats?.active_cases || 0}
            icon="🩺"
            color="red"
          />
          <StatCard
            title="Today's Queue"
            value={stats?.today_queue || 0}
            icon="📋"
            color="green"
          />
          <StatCard
            title="Pending Vaccinations"
            value={stats?.pending_vaccinations || 0}
            icon="💉"
            color="yellow"
          />
        </div>

        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button className="action-btn action-primary">
              <span>🩺</span>
              Create Bite Case
            </button>
            <button className="action-btn action-secondary">
              <span>📋</span>
              View Queue
            </button>
            <button className="action-btn action-secondary">
              <span>📊</span>
              Case Statistics
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Treatment Staff Dashboard
function TreatmentDashboard({ stats }: { stats: DashboardStats | null }) {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Treatment Dashboard</h1>
          <p>Record vaccinations and complete treatments</p>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Pending Vaccinations"
            value={stats?.pending_vaccinations || 0}
            icon="💉"
            color="yellow"
          />
          <StatCard
            title="Today's Queue"
            value={stats?.today_queue || 0}
            icon="📋"
            color="green"
          />
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Today's Vaccinations</h3>
            <div className="vaccination-list">
              {stats?.upcoming_vaccinations && stats.upcoming_vaccinations.length > 0 ? (
                stats.upcoming_vaccinations.map((vax: any) => (
                  <div key={vax.id} className="vaccination-item">
                    <div className="vax-info">
                      <p className="vax-patient">
                        {vax.patient?.first_name} {vax.patient?.last_name}
                      </p>
                      <p className="vax-dose">Dose {vax.dose_number}</p>
                    </div>
                    <button className="vax-btn">Record</button>
                  </div>
                ))
              ) : (
                <p className="empty-state">No vaccinations scheduled</p>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="action-btn action-primary">
                <span>💉</span>
                Record Vaccination
              </button>
              <button className="action-btn action-secondary">
                <span>📅</span>
                View Schedule
              </button>
              <button className="action-btn action-secondary">
                <span>✅</span>
                Complete Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
