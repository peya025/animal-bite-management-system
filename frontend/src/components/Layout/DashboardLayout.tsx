import { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, ROLE_LABELS } from '../../constants';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, clinic, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      icon: '📊',
      path: '/dashboard',
      roles: ['admin', 'registration', 'triage', 'treatment'],
    },
    {
      name: 'Patients',
      icon: '👥',
      path: '/patients',
      roles: ['admin', 'registration', 'triage', 'treatment'],
    },
    {
      name: 'Queue',
      icon: '📋',
      path: '/queue',
      roles: ['admin', 'registration', 'treatment'],
    },
    {
      name: 'Bite Cases',
      icon: '🩺',
      path: '/bite-cases',
      roles: ['admin', 'triage', 'treatment'],
    },
    {
      name: 'Vaccinations',
      icon: '💉',
      path: '/vaccinations',
      roles: ['admin', 'triage', 'treatment'],
    },
    {
      name: 'Users',
      icon: '👤',
      path: '/users',
      roles: ['admin'],
    },
    {
      name: 'Clinic Setup',
      icon: '⚙️',
      path: '/setup',
      roles: ['admin'],
    },
  ];

  const filteredNavigation = navigation.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  );

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="clinic-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          {sidebarOpen && (
            <div className="clinic-info">
              <h2>{clinic?.name || 'Clinic'}</h2>
              <p className="app-name">{APP_NAME}</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {filteredNavigation.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${window.location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.name}</span>}
            </button>
          ))}
        </nav>

        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sidebarOpen ? (
              <path d="M15 18l-6-6 6-6"/>
            ) : (
              <path d="M9 18l6-6-6-6"/>
            )}
          </svg>
        </button>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1>Animal Bite Management System</h1>
          </div>

          <div className="header-right">
            {/* User Menu */}
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <p className="user-name">{user?.name}</p>
                  <p className="user-role">{user?.role ? ROLE_LABELS[user.role] : 'User'}</p>
                </div>
              </div>
              <button className="logout-button" onClick={handleLogout} title="Logout">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
