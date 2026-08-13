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
    dswd_nhts: cleanField(enrolment.dswd_nhts),
    blood_type: cleanField(enrolment.blood_type),
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
