import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// =============================================================================
// 1. ADMINISTRATOR DASHBOARD WALKTHROUGH (16 Steps)
// =============================================================================
export const ADMIN_DASHBOARD_STEPS: WalkthroughStep[] = [
  // ── Section 1 – Getting Started ──
  {
    id: 'admin-dashboard-overview',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Dashboard Overview',
    content:
      'This is your administrative command center for overseeing clinic operations and bite surveillance. It displays real-time patient counts, active bite cases, and vaccination workloads at a glance. Review this screen daily to monitor overall clinic performance and resource readiness.',
    targetSelector: '[data-walkthrough="dashboard-overview"], [data-tour="dashboard-overview"], .sd-dashboard-container',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'admin-sidebar-navigation',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Administrator Sidebar Modules',
    content:
      'The sidebar provides centralized access to all administrative modules: Patient Registration, Treatment Queues (Stations 1 & 2), Bite Cases & Bite Map, Vaccine Stock Management, Reports & Analytics, User Management, and Clinic Setup. Click any module to open its dedicated workspace, or expand submenus to manage clinic configurations and monitor staff operations.',
    targetSelector: '[data-walkthrough="sidebar-nav"], [data-tour="sidebar-nav"], .sidebar-nav',
    fallbackSelector: '.sidebar',
    placement: 'right',
  },
  {
    id: 'admin-header-controls',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Header Controls & Utilities',
    content:
      'These top-bar utilities include system notifications, the interactive walkthrough guide, and light/dark theme toggles. Click the bell to view clinic alerts or click the book icon anytime to restart this dashboard tour. They provide quick administrative shortcuts without leaving your current workspace.',
    targetSelector: '[data-walkthrough="header-controls"], .top-header .header-right',
    fallbackSelector: '.top-header',
    placement: 'bottom',
  },
  {
    id: 'admin-view-tabs',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Overview, Cases & Vaccination Tabs',
    content:
      'These tabs switch between the main clinic Overview, Recent Bite Cases, and Scheduled Vaccinations. Click any tab to switch perspectives without leaving the dashboard workspace. This lets administrators inspect clinical details and operational logs seamlessly.',
    targetSelector: '[data-walkthrough="dashboard-tabs"], [data-tour="dashboard-tabs"], .sd-dash-tabs',
    fallbackSelector: '.sd-dash-header',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 2 – Dashboard Summary ──
  {
    id: 'admin-calendar',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Clinic Calendar & Month Navigation',
    content:
      'This interactive calendar highlights today’s date and tracks daily clinic operating schedules. Use the left and right arrow buttons to move between months and plan future operating days. It helps administrators organize appointment schedules and prevent booking on closed clinic dates.',
    targetSelector: '[data-walkthrough="dashboard-calendar"], [data-tour="dashboard-calendar"]',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'admin-stat-summary-cards',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Clinic Statistics & Summary Cards',
    content:
      'These summary cards display key operational metrics: Total Patients, Today’s Queue, New Today, Total Bite Cases, Active & Completed Cases, Pending Doses, Total Scheduled, and Queue Count. Together, they provide a real-time snapshot of patient volume, bite incidents, and vaccination progress so you can assess daily clinic workload at a single glance.',
    targetSelector: '[data-walkthrough="dashboard-stat-cards"], [data-tour="dashboard-summary-cards"], .sd-cards-grid',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 3 – Filters and Controls ──
  {
    id: 'admin-filters-controls',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Role, Status & Date Range Filters',
    content:
      'Filter your dashboard statistics by staff Role, case Status, or custom Date Range. Select options from the dropdowns to immediately recalculate metrics and drill into specific cohorts. It simplifies auditing and gives administrators customized views of clinic activities.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'admin-action-patients-cases',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Patients & Cases Quick Action Buttons',
    content:
      'Click the Patients button to jump directly to patient registration, or Cases to open bite records. These buttons eliminate multiple navigation steps when inspecting individual case details. They provide fast administrative access directly from the analytics dashboard.',
    targetSelector: '[data-walkthrough="btn-goto-patients"], [data-walkthrough="btn-goto-cases"]',
    fallbackSelector: '.sd-filters-bar-grid button',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 4 – Charts and Analytics ──
  {
    id: 'admin-chart-cases-over-time',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Cases Over Time Chart',
    content:
      'Illustrates recorded animal bite incidents across each month over the past 6 months. Hover along the trend curve to view monthly case counts and detect seasonal exposure spikes. It enables administrators to forecast vaccine supply needs before case surges occur.',
    targetSelector: '[data-walkthrough="chart-cases-over-time"], .sd-analytics-row > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'admin-chart-vaccination-trend',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Vaccination Trend Chart',
    content:
      'Tracks total anti-rabies vaccine doses administered each month over the last 6 months. Comparing this curve against new bite cases confirms patient compliance across follow-up doses. It assures administrators that treatment protocols are properly executed over time.',
    targetSelector: '[data-walkthrough="chart-vaccination-trend"], .sd-analytics-row > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'admin-chart-case-distribution',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Case Distribution & Period Controls',
    content:
      'Displays the breakdown of bite exposures by Category I, II, and III severity. Toggle between Daily, Weekly, Monthly, and Yearly buttons to analyze exposure proportions over time. It helps administrators monitor severe Category III cases requiring Rabies Immune Globulin (RIG).',
    targetSelector: '[data-walkthrough="chart-case-distribution"], [data-walkthrough="dashboard-risk-row"] > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'admin-chart-risk-places',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'High & Low Risk Places by Barangay',
    content:
      'Visualizes barangays with the highest and lowest recorded animal bite incident counts. Color-coded badges classify areas as High Risk (red), Moderate Risk (yellow), or Low Risk (green). It guides local disease surveillance and targeted rabies vaccination campaigns.',
    targetSelector: '[data-walkthrough="chart-risk-places"], [data-walkthrough="dashboard-risk-row"] > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'admin-location-filter-bitemap',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Location Filter & Bite Map Link',
    content:
      'Use the municipality dropdown to inspect risk classifications for different towns, or click Bite Map. Clicking Bite Map launches the full GIS mapping screen showing geographic incident clusters and heatmaps. This gives administrators deep spatial insights into rabies exposure hotspots.',
    targetSelector: '[data-walkthrough="risk-places-municipality"], [data-walkthrough="btn-risk-places-bitemap"]',
    fallbackSelector: '[data-walkthrough="chart-risk-places"] select',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 5 – Additional Dashboard Features ──
  {
    id: 'admin-tab-cases-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Bite Incident Cases Tab & Table',
    content:
      'This view shows recent bite incident intakes alongside summary cards for Total, Active, and Completed Cases. Administrators can verify biting animal species, exposure categories, and treatment statuses. It ensures accurate case documentation before submitting surveillance reports.',
    targetSelector: '[data-walkthrough="cases-tab-view"], [data-walkthrough="table-recent-cases"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-cases"]',
  },
  {
    id: 'admin-tab-vaccinations-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Vaccinations & Scheduled Doses Tab',
    content:
      'Displays recently administered anti-rabies vaccine doses alongside summary counters for Pending Doses, Total Scheduled, and Queue Count. Check patient names, vaccine brands, dose numbers, administration dates, and completed statuses to ensure high treatment compliance.',
    targetSelector: '[data-walkthrough="vaccinations-tab-view"], [data-walkthrough="table-recent-vaccinations"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-vaccinations"]',
  },
  {
    id: 'admin-sidebar-user-logout',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Administrator Account & Secure Sign Out',
    content:
      'Displays your active administrator account credentials and the secure sign-out control. Click the logout button to securely close your session whenever you leave your terminal. This safeguards confidential patient health records and protects administrative privileges.',
    targetSelector: '[data-walkthrough="sidebar-user"], .sidebar-user',
    fallbackSelector: '[data-walkthrough="btn-logout"], .sidebar-logout-btn',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
];

// =============================================================================
// 2. REGISTRATION STAFF DASHBOARD WALKTHROUGH (16 Steps)
// =============================================================================
export const REGISTRATION_DASHBOARD_STEPS: WalkthroughStep[] = [
  // ── Section 1 – Getting Started ──
  {
    id: 'reg-dashboard-overview',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Welcome to Registration Dashboard',
    content:
      'This dashboard is your starting point for managing patient arrivals, queues, and intake statistics. It gives you instant visibility into waiting patient volume, registered patients, and daily activities. Check this screen regularly to keep front-desk registration moving smoothly.',
    targetSelector: '[data-walkthrough="dashboard-overview"], [data-tour="dashboard-overview"], .sd-dashboard-container',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-sidebar-navigation',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Registration Staff Sidebar Modules',
    content:
      'The sidebar contains the tools essential for daily front-desk operations: Patient Registration (walk-in intake & queue lists), Treatment Queues (monitoring Station 1 arrivals), Bite Cases Summary, Bite Map (local incident tracking), and Reports & Analytics. Click any module to access patient forms, check queue status, or review registration logs.',
    targetSelector: '[data-walkthrough="sidebar-nav"], [data-tour="sidebar-nav"], .sidebar-nav',
    fallbackSelector: '.sidebar',
    placement: 'right',
  },
  {
    id: 'reg-header-theme-controls',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Notification, Theme & Help Controls',
    content:
      'Use these header controls to view clinic alerts, open interactive guides, or toggle dark mode. Click the book icon anytime to restart this dashboard guide or learn other modules. These utilities keep help accessible throughout your registration shift.',
    targetSelector: '[data-walkthrough="header-controls"], .top-header .header-right',
    fallbackSelector: '.top-header',
    placement: 'bottom',
  },
  {
    id: 'reg-dashboard-tabs',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Dashboard View Tabs',
    content:
      'Switch between Overview statistics, recent Bite Cases, and Scheduled Vaccinations. Click any tab to view specific patient records and recent clinic transactions. This lets registration staff verify recent intakes without navigating away from the dashboard.',
    targetSelector: '[data-walkthrough="dashboard-tabs"], [data-tour="dashboard-tabs"], .sd-dash-tabs',
    fallbackSelector: '.sd-dash-header',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 2 – Dashboard Summary ──
  {
    id: 'reg-calendar-schedules',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Clinic Calendar & Daily Schedules',
    content:
      'Highlights today’s date and shows active clinic operating days throughout the month. Use the arrow buttons to navigate months and verify open dates for returning patients. This prevents registration errors by ensuring patients return on official clinic days.',
    targetSelector: '[data-walkthrough="dashboard-calendar"], [data-tour="dashboard-calendar"]',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-stat-summary-cards',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Patient & Queue Summary Cards',
    content:
      'These summary cards display key intake statistics: Total Patients, Today’s Queue, New Today, Total Bite Cases, Active Cases, and Scheduled Follow-ups. Together, they give registration staff a comprehensive snapshot of patient arrivals, waiting room volume, and daily registrations at a glance.',
    targetSelector: '[data-walkthrough="dashboard-stat-cards"], [data-tour="dashboard-summary-cards"], .sd-cards-grid',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 3 – Filters and Controls ──
  {
    id: 'reg-filters-controls',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Registration & Case Status Filters',
    content:
      'Filter summary numbers by staff role, case status (ongoing, completed), or date range. Selecting options instantly updates the cards and charts for your chosen timeframe. Use this during shift handovers to review registrations completed during your duty hours.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-action-patients-btn',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Patients Quick Action Button',
    content:
      'Click this button to jump directly to the Patient Registration module. It opens the full patient workspace where you can click Add Patient or check in arriving patients. It is the fastest way to start registering a new patient directly from the dashboard.',
    targetSelector: '[data-walkthrough="btn-goto-patients"]',
    fallbackSelector: '.sd-filters-bar-grid button:first-of-type',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-action-cases-btn',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Cases Quick Action Button',
    content:
      'Click Cases to open the Bite Cases Summary and incident intake records. You can search existing cases by patient name, exposure category, or animal species. This allows staff to verify previous intake records when returning patients check in.',
    targetSelector: '[data-walkthrough="btn-goto-cases"]',
    fallbackSelector: '.sd-filters-bar-grid button:last-of-type',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 4 – Charts and Analytics ──
  {
    id: 'reg-chart-cases-over-time',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Monthly Patient Intake Trend',
    content:
      'Shows monthly bite incident registrations recorded across the past 6 months. It helps registration staff see historical trends and seasonal surges in animal bites. Understanding peak months helps front-desk staff prepare forms and queue supplies in advance.',
    targetSelector: '[data-walkthrough="chart-cases-over-time"], .sd-analytics-row > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-chart-vaccination-trend',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Vaccination Follow-up Compliance',
    content:
      'Tracks monthly doses administered across all active patient immunization series. It reflects whether patients are successfully returning for their scheduled follow-up visits. This reinforces the importance of clear return-date counseling during patient registration.',
    targetSelector: '[data-walkthrough="chart-vaccination-trend"], .sd-analytics-row > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-chart-case-distribution',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Case Severity Distribution',
    content:
      'Displays the proportion of Category I, II, and III bite incidents recorded in the clinic. Toggle between daily, weekly, and monthly views to inspect severity breakdowns. Registration staff should immediately prioritize Category III severe bites directly to triage doctors.',
    targetSelector: '[data-walkthrough="chart-case-distribution"], [data-walkthrough="dashboard-risk-row"] > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-chart-risk-places',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Barangay Bite Risk & Geographic Surveillance',
    content:
      'Shows barangays with high and low bite counts alongside the Bite Map action button. Select any municipality to inspect incident statistics or click Bite Map for map clusters. It helps staff confirm patient residential addresses and note high-risk rabies zones.',
    targetSelector: '[data-walkthrough="chart-risk-places"], [data-walkthrough="risk-places-municipality"]',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 5 – Additional Dashboard Features ──
  {
    id: 'reg-tab-cases-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Bite Incident Cases Tab',
    content:
      'Displays recently registered bite intakes with summary cards for Total, Active, and Completed cases. Registration staff can verify animal species, exposure categories, and current treatment status to confirm patient records without navigating away.',
    targetSelector: '[data-walkthrough="cases-tab-view"], [data-walkthrough="table-recent-cases"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-cases"]',
  },
  {
    id: 'reg-tab-vaccinations-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Vaccinations & Scheduled Doses Tab',
    content:
      'Displays recently administered anti-rabies vaccine doses alongside Pending Doses, Total Scheduled visits, and today’s Queue Count. Registration staff can verify administered vaccine brands, dose numbers, and return dates when patients check in at the clinic.',
    targetSelector: '[data-walkthrough="vaccinations-tab-view"], [data-walkthrough="table-recent-vaccinations"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-vaccinations"]',
  },
  {
    id: 'reg-sidebar-user-logout',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Staff Profile & Secure Logout',
    content:
      'Displays your active Registration Staff account credentials and the logout button. Always sign out when leaving your desk or completing your daily shift. This protects patient privacy and prevents unauthorized access to clinic registration records.',
    targetSelector: '[data-walkthrough="sidebar-user"], .sidebar-user',
    fallbackSelector: '[data-walkthrough="btn-logout"], .sidebar-logout-btn',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
];

// =============================================================================
// 3. TREATMENT NURSE DASHBOARD WALKTHROUGH (16 Steps)
// =============================================================================
export const TREATMENT_NURSE_DASHBOARD_STEPS: WalkthroughStep[] = [
  // ── Section 1 – Getting Started ──
  {
    id: 'nurse-dashboard-overview',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Welcome to Treatment Nurse Dashboard',
    content:
      'This dashboard is your clinical hub for managing vaccination queues, dose administration, and inventory. It gives you instant oversight of pending doses, active treatments, and clinic workloads. Check this dashboard at the start of your shift to prepare vaccination supplies.',
    targetSelector: '[data-walkthrough="dashboard-overview"], [data-tour="dashboard-overview"], .sd-dashboard-container',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-sidebar-navigation',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Treatment Nurse Sidebar Modules',
    content:
      'The sidebar provides direct access to all clinical treatment and immunization modules: Treatment Queues (Station 1 for Day 0 & Station 2 for follow-up doses), Patient List, Bite Cases Summary, Bite Map, Vaccine Stock Management (vial tracking & transactions), Vaccination Schedule, and Reports & Analytics. Click any module to manage vaccination workflows, record injections, or audit vaccine inventory.',
    targetSelector: '[data-walkthrough="sidebar-nav"], [data-tour="sidebar-nav"], .sidebar-nav',
    fallbackSelector: '.sidebar',
    placement: 'right',
  },
  {
    id: 'nurse-header-controls',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Header Utilities & Guide Access',
    content:
      'Access clinic alerts, theme preferences, and this interactive guide from the top header bar. Whenever you need guidance on charting doses or tracking stations, click the guide icon. These controls provide convenient support during busy clinic hours.',
    targetSelector: '[data-walkthrough="header-controls"], .top-header .header-right',
    fallbackSelector: '.top-header',
    placement: 'bottom',
  },
  {
    id: 'nurse-dashboard-tabs',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Overview, Cases & Vaccination Tabs',
    content:
      'Switch between Overview metrics, Recent Cases, and Scheduled Vaccinations. Use these tabs to verify recent dose administrations and examine patient bite histories without leaving the dashboard. It streamlines clinical verification before giving booster doses.',
    targetSelector: '[data-walkthrough="dashboard-tabs"], [data-tour="dashboard-tabs"], .sd-dash-tabs',
    fallbackSelector: '.sd-dash-header',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 2 – Dashboard Summary ──
  {
    id: 'nurse-calendar-tracking',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Clinic Calendar & Dose Tracking',
    content:
      'Displays the monthly calendar highlighting today’s date and scheduled clinic operating hours. Navigate months to verify clinic open days and calculate accurate PEP appointment return dates. This ensures follow-up appointments on Days 3, 7, 14, and 28 land on open clinic days.',
    targetSelector: '[data-walkthrough="dashboard-calendar"], [data-tour="dashboard-calendar"]',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-stat-summary-cards',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Treatment & Vaccination Summary Cards',
    content:
      'These summary cards present your clinical workload at a glance: Pending Doses, Total Scheduled, Today’s Queue, Active Treatment Cases, Completed Regimens, and Registered Patients. Together, they help nurses monitor immediate dose demands, anticipate arriving patients, and ensure high treatment completion across the clinic.',
    targetSelector: '[data-walkthrough="dashboard-stat-cards"], [data-tour="dashboard-summary-cards"], .sd-cards-grid',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 3 – Filters and Controls ──
  {
    id: 'nurse-filters-controls',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Clinical Status & Date Filters',
    content:
      'Filter dashboard statistics by case status (ongoing, completed, abandoned) and date range. Selecting options refines the charts and cards to examine specific patient treatment groups. It helps nurses quickly identify patients who may have abandoned therapy and need follow-up recall.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-action-patients-btn',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Patients Quick Action Button',
    content:
      'Click Patients to open the Patient Directory and comprehensive medical charts. Review patient demographics, past vaccination history, and recorded allergies. This allows nurses to confirm patient safety prior to administering anti-rabies biologics.',
    targetSelector: '[data-walkthrough="btn-goto-patients"]',
    fallbackSelector: '.sd-filters-bar-grid button:first-of-type',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-action-cases-btn',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Cases Quick Action Button',
    content:
      'Click Cases to inspect the Bite Cases Summary and incident intake records. Verify physician diagnoses, biting animal health statuses, and prescribed PEP regimens. It ensures nurses administer the exact vaccine and immunoglobulin regimen ordered by the doctor.',
    targetSelector: '[data-walkthrough="btn-goto-cases"]',
    fallbackSelector: '.sd-filters-bar-grid button:last-of-type',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 4 – Charts and Analytics ──
  {
    id: 'nurse-chart-vaccination-trend',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Vaccination Trend & Adherence Chart',
    content:
      'Visualizes total vaccine doses administered each month over the past 6 months. Observe monthly administration volume to track seasonal demands and patient follow-up adherence. It ensures nurses are aware of dose completion patterns and potential dropout rates.',
    targetSelector: '[data-walkthrough="chart-vaccination-trend"], .sd-analytics-row > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-chart-cases-over-time',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Cases Over Time Surveillance Chart',
    content:
      'Shows monthly influx of new animal bite incidents recorded in the clinic. Compare incident curves with vaccination trends to prepare adequate vaccine and syringe stock. It helps nurses coordinate with pharmacy staff to requisition biologicals before surges.',
    targetSelector: '[data-walkthrough="chart-cases-over-time"], .sd-analytics-row > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-chart-case-distribution',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Case Severity Distribution (Categories I–III)',
    content:
      'Displays the clinical proportion of Category I, II, and III bite incidents recorded in the clinic. Reviewing categories helps nurses anticipate demand for Rabies Immune Globulin (RIG) alongside vaccine. Category III transdermal bites require wound infiltration with RIG in addition to Day 0 vaccine.',
    targetSelector: '[data-walkthrough="chart-case-distribution"], [data-walkthrough="dashboard-risk-row"] > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-chart-risk-places',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Barangay Risk Classification & Bite Map',
    content:
      'Highlights communities with high, moderate, and low animal bite frequencies. Click Bite Map to view geospatial incident distribution and high-risk outbreak clusters. It prepares nurses for patients presenting from areas with active rabies exposure risks.',
    targetSelector: '[data-walkthrough="chart-risk-places"], [data-walkthrough="btn-risk-places-bitemap"]',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 5 – Additional Dashboard Features ──
  {
    id: 'nurse-tab-cases-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Bite Incident Cases Tab',
    content:
      'Displays recently admitted bite cases with summary cards for Total, Active, and Completed cases. Nurses can review physician diagnosis, biting animal health status, and ordered regimens to connect clinical assessment with accurate vaccination administration.',
    targetSelector: '[data-walkthrough="cases-tab-view"], [data-walkthrough="table-recent-cases"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-cases"]',
  },
  {
    id: 'nurse-tab-vaccinations-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Vaccinations & Scheduled Doses Tab',
    content:
      'This clinical table logs recent vaccine doses alongside summary counters for Pending Doses, Total Scheduled, and Queue Count. Verify patient name, vaccine brand, dose number (Day 0, 3, 7), date given, and completed status for batch traceability and quality control.',
    targetSelector: '[data-walkthrough="vaccinations-tab-view"], [data-walkthrough="table-recent-vaccinations"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-vaccinations"]',
  },
  {
    id: 'nurse-sidebar-user-logout',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Nurse Profile & Secure Sign Out',
    content:
      'Shows your active Nurse account credentials including your professional license number. Click logout at the end of your clinical duty to safely protect patient charts. This maintains medical records integrity and prevents unauthorized medication charting.',
    targetSelector: '[data-walkthrough="sidebar-user"], .sidebar-user',
    fallbackSelector: '[data-walkthrough="btn-logout"], .sidebar-logout-btn',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
];

// =============================================================================
// 4. TRIAGE DOCTOR DASHBOARD WALKTHROUGH (16 Steps)
// =============================================================================
export const TRIAGE_DOCTOR_DASHBOARD_STEPS: WalkthroughStep[] = [
  // ── Section 1 – Getting Started ──
  {
    id: 'doctor-dashboard-overview',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Welcome to Triage Doctor Dashboard',
    content:
      'This clinical dashboard provides triage physicians with instant oversight of bite exposures and patient queues. Monitor patients awaiting evaluation, track exposure categories, and review treatment adherence. Check this screen to assess daily clinical caseload and prioritize severe bite injuries.',
    targetSelector: '[data-walkthrough="dashboard-overview"], [data-tour="dashboard-overview"], .sd-dashboard-container',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-sidebar-navigation',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Triage Doctor Sidebar Modules',
    content:
      'The sidebar provides quick navigation to clinical assessment and surveillance tools: Treatment Queues (Station 1 Triage for assessing wounds and prescribing PEP), Patient List, Bite Cases Summary, Bite Map (rabies hotspot tracking), Vaccination Schedule (view-only), and Reports & Analytics. Click any module to evaluate patient exposure histories, assign WHO categories, or review clinical case records.',
    targetSelector: '[data-walkthrough="sidebar-nav"], [data-tour="sidebar-nav"], .sidebar-nav',
    fallbackSelector: '.sidebar',
    placement: 'right',
  },
  {
    id: 'doctor-header-controls',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Header Utilities & Interactive Guide',
    content:
      'Access system notifications, theme controls, and this interactive guide from the top navigation bar. Click the guide icon anytime to review clinical features or refresh your understanding of dashboard metrics. It ensures immediate clinical reference during consultation hours.',
    targetSelector: '[data-walkthrough="header-controls"], .top-header .header-right',
    fallbackSelector: '.top-header',
    placement: 'bottom',
  },
  {
    id: 'doctor-dashboard-tabs',
    module: 'Dashboard',
    section: 'Section 1 – Getting Started',
    route: ROUTES.DASHBOARD,
    title: 'Overview, Cases & Vaccination Tabs (View-Only)',
    content:
      'Switch between Overview statistics, Recent Cases, and Scheduled Vaccinations. Review recent case details, biting animal observations, and immunization timelines. Note that editing vaccination schedules is view-only for physicians and managed by treatment nurses.',
    targetSelector: '[data-walkthrough="dashboard-tabs"], [data-tour="dashboard-tabs"], .sd-dash-tabs',
    fallbackSelector: '.sd-dash-header',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 2 – Dashboard Summary ──
  {
    id: 'doctor-calendar-consultation',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Clinic Calendar & Consultation Schedule',
    content:
      'Displays clinic operating days, highlighted today-date tracking, and monthly schedules. Use month navigation to review clinic operating dates and evaluate consultation schedules. It ensures follow-up wound assessments align with official clinic operating hours.',
    targetSelector: '[data-walkthrough="dashboard-calendar"], [data-tour="dashboard-calendar"]',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-stat-summary-cards',
    module: 'Dashboard',
    section: 'Section 2 – Dashboard Summary',
    route: ROUTES.DASHBOARD,
    title: 'Clinical Bite Cases & Queue Summary',
    content:
      'These summary cards present your clinical caseload at a glance: Active Bite Cases, Patients Awaiting Triage, Total Bite Exposures, Completed Treatments, and Pending Doses. Together, they help doctors monitor patient urgency, identify severe Category III bite victims, and track treatment adherence across all active cohorts.',
    targetSelector: '[data-walkthrough="dashboard-stat-cards"], [data-tour="dashboard-summary-cards"], .sd-cards-grid',
    fallbackSelector: '.sd-top-arrangement',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 3 – Filters and Controls ──
  {
    id: 'doctor-filters-controls',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Clinical Filters Bar',
    content:
      'Filter clinical data by patient status (ongoing, completed), staff role, and date range. Use dropdown selectors to isolate specific cohorts for clinical audits or research inquiries. Facilitates detailed clinical case reviews and epidemiological analysis for medical reporting.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-action-cases-btn',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Cases Quick Action Button',
    content:
      'Jump directly to the comprehensive Bite Incident Records table. Review animal histories, exposure categories, anatomical bite sites, and treatment records. Direct access to clinical documentation needed for diagnosing rabies exposure risk.',
    targetSelector: '[data-walkthrough="btn-goto-cases"]',
    fallbackSelector: '.sd-filters-bar-grid button:last-of-type',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-action-patients-btn',
    module: 'Dashboard',
    section: 'Section 3 – Filters and Controls',
    route: ROUTES.DASHBOARD,
    title: 'Patients Quick Action Button',
    content:
      'Open the Patient Directory and consultation history with a single click. Search patient profiles, review allergy records, and check past vaccine reactions. Allows physicians to review patient medical background before prescribing PEP.',
    targetSelector: '[data-walkthrough="btn-goto-patients"]',
    fallbackSelector: '.sd-filters-bar-grid button:first-of-type',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 4 – Charts and Analytics ──
  {
    id: 'doctor-chart-case-distribution',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Exposure Severity Distribution (Categories I, II, III)',
    content:
      'Clinical breakdown of bite exposures by WHO Category (I, II, and III). Toggle between Daily, Weekly, Monthly, and Yearly periods to analyze severity proportions. Vital for clinical triage: Category I needs washing only, Category II needs vaccine, and Category III requires RIG + vaccine.',
    targetSelector: '[data-walkthrough="chart-case-distribution"], [data-walkthrough="dashboard-risk-row"] > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-chart-cases-over-time',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Epidemiological Bite Incident Curve',
    content:
      'Displays the monthly curve of animal bite exposures over the past 6 months. Observe incident trends, outbreak patterns, and exposure fluctuations. Helps physicians detect rabies outbreaks and alert local disease surveillance units.',
    targetSelector: '[data-walkthrough="chart-cases-over-time"], .sd-analytics-row > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-chart-vaccination-trend',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Vaccination Adherence & Protocol Compliance',
    content:
      'Monitors patient compliance across consecutive vaccination milestones over 6 months. Compare dose administration volume against new incident cases. Highlights whether patients are completing their full course or dropping out, requiring clinical recall.',
    targetSelector: '[data-walkthrough="chart-vaccination-trend"], .sd-analytics-row > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-chart-risk-places',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Barangay Risk Classifications & Bite Map',
    content:
      'Barangay-level animal bite risk classification with links to the GIS Bite Map. Select a municipality to review barangays flagged as High, Moderate, or Low Risk, or click Bite Map. Crucial for evaluating whether an exposure incident occurred in a recognized rabies hotspot.',
    targetSelector: '[data-walkthrough="chart-risk-places"], [data-walkthrough="btn-risk-places-bitemap"]',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 5 – Additional Dashboard Features ──
  {
    id: 'doctor-tab-cases-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Bite Incident Cases Tab & Table',
    content:
      'Clinical table of recent animal exposure incidents with Total, Active, and Completed case summary cards. Review patient name, exposure date, animal species, WHO category, and treatment status to verify appropriate clinical triage categorization.',
    targetSelector: '[data-walkthrough="cases-tab-view"], [data-walkthrough="table-recent-cases"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-cases"]',
  },
  {
    id: 'doctor-tab-vaccinations-table',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Recent Vaccinations & Scheduled Doses Tab (View-Only)',
    content:
      'Clinical log of administered vaccine doses, lot numbers, and administration dates in read-only mode, alongside Pending Doses, Total Scheduled, and Queue Count. Confirms that prescribed immunizations were administered according to clinical guidelines.',
    targetSelector: '[data-walkthrough="vaccinations-tab-view"], [data-walkthrough="table-recent-vaccinations"]',
    fallbackSelector: '[data-walkthrough="dashboard-tabs"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-vaccinations"]',
  },
  {
    id: 'doctor-sidebar-user-logout',
    module: 'Dashboard',
    section: 'Section 5 – Additional Dashboard Features',
    route: ROUTES.DASHBOARD,
    title: 'Doctor Profile & Secure Sign Out',
    content:
      'Shows physician account information and provides secure session logout. View doctor profile credentials and click logout to securely end your consultation session. Protects physician digital signature authorization and confidential patient medical files.',
    targetSelector: '[data-walkthrough="sidebar-user"], .sidebar-user',
    fallbackSelector: '[data-walkthrough="btn-logout"], .sidebar-logout-btn',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
];

// =============================================================================
// Helper: Get dashboard steps according to user role
// =============================================================================
export function getDashboardStepsForRole(role?: string): WalkthroughStep[] {
  switch (role) {
    case 'admin':
      return ADMIN_DASHBOARD_STEPS;
    case 'registration':
      return REGISTRATION_DASHBOARD_STEPS;
    case 'treatment':
      return TREATMENT_NURSE_DASHBOARD_STEPS;
    case 'triage':
      return TRIAGE_DOCTOR_DASHBOARD_STEPS;
    default:
      return ADMIN_DASHBOARD_STEPS;
  }
}

// =============================================================================
// Helper: Get dashboard module metadata according to user role
// =============================================================================
export function getDashboardModuleInfoForRole(role?: string): {
  name: string;
  description: string;
} {
  switch (role) {
    case 'admin':
      return {
        name: 'Administrator Dashboard Tour',
        description:
          'Comprehensive overview of administrative metrics, surveillance analytics, and clinic controls.',
      };
    case 'registration':
      return {
        name: 'Registration Staff Dashboard Tour',
        description:
          'Essential guide to patient registration counts, today’s queue flow, and intake schedules.',
      };
    case 'treatment':
      return {
        name: 'Treatment Nurse Dashboard Tour',
        description:
          'Clinical guide to pending doses, Station 1 & 2 queues, and vaccination monitoring.',
      };
    case 'triage':
      return {
        name: 'Triage Doctor Dashboard Tour',
        description:
          'Clinical assessment overview, WHO exposure categories, bite case surveillance, and queue monitoring.',
      };
    default:
      return {
        name: 'Administrator Dashboard Tour',
        description:
          'Comprehensive overview of administrative metrics, surveillance analytics, and clinic controls.',
      };
  }
}
