import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { ROUTES } from '../../shared/config/routes';
import { getGuideModules } from './guideModules';
import type { GuideProgress, WalkthroughContextType } from './types';
import { walkthroughStyles } from './Walkthrough.styles';
import WalkthroughOverlay from './WalkthroughOverlay';
import WalkthroughWelcomeModal from './WalkthroughWelcomeModal';
import WalkthroughCompletionModal from './WalkthroughCompletionModal';
import { getDashboardModuleInfoForRole, getDashboardStepsForRole } from './dashboardWalkthroughSteps';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if this is the very first time this user ID has been seen on
 * this browser. We store a persistent set of known user IDs separately from
 * walkthrough progress so that clearing progress data doesn't re-trigger the
 * welcome modal for existing accounts.
 */
function isFirstTimeUser(userId: number | string): boolean {
  try {
    const raw = localStorage.getItem('abtc_known_users') || '[]';
    const knownUsers: (number | string)[] = JSON.parse(raw);
    return !knownUsers.includes(userId);
  } catch {
    return false;
  }
}

/** Mark a user ID as known (seen before) so they won't get the auto-welcome again. */
function markUserAsKnown(userId: number | string): void {
  try {
    const raw = localStorage.getItem('abtc_known_users') || '[]';
    const knownUsers: (number | string)[] = JSON.parse(raw);
    if (!knownUsers.includes(userId)) {
      knownUsers.push(userId);
      localStorage.setItem('abtc_known_users', JSON.stringify(knownUsers));
    }
  } catch { /* ignore */ }
}

// ─── Context defaults ─────────────────────────────────────────────────────────

