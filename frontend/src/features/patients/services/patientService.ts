import type { EnrolmentFormData } from '../types';

const API_URL = 'http://localhost:8000/api';

export async function fetchPatientsList(params: { page?: number; perPage?: number; search?: string }) {
  const token = localStorage.getItem('authToken');
  const query = new URLSearchParams({
    page: String(params.page || 1),
    per_page: String(params.perPage || 10),
    ...(params.search ? { search: params.search } : {}),
  });

  const res = await fetch(`${API_URL}/patients?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!res.ok) throw new Error('Failed to load patients');
  return res.json();
}

export async function createPatientRecord(
  enrolment: EnrolmentFormData,
  addressDetails: { full: string; munName: string; brgyName: string; purok: string }
) {
  const token = localStorage.getItem('authToken');
  const payload = {
    ...enrolment,
    gender: enrolment.sex,
    address: addressDetails.full,
    address_municipality: addressDetails.munName,
    address_barangay: addressDetails.brgyName,
    address_purok: addressDetails.purok,
    province: 'Misamis Oriental',
    phone: enrolment.contact_number,
    emergency_contact_phone: enrolment.emergency_contact_phone,
  };

  const res = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || 'Failed to save patient record.');
  }

  const patientData = await res.json();
  const patientId = patientData.patient?.patient_id || patientData.data?.patient_id || patientData.patient_id;

  // Automatically add patient to queue (FIFO - first come first serve)
  if (patientId) {
    try {
      await fetch(`${API_URL}/queue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          visit_type: 'new_case',
          priority: 'normal',
          check_in_notes: 'Auto-added from registration',
        }),
      });
      // Queue addition is best-effort, don't fail registration if it fails
    } catch (queueError) {
      console.error('Failed to add to queue:', queueError);
      // Continue anyway - patient is registered
    }
  }

  return patientData;
}
