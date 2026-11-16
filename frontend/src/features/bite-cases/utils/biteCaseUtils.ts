/**
 * Utility functions for Bite Cases Summary Dashboard
 */

import type { LocationSummary, CaseSummary, PrivacyMode, DashboardData } from '../types/biteCasesSummary.types';

/**
 * Export full aggregate meeting summary tables to CSV (Scope, Headline KPIs, Stage Matrix, Category Cohort, Barangays, Findings).
 * Respects Conference Aggregate-Only small-cell suppression (<5) and never exports patient identifiers.
 */
export function exportAggregateSummaryToCsv(
  data: DashboardData,
  filename = 'bite-cases-summary-pack.csv'
) {
  const doh = data.doh_summary;
  const pep = doh?.pep_and_biologics;
  const cats = doh?.categories;
  const demo = doh?.demographics;
  const animals = doh?.animals;
  const scope = doh?.scope;

  const lines: string[] = [];
  const addRow = (cols: (string | number)[]) => {
    lines.push(cols.map((c) => escapeCsvField(c)).join(','));
  };

  addRow(['BITE CASES SUMMARY — AGGREGATE REPORT PACK']);
  addRow(['Rule Version', data.rule_version || 'v2026.1']);
  addRow(['Privacy Mode', data.privacy_mode || scope?.privacy_mode || 'internal_aggregate']);
  addRow(['Period Start', scope?.period_start || 'All Recorded']);
  addRow(['Period End', scope?.period_end || 'To Cutoff']);
  addRow(['Outcome Cutoff Date', data.cutoff || scope?.cutoff || 'Today']);
  addRow(['Snapshot Code', data.snapshot?.snapshot_code || 'LIVE_DRAFT']);
  addRow(['Snapshot Status', data.snapshot?.status || 'draft']);
  addRow([]);

  addRow(['SECTION 1: HEADLINE INDICATORS']);
  addRow(['Indicator', 'Count / Rate', 'Denominator & Operational Basis']);
  addRow([
    '1. Recorded Exposure Episodes',
    pep?.recorded_exposures ?? data.summary.total_cases ?? 0,
    `Assessed: ${pep?.finalized_assessments ?? 0} | Awaiting Assessment (Form 1): ${pep?.awaiting_assessment ?? 0}`,
  ]);
  addRow([
    '2. Category III Severe Exposures',
    cats?.III ?? 0,
    `Of ${cats?.categorized_total ?? 0} categorized episodes (Unassessed/Pending: ${cats?.unassessed_or_missing_total ?? 0})`,
  ]);
  addRow([
    '3. PEP Started (Given PEP)',
    pep?.given_pep ?? data.summary.verified_vaccine_initiation ?? 0,
    `Of ${pep?.pep_prescribed ?? 0} episodes prescribed PEP (No Admin Recorded: ${pep?.no_administration_recorded ?? 0})`,
  ]);
  addRow([
    '4. PEP Completion (Mature Cohort)',
    doh?.completion_and_outcomes?.completed_total ?? data.summary.completed ?? 0,
    `Of ${doh?.completion_and_outcomes?.matured_courses ?? 0} mature D0 courses (${doh?.reconciliation_bridge?.form_3_quarterly_cohort?.d0_completion_rate_pct !== null && doh?.reconciliation_bridge?.form_3_quarterly_cohort?.d0_completion_rate_pct !== undefined ? `${doh.reconciliation_bridge.form_3_quarterly_cohort.d0_completion_rate_pct}%` : 'N/A'})`,
  ]);
  addRow([]);

  addRow(['SECTION 2: PATIENT JOURNEY & MISSING-INFORMATION MATRIX (5 STAGES)']);
  addRow(['Last Completed Stage', 'Episodes', 'What Can Be Reported', 'How Missing Information Is Shown']);
  for (const row of doh?.stage_matrix || []) {
    addRow([row.stage, row.count, row.what_can_be_reported, row.missing_info_display]);
  }
  addRow([]);

  addRow(['SECTION 3: DEMOGRAPHICS & EXPOSURE PROFILE']);
  addRow(['Group', 'Metric', 'Count']);
  addRow(['Sex', 'Male', demo?.male ?? 0]);
  addRow(['Sex', 'Female', demo?.female ?? 0]);
  addRow(['Sex', 'Sex Not Recorded', demo?.unknown_sex ?? 0]);
  addRow(['Age', 'Children (<15 years)', demo?.age_below_15 ?? 0]);
  addRow(['Age', 'Adults (>=15 years)', demo?.age_15_above ?? 0]);
  addRow(['Age', 'Age Not Recorded', demo?.age_unknown ?? 0]);
  addRow(['Animal Source', 'Dog', animals?.dog ?? 0]);
  addRow(['Animal Source', 'Cat', animals?.cat ?? 0]);
  addRow(['Animal Source', 'Other Animal', animals?.other ?? 0]);
  addRow(['Animal Source', 'Unknown Animal', animals?.unknown ?? 0]);
  addRow(['Animal Ownership', 'Stray / Unowned', animals?.stray ?? 0]);
  addRow(['Animal Ownership', 'Owned', animals?.owned ?? 0]);
  addRow(['Animal Ownership', 'Ownership Unknown', animals?.animal_status_unknown ?? 0]);
  addRow([]);

  addRow(['SECTION 4: CATEGORY I-III COHORT OUTCOMES (ASSESSED EPISODES ONLY)']);
  addRow([
    'Category',
    'Assessed Cases',
    'Given PEP (Initiated)',
    'Completed Mature Course',
    'Given RIG (Total)',
    'ERIG',
    'HRIG',
    'No Administration Recorded',
    'Transferred/Referred',
  ]);
  for (const row of doh?.cohort_by_category?.rows || []) {
    addRow([
      `Category ${row.category}`,
      row.cases,
      row.given_pep,
      row.completed,
      row.given_rig,
      row.erig,
      row.hrig,
      row.no_administration_recorded,
      row.transferred,
    ]);
  }
  addRow([]);

  addRow(['SECTION 5: BARANGAY EXPOSURE SUMMARY']);
  addRow([
    'Barangay',
    'Municipality',
    'Scope',
    'Recorded Cases',
    'Category I',
    'Category II',
    'Category III',
    'Unassessed',
    'PEP Prescribed',
    'Given PEP',
    'No Admin Recorded',
    'Completed Mature',
    'Overdue Episodes',
  ]);
  for (const loc of data.locations || []) {
    const suppressed = Boolean(loc.is_small_cell_suppressed);
    addRow([
      loc.normalized_barangay || loc.location,
      loc.municipality || '',
      loc.geography_scope || '',
      suppressed ? (loc.display_total_cases || '<5') : loc.total_cases,
      suppressed ? '<5' : loc.cat_1,
      suppressed ? '<5' : loc.cat_2,
      suppressed ? '<5' : loc.cat_3,
      suppressed ? '<5' : (loc.unassessed ?? 0),
      suppressed ? '<5' : (loc.pep_prescribed ?? 0),
      suppressed ? '<5' : (loc.given_pep ?? 0),
      suppressed ? '<5' : (loc.no_administration_recorded ?? 0),
      suppressed ? '<5' : (loc.completed ?? 0),
      suppressed ? '<5' : (loc.overdue_episodes ?? loc.overdue_doses ?? 0),
    ]);
  }
  addRow([]);

  if (data.insights && data.insights.length > 0) {
    addRow(['SECTION 6: DESCRIPTIVE FINDINGS']);
    addRow(['Finding Title', 'Supporting Metric', 'Observation', 'Recommended Review']);
    for (const f of data.insights) {
      addRow([f.title, f.supporting_metric, f.statement, f.recommended_review]);
    }
    addRow([]);
  }

  if (data.limitations && data.limitations.length > 0) {
    addRow(['SECTION 7: DATA SCOPE & LIMITATIONS']);
    for (const lim of data.limitations) {
      addRow([lim]);
    }
  }

  downloadCsvFile(lines.join('\n'), filename);
}

