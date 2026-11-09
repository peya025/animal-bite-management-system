import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { getGuideModules } from './guideModules';
import type { GuideProgress, WalkthroughContextType } from './types';
import { walkthroughStyles } from './Walkthrough.styles';
import WalkthroughOverlay from './WalkthroughOverlay';

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
  const storageKey = user?.id ? `abtc_guides_v2_${user.id}` : null;
  const [progress, setProgress] = useState<Record<string, GuideProgress>>({});
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [reachedRoute, setReachedRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const activeModule = modules.find(module => module.id === activeModuleId);
  const currentStep = activeModule?.steps[currentStepIndex] || null;

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
    const index = !restart && saved?.status === 'in_progress' && saved.step < module.steps.length ? saved.step : 0;
    setCurrentStepIndex(index);
    setActiveModuleId(id);
    setReachedRoute(location.pathname === module.route);
    saveProgress(id, { status: 'in_progress', step: index });
    if (location.pathname !== module.route) navigate(module.route);
  }, [modules, progress, saveProgress, location.pathname, navigate]);

  const skipGuide = useCallback(() => {
    if (activeModuleId) saveProgress(activeModuleId, { status: 'skipped', step: currentStepIndex });
    setActiveModuleId(null);
  }, [activeModuleId, currentStepIndex, saveProgress]);
  const finishGuide = useCallback(() => {
    if (activeModuleId) saveProgress(activeModuleId, { status: 'completed', step: activeModule?.steps.length || 0 });
    setActiveModuleId(null);
  }, [activeModuleId, activeModule, saveProgress]);
  const goToStep = useCallback((index: number) => {
    if (!activeModule || index < 0 || index >= activeModule.steps.length) return;
    setCurrentStepIndex(index);
    saveProgress(activeModule.id, { status: 'in_progress', step: index });
  }, [activeModule, saveProgress]);
  const nextStep = useCallback(() => {
    if (!activeModule) return;
    if (currentStepIndex + 1 === activeModule.steps.length) finishGuide();
    else goToStep(currentStepIndex + 1);
  }, [activeModule, currentStepIndex, finishGuide, goToStep]);
  const prevStep = useCallback(() => goToStep(currentStepIndex - 1), [goToStep, currentStepIndex]);

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
      const timer = window.setTimeout(() => {
        const tab = document.querySelector<HTMLElement>(selector);
        if (tab && !tab.classList.contains('pm-tab-btn--active') && tab.getAttribute('aria-selected') !== 'true') tab.click();
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [currentStep, activeModule, location.pathname, navigate, reachedRoute, skipGuide]);

  const value = useMemo<WalkthroughContextType>(() => ({
    isActive: !!activeModule, isWelcomeModalOpen: false, currentStepIndex, currentStep,
    totalSteps: activeModule?.steps.length || 0, isRegistrationStaff: user?.role === 'registration',
    modules, activeModuleId, progress, startGuide, skipGuide, finishGuide,
    startWalkthrough: () => startGuide(location.pathname), stopWalkthrough: skipGuide,
    nextStep, prevStep, goToStep, dismissWelcomeModal: noop,
    restartWalkthrough: () => startGuide(location.pathname, true),
  }), [activeModule, currentStepIndex, currentStep, user?.role, modules, activeModuleId, progress,
    startGuide, skipGuide, finishGuide, nextStep, prevStep, goToStep, location.pathname]);

  return <WalkthroughContext.Provider value={value}>
    {children}
    {activeModule && currentStep && <WalkthroughOverlay key={`${activeModule.id}-${currentStep.id}`}
      step={currentStep} moduleName={activeModule.name} currentStepIndex={currentStepIndex} totalSteps={activeModule.steps.length}
      onNext={nextStep} onPrev={prevStep} onSkip={skipGuide} onFinish={finishGuide} />}
  </WalkthroughContext.Provider>;
};

export const useWalkthrough = () => useContext(WalkthroughContext);
export default WalkthroughContext;
