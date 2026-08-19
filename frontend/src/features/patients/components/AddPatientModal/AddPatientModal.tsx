import { useState } from 'react';
import FormModal from '../../../../components/forms/FormModal';
import { formatPhilHealthNumber, formatPWDNumber } from '../../../../shared/utils';
import { PatientFormContent } from '../../styles/AddPatientModal.styles';
import type { AddPatientModalProps, EnrolmentFormData } from '../../types';
import { INITIAL_ENROLMENT_DATA } from '../../types';
import { useAddressLocation } from '../../hooks';
import { createPatientRecord } from '../../services';
import {
  PatientInfoSection,
  AddressSection,
  ContactSection,
  SocioeconomicSection,
  GovProgramsSection,
} from './sections';

export default function AddPatientModal({ onClose, onSuccess }: AddPatientModalProps) {
  const [enrolment, setEnrolment] = useState<EnrolmentFormData>(INITIAL_ENROLMENT_DATA);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const loc = useAddressLocation();

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

    if (loc.useManual) {
      if (!loc.manualMun || !loc.manualBrgy) {
        setError('Please enter Municipality and Barangay.');
        return;
      }
    } else {
      if (!loc.municipality || !loc.barangay) {
        setError('Please select Municipality and Barangay.');
        return;
      }
    }

    setError('');
    setSaving(true);

    try {
      await createPatientRecord(enrolment, {
        full: loc.full,
        munName: loc.munName,
        brgyName: loc.brgyName,
        purok: loc.purok,
      });
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to save patient record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      title="Patient Registration"
      subtitle="Form 1 — Patient Enrolment"
      onClose={onClose}
      maxWidth={850}
      footer={
        <>
          {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>{error}</p>}
          <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Patient Record'}
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
