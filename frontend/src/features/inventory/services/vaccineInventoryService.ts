import api from '../../../services/api';
import { isProphylaxisInventoryName } from '../../../shared/types/prophylaxis';

// ─── Types ────────────────────────────────────────────────────
export interface VaccineBatch {
  inventory_id: number;
  clinic_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'depleted';
  created_at: string;
  updated_at: string;
  is_fifo_priority?: boolean;
  fifo_rank?: number | null;
}

export interface FifoRecommendation {
  recommended_batch: VaccineBatch;
  all_batches_fifo: VaccineBatch[];
  total_stock: number;
}

export interface FifoRecommendations {
  fifo_recommendations: Record<string, FifoRecommendation>;
}

export interface FifoBatchResponse {
  fifo_batch: VaccineBatch;
  is_open_vial?: boolean;
  next_dose_index?: number;
  total_doses?: number;
  units_to_deduct?: number;
  discard_at?: string | null;
  message: string;
}

export interface FifoValidationResponse {
  is_fifo_compliant: boolean;
  fifo_batch_id: number;
  selected_batch_id: number;
  message: string;
}

export interface UseVaccineRequest {
  vaccine_type: string;
  quantity: number;
  treatment_id: number;
  force_batch_id?: number;
}

export interface UseVaccineResponse {
  message: string;
  batch_used: VaccineBatch;
  quantity_used: number;
  remaining_quantity: number;
}

// ─── Service Methods ──────────────────────────────────────────

/**
 * Get all FIFO recommendations grouped by vaccine type
 */
export async function getFifoRecommendations(): Promise<FifoRecommendations> {
  const response = await api.get('/inventory/fifo-recommendations');
  return response.data;
}

/**
 * Get the next FIFO batch for a specific vaccine type
 */
export async function getNextFifoBatch(vaccineType: string): Promise<FifoBatchResponse> {
  const response = await api.get('/inventory/next-fifo-batch', {
    params: { vaccine_type: vaccineType },
  });
  return response.data;
}

/**
 * Validate if a selected batch is FIFO compliant
 */
export async function validateFifoBatch(
  vaccineType: string,
  batchId: number
): Promise<FifoValidationResponse> {
  const response = await api.post('/inventory/validate-fifo', {
    vaccine_type: vaccineType,
    batch_id: batchId,
  });
  return response.data;
}

/**
 * Use vaccine from inventory (with FIFO enforcement)
 */
export async function useVaccine(data: UseVaccineRequest): Promise<UseVaccineResponse> {
  const response = await api.post('/inventory/use-vaccine', data);
  return response.data;
}

/**
 * Get available vaccine names for dropdown
 */
export async function getVaccineNames(): Promise<string[]> {
  const response = await api.get('/inventory/vaccine-names');
  const names: string[] = response.data?.vaccine_names || [];
  return names.filter((name: string) => !isProphylaxisInventoryName(name));
}

/**
 * Get all vaccine inventory batches
 */
export async function getVaccineInventory(params?: {
  status?: string;
  vaccine_type?: string;
  per_page?: number;
}): Promise<{ data: VaccineBatch[]; total: number }> {
  const response = await api.get('/inventory', { params });
  return {
    data: response.data.data || response.data || [],
    total: response.data.total || (response.data.data || response.data || []).length,
  };
}

/**
 * Get reusable vaccine type preset profiles
 */
export async function getVaccinePresets(): Promise<any[]> {
  const response = await api.get('/inventory/presets');
  return response.data.presets || [];
}

/**
 * Store a new reusable vaccine type preset profile
 */
export async function storeVaccinePreset(data: any): Promise<any> {
  const response = await api.post('/inventory/presets', data);
  return response.data;
}

/**
 * Update an existing reusable vaccine type preset profile
 */
export async function updateVaccinePreset(id: number, data: any): Promise<any> {
  const response = await api.put(`/inventory/presets/${id}`, data);
  return response.data;
}

/**
 * Delete a reusable vaccine type preset profile
 */
export async function deleteVaccinePreset(id: number): Promise<any> {
  const response = await api.delete(`/inventory/presets/${id}`);
  return response.data;
}

/**
 * Mark a vial in a batch as opened
 */
export async function openVial(inventoryId: number, openVialHours?: number): Promise<any> {
  const response = await api.post(`/inventory/${inventoryId}/open-vial`, {
    open_vial_hours: openVialHours,
  });
  return response.data;
}

/**
 * Discard / Clear an opened vial
 */
export async function discardVial(inventoryId: number, reason?: string): Promise<any> {
  const response = await api.post(`/inventory/${inventoryId}/discard-vial`, {
    reason,
  });
  return response.data;
}

export interface VaccineVialWastageItem {
  wastage_id: number;
  portions_discarded: number;
  reason: string;
  disposed_at: string;
  disposed_by_name: string;
}

export interface VaccineVialAdministrationItem {
  treatment_id: number;
  patient_id: number;
  patient_name: string;
  case_number?: string | null;
  dose_number: number;
  dose_label: string;
  route: string;
  vial_portion_number?: number | null;
  treatment_date: string | null;
  administered_at: string | null;
  administered_by_name: string;
}

