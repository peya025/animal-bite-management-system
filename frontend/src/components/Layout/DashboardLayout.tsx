import { type ReactNode, useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_NAME, ROLE_LABELS } from '../../constants';
import ConfirmationDialog from '../feedback/ConfirmationDialog';
import { DashboardLayoutRoot } from './DashboardLayout.styles';
import { ROUTES } from '../../shared/config/routes';

// ─── Sample Notifications ─────────────────────────────────────

interface Notification {
  id: number;
  icon: string;       // emoji used as avatar fallback
  iconBg: string;     // background colour for icon circle
  title: string;
  message: string;
  time: string;
  tags: { label: string; color: string; bg: string }[];
  read: boolean;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    icon: '🐕',
    iconBg: '#fee2e2',
    title: 'New Bite Case Registered',
    message: 'Case #BC-2026-0042 has been created for patient Juan Dela Cruz.',
    time: '1m ago',
    tags: [
      { label: 'New Case',    color: '#dc2626', bg: '#fee2e2' },
      { label: 'Category II', color: '#c2410c', bg: '#fff7ed' },
    ],
    read: false,
  },
  {
    id: 2,
    icon: '💉',
    iconBg: '#dbeafe',
    title: 'Vaccination Due Today',
    message: 'Maria Santos is scheduled for Dose 3 (Day 7) today.',
    time: '15m ago',
    tags: [
      { label: 'Vaccination', color: '#1d4ed8', bg: '#dbeafe' },
      { label: 'Day 7',       color: '#6b7280', bg: '#f3f4f6' },
    ],
    read: false,
  },
  {
    id: 3,
    icon: '⚠️',
    iconBg: '#fef9c3',
    title: 'Low Vaccine Stock Alert',
    message: 'Batch VB-2026-11 is below the minimum threshold (5 vials remaining).',
    time: '1h ago',
    tags: [
      { label: 'Inventory',  color: '#a16207', bg: '#fef9c3' },
      { label: 'Low Stock',  color: '#dc2626', bg: '#fee2e2' },
    ],
    read: false,
  },
  {
    id: 4,
    icon: '👤',
    iconBg: '#ecfdf5',
    title: 'New Patient Registered',
    message: 'Pedro Reyes (P-2026-0118) has been registered by the Registration staff.',
    time: '2h ago',
    tags: [
      { label: 'Patient',      color: '#059669', bg: '#ecfdf5' },
      { label: 'Registration', color: '#6b7280', bg: '#f3f4f6' },
    ],
    read: true,
  },
  {
    id: 5,
    icon: '✅',
    iconBg: '#ecfdf5',
    title: 'Queue Consultation Complete',
    message: 'Queue #47 — Ana Gonzales has completed consultation.',
    time: '3h ago',
    tags: [
      { label: 'Queue',     color: '#059669', bg: '#ecfdf5' },
      { label: 'Completed', color: '#6b7280', bg: '#f3f4f6' },
    ],
    read: true,
  },
];

// ─── Notification Panel ───────────────────────────────────────

function NotificationPanel({
  notifications,
  onMarkAllRead,
  onMarkRead,
}: {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: number) => void;
}) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 10px)',
      right: 0,
      width: 380,
      background: '#fff',
      borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e5e7eb',
      zIndex: 9999,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px 12px',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span style={{
              background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700,
              borderRadius: 999, padding: '1px 7px', lineHeight: '18px',
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#10b981', fontFamily: 'inherit',
              padding: '2px 4px',
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{
            padding: '40px 24px', textAlign: 'center',
            color: '#9ca3af', fontSize: 13,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            You're all caught up!
          </div>
        ) : (
          notifications.map((n, idx) => (
            <div
              key={n.id}
              onClick={() => onMarkRead(n.id)}
              style={{
                display: 'flex', gap: 12, padding: '14px 18px',
                borderBottom: idx < notifications.length - 1 ? '1px solid #f9fafb' : 'none',
                background: n.read ? '#fff' : '#f0fdf4',
                cursor: 'pointer', transition: 'background 0.15s',
                alignItems: 'flex-start',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#fff' : '#f0fdf4')}
            >
              {/* Icon circle */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: n.iconBg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18,
                flexShrink: 0,
              }}>
                {n.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 2,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 220,
                  }}>
                    {n.title}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, marginLeft: 6 }}>
                    {n.time}
                  </span>
                </div>

                <p style={{
                  fontSize: 12, color: '#6b7280', margin: '0 0 8px',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {n.message}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {n.tags.map(tag => (
                    <span key={tag.label} style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 999, background: tag.bg, color: tag.color,
                    }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#10b981', flexShrink: 0, marginTop: 4,
                }} />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid #f3f4f6',
        textAlign: 'center',
      }}>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'inherit',
        }}>
          View all notifications
        </button>
      </div>
    </div>
  );
}

