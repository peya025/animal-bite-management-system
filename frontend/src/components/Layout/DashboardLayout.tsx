import { type ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import ConfirmationDialog from '../feedback/ConfirmationDialog';
import { DashboardLayoutRoot } from './DashboardLayout.styles';
import {
  getNavItemsForRole,
  isRouteActive,
  isSubmenuActive,
  findActiveParentSubmenu,
  ROLE_LABELS,
} from '../../shared/config/navigationConfig';
import { ROUTES } from '../../shared/config/routes';
import ThemeToggle from '../../shared/components/ThemeToggle';
import NotificationButton from '../../shared/components/NotificationButton';

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function DashboardLayout({ children, pageTitle: _pageTitle }: DashboardLayoutProps) {
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isSoloNurse = Boolean(
    user?.is_solo_nurse ||
    (user?.roles && user.roles.some((r: any) => r.slug === 'intake_nurse') && user.roles.some((r: any) => r.slug === 'follow_up_nurse')) ||
    user?.role === 'treatment'
  );

  const [stationMode, setStationMode] = useState<'intake' | 'follow_up' | 'combined'>(() => {
    return (localStorage.getItem('active_station_mode') as any) || 'intake';
  });

  const applyStationMode = (newMode: 'intake' | 'follow_up' | 'combined') => {
    setStationMode(newMode);
    localStorage.setItem('active_station_mode', newMode);
    window.dispatchEvent(new CustomEvent('station-changed', { detail: newMode }));
  };

  const handleStationChange = (newMode: 'intake' | 'follow_up' | 'combined') => {
    applyStationMode(newMode);
    if (newMode === 'intake' && location.pathname !== ROUTES.QUEUE.DASHBOARD) {
      navigate(ROUTES.QUEUE.DASHBOARD);
    } else if (newMode === 'follow_up' && location.pathname !== ROUTES.PATIENTS.NURSE_LIST) {
      navigate(ROUTES.PATIENTS.NURSE_LIST);
    } else if (newMode === 'combined' && location.pathname !== ROUTES.QUEUE.DASHBOARD) {
      navigate(ROUTES.QUEUE.DASHBOARD);
    }
  };

  // Direct sidebar navigation must always tell the same story as the station control.
  // Combined mode remains available on the queue dashboard for cross-coverage.
  useEffect(() => {
    if (!isSoloNurse || stationMode === 'combined') return;
    const routeMode = location.pathname === ROUTES.QUEUE.DASHBOARD
      ? 'intake'
      : location.pathname === ROUTES.PATIENTS.NURSE_LIST
        ? 'follow_up'
        : null;
    if (routeMode && routeMode !== stationMode) applyStationMode(routeMode);
  }, [location.pathname, isSoloNurse, stationMode]);

  const getRoleBadge = () => {
    if (isSoloNurse) {
      if (stationMode === 'intake') return 'Intake Station';
      if (stationMode === 'follow_up') return 'Follow-Up Station';
      return 'Dual Nurse Station';
    }
    if (user?.roles?.some((r: any) => r.slug === 'intake_nurse')) return 'Intake Nurse';
    if (user?.roles?.some((r: any) => r.slug === 'follow_up_nurse')) return 'Follow-Up Nurse';
    if (user?.role) return ROLE_LABELS[user.role] || user.role;
    return 'Staff';
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <DashboardLayoutRoot>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>

        {/* Brand */}
        <div
          className="sidebar-header"
          style={{
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            padding: sidebarOpen ? '0 16px' : '0',
            height: '68px',
            boxSizing: 'border-box',
          }}
        >
          {sidebarOpen ? (
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
          ) : (
            <button
              className="sidebar-toggle-collapsed"
              onClick={() => setSidebarOpen(true)}
              title="Expand Sidebar"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
            </button>
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
                      if (item.path) {
                        navigate(item.path);
                        if (item.path === ROUTES.INVENTORY.LIST) {
                          window.dispatchEvent(new CustomEvent('nav-inventory-reset'));
                        }
                      }
                    } else if (item.path) {
                      if (item.path === ROUTES.QUEUE.DASHBOARD) applyStationMode('intake');
                      if (item.path === ROUTES.PATIENTS.NURSE_LIST) applyStationMode('follow_up');
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

                {hasSub && sidebarOpen && expandedMenu === item.label && (
                  <div className="submenu">
                    {item.submenu!.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => {
                          if (subItem.path === ROUTES.QUEUE.DASHBOARD) applyStationMode('intake');
                          if (subItem.path === ROUTES.PATIENTS.NURSE_LIST) applyStationMode('follow_up');
                          navigate(subItem.path);
                          if (subItem.path === ROUTES.INVENTORY.LIST) {
                            window.dispatchEvent(new CustomEvent('nav-inventory-reset'));
                          }
                        }}
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

        {sidebarOpen ? (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user?.name}{user?.professional_license_no ? `, RN` : ''}
              </span>
              <span className="sidebar-user-role">
                {getRoleBadge()}
              </span>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={() => setShowLogoutModal(true)}
              title="Logout"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="sidebar-footer-actions">
            <button
              className="nav-item nav-item-logout"
              onClick={() => setShowLogoutModal(true)}
              title="Logout"
              type="button"
            >
              <span className="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
            </button>
          </div>
        )}

      </aside>

      {/* ── Main Content ── */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sidebarOpen && (
              <button
                className="header-toggle"
                onClick={() => setSidebarOpen(false)}
                title="Collapse Sidebar"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="6" x2="20" y2="6"></line>
                  <line x1="4" y1="18" x2="20" y2="18"></line>
                </svg>
              </button>
            )}

            {/* Station Switcher for Dual/Multi-Role Nurses */}
            {isSoloNurse && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: stationMode === 'follow_up' ? '#eef2ff' : stationMode === 'combined' ? '#f8fafc' : '#ecfdf5',
                borderRadius: '8px',
                padding: '3px 8px',
                border: `1px solid ${stationMode === 'follow_up' ? '#c7d2fe' : stationMode === 'combined' ? 'var(--border-color, #e2e8f0)' : '#a7f3d0'}`,
                gap: 6,
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Station:
                </span>
                <select
                  value={stationMode}
                  onChange={(e) => handleStationChange(e.target.value as any)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: stationMode === 'follow_up' ? '#4f46e5' : stationMode === 'combined' ? '#475569' : '#047857',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="intake">Station 1 · New & Day 0</option>
                  <option value="follow_up">Station 2 · Follow-up Doses</option>
                  <option value="combined">Combined · All Active Queues</option>
                </select>
              </div>
            )}
          </div>
          <div className="header-right">
            <NotificationButton />
            <ThemeToggle />
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
          loadingLabel="Signing out..."
          loading={isLoggingOut}
          onConfirm={handleLogout}
          onCancel={() => {
            if (!isLoggingOut) setShowLogoutModal(false);
          }}
          shakeIcon
        />
      )}
    </DashboardLayoutRoot>
  );
}
