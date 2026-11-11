import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// =============================================================================
// Helper: Role-specific Station 1 Steps
// =============================================================================
export function getStation1Steps(role?: string): WalkthroughStep[] {
  const isAdmin = role === 'admin' || role === 'developer';
  const isDoctor = role === 'triage';
  const isNurse = role === 'treatment';

  const steps: WalkthroughStep[] = [
    // 1. Header & Overview
    {
      id: 'queue-station1-header',
      module: 'Treatment Queues',
      section: 'Station 1: Header and Controls',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Station 1: New & Day 0',
      content: isDoctor
        ? 'Welcome to Station 1: New & Day 0. This is your physician triage station for evaluating new animal bite exposures, determining WHO bite category classifications, prescribing rabies post-exposure prophylaxis (PEP), and approving initial Day 0 intake.'
        : isNurse
        ? 'Welcome to Station 1: New & Day 0. Here, nurses receive newly triaged patients, administer prescribed Day 0 rabies vaccine and RIG injections, and provide essential bite wound cleaning.'
        : 'Welcome to Station 1: New & Day 0. This station manages patients waiting for initial medical consultation and Day 0 vaccination intake. Track arrivals, oversee desk throughput, and monitor active queue tickets.',
      targetSelector: '[data-walkthrough="queue-header"]',
      fallbackSelector: '#queue-table-container, main.page-content',
      placement: 'bottom',
    },

    // 2. Queue Display Button
    {
      id: 'queue-station1-display',
      module: 'Treatment Queues',
      section: 'Station 1: Header and Controls',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Queue Display Screen',
      content:
        'Click this button to launch the full-screen queue display in a separate monitor. It broadcasts current ticket numbers and designated consultation desks to patients waiting in the clinic lobby.',
      targetSelector: '[data-walkthrough="queue-display-btn"]',
      fallbackSelector: '[data-walkthrough="queue-header"], #queue-table-container',
      placement: 'bottom',
    },
  ];

  // 3. Patient Consultation History Button (Doctor / Admin / Developer)
  if (isDoctor || isAdmin) {
    steps.push({
      id: 'queue-station1-patient-history',
      module: 'Treatment Queues',
      section: 'Station 1: Header and Controls',
      route: ROUTES.QUEUE.DASHBOARD,
      title: isDoctor ? 'Patient Consultation History' : 'Patient History Records',
      content: isDoctor
        ? 'Search and review prior consultation records, past bite incidents, and previous vaccination history for returning patients before or during their evaluation.'
        : 'Search and audit past patient consultation records, incident histories, and vaccination timelines across the facility.',
      targetSelector: '[data-walkthrough="queue-patient-history-btn"]',
      fallbackSelector: '[data-walkthrough="queue-header"], #queue-table-container',
      placement: 'bottom',
    });
  }

  // 4. Refresh Button
  steps.push({
    id: 'queue-station1-refresh',
    module: 'Treatment Queues',
    section: 'Station 1: Header and Controls',
    route: ROUTES.QUEUE.DASHBOARD,
    title: 'Refresh Queue Data',
    content:
      'Instantly refreshes the waiting roster, active call counters, and ticket statuses to reflect new patient arrivals from registration without reloading the page.',
    targetSelector: '[data-walkthrough="queue-refresh-btn"]',
    fallbackSelector: '[data-walkthrough="queue-header"], #queue-table-container',
    placement: 'bottom',
  });

  // 5. Queue Statistics (KPI Strip)
  steps.push({
    id: 'queue-station1-kpi-strip',
    module: 'Treatment Queues',
    section: 'Station 1: Queue Statistics',
    route: ROUTES.QUEUE.DASHBOARD,
    title: 'Queue Statistics (KPI Strip)',
    content: isDoctor
      ? 'Real-time counters track daily patient flow: Waiting (awaiting triage consultation), Called (summoned to desk), Serving (in consultation), Completed (triage finished), and Total Today.'
      : isNurse
      ? 'Real-time counters track daily treatment flow: Waiting (awaiting Day 0 vaccination), Called (called to treatment room), Serving (receiving injection/wound care), Completed (vaccinated today), and Total Today.'
      : 'Real-time counters track daily clinic flow at a glance: Waiting (seated in lobby), Called (announced to desk), Serving (in consultation), Completed (finished today), and Total Today (cumulative intake).',
    targetSelector: '[data-walkthrough="queue-kpi-strip"]',
    fallbackSelector: '#queue-table-container, main.page-content',
    placement: 'bottom',
  });

  // 6. Vaccine Availability Strip
  steps.push({
    id: 'queue-station1-vaccine-stock',
    module: 'Treatment Queues',
    section: 'Station 1: Additional Information',
    route: ROUTES.QUEUE.DASHBOARD,
    title: 'Vaccine Availability',
    content: isDoctor
      ? 'Monitors active rabies vaccine and immunoglobulin (RIG) supply in real time to guide prescription regimens and ensure adequate dose availability.'
      : isNurse
      ? 'Displays real-time clinic rabies vaccine and RIG inventory. Check remaining dose capacity before calling patients to ensure uninterrupted Day 0 injections.'
      : 'Displays real-time clinic rabies vaccine stock and estimated patient capacity. Knowing remaining doses ensures clinical staff can administer required post-exposure prophylaxis without treatment interruptions.',
    targetSelector: '[data-walkthrough="queue-vaccine-availability"]',
    fallbackSelector: '#queue-table-container, main.page-content',
    placement: 'bottom',
  });

  // 7. Queue Search & Filters
  steps.push({
    id: 'queue-station1-filters',
    module: 'Treatment Queues',
    section: 'Station 1: Filters',
    route: ROUTES.QUEUE.DASHBOARD,
    title: 'Queue Search & Filters',
    content: isDoctor
      ? 'Filter queued patients by status (Waiting, Called, Serving), priority category, or search by name to organize your consultation order.'
      : isNurse
      ? 'Search arriving patients by name or ticket number, filter by queue status, or isolate priority groups (Senior, PWD, Pregnant) to prepare injections efficiently.'
      : 'Quickly find patients by name or queue number, filter by status (Waiting, Called, Serving), station queue stream, and priority category (Senior, PWD, Pregnant), or click Clear to reset filters.',
    targetSelector: '[data-walkthrough="queue-filter-bar"]',
    fallbackSelector: '#queue-table-container',
    placement: 'bottom',
  });

  // 8. Queue Waiting Table & Patient Information
  steps.push({
    id: 'queue-station1-table',
    module: 'Treatment Queues',
    section: 'Station 1: Patient Table',
    route: ROUTES.QUEUE.DASHBOARD,
    title: 'Queue Waiting List & Patient Rows',
    content: isDoctor
      ? 'The active consultation table displays queued bite victims awaiting evaluation, including ticket numbers, priority category badges, patient demographics, RIG candidacy alerts, and wait times.'
      : isNurse
      ? 'The active treatment table displays queued patients awaiting Day 0 injections, highlighting ticket numbers, patient demographics, RIG/GI candidate alerts, and wait times.'
      : 'The active workstation table displays queued patients with their ticket number, priority category badge, patient demographics, RIG / GI injection candidate indicators for severe exposures, visit type, and wait time.',
    targetSelector: '[data-walkthrough="queue-table"], #queue-table-container',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  });

  // 9. Priority Control
  steps.push({
    id: 'queue-station1-priority',
    module: 'Treatment Queues',
    section: 'Station 1: Patient Table',
    route: ROUTES.QUEUE.DASHBOARD,
    title: isDoctor
      ? 'Priority Control (Physician Triage)'
      : isNurse
      ? 'Priority Status (Patient Urgency)'
      : 'Priority Control (Queue Urgency)',
    content: isDoctor
      ? 'As a triage physician, adjust patient priority between Normal, Urgent, and Emergency to immediately prioritize severe head/neck bites, deep punctures, or active bleeding.'
      : isNurse
      ? 'View or update patient priority (Normal, Urgent, Emergency) to quickly flag severe exposures or distress requiring immediate wound cleansing and prioritized doctor evaluation.'
      : 'Authorized medical staff and administrators can adjust priority between Normal, Urgent, and Emergency to immediately prioritize severe head/neck bites or bleeding wounds.',
    targetSelector: '[data-walkthrough="queue-col-priority"], [data-walkthrough="th-col-priority"], #queue-table-container',
    fallbackSelector: '#queue-table-container',
    placement: 'bottom',
  });

  // 10. Record Button (Role-tailored)
  steps.push({
    id: 'queue-station1-record',
    module: 'Treatment Queues',
    section: 'Station 1: Patient Table',
    route: ROUTES.QUEUE.DASHBOARD,
    title: isDoctor
      ? 'Record Button (Physician Assessment)'
      : isNurse
      ? 'Record Button (Nurse Treatment Chart)'
      : 'Record Button (Patient Clinical Chart)',
    content: isDoctor
      ? 'Click **Record** to open the patient’s clinical file, evaluate Form 1 Intake data, determine WHO Category, prescribe PEP/RIG regimens, and document your medical assessment in Form 2.'
      : isNurse
      ? 'Click **Record** to open the patient’s clinical file, verify the physician’s prescribed vaccine/RIG orders, check anatomical injection sites, and record Day 0 administered doses.'
      : 'Click **Record** to review the patient’s complete clinical file, view intake details, verify attending doctor assessment notes, and inspect treatment records.',
    targetSelector: '[data-walkthrough="queue-col-record"], [data-walkthrough="th-col-view"], #queue-table-container',
    fallbackSelector: '#queue-table-container',
    placement: 'bottom',
  });

  // 11. Queue Actions (Role-tailored)
  steps.push({
    id: 'queue-station1-actions',
    module: 'Treatment Queues',
    section: 'Station 1: Patient Table',
    route: ROUTES.QUEUE.DASHBOARD,
    title: isDoctor
      ? 'Queue Actions (Consultation Desk)'
      : isNurse
      ? 'Queue Actions (Treatment Desk)'
      : 'Queue Actions (Queue Oversight)',
    content: isDoctor
      ? 'Queue action controls: Call or Recall patients to your consultation desk, send unresponsive callers to Second Chance without losing their records, or advance completed cases to treatment.'
      : isNurse
      ? 'Queue action controls: Call patients into the treatment room for injection, mark unresponsive callers as No Response (moving them to Second Chance), or complete treatment sessions.'
      : 'Interactive queue management controls: No Response (moves unresponsive callers to Second Chance without losing records), Return/Recall (reinstates returning patients), Cancel (removes cancelled tickets), and Move to Trash (archives erroneous entries).',
    targetSelector: '[data-walkthrough="queue-col-actions"], [data-walkthrough="th-col-queue_actions"], #queue-table-container',
    fallbackSelector: '#queue-table-container',
    placement: 'top',
  });

  // 12. Second Chance Queue Panel - For clinical staff & admin
  if (!role || role !== 'registration') {
    steps.push({
      id: 'queue-station1-second-chance-panel',
      module: 'Treatment Queues',
      section: 'Station 1: Queue Management',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Second Chance Queue Panel',
      content: isDoctor
        ? 'Holds patients who did not answer when called for consultation. Easily recall them to your desk once they arrive back at the waiting area.'
        : isNurse
        ? 'Holds patients who missed their call for vaccination. When the patient returns to the clinic, click Recall to return them directly to the active treatment queue.'
        : 'Dedicated holding panel for patients who missed their initial call. Staff can easily recall patients who return or restore them back to the active waiting queue without re-registering.',
      targetSelector: '[data-walkthrough="second-chance-panel"], #second-chance-panel',
      fallbackSelector: '#queue-table-container',
      placement: 'top',
    });
  }

  // 13. Today's Queue Progress Bar
  steps.push({
    id: 'queue-station1-progress-bar',
    module: 'Treatment Queues',
    section: 'Station 1: Queue Statistics',
    route: ROUTES.QUEUE.DASHBOARD,
    title: 'Today’s Queue Progress',
    content: isDoctor
      ? 'Visual progress bar tracking completed doctor consultations against total registered patient intake for today.'
      : isNurse
      ? 'Visual progress bar tracking completed Day 0 patient treatments against total registered intake for today.'
      : 'Visual progress bar shows the percentage of completed patient visits today alongside breakdowns by clinical visit categories.',
    targetSelector: '[data-walkthrough="queue-progress-bar"]',
    fallbackSelector: '#queue-table-container',
    placement: 'top',
  });

  // 14. Table Navigation & Pagination
  steps.push({
    id: 'queue-station1-pagination',
    module: 'Treatment Queues',
    section: 'Station 1: Navigation',
    route: ROUTES.QUEUE.DASHBOARD,
    title: 'Table Navigation & Pagination',
    content:
      'Select how many patient queue records are displayed at once (10, 15, 25, or 50) and navigate between pages of queued patients.',
    targetSelector: '[data-walkthrough="table-pagination-controls"], [data-walkthrough="table-rows-per-page"], .table-pager',
    fallbackSelector: '#queue-table-container',
    placement: 'top',
  });

  return steps;
}

