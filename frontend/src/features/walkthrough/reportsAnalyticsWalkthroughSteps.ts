import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// ── Admin Reports & Analytics (9 Steps corresponding to Images 1 to 9) ──
export function getAdminReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    // Step 1: Uniform Welcome / Overview Modal (Centered in viewport)
    {
      id: 'admin-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: 'Reports & Analytics Overview',
      content:
        'Welcome to Reports & Analytics! Generate official clinic surveillance reports, animal bite epidemiology summaries, DOH quarterly submissions, patient registries, and vaccine inventory compliance analytics.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 2: Navigation Tabs (Image 1)
    {
      id: 'admin-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Reports & Analytics Navigation Tabs',
      content:
        'Easily switch between five reporting sections: Clinic Overview (summary metrics & stock status), Trends & Records (epidemiological charts & logs), DOH Submissions (official government reports), Patients registry, and Vaccine Inventory.',
      targetSelector:
        '[data-walkthrough="admin-reports-tabs"], [data-tour="admin-reports-tabs"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 2: Clinic Overview - Period & Exposure Filters (Image 2)
    {
      id: 'admin-reports-filters',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Report Period & Category Filters',
      content:
        'Filter surveillance data by time period (Today, This Week, This Month, Last 30 Days, This Year, or Custom date range) and Exposure Category (All, Category I, II, or III). Click "Apply" to calculate or "Refresh" to reload live numbers.',
      targetSelector:
        '[data-walkthrough="admin-reports-filters"], [data-tour="admin-reports-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 3: Clinic Overview - Key Summary Metrics (Image 3)
    {
      id: 'admin-reports-kpi-cards',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Clinic Overview Key Metrics',
      content:
        'Four high-level metrics show: Total Bite Episodes in the selected period, Eligible PEP Completion rate, Patients with Overdue Doses, and Patients Awaiting their first dose (Day 0). A warning banner alerts staff if follow-up is urgently required.',
      targetSelector:
        '[data-walkthrough="admin-reports-kpi-cards"], [data-tour="admin-reports-kpi-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 4: Clinic Overview - Overdue Follow-up & Vaccine Stock Action Cards (Image 4)
    {
      id: 'admin-reports-action-cards',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Overdue Follow-up & Vaccine Stock Action Cards',
      content:
        'Take quick clinical action: view patients with overdue doses and click "Open follow-up station" to manage patient reminders, or check low-stock and expiring vaccine batches and click "Open inventory" to manage storage.',
      targetSelector:
        '[data-walkthrough="admin-reports-action-cards"], [data-tour="admin-reports-action-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 5: Trends & Records - Visual Surveillance Analytics (Image 5)
    {
      id: 'admin-reports-trends-charts',
      module: 'Reports & Analytics',
      section: 'Trends & Records',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-trends"]',
      title: 'Monthly Bite Trends & Barangay Charts',
      content:
        'Visual epidemiology charts: see monthly bite episode trends broken down by severity category (Cat I, Cat II, Cat III), and see which incident barangays have the highest reported animal bite exposures.',
      targetSelector:
        '[data-walkthrough="admin-reports-trends-charts"], [data-tour="admin-reports-trends-charts"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: Trends & Records - Epidemiological Metrics & Clinic Records Table (Image 6)
    {
      id: 'admin-reports-clinic-records',
      module: 'Reports & Analytics',
      section: 'Trends & Records',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-trends"]',
      title: 'Detailed Clinic Records & Export Tools',
      content:
        'Inspect biting animal distributions and PEP dose progress. Below, browse individual clinic records by Bite Episodes, PEP Outcomes, Overdue Doses, Awaiting First Dose, or Referrals, and click "Print" or "Export CSV" for audit reporting.',
      targetSelector:
        '[data-walkthrough="admin-reports-clinic-records"], [data-tour="admin-reports-clinic-records"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 7: DOH Submissions - Rabies Exposure Registry (Weekly) (Image 7)
    {
      id: 'admin-reports-doh-registry',
      module: 'Reports & Analytics',
      section: 'DOH Submissions',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-doh"]',
      title: 'DOH Rabies Exposure Registry (Weekly)',
      content:
        'Official DOH weekly landscape registry recording patient demographics (male/female, age <15 or >=15), bite exposure categories, human rabies cases, TCV vaccine counts, HRIG/ERIG usage, and animal types. Click "Print report" for official submission.',
      targetSelector:
        '[data-walkthrough="admin-doh-card-exposure-registry"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 8: DOH Submissions - ABTC Monthly Report (Image 8)
    {
      id: 'admin-reports-doh-monthly',
      module: 'Reports & Analytics',
      section: 'DOH Submissions',
      route,
      activateSelector: '[data-walkthrough="admin-doh-card-monthly"]',
      title: 'DOH ABTC Monthly Report',
      content:
        'The mandatory monthly landscape report for the National Rabies Prevention and Control Program. It summarizes total bite cases by category, patients given PEP, completed treatments, and RIG administration per week. Click "Print report" to generate a clean printable copy.',
      targetSelector:
        '[data-walkthrough="admin-doh-card-monthly"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 9: DOH Submissions - Cohort Report (Quarterly) (Image 9)
    {
      id: 'admin-reports-doh-cohort',
      module: 'Reports & Analytics',
      section: 'DOH Submissions',
      route,
      activateSelector: '[data-walkthrough="admin-doh-card-cohort"]',
      title: 'DOH ABTC Cohort Report (Quarterly)',
      content:
        'The quarterly portrait cohort report tracking treatment completion rates across 1st, 2nd, 3rd, and 4th quarters. Calculates overall rabies treatment completion percentage and includes official signature blocks for the preparing officer and attending physician.',
      targetSelector:
        '[data-walkthrough="admin-doh-card-cohort"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 10: Patients - Registered Patients Registry (Image 10)
    {
      id: 'admin-reports-patients-registry',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-patients"]',
      title: 'Registered Patients Registry & CSV Export',
      content:
        'Browse all registered bite patients with filters for time period, registration month, and year. Search by patient name, contact number, or ID, and click "Export CSV" to download the patient list for record keeping.',
      targetSelector:
        '[data-walkthrough="admin-reports-patients-registry"], [data-tour="admin-reports-patients-registry"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 11: Vaccine Inventory & Wastage - Stock Metrics & Patient Usage (Image 11)
    {
      id: 'admin-reports-inventory-summary',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-inventory"]',
      title: 'Vaccine Inventory Metrics & Patient Usage',
      content:
        'Five summary cards highlight: Active Batches, Sealed Vials, Expiring Soon, Depleted Batches, and Expired Batches. Below, the Vaccine Usage by Patient table details unique patients served and vials administered per vaccine type.',
      targetSelector:
        '[data-walkthrough="admin-reports-inventory-patient-usage"], [data-walkthrough="admin-reports-inventory-kpis"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 12: Vaccine Inventory & Wastage - Comprehensive Batch Audit Log (Image 12)
    {
      id: 'admin-reports-inventory-audit-log',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-inventory"]',
      title: 'Comprehensive Batch Utilization & Wastage Audit Log',
      content:
        'Track every vaccine batch from delivery to disposal: monitor initial received stock, used doses, remaining sealed vials, open vial status, and recorded wastage. Click "Print Report" or "Export CSV" for audit reporting.',
      targetSelector:
        '[data-walkthrough="admin-reports-inventory-audit-log"], [data-tour="admin-reports-inventory-audit-log"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
  ];
}

export const REPORTS_ANALYTICS_STEPS: WalkthroughStep[] = [
  {
    id: 'reports-overview',
    module: 'Reports & Analytics',
    title: 'Reports & Analytics Overview',
    content:
      'Generate official clinic surveillance reports, animal bite epidemiology summaries, and vaccination compliance analytics for regulatory compliance and program evaluation.',
    route: ROUTES.REPORTS.LIST,
    targetSelector:
      '[data-tour="reports-summary-cards"], [data-walkthrough="reports-summary-cards"], .rr-overview-top-section',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'reports-tabs',
    module: 'Reports & Analytics',
    title: 'Report Category Tabs',
    content:
      'Switch between patient registries, bite incident summaries, vaccine utilization reports, and geospatial surveillance charts.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-category-tabs"], [data-walkthrough="reports-tabs"], .MuiTabs-root',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'reports-filters',
    module: 'Reports & Analytics',
    title: 'Report Period & Demographic Filters',
    content:
      'Configure reporting date ranges, barangay filters, and exposure categories to generate custom epidemiological cohorts.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-filter-controls"], [data-walkthrough="reports-filters"], .rr-filter-row',
    fallbackSelector: '.rr-filters-unified, main.page-content',
    placement: 'bottom',
  },
  {
    id: 'reports-charts',
    module: 'Reports & Analytics',
    title: 'Analytical Surveillance Visualizations',
    content:
      'Interactive charts illustrate monthly bite incident trends, category distributions, and completion rates of post-exposure rabies prophylaxis.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-tour="reports-charts"], [data-walkthrough="reports-charts"], .rr-surveillance-row-1',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
  {
    id: 'reports-actions',
    module: 'Reports & Analytics',
    title: 'Export & Print Official Reports',
    content:
      'Export compiled surveillance data as CSV or generate clean printable PDF reports formatted for Department of Health submissions.',
    route: ROUTES.REPORTS.LIST,
    targetSelector: '[data-walkthrough="reports-action-buttons"], .rr-header',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
];

export function getReportsAnalyticsSteps(roleOrRoute?: string, maybeRoute?: string): WalkthroughStep[] {
  let role: string | undefined = undefined;
  let route = ROUTES.REPORTS.LIST;

  if (roleOrRoute && roleOrRoute.startsWith('/')) {
    route = roleOrRoute;
  } else {
    role = roleOrRoute;
    if (maybeRoute) route = maybeRoute;
  }

  if (role === 'admin' || role === 'developer') {
    return getAdminReportsSteps(route);
  }

  return REPORTS_ANALYTICS_STEPS.map(step => ({ ...step, route }));
}
