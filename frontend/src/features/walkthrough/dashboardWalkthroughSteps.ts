import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// =============================================================================
// 1. ADMINISTRATOR DASHBOARD WALKTHROUGH (15 Steps)
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
      'View clinic announcements, patient totals, bite cases, and pending vaccine doses at a glance.',
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
      'Navigate to Patient Registration, Treatment Queues, Bite Cases, Bite Map, Vaccine Stock, Reports, Users, and Clinic Setup.',
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
      'Check notifications, reopen this walkthrough guide, or switch between light and dark mode.',
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
      'Switch between Overview metrics, recent Bite Cases, and Scheduled Vaccinations without leaving the dashboard.',
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
      'View today’s date and clinic operating days. Use the arrows to browse other months.',
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
      'Track Total Patients, Total Bite Cases, Completed Cases, and Pending Doses. Clinic announcements appear above.',
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
      'Filter dashboard metrics by staff role, case status, or date range to update cards and charts.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
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
      'Shows monthly bite incidents over the past 6 months. Hover over points to view exact counts.',
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
      'Tracks anti-rabies vaccine doses given each month over the past 6 months to monitor follow-up compliance.',
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
      'Breaks down bite exposures by Category I, II, and III. Switch between Daily, Weekly, Monthly, or Yearly views.',
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
      'Displays barangays by bite incident count with High (red), Moderate (yellow), and Low (green) risk badges.',
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
      'Filter risk levels by municipality or click Bite Map to open the GIS hotspot map.',
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
      'Review Total Bite Cases, Completed Cases, and recent incidents with animal species, category, and status.',
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
      'Review Pending Doses, Total Scheduled, and recent vaccinations with brand, dose, date, and status.',
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
      'Shows your active account and sign-out button. Always log out when leaving your terminal.',
    targetSelector: '[data-walkthrough="sidebar-user"], .sidebar-user',
    fallbackSelector: '[data-walkthrough="btn-logout"], .sidebar-logout-btn',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
];

// =============================================================================
// 2. REGISTRATION STAFF DASHBOARD WALKTHROUGH (15 Steps)
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
      'View patient totals, queue volume, bite cases, and daily clinic updates in one place.',
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
      'Open Patient Registration, Treatment Queues, Bite Cases Summary, Bite Map, and Reports & Analytics.',
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
      'Check clinic alerts, reopen this walkthrough guide, or toggle light and dark mode.',
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
      'Switch between Overview stats, recent Bite Cases, and Scheduled Vaccinations.',
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
      'Check today’s date and open clinic days. Use the arrows to verify future return dates.',
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
    title: 'Patient & Case Summary Cards',
    content:
      'Track Total Patients, Total Bite Cases, Completed Cases, and Pending Doses. Clinic announcements appear above.',
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
      'Filter dashboard stats by staff role, case status, or date range to update cards and charts.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
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
      'Shows monthly bite incident registrations over the past 6 months to spot peak periods.',
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
      'Tracks monthly vaccine doses given so you can see how well patients return for follow-ups.',
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
      'Shows Category I, II, and III bite proportions across Daily, Weekly, Monthly, and Yearly periods.',
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
      'Displays barangays with high, moderate, and low bite counts to help spot risk areas.',
    targetSelector: '[data-walkthrough="chart-risk-places"], [data-walkthrough="dashboard-risk-row"] > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'reg-location-filter-bitemap',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Location Filter & Bite Map Link',
    content:
      'Filter risk levels by municipality or click Bite Map to view local incident clusters.',
    targetSelector: '[data-walkthrough="risk-places-municipality"], [data-walkthrough="btn-risk-places-bitemap"]',
    fallbackSelector: '[data-walkthrough="chart-risk-places"] select',
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
      'View Total Bite Cases, Completed Cases, and recent intakes with animal species, category, and status.',
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
      'Check Pending Doses, Total Scheduled, and recent vaccinations with brand, dose, and return dates.',
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
      'Shows your staff account and logout button. Sign out whenever you leave your desk.',
    targetSelector: '[data-walkthrough="sidebar-user"], .sidebar-user',
    fallbackSelector: '[data-walkthrough="btn-logout"], .sidebar-logout-btn',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
];

