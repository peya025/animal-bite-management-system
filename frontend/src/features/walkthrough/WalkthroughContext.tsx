import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import type { WalkthroughContextType, WalkthroughStep } from './types';
import { WALKTHROUGH_STEPS } from './walkthroughSteps';
import { walkthroughStyles } from './Walkthrough.styles';
import WalkthroughOverlay from './WalkthroughOverlay';
import WalkthroughWelcomeModal from './WalkthroughWelcomeModal';

export const defaultWalkthroughContext: WalkthroughContextType = {
  isActive: false,
  isWelcomeModalOpen: false,
  currentStepIndex: 0,
  currentStep: null,
  totalSteps: WALKTHROUGH_STEPS.length,
  isRegistrationStaff: false,
  startWalkthrough: () => {},
  stopWalkthrough: () => {},
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
  dismissWelcomeModal: () => {},
  restartWalkthrough: () => {},
};

const WalkthroughContext = createContext<WalkthroughContextType>(defaultWalkthroughContext);

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isRegistrationStaff = Boolean(user && user.role === 'registration');
  const userId = user?.id;

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  // Storage key specific to user account
  const storageKey = userId ? `abtc_walkthrough_status_${userId}` : null;
  const legacySeenKey = userId ? `abtc_walkthrough_registration_seen_v1_${userId}` : null;
  const stepKey = userId ? `abtc_walkthrough_registration_step_v1_${userId}` : null;

  // Inject scoped styles
  useEffect(() => {
    let styleEl = document.getElementById('abtc-walkthrough-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'abtc-walkthrough-styles';
      styleEl.textContent = walkthroughStyles;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Check first-time login for Registration Staff
  useEffect(() => {
    if (!isRegistrationStaff || !storageKey) {
      setIsWelcomeModalOpen(false);
      setIsActive(false);
      return;
    }

    const savedStatus = localStorage.getItem(storageKey) || (legacySeenKey ? localStorage.getItem(legacySeenKey) : null);
    // If no record exists, user is accessing the system for the first time
    if (!savedStatus) {
      setIsWelcomeModalOpen(true);
    }
  }, [isRegistrationStaff, storageKey, legacySeenKey]);

  const currentStep: WalkthroughStep | null = useMemo(() => {
    if (!isActive) return null;
    return WALKTHROUGH_STEPS[currentStepIndex] || null;
  }, [isActive, currentStepIndex]);

  // Navigate when step route differs from current path
  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
  }, [isActive, currentStep, location.pathname, navigate]);

  const startWalkthrough = useCallback(() => {
    if (!isRegistrationStaff) return;
    setIsWelcomeModalOpen(false);
    const savedIdxRaw = stepKey ? localStorage.getItem(stepKey) : null;
    const savedIdx = savedIdxRaw !== null ? parseInt(savedIdxRaw, 10) : 0;
    const initialIdx = !isNaN(savedIdx) && savedIdx >= 0 && savedIdx < WALKTHROUGH_STEPS.length ? savedIdx : 0;
    setCurrentStepIndex(initialIdx);
    setIsActive(true);

    if (storageKey) {
      localStorage.setItem(storageKey, 'in_progress');
    }
    if (legacySeenKey) {
      localStorage.setItem(legacySeenKey, 'true');
    }

    const targetRoute = WALKTHROUGH_STEPS[initialIdx].route;
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  }, [isRegistrationStaff, storageKey, legacySeenKey, stepKey, location.pathname, navigate]);

  const stopWalkthrough = useCallback(() => {
    setIsActive(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'completed');
    }
    if (legacySeenKey) {
      localStorage.setItem(legacySeenKey, 'true');
    }
    if (stepKey) {
      localStorage.removeItem(stepKey);
    }
  }, [storageKey, legacySeenKey, stepKey]);

  const dismissWelcomeModal = useCallback(() => {
    setIsWelcomeModalOpen(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'dismissed');
    }
    if (legacySeenKey) {
      localStorage.setItem(legacySeenKey, 'true');
    }
  }, [storageKey, legacySeenKey]);

  const restartWalkthrough = useCallback(() => {
    if (!isRegistrationStaff) return;
    setIsWelcomeModalOpen(false);
    const savedIdxRaw = stepKey ? localStorage.getItem(stepKey) : null;
    const savedIdx = savedIdxRaw !== null ? parseInt(savedIdxRaw, 10) : 0;
    const initialIdx = !isNaN(savedIdx) && savedIdx >= 0 && savedIdx < WALKTHROUGH_STEPS.length ? savedIdx : 0;
    setCurrentStepIndex(initialIdx);
    setIsActive(true);

    const targetRoute = WALKTHROUGH_STEPS[initialIdx].route;
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  }, [isRegistrationStaff, stepKey, location.pathname, navigate]);

  const nextStep = useCallback(() => {
    if (!isActive) return;
    if (currentStepIndex < WALKTHROUGH_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStepObj = WALKTHROUGH_STEPS[nextIndex];
      setCurrentStepIndex(nextIndex);
      if (stepKey) {
        localStorage.setItem(stepKey, String(nextIndex));
      }

      if (nextStepObj.route !== location.pathname) {
        navigate(nextStepObj.route);
      }
    } else {
      // Completed all steps
      stopWalkthrough();
    }
  }, [isActive, currentStepIndex, stepKey, location.pathname, navigate, stopWalkthrough]);

  const prevStep = useCallback(() => {
    if (!isActive || currentStepIndex <= 0) return;
    const prevIndex = currentStepIndex - 1;
    const prevStepObj = WALKTHROUGH_STEPS[prevIndex];
    setCurrentStepIndex(prevIndex);
    if (stepKey) {
      localStorage.setItem(stepKey, String(prevIndex));
    }

    if (prevStepObj.route !== location.pathname) {
      navigate(prevStepObj.route);
    }
  }, [isActive, currentStepIndex, stepKey, location.pathname, navigate]);

  const goToStep = useCallback((index: number) => {
    if (!isActive || index < 0 || index >= WALKTHROUGH_STEPS.length) return;
    const targetStep = WALKTHROUGH_STEPS[index];
    setCurrentStepIndex(index);

    if (targetStep.route !== location.pathname) {
      navigate(targetStep.route);
    }
  }, [isActive, location.pathname, navigate]);

  const value = useMemo(
    () => ({
      isActive,
      isWelcomeModalOpen,
      currentStepIndex,
      currentStep,
      totalSteps: WALKTHROUGH_STEPS.length,
      isRegistrationStaff,
      startWalkthrough,
      stopWalkthrough,
      nextStep,
      prevStep,
      goToStep,
      dismissWelcomeModal,
      restartWalkthrough,
    }),
    [
      isActive,
      isWelcomeModalOpen,
      currentStepIndex,
      currentStep,
      isRegistrationStaff,
      startWalkthrough,
      stopWalkthrough,
      nextStep,
      prevStep,
      goToStep,
      dismissWelcomeModal,
      restartWalkthrough,
    ]
  );

  return (
    <WalkthroughContext.Provider value={value}>
      {children}

      {/* Render First-Time Login Welcome Modal */}
      {isRegistrationStaff && isWelcomeModalOpen && (
        <WalkthroughWelcomeModal
          open={isWelcomeModalOpen}
          onStart={startWalkthrough}
          onDismiss={dismissWelcomeModal}
        />
      )}

      {/* Render Active Step Overlay & Tooltip */}
      {isRegistrationStaff && isActive && currentStep && (
        <WalkthroughOverlay
          step={currentStep}
          currentStepIndex={currentStepIndex}
          totalSteps={WALKTHROUGH_STEPS.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={stopWalkthrough}
        />
      )}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  return context || defaultWalkthroughContext;
};

export default WalkthroughContext;
