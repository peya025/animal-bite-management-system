import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SetupWizard from './pages/Setup/SetupWizard';
import './App.css';
import './SimpleDashboard.css';

// ─── Role-aware nav items ───────────────────────────────────────
const NAV = [
  { label: 'Dashboard',    path: '/dashboard',   roles: ['admin','registration','triage','treatment'] },
  { label: 'Patients',     path: '/patients',    roles: ['admin','registration','triage','treatment'] },
  { label: 'Queue',        path: '/queue',       roles: ['admin','registration','triage'] },
  { label: 'Bite Cases',   path: '/bite-cases',  roles: ['admin','triage','treatment'] },
  { label: 'Vaccinations', path: '/vaccinations',roles: ['admin','triage','treatment'] },
  { label: 'Users',        path: '/users',       roles: ['admin'] },
  { label: 'Clinic Setup', path: '/setup',       roles: ['admin'] },
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
};

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrator',
  registration: 'Registration Staff',
  triage:       'Triage / Doctor',
  treatment:    'Treatment Staff',
};

// ─── SimpleDashboard ───────────────────────────────────────────
function SimpleDashboard() {
  const userData   = localStorage.getItem('userData');
  const clinicData = localStorage.getItem('clinicData');
  const user   = userData   ? JSON.parse(userData)   : null;
  const clinic = clinicData ? JSON.parse(clinicData) : null;

  const [collapsed, setCollapsed] = useState(false);

  if (clinic && !clinic.is_setup_complete && user?.role === 'admin') {
    window.location.href = '/setup';
    return null;
  }

  const visibleNav = NAV.filter(n => user?.role && n.roles.includes(user.role));

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="sd-layout">

      {/* ── Sidebar ── */}
      <aside className={`sd-sidebar ${collapsed ? 'sd-sidebar--collapsed' : ''}`}>

        {/* Brand */}
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

        {/* Nav */}
        <nav className="sd-nav">
          {visibleNav.map(item => (
            <button
              key={item.path}
              className={`sd-nav-item ${window.location.pathname === item.path ? 'sd-nav-item--active' : ''}`}
              onClick={() => { window.location.href = item.path; }}
              title={collapsed ? item.label : undefined}
            >
              <span className="sd-nav-icon">{NAV_ICONS[item.label]}</span>
              {!collapsed && <span className="sd-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="sd-user">
          <div className="sd-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sd-user-info">
              <span className="sd-user-name">{user?.name || 'User'}</span>
              <span className="sd-user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          )}
          <button
            className="sd-logout-btn"
            title="Sign out"
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Collapse toggle */}
        <button className="sd-toggle" onClick={() => setCollapsed(!collapsed)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {collapsed
              ? <path d="M9 18l6-6-6-6"/>
              : <path d="M15 18l-6-6 6-6"/>
            }
          </svg>
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="sd-main">

        {/* Topbar */}
        <header className="sd-topbar">
          <span className="sd-topbar-title">Dashboard</span>
          <div className="sd-topbar-right">
            <span className="sd-topbar-date">
              {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="sd-topbar-avatar">{initials}</div>
          </div>
        </header>

        {/* Content */}
        <main className="sd-content">

          {/* Greeting */}
          <div className="sd-greeting">
            <div>
              <h1>{greeting}, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
              <p>Here's your overview for today.</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="sd-stats">
            <SdStatCard label="Total Patients"       value="0" color="#3b82f6" bg="#dbeafe"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
            <SdStatCard label="Active Cases"         value="0" color="#ef4444" bg="#fee2e2"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
            />
            <SdStatCard label="Pending Vaccinations" value="0" color="#f59e0b" bg="#fef3c7"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/><circle cx="12" cy="12" r="9"/></svg>}
            />
            <SdStatCard label="Today's Queue"        value="0" color="#10b981" bg="#d1fae5"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
            />
          </div>

          {/* Info card */}
          <div className="sd-info-card">
            <div className="sd-info-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <h3>System Ready</h3>
              <p>You're logged in as <strong>{ROLE_LABELS[user?.role] || user?.role}</strong> at <strong>{clinic?.name}</strong>. Use the sidebar to navigate.</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="sd-quick-grid">
            {visibleNav.filter(n => n.path !== '/dashboard').map(item => (
              <button
                key={item.path}
                className="sd-quick-btn"
                onClick={() => { window.location.href = item.path; }}
              >
                <span className="sd-quick-icon">{NAV_ICONS[item.label]}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}

function SdStatCard({ label, value, color, bg, icon }: any) {
  return (
    <div className="sd-stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="sd-stat-icon" style={{ background: bg }}>{icon}</div>
      <div className="sd-stat-body">
        <span className="sd-stat-value">{value}</span>
        <span className="sd-stat-label">{label}</span>
      </div>
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
        <Route path="/setup"     element={<SetupWizard />} />
        <Route path="/dashboard" element={<SimpleDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
