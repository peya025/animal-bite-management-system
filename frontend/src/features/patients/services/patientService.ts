import type { EnrolmentFormData } from '../types';
import api from '../../../shared/services/api';

export async function fetchPatientsList(params: { page?: number; perPage?: number; search?: string }) {
  const response = await api.get('/patients', {
    params: {
      page: params.page || 1,
      per_page: params.perPage || 10,
      search: params.search || undefined,
    }
  });
  return response.data;
}

export async function createPatientRecord(
  enrolment: EnrolmentFormData,
  addressDetails: { full: string; munName: string; brgyName: string; purok: string }
) {
  // Map and clean payload to prevent 422 errors (empty strings failing enum validation)
  const cleanField = (val: string) => val.trim() === '' ? null : val;

  // Serialize multi-membership data into the columns that the backend knows about:
  // - other_membership: JSON array of additional program keys e.g. ["senior_citizen","pwd"]
  // - other_membership_name: JSON object with per-program names/tribe
  // - other_membership_no: JSON object with per-program ID numbers
  const otherMemberships = enrolment.other_memberships ?? [];
  const otherMembershipNames: Record<string, string> = {};
  const otherMembershipNos: Record<string, string> = {};
  if (otherMemberships.includes('senior_citizen') && enrolment.senior_citizen_id) {
    otherMembershipNos['senior_citizen'] = enrolment.senior_citizen_id;
  }
  if (otherMemberships.includes('pwd') && enrolment.pwd_id) {
    otherMembershipNos['pwd'] = enrolment.pwd_id;
  }
  if (otherMemberships.includes('indigenous_member') && enrolment.indigenous_tribe) {
    otherMembershipNames['indigenous_member'] = enrolment.indigenous_tribe;
  }
  if (otherMemberships.includes('others')) {
    if (enrolment.other_membership_custom_name) otherMembershipNames['others'] = enrolment.other_membership_custom_name;
    if (enrolment.other_membership_custom_id) otherMembershipNos['others'] = enrolment.other_membership_custom_id;
  }

  const payload = {
    ...enrolment,
    gender: enrolment.sex,
    address: addressDetails.full,
    address_municipality: addressDetails.munName,
    address_barangay: addressDetails.brgyName,
    address_purok: addressDetails.purok,
    province: 'Misamis Oriental',
    contact_number: enrolment.contact_number,
    email: cleanField(enrolment.email),
    emergency_contact_number: enrolment.emergency_contact_phone,
    
    // Clean fields that shouldn't send empty strings to strict enum rules
    civil_status: cleanField(enrolment.civil_status),
    philhealth_member: cleanField(enrolment.philhealth_member),
    philhealth_status: cleanField(enrolment.philhealth_status),
    fourps_member: cleanField(enrolment.fourps_member),
    fourps_category: cleanField(enrolment.fourps_category),
    fourps_relationship: cleanField(enrolment.fourps_relationship),
    registered_fourps_beneficiary: cleanField(enrolment.registered_fourps_beneficiary),
    dswd_nhts: cleanField(enrolment.dswd_nhts),
    has_membership: cleanField(enrolment.has_membership),
    blood_type: cleanField(enrolment.blood_type),

    // Multi-membership serialization
    other_membership: otherMemberships.length > 0
      ? JSON.stringify(otherMemberships)
      : cleanField(enrolment.other_membership),
    other_membership_name: Object.keys(otherMembershipNames).length > 0
      ? JSON.stringify(otherMembershipNames)
      : cleanField(enrolment.other_membership_name),
    other_membership_no: Object.keys(otherMembershipNos).length > 0
      ? JSON.stringify(otherMembershipNos)
      : cleanField(enrolment.other_membership_no),

    // Strip frontend-only fields not known to the backend
    other_memberships: undefined,
    senior_citizen_id: undefined,
    pwd_id: undefined,
    indigenous_tribe: undefined,
    other_membership_custom_name: undefined,
    other_membership_custom_id: undefined,
  };

  try {
    const res = await api.post('/patients', payload);
    const patientData = res.data;
    const patientId = patientData.patient?.patient_id || patientData.data?.patient_id || patientData.patient_id;

    // Automatically add patient to queue (FIFO - first come first serve)
    if (patientId) {
      try {
        await api.post('/queue', {
          patient_id: patientId,
          visit_type: 'new_case',
          priority: 'normal',
          check_in_notes: 'Auto-added from registration',
        });
      } catch (queueError) {
        console.error('Failed to add to queue:', queueError);
        // Continue anyway - patient is registered
      }
    }

    return patientData;
  } catch (err: any) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw new Error('Failed to save patient record.');
  }
}
