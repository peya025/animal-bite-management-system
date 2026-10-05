import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellButton,
  NotificationBadge,
  NotificationDropdown,
  DropdownHeader,
  DropdownTabs,
  TabButton,
  TabBadge,
  NotificationList,
  NotificationItem,
  NotificationItemIcon,
  NotificationContent,
  NotificationTitle,
  AlertChip,
  NotificationText,
  NotificationMeta,
  NotificationTime,
  ActionHint,
  UnreadDot,
  DropdownFooter,
  EmptyStateContainer,
  EmptyIconWrapper,
  EmptyTitle,
  EmptySubtitle,
} from './NotificationButton.styles';
import { Icon, type IconName } from './ui/Icon';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useAccessDenied } from '../contexts/AccessDeniedContext';
import { canUserAccessRoute } from '../utils/accessControl';
import { resolveNotificationDestination } from '../utils/notificationNavigation';

export interface NotificationRecord {
  id: number;
  clinic_id: number | null;
  title: string;
  message: string;
  type: string;
  category: string;
  action_url: string | null;
  is_active: boolean;
  resolved_at: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | null;
  created_at: string | null;
  time_ago: string;
  is_unread: boolean;
  is_read?: boolean;
}

function getNotificationVisuals(category: string, type: string): {
  icon: IconName;
  variant: 'info' | 'warning' | 'danger' | 'success' | 'purple';
} {
  switch (type) {
    case 'high_risk_area':
      return { icon: 'biteCases', variant: 'danger' };
    case 'out_of_stock':
    case 'stock_expired':
      return { icon: 'warning', variant: 'danger' };
    case 'low_stock':
    case 'near_expiry':
      return { icon: 'warning', variant: 'warning' };
    case 'overdue_vaccination':
      return { icon: 'calendar', variant: 'warning' };
    case 'stock_received':
    case 'vaccine_preset_created':
      return { icon: 'inventory', variant: 'success' };
    case 'queue_registered':
    case 'queue_called':
      return { icon: 'queue', variant: 'info' };
    case 'appointment_booked':
    case 'appointment_confirmed':
      return { icon: 'calendar', variant: 'purple' };
    default:
      if (category === 'inventory') return { icon: 'inventory', variant: 'success' };
      if (category === 'queue') return { icon: 'queue', variant: 'info' };
      if (category === 'appointment') return { icon: 'calendar', variant: 'purple' };
      if (category === 'patient') return { icon: 'patients', variant: 'info' };
      if (category === 'surveillance' || category === 'high_risk') return { icon: 'biteCases', variant: 'danger' };
      return { icon: 'notification', variant: 'info' };
  }
}