// Force rebuild - 2026-06-21 15:30

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles: string[];
  submenu?: { name: string; path: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    path: ROUTES.DASHBOARD,
    roles: ['admin', 'registration', 'triage', 'treatment'],
  },
  {
    name: 'Patients',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    path: ROUTES.PATIENTS.LIST,
    roles: ['admin', 'registration', 'triage', 'treatment'],
  },
  {
    name: 'Queue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    path: ROUTES.QUEUE.DASHBOARD,
    roles: ['admin', 'registration', 'triage'],
  },
  {
    name: 'Bite Cases',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    path: ROUTES.BITE_CASES.LIST,
    roles: ['admin', 'triage', 'treatment'],
  },
  {
    name: 'Vaccinations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <circle cx="12" cy="12" r="9"/>
      </svg>
    ),
    path: ROUTES.VACCINATIONS.LIST,
    roles: ['admin', 'triage', 'treatment'],
  },
  {
    name: 'Inventory',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 3v18"/>
      </svg>
    ),
    path: ROUTES.INVENTORY.LIST,
    roles: ['admin', 'triage', 'treatment'],
  },
  {
    name: 'Reports',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    path: ROUTES.REPORTS.LIST,
    roles: ['admin', 'triage'],
  },
  {
    name: 'Users',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    path: ROUTES.USERS.LIST,
    roles: ['admin'],
  },
  {
    name: 'Clinic Setup',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    roles: ['admin'],
    submenu: [
      { name: 'Clinic Information',    path: ROUTES.CLINIC_SETUP.INFO      },
      { name: 'Predefined Templates',  path: ROUTES.CLINIC_SETUP.TEMPLATES },
      { name: 'Vaccination Schedules', path: ROUTES.CLINIC_SETUP.VAX_SCHED },
    ],
  },
];

export default function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const { user, clinic, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // ── Notification state ────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const markRead = (id: number) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const filteredNav = NAV_ITEMS.filter(item =>
    user?.role ? item.roles.includes(user.role) : false
  );

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(path));

  const isSubmenuActive = (submenu?: { name: string; path: string }[]) =>
    submenu?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path));

  const toggleSubmenu = (itemName: string) => {
    setExpandedMenu(expandedMenu === itemName ? null : itemName);
  };

  return (
    <DashboardLayoutRoot>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>

        {/* Brand */}
        <div className="sidebar-header">
          <div className="clinic-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
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

        {/* Nav */}
        <nav className="sidebar-nav">
          {filteredNav.map(item => (
            <div key={item.name}>
              <button
                onClick={() => {
                  if (item.submenu) {
                    toggleSubmenu(item.name);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                className={`nav-item ${
                  item.submenu
                    ? isSubmenuActive(item.submenu) ? 'active' : ''
                    : item.path && isActive(item.path) ? 'active' : ''
                }`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="nav-label">{item.name}</span>
                    {item.submenu && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`nav-chevron ${expandedMenu === item.name ? 'expanded' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </>
                )}
              </button>
              
              {/* Submenu */}
              {item.submenu && sidebarOpen && expandedMenu === item.name && (
                <div className="submenu">
                  {item.submenu.map(subItem => (
                    <button
                      key={subItem.path}
                      onClick={() => navigate(subItem.path)}
                      className={`submenu-item ${isActive(subItem.path) ? 'active' : ''}`}
                    >
                      <span className="submenu-dot"></span>
                      <span className="submenu-label">{subItem.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
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

        {/* Toggle */}
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {sidebarOpen ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
          </svg>
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <h1>{pageTitle || 'Animal Bite Management System'}</h1>
          </div>
          <div className="header-right">
            {/* ── Notification bell ── */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                style={{
                  position: 'relative',
                  width: 38, height: 38, borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: notifOpen ? '#f0fdf4' : '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  color: notifOpen ? '#10b981' : '#6b7280',
                }}
                title="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#ef4444',
                    border: '2px solid #fff',
                  }} />
                )}
              </button>

              {notifOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onMarkAllRead={markAllRead}
                  onMarkRead={markRead}
                />
              )}
            </div>

            {/* ── User info + logout ── */}
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
          {/* Breadcrumb — shown on all inner pages */}
          {pageTitle && pageTitle !== 'Animal Bite Management System' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#6b7280', marginBottom: 16,
            }}>
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: '#3b82f6', fontSize: 13, fontFamily: 'inherit',
                  cursor: 'pointer', transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
                onMouseLeave={e => (e.currentTarget.style.color = '#3b82f6')}
              >
                Dashboard
              </button>
              <span style={{ color: '#d1d5db' }}>›</span>
              <span style={{ color: '#374151', fontWeight: 500 }}>{pageTitle}</span>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Logout modal */}
      {showLogoutModal && (
        <ConfirmationDialog
          variant="danger"
          title="Sign out?"
          message="You'll be returned to the login page."
          confirmLabel="Yes, sign out"
          onConfirm={() => { setShowLogoutModal(false); logout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </DashboardLayoutRoot>
  );
}
