import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const REGISTRATION_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  // =========================================================================
  // MODULE A: DASHBOARD (9 Steps: 1–9)
  // =========================================================================
  {
    id: 'dashboard-overview',
    module: 'Dashboard',
    title: 'Dashboard Overview',
    content:
      'Welcome! This is your dashboard. Here, you can see important patient information and clinic activities.',
    route: ROUTES.DASHBOARD,
    targetSelector:
      '[data-tour="dashboard-overview"], [data-walkthrough="dashboard-overview"], .sd-dashboard-container',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'dashboard-sidebar',
    module: 'Dashboard',
    title: 'Navigation Menu',
    content:
      'Click Dashboard in the sidebar menu anytime to return to the main clinic dashboard, or navigate using the other menu options below.',
    route: ROUTES.DASHBOARD,
    targetSelector:
      '[data-tour="nav-item-dashboard"], [data-nav-item="dashboard"]',
    fallbackSelector: '[data-walkthrough="sidebar-nav"], .sidebar-nav',
    placement: 'right',
  },
  {
    id: 'dashboard-clinic-info',
    module: 'Dashboard',
    title: 'Clinic Information',
    content:
      'This header shows your clinic name and logo at the top of the navigation sidebar.',
    route: ROUTES.DASHBOARD,
    targetSelector: '[data-tour="sidebar-clinic-info"], [data-walkthrough="sidebar-clinic-info"], .sidebar-header',
    fallbackSelector: '.clinic-info',
    placement: 'right',
  },
  {
    id: 'dashboard-tabs',
    module: 'Dashboard',
    title: 'Dashboard View Tabs',
    content:
      'Use these tabs to switch between the main clinic Overview, Recent Bite Incident Cases, and Scheduled Vaccinations.',
    route: ROUTES.DASHBOARD,
    targetSelector: '[data-tour="dashboard-tabs"], [data-walkthrough="dashboard-tabs"], .sd-dash-tabs',
    fallbackSelector: '.sd-dash-header',
    placement: 'bottom',
  },
  {
    id: 'dashboard-calendar',
    module: 'Dashboard',
    title: 'Clinic Calendar',
    content:
      'This calendar highlights today’s date and helps you keep track of daily clinic schedules throughout the month.',
    route: ROUTES.DASHBOARD,
    targetSelector: '[data-tour="dashboard-calendar"], [data-walkthrough="dashboard-calendar"]',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'right',
  },
  {
    id: 'dashboard-patient-summary',
    module: 'Dashboard',
    title: 'Patient Summary',
    content:
      'These cards show important patient numbers for today, including patients waiting in the queue, active bite cases, and scheduled visits.',
    route: ROUTES.DASHBOARD,
    targetSelector:
      '[data-walkthrough="dashboard-stat-cards"], [data-tour="dashboard-summary-cards"], [data-walkthrough="dashboard-summary-cards"], .sd-cards-grid',
    fallbackSelector: '.stats-grid',
    placement: 'left',
  },
  {
    id: 'dashboard-filters',
    module: 'Dashboard',
    title: 'Dashboard Filters & Quick Links',
    content:
      'Filter dashboard statistics by Role, Status, or Date Range, or use the Patients and Cases buttons to jump directly to those records.',
    route: ROUTES.DASHBOARD,
    targetSelector: '[data-tour="dashboard-filters"], [data-walkthrough="dashboard-filters"], .sd-filters-bar-grid',
    fallbackSelector: '.sd-chart-card',
    placement: 'bottom',
  },
  {
    id: 'dashboard-trends',
    module: 'Dashboard',
    title: 'Cases & Vaccination Trends',
    content:
      'These charts show the trend of recorded animal bite cases and vaccinations over the last 6 months.',
    route: ROUTES.DASHBOARD,
    targetSelector:
      '[data-tour="dashboard-trends"], [data-walkthrough="dashboard-trends"], .sd-analytics-row',
    fallbackSelector: '.sd-analytics-row',
    placement: 'top',
  },
  {
    id: 'dashboard-risk-places',
    module: 'Dashboard',
    title: 'Case Distribution & Barangay Risk',
    content:
      'View the proportion of Category I, II, and III bite exposures alongside the barangays with the highest number of recorded bite cases.',
    route: ROUTES.DASHBOARD,
    targetSelector: '[data-tour="dashboard-risk-row"], [data-walkthrough="dashboard-risk-row"]',
    fallbackSelector: '.sd-analytics-row',
    placement: 'top',
  },

  // =========================================================================
  // MODULE B: PATIENT REGISTRATION (9 Steps: 10–18)
  // =========================================================================
  {
    id: 'patients-overview',
    module: 'Patient Registration',
    title: 'Patient Registration',
    content:
      'Click Patient Registration in the sidebar menu to open the patient registration and records module.',
    route: ROUTES.DASHBOARD,
    targetSelector:
      '[data-tour="nav-item-patient-registration"], [data-nav-item="patient-registration"]',
    fallbackSelector: '[data-walkthrough="sidebar-nav"], .sidebar-nav',
    placement: 'right',
  },
  {
    id: 'patients-add-btn',
    module: 'Patient Registration',
    title: 'Add Patient',
    content:
      'Click this button to register a new walk-in patient. A form will open where you can enter the patient’s personal details and contact information.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '[data-walkthrough="btn-add-patient"], .pm-add-btn',
    fallbackSelector: 'button',
    placement: 'bottom',
  },
  {
    id: 'patients-tab-today-queue',
    module: 'Patient Registration',
    title: "Today's Queue",
    content:
      'Here, you can see patients who are already checked in and waiting for their turn today.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '[data-walkthrough="tab-today-queue"]',
    fallbackSelector: '.pm-tabs',
    placement: 'bottom',
  },
  {
    id: 'patients-tab-all',
    module: 'Patient Registration',
    title: 'All Patients',
    content:
      'This tab shows all registered patients in the clinic. You can look up returning patients here at any time.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '[data-walkthrough="tab-all-patients"]',
    fallbackSelector: '.pm-tabs',
    placement: 'bottom',
  },
  {
    id: 'patients-tab-online',
    module: 'Patient Registration',
    title: 'Online Appointments',
    content:
      'Here, you can see patients who booked their appointments online before visiting the clinic.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '[data-walkthrough="tab-online-appointments"]',
    fallbackSelector: '.pm-tabs',
    placement: 'bottom',
  },
  {
    id: 'patients-tab-preregistered',
    module: 'Patient Registration',
    title: 'Pre-Registered Patients',
    content:
      'These patients already entered their information using the mobile app and are ready to be checked in when they arrive.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '[data-walkthrough="tab-pre-registered"]',
    fallbackSelector: '.pm-tabs',
    placement: 'bottom',
  },
  {
    id: 'patients-tab-overdue',
    module: 'Patient Registration',
    title: 'Overdue Patients',
    content:
      'Here, you can see patients who missed their scheduled follow-up visit so staff can follow up or check them in when they return.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '[data-walkthrough="tab-overdue"]',
    fallbackSelector: '.pm-tabs',
    placement: 'bottom',
  },
  {
    id: 'patients-search-filters',
    module: 'Patient Registration',
    title: 'Search & Filters',
    content:
      'Use the search box to find a patient by name or number, or filter patients by program such as PhilHealth, Senior Citizen, or PWD.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '[data-walkthrough="patients-search-filter"], .pm-controls',
    fallbackSelector: '.pm-search-wrap',
    placement: 'bottom',
  },
  {
    id: 'patients-actions',
    module: 'Patient Registration',
    title: 'Patient Check-In & Records',
    content:
      'Use the action buttons in each row to check in arriving patients or click View to see and update their records.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector: '.pm-table tbody tr:first-child, [data-walkthrough="patients-table-actions"]',
    fallbackSelector: '.pm-table-wrap',
    placement: 'top',
  },

  // =========================================================================
  // MODULE C: PATIENT QUEUE MANAGEMENT (4 Steps: 19–22)
  // =========================================================================
  {
    id: 'queue-overview',
    module: 'Patient Queue',
    title: 'Treatment Queues',
    content:
      'Click Treatment Queues in the sidebar menu to view and monitor patients waiting in the clinic queue.',
    route: ROUTES.PATIENTS.LIST,
    targetSelector:
      '[data-tour="nav-item-treatment-queues"], [data-nav-item="treatment-queues"]',
    fallbackSelector:
      '[data-tour="registration-queue-table"], [data-walkthrough="queue-table"], #queue-table-container',
    placement: 'right',
  },
  {
    id: 'queue-numbers',
    module: 'Patient Queue',
    title: 'Queue Numbers & Status',
    content:
      'Each patient gets a queue number. These counters show how many patients are waiting, being called, currently in consultation, or finished.',
    route: ROUTES.QUEUE.DASHBOARD,
    targetSelector: '[data-walkthrough="queue-kpi-strip"]',
    fallbackSelector: '.MuiBox-root',
    placement: 'bottom',
  },
  {
    id: 'queue-display',
    module: 'Patient Queue',
    title: 'Queue Display Screen',
    content:
      'Click this button to open the big screen display showing the queue number currently being called in the waiting area.',
    route: ROUTES.QUEUE.DASHBOARD,
    targetSelector: '[data-walkthrough="queue-display-btn"]',
    fallbackSelector: 'button',
    placement: 'bottom',
  },
  {
    id: 'queue-table',
    module: 'Patient Queue',
    title: 'Monitoring the Queue',
    content:
      'Doctors and nurses call patients from their stations. Use this bar to search by patient name or queue number and filter the waiting list.',
    route: ROUTES.QUEUE.DASHBOARD,
    targetSelector: '[data-tour="queue-filter-bar"], [data-walkthrough="queue-filter-bar"]',
    fallbackSelector: '#queue-table-container',
    placement: 'bottom',
  },

  // =========================================================================
  // MODULE D: BITE CASES SUMMARY (3 Steps: 23–25)
  // =========================================================================
  {
    id: 'bite-cases-overview',
    module: 'Bite Cases Summary',
    title: 'Bite Cases Summary',
    content:
      'Click Bite Cases Summary in the sidebar menu to view recorded animal bite cases and priority locations.',
    route: ROUTES.QUEUE.DASHBOARD,
    targetSelector:
      '[data-tour="nav-item-bite-cases-summary"], [data-nav-item="bite-cases-summary"]',
    fallbackSelector:
      '[data-tour="bite-cases-kpi-cards"], [data-walkthrough="bite-cases-kpi-cards"]',
    placement: 'right',
  },
  {
    id: 'bite-cases-filters',
    module: 'Bite Cases Summary',
    title: 'Location Priority & Case Filters',
    content:
      'Switch between Location Priority and All Cases, or search and filter records by bite category, status, animal type, and date range.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector: '[data-tour="bite-cases-filter-bar"], [data-walkthrough="bite-cases-filter-bar"]',
    fallbackSelector: '.MuiPaper-root',
    placement: 'bottom',
  },
  {
    id: 'bite-cases-table',
    module: 'Bite Cases Summary',
    title: 'Bite Cases & Priority Table',
    content:
      'View bite case counts, severity categories, and follow-up compliance for each location, or click Export CSV to download the list.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector: '[data-tour="bite-cases-table"], [data-walkthrough="bite-cases-table"]',
    fallbackSelector: '.MuiTableContainer-root',
    placement: 'top',
  },

  // =========================================================================
  // MODULE E: BITE MAP (4 Steps: 26–29)
  // =========================================================================
  {
    id: 'bitemap-overview',
    module: 'Bite Map',
    title: 'Bite Map',
    content:
      'Click Bite Map in the sidebar menu to open the interactive map and see where animal bite incidents occurred in the community.',
    route: ROUTES.BITE_CASES.LIST,
    targetSelector:
      '[data-tour="nav-item-bite-map"], [data-nav-item="bite-map"]',
    fallbackSelector:
      '[data-tour="bite-map-container"], [data-walkthrough="bitemap-map-view"]',
    placement: 'right',
  },
  {
    id: 'bitemap-markers',
    module: 'Bite Map',
    title: 'Map Markers and Clusters',
    content:
      'Markers show where animal bite cases happened. Grouped markers show cases that are close to each other.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector: '[data-tour="bite-map-marker"], .custom-cluster-icon, .custom-marker-icon, .leaflet-marker-icon',
    fallbackSelector: '[data-tour="bite-map-container"], [data-walkthrough="bitemap-map-view"]',
    placement: 'top',
  },
  {
    id: 'bitemap-heatmap',
    module: 'Bite Map',
    title: 'Heatmap View',
    content:
      'Click Density Heatmap to see which areas have more recorded animal bite cases.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector: '[data-tour="bite-map-heatmap-toggle"], [data-walkthrough="bitemap-heatmap-btn"]',
    fallbackSelector: '[data-walkthrough="bitemap-view-toggle"]',
    placement: 'bottom',
  },
  {
    id: 'bitemap-filters',
    module: 'Bite Map',
    title: 'Map Filters',
    content:
      'Use these filters to choose which bite cases you want to see on the map by time period, category, or treatment status.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector: '[data-walkthrough="bitemap-filters"]',
    fallbackSelector: '[data-tour="bite-map-container"]',
    placement: 'bottom',
  },

  // =========================================================================
  // MODULE F: REPORTS & ANALYTICS (5 Steps: 30–34) + LOGOUT (Step 35)
  // =========================================================================
  {
    id: 'reports-overview',
    module: 'Reports & Analytics',
    title: 'Reports & Analytics',
    content:
      'Click Reports & Analytics in the sidebar menu to view clinic reports, treatment surveillance, and analytics charts.',
    route: ROUTES.BITE_CASES.MAP,
    targetSelector:
      '[data-tour="nav-item-reports-analytics"], [data-nav-item="reports-analytics"]',
    fallbackSelector:
      '[data-tour="reports-summary-cards"], [data-walkthrough="reports-summary-cards"], .rr-overview-top-section',
    placement: 'right',
  },
  {
    id: 'reports-tabs',
    module: 'Reports & Analytics',
    title: 'Report Categories',
    content:
      'Choose a tab to view different reports about patients, treatments, and animal bite cases.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-category-tabs"], [data-walkthrough="reports-tabs"]',
    fallbackSelector: '.MuiTabs-root',
    placement: 'bottom',
  },
  {
    id: 'reports-filters',
    module: 'Reports & Analytics',
    title: 'Report Filters',
    content:
      'Use these filters to choose the dates and types of records you want to see.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-filter-controls"], [data-walkthrough="reports-filters"], .rr-filter-row',
    fallbackSelector: '.rr-filters-unified',
    placement: 'bottom',
  },
  {
    id: 'reports-charts',
    module: 'Reports & Analytics',
    title: 'Charts and Summaries',
    content:
      'These charts and numbers help you understand patient records and animal bite cases.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-charts"], [data-walkthrough="reports-charts"], .rr-surveillance-row-1',
    fallbackSelector: '[data-tour="reports-summary-cards"]',
    placement: 'top',
  },
  {
    id: 'reports-actions',
    module: 'Reports & Analytics',
    title: 'Print & Export Reports',
    content:
      'Use these buttons to export the report as a CSV file or print a clean copy when needed.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-walkthrough="reports-action-buttons"]',
    fallbackSelector: '.rr-header',
    placement: 'bottom',
  },
  {
    id: 'account-logout',
    module: 'Account',
    title: 'Logout',
    content:
      'Click this button at the bottom of the sidebar menu to safely log out of your account when you finish your work.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="btn-logout"], [data-walkthrough="btn-logout"], .sidebar-logout-btn, .nav-item-logout',
    fallbackSelector: '[data-walkthrough="sidebar-user"], .sidebar-user, .sidebar-footer-actions',
    placement: 'right',
  },
];

export const WALKTHROUGH_STEPS = REGISTRATION_WALKTHROUGH_STEPS;
export * from './dashboardWalkthroughSteps';
export * from './patientRegistrationWalkthroughSteps';
export * from './treatmentQueuesWalkthroughSteps';
export * from './biteCasesWalkthroughSteps';
export * from './biteMapWalkthroughSteps';
export * from './vaccineStockWalkthroughSteps';
export * from './reportsAnalyticsWalkthroughSteps';
export * from './userManagementWalkthroughSteps';
export * from './clinicSetupWalkthroughSteps';
export default REGISTRATION_WALKTHROUGH_STEPS;