/**
 * Export locations data to CSV including DOH Summary fields
 */
export function exportLocationsToCsv(locations: LocationSummary[], filename = 'bite-cases-locations.csv') {
  if (!locations || locations.length === 0) {
    alert('No data available to export');
    return;
  }

  const headers = [
    'Location',
    'Normalized Barangay',
    'Municipality',
    'Geography Scope',
    'Level',
    'Risk Score',
    'Risk Level',
    'Total Cases',
    'Male',
    'Female',
    'Unknown Sex',
    'Age <15',
    'Age >=15',
    'Age Unknown',
    'Category I',
    'Category II',
    'Category III',
    'Unassessed',
    'Dog Bites',
    'Cat Bites',
    'Other Animal Bites',
    'Unknown Animal Bites',
    'Stray Animal Cases',
    'PEP Prescribed',
    'Given PEP (Initiated)',
    'No Administration Recorded',
    'No PEP Required',
    'Transferred/Referred',
    'Completed Mature Courses',
    'Given RIG',
    'ERIG',
    'HRIG',
    'PEP Compliance (%)',
    'Overdue Episodes',
    'Outstanding Dose Slots',
    'Trend',
    'Trend Difference',
    'Last Incident Date',
    'Days Since Last Incident',
  ];

  const rows = locations.map((loc) => {
    const suppressed = Boolean(loc.is_small_cell_suppressed);
    const animalDog = loc.dogs ?? loc.animal_types?.dog ?? 0;
    const animalCat = loc.cats ?? loc.animal_types?.cat ?? 0;
    const animalOther = loc.other_animals ?? loc.animal_types?.other ?? 0;
    const animalUnknown = loc.unknown_animals ?? loc.animal_types?.unknown ?? 0;

    return [
      escapeCsvField(loc.location),
      escapeCsvField(loc.normalized_barangay || loc.location),
      escapeCsvField(loc.municipality || ''),
      escapeCsvField(loc.geography_scope || ''),
      escapeCsvField(loc.location_level || ''),
      loc.risk_score,
      loc.risk_level,
      suppressed ? (loc.display_total_cases || '<5') : loc.total_cases,
      suppressed ? '<5' : (loc.male ?? 0),
      suppressed ? '<5' : (loc.female ?? 0),
      suppressed ? '<5' : (loc.unknown_sex ?? 0),
      suppressed ? '<5' : (loc.age_below_15 ?? loc.children_count ?? 0),
      suppressed ? '<5' : (loc.age_15_above ?? 0),
      suppressed ? '<5' : (loc.age_unknown ?? 0),
      suppressed ? '<5' : loc.cat_1,
      suppressed ? '<5' : loc.cat_2,
      suppressed ? '<5' : loc.cat_3,
      suppressed ? '<5' : (loc.unassessed ?? 0),
      suppressed ? '<5' : animalDog,
      suppressed ? '<5' : animalCat,
      suppressed ? '<5' : animalOther,
      suppressed ? '<5' : animalUnknown,
      suppressed ? '<5' : (loc.stray ?? 0),
      suppressed ? '<5' : (loc.pep_prescribed ?? 0),
      suppressed ? '<5' : (loc.given_pep ?? loc.new_course_started ?? 0),
      suppressed ? '<5' : (loc.no_administration_recorded ?? 0),
      suppressed ? '<5' : (loc.no_pep_required ?? 0),
      suppressed ? '<5' : (loc.transferred ?? 0),
      suppressed ? '<5' : (loc.completed ?? 0),
      suppressed ? '<5' : (loc.given_rig ?? 0),
      suppressed ? '<5' : (loc.erig ?? 0),
      suppressed ? '<5' : (loc.hrig ?? 0),
      loc.pep_compliance,
      suppressed ? '<5' : (loc.overdue_episodes ?? loc.overdue_doses),
      suppressed ? '<5' : (loc.outstanding_dose_slots ?? 0),
      loc.trend,
      loc.trend_diff ?? '',
      loc.last_incident || '',
      loc.last_incident_days_ago !== null && loc.last_incident_days_ago !== undefined
        ? loc.last_incident_days_ago
        : '',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  downloadCsvFile(csvContent, filename);
}

export const BITE_CASE_STATUS_LABELS: Record<string, string> = {
  awaiting_assessment: 'Awaiting Assessment (Form 1)',
  awaiting_treatment: 'Awaiting Treatment (Form 2)',
  no_administration_recorded: 'PEP Prescribed – No Admin Recorded',
  treatment_recorded: 'Nurse Treatment Recorded (Form 3)',
  unresolved_review: 'Unresolved Review (Stage 1 & 2)',
  unresolved_review_0_7_days: 'Unresolved Review (0–7 Days)',
  unresolved_review_8_30_days: 'Unresolved Review (8–30 Days)',
  unresolved_review_over_30_days: 'Unresolved Review (>30 Days)',
  active: 'Treatment Started (Ongoing)',
  completed: 'Completed PEP Course',
  completed_no_pep: 'Completed – No PEP Required',
  transferred_out: 'Transferred/Referred',
  transferred_referred: 'Transferred/Referred',
  cancelled: 'Cancelled',
};

/**
 * Export individual episode cases to CSV with explicit incomplete-stage reporting columns
 */
export function exportCasesToCsv(
  cases: CaseSummary[],
  filename = 'bite-cases.csv',
  privacyMode: PrivacyMode = 'internal_aggregate'
) {
  if (privacyMode === 'aggregate_only') {
    alert('Conference / Aggregate-Only Mode is active. Switch to Internal Detail Mode to export individual patient rows, or export the Barangay Aggregate CSV instead.');
    return;
  }
  if (!cases || cases.length === 0) {
    alert('No data available to export');
    return;
  }

  const headers = [
    'Case Number',
    'Patient Name',
    'Patient ID',
    'Age at Exposure',
    'Sex',
    'Exposure Date',
    'Exposure Location',
    'Normalized Barangay',
    'Last Completed Stage',
    'What Can Be Reported',
    'Category',
    'Animal Type',
    'Animal Status',
    'Treatment Decision',
    'Administration Status',
    'Vaccination / Course Progress',
    'Completed Doses',
    'Required Doses',
    'RIG Indicated',
    'RIG Given',
    'External Treatment',
    'Resolved Status',
    'Unresolved Review',
    'Review Age (Days)',
    'Is Overdue',
    'Days Overdue',
    'Overdue Dose',
  ];

  const rows = cases.map((c) => [
    escapeCsvField(c.case_number),
    escapeCsvField(c.patient_name),
    c.patient_id ?? '',
    c.age !== null && c.age !== undefined ? c.age : 'Unknown',
    escapeCsvField(c.gender || 'Unknown'),
    c.bite_date || '',
    escapeCsvField(c.location),
    escapeCsvField(c.normalized_barangay || c.location),
    escapeCsvField(c.stage_label || c.last_completed_stage || ''),
    escapeCsvField(c.what_can_be_reported || ''),
    escapeCsvField(c.category),
    escapeCsvField(c.animal_type || 'unknown'),
    escapeCsvField(c.animal_status || 'unassessed'),
    escapeCsvField(c.treatment_decision_display || c.pep_decision || ''),
    escapeCsvField(c.administration_display || ''),
    escapeCsvField(c.vaccination_display || c.course_outcome || ''),
    c.completed_doses_count ?? '',
    c.required_doses_count ?? '',
    escapeCsvField(c.rig_indicated || 'None'),
    escapeCsvField(c.rig_given || 'None'),
    escapeCsvField(c.external_treatment_display || ''),
    escapeCsvField(BITE_CASE_STATUS_LABELS[c.status] || (c.status ? c.status.replaceAll('_', ' ') : '')),
    c.is_unresolved_review ? 'Yes' : 'No',
    c.review_age_days ?? '',
    c.is_overdue ? 'Yes' : 'No',
    c.days_overdue ?? '',
    escapeCsvField(c.overdue_dose || ''),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  downloadCsvFile(csvContent, filename);
}

function escapeCsvField(field: string | number): string {
  if (typeof field === 'number') return field.toString();
  if (!field) return '';

  const stringField = field.toString();
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

function downloadCsvFile(content: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if ((navigator as { msSaveBlob?: (b: Blob, n: string) => void }).msSaveBlob) {
    (navigator as unknown as { msSaveBlob: (b: Blob, n: string) => void }).msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export type ColumnKey = 'cat_3' | 'cat_2' | 'cat_1' | 'animal' | 'trend' | 'risk_score';

export const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  cat_3: false,
  cat_2: false,
  cat_1: false,
  animal: false,
  trend: false,
  risk_score: false,
};

const STORAGE_KEY = 'bite_cases_location_columns';

export function getStoredColumnVisibility(): Record<ColumnKey, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load column visibility:', error);
  }
  return DEFAULT_VISIBLE_COLUMNS;
}

export function saveColumnVisibility(columns: Record<ColumnKey, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch (error) {
    console.error('Failed to save column visibility:', error);
  }
}

export function formatDaysAgo(days: number | null): string {
  if (days === null || days === undefined) return '—';
  const absDays = Math.abs(days);
  if (absDays === 0) return 'Today';
  if (absDays === 1) return 'Yesterday';
  return `${absDays} days ago`;
}

export function formatAnimalSummary(types?: Record<string, number>): string {
  if (!types) return 'None';
  const parts: string[] = [];
  if (types.dog) parts.push(`${types.dog} Dog${types.dog > 1 ? 's' : ''}`);
  if (types.cat) parts.push(`${types.cat} Cat${types.cat > 1 ? 's' : ''}`);
  if (types.other) parts.push(`${types.other} Other animal${types.other > 1 ? 's' : ''}`);
  if (types.unknown) parts.push(`${types.unknown} Unknown`);
  return parts.join(', ') || 'None';
}

export function getSortAriaLabel(column: string, direction: 'asc' | 'desc' | false): string {
  if (!direction) return `Sort by ${column}`;
  return `Sorted by ${column} ${direction === 'asc' ? 'ascending' : 'descending'}`;
}
