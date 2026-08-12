import { type ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import ConfirmationDialog from '../feedback/ConfirmationDialog';
import { DashboardLayoutRoot } from './DashboardLayout.styles';
import { ROUTES } from '../../shared/config/routes';
import {
  getNavItemsForRole,
  isRouteActive,
  isSubmenuActive,
  findActiveParentSubmenu,
  ROLE_LABELS,
} from '../../shared/config/navigationConfig';

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const { user, clinic, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filteredNav = getNavItemsForRole(user?.role);

  const [expandedMenu, setExpandedMenu] = useState<string | null>(() =>
    findActiveParentSubmenu(location.pathname, filteredNav)
  );

  // Auto-expand parent submenu when location changes
  useEffect(() => {
    const parentLabel = findActiveParentSubmenu(location.pathname, filteredNav);
    if (parentLabel && parentLabel !== expandedMenu) {
      setExpandedMenu(parentLabel);
    }
  }, [location.pathname]);

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const toggleSubmenu = (itemLabel: string) => {
    setExpandedMenu((prev) => (prev === itemLabel ? null : itemLabel));
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <DashboardLayoutRoot>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>

        {/* Brand */}
        <div className="sidebar-header" style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center', padding: sidebarOpen ? '0 16px' : '0' }}>
          {!sidebarOpen ? (
            <button className="header-toggle" onClick={() => setSidebarOpen(true)} title="Expand Sidebar" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
            </button>
          ) : (
            <>
              <div className="clinic-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div className="clinic-info">
                <h2>{clinic?.name || 'Clinic'}</h2>
                <p className="app-name">{APP_NAME}</p>
              </div>
            </>
          )}
        </div>

        {/* Dynamic Sidebar Nav */}
        <nav className="sidebar-nav">
          {filteredNav.map((item) => {
            const hasSub = !!item.submenu && item.submenu.length > 0;
            const activeSub = hasSub && isSubmenuActive(item.submenu, location.pathname, filteredNav);
            const activeDirect = !hasSub && item.path && isRouteActive(item.path, location.pathname, filteredNav);

            return (
              <div key={item.label}>
                <button
                  onClick={() => {
                    if (hasSub) {
                      toggleSubmenu(item.label);
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={`nav-item ${activeSub || activeDirect ? 'active' : ''}`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      {hasSub && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`nav-chevron ${expandedMenu === item.label ? 'expanded' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      )}
                    </>
                  )}
                </button>
                
                {/* Submenu rendering */}
                {hasSub && sidebarOpen && expandedMenu === item.label && (
                  <div className="submenu">
                    {item.submenu!.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => navigate(subItem.path)}
                        className={`submenu-item ${isRouteActive(subItem.path, location.pathname, filteredNav) ? 'active' : ''}`}
                      >
                        <span className="submenu-dot"></span>
                        <span className="submenu-label">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User card */}
        {sidebarOpen && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">
                {user?.role ? ROLE_LABELS[user.role] : ''}
              </span>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={() => setShowLogoutModal(true)}
              title="Logout"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}

      </aside>

      {/* ── Main Content ── */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button
              className="header-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="header-right">
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar">{initials}</div>
                <div className="user-details">
                  <p className="user-name">{user?.name}</p>
                  <p className="user-role">{user?.role ? ROLE_LABELS[user.role] : 'User'}</p>
                </div>
              </div>
              <button className="logout-button" onClick={() => setShowLogoutModal(true)} title="Logout">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Logout modal */}
      {showLogoutModal && (
        <ConfirmationDialog
          variant="logout"
          title="Sign out?"
          message="You'll be returned to the login page."
          confirmLabel="Yes, sign out"
          onConfirm={() => { setShowLogoutModal(false); logout(); }}
          onCancel={() => setShowLogoutModal(false)}
          shakeIcon
        />
      )}
    </DashboardLayoutRoot>
  );
}
