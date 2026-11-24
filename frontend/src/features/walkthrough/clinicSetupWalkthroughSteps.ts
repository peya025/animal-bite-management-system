import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// ── 1. Clinic Information (5 Steps) ──
export const CLINIC_INFO_STEPS: WalkthroughStep[] = [
  {
    id: 'clinic-info-overview',
    module: 'Clinic Setup',
    section: '1. Clinic Information',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Clinic Setup & Information',
    content:
      'Configure clinic branding, accreditation details, operating hours, modules, staff desks, audit logs, and templates.',
    targetSelector: '[data-walkthrough="clinic-info-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'center',
  },
  {
    id: 'clinic-branding-card',
    module: 'Clinic Setup',
    section: '1. Clinic Information',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Branding & Identity',
    content:
      'Manage clinic logos, print header seals, and the facility name and tagline used across the app and printouts.',
    targetSelector: '[data-walkthrough="clinic-branding-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'clinic-facility-card',
    module: 'Clinic Setup',
    section: '1. Clinic Information',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Facility & Accreditation',
    content:
      'Update license, hospital, DOH, and PhilHealth accreditation numbers along with clinic address and contact details.',
    targetSelector: '[data-walkthrough="clinic-facility-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'auto',
  },
  {
    id: 'clinic-faqs-overview',
    module: 'Clinic Setup',
    section: '1. Clinic Information',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Frequently Asked Questions',
    content:
      'Manage bite care and rabies FAQs published to the patient mobile app.',
    targetSelector: '[data-walkthrough="clinic-faqs-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'auto',
  },
  {
    id: 'clinic-resources-card',
    module: 'Clinic Setup',
    section: '1. Clinic Information',
    route: ROUTES.CLINIC_SETUP.INFO,
    title: 'Patient App Resources',
    content:
      'Publish orientation videos and health links for the mobile app with a live preview.',
    targetSelector: '[data-walkthrough="clinic-resources-section"]',
    fallbackSelector: 'main.page-content',
    placement: 'auto',
  },
];

