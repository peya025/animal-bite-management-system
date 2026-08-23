import type { EnrolmentFormData } from '../types';
import api from '../../../shared/services/api';
import { buildLegacyMembershipFields } from '../utils/memberships';

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
  addressDetails: { full: string; munName: string; brgyName: string; purok: string },
  options: { autoQueue?: boolean } = {}
) {
  // Map and clean payload to prevent 422 errors (empty strings failing enum validation)
  const cleanField = (val: string) => val.trim() === '' ? null : val;

  const membershipFields = buildLegacyMembershipFields(enrolment);
  const queueCategoryMap: Record<EnrolmentFormData['queue_priority_group'], 'regular' | 'pregnant' | 'senior_citizen' | 'pwd'> = {
    normal: 'regular',
    pregnant: 'pregnant',
    senior: 'senior_citizen',
    pwd: 'pwd',
  };
  const isSpecialPriorityCategory = ['pregnant', 'senior', 'pwd'].includes(enrolment.queue_priority_group);
  const queuePriority = isSpecialPriorityCategory || enrolment.queue_priority_level === 'priority'
    ? 'urgent'
    : 'normal';

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
    philhealth_member: membershipFields.philhealth_member,
    philhealth_status: cleanField(membershipFields.philhealth_status ?? enrolment.philhealth_status),
    philhealth_no: cleanField(membershipFields.philhealth_no ?? enrolment.philhealth_no),
    philhealth_category: cleanField(membershipFields.philhealth_category ?? enrolment.philhealth_category),
    fourps_member: membershipFields.fourps_member,
    fourps_category: cleanField(membershipFields.fourps_category ?? enrolment.fourps_category),
    fourps_relationship: cleanField(membershipFields.fourps_relationship ?? enrolment.fourps_relationship),
    registered_fourps_beneficiary: cleanField(membershipFields.registered_fourps_beneficiary ?? enrolment.registered_fourps_beneficiary),
    dswd_nhts: membershipFields.dswd_nhts,
    has_membership: membershipFields.has_membership,
    blood_type: cleanField(enrolment.blood_type),
    memberships: membershipFields.memberships,
    other_membership: membershipFields.other_membership,
    other_membership_name: membershipFields.other_membership_name,
    other_membership_no: membershipFields.other_membership_no,

    // Strip frontend-only fields not known to the backend
    other_memberships: undefined,
    senior_citizen_id: undefined,
    pwd_id: undefined,
    indigenous_tribe: undefined,
    other_membership_custom_name: undefined,
    other_membership_custom_id: undefined,
    visit_type: undefined,
    follow_up_date: undefined,
    queue_priority_group: undefined,
    queue_priority_level: undefined,
  };

  try {
    const res = await api.post('/patients', payload);
    const patientData = res.data;
    const patientId = patientData.patient?.patient_id || patientData.data?.patient_id || patientData.patient_id;

    // Automatically add patient to queue when requested
    if (patientId && options.autoQueue) {
      try {
        const queueNotes = [
          'Auto-added from registration',
          enrolment.visit_type === 'follow_up' && enrolment.follow_up_date
            ? `Follow-up date: ${enrolment.follow_up_date}`
            : null,
        ].filter(Boolean).join(' | ');

        await api.post('/queue', {
          patient_id: patientId,
          visit_type: enrolment.visit_type,
          priority: queuePriority,
          queue_category: queueCategoryMap[enrolment.queue_priority_group],
          check_in_notes: queueNotes,
        });
      } catch (queueError) {
        console.error('Failed to add to queue:', queueError);
        // Continue anyway - patient is registered
      }
    }

    return patientData;
  } catch (err: unknown) {
    const responseMessage = typeof err === 'object' && err !== null
      && 'response' in err
      && typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
      : null;

    if (responseMessage) {
      throw new Error(responseMessage, { cause: err });
    }

    throw new Error('Failed to save patient record.', { cause: err });
  }
}
