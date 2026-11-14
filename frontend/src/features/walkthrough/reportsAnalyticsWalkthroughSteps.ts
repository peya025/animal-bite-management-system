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
        'Switch between four registration reporting sections: Overview (priority actions & charts), PEP & Follow-up (outcomes & overdue queues), Bite Surveillance (incident logs & transfers), and Clinic Summary.',
      targetSelector:
        '[data-walkthrough="reports-tabs"], [data-tour="reports-category-tabs"], .MuiTabs-root',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 3: Overview - Priority Actions & High-level KPIs
    {
      id: 'reg-reports-summary-cards',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Priority Follow-up Actions & High-level KPIs',
      content:
        'Immediate priority alerts and high-level KPIs: review patients with overdue doses or awaiting initial Day 0 doses with direct action buttons, alongside overall PEP vaccine-course completion rates and average time to first dose.',
      targetSelector:
        '[data-walkthrough="reg-reports-overview-kpis"], [data-walkthrough="reports-summary-cards"], .rr-overview-top-section',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 4: Overview - Bite Surveillance Analytics & Temporal Trends
    {
      id: 'reg-reports-surveillance-charts',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Surveillance Analytics & Temporal Trends',
      content:
        'Interactive visual epidemiology charts: filter surveillance cohorts by custom date period and exposure category, and track monthly bite incident trends, patient age brackets, and incident distribution across days of the week.',
      targetSelector:
        '[data-walkthrough="reg-reports-surveillance-charts"], [data-walkthrough="reports-charts"], .rr-surveillance-row-1',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 5: Overview - Demographic Distribution & Animal Characteristics
    {
      id: 'reg-reports-demographics',
      module: 'Reports & Analytics',
      section: 'Overview',
      route,
      activateSelector: '[data-walkthrough="reg-reports-tab-overview"]',
      title: 'Barangay Hotspots & Animal Characteristics',
      content:
        'Analyze local rabies exposure factors across Tagoloan: identify incident barangays with the highest bite counts, inspect biting animal species, animal ownership status (domestic vs stray), and 14-day observation outcomes.',
      targetSelector:
        '[data-walkthrough="reg-reports-demographics"], .rr-surveillance-row-2',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: PEP & Follow-up - PEP Treatment Outcomes
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

    // Step 7: PEP & Follow-up - Overdue Patients Follow-up Queue
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

    // Step 8: PEP & Follow-up - Awaiting Day 0 (Initial Dose) Queue
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

    // Step 9: Bite Surveillance - Incident Registry Logs
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

    // Step 10: Bite Surveillance - Referrals & Transfers
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

    // Step 11: Clinic Summary - Key Metrics Table
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

    // Step 12: Export CSV & Print Official Reports
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
      placement: 'bottom',
    },

    // Step 4: Summary & Overview - Clinic Summary Metrics & Drilldown Cards
    {
      id: 'doctor-reports-kpi-cards',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Clinic Summary Metrics & Drilldown Cards',
      content:
        'Six clinical KPI cards display: Total Patients, Total Bite Cases, New Patients in Period, New Cases in Period, Completed Treatments, and On-going Treatments. Click any card to instantly open an audit drilldown table showing that group of patient or case records.',
      targetSelector:
        '[data-walkthrough="doctor-reports-kpi-cards"], [data-tour="doctor-reports-kpi-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 5: Summary & Overview - Bite Exposure Categories Breakdown
    {
      id: 'doctor-reports-category-cards',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="doctor-reports-tab-summary"]',
      title: 'Bite Case Exposure Categories Breakdown',
      content:
        'Examine bite cases classified by WHO/DOH exposure severity: Category I (Minor - intact skin), Category II (Moderate - minor scratches without bleeding), and Category III (Severe - transdermal bites or mucous membrane exposure). Click any category to filter and inspect related incident records.',
      targetSelector:
        '[data-walkthrough="doctor-reports-category-cards"], [data-tour="doctor-reports-category-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: Bite Cases - Search & Clinical Filters
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
      placement: 'bottom',
    },

    // Step 7: Bite Cases - Incident Records Table & CSV Export
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

    // Step 8: Patients - Patient Registry Search & Date Filters
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
      placement: 'bottom',
    },

    // Step 9: Patients - Registered Patients Registry Table & CSV Export
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

    // Step 10: Top Header - Print Official Clinical Report
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
      placement: 'bottom',
    },

    // Step 4: Summary & Overview - Clinical Key Metrics & Interactive Cards
    {
      id: 'nurse-reports-kpi-cards',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Clinical Key Metrics & Interactive Cards',
      content:
        'Six KPI cards highlight: Total Patients, Total Bite Cases, New Patients, New Cases, Completed Courses, and Ongoing Treatments. Click any card to inspect the underlying patient or case records table.',
      targetSelector:
        '[data-walkthrough="nurse-reports-kpi-cards"], [data-tour="nurse-reports-kpi-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 5: Summary & Overview - Bite Exposure Category Breakdown
    {
      id: 'nurse-reports-category-cards',
      module: 'Reports & Analytics',
      section: 'Summary & Overview',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-summary"]',
      title: 'Bite Exposure Category Breakdown',
      content:
        'Breakdown of bite incidents by Category I (no exposure), Category II (minor scratch/nibble), and Category III (severe transdermal bites). Click any category to inspect related clinical cases.',
      targetSelector:
        '[data-walkthrough="nurse-reports-category-cards"], [data-tour="nurse-reports-category-cards"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: Bite Cases - Search & Status Filters
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
      placement: 'bottom',
    },

    // Step 7: Bite Cases - Detailed Incident Records Table & CSV Export
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

    // Step 8: Patients - Registered Patients Registry & Lookup
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

    // Step 9: Vaccine Inventory & Wastage - Stock Expiration & Category Filters
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
      placement: 'bottom',
    },

    // Step 10: Vaccine Inventory & Wastage - Stock Status Cards
    {
      id: 'nurse-reports-inventory-kpis',
      module: 'Reports & Analytics',
      section: 'Vaccine Inventory & Wastage',
      route,
      activateSelector: '[data-walkthrough="nurse-reports-tab-inventory"]',
      title: 'Vaccine Stock Status Cards',
      content:
        'Five summary metrics track: Active Batches, Total Sealed Vials, Batches Expiring Soon (≤ 60 days), Depleted Batches, and Expired Batches in storage.',
      targetSelector:
        '[data-walkthrough="nurse-reports-inventory-kpis"], [data-tour="nurse-reports-inventory-kpis"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 11: Vaccine Inventory & Wastage - Batch Utilization & Wastage Audit Log
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

    // Step 12: Top Header - Print Official Report with Nurse Sign-off
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
