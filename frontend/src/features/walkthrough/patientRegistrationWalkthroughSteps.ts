import type { WalkthroughStep } from './types';
import { ROUTES } from '../../shared/config/routes';

export const PATIENT_REGISTRATION_ACTION_DEFS = [
  ['print', 'Print Patient List', 'Open the print options for the patient list in this tab.'],
  ['checkin-mobile', 'Check In to Triage', 'Confirm that the patient has arrived. This sends their submitted mobile bite intake to the doctor queue.'],
  ['checkin-reassessment', 'Check In for Reassessment', 'Open the returning-patient check-in form to collect updated vitals before doctor reassessment.'],
  ['checkin', 'Check In', 'Check an eligible returning patient into today’s doctor triage queue after confirming their arrival.'],
  ['checkin-nurse', 'Check In to Nurse', 'Check an eligible patient into today’s nurse treatment queue for pending treatment or follow-up vaccination.'],
  ['new-exposure', 'New Exposure', 'Open this patient’s record to register a separate new bite exposure.'],
  ['portal-invite', 'Portal Invite', 'Open the invitation dialog for a walk-in patient who needs access to the mobile portal. Review the details before sending.'],
  ['view', 'View Patient', 'Open this patient’s details to review their information and available record actions.'],
  ['awaiting-checkin', 'Booked — Awaiting Check-In', 'Indicates an online appointment booking with submitted intake awaiting patient arrival on their appointment date.'],
  ['bulk-invite', 'Send Portal Invites', 'Review the confirmation for sending portal invitations to the selected walk-in patients.'],
  ['clear-selection', 'Clear Selection', 'Clear the selected walk-in patients without changing their records.'],
] as const;

export function getPatientRegistrationSteps(route: string = ROUTES.PATIENTS.LIST): WalkthroughStep[] {
  return [
    // -------------------------------------------------------------------------
    // Section 1: Overview & Registration (Top)
    // -------------------------------------------------------------------------
    {
      id: 'patients-intro',
      module: 'Patient Registration',
      section: 'Section 1 – Overview & Registration',
      route,
      title: 'Patient Registration',
      content: 'Register walk-in patients, manage daily arrivals, and look up clinic patient records from this module.',
      targetSelector: '[data-walkthrough="patients-header"]',
      fallbackSelector: '.pm-panel-header',
      placement: 'bottom',
    },
    {
      id: 'patients-add-btn',
      module: 'Patient Registration',
      section: 'Section 1 – Overview & Registration',
      route,
      title: 'Add Patient',
      content: 'Register a new walk-in patient and record their personal details, contact information, and initial bite incident.',
      targetSelector: '[data-walkthrough="btn-add-patient"], .pm-add-btn',
      fallbackSelector: 'button',
      placement: 'bottom',
    },
    {
      id: 'patients-stats',
      module: 'Patient Registration',
      section: 'Section 1 – Overview & Registration',
      route,
      title: 'Patient Summary Cards',
      content: 'View quick totals for all registered patients, active patients currently under treatment, and patients pending follow-up doses.',
      targetSelector: '[data-walkthrough="patients-stats"], [data-tour="patients-summary"], .pm-stats-row',
      fallbackSelector: '.pm-main-panel',
      placement: 'bottom',
    },

    // -------------------------------------------------------------------------
    // Section 2: Patient Tabs
    // -------------------------------------------------------------------------
    {
      id: 'patients-tab-today-queue',
      module: 'Patient Registration',
      section: 'Section 2 – Patient Tabs',
      route,
      title: "Today's Queue",
      content: 'View patients who are checked in for consultation, undergoing treatment, or completed today.',
      targetSelector: '[data-walkthrough="tab-today-queue"]',
      activateSelector: '[data-walkthrough="tab-today-queue"]',
      tabKey: 'today_queue',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'patients-tab-all',
      module: 'Patient Registration',
      section: 'Section 2 – Patient Tabs',
      route,
      title: 'All Patients',
      content: 'Browse the complete clinic directory of registered patients to look up records or manage returning visits.',
      targetSelector: '[data-walkthrough="tab-all-patients"]',
      activateSelector: '[data-walkthrough="tab-all-patients"]',
      tabKey: 'all_patients',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'patients-tab-online',
      module: 'Patient Registration',
      section: 'Section 2 – Patient Tabs',
      route,
      title: 'Online Appointments',
      content: 'Review patients who booked consultation or follow-up appointments through the online portal.',
      targetSelector: '[data-walkthrough="tab-online-appointments"]',
      activateSelector: '[data-walkthrough="tab-online-appointments"]',
      tabKey: 'online_appointments',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'patients-tab-preregistered',
      module: 'Patient Registration',
      section: 'Section 2 – Patient Tabs',
      route,
      title: 'Pre-Registered (Mobile)',
      content: 'View patients who submitted their bite intake details through the mobile app before arriving at the clinic.',
      targetSelector: '[data-walkthrough="tab-pre-registered"]',
      activateSelector: '[data-walkthrough="tab-pre-registered"]',
      tabKey: 'pre_registered',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'patients-tab-overdue',
      module: 'Patient Registration',
      section: 'Section 2 – Patient Tabs',
      route,
      title: 'Overdue Patients',
      content: 'Monitor patients who missed scheduled follow-up vaccine doses and require clinical follow-up.',
      targetSelector: '[data-walkthrough="tab-overdue"]',
      activateSelector: '[data-walkthrough="tab-overdue"]',
      tabKey: 'overdue',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },

    // -------------------------------------------------------------------------
    // Section 3: Search, Filters & Records (Bottom)
    // -------------------------------------------------------------------------
    {
      id: 'patients-search-filter',
      module: 'Patient Registration',
      section: 'Section 3 – Search, Filters & Records',
      route,
      title: 'Search, Filters & Print',
      content: 'Search by patient name or ID, filter by program such as PhilHealth, Senior Citizen, or PWD, or print the current patient list.',
      targetSelector: '[data-walkthrough="patients-search-filter"], .pm-controls',
      fallbackSelector: '.pm-search-wrap',
      placement: 'bottom',
    },
    {
      id: 'patients-table',
      module: 'Patient Registration',
      section: 'Section 3 – Search, Filters & Records',
      route,
      title: 'Patient Records Table',
      content: 'Review patient numbers, names, intake sources, and live queue or treatment statuses for the selected tab, with available record actions in each row.',
      targetSelector: '[data-walkthrough="patients-table-actions"], .pm-table-wrap, .pm-table',
      fallbackSelector: '.pm-main-panel',
      placement: 'top',
    },
  ];
}

export function availablePatientActions(currentStep: WalkthroughStep): string[] {
  if (!currentStep.tabKey) return [];
  const found: string[] = [];
  for (const [key] of PATIENT_REGISTRATION_ACTION_DEFS) {
    const el = document.querySelector(`[data-patient-action="${key}"]`);
    if (el) found.push(key);
  }
  return found;
}

export function expandPatientSteps(steps: WalkthroughStep[], tabActions?: Record<string, string[]>): WalkthroughStep[] {
  if (!tabActions) return steps;
  return steps;
}
