import api from '../../../services/api';

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
  return response.data.vaccine_names || [];
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
