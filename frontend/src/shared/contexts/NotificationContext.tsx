import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useAccessDenied } from './AccessDeniedContext';
import {
  canUserAccessRoute,
  isNotificationRelevantToUser,
  NOTIFICATION_POLL_INTERVAL_MS,
} from '../utils/accessControl';
import type { NotificationRecord } from '../components/NotificationButton';
import { NotificationToastContainer } from '../components/notifications/NotificationToastContainer';

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
  const { user, token } = useAuth();
  const { showAccessDenied } = useAccessDenied();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeToasts, setActiveToasts] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Track seen notification IDs to prevent replaying historical notifications
  const seenNotificationIds = useRef<Set<number>>(new Set());
  const hasInitializedRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<number | null>(null);

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

  // Polling loop
  useEffect(() => {
    if (!token || !user) return;

    fetchNotifications();

    const interval = setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL_MS);

    const handleFocus = () => {
      fetchNotifications();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, user, fetchNotifications]);

  const dismissToast = useCallback((id: number) => {
    // Auto-dismiss or close button click: Remove toast without marking it as read
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_unread: false } : n))
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
    setNotifications((prev) => prev.map((n) => ({ ...n, is_unread: false })));
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

    if (notification.action_url) {
      if (canUserAccessRoute(user, notification.action_url)) {
        navigate(notification.action_url);
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