// =============================================================================
// Helper: Station 2 Steps (Follow-up Doses)
// =============================================================================
export function getStation2Steps(role?: string): WalkthroughStep[] {
  const isAdmin = role === 'admin' || role === 'developer';
  const isNurse = role === 'treatment';

  return [
    // 1. Page Header & Station 2 Purpose
    {
      id: 'queue-station2-header',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Station 2 · Follow-up Doses',
      content: isNurse
        ? 'Station 2 handles returning animal bite victims due for scheduled follow-up vaccine doses (Day 3, Day 7, Day 14/28, and Booster doses). As a nurse, you check in returning patients, administer scheduled doses, and update their treatment records.'
        : isAdmin
        ? 'Station 2 handles returning animal bite victims due for scheduled follow-up vaccine doses (Day 3, Day 7, Day 14/28, and Booster doses). Oversee follow-up appointment compliance, check-in throughput, and overdue return rates.'
        : 'Station 2 displays returning patients undergoing follow-up rabies vaccination courses. Review dose schedules, check treatment compliance, and monitor return intervals.',
      targetSelector: '[data-walkthrough="nurse-header"], .page-header',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    // 2. Refresh Button
    {
      id: 'queue-station2-refresh',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Refresh Patient Roster',
      content:
        'Updates the follow-up roster, scheduled appointments, and checked-in queue statuses in real time without refreshing the entire browser page.',
      targetSelector: '[data-walkthrough="nurse-refresh-btn"]',
      fallbackSelector: '[data-walkthrough="nurse-header"], main.page-content',
      placement: 'bottom',
    },
    // 3. Queue Summary Cards / Statistics
    {
      id: 'queue-station2-kpi-cards',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Follow-up Queue Counters',
      content:
        'Summary cards track patient volume across key categories: Due Today (patients scheduled for dose administration today), Overdue Doses (patients who missed their scheduled date), Online Appointments, Upcoming Doses, and Total Tracked patients.',
      targetSelector: '[data-walkthrough="nurse-kpi-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    // 4. Follow-up Tabs Bar
    {
      id: 'queue-station2-tabs',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Follow-up Dose Tabs',
      content:
        'Use these tabs to filter patients: Due Today shows immediate vaccination candidates, Online Bookings lists pre-scheduled web appointments, Upcoming displays future returns, and Overdue highlights missed visits requiring adherence follow-up.',
      targetSelector: '[data-walkthrough="nurse-tabs-bar"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    // 5. Search Bar & Dose Filter
    {
      id: 'queue-station2-filters',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Search & Dose Interval Filter',
      content:
        'Search returning patients by name, patient #ID, or contact number, or filter the roster by target dose interval (All Doses, Day 3, Day 7, or Booster Doses) to plan vial preparation.',
      targetSelector: '[data-walkthrough="nurse-search-bar"], [data-walkthrough="nurse-dose-filter"]',
      fallbackSelector: '[data-walkthrough="nurse-table-container"], main.page-content',
      placement: 'bottom',
    },
    // 6. Follow-up Patient Table
    {
      id: 'queue-station2-table',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Follow-up Patient Roster',
      content:
        'Displays returning patients with permanent patient ID, demographics, Walk-in vs Online badge, last administered dose date, current vaccination status, and next scheduled appointment (including schedule drift adjustments).',
      targetSelector: '[data-walkthrough="nurse-table-container"], .MuiTable-root',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    // 7. Check In Action
    {
      id: 'queue-station2-checkin',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Patient Check-In',
      content: isNurse
        ? 'When an arriving follow-up patient reaches your desk, click Check In to confirm their attendance and route them directly into today’s treatment queue for dose administration.'
        : 'When an arriving follow-up patient reaches the desk, click Check In to confirm their attendance and route them directly into today’s treatment queue for dose administration.',
      targetSelector: '[data-walkthrough="nurse-action-checkin"], [data-walkthrough="nurse-col-actions"], [data-walkthrough="th-col-actions"], [data-walkthrough="nurse-table-container"]',
      fallbackSelector: '[data-walkthrough="nurse-table-container"]',
      placement: 'top',
    },
    // 8. Record Dose (Form 3) Action
    {
      id: 'queue-station2-record-dose',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Record Dose (Form 3)',
      content: isNurse
        ? 'Opens Form 3 Vaccination Record to document administered vaccine brand, batch lot number, injection site, dosage, and post-injection adverse reaction observations.'
        : 'Opens Form 3 Vaccination Record to inspect administered vaccine details, batch numbers, injection sites, and treatment completion logs.',
      targetSelector: '[data-walkthrough="nurse-action-record-dose"], [data-walkthrough="nurse-col-actions"], [data-walkthrough="th-col-actions"], [data-walkthrough="nurse-table-container"]',
      fallbackSelector: '[data-walkthrough="nurse-table-container"]',
      placement: 'top',
    },
    // 9. Treatment Card & Check-in Cancellation Actions
    {
      id: 'queue-station2-card-actions',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Treatment Card & Check-In Cancellation',
      content:
        'Click the card icon to view or print the official Tagoloan Animal Bite Treatment Card. If check-in was clicked by mistake, click Cancel to safely revert the appointment status without altering medical records.',
      targetSelector: '[data-walkthrough="nurse-action-view-card"], [data-walkthrough="nurse-action-cancel-checkin"], [data-walkthrough="nurse-col-actions"], [data-walkthrough="th-col-actions"], [data-walkthrough="nurse-table-container"]',
      fallbackSelector: '[data-walkthrough="nurse-table-container"]',
      placement: 'top',
    },
    // 10. Pagination & Navigation
    {
      id: 'queue-station2-pagination',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Pagination & Table Controls',
      content:
        'Adjust the number of rows visible per page and navigate between pages of follow-up patient records.',
      targetSelector: '[data-walkthrough="table-pagination-controls"], .table-pager, .MuiTablePagination-root',
      fallbackSelector: '[data-walkthrough="nurse-table-container"], main.page-content',
      placement: 'top',
    },
  ];
}

// =============================================================================
// Main Export: Unified Treatment Queues Walkthrough Steps
// =============================================================================
export function getTreatmentQueueSteps(role?: string): WalkthroughStep[] {
  const station1 = getStation1Steps(role);
  const hasStation2 = role === 'admin' || role === 'treatment' || role === 'developer';

  if (!hasStation2) {
    return station1;
  }

  const station2 = getStation2Steps(role);
  return [...station1, ...station2];
}

export const TREATMENT_QUEUES_STEPS = getTreatmentQueueSteps('admin');
