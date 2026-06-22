import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SetupWizard from './pages/Setup/SetupWizard';
import PatientList from './pages/Patients/PatientList';
import VaccineInventory from './pages/Inventory/VaccineInventory';
import ClinicInformation from './pages/Setup/ClinicInformation';
import ConfirmationModal from './components/ConfirmationModal';
import './App.css';
import './SimpleDashboard.css';

// ─── Auth Check Helper ───────────────────────────────────────
function isAuthenticated(): boolean {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  return !!(token && userData);
}

// ─── Protected Route Wrapper ───────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
    }
  }, [location.pathname]);
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// ─── Role-aware nav items ───────────────────────────────────────
interface NavItem {
  label: string;
  path?: string;
  roles: string[];
  submenu?: { label: string; path: string }[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard',    path: '/dashboard',    roles: ['admin','registration','triage','treatment'] },
  { label: 'Patients',     path: '/patients',     roles: ['registration','triage','treatment'] },
  { label: 'Queue',        path: '/queue',        roles: ['registration','triage'] },
  { label: 'Bite Cases',   path: '/bite-cases',   roles: ['admin','triage','treatment'] },
  { label: 'Vaccinations', path: '/vaccinations', roles: ['admin','triage','treatment'] },
  { label: 'Inventory',    path: '/inventory',    roles: ['admin'] },
  { label: 'Users',        path: '/users',        roles: ['admin'] },
  { 
    label: 'Clinic Setup',
    roles: ['admin'],
    submenu: [
      { label: 'Clinic Information', path: '/setup/clinic-info' },
      { label: 'Predefined Templates', path: '/setup/templates' },
      { label: 'Vaccination Schedules', path: '/setup/vaccination-schedules' },
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

// ─── SimpleDashboard ───────────────────────────────────────────
function SimpleDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [clinic, setClinic] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated()) {
        window.location.href = '/login';
        return;
      }
      const userData = localStorage.getItem('userData');
      const clinicData = localStorage.getItem('clinicData');
      const localUser = userData ? JSON.parse(userData) : null;
      const localClinic = clinicData ? JSON.parse(clinicData) : (localUser?.clinic || null);

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
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Failed to fetch fresh user data:', error);
        }
      }
      setUser(localUser);
      setClinic(localClinic);
      setIsLoading(false);
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
    window.location.href = '/login';
    return null;
  }

  const setupComplete = user?.clinic?.is_setup_complete ?? clinic?.is_setup_complete ?? false;
  if (!setupComplete && user?.role === 'admin') {
    window.location.href = '/setup';
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
      {/* ── Sidebar ── */}
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
              <button className="sd-dash-tab sd-dash-tab--active">Overview</button>
              <button className="sd-dash-tab">Cases</button>
              <button className="sd-dash-tab">Vaccinations</button>
            </div>
          </div>

          {/* 4×2 stat cards */}
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

          {/* Charts row */}
          <div className="sd-charts-row">
            <div className="sd-chart-card">
              <p className="sd-chart-title">Cases Over Time <span>(last 6 months)</span></p>
              <SdLineChart />
            </div>
            <div className="sd-chart-card">
              <p className="sd-chart-title">Case Distribution</p>
              <SdDonutChart
                data={[
                  { label: 'Category I',   pct: 35, color: '#4f7ef7' },
                  { label: 'Category II',  pct: 40, color: '#6c63ff' },
                  { label: 'Category III', pct: 25, color: '#10b981' },
                ]}
              />
            </div>
            <div className="sd-filter-card">
              <p className="sd-filter-title">Filters</p>
              <div className="sd-filter-group">
                <span className="sd-filter-label">Role</span>
                <select className="sd-filter-select">
                  <option>All</option><option>Admin</option><option>Triage</option>
                  <option>Registration</option><option>Treatment</option>
                </select>
              </div>
              <hr className="sd-filter-divider" />
              <div className="sd-filter-group">
                <span className="sd-filter-label">Status</span>
                <select className="sd-filter-select">
                  <option>All</option><option>Ongoing</option>
                  <option>Completed</option><option>Abandoned</option>
                </select>
              </div>
              <hr className="sd-filter-divider" />
              <div className="sd-filter-group">
                <span className="sd-filter-label">Date Range</span>
                <select className="sd-filter-select">
                  <option>This Month</option><option>Last 3 Months</option>
                  <option>Last 6 Months</option><option>This Year</option>
                </select>
              </div>
              <hr className="sd-filter-divider" />
              <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e2a4a', margin: '0 0 8px' }}>Quick Links</p>
                <button className="sd-filter-link" onClick={() => { window.location.href = '/patients'; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  View Patients
                </button>
                <button className="sd-filter-link" style={{ marginTop: 8 }} onClick={() => { window.location.href = '/bite-cases'; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  View Cases
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="sd-charts-bottom">
            <div className="sd-chart-card">
              <p className="sd-chart-title">Vaccination Trend <span>(last 6 months)</span></p>
              <SdLineChart color="#10b981" />
            </div>
            <div className="sd-chart-card">
              <p className="sd-chart-title">Animal Bite Severity</p>
              <SdDonutChart
                data={[
                  { label: 'Cat. I (Minor)',    pct: 30, color: '#10b981' },
                  { label: 'Cat. II (Moderate)', pct: 45, color: '#f59e0b' },
                  { label: 'Cat. III (Severe)',  pct: 25, color: '#ef4444' },
                ]}
              />
            </div>
          </div>
        </main>
      </div>

      {showLogoutModal && (
        <ConfirmationModal
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

function SdCard({ color, label, value, sub }: { color: string; label: string; value: string; sub: string }) {
  return (
    <div className={`sd-card sd-card--${color}`}>
      <p className="sd-card-label">{label}</p>
      <p className="sd-card-value">{value}</p>
      <p className="sd-card-sub">{sub}</p>
    </div>
  );
}

function SdLineChart({ color = '#4f7ef7' }: { color?: string }) {
  const points = [20, 45, 30, 60, 40, 75, 55, 80, 65, 90, 70, 85];
  const w = 400, h = 130, pad = 20;
  const maxV = Math.max(...points);
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map(v => pad + (1 - v / maxV) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const area = `${path} L ${xs[xs.length - 1]} ${h - pad} L ${xs[0]} ${h - pad} Z`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sd-line-chart" preserveAspectRatio="none">
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

function SdDonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 50, cx = 70, cy = 70, stroke = 22;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const len = (d.pct / 100) * circ;
    const s = { ...d, dasharray: `${len} ${circ - len}`, offset };
    offset += len;
    return s;
  });
  return (
    <div className="sd-donut-wrap">
      <svg viewBox="0 0 140 140" width="140" height="140">
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={s.dasharray}
            strokeDashoffset={-s.offset}
            transform="rotate(-90, 70, 70)"
          />
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1e2a4a">
          {data.reduce((a, d) => a + d.pct, 0)}%
        </text>
      </svg>
      <div className="sd-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="sd-donut-legend-item">
            <div className="sd-donut-legend-dot" style={{ background: d.color }} />
            <span>{d.label}</span>
            <span className="sd-donut-legend-pct">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared layout wrapper for inner pages ─────────────────────
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
        <main className="sd-content">{children}</main>
      </div>

      {showLogoutModal && (
        <ConfirmationModal
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

// ─── App ───────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/setup"     element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><SimpleDashboard /></ProtectedRoute>} />
        <Route path="/patients"  element={<ProtectedRoute><AppLayout title="Patients"><PatientList /></AppLayout></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><AppLayout title="Vaccine Inventory"><VaccineInventory /></AppLayout></ProtectedRoute>} />
        <Route path="/setup/clinic-info" element={<ProtectedRoute><AppLayout title="Clinic Information"><ClinicInformation /></AppLayout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
