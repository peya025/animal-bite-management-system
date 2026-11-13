export type WalkthroughPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type WalkthroughModule =
  | 'Dashboard'
  | 'Patient Registration'
  | 'Patient Queue'
  | 'Treatment Queues'
  | 'Patient List'
  | 'Bite Cases Summary'
  | 'Bite Map'
  | 'Vaccine Stock Management'
  | 'Vaccination Schedule'
  | 'Reports & Analytics'
  | 'User Management'
  | 'Clinic Setup'
  | 'Developer Tools'
  | 'Account'
  | 'dashboard'
  | 'patients'
  | 'queue'
  | 'bite-cases'
  | 'bitemap'
  | 'reports';

export interface WalkthroughStep {
  id: string;
  module: WalkthroughModule;
  section?: string;
  route: string;
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  content: string;
  placement: WalkthroughPlacement;
  activateSelector?: string;
  tabKey?: string;
  actions?: WalkthroughStep[];
  actionStep?: boolean;
}

export interface GuideModule {
  id: string;
  name: string;
  description: string;
  route: string;
  steps: WalkthroughStep[];
}

export interface GuideProgress {
  status: 'in_progress' | 'completed' | 'skipped';
  step: number;
  tabActions?: Record<string, string[]>;
}

export interface WalkthroughContextType {
  isActive: boolean;
  isWelcomeModalOpen: boolean;
  currentStepIndex: number;
  currentStep: WalkthroughStep | null;
  totalSteps: number;
  isRegistrationStaff: boolean;
  modules: GuideModule[];
  activeModuleId: string | null;
  progress: Record<string, GuideProgress>;
  startGuide: (moduleId: string, restart?: boolean) => void;
  skipGuide: () => void;
  finishGuide: () => void;
  startWalkthrough: () => void;
  stopWalkthrough: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  dismissWelcomeModal: () => void;
  restartWalkthrough: () => void;
}
