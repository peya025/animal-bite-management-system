/**
 * Shared types and pure view helpers for the Bite Cases Summary Dashboard.
 * Preserves backend-computed clinical and DOH cohort definitions without recalculating formulas in the browser.
 */

export type PriorityLevel = 'high' | 'medium' | 'low' | 'limited_data';
export type RiskLevel = 'high' | 'medium' | 'low';
export type ViewTab = 'summary' | 'treatment' | 'risk' | 'cases';
export type PrivacyMode = 'internal_aggregate' | 'aggregate_only';
export type LocationSortKey =
  | 'priority'
  | 'location'
  | 'cases'
  | 'cat_3'
  | 'pep'
  | 'overdue'
  | 'last_incident';

export type OptionalBarangayColumn =
  | 'demographics'
  | 'rig_details'
  | 'animals'
  | 'trend'
  | 'risk_score';

export type LocationSummary = {
  location: string;
  normalized_barangay?: string;
  municipality?: string | null;
  geography_scope?: string;
  location_level: string;
  risk_score: number;
  risk_level: RiskLevel;
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

export type CaseSummary = {
  bite_id: number;
  case_number: string;
  patient_id?: number;
  patient_name: string;
  age?: number | null;
  gender?: string;
  bite_date: string | null;
  location: string;
  normalized_barangay?: string;
  category: string;
  animal_type: string;
  animal_status?: string;
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
  is_overdue?: boolean;
  days_overdue?: number;
  overdue_dose?: string | null;
  outstanding_dose_slot_count?: number;
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
    stray: number;
    owned: number;
    animal_status_unknown: number;
  };
  pep_and_biologics: {
    recorded_exposures: number;
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
  risk_alerts: {
    high_risk_zones: string[];
    overdue_count: number;
  };
};

export type Filters = {
  search: string;
  severity: string;
  status: string;
  animal: string;
  range: string;
  customFrom: string;
  customTo: string;
  cutoff: string;
};

export const priorityConfig: Record<
  PriorityLevel,
  {
    label: string;
    shortLabel: string;
    color: string;
    background: string;
    border: string;
    desc: string;
  }
> = {
  high: {
    label: 'High Priority',
    shortLabel: 'High',
    color: 'var(--bc-red)',
    background: 'var(--bc-danger-bg)',
    border: 'var(--bc-danger-border)',
    desc: 'High case volume, severe Category III exposures, or overdue PEP patients requiring immediate attention.',
  },
  medium: {
    label: 'Medium Priority',
    shortLabel: 'Medium',
    color: 'var(--bc-amber)',
    background: 'var(--bc-amber-bg)',
    border: 'var(--bc-amber-border)',
    desc: 'Moderate case frequency or mixed exposure severity. Continue standard monitoring.',
  },
  low: {
    label: 'Low Priority',
    shortLabel: 'Low',
    color: 'var(--bc-green)',
    background: 'var(--bc-success-bg)',
    border: 'var(--bc-success-border)',
    desc: 'Low bite case counts and stable follow-up compliance.',
  },
  limited_data: {
    label: 'Limited Data (<3 cases)',
    shortLabel: 'Limited data',
    color: 'var(--bc-text-secondary)',
    background: 'var(--bc-surface-3)',
    border: 'var(--bc-border)',
    desc: 'Fewer than 3 cases. Shown for reference only so isolated cases do not distort barangay ranking.',
  },
};

export interface PriorityBreakdown {
  caseBurdenScore: number;
  severityScore: number;
  overdueScore: number;
  trendScore: number;
  compositeScore: number;
  priorityLevel: PriorityLevel;
  isLimitedData: boolean;
  explanation: string;
}

export function computePriorityBreakdown(
  row: LocationSummary,
  maxCasesAcrossLocations = 1
): PriorityBreakdown {
  const isLimitedData = row.total_cases < 3;

  const caseBurdenScore = Math.min(
    100,
    Math.round((row.total_cases / Math.max(1, maxCasesAcrossLocations)) * 100)
  );
  const severityScore =
    row.total_cases > 0 ? Math.min(100, Math.round((row.cat_3 / row.total_cases) * 100)) : 0;
  const overdueScore =
    row.total_cases > 0 ? Math.min(100, Math.round((row.overdue_doses / row.total_cases) * 100)) : 0;

  let trendScore = 50;
  if (row.trend === 'up') {
    trendScore = Math.min(100, 50 + (row.trend_diff ? Math.min(50, row.trend_diff * 15) : 25));
  } else if (row.trend === 'down') {
    trendScore = Math.max(0, 50 - (row.trend_diff ? Math.min(50, Math.abs(row.trend_diff) * 15) : 25));
  } else if (row.trend === 'new') {
    trendScore = 60;
  }

  const rawComposite =
    caseBurdenScore * 0.35 + severityScore * 0.35 + overdueScore * 0.2 + trendScore * 0.1;
  const compositeScore = Math.min(100, Math.max(0, Math.round(rawComposite)));

  let priorityLevel: PriorityLevel;
  if (isLimitedData) {
    priorityLevel = 'limited_data';
  } else if (compositeScore >= 70) {
    priorityLevel = 'high';
  } else if (compositeScore >= 40) {
    priorityLevel = 'medium';
  } else {
    priorityLevel = 'low';
  }

  let explanation = '';
  if (isLimitedData) {
    explanation = `${row.location} recorded ${row.total_cases} case${
      row.total_cases === 1 ? '' : 's'
    } (${row.cat_3} Category III) during this period. Classified as Limited Data (N<3) to prevent isolated incidents from distorting community surveillance.`;
  } else if (priorityLevel === 'high') {
    const reasons: string[] = [];
    if (caseBurdenScore >= 60) reasons.push(`substantial bite volume (${row.total_cases} cases)`);
    if (severityScore >= 50)
      reasons.push(`${severityScore}% Category III exposures (${row.cat_3}/${row.total_cases})`);
    if (row.overdue_doses > 0)
      reasons.push(`${row.overdue_doses} episode(s) with overdue PEP follow-up`);
    if (row.trend === 'up') reasons.push(`an upward change (+${row.trend_diff ?? 1} cases)`);
    explanation = `Flagged for review due to ${reasons.join(', ')}. Review and follow-up recommended.`;
  } else if (priorityLevel === 'medium') {
    explanation = `Moderate activity with ${row.total_cases} recorded exposure episodes (${row.cat_3} Cat III, ${row.cat_2} Cat II). Continue routine follow-up tracking.`;
  } else {
    explanation = `Low review burden with ${row.total_cases} recorded exposure episode${
      row.total_cases === 1 ? '' : 's'
    } and stable follow-up.`;
  }

  return {
    caseBurdenScore,
    severityScore,
    overdueScore,
    trendScore,
    compositeScore,
    priorityLevel,
    isLimitedData,
    explanation,
  };
}

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

export function buildExplicitReviewReasons(loc: LocationSummary): string[] {
  if (loc.is_small_cell_suppressed) {
    return ['<5 cases (Conference Cell Suppressed)'];
  }
  const reasons: string[] = [];
  if (loc.cat_3 > 0) {
    const pct = loc.total_cases > 0 ? Math.round((loc.cat_3 / loc.total_cases) * 100) : 0;
    reasons.push(`Cat III: ${loc.cat_3} (${pct}%)`);
  }
  if ((loc.no_administration_recorded ?? 0) > 0) {
    reasons.push(`No Admin Recorded: ${loc.no_administration_recorded}`);
  }
  const overdue = loc.overdue_episodes ?? loc.overdue_doses ?? 0;
  if (overdue > 0) {
    reasons.push(`Overdue: ${overdue} ep (${loc.outstanding_dose_slots ?? overdue} slots)`);
  }
  if ((loc.age_below_15 ?? 0) > 0) {
    reasons.push(`Children <15y: ${loc.age_below_15}`);
  }
  if ((loc.unassessed ?? 0) > 0) {
    reasons.push(`Unassessed: ${loc.unassessed}`);
  }
  if (loc.trend === 'up' && loc.trend_diff && loc.trend_diff > 0) {
    reasons.push(`+${loc.trend_diff} vs prior`);
  }
  return reasons;
}
