export interface ProphylaxisOrders {
  tetanus_vaccine: string;
  tetanus_passive: string;
  rig: string;
  tetanus_history: string;
  tetanus_last_dose: string;
  rig_weight_kg: string;
  rig_indication: string;
  notes: string;
}

export const EMPTY_PROPHYLAXIS_ORDERS: ProphylaxisOrders = {
  tetanus_vaccine: '', tetanus_passive: '', rig: '', tetanus_history: '',
  tetanus_last_dose: '', rig_weight_kg: '', rig_indication: '', notes: '',
};

export function normalizeProphylaxisOrders(value?: Partial<ProphylaxisOrders> | null): ProphylaxisOrders {
  return Object.fromEntries(Object.keys(EMPTY_PROPHYLAXIS_ORDERS).map(key =>
    [key, String(value?.[key as keyof ProphylaxisOrders] ?? '')])) as unknown as ProphylaxisOrders;
}

export const PROPHYLAXIS_GROUPS = ['tetanus_passive', 'tetanus_vaccine', 'rig'] as const;
export type ProphylaxisGroup = typeof PROPHYLAXIS_GROUPS[number];

export const PROPHYLAXIS_LABELS: Record<ProphylaxisGroup, string> = {
  tetanus_passive: 'Anti-Tetanus Serum (ATS)',
  tetanus_vaccine: 'Tetanus vaccine (TT)',
  rig: 'Rabies immunoglobulin (RIG)',
};

export const PROPHYLAXIS_PRODUCTS: Record<ProphylaxisGroup, string[]> = {
  tetanus_vaccine: ['TT'], tetanus_passive: ['ATS'], rig: ['ERIG'],
};

export interface ProphylaxisStockBatch {
  inventory_id: number;
  vaccine_type: string;
  batch_number: string;
  expiration_date: string;
  current_quantity: number;
}

export type ProphylaxisStock = Record<string, ProphylaxisStockBatch[]>;

export interface ProphylaxisStockResponse {
  stock: ProphylaxisStock;
  tetanus_brands?: string[];
}

export function isProphylaxisInventoryName(name: string): boolean {
  return /(?:^|[^a-z])(?:TT|ATS|ERIG|Td|Tdap|DTaP)(?:$|[^a-z])|tetan|toxoid|tetavax|anti[- ]?tetanus|equine rabies/i.test(name);
}

export interface ProphylaxisAdministration {
  medication: string;
  date: string;
  inventory_id: string;
  inventory_units_used: string;
  route: string;
  injection_site: string;
  dosage_ml: string;
  dose_iu: string;
}
