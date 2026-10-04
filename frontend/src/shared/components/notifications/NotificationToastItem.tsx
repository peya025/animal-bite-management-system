import { useState, useEffect, useRef } from 'react';
import type { NotificationRecord } from '../NotificationButton';
import {
  ToastCard,
  ToastIconBox,
  ToastContent,
  ToastHeader,
  ToastTitle,
  ToastCloseBtn,
  ToastMessage,
  ToastFooter,
  ToastTime,
  ToastViewButton,
} from './NotificationToast.styles';
import { Icon, type IconName } from '../ui/Icon';

interface NotificationToastItemProps {
  notification: NotificationRecord;
  canView: boolean;
  onDismiss: (id: number) => void;
  onView: (notification: NotificationRecord) => void;
}

function getToastVisuals(category: string, type: string): {
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

export function NotificationToastItem({
  notification,
  canView,
  onDismiss,
  onView,
}: NotificationToastItemProps) {
  const [isClosing, setIsClosing] = useState(false);
  const visuals = getToastVisuals(notification.category, notification.type);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 250);
  };

  const handleView = () => {
    onView(notification);
    handleClose();
  };

  // 5-second auto-dismiss without marking as read
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const messageText = notification.message || (notification as any).text || '';

  return (
    <ToastCard isClosing={isClosing} variant={visuals.variant}>
      <ToastIconBox variant={visuals.variant}>
        <Icon name={visuals.icon} size={16} />
      </ToastIconBox>
      <ToastContent>
        <ToastHeader>
          <ToastTitle>{notification.title}</ToastTitle>
          <ToastCloseBtn
            type="button"
            onClick={handleClose}
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </ToastCloseBtn>
        </ToastHeader>
        <ToastMessage>{messageText}</ToastMessage>
        <ToastFooter>
          <ToastTime>{notification.time_ago || 'Just now'}</ToastTime>
          {canView && (
            <ToastViewButton type="button" onClick={handleView}>
              View &rarr;
            </ToastViewButton>
          )}
        </ToastFooter>
      </ToastContent>
    </ToastCard>
  );
}
