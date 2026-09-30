import api from '../../../shared/services/api';
import type { VaccineStockMap, TreatmentRecordPayload } from '../types/consultation.types';
import { calculateVaccineStockMap } from '../utils/inventoryStock';
import { DEFAULT_FALLBACK_VACCINES } from '../constants/consultation.constants';
import type { ProphylaxisStock } from '../../../shared/types/prophylaxis';
import { isProphylaxisInventoryName } from '../../../shared/types/prophylaxis';

export async function fetchProphylaxisStock(): Promise<{ stock: ProphylaxisStock; tetanus_brands: string[] }> {
  const res = await api.get('/inventory/prophylaxis-stock');
  return {
    stock: res.data?.stock || {},
    tetanus_brands: res.data?.tetanus_brands || [],
  };
}

export async function fetchVaccineNames(): Promise<string[]> {
  try {
    const res = await api.get('/inventory/vaccine-names');
    return (res.data?.vaccine_names || [...DEFAULT_FALLBACK_VACCINES]).filter((name: string) => !isProphylaxisInventoryName(name));
  } catch {
    return [...DEFAULT_FALLBACK_VACCINES];
  }
}

export async function fetchInventoryStock(): Promise<VaccineStockMap> {
  try {
    const res = await api.get('/inventory', { params: { per_page: 200 } });
    const items: any[] = res.data?.data || res.data || [];
    return calculateVaccineStockMap(items);
  } catch {
    return {};
  }
}

export async function fetchPatientTreatmentRecord(
  patientId: number | string,
  biteId?: number | string | null
): Promise<any> {
  const query = biteId ? `?bite_id=${biteId}` : '';
  const res = await api.get(`/treatment-records/patient/${patientId}${query}`);
  return res.data;
}

export async function submitTreatmentRecord(payload: TreatmentRecordPayload): Promise<any> {
  const res = await api.post('/treatment-records', payload);
  return res.data;
}

export async function submitAddendumNote(
  patientId: number | string,
  addendumNotes: string,
  biteId: number | string | null
): Promise<any> {
  const res = await api.post(`/treatment-records/patient/${patientId}/addendum`, {
    addendum_notes: addendumNotes,
    bite_id: biteId,
  });
  return res.data;
}
