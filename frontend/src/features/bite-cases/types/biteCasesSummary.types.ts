/**
 * Shared types and pure view helpers for the Bite Cases Summary Dashboard.
 * Preserves backend-computed clinical and DOH cohort definitions without recalculating formulas in the browser.
 */

export type ViewTab = 'summary' | 'treatment' | 'cases';
export type PrivacyMode = 'internal_aggregate' | 'aggregate_only';
export type BiteSummaryAgeGroupKey = 'children' | 'teenagers' | 'adults' | 'senior_citizens';

export const BITE_SUMMARY_AGE_GROUPS: ReadonlyArray<{
  key: BiteSummaryAgeGroupKey;
  label: string;
  range: string;
}> = [
  { key: 'senior_citizens', label: 'Senior Citizens', range: '60 years and above' },
  { key: 'adults', label: 'Adults', range: '18–59 years' },
  { key: 'teenagers', label: 'Teenagers', range: '13–17 years' },
  { key: 'children', label: 'Children', range: '1–12 years' },
];

export type LocationSummary = {
  location: string;
  normalized_barangay?: string;
  municipality?: string | null;
  geography_scope?: string;
  location_level: string;
  surge_level?: 'cluster' | 'surge' | null;
  cases_last_7d?: number | null;
  surge_ratio?: number | null;
  surge_reason?: string | null;
  total?: number;
  total_cases: number;
  previous_total?: number;
  change?: number;
  pct_change?: number | null;
  pct_change_reason?: string | null;
  cat_1: number;
  cat_2: number;
  cat_3: number;
  unassessed?: number;
  male?: number;
  female?: number;
  unknown_sex?: number;
  age_below_15?: number;
  age_15_above?: number;
  age_unknown?: number;
  stray?: number;
  dogs?: number;
  cats?: number;
  other_animals?: number;
  unknown_animals?: number;
  animal_types: Record<string, number>;
  children_count?: number;
  new_course_prescribed?: number;
  new_course_started?: number;
  initiation_rate_pct?: number | null;
  pep_prescribed?: number;
  given_pep?: number;
  no_administration_recorded?: number;
  no_pep_required?: number;
  transferred?: number;
  completed?: number;
  given_rig?: number;
  erig?: number;
  hrig?: number;
  pep_compliance: number;
  overdue_doses: number;
  overdue_episodes?: number;
  overdue_patients?: number;
  overdue_courses?: number;
  outstanding_dose_slots?: number;
  trend: 'up' | 'down' | 'neutral' | 'new';
  trend_diff: number | null;
  last_incident: string | null;
  last_incident_days_ago: number | null;
  is_small_cell_suppressed?: boolean;
  display_total_cases?: string;
};

export type DescriptiveFinding = {
  finding_key: string;
  title: string;
  supporting_metric: string;
  statement: string;
  recommended_review: string;
};

export type ReportSnapshotHeader = {
  snapshot_id: number;
  snapshot_code: string;
  version: number;
  parent_snapshot_id?: number | null;
  status: 'draft' | 'finalized';
  privacy_mode: PrivacyMode;
  rule_version: string;
  period_start?: string | null;
  period_end?: string | null;
  cutoff_date: string;
  date_basis: string;
  notes?: string | null;
  prepared_by_name?: string | null;
  reviewed_by_name?: string | null;
  generated_at?: string | null;
  finalized_at?: string | null;
};