// =============================================================================
// 3. TREATMENT NURSE DASHBOARD WALKTHROUGH (15 Steps)
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
      'Monitor pending doses, active treatments, and daily clinic workload at a glance.',
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
      'Access Treatment Queues, Patient List, Bite Cases, Bite Map, Vaccine Stock, Vaccination Schedule, and Reports.',
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
      'Check clinic alerts, reopen this guide, or switch between light and dark mode.',
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
      'Switch between Overview metrics, recent Bite Cases, and Scheduled Vaccinations.',
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
      'View today’s date and open clinic days to plan follow-up vaccination dates accurately.',
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
      'Track Total Patients, Total Bite Cases, Completed Cases, and Pending Doses. Clinic announcements appear above.',
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
      'Filter dashboard metrics by case status, staff role, or date range to focus on specific patient groups.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 4 – Charts and Analytics ──
  {
    id: 'nurse-chart-cases-over-time',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Cases Over Time Surveillance Chart',
    content:
      'Shows monthly bite cases over the past 6 months to help prepare vaccine and syringe stock.',
    targetSelector: '[data-walkthrough="chart-cases-over-time"], .sd-analytics-row > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-chart-vaccination-trend',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Vaccination Trend & Adherence Chart',
    content:
      'Tracks monthly vaccine doses given over the past 6 months to monitor follow-up adherence.',
    targetSelector: '[data-walkthrough="chart-vaccination-trend"], .sd-analytics-row > div:last-child',
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
      'Shows Category I, II, and III case shares to help anticipate RIG and vaccine demand.',
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
      'Highlights barangays with high, moderate, and low bite frequencies.',
    targetSelector: '[data-walkthrough="chart-risk-places"], [data-walkthrough="dashboard-risk-row"] > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'nurse-location-filter-bitemap',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Location Filter & Bite Map Link',
    content:
      'Filter barangay risk by municipality or click Bite Map to view incident hotspots.',
    targetSelector: '[data-walkthrough="risk-places-municipality"], [data-walkthrough="btn-risk-places-bitemap"]',
    fallbackSelector: '[data-walkthrough="chart-risk-places"] select',
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
      'View Total Bite Cases, Completed Cases, and recent cases with exposure category and status.',
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
      'Check Pending Doses, Total Scheduled, and recent vaccinations with brand, dose, date, and status.',
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
      'Shows your nurse account and sign-out button. Always log out at the end of your shift.',
    targetSelector: '[data-walkthrough="sidebar-user"], .sidebar-user',
    fallbackSelector: '[data-walkthrough="btn-logout"], .sidebar-logout-btn',
    placement: 'right',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
];

// =============================================================================
// 4. TRIAGE DOCTOR DASHBOARD WALKTHROUGH (15 Steps)
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
      'View bite exposures, patient queues, and daily clinical caseload at a glance.',
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
      'Access Treatment Queues, Patient List, Bite Cases, Bite Map, Vaccination Schedule (view-only), and Reports.',
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
      'Check alerts, reopen this walkthrough guide, or toggle light and dark mode.',
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
      'Switch between Overview stats, recent Bite Cases, and Scheduled Vaccinations (view-only).',
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
      'View today’s date and clinic operating days. Use the arrows to check upcoming schedules.',
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
    title: 'Clinical Bite Cases & Treatment Summary',
    content:
      'Track Total Patients, Total Bite Cases, Completed Cases, and Pending Doses. Clinic announcements appear above.',
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
      'Filter dashboard metrics by case status, staff role, or date range for clinical reviews.',
    targetSelector: '[data-walkthrough="dashboard-filters"], [data-tour="dashboard-filters"]',
    fallbackSelector: '.sd-chart-card',
    placement: 'bottom',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },

  // ── Section 4 – Charts and Analytics ──
  {
    id: 'doctor-chart-cases-over-time',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Epidemiological Bite Incident Curve',
    content:
      'Shows monthly animal bite exposures over the past 6 months to spot outbreaks early.',
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
      'Tracks monthly doses given over 6 months to monitor patient completion and follow-up compliance.',
    targetSelector: '[data-walkthrough="chart-vaccination-trend"], .sd-analytics-row > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-trends"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-chart-case-distribution',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Exposure Severity Distribution (Categories I, II, III)',
    content:
      'Breaks down bite exposures by WHO Category I, II, and III across Daily, Weekly, Monthly, or Yearly views.',
    targetSelector: '[data-walkthrough="chart-case-distribution"], [data-walkthrough="dashboard-risk-row"] > div:first-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
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
      'Shows barangays classified as High, Moderate, or Low Risk to identify rabies hotspots.',
    targetSelector: '[data-walkthrough="chart-risk-places"], [data-walkthrough="dashboard-risk-row"] > div:last-child',
    fallbackSelector: '[data-walkthrough="dashboard-risk-row"]',
    placement: 'top',
    activateSelector: '[data-walkthrough="dashboard-tab-overview"]',
  },
  {
    id: 'doctor-location-filter-bitemap',
    module: 'Dashboard',
    section: 'Section 4 – Charts and Analytics',
    route: ROUTES.DASHBOARD,
    title: 'Location Filter & Bite Map Link',
    content:
      'Filter barangay risk by municipality or click Bite Map to view geographic exposure clusters.',
    targetSelector: '[data-walkthrough="risk-places-municipality"], [data-walkthrough="btn-risk-places-bitemap"]',
    fallbackSelector: '[data-walkthrough="chart-risk-places"] select',
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
      'Review Total Bite Cases, Completed Cases, and recent exposures with animal species, category, and status.',
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
      'Review Pending Doses, Total Scheduled, and recent vaccinations with brand, dose, and date.',
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
      'Shows your doctor account and sign-out button. Always log out after your consultation session.',
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
    case 'developer':
      return ADMIN_DASHBOARD_STEPS;
    case 'registration':
      return REGISTRATION_DASHBOARD_STEPS;
    case 'treatment':
    case 'nurse':
      return TREATMENT_NURSE_DASHBOARD_STEPS;
    case 'triage':
    case 'doctor':
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
    case 'developer':
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
    case 'nurse':
      return {
        name: 'Treatment Nurse Dashboard Tour',
        description:
          'Clinical guide to pending doses, Station 1 & 2 queues, and vaccination monitoring.',
      };
    case 'triage':
    case 'doctor':
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
