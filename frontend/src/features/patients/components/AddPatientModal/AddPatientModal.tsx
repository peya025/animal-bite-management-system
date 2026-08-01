import { useState } from 'react';
import FormModal from '../../../../components/forms/FormModal';
import { PatientFormContent } from './AddPatientModal.styles';
import type { AddPatientModalProps, EnrolmentFormData } from './AddPatientModal.types';
import { INITIAL_ENROLMENT_DATA } from './AddPatientModal.types';
import { useAddressLocation } from './useAddressLocation';
import { PatientInfoSection } from './PatientInfoSection';
import { AddressSection } from './AddressSection';
import { ContactSection } from './ContactSection';
import { SocioeconomicSection } from './SocioeconomicSection';
import { GovProgramsSection } from './GovProgramsSection';

export default function AddPatientModal({ onClose, onSuccess }: AddPatientModalProps) {
  const [enrolment, setEnrolment] = useState<EnrolmentFormData>(INITIAL_ENROLMENT_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loc = useAddressLocation();

  const handleFieldChange = (key: keyof EnrolmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setEnrolment(prev => ({ ...prev, [key]: ev.target.value }));
  };

  const handleSubmit = async () => {
    // Validate required Patient Enrolment fields
    if (!enrolment.last_name || !enrolment.first_name || !enrolment.date_of_birth || !enrolment.sex) {
      setError('Please fill in all required fields (Last Name, First Name, Date of Birth, Sex).');
      return;
    }

    // Validate address based on entry mode
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
      const token = localStorage.getItem('authToken');

      const payload = {
        ...enrolment,
        gender: enrolment.sex,
        address: loc.full,
        address_municipality: loc.munName,
        address_barangay: loc.brgyName,
        address_purok: loc.purok,
        province: 'Misamis Oriental',
        phone: enrolment.contact_number,
        emergency_contact_phone: enrolment.emergency_contact_phone,
      };

      const res = await fetch('http://localhost:8000/api/patients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message || 'Failed to save patient.');
      }

      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to save patient.');
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
