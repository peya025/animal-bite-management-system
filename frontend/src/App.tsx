import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './features/auth/pages/LoginPage';
import SetupWizard from './features/clinic-setup/pages/SetupWizardPage';
import AcceptInvitationPage from './features/auth/pages/AcceptInvitationPage';
import PatientList from './features/patients/pages/PatientListPage';
import VaccineInventory from './features/inventory/pages/VaccineInventoryPage';
import QueueDashboard from './features/queue/pages/QueueDashboardPage';
import BiteCaseRiskDashboard from './features/bite-cases/pages/BiteCaseRiskDashboard';
import BiteCaseListPage from './features/bite-cases/pages/BiteCaseListPage';
import ClinicInformation from './features/clinic-setup/pages/ClinicInformationPage';
import ModuleConfigPage from './features/clinic-setup/pages/ModuleConfigPage';
import StaffAssignmentPage from './features/clinic-setup/pages/StaffAssignmentPage';
import VaccinationSchedulePage from './features/vaccinations/pages/VaccinationSchedulePage';
import UserListPage from './features/users/pages/UserListPage';
import UserCreatePage from './features/users/pages/UserCreatePage';
import UserProfilePage from './features/users/pages/UserProfilePage';

// Lazy-loaded secondary & heavy pages for optimal initial load speed
const StaffActivityPage = lazy(() => import('./features/audit/pages/StaffActivityPage'));
const ReportsDashboardPage = lazy(() => import('./features/reports/pages/ReportsDashboardPage'));
const TreatmentRecordsPage = lazy(() => import('./features/treatment-records/pages/TreatmentRecordsPage'));
const DeveloperLandingSettingsPage = lazy(() => import('./features/developer/pages/DeveloperLandingSettingsPage'));
const DeveloperDatabaseExplorerPage = lazy(() => import('./features/developer/pages/DeveloperDatabaseExplorerPage'));
import ConfirmationDialog from './components/feedback/ConfirmationDialog';
import { AppStyleScope } from './styles/SimpleDashboard.styles';
import api from './shared/services/api';
import { ROUTES } from './shared/config/routes';
import { Icon, GLOBAL_NAV_ICONS } from './shared/components/ui/Icon';

// ΓöÇΓöÇΓöÇ Auth Check Helper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function isAuthenticated(): boolean {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  return !!(token && userData);
}

// ΓöÇΓöÇΓöÇ Protected Route Wrapper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = ROUTES.LOGIN;
    }
  }, [location.pathname]);
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <>{children}</>;
}

// ΓöÇΓöÇΓöÇ Role-aware nav items ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
interface NavItem {
  label: string;
  path?: string;
  roles: string[];
  submenu?: { label: string; path: string }[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard',                            path: ROUTES.DASHBOARD,                roles: ['developer', 'admin', 'registration', 'triage', 'treatment'] },
  { label: 'Patient Registration',                 path: ROUTES.PATIENTS.LIST,            roles: ['registration', 'admin'] },
  { label: 'Patient Queue',                        path: ROUTES.QUEUE.DASHBOARD,          roles: ['registration', 'triage', 'treatment', 'admin'] },
  { label: 'Bite Cases Summary',                   path: ROUTES.BITE_CASES.LIST,          roles: ['triage', 'treatment', 'admin'] },
  { label: 'Vaccine Inventory',                    path: ROUTES.INVENTORY.LIST,           roles: ['treatment', 'admin'] },
  { label: 'Reports & Analytics',                  path: ROUTES.REPORTS.LIST,             roles: ['registration', 'triage', 'treatment', 'admin'] },
  { label: 'User Management',                      path: ROUTES.USERS.LIST,               roles: ['admin'] },
  { 
    label: 'Clinic Setup',
    roles: ['admin'],
    submenu: [
      { label: 'Clinic Information',      path: ROUTES.CLINIC_SETUP.INFO              },
      { label: 'Module Configuration',    path: ROUTES.CLINIC_SETUP.MODULES           },
      { label: 'Staff Assignments',       path: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS },
      { label: 'Staff Activity Monitor',  path: ROUTES.AUDIT.ACTIVITY                 },
      { label: 'Vaccination Schedules',   path: ROUTES.CLINIC_SETUP.VAX_SCHED         },
    ],
  },
  { label: 'Developer Tools',                      path: ROUTES.DEVELOPER_SETTINGS,        roles: ['developer'] },
];

const ROLE_LABELS: Record<string, string> = {
  developer:    'Developer',
  admin:        'Administrator',
  registration: 'Registration Staff',
  triage:       'Triage / Doctor',
  treatment:    'Treatment Staff',
};

// ΓöÇΓöÇΓöÇ SimpleDashboard ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function SimpleDashboard() {
  const navigate = useNavigate();

