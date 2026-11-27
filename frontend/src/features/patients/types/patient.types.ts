import { getManilaCurrentDateTime } from '../../../shared/utils';
import type { RegistrationFeePayload } from '../../../types';

export type {
  FeeDisposition,
  FeeStatus,
  RegistrationFeeItemInput,
  RegistrationFeePaymentInput,
  RegistrationFeePayload,
  RegistrationFeeItemData,
  RegistrationFeePaymentData,
  RegistrationFeeData,
  RegistrationEncounterData,
} from '../../../types';

export interface PsgcItem {
  code: string;
  name: string;
}

export interface PatientMembership {
  id?: number;
  membership_type: 'philhealth' | 'fourps' | 'dswd_nhts' | 'senior_citizen' | 'pwd' | 'indigenous_member' | 'other';
  is_active?: boolean;
  status_value?: string | null;
  category?: string | null;
  relationship_value?: string | null;
  registered_beneficiary?: string | null;
  membership_id_no?: string | null;
  membership_label?: string | null;
  extra_value?: string | null;
}

export interface Patient {
  patient_id?: number;
  id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  contact_number?: string;
  phone?: string;
  email?: string;
  age?: number;
  registration_source?: string;
  details?: Record<string, unknown>;
  memberships?: PatientMembership[];
  created_at: string;
  status?: 'active' | 'pending' | 'inactive';
  has_completed_primary?: boolean;
  actions?: {
    primary: 'reassess' | 'checkin' | null;
    check_in_blocked_reason: string | null;
    invite: 'send' | 'resend' | null;
    invite_disabled_reason: string | null;
    has_email?: boolean;
    view: boolean;
    invitation_id?: number | null;
  };
}

export const PATIENT_SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'] as const;
export type PatientSuffix = (typeof PATIENT_SUFFIX_OPTIONS)[number];

export function normalizePatientSuffix(value?: string | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  const key = trimmed.replace(/\.+$/, '').toLowerCase();
  const canonicalMap: Record<string, PatientSuffix> = {
    jr: 'Jr.',
    sr: 'Sr.',
    ii: 'II',
    iii: 'III',
    iv: 'IV',
    v: 'V',
  };
  return canonicalMap[key] ?? trimmed;
}

export interface EnrolmentFormData {
  last_name: string;
  first_name: string;
  middle_name: string;
  no_middle_name?: boolean;
  suffix: string;
  date_of_birth: string;
  sex: string;
  blood_type: string;
  visit_type: 'new_case' | 'follow_up';
  follow_up_date: string;
  queue_priority_group: 'normal' | 'pregnant' | 'senior' | 'pwd';
  queue_priority_level: 'normal' | 'priority';
  civil_status: string;
  spouse_name: string;
  mother_maiden_name: string;
  contact_number: string;
  email: string;
  family_member: string;
  educational_attainment: string;
  employment_status: string;
  philhealth_member: string;
  philhealth_status: string;
  philhealth_no: string;
  philhealth_category: string;
  fourps_member: string;
  fourps_category: string;
  fourps_relationship: string;
  registered_fourps_beneficiary: string;
  dswd_nhts: string;
  has_membership: string;
  other_membership: string;
  other_membership_name: string;
  other_membership_no: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  // Multi-membership support
  other_memberships: string[];
  senior_citizen_id: string;
  pwd_id: string;
  indigenous_tribe: string;
  other_membership_custom_name: string;
  other_membership_custom_id: string;
  // II. For CHU / RHU Personnel Only
  mode_of_transaction: 'walk-in' | 'visited' | 'referral' | string;
  // III. Consultation Details & Vitals (entered by Registration Staff during patient registration)
  animal_bite_id?: number;
  animal_type?: string;
  animal_type_others?: string;
  animal_status?: string;
  animal_available?: string;
  animal_condition?: string;
  reg_date_of_consultation: string;
  reg_consultation_time: string;
  reg_blood_pressure: string;   // combined "120/80" string, same format as treatment_records.blood_pressure
  reg_temperature: string;
  reg_height: string;
  reg_weight: string;
  reg_attending_provider: string;
  reg_referred_by: string;      // full facility name string, same format as treatment_records.referred_by
  // Nature of Visit (stored on treatment_records.nature_of_visit)
  nature_of_visit: 'new_consultation' | 'new_admission' | 'follow_up' | '';
  // Fees and Payment
  registration_fee?: RegistrationFeePayload;
}

export const INITIAL_ENROLMENT_DATA: EnrolmentFormData = {
  last_name: '',
  first_name: '',
  middle_name: '',
  no_middle_name: false,
  suffix: '',
  date_of_birth: '',
  sex: '',
  blood_type: '',
  visit_type: 'new_case',
  follow_up_date: '',
  queue_priority_group: 'normal',
  queue_priority_level: 'normal',
  civil_status: '',
  spouse_name: '',
  mother_maiden_name: '',
  contact_number: '',
  email: '',
  family_member: '',
  educational_attainment: '',
  employment_status: '',
  philhealth_member: '',
  philhealth_status: '',
  philhealth_no: '',
  philhealth_category: '',
  fourps_member: '',
  fourps_category: '',
  fourps_relationship: '',
  registered_fourps_beneficiary: '',
  dswd_nhts: '',
  has_membership: '',
  other_membership: '',
  other_membership_name: '',
  other_membership_no: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  // Multi-membership
  other_memberships: [],
  senior_citizen_id: '',
  pwd_id: '',
  indigenous_tribe: '',
  other_membership_custom_name: '',
  other_membership_custom_id: '',
  // II. For CHU / RHU Personnel Only
  mode_of_transaction: 'walk-in',
  // III. Consultation Details & Vitals
  reg_date_of_consultation: '',
  reg_consultation_time: '',
  reg_blood_pressure: '',
  reg_temperature: '',
  reg_height: '',
  reg_weight: '',
  reg_attending_provider: '',
  reg_referred_by: '',
  nature_of_visit: '',
};

export function getInitialEnrolmentData(): EnrolmentFormData {
  const { date, time } = getManilaCurrentDateTime();
  return {
    ...INITIAL_ENROLMENT_DATA,
    reg_date_of_consultation: date,
    reg_consultation_time: time,
  };
}

export type DuplicateMatchTier = 'exact' | 'high' | 'homonym';

export interface DuplicatePatientMatch {
  patient_id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  full_name: string;
  gender: 'male' | 'female' | string;
  date_of_birth?: string | null;
  age?: number | null;
  registration_source: string;
  has_mobile_account: boolean;
  address_barangay?: string | null;
  address_municipality?: string | null;
  mother_maiden_name?: string | null;
  has_completed_primary: boolean;
  active_episodes_count: number;
  last_visit_date?: string | null;
  match_tier: DuplicateMatchTier;
}

export interface DuplicateCheckResponse {
  has_exact_match: boolean;
  has_matches: boolean;
  matches: DuplicatePatientMatch[];
}

export interface AddPatientModalProps {
  onClose: () => void;
  onSuccess: (patient?: any) => void;
  onSelectExistingPatient?: (patientId: number) => void;
  role?: string;
}