export default function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  const { user } = useAuth();
  const { showAccessDenied } = useAccessDenied();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
    markAsRead,
  } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setActiveTab('unread');
      }
      return next;
    });
  };

  // When dropdown is opened, fetch fresh notifications
  // Opening the dropdown alone does not mark notifications as read
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter unread and read notifications
  const unreadList = useMemo(() => {
    return notifications.filter((n) => n.is_unread);
  }, [notifications]);

  const readList = useMemo(() => {
    return notifications.filter((n) => !n.is_unread || n.is_read);
  }, [notifications]);

  // Sort each list by newest first (descending by created_at, then by id)
  const sortedUnread = useMemo(() => {
    return [...unreadList].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [unreadList]);

  const sortedRead = useMemo(() => {
    return [...readList].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [readList]);

  const currentList = activeTab === 'unread' ? sortedUnread : sortedRead;

  const handleItemClick = useCallback((item: NotificationRecord) => {
    // Mark specific notification as read if unread
    if (item.is_unread) {
      markAsRead(item.id);
    }

    const destinationUrl = resolveNotificationDestination(item, user);

    if (destinationUrl) {
      setIsOpen(false);
      if (canUserAccessRoute(user, destinationUrl)) {
        navigate(destinationUrl);
      } else {
        // Keep user on current page and show access denied popup
        showAccessDenied();
      }
    } else if (item.action_url) {
      setIsOpen(false);
      if (canUserAccessRoute(user, item.action_url)) {
        navigate(item.action_url);
      } else {
        showAccessDenied();
      }
    }
  }, [markAsRead, user, navigate, showAccessDenied]);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <BellButton
        type="button"
        title="Notifications"
        aria-label="Notifications"
        onClick={handleToggleOpen}
      >
        {unreadCount > 0 && (
          <NotificationBadge>
            {unreadCount > 99 ? '99+' : unreadCount}
          </NotificationBadge>
        )}
        <Icon name="notification" size={19} />
      </BellButton>

      {isOpen && (
        <NotificationDropdown>
          <DropdownHeader>
            <div className="header-left">
              <h3>Notifications</h3>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-read"
                onClick={markAllAsRead}
                title="Mark all notifications as read"
              >
                Mark all as read
              </button>
            )}
          </DropdownHeader>

          <DropdownTabs role="tablist" aria-label="Notification filters">
            <TabButton
              type="button"
              role="tab"
              aria-selected={activeTab === 'unread'}
              $isActive={activeTab === 'unread'}
              onClick={() => setActiveTab('unread')}
            >
              <span>Unread</span>
              <TabBadge $isActive={activeTab === 'unread'}>
                ({sortedUnread.length})
              </TabBadge>
            </TabButton>
            <TabButton
              type="button"
              role="tab"
              aria-selected={activeTab === 'read'}
              $isActive={activeTab === 'read'}
              onClick={() => setActiveTab('read')}
            >
              <span>Read</span>
              <TabBadge $isActive={activeTab === 'read'}>
                ({sortedRead.length})
              </TabBadge>
            </TabButton>
          </DropdownTabs>

          <NotificationList>
            {currentList.length > 0 ? (
              currentList.map((n) => {
                const visuals = getNotificationVisuals(n.category, n.type);
                const destination = resolveNotificationDestination(n, user) || n.action_url;
                const hasDestination = Boolean(destination);

                return (
                  <NotificationItem
                    key={n.id}
                    $isUnread={n.is_unread}
                    onClick={() => handleItemClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemClick(n);
                      }
                    }}
                  >
                    <NotificationItemIcon
                      iconName={visuals.icon}
                      variant={visuals.variant}
                    >
                      <Icon name={visuals.icon} size={16} />
                    </NotificationItemIcon>
                    <NotificationContent>
                      <NotificationTitle $isUnread={n.is_unread}>
                        <span>{n.title}</span>
                        {n.is_active && (
                          <AlertChip variant={visuals.variant === 'danger' ? 'danger' : 'warning'}>
                            Active Alert
                          </AlertChip>
                        )}
                      </NotificationTitle>
                      <NotificationText $unread={n.is_unread}>
                        {n.message || (n as { text?: string }).text}
                      </NotificationText>
                      <NotificationMeta>
                        <NotificationTime>{n.time_ago}</NotificationTime>
                        {hasDestination && (
                          <ActionHint
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(n);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleItemClick(n);
                              }
                            }}
                          >
                            View details &rarr;
                          </ActionHint>
                        )}
                      </NotificationMeta>
                    </NotificationContent>
                    {n.is_unread && <UnreadDot />}
                  </NotificationItem>
                );
              })
            ) : (
              <EmptyStateContainer>
                <EmptyIconWrapper>
                  <Icon name="notification" size={18} />
                </EmptyIconWrapper>
                <EmptyTitle>
                  {activeTab === 'unread' ? 'No unread notifications' : 'No read notifications'}
                </EmptyTitle>
                <EmptySubtitle>
                  {activeTab === 'unread'
                    ? "You're all caught up! No unread notifications at this time."
                    : "Notifications you've already read will appear here."}
                </EmptySubtitle>
              </EmptyStateContainer>
            )}
          </NotificationList>

          <DropdownFooter type="button" onClick={() => setIsOpen(false)}>
            Close
          </DropdownFooter>
        </NotificationDropdown>
      )}
    </div>
  );
}
