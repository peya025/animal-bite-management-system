export const CONSULTATION_TYPES_VERSION = '1.0.0';

export interface ConsultationTypesMap {
  general: boolean;
  prenatal: boolean;
  dental_care: boolean;
  child_care: boolean;
  child_nutrition: boolean;
  injury: boolean;
  adult_immunization: boolean;
  family_planning: boolean;
  postpartum: boolean;
  tuberculosis: boolean;
  child_immunization: boolean;
  sick_children: boolean;
  firecracker_injury: boolean;
}

export interface TreatmentFormData {
  // Patient Info (read-only, from queue/patient)
  last_name: string;
  first_name: string;
  middle_name: string;
  suffix: string;
  age: string;
  address: string;

  // CHU/RHU Personnel Only
  mode_of_transaction: 'walk-in' | 'visited' | 'referral' | '';
  referred_from: string;
  referred_to: string;
  pertinent_history: string;
  reason_for_referral: string;
  actions_taken: string;

  // Consultation Details
  date_of_consultation: string;
  consultation_time: string;
  blood_pressure: string;
  temperature: string;
  height: string;
  weight: string;

  // Nature of Visit
  nature_of_visit: 'new_consultation' | 'new_admission' | 'follow_up' | '';

  // Type of Consultation
  consultation_types: ConsultationTypesMap;

  // Clinical Notes
  chief_complaints: string;
  diagnosis: string; // saved as free text (checklist selections auto-fill this)
  medication_treatment: string; // saved as free text (inventory checklist auto-fills this)
  prescribed_vaccine_type: string; // doctor's structured PEP vaccine prescription (drives nurse Form 3)

  name_of_provider: string;
  laboratory_findings: string;
  performed_lab_test: string;

  // Provider Details
  name_of_attending_provider: string;
  referred_by: string;
}

export interface NewBiteData {
  new_bite_date: string;
  new_bite_place: string;
  new_exposure_type: 'bite' | 'scratch' | 'lick' | 'other';
  new_severity: 'minor' | 'moderate' | 'severe';
  new_animal_type: 'dog' | 'cat' | 'other';
  new_animal_status: 'alive' | 'dead' | 'unknown' | 'rabid';
  new_site_washed: boolean;
  new_body_part: string;
  new_wound_description: string;
}

export interface VaccineStockItem {
  total_stock: number;
  doses_per_vial: number;
  patient_capacity: number;
  open_vials_count: number;
  open_doses_used: number;
  open_doses_remaining: number;
  open_fraction_used?: string;
  open_fraction_remaining?: string;
}

export type VaccineStockMap = Record<string, VaccineStockItem>;

export interface GeneralTreatmentFormProps {
  open: boolean;
  entry: any; // Queue entry with patient data
  onClose: () => void;
  onSave: () => void;
  readOnly?: boolean;
  inline?: boolean;
  hideConsultationType?: boolean;
}

export interface TreatmentRecordPayload {
  patient_id: number | string;
  queue_id?: number | string | null;
  bite_id?: number | string | null;
  treatment_plan?: string | null;
  new_bite_date?: string | null;
  new_bite_place?: string | null;
  new_exposure_type?: string | null;
  new_severity?: string | null;
  new_animal_type?: string | null;
  new_animal_status?: string | null;
  new_site_washed?: boolean;
  new_body_part?: string | null;
  new_wound_description?: string | null;
  consultation_date: string;
  consultation_time: string;
  mode_of_transaction: string;
  referred_from?: string | null;
  referred_to?: string | null;
  pertinent_history?: string | null;
  reason_for_referral?: string | null;
  actions_taken?: string | null;
  blood_pressure?: string | null;
  temperature?: string | null;
  height?: string | null;
  weight?: string | null;
  nature_of_visit: string;
  consultation_types: string[];
  chief_complaints: string;
  diagnosis: string;
  medication_treatment: string;
  prescribed_vaccine_type?: string | null;
  laboratory_findings: string;
  performed_lab_test: string;
  provider_name?: string | null;
  attending_provider: string;
  referred_by: string;
}
