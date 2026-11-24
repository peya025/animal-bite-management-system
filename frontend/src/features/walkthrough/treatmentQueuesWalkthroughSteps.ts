import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// =============================================================================
// Helper: Role-specific Station 1 Steps (New & Day 0)
// =============================================================================
export function getStation1Steps(role?: string): WalkthroughStep[] {
  const isDoctor = role === 'triage';
  const isNurse = role === 'treatment';

  return [
    {
      id: 'queue-station1-header',
      module: 'Treatment Queues',
      section: 'Station 1: New & Day 0',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Station 1: New & Day 0',
      content: isDoctor
        ? 'Evaluate new animal bite patients, assign WHO categories, and prescribe Day 0 PEP regimens.'
        : isNurse
        ? 'Receive newly triaged patients for Day 0 rabies vaccine, RIG administration, and wound care.'
        : 'Manage patients waiting for initial medical consultation and Day 0 vaccination intake.',
      targetSelector: '[data-walkthrough="queue-header"]',
      fallbackSelector: '#queue-table-container, main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station1-kpi-strip',
      module: 'Treatment Queues',
      section: 'Station 1: Queue Summary',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Queue Summary Counters',
      content: isDoctor
        ? 'Track today’s Waiting, Called, Serving, Completed, and Total consultation counts.'
        : isNurse
        ? 'Track today’s Waiting, Called, Serving, Completed, and Total Day 0 treatment counts.'
        : 'Track today’s Waiting, Called, Serving, Completed, and Total clinic queue counts.',
      targetSelector: '[data-walkthrough="queue-kpi-strip"]',
      fallbackSelector: '#queue-table-container, main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station1-vaccine-stock',
      module: 'Treatment Queues',
      section: 'Station 1: Vaccine Stock',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Vaccine Availability',
      content: isDoctor
        ? 'Check live rabies vaccine and RIG stock levels before prescribing treatment.'
        : isNurse
        ? 'Check live rabies vaccine and RIG stock levels before administering Day 0 doses.'
        : 'View real-time rabies vaccine and RIG stock availability for today’s patients.',
      targetSelector: '[data-walkthrough="queue-vaccine-availability"]',
      fallbackSelector: '#queue-table-container, main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station1-filters',
      module: 'Treatment Queues',
      section: 'Station 1: Filters',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Search & Filters',
      content: 'Search by patient name or queue number, or filter by status and priority.',
      targetSelector: '[data-walkthrough="queue-filter-bar"]',
      fallbackSelector: '#queue-table-container',
      placement: 'bottom',
    },
    {
      id: 'queue-station1-table',
      module: 'Treatment Queues',
      section: 'Station 1: Patient Queue',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Patient Queue List',
      content: isDoctor
        ? 'View queued patients, priority badges, RIG indicators, wait times, and consultation status.'
        : isNurse
        ? 'View queued patients, priority badges, RIG indicators, wait times, and treatment status.'
        : 'View queued patients, ticket numbers, priority badges, RIG indicators, and wait times.',
      targetSelector: '[data-walkthrough="queue-table"], #queue-table-container',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'queue-station1-progress-bar',
      module: 'Treatment Queues',
      section: 'Station 1: Queue Summary',
      route: ROUTES.QUEUE.DASHBOARD,
      title: 'Today’s Queue Progress',
      content: isDoctor
        ? 'See today’s consultation completion progress across all queued visits.'
        : isNurse
        ? 'See today’s Day 0 treatment completion progress across all queued visits.'
        : 'See today’s overall visit completion progress across queued patients.',
      targetSelector: '[data-walkthrough="queue-progress-bar"]',
      fallbackSelector: '#queue-table-container',
      placement: 'top',
    },
  ];
}

// =============================================================================
// Helper: Station 2 Steps (Follow-up Doses)
// =============================================================================
export function getStation2Steps(role?: string): WalkthroughStep[] {
  const isNurse = role === 'treatment';

  return [
    {
      id: 'queue-station2-header',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Station 2 · Follow-up Doses',
      content: isNurse
        ? 'Manage returning patients scheduled for follow-up rabies vaccine doses (Day 3, Day 7, Day 14/28, and Boosters).'
        : 'Monitor returning patients scheduled for follow-up rabies vaccine doses (Day 3, Day 7, Day 14/28, and Boosters).',
      targetSelector: '[data-walkthrough="nurse-header"], .page-header',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station2-kpi-cards',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Follow-up Queue Counters',
      content:
        'View counts for Due Today, Overdue Doses, Online Appointments, Upcoming Doses, and Total Tracked patients.',
      targetSelector: '[data-walkthrough="nurse-kpi-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station2-tabs',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Follow-up Dose Tabs',
      content:
        'Switch between Due Today, Online Bookings, Upcoming, and Overdue patient lists.',
      targetSelector: '[data-walkthrough="nurse-tabs-bar"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station2-filters',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Search & Dose Filter',
      content:
        'Search returning patients by name, ID, or contact number, or filter by dose interval.',
      targetSelector: '[data-walkthrough="nurse-search-bar"], [data-walkthrough="nurse-dose-filter"]',
      fallbackSelector: '[data-walkthrough="nurse-table-container"], main.page-content',
      placement: 'bottom',
    },
    {
      id: 'queue-station2-table',
      module: 'Treatment Queues',
      section: 'Station 2: Follow-up Doses',
      route: ROUTES.PATIENTS.NURSE_LIST,
      title: 'Follow-up Patient Roster',
      content:
        'View returning patient records, last administered dose, vaccination status, and next scheduled appointment.',
      targetSelector: '[data-walkthrough="nurse-table-container"], .MuiTable-root',
      fallbackSelector: 'main.page-content',
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
