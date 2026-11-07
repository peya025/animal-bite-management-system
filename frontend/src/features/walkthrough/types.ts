export type WalkthroughPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type WalkthroughModule =
  | 'Dashboard'
  | 'Patient Registration'
  | 'Patient Queue'
  | 'Bite Cases Summary'
  | 'Bite Map'
  | 'Reports & Analytics'
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
  route: string;
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  content: string;
  placement: WalkthroughPlacement;
}

export interface WalkthroughContextType {
  isActive: boolean;
  isWelcomeModalOpen: boolean;
  currentStepIndex: number;
  currentStep: WalkthroughStep | null;
  totalSteps: number;
  isRegistrationStaff: boolean;
  startWalkthrough: () => void;
  stopWalkthrough: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  dismissWelcomeModal: () => void;
  restartWalkthrough: () => void;
}
