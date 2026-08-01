import { useState } from 'react';
import FormModal from '../../../../components/forms/FormModal';
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
    setEnrolment(prev => ({ ...prev, [key]: ev.target.value }));
  };

  const handleSubmit = async () => {
    if (!enrolment.last_name || !enrolment.first_name || !enrolment.date_of_birth || !enrolment.sex) {
      setError('Please fill in all required fields (Last Name, First Name, Date of Birth, Sex).');
      return;
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
