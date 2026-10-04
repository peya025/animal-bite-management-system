import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellButton,
  NotificationBadge,
  NotificationDropdown,
  DropdownHeader,
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
} from './NotificationButton.styles';
import { Icon, type IconName } from './ui/Icon';
import api from '../../services/api';

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
  data: Record<string, any> | null;
  created_at: string | null;
  time_ago: string;
  is_unread: boolean;
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
      if (category === 'surveillance') return { icon: 'biteCases', variant: 'danger' };
      return { icon: 'notification', variant: 'info' };
  }
}

export default function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const res = await api.get('/notifications');
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(typeof res.data.unread_count === 'number' ? res.data.unread_count : 0);
      }
    } catch (err) {
      // Silently catch to avoid disrupting workstation UI during background poll
      console.warn('Failed to fetch clinical notifications:', err);
    }
  }, []);

  // Poll notifications periodically and fetch on mount
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // When dropdown is opened, fetch fresh notifications
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

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_unread: false })));
    setUnreadCount(0);

    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      // Re-fetch to synchronize with server state
      fetchNotifications();
    }
  };

  const handleItemClick = async (item: NotificationRecord) => {
    // Optimistic update
    if (item.is_unread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_unread: false } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await api.post(`/notifications/${item.id}/read`);
      } catch (err) {
        console.error(`Failed to mark notification ${item.id} as read:`, err);
      }
    }

    if (item.action_url) {
      setIsOpen(false);
      navigate(item.action_url);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <BellButton
        type="button"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setIsOpen(!isOpen)}
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
              {unreadCount > 0 && (
                <span className="count-chip">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-read"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>
            )}
          </DropdownHeader>

          <NotificationList>
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const visuals = getNotificationVisuals(n.category, n.type);
                return (
                  <NotificationItem
                    key={n.id}
                    isUnread={n.is_unread}
                    onClick={() => handleItemClick(n)}
                  >
                    <NotificationItemIcon
                      iconName={visuals.icon}
                      variant={visuals.variant}
                    >
                      <Icon name={visuals.icon} size={16} />
                    </NotificationItemIcon>
                    <NotificationContent>
                      <NotificationTitle>
                        <span>{n.title}</span>
                        {n.is_active && (
                          <AlertChip variant={visuals.variant === 'danger' ? 'danger' : 'warning'}>
                            Active Alert
                          </AlertChip>
                        )}
                      </NotificationTitle>
                      <NotificationText unread={n.is_unread}>
                        {n.message}
                      </NotificationText>
                      <NotificationMeta>
                        <NotificationTime>{n.time_ago}</NotificationTime>
                        {n.action_url && (
                          <ActionHint>
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
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--bg-secondary, #f3f4f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary, #9ca3af)',
                  }}
                >
                  <Icon name="notification" size={18} />
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-h, #111827)',
                  }}
                >
                  No notifications
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-secondary, #6b7280)',
                    maxWidth: '220px',
                    lineHeight: 1.4,
                  }}
                >
                  You're all caught up with clinic inventory, queue, and surveillance events.
                </div>
              </div>
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
