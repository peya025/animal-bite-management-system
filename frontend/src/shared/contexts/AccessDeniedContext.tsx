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
  const location = useLocation();

  const showAccessDenied = useCallback((customMessage?: string) => {
    const now = Date.now();
    // Debounce to prevent multiple stacked popups from rapid clicks or concurrent 403 API responses
    if (now - lastTriggeredRef.current < 1200 && isOpen) {
      return;
    }
    lastTriggeredRef.current = now;
    setMessage(customMessage || DEFAULT_DENIED_MESSAGE);
    setIsOpen(true);
  }, [isOpen]);

  const closeAccessDenied = useCallback(() => {
    setIsOpen(false);
  }, []);

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