// ── 2. Operating Schedule (4 Steps) ──
export const CLINIC_OPERATING_SCHEDULE_STEPS: WalkthroughStep[] = [
  {
    id: 'schedule-overview',
    module: 'Clinic Setup',
    section: '2. Operating Schedule',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    title: 'Operating Schedule',
    content:
      'Configure weekly clinic hours, holiday exceptions, and PEP dose drift policies.',
    targetSelector: '[data-walkthrough="schedule-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'schedule-weekly-days',
    module: 'Clinic Setup',
    section: '2. Operating Schedule',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-weekly"]',
    title: 'Weekly Operating Pattern',
    content:
      'Set open days and clinic hours using quick presets or individual day toggles.',
    targetSelector: '[data-walkthrough="schedule-weekly-days-list"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
  {
    id: 'schedule-exceptions-tab',
    module: 'Clinic Setup',
    section: '2. Operating Schedule',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-exceptions"]',
    title: 'Calendar Exceptions & Holidays',
    content:
      'Manage holiday closures and special open dates that override the regular weekly schedule.',
    targetSelector: '[data-walkthrough="schedule-overrides-list"], [data-walkthrough="schedule-tab-exceptions"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
  {
    id: 'schedule-policies-tab',
    module: 'Clinic Setup',
    section: '2. Operating Schedule',
    route: ROUTES.CLINIC_SETUP.SCHEDULE,
    activateSelector: '[data-walkthrough="schedule-tab-policies"]',
    title: 'Regimen Drift & Emergency Policies',
    content:
      'Set how follow-up PEP doses shift on closed days and configure Day-0 emergency bite directives.',
    targetSelector: '[data-walkthrough="schedule-drift-policy-section"], [data-walkthrough="schedule-tab-policies"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
];

// ── 3. Module Configuration (3 Steps) ──
export const CLINIC_MODULE_CONFIG_STEPS: WalkthroughStep[] = [
  {
    id: 'module-config-overview',
    module: 'Clinic Setup',
    section: '3. Module Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Module Configuration',
    content:
      'Enable or disable clinical stations and customize form field visibility to match your workflow.',
    targetSelector: '[data-walkthrough="module-config-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'module-config-stations-row',
    module: 'Clinic Setup',
    section: '3. Module Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Clinical Stations & Patient Flow',
    content:
      'Toggle Registration, Triage, and Treatment desks and preview the resulting patient flow.',
    targetSelector: '[data-walkthrough="module-config-stations-row"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'module-config-registration-group',
    module: 'Clinic Setup',
    section: '3. Module Configuration',
    route: ROUTES.CLINIC_SETUP.MODULES,
    title: 'Form Field Rules (Forms 1–3)',
    content:
      'Set intake, triage, and treatment fields as Required, Optional, or Hidden while keeping WHO category safeguards locked.',
    targetSelector: '[data-walkthrough="module-config-registration-group"]',
    fallbackSelector: 'main.page-content',
    placement: 'auto',
  },
];

// ── 4. Staff Assignments (3 Steps) ──
export const CLINIC_STAFF_ASSIGNMENT_STEPS: WalkthroughStep[] = [
  {
    id: 'staff-assignment-overview',
    module: 'Clinic Setup',
    section: '4. Staff Assignments',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Staff Assignments',
    content:
      'Allocate staff to Station 1, Station 2, Doctor Consultation, and Registration desks.',
    targetSelector: '[data-walkthrough="staff-assignment-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'staff-assignment-kpi-cards',
    module: 'Clinic Setup',
    section: '4. Staff Assignments',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Workstation Coverage Summary',
    content:
      'Check staff on duty, Station 1 and Station 2 coverage, and active physician availability.',
    targetSelector: '[data-walkthrough="staff-assignment-kpi-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'staff-assignment-table',
    module: 'Clinic Setup',
    section: '4. Staff Assignments',
    route: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS,
    title: 'Staff Roster & Desk Allocation',
    content:
      'Search staff and assign each team member to a workstation matching their clinical role.',
    targetSelector: '[data-walkthrough="staff-assignment-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
];

// ── 5. Staff Activity Monitor (3 Steps) ──
export const CLINIC_STAFF_ACTIVITY_STEPS: WalkthroughStep[] = [
  {
    id: 'staff-activity-overview',
    module: 'Clinic Setup',
    section: '5. Staff Activity Monitor',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Staff Activity Monitor',
    content:
      'Audit staff logins, record changes, and after-hours system activity.',
    targetSelector: '[data-walkthrough="staff-activity-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'staff-activity-kpi-cards',
    module: 'Clinic Setup',
    section: '5. Staff Activity Monitor',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Activity & Security Summary',
    content:
      'Track total actions today, active sessions, after-hours events, and top staff activity.',
    targetSelector: '[data-walkthrough="staff-activity-kpi-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'staff-activity-table',
    module: 'Clinic Setup',
    section: '5. Staff Activity Monitor',
    route: ROUTES.AUDIT.ACTIVITY,
    title: 'Audit Filters & Trail Log',
    content:
      'Filter and review timestamped staff actions, descriptions, IP addresses, and after-hours flags.',
    targetSelector: '[data-walkthrough="staff-activity-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
];

// ── 6. Predefined Templates (3 Steps) ──
export const CLINIC_PREDEFINED_TEMPLATES_STEPS: WalkthroughStep[] = [
  {
    id: 'templates-overview',
    module: 'Clinic Setup',
    section: '6. Predefined Templates',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Predefined Templates',
    content:
      'Explore and preview standardized clinic blueprints such as Public ABTC and Basic Template.',
    targetSelector: '[data-walkthrough="templates-header"], h1',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'templates-presets-grid',
    module: 'Clinic Setup',
    section: '6. Predefined Templates',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Template Blueprints & Simulator',
    content:
      'Compare workflow presets and simulate new bite or return dose visits step by step.',
    targetSelector: '[data-walkthrough="templates-presets-grid"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'templates-staff-coverage',
    module: 'Clinic Setup',
    section: '6. Predefined Templates',
    route: ROUTES.CLINIC_SETUP.TEMPLATES,
    title: 'Staff Coverage & Form Fields',
    content:
      'Preview desk coverage models and toggle optional Form 1 sections before applying.',
    targetSelector: '[data-walkthrough="templates-staff-coverage"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
];

export const CLINIC_SETUP_STEPS: WalkthroughStep[] = [
  ...CLINIC_INFO_STEPS,
  ...CLINIC_OPERATING_SCHEDULE_STEPS,
  ...CLINIC_MODULE_CONFIG_STEPS,
  ...CLINIC_STAFF_ASSIGNMENT_STEPS,
  ...CLINIC_STAFF_ACTIVITY_STEPS,
  ...CLINIC_PREDEFINED_TEMPLATES_STEPS,
];

export function getClinicSetupSteps(route?: string): WalkthroughStep[] {
  if (route === ROUTES.CLINIC_SETUP.SCHEDULE) {
    return CLINIC_OPERATING_SCHEDULE_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.MODULES) {
    return CLINIC_MODULE_CONFIG_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS) {
    return CLINIC_STAFF_ASSIGNMENT_STEPS;
  }
  if (route === ROUTES.AUDIT.ACTIVITY) {
    return CLINIC_STAFF_ACTIVITY_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.TEMPLATES) {
    return CLINIC_PREDEFINED_TEMPLATES_STEPS;
  }
  if (route === ROUTES.CLINIC_SETUP.INFO) {
    return CLINIC_INFO_STEPS;
  }
  return CLINIC_SETUP_STEPS;
}

export function getClinicOperatingScheduleSteps(_route: string = ROUTES.CLINIC_SETUP.SCHEDULE): WalkthroughStep[] {
  return CLINIC_OPERATING_SCHEDULE_STEPS;
}

export function getClinicModuleConfigSteps(_route: string = ROUTES.CLINIC_SETUP.MODULES): WalkthroughStep[] {
  return CLINIC_MODULE_CONFIG_STEPS;
}

export function getClinicStaffAssignmentSteps(_route: string = ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS): WalkthroughStep[] {
  return CLINIC_STAFF_ASSIGNMENT_STEPS;
}

export function getClinicStaffActivitySteps(_route: string = ROUTES.AUDIT.ACTIVITY): WalkthroughStep[] {
  return CLINIC_STAFF_ACTIVITY_STEPS;
}

export function getClinicPredefinedTemplatesSteps(_route: string = ROUTES.CLINIC_SETUP.TEMPLATES): WalkthroughStep[] {
  return CLINIC_PREDEFINED_TEMPLATES_STEPS;
}
