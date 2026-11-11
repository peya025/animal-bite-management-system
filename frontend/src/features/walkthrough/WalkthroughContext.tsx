import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { ROUTES } from '../../shared/config/routes';
import { getGuideModules } from './guideModules';
import type { GuideProgress, WalkthroughContextType } from './types';
import { walkthroughStyles } from './Walkthrough.styles';
import WalkthroughOverlay from './WalkthroughOverlay';
import WalkthroughWelcomeModal from './WalkthroughWelcomeModal';
import WalkthroughCompletionModal from './WalkthroughCompletionModal';
import { availablePatientActions, expandPatientSteps } from './patientRegistrationWalkthroughSteps';
import { getDashboardModuleInfoForRole } from './dashboardWalkthroughSteps';

const noop = () => {};
export const defaultWalkthroughContext: WalkthroughContextType = {
  isActive: false, isWelcomeModalOpen: false, currentStepIndex: 0, currentStep: null,
  totalSteps: 0, isRegistrationStaff: false, modules: [], activeModuleId: null, progress: {},
  startGuide: noop, skipGuide: noop, finishGuide: noop,
  startWalkthrough: noop, stopWalkthrough: noop, nextStep: noop, prevStep: noop,
  goToStep: noop, dismissWelcomeModal: noop, restartWalkthrough: noop,
};
const WalkthroughContext = createContext<WalkthroughContextType>(defaultWalkthroughContext);

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const modules = useMemo(() => getGuideModules(user?.role), [user?.role]);
  const storageKey = user?.id ? `abtc_guides_v3_${user.id}` : null;
  const [progress, setProgress] = useState<Record<string, GuideProgress>>({});
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [reachedRoute, setReachedRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepReady, setStepReady] = useState(true);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  const baseModule = modules.find(module => module.id === activeModuleId);
  const tabActions = activeModuleId ? progress[activeModuleId]?.tabActions : undefined;
  const activeModule = useMemo(() => baseModule ? { ...baseModule, steps: expandPatientSteps(baseModule.steps, tabActions) } : undefined, [baseModule, tabActions]);
  const currentStep = activeModule?.steps[currentStepIndex] || null;

  const dashboardModule = useMemo(() => modules.find(m => m.id === ROUTES.DASHBOARD || m.route === ROUTES.DASHBOARD), [modules]);

  useEffect(() => {
    let style = document.getElementById('abtc-walkthrough-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'abtc-walkthrough-styles';
      document.head.appendChild(style);
    }
    style.textContent = walkthroughStyles;
  }, []);

  useEffect(() => {
    setActiveModuleId(null);
    setCurrentStepIndex(0);
    if (!storageKey) { setProgress({}); return; }
    try { setProgress(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
    catch { setProgress({}); }
  }, [storageKey]);

  // First-time visit to /dashboard shows the Welcome Modal
  useEffect(() => {
    if (!user?.id) return;
    const isDashboard = location.pathname === ROUTES.DASHBOARD || location.pathname === '/' || location.pathname.includes('/walkthrough.html');
    if (!isDashboard) {
      setIsWelcomeModalOpen(false);
      return;
    }

    const isCompletedOrSkipped =
      progress[ROUTES.DASHBOARD]?.status === 'completed' ||
      progress[ROUTES.DASHBOARD]?.status === 'skipped' ||
      localStorage.getItem(`abtc_walkthrough_status_${user.id}`) === 'completed' ||
      localStorage.getItem(`abtc_walkthrough_status_admin_${user.id}`) === 'completed' ||
      localStorage.getItem(`abtc_walkthrough_registration_seen_v1_${user.id}`) === 'true';

    if (!isCompletedOrSkipped && !activeModuleId) {
      setIsWelcomeModalOpen(true);
    }
  }, [user?.id, location.pathname, progress, activeModuleId]);

  const saveProgress = useCallback((id: string, value: GuideProgress) => {
    setProgress(previous => {
      const next = { ...previous, [id]: value };
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const startGuide = useCallback((id: string, restart = false) => {
    const module = modules.find(item => item.id === id);
    if (!module?.steps.length) return;
    const saved = progress[id];
    let index = !restart && saved?.status === 'in_progress' && saved.step < module.steps.length ? saved.step : 0;

    // When starting or restarting a guide while already on a sub-route/station of the module:
    if (restart || !saved || saved.status !== 'in_progress') {
      const currentRouteIndex = module.steps.findIndex(step => step.route === location.pathname);
      if (currentRouteIndex > 0) {
        index = currentRouteIndex;
      }
    }

    const targetStep = module.steps[index];
    const stepRoute = targetStep?.route || module.route;
    setCurrentStepIndex(index);
    setActiveModuleId(id);
    setIsWelcomeModalOpen(false);
    setIsCompletionModalOpen(false);

    // Reset scroll to top before highlighting the first element
    window.scrollTo({ top: 0, behavior: 'auto' });
    const pageContent = document.querySelector<HTMLElement>('.page-content');
    if (pageContent) pageContent.scrollTop = 0;

    const matchesCurrent = location.pathname === stepRoute;
    setReachedRoute(matchesCurrent);
    saveProgress(id, { status: 'in_progress', step: index, tabActions: saved?.tabActions });
    if (!matchesCurrent) navigate(stepRoute);
  }, [modules, progress, saveProgress, location.pathname, navigate]);

  const skipGuide = useCallback(() => {
    if (activeModuleId) {
      saveProgress(activeModuleId, { status: 'skipped', step: currentStepIndex, tabActions });
      if (user?.id) {
        localStorage.setItem(`abtc_walkthrough_status_${user.id}`, 'skipped');
        localStorage.setItem(`abtc_walkthrough_status_admin_${user.id}`, 'skipped');
      }
    }
    setActiveModuleId(null);
  }, [activeModuleId, currentStepIndex, saveProgress, tabActions, user?.id]);

  const finishGuide = useCallback(() => {
    if (activeModuleId) {
      const isDashboard = activeModuleId === ROUTES.DASHBOARD;
      saveProgress(activeModuleId, { status: 'completed', step: activeModule?.steps.length || 0, tabActions });
      if (user?.id) {
        localStorage.setItem(`abtc_walkthrough_status_${user.id}`, 'completed');
        localStorage.setItem(`abtc_walkthrough_status_admin_${user.id}`, 'completed');
      }
      setActiveModuleId(null);
      if (isDashboard) {
        setIsCompletionModalOpen(true);
      }
    }
  }, [activeModuleId, activeModule, saveProgress, tabActions, user?.id]);

  const goToStep = useCallback((index: number) => {
    if (!activeModule || index < 0 || index >= activeModule.steps.length) return;
    const targetStep = activeModule.steps[index];
    setCurrentStepIndex(index);
    if (targetStep && targetStep.route !== location.pathname) {
      setReachedRoute(false);
      navigate(targetStep.route);
    }
    saveProgress(activeModule.id, { status: 'in_progress', step: index, tabActions });
  }, [activeModule, saveProgress, tabActions, location.pathname, navigate]);

  const nextStep = useCallback(() => {
    if (!activeModule) return;
    if (currentStepIndex + 1 === activeModule.steps.length) finishGuide();
    else goToStep(currentStepIndex + 1);
  }, [activeModule, currentStepIndex, finishGuide, goToStep]);

  const prevStep = useCallback(() => goToStep(currentStepIndex - 1), [goToStep, currentStepIndex]);

  const dismissWelcomeModal = useCallback(() => {
    setIsWelcomeModalOpen(false);
    saveProgress(ROUTES.DASHBOARD, { status: 'skipped', step: 0 });
    if (user?.id) {
      localStorage.setItem(`abtc_walkthrough_status_${user.id}`, 'skipped');
      localStorage.setItem(`abtc_walkthrough_status_admin_${user.id}`, 'skipped');
    }
  }, [saveProgress, user?.id]);

  useEffect(() => {
    if (!currentStep || !activeModule) return;
    if (location.pathname !== currentStep.route) {
      if (reachedRoute) skipGuide();
      else navigate(currentStep.route);
      return;
    }
    if (!reachedRoute) setReachedRoute(true);
    if (currentStep.activateSelector) {
      const selector = currentStep.activateSelector;
      const tab = document.querySelector<HTMLElement>(selector);
      if (tab && !tab.classList.contains('sd-dash-tab--active') && !tab.classList.contains('pm-tab-btn--active') && tab.getAttribute('aria-selected') !== 'true') {
        tab.click();
      }
    }
    if (currentStep.tabKey && !currentStep.actionStep && activeModuleId) {
      setStepReady(false);
      const timer = window.setTimeout(() => {
        const discovered = availablePatientActions(currentStep);
        if (discovered.length) {
          setProgress(prev => {
            const currentTabActions = prev[activeModuleId]?.tabActions || {};
            const nextTabActions = { ...currentTabActions, [currentStep.id]: discovered };
            const nextProg = { ...prev, [activeModuleId]: { ...prev[activeModuleId], status: 'in_progress' as const, step: currentStepIndex, tabActions: nextTabActions } };
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(nextProg));
            return nextProg;
          });
        }
        setStepReady(true);
      }, 50);
      return () => window.clearTimeout(timer);
    } else {
      setStepReady(true);
    }
  }, [currentStep, activeModule, location.pathname, navigate, reachedRoute, skipGuide, activeModuleId, storageKey, currentStepIndex]);

  const value = useMemo<WalkthroughContextType>(() => ({
    isActive: !!activeModule, isWelcomeModalOpen, currentStepIndex, currentStep,
    totalSteps: activeModule?.steps.length || 0, isRegistrationStaff: user?.role === 'registration',
    modules, activeModuleId, progress, startGuide, skipGuide, finishGuide,
    startWalkthrough: () => startGuide(ROUTES.DASHBOARD, true), stopWalkthrough: skipGuide,
    nextStep, prevStep, goToStep, dismissWelcomeModal,
    restartWalkthrough: () => startGuide(ROUTES.DASHBOARD, true),
  }), [activeModule, isWelcomeModalOpen, currentStepIndex, currentStep, user?.role, modules, activeModuleId, progress,
    startGuide, skipGuide, finishGuide, nextStep, prevStep, goToStep, dismissWelcomeModal]);

  const roleLabel = user?.role === 'admin' ? 'Administrator'
    : user?.role === 'registration' ? 'Registration Staff'
    : user?.role === 'treatment' ? 'Treatment Nurse'
    : user?.role === 'triage' ? 'Triage Doctor' : '';

  return (
    <WalkthroughContext.Provider value={value}>
      {children}

      {/* First-time Welcome Modal */}
      <WalkthroughWelcomeModal
        open={isWelcomeModalOpen}
        roleName={getDashboardModuleInfoForRole(user?.role).name}
        totalSteps={dashboardModule?.steps.length || 0}
        onStart={() => {
          setIsWelcomeModalOpen(false);
          startGuide(ROUTES.DASHBOARD, true);
        }}
        onDismiss={dismissWelcomeModal}
      />

      {/* Active Walkthrough Step Spotlight & Tooltip Overlay */}
      {activeModule && currentStep && stepReady && (
        <WalkthroughOverlay
          key={`${activeModule.id}-${currentStep.id}`}
          step={currentStep}
          moduleName={activeModule.name}
          currentStepIndex={currentStepIndex}
          totalSteps={activeModule.steps.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipGuide}
          onFinish={finishGuide}
        />
      )}

      {/* Completion Modal */}
      <WalkthroughCompletionModal
        open={isCompletionModalOpen}
        onFinish={() => setIsCompletionModalOpen(false)}
      />
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => useContext(WalkthroughContext);
export default WalkthroughContext;
