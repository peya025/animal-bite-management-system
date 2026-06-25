import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import dashboardService from '../services/dashboardService';
import type { DashboardStats } from '../services/dashboardService';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await dashboardService.getStats();
      setStats(data);
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Dashboard">
        <div className="dashboard-loading">
          <div className="spinner" />
          <p>Loading dashboard…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Dashboard">
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={loadData}>Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  switch (user?.role) {
    case 'admin':        return <AdminDashboard stats={stats} />;
    case 'registration': return <RegistrationDashboard stats={stats} />;
    case 'triage':       return <TriageDashboard stats={stats} />;
    case 'treatment':    return <TreatmentDashboard stats={stats} />;
    default:
      return (
        <DashboardLayout pageTitle="Dashboard">
          <div className="dashboard-error"><p>Unknown role.</p></div>
        </DashboardLayout>
      );
  }
}

/* ── Admin ── */
function AdminDashboard({ stats }: { stats: DashboardStats | null }) {
  const navigate = useNavigate();
  return (
    <DashboardLayout pageTitle="Admin Dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Complete system overview and management</p>
        </div>
        <div className="stats-grid">
          <StatCard title="Total Patients"        value={stats?.total_patients || 0}        icon="👥" color="blue"   />
          <StatCard title="Active Cases"          value={stats?.active_cases || 0}          icon="🩺" color="red"    />
          <StatCard title="Pending Vaccinations"  value={stats?.pending_vaccinations || 0}  icon="💉" color="yellow" />
          <StatCard title="Today's Queue"         value={stats?.today_queue || 0}           icon="📋" color="green"  />
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Recent Patients</h3>
            <div className="patient-list">
              {stats?.recent_patients?.length ? stats.recent_patients.map((p: any) => (
                <div key={p.id} className="patient-item">
                  <div className="patient-avatar">{p.first_name?.charAt(0)}</div>
                  <div className="patient-info">
                    <p className="patient-name">{p.first_name} {p.last_name}</p>
                    <p className="patient-number">{p.patient_number}</p>
                  </div>
                </div>
              )) : <p className="empty-state">No patients yet</p>}
            </div>
          </div>
          <div className="dashboard-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="action-btn action-primary"   onClick={() => navigate('/users')}>      <span>👥</span> Manage Users     </button>
              <button className="action-btn action-secondary" onClick={() => navigate('/setup')}>      <span>⚙️</span> Clinic Settings  </button>
              <button className="action-btn action-secondary" onClick={() => navigate('/bite-cases')}> <span>📊</span> View Cases       </button>
              <button className="action-btn action-secondary" onClick={() => navigate('/queue')}>      <span>📋</span> View Queue       </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ── Registration ── */
function RegistrationDashboard({ stats }: { stats: DashboardStats | null }) {
  const navigate = useNavigate();
  return (
    <DashboardLayout pageTitle="Registration Dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Registration Dashboard</h1>
          <p>Manage patient registration and queue</p>
        </div>
        <div className="stats-grid">
          <StatCard title="Total Patients" value={stats?.total_patients || 0} icon="👥" color="blue"  />
          <StatCard title="Today's Queue"  value={stats?.today_queue || 0}    icon="📋" color="green" />
        </div>
        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button className="action-btn action-primary"   onClick={() => navigate('/patients')}> <span>➕</span> Register Patient </button>
            <button className="action-btn action-secondary" onClick={() => navigate('/queue')}>    <span>📋</span> Add to Queue     </button>
            <button className="action-btn action-secondary" onClick={() => navigate('/patients')}> <span>🔍</span> Search Patients  </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ── Triage ── */
function TriageDashboard({ stats }: { stats: DashboardStats | null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <DashboardLayout pageTitle="Triage Dashboard">
      <div className="dashboard-container">

        {/* Header */}
        <div className="dashboard-header triage-header">
          <div>
            <h1>{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
            <p>{dateLabel}</p>
          </div>
          <button className="triage-primary-btn" onClick={() => navigate('/bite-cases/new')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Bite Case
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard title="Active Bite Cases"    value={stats?.active_cases || 0}        icon="🩺" color="red"    />
          <StatCard title="Waiting in Queue"     value={stats?.today_queue || 0}          icon="📋" color="blue"   />
          <StatCard title="Pending Vaccinations" value={stats?.pending_vaccinations || 0} icon="💉" color="yellow" />
          <StatCard title="Total Patients"       value={stats?.total_patients || 0}       icon="👥" color="green"  />
        </div>

        {/* Grid */}
        <div className="dashboard-grid">

          {/* Queue */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Today's Queue</h3>
              <button className="card-link-btn" onClick={() => navigate('/queue')}>View all →</button>
            </div>
            {stats?.today_queue && stats.today_queue > 0 ? (
              <div className="queue-summary">
                <div className="queue-stat-item queue-stat-waiting">
                  <span className="qs-value">{stats.today_queue}</span>
                  <span className="qs-label">Waiting</span>
                </div>
                <button className="triage-action-btn triage-action-green" onClick={() => navigate('/queue')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  Go to Queue
                </button>
              </div>
            ) : (
              <div className="triage-empty">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <p>No patients in queue</p>
              </div>
            )}
          </div>

          {/* Vaccinations */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Upcoming Vaccinations</h3>
              <button className="card-link-btn" onClick={() => navigate('/vaccinations')}>View all →</button>
            </div>
            {stats?.upcoming_vaccinations?.length ? (
              <div className="vaccination-list">
                {stats.upcoming_vaccinations.map((vax: any) => (
                  <div key={vax.id} className="vaccination-item">
                    <div className="vax-dot" />
                    <div className="vax-info">
                      <p className="vax-patient">{vax.patient?.first_name} {vax.patient?.last_name}</p>
                      <p className="vax-dose">Dose {vax.dose_number} · {new Date(vax.scheduled_date).toLocaleDateString()}</p>
                    </div>
                    <span className={`vax-status-badge vax-status-${vax.status}`}>{vax.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="triage-empty">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/><circle cx="12" cy="12" r="9"/>
                </svg>
                <p>No vaccinations scheduled today</p>
              </div>
            )}
          </div>

          {/* Active Cases */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Active Bite Cases</h3>
              <button className="card-link-btn" onClick={() => navigate('/bite-cases')}>View all →</button>
            </div>
            {stats?.active_cases && stats.active_cases > 0 ? (
              <div className="triage-cases-placeholder">
                <div className="cases-count-badge">
                  <span>{stats.active_cases}</span>
                  <p>ongoing cases require attention</p>
                </div>
                <button className="triage-action-btn triage-action-red" onClick={() => navigate('/bite-cases')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  View Active Cases
                </button>
              </div>
            ) : (
              <div className="triage-empty">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <p>No active bite cases</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <div className="card-header"><h3>Quick Actions</h3></div>
            <div className="triage-actions-grid">
              <button className="triage-quick-action triage-qa-primary" onClick={() => navigate('/bite-cases/new')}>
                <div className="tqa-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                <span>New Bite Case</span>
              </button>
              <button className="triage-quick-action triage-qa-blue" onClick={() => navigate('/queue')}>
                <div className="tqa-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
                <span>View Queue</span>
              </button>
              <button className="triage-quick-action triage-qa-yellow" onClick={() => navigate('/vaccinations')}>
                <div className="tqa-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/><circle cx="12" cy="12" r="9"/></svg></div>
                <span>Vaccinations</span>
              </button>
              <button className="triage-quick-action triage-qa-gray" onClick={() => navigate('/patients')}>
                <div className="tqa-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <span>All Patients</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

/* ── Treatment ── */
function TreatmentDashboard({ stats }: { stats: DashboardStats | null }) {
  const navigate = useNavigate();
  return (
    <DashboardLayout pageTitle="Treatment Dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Treatment Dashboard</h1>
          <p>Record vaccinations and complete treatments</p>
        </div>
        <div className="stats-grid">
          <StatCard title="Pending Vaccinations" value={stats?.pending_vaccinations || 0} icon="💉" color="yellow" />
          <StatCard title="Today's Queue"        value={stats?.today_queue || 0}           icon="📋" color="green"  />
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Today's Vaccinations</h3>
            <div className="vaccination-list">
              {stats?.upcoming_vaccinations?.length ? (
                stats.upcoming_vaccinations.map((vax: any) => (
                  <div key={vax.id} className="vaccination-item">
                    <div className="vax-info">
                      <p className="vax-patient">{vax.patient?.first_name} {vax.patient?.last_name}</p>
                      <p className="vax-dose">Dose {vax.dose_number}</p>
                    </div>
                    <button className="vax-btn">Record</button>
                  </div>
                ))
              ) : <p className="empty-state">No vaccinations scheduled</p>}
            </div>
          </div>
          <div className="dashboard-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="action-btn action-primary"   onClick={() => navigate('/vaccinations')}> <span>💉</span> Record Vaccination </button>
              <button className="action-btn action-secondary" onClick={() => navigate('/vaccinations')}> <span>📅</span> View Schedule      </button>
              <button className="action-btn action-secondary" onClick={() => navigate('/queue')}>        <span>✅</span> Complete Queue     </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
