import { useState, useRef, useEffect } from 'react';
import {
  BellButton,
  NotificationDot,
  NotificationDropdown,
  DropdownHeader,
  NotificationList,
  NotificationItem,
  NotificationItemIcon,
  NotificationContent,
  NotificationText,
  NotificationTime,
  DropdownFooter,
} from './NotificationButton.styles';
import { Icon } from './ui/Icon';

export default function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sample notifications state
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: 'New patient registered in queue (Triage).',
      time: '5 mins ago',
      isUnread: true,
      icon: 'patients',
    },
    {
      id: 2,
      text: 'Vaccine Inventory Alert: Rabipur stock is running low.',
      time: '1 hour ago',
      isUnread: true,
      icon: 'warning',
    },
    {
      id: 3,
      text: 'Reminder: 5 pending vaccinations scheduled for today.',
      time: '3 hours ago',
      isUnread: false,
      icon: 'calendar',
    },
  ]);

  const hasUnread = notifications.some((n) => n.isUnread);

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

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const handleItemClick = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n)));
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <BellButton
        type="button"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setIsOpen(!isOpen)}
      >
        {hasUnread && <NotificationDot />}
        <Icon name="notification" size={19} />
      </BellButton>

      {isOpen && (
        <NotificationDropdown>
          <DropdownHeader>
            <h3>Notifications</h3>
            {hasUnread && (
              <button className="mark-read" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </DropdownHeader>
          <NotificationList>
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  isUnread={n.isUnread}
                  onClick={() => handleItemClick(n.id)}
                >
                  <NotificationItemIcon iconName={n.icon}>
                    <Icon name={n.icon as any} size={15} />
                  </NotificationItemIcon>
                  <NotificationContent>
                    <NotificationText unread={n.isUnread}>{n.text}</NotificationText>
                    <NotificationTime>{n.time}</NotificationTime>
                  </NotificationContent>
                </NotificationItem>
              ))
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                No notifications
              </div>
            )}
          </NotificationList>
          <DropdownFooter onClick={() => setIsOpen(false)}>
            Close
          </DropdownFooter>
        </NotificationDropdown>
      )}
    </div>
  );
}
