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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Direct setter for array values or non-string fields (used by GovProgramsSection)
  const handleDirectChange = (key: keyof EnrolmentFormData, value: any) => {
    setEnrolment(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};

    if (!enrolment.last_name.trim()) {
      newFieldErrors.last_name = 'Last Name is required';
    }
    if (!enrolment.first_name.trim()) {
      newFieldErrors.first_name = 'First Name is required';
    }
    if (!enrolment.sex) {
      newFieldErrors.sex = 'Sex is required';
    }
    if (!enrolment.date_of_birth) {
      newFieldErrors.date_of_birth = 'Date of Birth is required';
    }

    if (enrolment.contact_number && enrolment.contact_number.length !== 11) {
      newFieldErrors.contact_number = 'Contact number must be exactly 11 digits.';
    }

    if (enrolment.emergency_contact_phone && enrolment.emergency_contact_phone.length !== 11) {
      newFieldErrors.emergency_contact_phone = 'Emergency contact phone must be exactly 11 digits.';
    }

    if (enrolment.philhealth_no && enrolment.philhealth_no.replace(/\D/g, '').length !== 12) {
      newFieldErrors.philhealth_no = 'PhilHealth number must be exactly 12 digits.';
    }

    if (enrolment.other_membership === 'pwd' && enrolment.other_membership_no) {
      if (enrolment.other_membership_no.replace(/\D/g, '').length !== 16) {
        newFieldErrors.other_membership_no = 'PWD ID number must be exactly 16 digits.';
      }
    }

    if (loc.useManual) {
      if (!loc.manualMun || !loc.manualBrgy) {
        newFieldErrors.address = 'Please enter Municipality and Barangay.';
      }
    } else {
      if (!loc.municipality || !loc.barangay) {
        newFieldErrors.address = 'Please select Municipality and Barangay.';
      }
    }

    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      setError('Please fill in all required fields highlighted in red below.');

      const fieldOrder = ['last_name', 'first_name', 'sex', 'date_of_birth', 'address', 'contact_number', 'emergency_contact_phone', 'philhealth_no'];
      const firstErrorKey = fieldOrder.find((key) => newFieldErrors[key]);

      if (firstErrorKey) {
        setTimeout(() => {
          const el = document.getElementById(`field-${firstErrorKey}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = el.querySelector('input, select') as HTMLElement;
            if (focusable) {
              focusable.focus({ preventScroll: true });
            }
          }
        }, 50);
      }
      return;
    }

    setError('');
    setFieldErrors({});
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
        <PatientInfoSection data={enrolment} onChange={handleFieldChange} errors={fieldErrors} />
        <AddressSection loc={loc} errors={fieldErrors} />
        <ContactSection data={enrolment} onChange={handleFieldChange} />
        <SocioeconomicSection data={enrolment} onChange={handleFieldChange} />
        <GovProgramsSection data={enrolment} onChange={handleFieldChange} onDirectChange={handleDirectChange} />
      </PatientFormContent>
    </FormModal>
  );
}
