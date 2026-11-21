export type SummaryDateBasis = 'exposure_date' | 'registration_date';
export type SummaryComparisonMode = 'previous_period' | 'same_period_last_year' | 'none';
export type SummaryPrivacyMode = 'aggregate_only' | 'internal_aggregate';
export type SummaryGeographyBasis = 'exposure' | 'residence';

export interface BiteSummaryQueryParams {
  from?: string;
  to?: string;
  month?: string;
  quarter?: string | number;
  year?: number;
  cutoff?: string;
  date_basis?: SummaryDateBasis;
  comparison?: SummaryComparisonMode;
  category?: string;
  severity?: string;
  status?: string;
  animal?: string;
  sex?: string;
  age_group?: string;
  plan_type?: string;
  barangay?: string;
  geography_basis?: SummaryGeographyBasis;
  privacy_mode?: SummaryPrivacyMode;
  search?: string;
  no_cache?: boolean;
  clinic_id?: number;
}

export interface BiteSummaryCasesQueryParams extends BiteSummaryQueryParams {
  bucket?:
    | 'all'
    | 'unknown_exposure_date'
    | 'awaiting_assessment'
    | 'finalized_assessments'
    | 'pep_prescribed'
    | 'new_course_prescribed'
    | 'verified_vaccine_initiation'
    | 'no_administration_recorded'
    | 'explicit_no_pep'
    | 'decision_missing'
    | 'assessed_category_missing'
    | 'transferred_referred'
    | 'rig_indicated'
    | 'rig_verified'
    | 'overdue';
  page?: number;
  per_page?: number;
}

export interface MetricDefinition {
  label: string;
  unit: string;
  classification: string;
  rule_version: string;
}

export interface IndicatorValue {
  metric_id: string;
  label: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  unit: string;
  date_basis: string;
  rule_version: string;
  unavailable_reason: string | null;
}

export interface ComparisonValueDelta {
  current: number;
  prior: number;
  delta: number;
  pct_change: number | null;
  pct_change_reason: string | null;
}

export interface ComparisonRateDelta {
  current: number | null;
  prior: number | null;
  delta_percentage_points: number | null;
  reason: string | null;
}

export interface ExposureBarangayBreakdown {
  barangay: string;
  municipality: string;
  scope: string;
  total_cases: number;
  prior_cases: number;
  delta: number;
  pct_change: number | null;
  pct_change_reason: string | null;
  cat_1: number;
  cat_2: number;
  cat_3: number;
  unassessed: number;
  cat_3_share_pct: number | null;
  children_below_15: number;
  new_course_prescribed: number;
  new_course_started: number;
  initiation_rate_pct: number | null;
  overdue_episodes: number;
  overdue_courses: number;
  outstanding_dose_slots: number;
}

export interface ResidenceBarangayBreakdown {
  barangay: string;
  municipality: string;
  scope: string;
  total_cases: number;
}

export interface RecordedEpisodesBridge {
  total_recorded_episodes: number;
  categorized_cases_total: number;
  cat_I: number;
  cat_II: number;
  cat_III: number;
  unassessed_episodes: number;
  assessed_category_missing: number;
  continuing_episodes: number;
}

export interface JourneyReconciliationSummary {
  recorded_episodes?: number;
  finalized_assessments?: number;
  awaiting_assessment?: number;
  no_finalized_assessment?: number;
  pep_prescribed?: number;
  new_course_prescribed?: number;
  new_course_started?: number;
  new_course_no_receipt?: number;
  continuing_episodes?: number;
  explicit_no_pep?: number;
  decision_missing?: number;
  verified_vaccine_initiation?: number;
  no_administration_recorded?: number;
  matured_courses?: number;
  matured_completed?: number;
  narrative?: string;
  recorded_episodes_bridge?: RecordedEpisodesBridge;
  [key: string]: unknown;
}

export interface D0CohortMetrics {
  started_courses: number;
  mature_started_courses: number;
  completed_mature_courses: number;
  ongoing_not_mature_courses: number;
  discontinued_mature_courses: number;
  transferred_mature_courses: number;
  mature_completion_rate_pct: number | null;
  [key: string]: unknown;
}

