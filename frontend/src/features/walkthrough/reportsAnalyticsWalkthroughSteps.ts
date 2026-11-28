import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// ── Administrator Reports & Analytics Steps (11 Steps) ──
export function getAdminReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    {
      id: 'admin-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: 'Reports & Analytics',
      content:
        'Generate clinic surveillance summaries, DOH submissions, patient registries, and vaccine stock reports.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'center',
    },
    {
      id: 'admin-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Report Tabs',
      content:
        'Switch between Clinic Overview, Trends & Records, DOH Submissions, Patients, and Vaccine Inventory & Wastage.',
      targetSelector:
        '[data-walkthrough="admin-reports-tabs"], [data-tour="admin-reports-tabs"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'admin-reports-filters',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Period & Category Filters',
      content:
        'Filter reports by date range and bite category, then apply or refresh to update the figures.',
      targetSelector:
        '[data-walkthrough="admin-reports-filters"], [data-tour="admin-reports-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'admin-reports-kpi-cards',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Overview Summary Cards',
      content:
        'Track Total Bite Episodes, PEP Completion rate, Overdue Doses, and Patients Awaiting Day 0 in one view.',
      targetSelector:
        '[data-walkthrough="admin-reports-kpi-cards"], [data-tour="admin-reports-kpi-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'admin-reports-action-cards',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Follow-up & Stock Action Cards',
      content:
        'Monitor overdue follow-ups and low or expiring vaccine stock, with quick links to manage each area.',
      targetSelector:
        '[data-walkthrough="admin-reports-action-cards"], [data-walkthrough="admin-reports-overdue-card"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'admin-reports-trends-charts',
      module: 'Reports & Analytics',
      section: 'Trends & Records',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-trends"]',
      title: 'Bite Trends & Barangay Charts',
      content:
        'Review monthly bite trends by severity category and barangays with the highest reported incidents.',
      targetSelector:
        '[data-walkthrough="admin-reports-trends-charts"], [data-tour="admin-reports-trends-charts"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'admin-reports-clinic-records',
      module: 'Reports & Analytics',
      section: 'Trends & Records',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-trends"]',
      title: 'Clinic Records & Export',
      content:
        'Browse detailed episode, outcome, overdue, and referral records, or print and export them to CSV.',
      targetSelector:
        '[data-walkthrough="admin-reports-clinic-records"], [data-tour="admin-reports-clinic-records"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'admin-reports-doh-submissions',
      module: 'Reports & Analytics',
      section: 'DOH Submissions',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-doh"]',
      title: 'DOH Submission Reports',
      content:
        'Select and print official DOH reports: Weekly Exposure Registry, Monthly ABTC Report, and Quarterly Cohort Report.',
      targetSelector:
        '[data-walkthrough="admin-doh-cards"], [data-walkthrough="admin-doh-card-exposure-registry"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'admin-reports-patients-registry',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-patients"]',
      title: 'Patient Registry',
      content:
        'Search, filter, and export registered patient profiles and intake dates.',
      targetSelector:
        '[data-walkthrough="admin-reports-patients-registry"], [data-tour="admin-reports-patients-registry"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'admin-reports-inventory-kpis',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-inventory"]',
      title: 'Vaccine Stock Summary Cards',
      content:
        'View Active Batches, Sealed Vials, Expiring Soon, Depleted, and Expired stock counts at a glance.',
      targetSelector:
        '[data-walkthrough="admin-reports-inventory-kpis"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'admin-reports-inventory-audit-log',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-inventory"]',
      title: 'Batch Usage & Wastage Log',
      content:
        'Review vaccine utilization, remaining vials, and wastage per batch, with Print and CSV export options.',
      targetSelector:
        '[data-walkthrough="admin-reports-inventory-audit-log"], [data-tour="admin-reports-inventory-audit-log"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
  ];
}

