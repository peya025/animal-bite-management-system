import { ToastContainer } from './NotificationToast.styles';
import { NotificationToastItem } from './NotificationToastItem';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { canUserAccessRoute } from '../../utils/accessControl';

export function NotificationToastContainer() {
  const { activeToasts, dismissToast, handleToastView } = useNotifications();
  const { user } = useAuth();

  if (activeToasts.length === 0) {
    return null;
  }

  return (
    <ToastContainer>
      {activeToasts.map((toast) => {
        const canView = Boolean(
          toast.action_url && canUserAccessRoute(user, toast.action_url)
        );

        return (
          <NotificationToastItem
            key={toast.id}
            notification={toast}
            canView={canView}
            onDismiss={dismissToast}
            onView={handleToastView}
          />
        );
      })}
    </ToastContainer>
  );
}
