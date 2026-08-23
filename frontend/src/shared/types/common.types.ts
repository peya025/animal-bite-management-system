/**
 * Domain model types shared across multiple features.
 * Single source of truth — import from here, not from inline definitions.
 */

// ─── Auth & User ─────────────────────────────────────────────

export type UserRole = 'developer' | 'admin' | 'registration' | 'triage' | 'treatment';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  clinic_id: number;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  setup_completed?: boolean;
  is_setup_complete?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
  clinic: Clinic;
}

export interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Patient ─────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export interface Patient {
  id: number;
  clinic_id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  address: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  status?: 'active' | 'pending' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ─── Bite Case ────────────────────────────────────────────────

export type BiteSeverity = 'category_1' | 'category_2' | 'category_3';
export type AnimalObservationStatus = 'alive_healthy' | 'alive_sick' | 'dead' | 'unknown';
export type CaseStatus = 'ongoing' | 'completed' | 'abandoned';

export interface BiteIncident {
  id: number;
  clinic_id: number;
  patient_id: number;
  case_number: string;
  bite_date: string;
  bite_site: string;
  animal_type: string;
  animal_status?: string;
  site_washed: boolean;
  severity: BiteSeverity;
  animal_observation_status?: AnimalObservationStatus;
  treatment_given?: string;
  notes?: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  vaccination_schedules?: VaccinationSchedule[];
}

// ─── Vaccination ──────────────────────────────────────────────

export type VaccinationStatus = 'pending' | 'completed' | 'missed' | 'rescheduled';

export interface VaccinationSchedule {
  id: number;
  clinic_id: number;
  bite_incident_id: number;
  patient_id: number;
  dose_number: number;
  scheduled_date: string;
  administered_date?: string;
  vaccine_batch_number?: string;
  administered_by?: number;
  status: VaccinationStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  bite_incident?: BiteIncident;
  administrator?: User;
}

// ─── Queue ────────────────────────────────────────────────────

export type QueuePriority = 'normal' | 'urgent' | 'emergency';
export type QueueStatus = 'waiting' | 'in_consultation' | 'completed' | 'cancelled';
export type VisitType = 'new_case' | 'follow_up' | 'vaccination' | 'observation';

export interface QueueEntry {
  queue_id: number;
  queue_number: number;
  queue_date: string;
  visit_type: VisitType | string;
  priority: QueuePriority;
  status: QueueStatus;
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
  check_in_notes: string | null;
  consultation_notes: string | null;
  appointment_id?: number;
  patient: {
    patient_id: number;
    name: string;
    age: number;
    gender: string;
    contact_number: string;
  };
  biteIncident?: { bite_id: number; case_number: string; severity: string };
}

export interface QueueStats {
  total: number;
  waiting: number;
  in_consultation: number;
  completed: number;
  cancelled: number;
  by_visit_type?: Record<string, number>;
}

// ─── Inventory ────────────────────────────────────────────────

export type InventoryStatus = 'active' | 'expired' | 'deleted';

export interface VaccineTypePreset {
  id?: number;
  clinic_id?: number;
  vaccine_name: string;
  category?: string;
  default_shelf_life_months: number;
  default_open_vial_hours?: number | null;
  storage_temperature_notes?: string;
  dosing_regimen_notes?: string;
  administration_route?: string;
  is_multidose?: boolean;
  doses_per_vial?: number;
  active_batches_count?: number;
  total_stock?: number;
  total_dispensed?: number;
}

export interface InventoryItem {
  inventory_id: number;
  clinic_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: InventoryStatus;
  created_at: string;
  updated_at: string;
  transactions_count?: number;
  is_fifo_priority?: boolean;
  fifo_rank?: number | null;
  // Additional computed and metadata fields from backend
  total_dispensed?: number;
  received_from?: string;
  manufactured_date?: string;
  shelf_life_months?: number;
  open_vial_hours?: number;
  cold_chain_notes?: string;
  opened_at?: string;
  open_vial_discard_at?: string;
  open_vial_status?: 'unopened' | 'opened' | 'discarded' | 'depleted';
}

export interface InventoryStats {
  total_batches: number;
  active_batches: number;
  depleted_batches: number;
  expired_batches: number;
  total_stock: number;
  expiring_soon: number;
  low_stock: number;
}

export interface InventoryTransaction {
  id: number;
  inventory_id: number;
  type: 'addition' | 'deduction' | 'adjustment' | 'expired';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes?: string;
  transaction_date: string;
  created_by?: number;
}

// ─── Staff Invitation ─────────────────────────────────────────

export interface StaffInvitation {
  id: number;
  clinic_id: number;
  email: string;
  role: UserRole;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: number;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}
