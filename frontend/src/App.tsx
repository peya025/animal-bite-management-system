import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './features/auth/pages/LoginPage';
import SetupWizard from './features/clinic-setup/pages/SetupWizardPage';
import PatientList from './features/patients/pages/PatientListPage';
import VaccineInventory from './features/inventory/pages/VaccineInventoryPage';
import QueueDashboard from './features/queue/pages/QueueDashboardPage';
import BiteCaseRiskDashboard from './features/bite-cases/pages/BiteCaseRiskDashboard';
import ClinicInformation from './features/clinic-setup/pages/ClinicInformationPage';
import VaccinationSchedulePage from './features/vaccinations/pages/VaccinationSchedulePage';
import UserListPage from './features/users/pages/UserListPage';
import UserCreatePage from './features/users/pages/UserCreatePage';
import UserProfilePage from './features/users/pages/UserProfilePage';
import ReportsDashboardPage from './features/reports/pages/ReportsDashboardPage';
import ConfirmationDialog from './components/feedback/ConfirmationDialog';
import { AppStyleScope } from './styles/SimpleDashboard.styles';
import { ROUTES } from './shared/config/routes';

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
  { label: 'Dashboard',    path: ROUTES.DASHBOARD,         roles: ['admin','registration','triage','treatment'] },
  { label: 'Patients',     path: ROUTES.PATIENTS.LIST,     roles: ['registration','triage','treatment'] },
  { label: 'Queue',        path: ROUTES.QUEUE.DASHBOARD,   roles: ['registration','triage'] },
  { label: 'Bite Cases',   path: ROUTES.BITE_CASES.LIST,   roles: ['admin','triage','treatment'] },
  { label: 'Vaccinations', path: ROUTES.VACCINATIONS.LIST, roles: ['admin','triage','treatment'] },
  { label: 'Inventory',    path: ROUTES.INVENTORY.LIST,    roles: ['admin'] },
  { label: 'Reports',      path: ROUTES.REPORTS.LIST,      roles: ['admin', 'triage'] },
  { label: 'Users',        path: ROUTES.USERS.LIST,        roles: ['admin'] },
  { 
    label: 'Clinic Setup',
    roles: ['admin'],
    submenu: [
      { label: 'Clinic Information',    path: ROUTES.CLINIC_SETUP.INFO      },
      { label: 'Predefined Templates',  path: ROUTES.CLINIC_SETUP.TEMPLATES },
      { label: 'Vaccination Schedules', path: ROUTES.CLINIC_SETUP.VAX_SCHED },
    ],
  },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  Dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Patients: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Queue: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  'Bite Cases': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  Vaccinations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      <circle cx="12" cy="12" r="9"/>
    </svg>
  ),
  Reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  'Clinic Setup': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Inventory: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  ),
};

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrator',
  registration: 'Registration Staff',
  triage:       'Triage / Doctor',
  treatment:    'Treatment Staff',
};

// ΓöÇΓöÇΓöÇ SimpleDashboard ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function SimpleDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [clinic, setClinic] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

      // Render immediately from the authenticated session; refresh in the background.
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
            return;
          }
        } catch (error) {
          console.error('Failed to fetch fresh user data:', error);
        }
      }
    };
    loadUserData();
  }, []);

  if (isLoading) {
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

  const setupComplete = user?.clinic?.is_setup_complete ?? clinic?.is_setup_complete ?? false;
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
          <div className="sd-brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="sd-brand-text">
              <span className="sd-brand-clinic">{clinic?.name || 'Clinic'}</span>
              <span className="sd-brand-app">ABTC System</span>
            </div>
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
                    window.location.href = item.path;
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="sd-nav-icon">{NAV_ICONS[item.label]}</span>
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
                      onClick={() => { window.location.href = subItem.path; }}
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

        <button className="sd-toggle" onClick={() => setCollapsed(!collapsed)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {collapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}
          </svg>
        </button>
      </aside>

      {/* ΓöÇΓöÇ Main ΓöÇΓöÇ */}
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
              <button className="sd-dash-tab sd-dash-tab--active">Overview</button>
              <button className="sd-dash-tab">Cases</button>
              <button className="sd-dash-tab">Vaccinations</button>
            </div>
          </div>

          {/* ΓöÇΓöÇΓöÇ Stat Cards ΓöÇΓöÇΓöÇ */}
          <div className="sd-cards-grid">
            <SdCard color="purple"  label="Total Patients"      value="0" sub="Registered" />
            <SdCard color="blue"    label="Active Cases"         value="0" sub="Ongoing" />
            <SdCard color="indigo"  label="Pending Vaccinations" value="0" sub="Scheduled" />
            <SdCard color="teal"    label="Today's Queue"        value="0" sub="Waiting" />
            <SdCard color="violet"  label="Completed Cases"      value="0" sub="This month" />
            <SdCard color="cyan"    label="Follow-up Patients"   value="0" sub="This week" />
            <SdCard color="green"   label="Bite Cases"           value="0" sub="Total" />
            <SdCard color="emerald" label="New Today"            value="0" sub="Registered" />
          </div>

          {/* ΓöÇΓöÇΓöÇ Charts + Filters in one unified 3-column row ΓöÇΓöÇΓöÇ */}
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
                  <button className="sd-filter-link" onClick={() => { window.location.href = '/patients'; }} style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    Patients
                  </button>
                  <button className="sd-filter-link" onClick={() => { window.location.href = '/bite-cases'; }} style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}>
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
          <div className="sd-brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="sd-brand-text">
              <span className="sd-brand-clinic">{clinic?.name || 'Clinic'}</span>
              <span className="sd-brand-app">ABTC System</span>
            </div>
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
                    window.location.href = item.path;
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="sd-nav-icon">{NAV_ICONS[item.label]}</span>
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
                      onClick={() => { window.location.href = subItem.path; }}
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
        <button className="sd-toggle" onClick={() => setCollapsed(!collapsed)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {collapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}
          </svg>
        </button>
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
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/setup"     element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><SimpleDashboard /></ProtectedRoute>} />
          <Route path="/patients"  element={<ProtectedRoute><AppLayout title="Patients"><PatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><AppLayout title="Vaccine Inventory"><VaccineInventory /></AppLayout></ProtectedRoute>} />
          <Route path="/queue"     element={<ProtectedRoute><AppLayout title="Queue"><QueueDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/bite-cases" element={<ProtectedRoute><AppLayout title="Bite Cases"><BiteCaseRiskDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/vaccinations" element={<ProtectedRoute><AppLayout title="Vaccinations"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
          <Route path="/vaccinations/record" element={<ProtectedRoute><AppLayout title="Record Vaccination"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><AppLayout title="User Management"><UserListPage /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><AppLayout title="Reports &amp; Analytics"><ReportsDashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/users/create" element={<ProtectedRoute><AppLayout title="Add User"><UserCreatePage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AppLayout title="My Profile"><UserProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/clinic-info" element={<ProtectedRoute><AppLayout title="Clinic Information"><ClinicInformation /></AppLayout></ProtectedRoute>} />
        </Routes>
      </Router>
    </AppStyleScope>
  );
}

export default App;
