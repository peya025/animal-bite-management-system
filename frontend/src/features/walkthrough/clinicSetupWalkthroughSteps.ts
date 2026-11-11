import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const CLINIC_SETUP_STEPS: WalkthroughStep[] = [
  {
    id: 'setup-info',
    module: 'Clinic Setup',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Clinic Information',
    content:
      'Set official clinic identification, facility code, municipal address, contact telephone/email, and print header logos for clinical certificates.',
    targetSelector: 'main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'setup-schedule',
    module: 'Clinic Setup',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    title: 'Operating Schedule',
    content:
      'Configure daily operating hours, consultation days, shift time slots, and appointment scheduling policies.',
    targetSelector: 'main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'setup-modules',
    module: 'Clinic Setup',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Module Configuration',
    content:
      'Customize clinical form fields for Form 1 (Intake), Form 2 (Triage), and Form 3 (Vaccination), and configure station workflow rules.',
    targetSelector: 'main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'setup-staff',
    module: 'Clinic Setup',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Staff Assignments',
    content:
      'Assign healthcare personnel to specific station desks (Station 1 Day 0 Intake vs Station 2 Follow-up Doses) and manage daily duty rosters.',
    targetSelector: 'main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'setup-activity',
    module: 'Clinic Setup',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Staff Activity Monitor',
    content:
      'Track audit logs of staff logins, patient enrollments, clinical consultations, dose records, and administrative modifications.',
    targetSelector: 'main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'setup-templates',
    module: 'Clinic Setup',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Predefined Clinical Templates',
    content:
      'Manage standard clinical advice templates, wound cleaning instructions, doctor assessment notes, and discharge treatment guidance.',
    targetSelector: 'main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
];

export function getClinicSetupSteps(route: string = ROUTES.CLINIC_SETUP.INFO): WalkthroughStep[] {
  return CLINIC_SETUP_STEPS.map(step => ({ ...step, route }));
}
