// User and Authentication Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'registration' | 'triage' | 'treatment';
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
  setup_completed: boolean;
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

// Patient Types
export interface Patient {
  id: number;
  clinic_id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// Bite Case Types
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
  severity: 'category_1' | 'category_2' | 'category_3';
  animal_observation_status?: 'alive_healthy' | 'alive_sick' | 'dead' | 'unknown';
  treatment_given?: string;
  notes?: string;
  status: 'ongoing' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
  patient?: Patient;
  vaccination_schedules?: VaccinationSchedule[];
}

// Vaccination Types
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
  status: 'pending' | 'completed' | 'missed' | 'rescheduled';
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  bite_incident?: BiteIncident;
  administrator?: User;
}

// Queue Types
export interface PatientQueue {
  id: number;
  clinic_id: number;
  patient_id: number;
  queue_number: number;
  queue_date: string;
  purpose: string;
  priority: 'normal' | 'urgent' | 'emergency';
  status: 'waiting' | 'called' | 'serving' | 'completed';
  called_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

// Staff Invitation Types
export interface StaffInvitation {
  id: number;
  clinic_id: number;
  email: string;
  role: 'admin' | 'registration' | 'triage' | 'treatment';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: number;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

// Clinic Module Configuration Types
export type FieldRuleValue = 'required' | 'optional' | 'hidden';

export interface FieldRules {
  // PATIENT REGISTRATION FIELDS
  blood_type: FieldRuleValue;
  mother_maiden_name: FieldRuleValue;
  civil_status: FieldRuleValue;
  spouse_name: FieldRuleValue;
  
  // ADDRESS FIELDS
  address_municipality: FieldRuleValue;
  address_barangay: FieldRuleValue;
  address_purok: FieldRuleValue;
  province: FieldRuleValue;
  
  // SOCIOECONOMIC FIELDS
  educational_attainment: FieldRuleValue;
  employment_status: FieldRuleValue;
  family_member: FieldRuleValue;
  
  // GOVERNMENT PROGRAMS
  philhealth_member: FieldRuleValue;
  philhealth_status: FieldRuleValue;
  philhealth_no: FieldRuleValue;
  philhealth_category: FieldRuleValue;
  fourps_member: FieldRuleValue;
  dswd_nhts: FieldRuleValue;
  
  // BITE INCIDENT INTAKE FIELDS
  bite_date: FieldRuleValue;
  bite_place: FieldRuleValue;
  site_washed: FieldRuleValue;
  exposure_type: FieldRuleValue;
  animal_type: FieldRuleValue;
  animal_status: FieldRuleValue;
  animal_captured: FieldRuleValue;
  wound_location: FieldRuleValue;
  patient_description: FieldRuleValue;
  
  // TRIAGE/ASSESSMENT FIELDS
  exposure_category: FieldRuleValue;
  bite_site: FieldRuleValue;
  animal_observation_status: FieldRuleValue;
  treatment_given: FieldRuleValue;
  
  // TREATMENT FIELDS
  protocol_type: FieldRuleValue;
  route: FieldRuleValue;
  injection_site: FieldRuleValue;
  dosage_ml: FieldRuleValue;
  vaccine_brand: FieldRuleValue;
  vaccine_generic: FieldRuleValue;
  batch_no: FieldRuleValue;
  tt_status: FieldRuleValue;
  medication_given: FieldRuleValue;
  adverse_reaction: FieldRuleValue;
  cost_recovery: FieldRuleValue;
}

export interface ClinicModuleConfig {
  id: number;
  clinic_id: number;
  triage_module_enabled: boolean;
  field_rules: FieldRules;
  created_at: string;
  updated_at: string;
}

export type AssignedModule = 'all' | 'registration' | 'triage' | 'treatment' | 'inventory';

export interface StaffUser extends User {
  assigned_module: AssignedModule;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
