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
  details?: Record<string, unknown>;
  memberships?: PatientMembership[];
  created_at: string;
  status?: 'active' | 'pending' | 'inactive';
}

export interface EnrolmentFormData {
  last_name: string;
  first_name: string;
  middle_name: string;
  suffix: string;
  date_of_birth: string;
  sex: string;
  blood_type: string;
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
}

export const INITIAL_ENROLMENT_DATA: EnrolmentFormData = {
  last_name: '',
  first_name: '',
  middle_name: '',
  suffix: '',
  date_of_birth: '',
  sex: '',
  blood_type: '',
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
};

export interface AddPatientModalProps {
  onClose: () => void;
  onSuccess: () => void;
  role?: string;
}