const noop = () => {};
export const defaultWalkthroughContext: WalkthroughContextType = {
  isActive: false, isWelcomeModalOpen: false, currentStepIndex: 0, currentStep: null,
  totalSteps: 0, isRegistrationStaff: false, modules: [], activeModuleId: null, progress: {},
  startGuide: noop, skipGuide: noop, finishGuide: noop,
  startWalkthrough: noop, stopWalkthrough: noop, nextStep: noop, prevStep: noop,
  goToStep: noop, dismissWelcomeModal: noop, openWelcomeModal: noop, restartWalkthrough: noop,
};
const WalkthroughContext = createContext<WalkthroughContextType>(defaultWalkthroughContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const modules = useMemo(() => getGuideModules(user?.role), [user?.role]);

  // Per-user progress storage key (v3)
  const storageKey = user?.id ? `abtc_guides_v3_${user.id}` : null;

  const [progress, setProgress] = useState<Record<string, GuideProgress>>({});
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [reachedRoute, setReachedRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // welcomeModuleId tracks WHICH module the Welcome modal represents
  const [welcomeModuleId, setWelcomeModuleId] = useState<string>(ROUTES.DASHBOARD);

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completedModuleName, setCompletedModuleName] = useState<string>('Dashboard');

  // Track whether we've already attempted new-account auto-open for this session
  const autoWelcomeAttemptedRef = useRef(false);

  const activeModule = useMemo(() => modules.find(module => module.id === activeModuleId), [modules, activeModuleId]);
  const currentStep = activeModule?.steps[currentStepIndex] || null;
  const dashboardModule = useMemo(() => modules.find(m => m.id === ROUTES.DASHBOARD || m.route === ROUTES.DASHBOARD), [modules]);

  // ── Inject walkthrough CSS once ─────────────────────────────────────────────
  useEffect(() => {
    let style = document.getElementById('abtc-walkthrough-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'abtc-walkthrough-styles';
      document.head.appendChild(style);
    }
    style.textContent = walkthroughStyles;
  }, []);

  // ── Load persisted progress when user changes ────────────────────────────────
  useEffect(() => {
    setActiveModuleId(null);
    setCurrentStepIndex(0);
    setIsWelcomeModalOpen(false);
    autoWelcomeAttemptedRef.current = false;

    if (!storageKey) { setProgress({}); return; }
    try { setProgress(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
    catch { setProgress({}); }
  }, [storageKey]);

  // ── Clean up any legacy session flags ───────────────────────────────────────
  useEffect(() => {
    try { sessionStorage.removeItem('abtc_show_welcome_on_login'); } catch { /* ignore */ }
  }, []);

  // ── Close welcome modal on navigation to public pages ───────────────────────
  useEffect(() => {
    const isPublic = location.pathname === '/' || location.pathname === ROUTES.HOME || location.pathname === ROUTES.LOGIN;
    if (isPublic) setIsWelcomeModalOpen(false);
  }, [location.pathname]);

  // ── Auto-show Welcome modal for brand-new accounts (first ever login) ────────
  //
  // Triggers once per user ID after progress has loaded, only if:
  //   - The user is on the dashboard
  //   - No progress has been recorded for the dashboard module yet
  //   - This is the first time this user ID has appeared in this browser
  useEffect(() => {
    if (!user?.id || autoWelcomeAttemptedRef.current) return;

    const isPublic = location.pathname === '/' || location.pathname === ROUTES.HOME || location.pathname === ROUTES.LOGIN;
    if (isPublic) return;

    // Only attempt once per login session even if the effect re-runs
    autoWelcomeAttemptedRef.current = true;

    const isNew = isFirstTimeUser(user.id);
    if (!isNew) return; // Existing account — no auto-welcome

    // Mark as known immediately so subsequent logins don't re-trigger
    markUserAsKnown(user.id);

    // Only auto-open if the dashboard module has no prior progress.
    // Read directly from localStorage to get the most current value,
    // since the `progress` state may still be loading when this effect runs.
    let dashboardProgress: GuideProgress | undefined;
    try {
      const stored = localStorage.getItem(`abtc_guides_v3_${user.id}`) || '{}';
      const allProgress: Record<string, GuideProgress> = JSON.parse(stored);
      dashboardProgress = allProgress[ROUTES.DASHBOARD];
    } catch { /* ignore */ }

    const noPriorProgress =
      !dashboardProgress ||
      (dashboardProgress.status === 'skipped' && dashboardProgress.step === 0);

    if (!noPriorProgress) return; // User already interacted with the walkthrough

    // Schedule the auto-open slightly after render so the UI is settled
    const timer = setTimeout(() => {
      setWelcomeModuleId(ROUTES.DASHBOARD);
      setIsWelcomeModalOpen(true);
    }, 800);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, location.pathname]);
  // Note: We intentionally omit `progress` from deps here because we only want
  // this effect to run once after initial load (autoWelcomeAttemptedRef guards it).

  // ── Save progress helper ─────────────────────────────────────────────────────
  const saveProgress = useCallback((id: string, value: GuideProgress) => {
    setProgress(previous => {
      const next = { ...previous, [id]: value };
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  // ── Open Welcome modal (user-initiated) ──────────────────────────────────────
  //
  // The Welcome modal's "Start Tour" button always starts from step 0 (restart=true).
  // For resuming, callers should use startGuide(id, false) directly instead.
  const openWelcomeModal = useCallback((moduleId: string = ROUTES.DASHBOARD) => {
    setWelcomeModuleId(moduleId);
    setIsWelcomeModalOpen(true);
  }, []);

  // ── startGuide: core function that activates a module at the correct step ────
  const startGuide = useCallback((id: string, restart = false) => {
    const module = modules.find(item => item.id === id);
    if (!module?.steps.length) return;

    const saved = progress[id];
    let index = 0;

    if (!restart) {
      // Resume: use saved step if valid
      if (saved && typeof saved.step === 'number' && saved.step > 0 && saved.step < module.steps.length) {
        index = saved.step;
      } else {
        // Fall back to step matching current route
        const currentRouteIndex = module.steps.findIndex(step => step.route === location.pathname);
        if (currentRouteIndex > 0) index = currentRouteIndex;
      }
    }
    // restart=true → index stays 0

    const targetStep = module.steps[index];
    const stepRoute = targetStep?.route || module.route;

    setCurrentStepIndex(index);
    setActiveModuleId(id);
    setIsWelcomeModalOpen(false);
    setIsCompletionModalOpen(false);

    // Scroll to top for a clean start
    window.scrollTo({ top: 0, behavior: 'auto' });
    const pageContent = document.querySelector<HTMLElement>('.page-content');
    if (pageContent) pageContent.scrollTop = 0;

    const matchesCurrent = location.pathname === stepRoute;
    setReachedRoute(matchesCurrent);
    saveProgress(id, { status: 'in_progress', step: index });
    if (!matchesCurrent) navigate(stepRoute);
  }, [modules, progress, saveProgress, location.pathname, navigate]);

  // ── skipGuide: pause/stop the active guide ───────────────────────────────────
  const skipGuide = useCallback(() => {
    if (activeModuleId) {
      saveProgress(activeModuleId, {
        status: currentStepIndex > 0 ? 'in_progress' : 'skipped',
        step: currentStepIndex,
      });
      if (user?.id) {
        localStorage.setItem(`abtc_walkthrough_status_${user.id}`, 'in_progress');
        localStorage.setItem(`abtc_walkthrough_status_admin_${user.id}`, 'in_progress');
      }
    }
    setActiveModuleId(null);
  }, [activeModuleId, currentStepIndex, saveProgress, user?.id]);

  // ── finishGuide: complete the active guide ───────────────────────────────────
  const finishGuide = useCallback(() => {
    if (activeModuleId) {
      const isDashboard = activeModuleId === ROUTES.DASHBOARD;
      saveProgress(activeModuleId, { status: 'completed', step: activeModule?.steps.length || 0 });
      if (user?.id) {
        localStorage.setItem(`abtc_walkthrough_status_${user.id}`, 'completed');
        localStorage.setItem(`abtc_walkthrough_status_admin_${user.id}`, 'completed');
      }
      setCompletedModuleName(isDashboard ? 'Dashboard' : (activeModule?.name || 'Dashboard'));
      setActiveModuleId(null);
      setIsCompletionModalOpen(true);
    }
  }, [activeModuleId, activeModule, saveProgress, user?.id]);

  // ── goToStep / nextStep / prevStep ───────────────────────────────────────────
  const goToStep = useCallback((index: number) => {
    if (!activeModule || index < 0 || index >= activeModule.steps.length) return;
    const targetStep = activeModule.steps[index];
    setCurrentStepIndex(index);
    if (targetStep && targetStep.route !== location.pathname) {
      setReachedRoute(false);
      navigate(targetStep.route);
    }
    saveProgress(activeModule.id, { status: 'in_progress', step: index });
  }, [activeModule, saveProgress, location.pathname, navigate]);

  const nextStep = useCallback(() => {
    if (!activeModule) return;
    if (currentStepIndex + 1 === activeModule.steps.length) finishGuide();
    else goToStep(currentStepIndex + 1);
  }, [activeModule, currentStepIndex, finishGuide, goToStep]);

  const prevStep = useCallback(() => goToStep(currentStepIndex - 1), [goToStep, currentStepIndex]);

  // ── dismissWelcomeModal: user chose "Skip Tour" ──────────────────────────────
  const dismissWelcomeModal = useCallback(() => {
    setIsWelcomeModalOpen(false);
    // Record a skipped status for the specific module that was shown
    const targetId = welcomeModuleId || ROUTES.DASHBOARD;
    saveProgress(targetId, { status: 'skipped', step: 0 });
    if (user?.id) {
      localStorage.setItem(`abtc_walkthrough_status_${user.id}`, 'skipped');
      localStorage.setItem(`abtc_walkthrough_status_admin_${user.id}`, 'skipped');
    }
  }, [welcomeModuleId, saveProgress, user?.id]);

  // ── Route-change guard: keep walkthrough in sync with navigation ─────────────
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
  }, [currentStep, activeModule, location.pathname, navigate, reachedRoute, skipGuide]);

  // ── Context value ─────────────────────────────────────────────────────────────
  const value = useMemo<WalkthroughContextType>(() => ({
    isActive: !!activeModule, isWelcomeModalOpen, currentStepIndex, currentStep,
    totalSteps: activeModule?.steps.length || 0, isRegistrationStaff: user?.role === 'registration',
    modules, activeModuleId, progress, startGuide, skipGuide, finishGuide,
    startWalkthrough: () => startGuide(ROUTES.DASHBOARD, true), stopWalkthrough: skipGuide,
    nextStep, prevStep, goToStep, dismissWelcomeModal, openWelcomeModal,
    restartWalkthrough: () => {
      if (activeModuleId) {
        startGuide(activeModuleId, true);
      } else {
        const currentMod = modules.find(m => m.route === location.pathname || m.steps.some(s => s.route === location.pathname));
        startGuide(currentMod?.id || ROUTES.DASHBOARD, true);
      }
    },
  }), [activeModuleId, activeModule, isWelcomeModalOpen, currentStepIndex, currentStep, user?.role, modules, progress,
    startGuide, skipGuide, finishGuide, nextStep, prevStep, goToStep, dismissWelcomeModal, openWelcomeModal, location.pathname]);

  // ── Derived display values ────────────────────────────────────────────────────
  const welcomeModule = useMemo(() => {
    return modules.find(m => m.id === welcomeModuleId) || dashboardModule || null;
  }, [modules, welcomeModuleId, dashboardModule]);

  const isWelcomeDashboard = welcomeModuleId === ROUTES.DASHBOARD || !welcomeModule || welcomeModule.id === ROUTES.DASHBOARD;
  const isLandingOrPublic = location.pathname === '/' || location.pathname === ROUTES.HOME || location.pathname === ROUTES.LOGIN;

  return (
    <WalkthroughContext.Provider value={value}>
      {children}

      {/* Welcome Modal — shown for new accounts (auto) or via help menu (user-initiated) */}
      <WalkthroughWelcomeModal
        open={isWelcomeModalOpen && !isLandingOrPublic}
        roleName={
          isWelcomeDashboard
            ? getDashboardModuleInfoForRole(user?.role).name
            : (welcomeModule?.name || getDashboardModuleInfoForRole(user?.role).name)
        }
        title={
          isWelcomeDashboard
            ? 'Explore Your Dashboard'
            : (welcomeModule ? `Explore ${welcomeModule.name}` : 'Explore Your Dashboard')
        }
        description={
          isWelcomeDashboard
            ? undefined
            : (welcomeModule?.description || undefined)
        }
        totalSteps={
          isWelcomeDashboard
            ? (dashboardModule?.steps.length || getDashboardStepsForRole(user?.role).length || 15)
            : (welcomeModule?.steps.length || 15)
        }
        onStart={() => {
          setIsWelcomeModalOpen(false);
          // The Welcome modal always starts from step 0 (restart=true).
          // Resume is handled directly via startGuide(id, false) without opening this modal.
          startGuide(welcomeModuleId || ROUTES.DASHBOARD, true);
        }}
        onDismiss={dismissWelcomeModal}
      />

      {/* Active Walkthrough Step Spotlight & Tooltip Overlay */}
      {activeModule && currentStep && !isLandingOrPublic && (
        <WalkthroughOverlay
          key={`${activeModule.id}-${currentStep.id}`}
          step={currentStep}
          moduleName={activeModule.name}
          currentStepIndex={currentStepIndex}
          totalSteps={activeModule.steps.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipGuide}
          onRestart={() => startGuide(activeModule.id, true)}
          onFinish={finishGuide}
        />
      )}

      {/* Completion Modal */}
      <WalkthroughCompletionModal
        open={isCompletionModalOpen && !isLandingOrPublic}
        moduleName={completedModuleName}
        onFinish={() => setIsCompletionModalOpen(false)}
      />
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => useContext(WalkthroughContext);
export default WalkthroughContext;