// ── Registration Staff Reports & Analytics Steps (8 Steps) ──
export function getRegistrationReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    {
      id: 'reg-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: 'Reports & Analytics',
      content:
        'Track PEP completion, overdue follow-ups, bite trends, and export official clinic reports.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'center',
    },
    {
      id: 'reg-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Report Tabs',
      content:
        'Switch between Overview, PEP & Follow-up, Bite Surveillance, and Clinic Summary.',
      targetSelector:
        '[data-walkthrough="reports-tabs"], [data-tour="reports-category-tabs"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'reg-reports-summary-cards',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Overview Summary Cards',
      content:
        'View PEP Course Completion, Follow-up Priorities, Average Time to First Dose, and Patients Needing Follow-up together.',
      targetSelector:
        '[data-walkthrough="reports-summary-cards"], [data-tour="reports-summary-cards"], .rr-overview-top-section',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'reg-reports-surveillance-filters',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Period & Category Filters',
      content:
        'Filter surveillance data by date range and bite severity category.',
      targetSelector:
        '[data-walkthrough="reg-reports-surveillance-filters"], .rr-filters-unified, [data-walkthrough="reports-filters"], .rr-filters',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'reg-reports-charts',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Surveillance Analytics Charts',
      content:
        'Review exposure categories over time, age and weekly patterns, barangay hotspots, and biting animal profiles.',
      targetSelector:
        '[data-walkthrough="reports-charts"], .rr-surveillance-charts-section, [data-walkthrough="reg-reports-chart-categories"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'reg-reports-pep',
      module: 'Reports & Analytics',
      section: 'PEP & Follow-up',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-pep"]',
      title: 'PEP & Follow-up Records',
      content:
        'Review PEP treatment outcomes, overdue follow-up queues, and patients awaiting their initial Day 0 dose.',
      targetSelector:
        '[data-walkthrough="reg-reports-pep-table-section"], [data-walkthrough="reg-reports-pep-tabs"], [data-walkthrough="reg-reports-pep-module"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'reg-reports-surveillance',
      module: 'Reports & Analytics',
      section: 'Bite Surveillance',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-surveillance"]',
      title: 'Bite Surveillance & Referrals',
      content:
        'Browse reported animal bite incident logs and inter-facility patient referrals.',
      targetSelector:
        '[data-walkthrough="reg-reports-surveillance-table-section"], [data-walkthrough="reg-reports-surveillance-tabs"], [data-walkthrough="reg-reports-surveillance-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'reg-reports-clinic-summary',
      module: 'Reports & Analytics',
      section: 'Clinic Summary',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-summary"]',
      title: 'Clinic Summary & Export',
      content:
        'Review key clinic metrics and use the header controls to Export CSV or Print official reports.',
      targetSelector:
        '[data-walkthrough="reg-reports-clinic-summary-table-section"], [data-walkthrough="reg-reports-clinic-summary"], [data-walkthrough="reports-action-buttons"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
  ];
}

// ── Doctor Reports & Clinical Analytics Steps (7 Steps) ──
export function getDoctorReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    {
      id: 'doctor-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: 'Clinical Reports & Analytics',
      content:
        'Review bite case statistics, treatment progress, patient registries, and print signed clinical reports.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'center',
    },
    {
      id: 'doctor-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Report Tabs',
      content:
        'Switch between Summary & Overview, Bite Cases, and Patients.',
      targetSelector:
        '[data-walkthrough="doctor-reports-tabs"], [data-tour="doctor-reports-tabs"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'doctor-reports-summary-filters',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Period & Location Filters',
      content:
        'Filter summary figures by date range, bite category, and location.',
      targetSelector:
        '[data-walkthrough="doctor-reports-summary-filters"], [data-tour="doctor-reports-summary-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'doctor-reports-summary-cards',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Summary & Category Cards',
      content:
        'View patient totals, bite cases, PEP progress, and Category I–III breakdowns. Click any card to drill down.',
      targetSelector:
        '[data-walkthrough="doctor-reports-summary-cards"], [data-walkthrough="doctor-reports-kpi-total-patients"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'doctor-reports-cases-table',
      module: 'Reports & Analytics',
      section: 'Bite Cases',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-cases"]',
      title: 'Bite Cases Records',
      content:
        'Search, filter, and export recorded bite case incidents by category, animal, status, or location.',
      targetSelector:
        '[data-walkthrough="doctor-reports-cases-table"], [data-tour="doctor-reports-cases-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'doctor-reports-patients-table',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-patients"]',
      title: 'Patient Registry',
      content:
        'Search, filter, and export registered patient profiles and intake dates.',
      targetSelector:
        '[data-walkthrough="doctor-reports-patients-table"], [data-tour="doctor-reports-patients-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'doctor-reports-print-action',
      module: 'Reports & Analytics',
      section: 'Export & Print',
      route,
      title: 'Print Official Report',
      content:
        'Preview and print a formatted clinical report with the Attending Physician endorsement block.',
      targetSelector:
        '[data-walkthrough="doctor-reports-print-btn"], [data-tour="doctor-reports-print-btn"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
  ];
}