export interface VaccineVialDetail {
  vial_id: number;
  vial_code: string;
  inventory_id: number;
  vaccine_type: string;
  batch_number: string;
  total_portions: number;
  administered_portions: number;
  discarded_portions: number;
  available_portions: number;
  undisposed_portions: number;
  status: 'opened' | 'depleted' | 'expired' | 'disposed';
  effective_status: 'opened' | 'depleted' | 'expired' | 'disposed';
  is_expired: boolean;
  is_disposed: boolean;
  open_vial_hours?: number | null;
  opened_at?: string | null;
  use_by_at?: string | null;
  opened_by_name?: string | null;
  expired_at?: string | null;
  expired_by_name?: string | null;
  expired_reason?: string | null;
  disposed_at?: string | null;
  disposed_by_name?: string | null;
  wastage_reason?: string | null;
  stock_deducted?: boolean;
  summary_text: string;
  wastages?: VaccineVialWastageItem[];
  administrations?: VaccineVialAdministrationItem[];
}

export async function getVialDetail(vialId: number): Promise<VaccineVialDetail> {
  const response = await api.get(`/inventory/vials/${vialId}`);
  return response.data.vial;
}

export async function getVials(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  vaccine_type?: string;
  search?: string;
}): Promise<{ data: VaccineVialDetail[]; total: number }> {
  const response = await api.get('/inventory/vials', { params });
  return {
    data: response.data.data || [],
    total: response.data.total || 0,
  };
}

export interface WastageLogItem {
  wastage_id: number;
  vial_id: number;
  vial_code?: string | null;
  inventory_id: number;
  vaccine_type: string;
  batch_number: string;
  portions_discarded: number;
  reason: string;
  disposed_at: string;
  disposed_by_id?: number;
  disposed_by_name: string;
}

export async function getWastages(params?: {
  page?: number;
  per_page?: number;
  vaccine_type?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{
  data: WastageLogItem[];
  total: number;
  summary: { total_portions_discarded: number; total_wastage_events: number };
}> {
  const response = await api.get('/inventory/wastages', { params });
  return {
    data: response.data.data || [],
    total: response.data.total || 0,
    summary: response.data.summary || { total_portions_discarded: 0, total_wastage_events: 0 },
  };
}

export async function markVialExpired(vialId: number, reason?: string): Promise<{ message: string; vial: VaccineVialDetail }> {
  const response = await api.post(`/inventory/vials/${vialId}/expire`, {
    reason: reason?.trim() || undefined,
  });
  return response.data;
}

export async function disposeVialRecord(
  vialId: number,
  payload: { portions_discarded: number; reason: string; disposed_at?: string }
): Promise<{ message: string; vial: VaccineVialDetail }> {
  const response = await api.post(`/inventory/vials/${vialId}/dispose`, payload);
  return response.data;
}

export interface DailyVialForecastRow {
  date: string;
  day_label: string;
  is_today: boolean;
  is_open: boolean;
  committed_followups: number;
  dose_breakdown: {
    d0: number;
    d3: number;
    d7: number;
    d14: number;
    d28: number;
    other: number;
  };
  brand_doses: Record<string, number>;
  waiting_room_d0: number;
  expected_walkin_d0: number;
  total_expected_doses: number;
  vials_committed_only: number;
  vials_realistic: number;
  vials_conservative_im: number;
  open_vial_leftover_doses: number;
  high_wastage_risk: boolean;
  expired_before_day_vials: number;
  usable_stock_start: number;
  projected_stock_after: number;
  shortfall_vials: number;
  status: 'ok' | 'tight' | 'shortfall' | 'closed';
}

export interface BrandSupplySummary {
  brand: string;
  usable_vials: number | null;
  doses_per_vial: number;
  earliest_expiry: string | null;
  scheduled_doses_7d: number;
  scheduled_doses_14d: number;
  scheduled_doses_horizon: number;
}

export interface ExpiringUnusedBatch {
  inventory_id: number;
  vaccine_type: string;
  batch_number: string;
  expiration_date: string;
  current_quantity: number;
  projected_unused_vials: number;
  days_until_expiry: number;
}

export interface RigReadinessSummary {
  usable_rig_vials: number;
  immediate_pending_cases: number;
  recent_30d_cat3_cases: number;
  projected_7d_cat3_cases: number;
  projected_7d_rig_vials: number;
  status: 'shortfall' | 'tight' | 'ok';
  headline: string;
}

export interface FollowupVialReadiness {
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

export interface FollowupVialForecastResponse {
  rule_version: string;
  reference_date: string;
  horizon_days: number;
  effective_doses_per_vial: number;
  usable_stock: {
    arv_vials: number;
    rig_vials: number;
    arv_expiring_within_30d: number;
    rig_expiring_within_30d: number;
    earliest_arv_expiry: string | null;
    earliest_rig_expiry: string | null;
  };
  same_day_waiting_demand: {
    form1_awaiting_today: number;
    form2_prescribed_unstarted: number;
    estimated_waiting_d0_doses: number;
    historical_pep_initiation_rate_pct: number;
  };
  walkin_baseline: {
    d0_last_30d: number;
    open_days_last_30d: number;
    daily_walkin_d0_rate: number;
  };
  daily_schedule: DailyVialForecastRow[];
  brand_summary: BrandSupplySummary[];
  expiring_before_use_batches: ExpiringUnusedBatch[];
  rig_readiness: RigReadinessSummary;
  vial_readiness: FollowupVialReadiness;
}

export async function getSupplyForecast(horizon = 14): Promise<FollowupVialForecastResponse> {
  const response = await api.get('/inventory/supply-forecast', {
    params: { horizon },
  });
  return response.data;
}