  // Instant synchronous state initialization from cached session
  const [user, setUser] = useState<any>(() => {
    const raw = localStorage.getItem('userData');
    return raw ? JSON.parse(raw) : null;
  });
  const [clinic, setClinic] = useState<any>(() => {
    const raw = localStorage.getItem('clinicData');
    if (raw) return JSON.parse(raw);
    const uRaw = localStorage.getItem('userData');
    return uRaw ? (JSON.parse(uRaw)?.clinic ?? null) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !localStorage.getItem('userData'));
  const [setupCheckDone, setSetupCheckDone] = useState<boolean>(() => !!localStorage.getItem('userData'));
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'vaccinations'>('overview');
  const [stats, setStats] = useState<any>({
    totalPatients: 0,
    activeCases: 0,
    pendingVaccinations: 0,
    todayQueue: 0,
    completedCases: 0,
    followupPatients: 0,
    biteCases: 0,
    newToday: 0,
    casesList: [],
    vaccinationsList: [],
  });

  // Fetch real statistics from database
  useEffect(() => {
    if (!setupCheckDone || isLoading) return;

    const fetchStats = async () => {
      try {
        const [patientsRes, casesRes, vaccineRes, queueRes] = await Promise.all([
          api.get('/patients?per_page=1'),
          api.get('/cases/statistics'),
          api.get('/vaccinations/statistics'),
          api.get('/queue/statistics'),
        ]);

        const [recentCasesRes, recentVaccsRes] = await Promise.all([
          api.get('/cases?per_page=5'),
          api.get('/vaccinations?per_page=5')
        ]);

        setStats({
          totalPatients: patientsRes.data?.total || 0,
          activeCases: casesRes.data?.active_cases || 0,
          pendingVaccinations: vaccineRes.data?.pending || 0,
          todayQueue: queueRes.data?.waiting || 0,
          completedCases: casesRes.data?.completed_cases || 0,
          followupPatients: vaccineRes.data?.total_scheduled || 0,
          biteCases: casesRes.data?.total_cases || 0,
          newToday: queueRes.data?.total || 0,
          casesList: recentCasesRes.data?.data || [],
          vaccinationsList: recentVaccsRes.data?.data || [],
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      }
    };

    fetchStats();
  }, [setupCheckDone, isLoading]);

  // Background setup check (non-blocking if logged in)
  useEffect(() => {
    const checkSetupNeeded = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/setup/check-needed', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.needs_setup === true) {
            window.location.href = ROUTES.SETUP;
            return;
          }
        }
      } catch (error) {
        console.error('Setup check failed:', error);
      } finally {
        setSetupCheckDone(true);
      }
    };
    checkSetupNeeded();
  }, []);

  // Background user session refresh (non-blocking)
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated()) {
        window.location.href = ROUTES.LOGIN;
        return;
      }
      const userData = localStorage.getItem('userData');
      const clinicData = localStorage.getItem('clinicData');
      const localUser = userData ? JSON.parse(userData) : null;
      const localClinic = clinicData ? JSON.parse(clinicData) : (localUser?.clinic || null);

      setUser(localUser);
      setClinic(localClinic);
      setIsLoading(false);

      if (localUser?.role === 'admin') {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch('http://localhost:8000/api/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          if (response.ok) {
            const freshData = await response.json();
            localStorage.setItem('userData', JSON.stringify(freshData));
            if (freshData.clinic) {
              localStorage.setItem('clinicData', JSON.stringify(freshData.clinic));
            }
            setUser(freshData);
            setClinic(freshData.clinic);
          }
        } catch (error) {
          console.error('Failed to fetch fresh user data:', error);
        }
      }
    };
    loadUserData();
  }, [setupCheckDone]);

  if (!setupCheckDone || isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '4px solid #e5e7eb', borderTop: '4px solid #10b981',
          borderRadius: '50%', animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    window.location.href = ROUTES.LOGIN;
    return null;
  }

  // Backend uses 'is_setup_complete' on the clinic model
  const setupComplete =
    user?.clinic?.is_setup_complete ??
    clinic?.is_setup_complete ??
    false;
  if (!setupComplete && user?.role === 'admin') {
    window.location.href = ROUTES.SETUP;
    return null;
  }

  const visibleNav = NAV.filter(n => user?.role && n.roles.includes(user.role));
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const now = new Date();

  const isActive = (path: string) =>
    window.location.pathname === path ||
    (path !== '/dashboard' && window.location.pathname.startsWith(path));

  const isSubmenuActive = (submenu?: { label: string; path: string }[]) =>
    submenu?.some(sub => isActive(sub.path));

  const toggleSubmenu = (itemLabel: string) => {
    setExpandedMenu(expandedMenu === itemLabel ? null : itemLabel);
  };

  const confirmLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('clinicData');
    window.location.replace('/login');
  };

  return (
    <div className="sd-layout">
      {/* ΓöÇΓöÇ Sidebar ΓöÇΓöÇ */}
      <aside className={`sd-sidebar ${collapsed ? 'sd-sidebar--collapsed' : ''}`}>
        <div className="sd-brand">
          <button className="sd-toggle-brand" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {!collapsed && (
            <>
              <div className="sd-brand-logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div className="sd-brand-text">
                <span className="sd-brand-clinic">{clinic?.name || 'Clinic'}</span>
                <span className="sd-brand-app">ABTC System</span>
              </div>
            </>
          )}
        </div>

        <nav className="sd-nav">
          {visibleNav.map(item => (
            <div key={item.label}>
              <button
                className={`sd-nav-item ${
                  item.submenu
                    ? isSubmenuActive(item.submenu) ? 'sd-nav-item--active' : ''
                    : item.path && isActive(item.path) ? 'sd-nav-item--active' : ''
                }`}
                onClick={() => {
                  if (item.submenu) {
                    toggleSubmenu(item.label);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="sd-nav-icon">{GLOBAL_NAV_ICONS[item.label] || <Icon name="dashboard" />}</span>
                {!collapsed && (
                  <>
                    <span className="sd-nav-label">{item.label}</span>
                    {item.submenu && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`sd-nav-chevron ${expandedMenu === item.label ? 'sd-nav-chevron--expanded' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </>
                )}
              </button>
              
              {/* Submenu */}
              {item.submenu && !collapsed && expandedMenu === item.label && (
                <div className="sd-submenu">
                  {item.submenu.map(subItem => (
                    <button
                      key={subItem.path}
                      onClick={() => { navigate(subItem.path); }}
                      className={`sd-submenu-item ${isActive(subItem.path) ? 'sd-submenu-item--active' : ''}`}
                    >
                      <span className="sd-submenu-dot"></span>
                      <span className="sd-submenu-label">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sd-user">
          <div className="sd-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sd-user-info">
              <span className="sd-user-name">{user?.name || 'User'}</span>
              <span className="sd-user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          )}
          <button className="sd-logout-btn" title="Sign out" onClick={() => setShowLogoutModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="sd-main">
        <header className="sd-topbar">
          <span className="sd-topbar-title">Dashboard</span>
          <div className="sd-topbar-right">
            <span className="sd-topbar-date">
              {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="sd-topbar-avatar">{initials}</div>
          </div>
        </header>

        <main className="sd-content">
          <div className="sd-dash-header">
            <div>
              <h1>Animal Bite Treatment Center</h1>
              <p>Overview · {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="sd-dash-tabs">
              <button
                className={`sd-dash-tab ${activeTab === 'overview' ? 'sd-dash-tab--active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`sd-dash-tab ${activeTab === 'cases' ? 'sd-dash-tab--active' : ''}`}
                onClick={() => setActiveTab('cases')}
              >
                Cases
              </button>
              <button
                className={`sd-dash-tab ${activeTab === 'vaccinations' ? 'sd-dash-tab--active' : ''}`}
                onClick={() => setActiveTab('vaccinations')}
              >
                Vaccinations
              </button>
            </div>
          </div>

          {/* ΓöÇΓöÇΓöÇ Stat Cards - Role Specific ΓöÇΓöÇΓöÇ */}
          <div className="sd-cards-grid">
            {(() => {
              switch (user?.role) {
                case 'admin':
                  return (
                    <>
                      <SdCard color="purple"  label="Total Patients"      value={stats.totalPatients.toString()} sub="Registered" />
                      <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                      <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                      <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                      <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                      <SdCard color="cyan"    label="Follow-up Patients"   value={stats.followupPatients.toString()} sub="This week" />
                      <SdCard color="green"   label="Bite Cases"           value={stats.biteCases.toString()} sub="Total" />
                      <SdCard color="emerald" label="New Today"            value={stats.newToday.toString()} sub="Registered" />
                    </>
                  );
                case 'registration':
                  return (
                    <>
                      <SdCard color="purple"  label="Total Patients" value={stats.totalPatients.toString()} sub="Registered" />
                      <SdCard color="teal"    label="Today's Queue"  value={stats.todayQueue.toString()} sub="Waiting" />
                      <SdCard color="emerald" label="New Today"       value={stats.newToday.toString()} sub="Registered" />
                    </>
                  );
                case 'triage':
                  return (
                    <>
                      <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                      <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                      <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                      <SdCard color="purple"  label="Total Patients"       value={stats.totalPatients.toString()} sub="Registered" />
                      <SdCard color="green"   label="Bite Cases"           value={stats.biteCases.toString()} sub="Total" />
                      <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                    </>
                  );
                case 'treatment':
                  return (
                    <>
                      <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                      <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                      <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                      <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                    </>
                  );
                default:
                  return (
                    <>
                      <SdCard color="purple"  label="Total Patients"      value={stats.totalPatients.toString()} sub="Registered" />
                      <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                      <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                      <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                    </>
                  );
              }
            })()}
          </div>

          {/* ΓöÇΓöÇΓöÇ Charts + Filters in one unified 3-column row ΓöÇΓöÇΓöÇ */}
          {activeTab === 'overview' && (
            <>
                        <div className="sd-charts-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {/* Cases Over Time */}
            <div
              className="sd-chart-card"
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid #e0eae3',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Cases Over Time <span>(last 6 months)</span></p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <SdLineChart />
              </div>
            </div>

            {/* Case Distribution */}
            <div
              className="sd-chart-card"
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid #e0eae3',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Case Distribution</p>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SdDonutChart
                  data={[
                    { label: 'Category I',   pct: 35, color: '#a7d7b9' },
                    { label: 'Category II',  pct: 40, color: '#56a978' },
                    { label: 'Category III', pct: 25, color: '#1f7043' },
                  ]}
                />
              </div>
            </div>

            {/* Filters ΓÇô now matching the exact same size and style */}
            <div
              className="sd-filter-card"
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid #e0eae3',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <p className="sd-filter-title" style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: '#1e2a4a' }}>Filters</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</span>
                  <select className="sd-filter-select" style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}>
                    <option>All</option><option>Admin</option><option>Triage</option>
                    <option>Registration</option><option>Treatment</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                  <select className="sd-filter-select" style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}>
                    <option>All</option><option>Ongoing</option>
                    <option>Completed</option><option>Abandoned</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Range</span>
                  <select className="sd-filter-select" style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}>
                    <option>This Month</option><option>Last 3 Months</option>
                    <option>Last 6 Months</option><option>This Year</option>
                  </select>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                  <button className="sd-filter-link" onClick={() => { navigate('/patients'); }} style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    Patients
                  </button>
                  <button className="sd-filter-link" onClick={() => { navigate('/bite-cases'); }} style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Cases
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ΓöÇΓöÇΓöÇ Charts Row 2: Vaccination Trend + Animal Bite Severity ΓöÇΓöÇΓöÇ */}
          <div className="sd-charts-bottom" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div
              className="sd-chart-card"
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid #e0eae3',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Vaccination Trend <span>(last 6 months)</span></p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <SdLineChart color="#10b981" />
              </div>
            </div>

            <div
              className="sd-chart-card"
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid #e0eae3',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Animal Bite Severity</p>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SdDonutChart
                  data={[
                    { label: 'Cat. I (Minor)',     pct: 30, color: '#a7d7b9' },
                    { label: 'Cat. II (Moderate)', pct: 45, color: '#56a978' },
                    { label: 'Cat. III (Severe)',  pct: 25, color: '#1f7043' },
                  ]}
                />
              </div>
            </div>
          </div>
            </>
          )}
          {activeTab === 'cases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="sd-cards-grid">
                <SdCard color="green" label="Total Bite Cases" value={stats.biteCases.toString()} sub="Reported cases" />
                <SdCard color="blue" label="Active Cases" value={stats.activeCases.toString()} sub="Ongoing treatment" />
                <SdCard color="violet" label="Completed Cases" value={stats.completedCases.toString()} sub="Treatment finished" />
              </div>

              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e0eae3', padding: '24px' }}>
                <p style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: '#173d29' }}>Recent Bite Incident Cases</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2ebe5', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Patient</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Bite Date</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Animal Type</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Category</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.casesList.length > 0 ? (
                        stats.casesList.map((c: any) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 600 }}>{c.patient?.name || '—'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{c.bite_date || '—'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151', textTransform: 'capitalize' }}>{c.animal_type || '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                background: c.severity === 'Category III' ? '#fee2e2' : c.severity === 'Category II' ? '#fef3c7' : '#ecfdf5',
                                color: c.severity === 'Category III' ? '#ef4444' : c.severity === 'Category II' ? '#d97706' : '#10b981'
                              }}>
                                {c.severity || 'Category II'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                background: c.status === 'completed' ? '#ecfdf5' : '#eff6ff',
                                color: c.status === 'completed' ? '#10b981' : '#3b82f6'
                              }}>
                                {c.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No recent cases recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'vaccinations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="sd-cards-grid">
                <SdCard color="indigo" label="Pending Doses" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                <SdCard color="purple" label="Total Scheduled" value={stats.followupPatients.toString()} sub="Doses tracked" />
                <SdCard color="teal" label="Queue Count" value={stats.todayQueue.toString()} sub="Today waiting" />
              </div>

              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e0eae3', padding: '24px' }}>
                <p style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: '#173d29' }}>Recent Vaccinations & Scheduled Doses</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2ebe5', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Patient</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Vaccine Brand</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Batch / Dose</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Date Administered</th>
                        <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.vaccinationsList.length > 0 ? (
                        stats.vaccinationsList.map((v: any) => (
                          <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 600 }}>{v.patient?.name || '—'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{v.vaccine_brand || '—'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{v.dose_number || 'Dose 1'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{v.administered_at ? new Date(v.administered_at).toLocaleDateString() : '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                background: '#ecfdf5', color: '#10b981'
                              }}>
                                Done
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No recent vaccinations found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showLogoutModal && (
        <ConfirmationDialog
          variant="warning"
          title="Confirm Logout"
          message="Are you sure you want to sign out? You'll need to log in again to access the system."
          confirmLabel="Yes, sign out"
          cancelLabel="Cancel"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Stat Card ΓÇô unchanged ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function SdCard({ color, label, value, sub }: { color: string; label: string; value: string; sub: string }) {
  return (
    <div className={`sd-card sd-card--${color}`}>
      <p className="sd-card-label">{label}</p>
      <p className="sd-card-value">{value}</p>
      <p className="sd-card-sub">{sub}</p>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Line Chart ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function SdLineChart({ color = '#4f7ef7' }: { color?: string }) {
  const points = [20, 45, 30, 60, 40, 75, 55, 80, 65, 90, 70, 85];
  const w = 400, h = 140;
  const pad = 20;
  const maxV = Math.max(...points);
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map(v => pad + (1 - v / maxV) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const area = `${path} L ${xs[xs.length - 1]} ${h - pad} L ${xs[0]} ${h - pad} Z`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="sd-line-chart"
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {xs.map((x, i) => i % 2 === 0 && (
        <text key={i} x={x} y={h - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
          {months[i]}
        </text>
      ))}
    </svg>
  );
}

// ΓöÇΓöÇΓöÇ Donut Chart ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function SdDonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 55, cx = 75, cy = 75, stroke = 24;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const len = (d.pct / 100) * circ;
    const s = { ...d, dasharray: `${len} ${circ - len}`, offset };
    offset += len;
    return s;
  });
  return (
    <div className="sd-donut-wrap" style={{ width: '100%', justifyContent: 'center', gap: '16px' }}>
      <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} width="150" height="150">
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={s.dasharray}
            strokeDashoffset={-s.offset}
            transform="rotate(-90, 75, 75)"
          />
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e2a4a">
          {data.reduce((a, d) => a + d.pct, 0)}%
        </text>
      </svg>
      <div className="sd-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="sd-donut-legend-item" style={{ fontSize: '12px' }}>
            <div className="sd-donut-legend-dot" style={{ background: d.color, width: '10px', height: '10px' }} />
            <span>{d.label}</span>
            <span className="sd-donut-legend-pct" style={{ fontWeight: 700 }}>{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Shared layout wrapper for inner pages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function AppLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  const userData   = localStorage.getItem('userData');
  const clinicData = localStorage.getItem('clinicData');
  const user   = userData   ? JSON.parse(userData)   : null;
  const clinic = clinicData ? JSON.parse(clinicData) : null;

  const [collapsed, setCollapsed]       = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const visibleNav = NAV.filter(n => user?.role && n.roles.includes(user.role));
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isActive = (path: string) =>
    window.location.pathname === path ||
    (path !== '/dashboard' && window.location.pathname.startsWith(path));

  const isSubmenuActive = (submenu?: { label: string; path: string }[]) =>
    submenu?.some(sub => isActive(sub.path));

  const toggleSubmenu = (itemLabel: string) => {
    setExpandedMenu(expandedMenu === itemLabel ? null : itemLabel);
  };

  const confirmLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('clinicData');
    window.location.replace('/login');
  };

  return (
    <div className="sd-layout">
      <aside className={`sd-sidebar ${collapsed ? 'sd-sidebar--collapsed' : ''}`}>
        <div className="sd-brand">
          <button className="sd-toggle-brand" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {!collapsed && (
            <>
              <div className="sd-brand-logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div className="sd-brand-text">
                <span className="sd-brand-clinic">{clinic?.name || 'Clinic'}</span>
                <span className="sd-brand-app">ABTC System</span>
              </div>
            </>
          )}
        </div>
        <nav className="sd-nav">
          {visibleNav.map(item => (
            <div key={item.label}>
              <button
                className={`sd-nav-item ${
                  item.submenu
                    ? isSubmenuActive(item.submenu) ? 'sd-nav-item--active' : ''
                    : item.path && isActive(item.path) ? 'sd-nav-item--active' : ''
                }`}
                onClick={() => {
                  if (item.submenu) {
                    toggleSubmenu(item.label);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="sd-nav-icon">{GLOBAL_NAV_ICONS[item.label] || <Icon name="dashboard" />}</span>
                {!collapsed && (
                  <>
                    <span className="sd-nav-label">{item.label}</span>
                    {item.submenu && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`sd-nav-chevron ${expandedMenu === item.label ? 'sd-nav-chevron--expanded' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </>
                )}
              </button>
              
              {/* Submenu */}
              {item.submenu && !collapsed && expandedMenu === item.label && (
                <div className="sd-submenu">
                  {item.submenu.map(subItem => (
                    <button
                      key={subItem.path}
                      onClick={() => { navigate(subItem.path); }}
                      className={`sd-submenu-item ${isActive(subItem.path) ? 'sd-submenu-item--active' : ''}`}
                    >
                      <span className="sd-submenu-dot"></span>
                      <span className="sd-submenu-label">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sd-user">
          <div className="sd-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sd-user-info">
              <span className="sd-user-name">{user?.name || 'User'}</span>
              <span className="sd-user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          )}
          <button className="sd-logout-btn" title="Sign out" onClick={() => setShowLogoutModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <div className="sd-main">
        <header className="sd-topbar">
          <span className="sd-topbar-title">{title}</span>
          <div className="sd-topbar-right">
            <span className="sd-topbar-date">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="sd-topbar-avatar">{initials}</div>
          </div>
        </header>
        <main className="sd-content">
          {children}
        </main>
      </div>

      {showLogoutModal && (
        <ConfirmationDialog
          variant="warning"
          title="Confirm Logout"
          message="Are you sure you want to sign out?"
          confirmLabel="Yes, sign out"
          cancelLabel="Cancel"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
}

// ΓöÇΓöÇΓöÇ App ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function App() {
  return (
    <AppStyleScope>
      <Router>
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#10b981' }}>
            <span>Loading page...</span>
          </div>
        }>
          <Routes>
            <Route path="/"          element={<LandingPage />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/setup"     element={<SetupWizard />} />
            <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><SimpleDashboard /></ProtectedRoute>} />
            <Route path="/patients"  element={<ProtectedRoute><AppLayout title="Patients"><PatientList /></AppLayout></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><AppLayout title="Vaccine Inventory"><VaccineInventory /></AppLayout></ProtectedRoute>} />
            <Route path="/queue"     element={<ProtectedRoute><AppLayout title="Queue"><QueueDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/bite-cases" element={<ProtectedRoute><AppLayout title="Bite Cases & Risk Surveillance"><BiteCaseRiskDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/bite-intakes" element={<ProtectedRoute><AppLayout title="Bite Incident Intakes"><BiteCaseListPage /></AppLayout></ProtectedRoute>} />
            <Route path="/vaccinations" element={<ProtectedRoute><AppLayout title="Vaccination Schedule (Form 3)"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
            <Route path="/vaccinations/record" element={<ProtectedRoute><AppLayout title="Record Vaccination"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><AppLayout title="User Management"><UserListPage /></AppLayout></ProtectedRoute>} />
            <Route path="/staff-activity" element={<ProtectedRoute><AppLayout title="Staff Activity Monitor"><StaffActivityPage /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout title="Reports &amp; Analytics"><ReportsDashboardPage /></AppLayout></ProtectedRoute>} />
            <Route path="/treatment-records" element={<ProtectedRoute><AppLayout title="Individual Treatment Record (Form 2)"><TreatmentRecordsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/users/create" element={<ProtectedRoute><AppLayout title="Add User"><UserCreatePage /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout title="My Profile"><UserProfilePage /></AppLayout></ProtectedRoute>} />
            <Route path="/developer/landing-settings" element={<ProtectedRoute><AppLayout title="Developer Landing Settings"><DeveloperLandingSettingsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/developer/database-explorer" element={<ProtectedRoute><AppLayout title="Database Explorer (XAMPP)"><DeveloperDatabaseExplorerPage /></AppLayout></ProtectedRoute>} />
            <Route path="/setup/clinic-info" element={<ProtectedRoute><AppLayout title="Clinic Information"><ClinicInformation /></AppLayout></ProtectedRoute>} />
            <Route path="/setup/modules" element={<ProtectedRoute><AppLayout title="Module Configuration"><ModuleConfigPage /></AppLayout></ProtectedRoute>} />
            <Route path="/setup/staff-assignments" element={<ProtectedRoute><AppLayout title="Staff Module Assignments"><StaffAssignmentPage /></AppLayout></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </Router>
    </AppStyleScope>
  );
}

export default App;