// ── Treatment Nurse Reports & Analytics Steps (9 Steps) ──
export function getTreatmentNurseReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    {
      id: 'nurse-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: 'Treatment Reports & Analytics',
      content:
        'Monitor patient intakes, bite categories, follow-up progress, and vaccine stock utilization.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'center',
    },
    {
      id: 'nurse-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Report Tabs',
      content:
        'Switch between Summary & Overview, Bite Cases, Patients, and Vaccine Inventory & Wastage.',
      targetSelector:
        '[data-walkthrough="nurse-reports-tabs"], [data-tour="nurse-reports-tabs"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'nurse-reports-summary-filters',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Period & Location Filters',
      content:
        'Filter summary figures by date range, bite category, and barangay or purok.',
      targetSelector:
        '[data-walkthrough="nurse-reports-summary-filters"], [data-tour="nurse-reports-summary-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'nurse-reports-summary-cards',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Summary & Category Cards',
      content:
        'View patient totals, bite cases, PEP progress, and Category I–III breakdowns. Click any card to drill down.',
      targetSelector:
        '[data-walkthrough="nurse-reports-summary-cards"], [data-walkthrough="nurse-reports-kpi-total-patients"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'nurse-reports-cases-table',
      module: 'Reports & Analytics',
      section: 'Bite Cases',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-cases"]',
      title: 'Bite Cases Records',
      content:
        'Search, filter, and export recorded bite case incidents by category, animal, status, or location.',
      targetSelector:
        '[data-walkthrough="nurse-reports-cases-table"], [data-tour="nurse-reports-cases-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'nurse-reports-patients-table',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-patients"]',
      title: 'Patient Registry',
      content:
        'Search, inspect, and export registered patient records.',
      targetSelector:
        '[data-walkthrough="nurse-reports-patients-table"], [data-tour="nurse-reports-patients-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'nurse-reports-inventory-kpis',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Vaccine Stock Summary Cards',
      content:
        'View Active Batches, Sealed Vials, Expiring Soon, Depleted, and Expired stock counts in one view.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inventory-kpis"], [data-walkthrough="nurse-reports-inv-active-batches"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'nurse-reports-inventory-table',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Batch Usage & Wastage Log',
      content:
        'Filter and export batch-level stock utilization, remaining vials, and wastage logs.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inventory-table"], [data-tour="nurse-reports-inventory-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'nurse-reports-print-action',
      module: 'Reports & Analytics',
      section: 'Export & Print',
      route,
      title: 'Print Official Report',
      content:
        'Generate a formatted printable report with the Clinic Nurse sign-off block.',
      targetSelector:
        '[data-walkthrough="nurse-reports-print-btn"], [data-tour="nurse-reports-print-btn"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
  ];
}

export const REPORTS_ANALYTICS_STEPS: WalkthroughStep[] = getRegistrationReportsSteps();

export function getReportsAnalyticsSteps(roleOrRoute?: string, maybeRoute?: string): WalkthroughStep[] {
  let role: string | undefined = undefined;
  let route: string = ROUTES.REPORTS.LIST;

  if (roleOrRoute && roleOrRoute.startsWith('/')) {
    route = roleOrRoute;
  } else {
    role = roleOrRoute;
    if (maybeRoute) route = maybeRoute;
  }

  const normalizedRole = role?.toLowerCase();

  if (normalizedRole === 'admin' || normalizedRole === 'developer') {
    return getAdminReportsSteps(route);
  }

  if (normalizedRole === 'registration') {
    return getRegistrationReportsSteps(route);
  }

  if (normalizedRole === 'triage' || normalizedRole === 'doctor') {
    return getDoctorReportsSteps(route);
  }

  if (normalizedRole === 'treatment' || normalizedRole === 'nurse') {
    return getTreatmentNurseReportsSteps(route);
  }

  return getRegistrationReportsSteps(route);
}
