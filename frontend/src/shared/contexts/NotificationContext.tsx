import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useAccessDenied } from './AccessDeniedContext';
import { useEcho } from '../hooks/useEcho';
import {
  canUserAccessRoute,
  isNotificationRelevantToUser,
  NOTIFICATION_POLL_INTERVAL_MS,
} from '../utils/accessControl';
import type { NotificationRecord } from '../components/NotificationButton';
import { NotificationToastContainer } from '../components/notifications/NotificationToastContainer';
import { resolveNotificationDestination } from '../utils/notificationNavigation';

interface NotificationContextValue {
  notifications: NotificationRecord[];
  unreadCount: number;
  activeToasts: NotificationRecord[];
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: (id: number) => void;
  handleToastView: (notification: NotificationRecord) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token, clinic } = useAuth();
  const { showAccessDenied } = useAccessDenied();
  const navigate = useNavigate();
  const { echo, isConnected } = useEcho();
  const clinicId = clinic?.id ?? user?.clinic_id ?? null;

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeToasts, setActiveToasts] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Track seen notification IDs to prevent replaying historical notifications
  const seenNotificationIds = useRef<Set<number>>(new Set());
  const hasInitializedRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnectedRef = useRef<boolean>(false);

  // Hydrate seen notification IDs from sessionStorage scoped to the current user
  useEffect(() => {
    if (!user?.id) {
      seenNotificationIds.current = new Set();
      hasInitializedRef.current = false;
      currentUserIdRef.current = null;
      setActiveToasts([]);
      return;
    }

    if (currentUserIdRef.current !== user.id) {
      currentUserIdRef.current = user.id;
      hasInitializedRef.current = false;
      const stored = sessionStorage.getItem(`seen_notifs_user_${user.id}`);
      if (stored) {
        try {
          const ids: number[] = JSON.parse(stored);
          seenNotificationIds.current = new Set(ids);
        } catch {
          seenNotificationIds.current = new Set();
        }
      } else {
        seenNotificationIds.current = new Set();
      }
    }
  }, [user?.id]);

  const saveSeenIdsToStorage = useCallback(() => {
    if (!user?.id) return;
    try {
      const arr = Array.from(seenNotificationIds.current).slice(-200);
      sessionStorage.setItem(`seen_notifs_user_${user.id}`, JSON.stringify(arr));
    } catch {
      // Ignore quota errors
    }
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    const activeToken = token || localStorage.getItem('authToken');
    if (!activeToken || !user) return;

    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data) {
        const fetchedList: NotificationRecord[] = res.data.notifications || [];
        const count = typeof res.data.unread_count === 'number' ? res.data.unread_count : 0;

        setNotifications(fetchedList);
        setUnreadCount(count);

        if (!hasInitializedRef.current) {
          // Baseline seed on first fetch: mark all existing historical notifications as seen
          fetchedList.forEach((n) => seenNotificationIds.current.add(n.id));
          saveSeenIdsToStorage();
          hasInitializedRef.current = true;
        } else {
          // Identify newly arrived notifications that are unread and relevant to user
          const newArrivals = fetchedList.filter((n) => {
            const isUnseen = !seenNotificationIds.current.has(n.id);
            const isUnread = n.is_unread;
            const isRelevant = isNotificationRelevantToUser(n, user);
            return isUnseen && isUnread && isRelevant;
          });

          if (newArrivals.length > 0) {
            newArrivals.forEach((n) => seenNotificationIds.current.add(n.id));
            saveSeenIdsToStorage();

            // Append new arrivals to active toast queue
            setActiveToasts((prev) => {
              const existingIds = new Set(prev.map((t) => t.id));
              const additions = newArrivals.filter((n) => !existingIds.has(n.id));
              return [...prev, ...additions];
            });
          }
        }
      }
    } catch (err) {
      console.warn('Background notification poll error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user, saveSeenIdsToStorage]);

  const scheduleFetchNotifications = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void fetchNotifications();
      debounceTimerRef.current = null;
    }, 200);
  }, [fetchNotifications]);

  // Reconnection recovery: catch up on any missed notifications
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      void fetchNotifications();
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, fetchNotifications]);

  // Adaptive polling fallback
  useEffect(() => {
    if (!token || !user) return;

    fetchNotifications();

    const pollInterval = isConnected ? 30_000 : NOTIFICATION_POLL_INTERVAL_MS;
    const interval = setInterval(fetchNotifications, pollInterval);

    const handleFocus = () => {
      fetchNotifications();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [token, user, isConnected, fetchNotifications]);

  // WebSocket subscriptions for clinic-wide and user-targeted notifications
  useEffect(() => {
    if (!echo || !clinicId || !user?.id) return;

    const clinicChannelName = `clinic.${clinicId}.notifications`;
    const userChannelName = `clinic.${clinicId}.user.${user.id}.notifications`;

    let clinicChannel: any;
    let userChannel: any;

    const handleNotificationEvent = (payload: any) => {
      // Respect user-specific and role filters
      if (payload && !isNotificationRelevantToUser(payload, user)) {
        return;
      }
      scheduleFetchNotifications();
    };

    try {
      clinicChannel = echo.private(clinicChannelName);
      clinicChannel.listen('.notification.created', handleNotificationEvent);

      userChannel = echo.private(userChannelName);
      userChannel.listen('.notification.created', handleNotificationEvent);
    } catch (err) {
      console.warn('[Echo] Failed to subscribe to notification channels:', err);
    }

    return () => {
      if (clinicChannel) {
        try {
          clinicChannel.stopListening('.notification.created', handleNotificationEvent);
        } catch {}
      }
      if (userChannel) {
        try {
          userChannel.stopListening('.notification.created', handleNotificationEvent);
        } catch {}
      }
    };
  }, [echo, clinicId, user?.id, scheduleFetchNotifications]);

  const dismissToast = useCallback((id: number) => {
    // Auto-dismiss or close button click: Remove toast without marking it as read
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_unread: false, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    dismissToast(id);

    try {
      await api.post(`/notifications/${id}/read`);
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  }, [dismissToast]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_unread: false, is_read: true })));
    setUnreadCount(0);
    setActiveToasts([]);

    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const handleToastView = useCallback((notification: NotificationRecord) => {
    markAsRead(notification.id);

    const targetUrl = resolveNotificationDestination(notification, user);

    if (targetUrl) {
      if (canUserAccessRoute(user, targetUrl)) {
        navigate(targetUrl, {
          state: { deliberateClickToken: `${notification.id || notification.type}-${Date.now()}` },
        });
      } else {
        showAccessDenied();
      }
    }
  }, [markAsRead, user, navigate, showAccessDenied]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    activeToasts,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissToast,
    handleToastView,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToastContainer />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
