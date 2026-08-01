export interface PsgcItem {
  code: string;
  name: string;
}

export interface Patient {
  id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  phone?: string;
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
  family_member: string;
  educational_attainment: string;
  employment_status: string;
  philhealth_member: string;
  philhealth_status: string;
  philhealth_no: string;
  philhealth_category: string;
  fourps_member: string;
  dswd_nhts: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
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
  family_member: '',
  educational_attainment: '',
  employment_status: '',
  philhealth_member: '',
  philhealth_status: '',
  philhealth_no: '',
  philhealth_category: '',
  fourps_member: '',
  dswd_nhts: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
};

export interface AddPatientModalProps {
  onClose: () => void;
  onSuccess: () => void;
  role?: string;
}
