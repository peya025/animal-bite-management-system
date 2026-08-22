import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import { formatPhilHealthNumber, formatPWDNumber } from '../../../shared/utils';
import { PatientFormContent } from '../styles/AddPatientModal.styles';
import type { Patient, EnrolmentFormData } from '../types';
import { INITIAL_ENROLMENT_DATA } from '../types';
import { useAddressLocation } from '../hooks';
import api from '../../../shared/services/api';
import { buildEnrolmentFromPatient, buildLegacyMembershipFields, toRecord } from '../utils/memberships';
import {
  PatientInfoSection,
  AddressSection,
  ContactSection,
  SocioeconomicSection,
  GovProgramsSection,
} from './AddPatientModal/sections';

interface EditPatientModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPatientModal({ open, patient, onClose, onSuccess }: EditPatientModalProps) {
  const [enrolment, setEnrolment] = useState<EnrolmentFormData>(INITIAL_ENROLMENT_DATA);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [fullPatient, setFullPatient] = useState<Patient | Record<string, unknown> | null>(null);
  const loc = useAddressLocation();
  const { setPurok } = loc;

  useEffect(() => {
    if (!open || !patient) {
      return;
    }

    setFullPatient(patient);
    setEnrolment(buildEnrolmentFromPatient(patient));

    if (patient.address) {
      setPurok(patient.address);
    }

    const patientId = patient.patient_id || patient.id;
    api.get(`/patients/${patientId}`)
      .then(({ data }) => {
        setFullPatient(data as Record<string, unknown>);
        setEnrolment(buildEnrolmentFromPatient(data as Record<string, unknown>));
        if (typeof data?.address === 'string') {
          setPurok(data.address);
        }
      })
      .catch(() => {
        setFullPatient(patient);
      });
  }, [open, patient, setPurok]);

  if (!open || !patient) return null;

  const handleFieldChange = (key: keyof EnrolmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let value = ev.target.value;
    if (key === 'contact_number' || key === 'emergency_contact_phone') {
      value = value.replace(/\D/g, '').slice(0, 11);
    } else if (key === 'philhealth_no') {
      value = formatPhilHealthNumber(value);
    } else if (key === 'other_membership_no' && enrolment.other_membership === 'pwd') {
      value = formatPWDNumber(value);
    }
    setEnrolment(prev => ({ ...prev, [key]: value }));
  };

  const handleDirectChange = (key: keyof EnrolmentFormData, value: unknown) => {
    setEnrolment(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!enrolment.last_name || !enrolment.first_name || !enrolment.date_of_birth || !enrolment.sex) {
      setError('Please fill in all required fields (Last Name, First Name, Date of Birth, Sex).');
      return;
    }

    if (enrolment.contact_number && enrolment.contact_number.length !== 11) {
      setError('Contact number must be exactly 11 digits.');
      return;
    }

    if (enrolment.emergency_contact_phone && enrolment.emergency_contact_phone.length !== 11) {
      setError('Emergency contact phone must be exactly 11 digits.');
      return;
    }

    if (enrolment.philhealth_no && enrolment.philhealth_no.replace(/\D/g, '').length !== 12) {
      setError('PhilHealth number must be exactly 12 digits.');
      return;
    }

    if (enrolment.other_membership === 'pwd' && enrolment.other_membership_no) {
      if (enrolment.other_membership_no.replace(/\D/g, '').length !== 16) {
        setError('PWD ID number must be exactly 16 digits.');
        return;
      }
    }

    setError('');
    setSaving(true);

    const cleanField = (val: string) => val.trim() === '' ? null : val;
    const patientId = patient.patient_id || patient.id;
    const patientRecord = toRecord(fullPatient ?? patient);
    const patientDetails = toRecord(patientRecord.details);
    const membershipFields = buildLegacyMembershipFields(enrolment);

    const payload = {
      first_name: enrolment.first_name.trim(),
      middle_name: cleanField(enrolment.middle_name),
      last_name: enrolment.last_name.trim(),
      suffix: cleanField(enrolment.suffix),
      gender: enrolment.sex,
      date_of_birth: cleanField(enrolment.date_of_birth),
      address: loc.full || (typeof patientRecord.address === 'string' ? patientRecord.address : patient.address),
      address_municipality: cleanField(loc.munName) || toRecord(patientDetails).address_municipality || null,
      address_barangay: cleanField(loc.brgyName) || toRecord(patientDetails).address_barangay || null,
      address_purok: cleanField(loc.purok) || toRecord(patientDetails).address_purok || null,
      province: toRecord(patientDetails).province || 'Misamis Oriental',
      contact_number: cleanField(enrolment.contact_number),
      email: cleanField(enrolment.email),
      emergency_contact_name: cleanField(enrolment.emergency_contact_name),
      emergency_contact_number: cleanField(enrolment.emergency_contact_phone),
      civil_status: cleanField(enrolment.civil_status),
      blood_type: cleanField(enrolment.blood_type),
      spouse_name: cleanField(enrolment.spouse_name),
      mother_maiden_name: cleanField(enrolment.mother_maiden_name),
      family_member: cleanField(enrolment.family_member),
      educational_attainment: cleanField(enrolment.educational_attainment),
      employment_status: cleanField(enrolment.employment_status),
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
      other_membership: membershipFields.other_membership,
      other_membership_name: membershipFields.other_membership_name,
      other_membership_no: membershipFields.other_membership_no,
      memberships: membershipFields.memberships,
    };

    try {
      await api.put(`/patients/${patientId}`, payload);
      onSuccess();
      onClose();
    } catch (e: unknown) {
      const message = typeof e === 'object' && e !== null && 'response' in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(message || (e instanceof Error ? e.message : 'Failed to update patient record.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      title="Edit Patient Record"
      subtitle={`Form 1 — Update Patient Profile (#${patient.patient_number || patient.id})`}
      onClose={onClose}
      maxWidth={850}
      footer={
        <>
          {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>{error}</p>}
          <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      <PatientFormContent>
        <PatientInfoSection data={enrolment} onChange={handleFieldChange} />
        <AddressSection loc={loc} />
        <ContactSection data={enrolment} onChange={handleFieldChange} />
        <SocioeconomicSection data={enrolment} onChange={handleFieldChange} />
        <GovProgramsSection data={enrolment} onChange={handleFieldChange} onDirectChange={handleDirectChange} />
      </PatientFormContent>
    </FormModal>
  );
}
