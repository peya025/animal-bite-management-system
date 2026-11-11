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
  ['bulk-invite', 'Send Portal Invites', 'Review the confirmation for sending portal invitations to the selected walk-in patients.'],
  ['clear-selection', 'Clear Selection', 'Clear the selected walk-in patients without changing their records.'],
] as const;

export function getPatientRegistrationSteps(route: string = ROUTES.PATIENTS.LIST): WalkthroughStep[] {
  return [
    // -------------------------------------------------------------------------
    // Top Beginning: Header & Global Patient Registration Controls (Steps 1–3)
    // -------------------------------------------------------------------------
    {
      id: 'patients-intro',
      module: 'Patient Registration',
      route,
      title: 'Patient Registration',
      content: 'Welcome to Patient Registration. Use this page to register walk-in patients, manage queued arrivals, and look up patient records.',
      targetSelector: '[data-walkthrough="patients-header"]',
      fallbackSelector: '.pm-panel-header',
      placement: 'bottom',
    },
    {
      id: 'patients-add-btn',
      module: 'Patient Registration',
      route,
      title: 'Add Patient',
      content: 'Click this button to enroll a new walk-in patient. Form 1 will open to capture the patient’s personal demographics, contact info, and initial bite incident.',
      targetSelector: '[data-walkthrough="btn-add-patient"], .pm-add-btn',
      fallbackSelector: 'button',
      placement: 'bottom',
    },
    {
      id: 'patients-search-filters',
      module: 'Patient Registration',
      route,
      title: 'Search & Filters',
      content: 'Search by patient name or ID number, or filter patients by program category such as PhilHealth, Senior Citizen, or PWD.',
      targetSelector: '[data-walkthrough="patients-search-filter"], .pm-controls',
      fallbackSelector: '.pm-search-wrap',
      placement: 'bottom',
    },

    // -------------------------------------------------------------------------
    // Tab 1: Today's Queue Tab & Its Actions (Steps 4–8)
    // -------------------------------------------------------------------------
    {
      id: 'patients-tab-today-queue',
      module: 'Patient Registration',
      route,
      title: "Today's Queue Tab",
      content: 'This tab shows patients who are checked in and waiting for consultation or treatment at the clinic today.',
      targetSelector: '[data-walkthrough="tab-today-queue"]',
      activateSelector: '[data-walkthrough="tab-today-queue"]',
      tabKey: 'today_queue',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'today-queue-print',
      module: 'Patient Registration',
      route,
      title: 'Print Patient List',
      content: 'Click Print to export or print the current list of patients waiting in today’s queue.',
      targetSelector: '[data-patient-action="print"]',
      activateSelector: '[data-walkthrough="tab-today-queue"]',
      tabKey: 'today_queue',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'today-queue-checkin',
      module: 'Patient Registration',
      route,
      title: 'Check In',
      content: 'Click Check In to confirm an arriving patient and route them directly to the doctor’s triage queue.',
      targetSelector: '[data-patient-action="checkin"]',
      fallbackSelector: '.pm-btn-checkin',
      activateSelector: '[data-walkthrough="tab-today-queue"]',
      tabKey: 'today_queue',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'today-queue-checkin-reassessment',
      module: 'Patient Registration',
      route,
      title: 'Check In for Reassessment',
      content: 'For returning patients with pending unadministered treatment from a prior visit. Opens a quick intake form to update vitals and send them to the doctor for reassessment.',
      targetSelector: '[data-patient-action="checkin-reassessment"]',
      fallbackSelector: '.pm-btn-checkin',
      activateSelector: '[data-walkthrough="tab-today-queue"]',
      tabKey: 'today_queue',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'today-queue-checkin-nurse',
      module: 'Patient Registration',
      route,
      title: 'Check In to Nurse',
      content: 'Directly route patients who have already been assessed by the doctor into the treatment room for follow-up doses or wound care.',
      targetSelector: '[data-patient-action="checkin-nurse"]',
      fallbackSelector: '.pm-btn-checkin',
      activateSelector: '[data-walkthrough="tab-today-queue"]',
      tabKey: 'today_queue',
      actionStep: true,
      placement: 'auto',
    },

    // -------------------------------------------------------------------------
    // Tab 2: All Patients Tab & Its Actions (Steps 9–14)
    // -------------------------------------------------------------------------
    {
      id: 'patients-tab-all',
      module: 'Patient Registration',
      route,
      title: 'All Patients Tab',
      content: 'This master directory contains every patient registered in the clinic database. Use it to look up records, print lists, send mobile portal invitations, or enroll a new bite exposure.',
      targetSelector: '[data-walkthrough="tab-all-patients"]',
      activateSelector: '[data-walkthrough="tab-all-patients"]',
      tabKey: 'all_patients',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'all-patients-print',
      module: 'Patient Registration',
      route,
      title: 'Print All Patients Directory',
      content: 'Generate a printable summary or audit report of all registered clinic patients.',
      targetSelector: '[data-patient-action="print"]',
      activateSelector: '[data-walkthrough="tab-all-patients"]',
      tabKey: 'all_patients',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'all-patients-bulk-invite',
      module: 'Patient Registration',
      route,
      title: 'Bulk Mobile Portal Invitations',
      content: 'Select multiple walk-in patients using table checkboxes, then click this button to send them portal access codes in one step.',
      targetSelector: '[data-patient-action="bulk-invite"]',
      activateSelector: '[data-walkthrough="tab-all-patients"]',
      tabKey: 'all_patients',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'all-patients-portal-invite',
      module: 'Patient Registration',
      route,
      title: 'Invite Patient to Mobile Portal',
      content: 'Send a secure SMS/email invitation code so this patient can log into the mobile app to view appointments and vaccination progress.',
      targetSelector: '[data-patient-action="portal-invite"]',
      activateSelector: '[data-walkthrough="tab-all-patients"]',
      tabKey: 'all_patients',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'all-patients-new-exposure',
      module: 'Patient Registration',
      route,
      title: 'Register New Bite Exposure',
      content: 'When an existing patient returns with a brand new animal bite exposure, click here to add a separate bite case incident to their permanent history.',
      targetSelector: '[data-patient-action="new-exposure"]',
      activateSelector: '[data-walkthrough="tab-all-patients"]',
      tabKey: 'all_patients',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'all-patients-view',
      module: 'Patient Registration',
      route,
      title: 'View Patient File',
      content: 'Open the full clinical record drawer to review patient demographics, contact details, previous bite exposures, and completed vaccine records.',
      targetSelector: '[data-patient-action="view"]',
      activateSelector: '[data-walkthrough="tab-all-patients"]',
      tabKey: 'all_patients',
      actionStep: true,
      placement: 'auto',
    },

    // -------------------------------------------------------------------------
    // Tab 3: Online Appointments Tab & Its Actions (Steps 15–18)
    // -------------------------------------------------------------------------
    {
      id: 'patients-tab-online',
      module: 'Patient Registration',
      route,
      title: 'Online Appointments Tab',
      content: 'Review and confirm patients who reserved an appointment time slot through the public online portal.',
      targetSelector: '[data-walkthrough="tab-online-appointments"]',
      activateSelector: '[data-walkthrough="tab-online-appointments"]',
      tabKey: 'online_appointments',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'online-print',
      module: 'Patient Registration',
      route,
      title: 'Print Online Appointments List',
      content: 'Export or print today’s expected roster of online booked patients.',
      targetSelector: '[data-patient-action="print"]',
      activateSelector: '[data-walkthrough="tab-online-appointments"]',
      tabKey: 'online_appointments',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'online-checkin',
      module: 'Patient Registration',
      route,
      title: 'Check In Arriving Online Patient',
      content: 'Confirm the arrival of an online appointment holder to automatically generate their ticket number and place them into the queue.',
      targetSelector: '[data-patient-action="checkin"]',
      fallbackSelector: '.pm-btn-checkin',
      activateSelector: '[data-walkthrough="tab-online-appointments"]',
      tabKey: 'online_appointments',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'online-view',
      module: 'Patient Registration',
      route,
      title: 'Review Booking Details',
      content: 'Inspect the patient’s scheduled date, preferred time slot, and pre-submitted intake questionnaire notes.',
      targetSelector: '[data-patient-action="view"]',
      activateSelector: '[data-walkthrough="tab-online-appointments"]',
      tabKey: 'online_appointments',
      actionStep: true,
      placement: 'auto',
    },

    // -------------------------------------------------------------------------
    // Tab 4: Pre-Registered (Mobile) Tab & Its Actions (Steps 19–22)
    // -------------------------------------------------------------------------
    {
      id: 'patients-tab-preregistered',
      module: 'Patient Registration',
      route,
      title: 'Pre-Registered (Mobile) Tab',
      content: 'View patients who self-submitted their bite intake details through the mobile app before arriving at the clinic.',
      targetSelector: '[data-walkthrough="tab-pre-registered"]',
      activateSelector: '[data-walkthrough="tab-pre-registered"]',
      tabKey: 'pre_registered',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'prereg-print',
      module: 'Patient Registration',
      route,
      title: 'Print Pre-Registered Intake Roster',
      content: 'Print a list of pending digital intake submissions awaiting in-person arrival and verification.',
      targetSelector: '[data-patient-action="print"]',
      activateSelector: '[data-walkthrough="tab-pre-registered"]',
      tabKey: 'pre_registered',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'prereg-checkin-mobile',
      module: 'Patient Registration',
      route,
      title: 'Verify & Check In Mobile Intake',
      content: 'Verify the patient’s identity upon arrival, confirm their submitted mobile intake, and route them to Doctor Triage without retyping their data.',
      targetSelector: '[data-patient-action="checkin-mobile"]',
      fallbackSelector: '.pm-btn-checkin',
      activateSelector: '[data-walkthrough="tab-pre-registered"]',
      tabKey: 'pre_registered',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'prereg-view',
      module: 'Patient Registration',
      route,
      title: 'Inspect Mobile Intake Form',
      content: 'Review the pre-filled exposure history, animal details, and patient contact information prior to check-in.',
      targetSelector: '[data-patient-action="view"]',
      activateSelector: '[data-walkthrough="tab-pre-registered"]',
      tabKey: 'pre_registered',
      actionStep: true,
      placement: 'auto',
    },

    // -------------------------------------------------------------------------
    // Tab 5: Overdue Patients Tab & Its Actions (Steps 23–26)
    // -------------------------------------------------------------------------
    {
      id: 'patients-tab-overdue',
      module: 'Patient Registration',
      route,
      title: 'Overdue Patients Tab',
      content: 'Monitor bite victims who missed their scheduled follow-up rabies vaccination doses (Day 3, 7, 14, 28) and require immediate clinical follow-up.',
      targetSelector: '[data-walkthrough="tab-overdue"]',
      activateSelector: '[data-walkthrough="tab-overdue"]',
      tabKey: 'overdue',
      fallbackSelector: '.pm-tabs',
      placement: 'bottom',
    },
    {
      id: 'overdue-print',
      module: 'Patient Registration',
      route,
      title: 'Print Overdue Defaulter List',
      content: 'Export or print the list of overdue patients for community health worker contact tracing and dose adherence surveillance.',
      targetSelector: '[data-patient-action="print"]',
      activateSelector: '[data-walkthrough="tab-overdue"]',
      tabKey: 'overdue',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'overdue-checkin-nurse',
      module: 'Patient Registration',
      route,
      title: 'Check In Overdue Patient to Station 2',
      content: 'When an overdue patient returns, check them directly into the nurse treatment queue to resume their PEP protocol immediately.',
      targetSelector: '[data-patient-action="checkin-nurse"]',
      fallbackSelector: '.pm-btn-checkin',
      activateSelector: '[data-walkthrough="tab-overdue"]',
      tabKey: 'overdue',
      actionStep: true,
      placement: 'auto',
    },
    {
      id: 'overdue-view',
      module: 'Patient Registration',
      route,
      title: 'View Vaccination Schedule History',
      content: 'Check which specific dose was missed, calculate schedule drift days, and review doctor notes on treatment resumption.',
      targetSelector: '[data-patient-action="view"]',
      activateSelector: '[data-walkthrough="tab-overdue"]',
      tabKey: 'overdue',
      actionStep: true,
      placement: 'auto',
    },

    // -------------------------------------------------------------------------
    // Bottom Ending: Patient Records Table, Controls & Pagination (Steps 27–29)
    // -------------------------------------------------------------------------
    {
      id: 'patients-table-overview',
      module: 'Patient Registration',
      route,
      title: 'Patient Directory Table',
      content: 'The interactive table displays registered patients with their status, contact details, assigned category, and quick action buttons.',
      targetSelector: '.pm-table, [data-walkthrough="patients-table"]',
      fallbackSelector: '.pm-table-wrap',
      placement: 'top',
    },
    {
      id: 'patients-rows-per-page',
      module: 'Patient Registration',
      route,
      title: 'Rows Per Page Selector',
      content: 'Customize how many patient records are shown per page (10, 15, 25, or 50) to optimize table density.',
      targetSelector: '[data-walkthrough="table-rows-per-page"], .pm-pager-limit, .table-pagination-select',
      fallbackSelector: '.table-pager, .pm-pager',
      placement: 'top',
    },
    {
      id: 'patients-pagination-controls',
      module: 'Patient Registration',
      route,
      title: 'Pagination & Page Navigation',
      content: 'Move between pages of patient records using the previous, next, and page number buttons to explore large patient datasets.',
      targetSelector: '[data-walkthrough="table-pagination-controls"], .pm-pager-buttons, .table-pagination-controls',
      fallbackSelector: '.table-pager, .pm-pager',
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