export interface ServicePeriodMetrics {
  local_arv_events_in_service_period: number;
  external_arv_events_in_service_period: number;
  [key: string]: unknown;
}

export interface DohReconciliationBridge {
  recorded_episodes_bridge?: RecordedEpisodesBridge;
  form?: string;
  abtc_monthly_form?: Record<string, number>;
  cohort_quarterly_form_slice?: Record<string, number>;
  [key: string]: unknown;
}

export interface BiteSummaryResponse {
  scope: {
    clinic_id: number;
    clinic_name: string;
    municipality: string;
    province: string;
    timezone: string;
    rule_version: string;
    privacy_mode: SummaryPrivacyMode;
    date_basis: SummaryDateBasis;
    period_start: string;
    period_end: string;
    cutoff: string;
    is_partial_period: boolean;
    comparison_mode: SummaryComparisonMode;
    filters: Record<string, string>;
    record_count: number;
    unknown_exposure_date_count: number;
    status: string;
  };
  metric_definitions: Record<string, MetricDefinition>;
  indicators: Record<string, IndicatorValue>;
  journey_progress: {
    mutually_exclusive_partitions: Record<string, unknown>;
    overlapping_indicators: Record<string, unknown>;
    narrative: string;
  };
  breakdowns: {
    by_category: Record<string, number>;
    by_age_group: Record<string, number>;
    by_sex: Record<string, number>;
    by_animal: Record<string, number>;
    by_plan_type: Record<string, number>;
    by_exposure_barangay: ExposureBarangayBreakdown[];
    by_residence_barangay: ResidenceBarangayBreakdown[];
    residence_summary: Record<string, number>;
    weekly_trend: Array<Record<string, unknown>>;
  };
  comparison: {
    enabled: boolean;
    mode: SummaryComparisonMode;
    prior_start?: string;
    prior_end?: string;
    prior_cutoff?: string;
    is_partial_matched?: boolean;
    matched_elapsed_days?: number;
    prior_record_count?: number;
    indicators?: {
      recorded_exposures: ComparisonValueDelta;
      category_III: ComparisonValueDelta;
      assessment_completion_pct: ComparisonRateDelta;
      documented_pep_initiation_pct: ComparisonRateDelta;
      mature_course_completion_pct: ComparisonRateDelta;
    };
  };
  data_quality: Record<string, unknown>;
  reconciliation: {
    recorded_episodes_bridge: RecordedEpisodesBridge;
    abtc_monthly_form: Record<string, number>;
    cohort_quarterly_form_slice: Record<string, number>;
    d0_cohort: D0CohortMetrics;
    service_period: ServicePeriodMetrics;
    backlog_at_cutoff: Record<string, number>;
  };
  source_reports: Record<string, unknown>;
}

export interface BiteSummaryCaseRow {
  bite_id: number;
  case_number: string;
  patient_id: number;
  patient_name: string;
  age_at_exposure: number | null;
  gender: string;
  bite_date: string | null;
  bite_date_is_provisional: boolean;
  animal_type: string;
  exposure_barangay: string;
  exposure_municipality: string;
  exposure_geography_scope: string;
  residence_barangay: string;
  residence_municipality: string;
  category: string;
  assessment: string;
  pep_decision: string;
  course_outcome: string;
  encounter_disposition: string;
  status: string;
  last_completed_stage: string;
  stage_label: string;
  what_can_be_reported: string;
  treatment_decision_display: string;
  administration_display: string;
  vaccination_display: string;
  external_treatment_display: string;
  rig_indicated: string;
  rig_given: string;
  is_overdue: boolean;
  days_overdue: number;
  outstanding_dose_slot_count: number;
}

export interface BiteSummaryCasesResponse {
  scope: {
    clinic_id: number;
    rule_version: string;
    date_basis: SummaryDateBasis;
    period_start: string;
    period_end: string;
    cutoff: string;
    bucket: string;
  };
  pagination: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
  cases: BiteSummaryCaseRow[];
}
