import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog';

const DEFAULT_DENIED_MESSAGE = 'Access denied. You do not have permission to access this page or perform this action.';

interface AccessDeniedContextValue {
  showAccessDenied: (message?: string) => void;
  closeAccessDenied: () => void;
  isOpen: boolean;
}

const AccessDeniedContext = createContext<AccessDeniedContextValue | undefined>(undefined);

export function AccessDeniedProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_DENIED_MESSAGE);
  const lastTriggeredRef = useRef(0);
  const dismissedInfoRef = useRef<{ message: string; timestamp: number } | null>(null);
  const location = useLocation();

  const showAccessDenied = useCallback((customMessage?: string) => {
    const msg = customMessage || DEFAULT_DENIED_MESSAGE;
    const now = Date.now();
    // Debounce to prevent multiple stacked popups from rapid clicks or concurrent 403 API responses
    if (now - lastTriggeredRef.current < 1200 && isOpen) {
      return;
    }
    // Prevent the same error from reopening continuously after being dismissed by the user
    if (!isOpen && dismissedInfoRef.current && dismissedInfoRef.current.message === msg && (now - dismissedInfoRef.current.timestamp < 10000)) {
      return;
    }
    lastTriggeredRef.current = now;
    setMessage(msg);
    setIsOpen(true);
  }, [isOpen]);

  const closeAccessDenied = useCallback(() => {
    dismissedInfoRef.current = { message, timestamp: Date.now() };
    setIsOpen(false);
  }, [message]);

  // Reset dismissed error suppression when navigating to another route
  useEffect(() => {
    dismissedInfoRef.current = null;
  }, [location.pathname]);

  // Listen to custom window event dispatched by API client interceptor or non-react handlers
  useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      showAccessDenied(customEvent.detail?.message);
    };

    window.addEventListener('app-access-denied', handleEvent);
    return () => {
      window.removeEventListener('app-access-denied', handleEvent);
    };
  }, [showAccessDenied]);

  // Check if current route was redirected from a protected route with accessDenied flag
  useEffect(() => {
    if (location.state && (location.state as any).accessDenied) {
      showAccessDenied();
      // Clean history state so refresh on the authorized route does not re-trigger popup
      window.history.replaceState({ ...(location.state as any), accessDenied: false }, '');
    }
  }, [location.state, showAccessDenied]);

  return (
    <AccessDeniedContext.Provider value={{ showAccessDenied, closeAccessDenied, isOpen }}>
      {children}
      {isOpen && (
        <ConfirmationDialog
          title="Access Denied"
          message={message}
          variant="danger"
          colorVariant="confirm"
          confirmLabel="OK"
          hideCancel={true}
          shakeIcon={true}
          onConfirm={closeAccessDenied}
          onClose={closeAccessDenied}
        />
      )}
    </AccessDeniedContext.Provider>
  );
}

export function useAccessDenied(): AccessDeniedContextValue {
  const context = useContext(AccessDeniedContext);
  if (!context) {
    throw new Error('useAccessDenied must be used within an AccessDeniedProvider');
  }
  return context;
}
