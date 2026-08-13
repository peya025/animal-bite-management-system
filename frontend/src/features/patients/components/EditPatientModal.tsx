import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import { PatientFormContent } from '../styles/AddPatientModal.styles';
import type { Patient, EnrolmentFormData } from '../types';
import { INITIAL_ENROLMENT_DATA } from '../types';
import { useAddressLocation } from '../hooks';
import api from '../../../shared/services/api';
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
  const loc = useAddressLocation();

  useEffect(() => {
    if (open && patient) {
      setError('');
      
      // Format date of birth to YYYY-MM-DD if valid
      let formattedDob = '';
      if (patient.date_of_birth) {
        try {
          const d = new Date(patient.date_of_birth);
          if (!isNaN(d.getTime())) {
            formattedDob = d.toISOString().split('T')[0];
          }
        } catch {
          formattedDob = '';
        }
      }

      setEnrolment({
        last_name: patient.last_name || '',
        first_name: patient.first_name || '',
        middle_name: patient.middle_name || '',
        suffix: (patient as any).suffix || '',
        date_of_birth: formattedDob,
        sex: patient.gender || 'male',
        blood_type: (patient as any).blood_type || '',
        civil_status: (patient as any).civil_status || '',
        spouse_name: (patient as any).spouse_name || '',
        mother_maiden_name: (patient as any).mother_maiden_name || '',
        contact_number: patient.contact_number || patient.phone || '',
        email: patient.email || '',
        family_member: (patient as any).family_member || '',
        educational_attainment: (patient as any).educational_attainment || '',
        employment_status: (patient as any).employment_status || '',
        philhealth_member: (patient as any).philhealth_member || '',
        philhealth_status: (patient as any).philhealth_status || '',
        philhealth_no: (patient as any).philhealth_no || '',
        philhealth_category: (patient as any).philhealth_category || '',
        fourps_member: (patient as any).fourps_member || '',
        dswd_nhts: (patient as any).dswd_nhts || '',
        emergency_contact_name: (patient as any).emergency_contact_name || '',
        emergency_contact_phone: (patient as any).emergency_contact_number || (patient as any).emergency_contact_phone || '',
      });

      // Pre-fill address if available
      if (patient.address) {
        loc.setPurok(patient.address);
      }
    }
  }, [open, patient]);

  if (!open || !patient) return null;

  const handleFieldChange = (key: keyof EnrolmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let value = ev.target.value;
    if (key === 'contact_number' || key === 'emergency_contact_phone') {
      value = value.replace(/\D/g, '').slice(0, 11);
    }
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

    setError('');
    setSaving(true);

    const cleanField = (val: string) => val.trim() === '' ? null : val;
    const patientId = patient.patient_id || patient.id;

    const payload = {
      ...enrolment,
      first_name: enrolment.first_name.trim(),
      middle_name: cleanField(enrolment.middle_name),
      last_name: enrolment.last_name.trim(),
      suffix: cleanField(enrolment.suffix),
      gender: enrolment.sex,
      address: loc.full || enrolment.address || patient.address,
      contact_number: cleanField(enrolment.contact_number),
      email: cleanField(enrolment.email),
      emergency_contact_name: cleanField(enrolment.emergency_contact_name),
      emergency_contact_number: cleanField(enrolment.emergency_contact_phone),
      civil_status: cleanField(enrolment.civil_status),
      blood_type: cleanField(enrolment.blood_type),
      spouse_name: cleanField(enrolment.spouse_name),
      mother_maiden_name: cleanField(enrolment.mother_maiden_name),
      philhealth_member: cleanField(enrolment.philhealth_member),
      philhealth_status: cleanField(enrolment.philhealth_status),
      fourps_member: cleanField(enrolment.fourps_member),
      dswd_nhts: cleanField(enrolment.dswd_nhts),
    };

    try {
      await api.put(`/patients/${patientId}`, payload);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Failed to update patient record.');
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
        <GovProgramsSection data={enrolment} onChange={handleFieldChange} />
      </PatientFormContent>
    </FormModal>
  );
}