export type ReportActionItem = {
  action_id: number;
  snapshot_id?: number | null;
  snapshot_code?: string | null;
  finding_key?: string | null;
  observed_pattern: string;
  supporting_metric?: string | null;
  proposed_action: string;
  owner_name?: string | null;
  due_date?: string | null;
  resources_notes?: string | null;
  baseline_value?: string | null;
  target_measure?: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'deferred';
  review_date?: string | null;
  review_outcome?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OverdueDoseSlot = {
  dose_number: number;
  label: string;
  due_date: string;
  days_overdue: number;
};

export type PatientFollowupLog = {
  id: number;
  contact_type: 'call' | 'sms' | 'visit' | 'other' | string;
  status: string;
  recipient_number?: string | null;
  message_body?: string | null;
  notes?: string | null;
  dose_label?: string | null;
  days_overdue?: number | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
};

export type CaseSummary = {
  bite_id: number;
  case_number: string;
  patient_id?: number;
  patient_name: string;
  age?: number | null;
  age_group?: BiteSummaryAgeGroupKey | null;
  gender?: string;
  contact_number?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_name?: string | null;
  follow_up_contact_number?: string | null;
  follow_up_contact_source?: 'patient' | 'guardian' | null;
  bite_date: string | null;
  location: string;
  normalized_barangay?: string;
  category: string;
  animal_type: string;
  animal_type_detail?: string;
  animal_status?: string;
  animal_ownership?: string;
  animal_condition?: string;
  animal_observation_date?: string | null;
  animal_last_checked_at?: string | null;
  animal_observation_day?: number | null;
  animal_observation_due?: boolean;
  animal_observation_policy?:
    | 'high_risk_full_pep'
    | 'full_pep_required'
    | 'md_discontinuation_review'
    | 'day14_check_due'
    | 'observing'
    | 'healthy_observed'
    | string;
  animal_observation_badge?: string | null;
  registration_channel?: 'walk_in' | 'online';
  status: string;
  last_completed_stage?: string;
  stage_label?: string;
  what_can_be_reported?: string;
  treatment_decision_display?: string;
  administration_display?: string;
  vaccination_display?: string;
  external_treatment_display?: string;
  pep_decision?: string;
  course_outcome?: string;
  completed_doses_count?: number;
  required_doses_count?: number;
  encounter_disposition?: string;
  rig_given?: string;
  rig_indicated?: string;
  rig_pending?: boolean;
  rig_pending_hours?: number | null;
  is_unassessed_over_48h?: boolean;
  is_overdue?: boolean;
  days_overdue?: number;
  overdue_dose?: string | null;
  overdue_dose_day?: number | null;
  overdue_due_date?: string | null;
  overdue_dose_slots?: OverdueDoseSlot[];
  outstanding_dose_slot_count?: number;
  followup_logs?: PatientFollowupLog[];
  followup_logs_count?: number;
  is_unresolved_review?: boolean;
  review_age_days?: number | null;
  review_age_bucket?: '0_7_days' | '8_30_days' | 'over_30_days' | null;
};

export type StageMatrixRow = {
  stage_key: string;
  stage: string;
  what_can_be_reported: string;
  missing_info_display: string;
  count: number;
};

export type CohortCategoryRow = {
  category: 'I' | 'II' | 'III';
  cases: number;
  given_pep: number;
  completed: number;
  given_rig: number;
  erig: number;
  hrig: number;
  no_administration_recorded: number;
  transferred: number;
};

export type ComparisonMetric = {
  current: number;
  prior: number;
  delta: number;
  pct_change: number | null;
  pct_change_reason: string | null;
};

export type DohSummary = {
  scope?: {
    privacy_mode: string;
    period_start: string;
    period_end: string;
    cutoff: string;
    clinic_name?: string;
    date_basis?: string;
    is_partial_period?: boolean;
  };
  demographics: {
    male: number;
    female: number;
    unknown_sex: number;
    age_below_15: number;
    age_15_above: number;
    age_unknown: number;
  };
  age_groups?: {
    children: number;
    teenagers: number;
    adults: number;
    senior_citizens: number;
    valid_total: number;
  };
  categories: {
    I: number;
    II: number;
    III: number;
    categorized_total: number;
    not_yet_assessed: number;
    assessed_category_missing: number;
    unassessed_or_missing_total: number;
  };
  animals: {
    dog: number;
    cat: number;
    other: number;
    unknown: number;
    species_unknown?: number;
    species_not_recorded?: number;
    stray: number;
    owned: number;
    ownership_unknown?: number;
    ownership_not_recorded?: number;
    animal_status_unknown: number;
    condition_healthy?: number;
    condition_sick?: number;
    condition_died?: number;
    condition_unknown?: number;
    condition_not_recorded?: number;
  };
  pep_and_biologics: {
    recorded_exposures: number;
    walk_in_registrations?: number;
    online_registrations?: number;
    finalized_assessments: number;
    awaiting_assessment: number;
    pep_prescribed: number;
    new_course_prescribed: number;
    continuing_episodes: number;
    given_pep: number;
    verified_vaccine_initiation: number;
    no_administration_recorded: number;
    all_prescribed_no_administration_recorded?: number;
    explicit_no_pep: number;
    decision_missing: number;
    rig_indicated: number;
    given_rig: number;
    erig: number;
    hrig: number;
    rig_unverified: number;
  };
  completion_and_outcomes: {
    completed_cat_I: number;
    completed_cat_II: number;
    completed_cat_III: number;
    completed_total: number;
    all_completed_courses: number;
    matured_courses: number;
    matured_completed: number;
    immature_courses: number;
    transferred_referred: number;
    overdue_episodes: number;
    outstanding_dose_slots: number;
  };
  cohort_by_category: {
    excluded_unassessed_or_missing_cat: number;
    rows: CohortCategoryRow[];
  };
  data_quality_and_aging?: {
    expected_pending: {
      awaiting_assessment: number;
      awaiting_treatment_initiation: number;
      immature_active_courses: number;
    };
    documentation_gaps: {
      unknown_exposure_date: number;
      assessed_category_missing: number;
      decision_missing: number;
      rig_indicated_no_verified_admin: number;
      external_treatment_unverified: number;
      unknown_exposure_location: number;
    };
    unresolved_review_age_buckets: {
      '0_7_days': number;
      '8_30_days': number;
      over_30_days: number;
      total: number;
    };
  };
  reconciliation_bridge?: {
    form_1_exposure_registry: {
      recorded_episodes: number;
      unknown_exposure_date_episodes: number;
      awaiting_assessment: number;
      finalized_assessments: number;
    };
    form_2_abtc_monthly: {
      recorded_episodes: number;
      assessed_categorized_total: number;
      excluded_unassessed: number;
      excluded_category_missing: number;
      reconciles_recorded_to_assessed: boolean;
      given_pep: number;
      no_administration_recorded: number;
      given_rig: number;
    };
    form_3_quarterly_cohort: {
      d0_cohort_started_courses: number;
      d0_mature_started_courses: number;
      d0_completed_mature_courses: number;
      d0_completion_rate_pct: number | null;
      d0_ongoing_not_mature_courses: number;
      assessed_cohort_completed: number;
    };
  };
  period_comparison?: {
    prior_period_start: string;
    prior_period_end: string;
    indicators: Record<string, ComparisonMetric>;
  };
  form_2_decision_pending_count?: number;
  stage_matrix: StageMatrixRow[];
  meeting_narrative: string;
  planning_projections?: PlanningProjectionsPayload;
};

export interface SupplyUsableStock {
  arv_vials: number;
  rig_vials: number;
  arv_expiring_within_30d: number;
  rig_expiring_within_30d: number;
  earliest_arv_expiry: string | null;
  earliest_rig_expiry: string | null;
}

export interface SupplyDemandProjection {
  recent_daily_doses_run_rate: number;
  period_doses_administered: number;
  scheduled_doses_next_7d: number;
  scheduled_doses_next_14d: number;
  scheduled_doses_next_30d: number;
}

export interface SupplyScenarioDetail {
  label: string;
  doses_per_vial: number;
  projected_30d_vials: number;
  buffer_vials: number;
  total_vials_required: number;
  days_of_stock_remaining: number | null;
  suggested_reorder_vials: number;
  stockout_risk?: 'adequate' | 'warning' | 'critical' | 'depleted';
}

export interface SupplyScenariosPayload {
  inventory_cutoff: string;
  buffer_days_configured: number;
  usable_stock: SupplyUsableStock;
  demand_projection: SupplyDemandProjection;
  scenarios: {
    conservative_im: SupplyScenarioDetail;
    intradermal_sharing: SupplyScenarioDetail;
  };
  assumptions_and_limits: {
    vial_sharing_notice: string;
    buffer_formula: string;
  };
}

export interface PopulationContextPayload {
  catchment_population: number;
  municipality: string;
  recorded_exposures: number;
  period_days: number;
  rate_per_100k_period: number | null;
  annualized_rate_per_100k: number | null;
  facility_coverage_limitations: {
    presentation_bias: string;
    denominator_context: string;
    underreporting_caveat: string;
  };
}

export interface VeterinarySurveillanceLink {
  partner_agencies: Array<{
    agency_name: string;
    role: string;
    coordination_trigger: string;
  }>;
  actionable_notes: string[];
}

export interface BaselineForecastPayload {
  forecast_model: string;
  daily_presentation_run_rate: number;
  projected_next_month_presentations: number;
  projected_next_month_range: {
    lower_bound: number;
    upper_bound: number;
  };
  evaluation_and_limits: {
    method_description: string;
    predictive_claim_disclaimer: string;
  };
}

export interface PlanningProjectionsPayload {
  rule_version: string;
  supply_scenarios: SupplyScenariosPayload;
  population_context: PopulationContextPayload;
  veterinary_surveillance_links: VeterinarySurveillanceLink;
  baseline_forecast: BaselineForecastPayload;
}

export interface BarangaySurgeAlert {
  barangay: string;
  municipality: string;
  scope: string;
  level: 'cluster' | 'surge';
  severity: 'critical' | 'warning';
  total_7d: number;
  cat_1_7d: number;
  cat_2_7d: number;
  cat_3_7d: number;
  awaiting_assessment_7d: number;
  baseline_30d_total: number;
  baseline_weekly_avg: number;
  surge_ratio: number | null;
  latest_bite_date: string | null;
  reason: string;
  disclaimer: string;
}

export interface VialReadinessSummary {
  status: 'shortfall' | 'tight' | 'expiring' | 'ok';
  severity: 'critical' | 'warning' | 'ok';
  usable_arv_vials: number;
  usable_rig_vials: number;
  effective_doses_per_vial: number;
  next_7d_committed_followups: number;
  today_waiting_d0_doses: number;
  next_7d_expected_walkin_d0: number;
  next_7d_vials_committed_only: number;
  next_7d_vials_realistic: number;
  next_7d_vials_conservative_im: number;
  next_14d_committed_followups: number;
  next_14d_vials_realistic: number;
  projected_stock_after_7d: number;
  projected_stockout_date: string | null;
  committed_stockout_date: string | null;
  expiring_within_30d_vials: number;
  expiring_unused_vials: number;
  rig_pending_cases: number;
  rig_projected_7d_vials: number;
  rig_status: 'shortfall' | 'tight' | 'ok';
  high_wastage_days_next_7d: number;
  headline: string;
}

export interface ClinicalAlertsSummary {
  rule_version: string;
  cutoff: string;
  has_critical_alerts: boolean;
  rig_pending: {
    total: number;
    urgent_within_48h: number;
    over_48h: number;
  };
  overdue_pep: {
    overdue_episodes: number;
    critical_3d_plus: number;
    warning_1_2d: number;
    overdue_patients: number;
    overdue_courses: number;
    outstanding_dose_slots: number;
  };
  high_risk_animals: {
    died: number;
    sick: number;
    total: number;
  };
  workflow_pending: {
    awaiting_assessment: number;
    unassessed_over_48h: number;
    no_administration_recorded: number;
    unresolved_over_30_days: number;
    assessed_category_missing: number;
  };
  data_completeness: {
    unknown_location_count: number;
    unknown_location_pct: number;
    unknown_location_warning: boolean;
    provisional_exposure_date_count: number;
    unknown_location_7d: number;
  };
  vial_readiness?: VialReadinessSummary;
  barangay_surges: BarangaySurgeAlert[];
  cluster_zones: string[];
  surge_zones: string[];
}

export type DashboardData = {
  rule_version?: string;
  privacy_mode?: PrivacyMode;
  cutoff?: string;
  planning_projections?: PlanningProjectionsPayload;
  summary: {
    total_cases: number;
    active_cases: number;
    awaiting_assessment?: number;
    awaiting_treatment?: number;
    completed: number;
    high_risk_zones: number;
    overdue_doses: number;
    overdue_episodes?: number;
    overdue_patients?: number;
    overdue_courses?: number;
    outstanding_dose_slots?: number;
    pep_prescribed?: number;
    verified_vaccine_initiation?: number;
    no_administration_recorded?: number;
    pep_compliance: number;
    unknown_exposure_date_count?: number;
    cutoff?: string;
  };
  doh_summary?: DohSummary;
  locations: LocationSummary[];
  cases?: CaseSummary[];
  insights?: DescriptiveFinding[];
  limitations?: string[];
  snapshot?: ReportSnapshotHeader;
  clinical_alerts?: ClinicalAlertsSummary;
  risk_alerts: {
    high_risk_zones: string[];
    cluster_zones?: string[];
    surge_zones?: string[];
    overdue_count: number;
  };
};

export type Filters = {
  search: string;
  severity: string;
  status: string;
  animal: string;
  animalStatus: string;
  animalCondition: string;
  channel: string;
  ageGroup: string;
  range: string;
  customFrom: string;
  customTo: string;
  cutoff: string;
};

export function formatDaysAgo(days: number | null): string {
  if (days === null || days === undefined) return '—';
  const absDays = Math.abs(days);
  if (absDays === 0) return 'Today';
  if (absDays === 1) return 'Yesterday';
  return `${absDays} days ago`;
}

export function formatPct(num: number, den: number): string {
  if (!den || den <= 0) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeDateRange(
  range: string,
  customFrom: string,
  customTo: string
): { from?: string; to?: string; isPartialPeriod?: boolean; label?: string } {
  const today = new Date();
  const end = formatLocalDate(today);
  const start = new Date(today);
  if (range === 'week' || range === '7d') {
    start.setDate(today.getDate() - 6);
    return { from: formatLocalDate(start), to: end, isPartialPeriod: true, label: 'Current 7-day rolling window' };
  }
  if (range === '14d') {
    start.setDate(today.getDate() - 13);
    return { from: formatLocalDate(start), to: end, isPartialPeriod: true, label: 'Current 14-day rolling window' };
  }
  if (range === 'month' || range === '30d') {
    start.setMonth(today.getMonth() - 1);
    return { from: formatLocalDate(start), to: end, isPartialPeriod: true, label: 'Current 30-day rolling window' };
  }
  if (range === 'quarter' || range === '90d') {
    start.setMonth(today.getMonth() - 3);
    return { from: formatLocalDate(start), to: end, isPartialPeriod: true, label: 'Current 90-day rolling window' };
  }
  if (range === 'last_completed_quarter') {
    const q = Math.floor(today.getMonth() / 3);
    const prevQEnd = new Date(today.getFullYear(), q * 3, 0);
    const prevQStart = new Date(prevQEnd.getFullYear(), prevQEnd.getMonth() - 2, 1);
    return {
      from: formatLocalDate(prevQStart),
      to: formatLocalDate(prevQEnd),
      isPartialPeriod: false,
      label: `Last Completed Quarter (${formatLocalDate(prevQStart)} to ${formatLocalDate(prevQEnd)})`,
    };
  }
  if (range === 'custom') {
    const todayStr = formatLocalDate(today);
    const isPartial = Boolean(customTo && customTo >= todayStr);
    return {
      ...(customFrom ? { from: customFrom } : {}),
      ...(customTo ? { to: customTo } : {}),
      isPartialPeriod: isPartial,
    };
  }
  return { isPartialPeriod: true, label: 'All Recorded Exposure Dates (up to cutoff)' };
}

export function normalizeSeverityParam(value: string | null): string {
  if (!value) return '';
  const lower = value.toLowerCase();
  if (lower === 'minor' || lower === 'i') return 'I';
  if (lower === 'moderate' || lower === 'ii') return 'II';
  if (lower === 'severe' || lower === 'iii') return 'III';
  if (lower === 'unassessed') return 'unassessed';
  if (lower === 'not_yet_assessed') return 'not_yet_assessed';
  if (lower === 'assessed_category_missing') return 'assessed_category_missing';
  return '';
}
