import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export function getVaccinationScheduleSteps(_role?: string): WalkthroughStep[] {
  return [
    // -------------------------------------------------------------------------
    // 1. Overview & Recall Automation (Top Header)
    // -------------------------------------------------------------------------
    {
      id: 'vax-sched-header',
      module: 'Vaccination Schedule',
      section: 'Overview & Recall Automation',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Vaccination Schedule',
      content:
        'Welcome to the Vaccination Schedule! This module serves as your centralized rabies post-exposure prophylaxis (PEP) tracking center. Here, you can monitor patient compliance across all scheduled injection intervals (Day 0, Day 3, Day 7, Day 14/28, and Boosters), identify defaulters who missed return visits, and dispatch automated or manual recalls.',
      targetSelector: '[data-walkthrough="vax-sched-header"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vax-sched-btn-auto-recall',
      module: 'Vaccination Schedule',
      section: 'Overview & Recall Automation',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Run Auto-Recall Sweep',
      content:
        'The automated recall engine automatically runs daily at 8:00 AM to dispatch SMS, Email, and in-app reminder notifications. Clicking "Run Auto-Recall Sweep" triggers an immediate, on-demand sweep to scan all scheduled appointments and send urgent reminder alerts right away.',
      targetSelector: '[data-walkthrough="vax-sched-btn-auto-recall"]',
      fallbackSelector: '[data-walkthrough="vax-sched-header"]',
      placement: 'bottom',
    },
    {
      id: 'vax-sched-btn-bulk-recall',
      module: 'Vaccination Schedule',
      section: 'Overview & Recall Automation',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Recall All Missed Patients',
      content:
        'Whenever patients default or miss their scheduled injection dates, this bulk recall button dynamically surfaces. Clicking it opens a confirmation dialog to dispatch urgent reminder notices to all overdue patients across SMS, Email, or In-App channels in a single batch.',
      targetSelector: '[data-walkthrough="vax-sched-btn-bulk-recall"]',
      fallbackSelector: '[data-walkthrough="vax-sched-header"]',
      placement: 'bottom',
    },
    {
      id: 'vax-sched-btn-refresh',
      module: 'Vaccination Schedule',
      section: 'Overview & Recall Automation',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Sync & Refresh Schedule',
      content:
        'Click "Refresh" to re-fetch real-time appointment statuses, newly administered injections from the treatment room, and the latest patient adherence metrics from the server.',
      targetSelector: '[data-walkthrough="vax-sched-btn-refresh"]',
      fallbackSelector: '[data-walkthrough="vax-sched-header"]',
      placement: 'bottom',
    },

    // -------------------------------------------------------------------------
    // 2. PEP Adherence & Compliance Indicators (KPI Cards)
    // -------------------------------------------------------------------------
    {
      id: 'vax-sched-kpi-summary',
      module: 'Vaccination Schedule',
      section: 'PEP Adherence & Compliance Indicators',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'PEP Compliance & Adherence Summary Cards',
      content:
        'Review real-time PEP journey compliance metrics across all five indicators: Total PEP Cases (walk-in vs online split), On Track patients adhering to schedule, Doses Due Today for daily clinic preparation, Overdue / Missed defaulters requiring recall outreach, and Completed PEP regimens.',
      targetSelector: '[data-walkthrough="vax-sched-kpi-grid"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // -------------------------------------------------------------------------
    // 3. Filter & Search Controls
    // -------------------------------------------------------------------------
    {
      id: 'vax-sched-filter-status',
      module: 'Vaccination Schedule',
      section: 'Filter & Search Controls',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Status Filter',
      content:
        'Quickly filter the patient roster by adherence status: view "All Patients", isolate "Today\'s Injections" to manage today\'s clinic flow, look at "Online Bookings", or inspect "Missed / Recall" defaulters.',
      targetSelector: '[data-walkthrough="vax-sched-filter-status"]',
      fallbackSelector: '[data-walkthrough="vax-sched-filters-bar"]',
      placement: 'bottom',
    },
    {
      id: 'vax-sched-filter-channel',
      module: 'Vaccination Schedule',
      section: 'Filter & Search Controls',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Channel Filter',
      content:
        'Segment patient records by their registration intake origin: "All Channels", "Walk-in Only" for patients registered directly at the clinic desk, or "Online Mobile Only" for patients who booked via the mobile portal.',
      targetSelector: '[data-walkthrough="vax-sched-filter-channel"]',
      fallbackSelector: '[data-walkthrough="vax-sched-filters-bar"]',
      placement: 'bottom',
    },
    {
      id: 'vax-sched-filter-dose',
      module: 'Vaccination Schedule',
      section: 'Filter & Search Controls',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Dose Stage Filter',
      content:
        'Isolate patients who are at a specific stage of their PEP journey: Day 0 (Initial), Day 3, Day 7, or Booster Doses. This helps nurses organize dose preparation and clinical queues.',
      targetSelector: '[data-walkthrough="vax-sched-filter-dose"]',
      fallbackSelector: '[data-walkthrough="vax-sched-filters-bar"]',
      placement: 'bottom',
    },
    {
      id: 'vax-sched-search',
      module: 'Vaccination Schedule',
      section: 'Filter & Search Controls',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Live Patient Search',
      content:
        'Instantly locate any patient record by typing their full name, patient ID number (e.g., P-2026-0008), or phone number. Search results update automatically as you type.',
      targetSelector: '[data-walkthrough="vax-sched-search"]',
      fallbackSelector: '[data-walkthrough="vax-sched-filters-bar"]',
      placement: 'bottom',
    },

    // -------------------------------------------------------------------------
    // 4. Patient Records & Treatment Cards
    // -------------------------------------------------------------------------
    {
      id: 'vax-sched-batch-select',
      module: 'Vaccination Schedule',
      section: 'Patient Records & Treatment Cards',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Batch Print Selection',
      content:
        'Use this checkbox to select multiple patients or all displayed records on the page. Once selected, you can batch-print official Tagoloan Treatment Cards in a paper-saving layout of 2 cards per bond paper.',
      targetSelector: '[data-walkthrough="vax-sched-batch-select"]',
      fallbackSelector: '[data-walkthrough="vax-sched-patient-list"]',
      placement: 'bottom',
    },
    {
      id: 'vax-sched-patient-profile',
      module: 'Vaccination Schedule',
      section: 'Patient Records & Treatment Cards',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Patient Profile & Incident Summary',
      content:
        'Each card summarizes key demographic details including full name, assigned patient ID, age, gender, contact number, intake channel (Walk-In or Online), and animal bite exposure details (WHO Category, animal type, and anatomical site).',
      targetSelector: '[data-walkthrough="vax-sched-patient-profile"], [data-walkthrough="vax-sched-patient-card"]',
      fallbackSelector: '[data-walkthrough="vax-sched-patient-list"]',
      placement: 'top',
    },
    {
      id: 'vax-sched-btn-card',
      module: 'Vaccination Schedule',
      section: 'Patient Records & Treatment Cards',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Tagoloan Treatment Card',
      content:
        'Click "Card" to open the official standardized Tagoloan Animal Bite Treatment Center Card modal. You can preview complete consultation notes, doctor triage assessments, rabies vaccine administrations, and print an official copy for the patient.',
      targetSelector: '[data-walkthrough="vax-sched-btn-card"]',
      fallbackSelector: '[data-walkthrough="vax-sched-patient-card"]',
      placement: 'top',
    },

    // -------------------------------------------------------------------------
    // 5. Defaulter Management & Outreach
    // -------------------------------------------------------------------------
    {
      id: 'vax-sched-overdue-alert',
      module: 'Vaccination Schedule',
      section: 'Defaulter Management & Outreach',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Defaulter Alert & Overdue Notice',
      content:
        'When a patient fails to report on their scheduled appointment date, their record is visually highlighted with a high-contrast red border, tinted alert background, red "Missed" badge, and the exact count of days overdue (e.g., "17 days overdue").',
      targetSelector: '[data-walkthrough="vax-sched-overdue-alert"], [data-walkthrough="vax-sched-overdue-patient"]',
      fallbackSelector: '[data-walkthrough="vax-sched-patient-list"]',
      placement: 'top',
    },
    {
      id: 'vax-sched-btn-single-recall',
      module: 'Vaccination Schedule',
      section: 'Defaulter Management & Outreach',
      route: ROUTES.VACCINATIONS.LIST,
      title: 'Direct Patient Recall Action',
      content:
        'Click "Send Recall" to launch the direct reminder dialog for an individual defaulter. You can choose whether to dispatch an SMS, Email, or In-App alert with a personalized message urging them to return to the clinic immediately.',
      targetSelector: '[data-walkthrough="vax-sched-btn-single-recall"]',
      fallbackSelector: '[data-walkthrough="vax-sched-overdue-alert"], [data-walkthrough="vax-sched-overdue-patient"]',
      placement: 'top',
    },
  ];
}
