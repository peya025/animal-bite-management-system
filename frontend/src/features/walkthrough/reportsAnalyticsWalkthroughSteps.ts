import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

// ── Administrator Reports & Analytics Steps ──
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
      placement: 'center',
    },

    // Step 2: Navigation Tabs
    {
      id: 'admin-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Reports & Analytics Navigation Tabs',
      content:
        'Easily switch between five reporting sections: Clinic Overview (summary metrics & stock status), Trends & Records (epidemiological charts & logs), DOH Submissions (official government reports), Patients registry, and Vaccine Inventory & Wastage.',
      targetSelector:
        '[data-walkthrough="admin-reports-tabs"], [data-tour="admin-reports-tabs"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 3: Clinic Overview - Period & Exposure Filters
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

    // Step 4: Clinic Overview - Key Summary Metrics
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

    // Step 5: Clinic Overview - Overdue Dose Follow-up Card
    {
      id: 'admin-reports-overdue-card',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Overdue Dose Follow-up Card',
      content:
        'Monitor bite patients who missed scheduled vaccine appointments (Day 3, 7, etc.). Review days overdue, contact details, and reminder statuses. Click "Open follow-up station" to manage outreach or "View all" for the full list.',
      targetSelector:
        '[data-walkthrough="admin-reports-overdue-card"], [data-tour="admin-reports-overdue-card"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: Clinic Overview - Vaccine Stock Action Card
    {
      id: 'admin-reports-vaccine-stock-card',
      module: 'Reports & Analytics',
      section: 'Clinic Overview',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-overview"]',
      title: 'Vaccine Stock Action Card',
      content:
        'Check current inventory warnings: low-stock batches, batches expiring within 30 days, and expired batches. Click "Open inventory" to access the full vaccine management and stock replenishment module.',
      targetSelector:
        '[data-walkthrough="admin-reports-vaccine-stock-card"], [data-tour="admin-reports-vaccine-stock-card"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: Trends & Records - Visual Surveillance Analytics
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
      placement: 'bottom',
    },

    // Step 7: Trends & Records - Epidemiological Metrics & Clinic Records Table
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

    // Step 8: DOH Submissions - Rabies Exposure Registry (Weekly)
    {
      id: 'admin-reports-doh-registry',
      module: 'Reports & Analytics',
      section: 'DOH Submissions',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-doh"], [data-walkthrough="admin-doh-card-exposure-registry"]',
      title: 'DOH Rabies Exposure Registry (Weekly)',
      content:
        'Official DOH weekly landscape registry recording patient demographics (male/female, age <15 or >=15), bite exposure categories, human rabies cases, TCV vaccine counts, HRIG/ERIG usage, and animal types. Click "Print report" for official submission.',
      targetSelector:
        '[data-walkthrough="admin-doh-card-exposure-registry"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 9: DOH Submissions - ABTC Monthly Report
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

    // Step 11: DOH Submissions - Cohort Report (Quarterly)
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

    // Step 12: Patients - Search & Filters
    {
      id: 'admin-reports-patients-filters',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-patients"]',
      title: 'Patient Registry Search & Filters',
      content:
        'Filter patients by time period, registration month, or year, or search directly by patient name, contact number, or ID to quickly locate specific bite cases.',
      targetSelector:
        '[data-walkthrough="admin-reports-patients-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 13: Patients - Registered Patients Registry Table & CSV Export
    {
      id: 'admin-reports-patients-registry',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-patients"]',
      title: 'Registered Patients Registry & CSV Export',
      content:
        'Browse all registered bite patients with patient numbers, full names, dates of birth, contact information, and registration dates. Click "Export CSV" to download the patient list for record keeping.',
      targetSelector:
        '[data-walkthrough="admin-reports-patients-registry"], [data-tour="admin-reports-patients-registry"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 14: Vaccine Inventory & Wastage - Stock Metrics Summary
    {
      id: 'admin-reports-inventory-kpis',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-inventory"]',
      title: 'Vaccine Stock Metrics Summary',
      content:
        'Five summary cards highlight stock status: Active Batches, Sealed Vials in stock, Batches Expiring Soon (≤ 60 days), Depleted Batches, and Expired Batches.',
      targetSelector:
        '[data-walkthrough="admin-reports-inventory-kpis"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 15: Vaccine Inventory & Wastage - Patient Usage Distribution
    {
      id: 'admin-reports-inventory-patient-usage',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="admin-reports-tab-inventory"]',
      title: 'Vaccine Usage by Patient Distribution',
      content:
        'Monitor how clinic vaccines are utilized across patients: view unique patients served, total vials administered, and average vials per patient broken down by vaccine type.',
      targetSelector:
        '[data-walkthrough="admin-reports-inventory-patient-usage"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 16: Vaccine Inventory & Wastage - Comprehensive Batch Audit Log
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

// ── Registration Staff Reports & Analytics Steps ──
export function getRegistrationReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    // Step 1: Centered Welcome / Overview Modal with blur backdrop
    {
      id: 'reg-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: 'Reports & Analytics Overview',
      content:
        'Welcome to Reports & Analytics! Track post-exposure prophylaxis (PEP) treatment completion, follow-up queues for overdue doses, bite epidemiology trends, and generate official audit reports for registration compliance.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'center',
    },

    // Step 2: Registration Navigation Tabs
    {
      id: 'reg-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Registration Reports Navigation Tabs',
      content:
        'Switch between four registration reporting sections: Overview (priority KPIs & charts), PEP & Follow-up (patient outcomes & overdue queues), Bite Surveillance (incident logs & transfers), and Clinic Summary.',
      targetSelector:
        '[data-walkthrough="reports-tabs"], [data-tour="reports-category-tabs"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 3: Overview - PEP Vaccine-Course Completion Card
    {
      id: 'reg-reports-kpi-completion',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'PEP Course Completion KPI',
      content:
        'High-level clinical outcome metric: monitors the percentage and exact count of bite patients who completed their full prescribed post-exposure prophylaxis course among eligible cases.',
      targetSelector:
        '[data-walkthrough="reg-reports-kpi-completion"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 4: Overview - Follow-up Priorities Today Card
    {
      id: 'reg-reports-kpi-priorities',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Follow-up Priorities Today',
      content:
        'Immediate priority alert tracking bite patients who urgently require contact: view counts for overdue prescribed doses (Day 3, 7, etc.) and patients awaiting their initial Day 0 dose.',
      targetSelector:
        '[data-walkthrough="reg-reports-kpi-priorities"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 5: Overview - Average Time to First Dose Card
    {
      id: 'reg-reports-kpi-delay',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Average Time to First Dose (D0)',
      content:
        'Timeliness quality indicator: measures elapsed days from animal bite exposure to the administration of the initial vaccination dose, including the median and range.',
      targetSelector:
        '[data-walkthrough="reg-reports-kpi-delay"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: Overview - Patients Needing Follow-up Card
    {
      id: 'reg-reports-kpi-followup',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Patients Needing Follow-up',
      content:
        'Real-time count of patients with overdue doses who require proactive outreach or SMS reminders to prevent treatment dropout and ensure rabies immunity.',
      targetSelector:
        '[data-walkthrough="reg-reports-kpi-followup"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 7: Overview - Surveillance Period & Category Filters
    {
      id: 'reg-reports-surveillance-filters',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Surveillance Period & Category Filters',
      content:
        'Filter surveillance cohorts by time period (Today, This week, This month, This year, or Custom date range) and bite severity Category (All, Category I, II, or III). Click "Apply" to recalculate.',
      targetSelector:
        '[data-walkthrough="reg-reports-surveillance-filters"], .rr-filters-unified, [data-walkthrough="reports-filters"], .rr-filters',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 8: Overview - Exposure Categories Over Time Chart
    {
      id: 'reg-reports-chart-categories',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Exposure Categories Over Time Chart',
      content:
        'Visual epidemiology chart displaying monthly bite exposure trends stacked by Category I (scratch), Category II (minor bite/scratch), and Category III (severe transdermal bites/scratches).',
      targetSelector:
        '[data-walkthrough="reg-reports-chart-categories"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 9: Overview - Patient Age Brackets & Weekly Patterns
    {
      id: 'reg-reports-chart-demographics',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Patient Age Brackets & Weekly Bite Patterns',
      content:
        'Demographic and temporal surveillance: examine patient vulnerability across age brackets (children, adolescents, adults, seniors) alongside bite incident distribution across days of the week to detect peak exposure days.',
      targetSelector:
        '[data-walkthrough="reg-reports-chart-demographics"], .rr-demographics-pair',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 10: Overview - Barangay Hotspots & Animal Characteristics
    {
      id: 'reg-reports-demographics',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Barangay Hotspots & Animal Characteristics',
      content:
        'Local rabies exposure factors across Tagoloan: identify incident barangays with the highest bite counts, inspect biting animal species, domestic vs stray animal ownership, and 14-day observation status.',
      targetSelector:
        '[data-walkthrough="reg-reports-demographics"], .rr-surveillance-row-2',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 11: PEP & Follow-up - PEP Treatment Outcomes
    {
      id: 'reg-reports-pep-outcomes',
      module: 'Reports & Analytics',
      section: 'PEP & Follow-up',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-pep"], [data-walkthrough="reg-reports-subtab-pep"]',
      title: 'PEP Treatment Outcomes Registry',
      content:
        'Review individual patient treatment completion records: browse completed post-exposure prophylaxis courses, required vs received doses, completion dates, and verified clinical outcomes.',
      targetSelector:
        '[data-walkthrough="reg-reports-pep-table-section"], [data-walkthrough="reg-reports-pep-tabs"], [data-walkthrough="reg-reports-pep-module"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 12: PEP & Follow-up - Overdue Patients Follow-up Queue
    {
      id: 'reg-reports-pep-overdue',
      module: 'Reports & Analytics',
      section: 'PEP & Follow-up',
      route,
      activateSelector: '[data-walkthrough="reg-reports-subtab-followup"]',
      title: 'Overdue Patients Follow-up Queue',
      content:
        'Act on patients with missed vaccination doses: view case numbers, patient names, direct contact numbers, scheduled dose number, days overdue, and last reminder status to facilitate prompt clinical follow-ups.',
      targetSelector:
        '[data-walkthrough="reg-reports-pep-table-section"], [data-walkthrough="reg-reports-pep-tabs"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 13: PEP & Follow-up - Awaiting Day 0 (Initial Dose) Queue
    {
      id: 'reg-reports-pep-awaiting',
      module: 'Reports & Analytics',
      section: 'PEP & Follow-up',
      route,
      activateSelector: '[data-walkthrough="reg-reports-subtab-awaiting"]',
      title: 'Awaiting Day 0 (Initial Dose) Queue',
      content:
        'Track registered bite cases with an ordered PEP regimen that have not yet received their initial Day 0 dose. Review incident dates and patient contact information to prevent treatment delays.',
      targetSelector:
        '[data-walkthrough="reg-reports-pep-table-section"], [data-walkthrough="reg-reports-pep-tabs"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 14: Bite Surveillance - Incident Registry Logs
    {
      id: 'reg-reports-surveillance-incidents',
      module: 'Reports & Analytics',
      section: 'Bite Surveillance',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-surveillance"], [data-walkthrough="reg-reports-subtab-surveillance"]',
      title: 'Bite Surveillance Incident Registry & Logs',
      content:
        'Official registry log of all reported animal bite incidents: view case numbers, exposure severity categories, animal type, incident barangay, and current vaccination follow-up status.',
      targetSelector:
        '[data-walkthrough="reg-reports-surveillance-table-section"], [data-walkthrough="reg-reports-surveillance-tabs"], [data-walkthrough="reg-reports-surveillance-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 15: Bite Surveillance - Referrals & Transfers
    {
      id: 'reg-reports-surveillance-referrals',
      module: 'Reports & Analytics',
      section: 'Bite Surveillance',
      route,
      activateSelector: '[data-walkthrough="reg-reports-subtab-referrals"]',
      title: 'Referrals & Transfers Records',
      content:
        'Log and monitor inter-facility patient transfers: inspect transfer destinations, clinical referral reasons, transfer dates, and recorded outcomes for patients sent to secondary or tertiary medical centers.',
      targetSelector:
        '[data-walkthrough="reg-reports-surveillance-table-section"], [data-walkthrough="reg-reports-surveillance-tabs"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 16: Clinic Summary - Key Metrics Table
    {
      id: 'reg-reports-clinic-summary',
      module: 'Reports & Analytics',
      section: 'Clinic Summary',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-summary"]',
      title: 'Clinic Summary (Key Metrics)',
      content:
        'Structured summary table compiling essential administrative and operational benchmarks: total patients, bite episodes, category breakdowns, PEP starts, and eligible completion rates for formal audit reviews.',
      targetSelector:
        '[data-walkthrough="reg-reports-clinic-summary-table-section"], [data-walkthrough="reg-reports-clinic-summary-header"], [data-walkthrough="reg-reports-clinic-summary"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 17: Export CSV & Print Official Reports
    {
      id: 'reg-reports-actions',
      module: 'Reports & Analytics',
      section: 'Export & Print',
      route,
      title: 'Export CSV & Print Official Reports',
      content:
        'Generate and export official clinic reports anytime. Click "Export CSV" to download the current filtered dataset for spreadsheet analysis, or click "Print Report" to produce clean, formatted printouts with clinic headers.',
      targetSelector:
        '[data-walkthrough="reports-action-buttons"], .rr-header',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
  ];
}

// ── Doctor Reports & Clinical Analytics Steps ──
export function getDoctorReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    // Step 1: Uniform Welcome / Overview Modal (Centered in viewport)
    {
      id: 'doctor-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: "Doctor's Reports & Clinical Analytics",
      content:
        'Welcome to Clinical Reports & Analytics! Review aggregate bite case statistics, track treatment progress, audit patient registry records, inspect exposure categories, and generate signed clinical reports.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'center',
    },

    // Step 2: Clinical Reporting Navigation Tabs
    {
      id: 'doctor-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Clinical Reporting Navigation Tabs',
      content:
        'Switch between the three doctor-accessible clinical reporting sections: Summary & Overview (key figures & category breakdowns), Bite Cases (detailed incident case records), and Patients (registered bite patient profiles).',
      targetSelector:
        '[data-walkthrough="doctor-reports-tabs"], [data-tour="doctor-reports-tabs"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 3: Summary & Overview - Clinical Period & Category Filters
    {
      id: 'doctor-reports-summary-filters',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Clinical Period & Category Filters',
      content:
        'Filter summary statistics by time period (All Time, Today, This Week, This Month), exposure category (All, Category I, II, or III), and geographic location (Municipality, Barangay, Purok). Click "Apply Filters" to refresh the metrics.',
      targetSelector:
        '[data-walkthrough="doctor-reports-summary-filters"], [data-tour="doctor-reports-summary-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 4: Summary & Overview - Total Patients Metric
    {
      id: 'doctor-reports-kpi-total-patients',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Total Patients Metric',
      content:
        'All-time volume of unique patient profiles registered in the animal bite clinic registry. Click this card anytime to open a filtered drilldown table showing individual patient records.',
      targetSelector:
        '[data-walkthrough="doctor-reports-kpi-total-patients"], [data-tour="doctor-reports-kpi-total-patients"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 5: Summary & Overview - Total Bite Cases Metric
    {
      id: 'doctor-reports-kpi-total-cases',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Total Bite Cases Metric',
      content:
        'Cumulative animal bite incident episodes documented across all reporting periods. Click to display an audit table of all recorded bite incidents.',
      targetSelector:
        '[data-walkthrough="doctor-reports-kpi-total-cases"], [data-tour="doctor-reports-kpi-total-cases"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 6: Summary & Overview - New Patients in Period Card
    {
      id: 'doctor-reports-kpi-new-patients',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'New Patients in Period',
      content:
        'New patient intake volume registered within the active date filter. Useful for tracking weekly and monthly clinic admission volume. Click to view intake records.',
      targetSelector:
        '[data-walkthrough="doctor-reports-kpi-new-patients"], [data-tour="doctor-reports-kpi-new-patients"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 7: Summary & Overview - New Cases in Period Card
    {
      id: 'doctor-reports-kpi-new-cases',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'New Bite Cases in Period',
      content:
        'New bite exposure incidents reported within the filtered period. Allows clinicians to detect sudden surges in animal bite episodes. Click to inspect incident details.',
      targetSelector:
        '[data-walkthrough="doctor-reports-kpi-new-cases"], [data-tour="doctor-reports-kpi-new-cases"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 8: Summary & Overview - Completed PEP Treatments Card
    {
      id: 'doctor-reports-kpi-completed',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Completed PEP Treatments',
      content:
        'Count of bite patients who completed their full prescribed anti-rabies vaccination regimen (Day 0 through Day 28/last scheduled dose). Click to inspect completed patient courses.',
      targetSelector:
        '[data-walkthrough="doctor-reports-kpi-completed"], [data-tour="doctor-reports-kpi-completed"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 9: Summary & Overview - On-going Treatments Caseload Card
    {
      id: 'doctor-reports-kpi-ongoing',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'On-going Treatments Caseload',
      content:
        'Active clinical caseload of patients currently in the middle of their post-exposure prophylaxis schedule. Click to review active patients who require ongoing monitoring and follow-up.',
      targetSelector:
        '[data-walkthrough="doctor-reports-kpi-ongoing"], [data-tour="doctor-reports-kpi-ongoing"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 10: Summary & Overview - Category I Card
    {
      id: 'doctor-reports-category-1',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Category I: Minor Exposure',
      content:
        'WHO/DOH Category I exposures: touching or feeding animals, licks on intact skin (no lesion or exposure). Requires wound washing with soap and water; PEP vaccination is not indicated.',
      targetSelector:
        '[data-walkthrough="doctor-reports-category-1"], [data-tour="doctor-reports-category-1"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 11: Summary & Overview - Category II Card
    {
      id: 'doctor-reports-category-2',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Category II: Moderate Exposure',
      content:
        'WHO/DOH Category II exposures: nibbling of uncovered skin, minor scratches or abrasions without bleeding. Immediate wound washing and a complete anti-rabies vaccine (PEP) course are required.',
      targetSelector:
        '[data-walkthrough="doctor-reports-category-2"], [data-tour="doctor-reports-category-2"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 12: Summary & Overview - Category III Card
    {
      id: 'doctor-reports-category-3',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Category III: Severe Exposure',
      content:
        'WHO/DOH Category III exposures: single or multiple transdermal bites or scratches, licks on broken skin, or mucous membrane contamination. Requires immediate PEP vaccination plus Rabies Immune Globulin (RIG).',
      targetSelector:
        '[data-walkthrough="doctor-reports-category-3"], [data-tour="doctor-reports-category-3"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 13: Bite Cases - Search & Clinical Filters
    {
      id: 'doctor-reports-cases-filters',
      module: 'Reports & Analytics',
      section: 'Bite Cases',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-cases"]',
      title: 'Bite Cases Search & Clinical Filters',
      content:
        'Search bite cases by patient name or case number, and filter by reporting period, exposure category, biting animal species (Dog, Cat, Others), case status (Completed, Ongoing, Transferred), and incident location.',
      targetSelector:
        '[data-walkthrough="doctor-reports-cases-filters"], [data-tour="doctor-reports-cases-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 14: Bite Cases - Incident Records Table & CSV Export
    {
      id: 'doctor-reports-cases-table',
      module: 'Reports & Analytics',
      section: 'Bite Cases',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-cases"]',
      title: 'Bite Case Incident Records Table & CSV Export',
      content:
        'Browse paginated bite case incident records showing patient names, case numbers, severity categories, biting animals, exposure locations, status, and registration dates. Click "Export CSV" to download the case records.',
      targetSelector:
        '[data-walkthrough="doctor-reports-cases-table"], [data-tour="doctor-reports-cases-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 15: Patients - Patient Registry Search & Date Filters
    {
      id: 'doctor-reports-patients-filters',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-patients"]',
      title: 'Patient Registry Search & Date Filters',
      content:
        'Search registered patients by name, contact number, or patient ID. Filter intake records by registration period, specific month, or registration year.',
      targetSelector:
        '[data-walkthrough="doctor-reports-patients-filters"], [data-tour="doctor-reports-patients-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 16: Patients - Registered Patients Registry Table & CSV Export
    {
      id: 'doctor-reports-patients-table',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-patients"]',
      title: 'Registered Patients Registry Table & CSV Export',
      content:
        'Complete patient demographic registry displaying full names, dates of birth, contact numbers, and intake dates. Click "Export CSV" to generate a spreadsheet export for clinical audits.',
      targetSelector:
        '[data-walkthrough="doctor-reports-patients-table"], [data-tour="doctor-reports-patients-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 17: Top Header - Print Official Clinical Report
    {
      id: 'doctor-reports-print-action',
      module: 'Reports & Analytics',
      section: 'Export & Print',
      route,
      title: 'Print Official Report with Physician Endorsement',
      content:
        'Click "Print Report" in the top header to preview a formal, boxed-table report formatted with the official Republic of the Philippines health header, active filter summaries, and the Attending Physician / Medical Officer approval block.',
      targetSelector:
        '[data-walkthrough="doctor-reports-print-btn"], [data-tour="doctor-reports-print-btn"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
  ];
}

// ── Treatment Nurse Reports & Analytics Steps ──
export function getTreatmentNurseReportsSteps(route: string = ROUTES.REPORTS.LIST): WalkthroughStep[] {
  return [
    // Step 1: Uniform Welcome / Overview Modal (Centered in viewport)
    {
      id: 'nurse-reports-overview',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      title: 'Treatment Nurse Reports & Analytics',
      content:
        'Welcome to Reports & Analytics! Monitor clinic patient intakes, bite exposure categories, follow-up dose progress, and vaccine batch stock utilization and wastage compliance.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'center',
    },

    // Step 2: Operational Navigation Tabs
    {
      id: 'nurse-reports-tabs',
      module: 'Reports & Analytics',
      section: 'Navigation',
      route,
      title: 'Treatment Reporting Navigation Tabs',
      content:
        'Navigate between four operational reporting sections: Summary & Overview, Bite Cases, Patients, and Vaccine Inventory & Wastage.',
      targetSelector:
        '[data-walkthrough="nurse-reports-tabs"], [data-tour="nurse-reports-tabs"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 3: Summary & Overview - Surveillance Period & Location Filters
    {
      id: 'nurse-reports-summary-filters',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Surveillance Period & Location Filters',
      content:
        'Filter summary analytics by time period, bite exposure severity category, and geographic barangay or purok to pinpoint local rabies surveillance patterns.',
      targetSelector:
        '[data-walkthrough="nurse-reports-summary-filters"], [data-tour="nurse-reports-summary-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 4: Summary & Overview - Total Patients Metric
    {
      id: 'nurse-reports-kpi-total-patients',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Total Patients Metric',
      content:
        'Total registered bite patients in the clinic records. Click to open an audit drilldown table showing individual patient records.',
      targetSelector:
        '[data-walkthrough="nurse-reports-kpi-total-patients"], [data-tour="nurse-reports-kpi-total-patients"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 5: Summary & Overview - Total Bite Cases Metric
    {
      id: 'nurse-reports-kpi-total-cases',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Total Bite Cases Metric',
      content:
        'Cumulative animal bite incidents registered in the clinic database. Click to review all recorded case records.',
      targetSelector:
        '[data-walkthrough="nurse-reports-kpi-total-cases"], [data-tour="nurse-reports-kpi-total-cases"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 6: Summary & Overview - New Patients in Period
    {
      id: 'nurse-reports-kpi-new-patients',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'New Patients in Period',
      content:
        'Number of newly registered patients during the selected reporting period. Click to open the patient intake drilldown.',
      targetSelector:
        '[data-walkthrough="nurse-reports-kpi-new-patients"], [data-tour="nurse-reports-kpi-new-patients"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 7: Summary & Overview - New Cases in Period
    {
      id: 'nurse-reports-kpi-new-cases',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'New Bite Cases in Period',
      content:
        'Newly reported bite exposure incidents in the active period. Click to inspect incident case details.',
      targetSelector:
        '[data-walkthrough="nurse-reports-kpi-new-cases"], [data-tour="nurse-reports-kpi-new-cases"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 8: Summary & Overview - Completed PEP Courses
    {
      id: 'nurse-reports-kpi-completed',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Completed PEP Courses',
      content:
        'Patients who successfully finished their multi-dose post-exposure rabies prophylaxis series. Click to audit completed cases.',
      targetSelector:
        '[data-walkthrough="nurse-reports-kpi-completed"], [data-tour="nurse-reports-kpi-completed"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 9: Summary & Overview - On-going Treatments
    {
      id: 'nurse-reports-kpi-ongoing',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'On-going Treatments Caseload',
      content:
        'Patients currently receiving ongoing vaccine doses on their scheduled appointment days. Click to monitor patients who need follow-up.',
      targetSelector:
        '[data-walkthrough="nurse-reports-kpi-ongoing"], [data-tour="nurse-reports-kpi-ongoing"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 10: Summary & Overview - Category I Card
    {
      id: 'nurse-reports-category-1',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Category I: Minor Exposure',
      content:
        'Category I exposures: touches or licks on intact skin (no lesion or exposure). Requires soap-and-water washing; no vaccine required. Click to inspect Category I incidents.',
      targetSelector:
        '[data-walkthrough="nurse-reports-category-1"], [data-tour="nurse-reports-category-1"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 11: Summary & Overview - Category II Card
    {
      id: 'nurse-reports-category-2',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Category II: Moderate Exposure',
      content:
        'Category II exposures: minor scratches or abrasions without bleeding. Full anti-rabies vaccine course is required. Click to inspect Category II records.',
      targetSelector:
        '[data-walkthrough="nurse-reports-category-2"], [data-tour="nurse-reports-category-2"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 12: Summary & Overview - Category III Card
    {
      id: 'nurse-reports-category-3',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Category III: Severe Exposure',
      content:
        'Category III exposures: transdermal bites, scratches, or mucous membrane contamination. Requires immediate PEP anti-rabies vaccine and RIG. Click to inspect Category III records.',
      targetSelector:
        '[data-walkthrough="nurse-reports-category-3"], [data-tour="nurse-reports-category-3"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 13: Bite Cases - Search & Status Filters
    {
      id: 'nurse-reports-cases-filters',
      module: 'Reports & Analytics',
      section: 'Bite Cases',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-cases"]',
      title: 'Bite Cases Search & Status Filters',
      content:
        'Search bite cases by patient name or case number. Filter by exposure period, severity category, animal species, treatment status (Ongoing, Completed, Transferred Out), or location.',
      targetSelector:
        '[data-walkthrough="nurse-reports-cases-filters"], [data-tour="nurse-reports-cases-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 14: Bite Cases - Detailed Incident Records Table & CSV Export
    {
      id: 'nurse-reports-cases-table',
      module: 'Reports & Analytics',
      section: 'Bite Cases',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-cases"]',
      title: 'Bite Incident Case Records & CSV Export',
      content:
        'Paginated log of recorded bite cases showing patient name, case number, category, biting animal, exposure site, and status. Click "Export CSV" to download the case records.',
      targetSelector:
        '[data-walkthrough="nurse-reports-cases-table"], [data-tour="nurse-reports-cases-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 15: Patients - Registered Patients Registry & Lookup
    {
      id: 'nurse-reports-patients-table',
      module: 'Reports & Analytics',
      section: 'Patients',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-patients"]',
      title: 'Registered Patients Registry & Lookup',
      content:
        'Search and inspect registered patient records with date of birth, contact number, and intake date. Click "Export CSV" to export patient data.',
      targetSelector:
        '[data-walkthrough="nurse-reports-patients-table"], [data-tour="nurse-reports-patients-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 16: Vaccine Inventory & Wastage - Stock Expiration & Category Filters
    {
      id: 'nurse-reports-inventory-filters',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Vaccine Inventory & Expiration Filters',
      content:
        'Filter vaccine stock by supplier, vaccine category/type, and expiration thresholds (≤30, ≤60, ≤90 days, or expired batches) to ensure FIFO compliance and prevent stockouts.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inventory-filters"], [data-tour="nurse-reports-inventory-filters"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 17: Vaccine Inventory & Wastage - Active Batches
    {
      id: 'nurse-reports-inv-active-batches',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Active Vaccine Batches',
      content:
        'Count of currently active, non-expired vaccine lots available for clinical administration across the clinic.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inv-active-batches"], [data-tour="nurse-reports-inv-active-batches"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 18: Vaccine Inventory & Wastage - Total Sealed Vials
    {
      id: 'nurse-reports-inv-total-stock',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Total Sealed Vials in Storage',
      content:
        'Total sealed anti-rabies vaccine vials currently on hand in the cold chain refrigerator.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inv-total-stock"], [data-tour="nurse-reports-inv-total-stock"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 19: Vaccine Inventory & Wastage - Expiring Batches Soon
    {
      id: 'nurse-reports-inv-expiring-soon',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Batches Expiring Soon (≤ 60 Days)',
      content:
        'Critical FIFO quality metric: monitors vaccine batches nearing expiration within 60 days to prioritize usage and prevent wastage.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inv-expiring-soon"], [data-tour="nurse-reports-inv-expiring-soon"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 20: Vaccine Inventory & Wastage - Depleted Batches
    {
      id: 'nurse-reports-inv-depleted',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Depleted Vaccine Batches',
      content:
        'Historical record of completely consumed vaccine batch lots that have zero remaining doses.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inv-depleted"], [data-tour="nurse-reports-inv-depleted"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 21: Vaccine Inventory & Wastage - Expired Batches
    {
      id: 'nurse-reports-inv-expired',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Expired Vaccine Batches',
      content:
        'Expired vaccine batch lots safely quarantined from patient use pending disposal or return protocol compliance.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inv-expired"], [data-tour="nurse-reports-inv-expired"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 22: Vaccine Inventory & Wastage - Batch Utilization & Wastage Audit Log
    {
      id: 'nurse-reports-inventory-table',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Comprehensive Batch Utilization & Wastage Audit Log',
      content:
        'Full batch-level audit log: track received vials, administered doses, remaining sealed vials, open vial remaining doses, and discarded wastage per batch lot. Click "Export CSV" for inventory audits.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inventory-table"], [data-tour="nurse-reports-inventory-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 23: Top Header - Print Official Report with Nurse Sign-off
    {
      id: 'nurse-reports-print-action',
      module: 'Reports & Analytics',
      section: 'Export & Print',
      route,
      title: 'Print Official Report with Nurse Sign-off',
      content:
        'Click "Print Report" in the top header to generate a formal boxed-table document with clinic letterhead, audit data, and the Clinic Nurse / Inventory Officer signature block.',
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
