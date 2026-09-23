import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { RegistrationDialog } from './RegistrationDialog.styles';
import { RegistrationAddressSection } from './RegistrationAddressSection';
import { RegistrationErrors, advanceOnEnter, focusFirstError, registrationServerErrors } from './registrationAccessibility';
import FormModal from '../../../../components/forms/FormModal';
import { formatPhilHealthNumber, formatPWDNumber } from '../../../../shared/utils';
import { PatientFormContent } from '../../styles/AddPatientModal.styles';
import type { AddPatientModalProps, EnrolmentFormData } from '../../types';
import { INITIAL_ENROLMENT_DATA } from '../../types';
import { useAddressLocation } from '../../hooks';
import { createPatientRecord } from '../../services';
import { useFormDraft } from '../../../../shared/hooks/useFormDraft';
import DraftStatusBadge from '../../../../shared/components/DraftStatusBadge';
import {
  PatientInfoSection,
  ContactSection,
  SocioeconomicSection,
  GovProgramsSection,
} from './sections';

export default function AddPatientModal({ onClose, onSuccess, role }: AddPatientModalProps) {
  const draft = useFormDraft('add-patient');

  const [enrolment, setEnrolment] = useState<EnrolmentFormData>(() => {
    const saved = draft.readDraft<EnrolmentFormData>();
    return saved ?? INITIAL_ENROLMENT_DATA;
  });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const loc = useAddressLocation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const savingRef = useRef(false);
  const focusErrorsRef = useRef(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => { previous?.focus(); };
  }, []);

  useLayoutEffect(() => {
    if (formRef.current && focusErrorsRef.current && Object.keys(fieldErrors).length) {
      focusErrorsRef.current = false;
      focusFirstError(formRef.current, summaryRef.current);
    }
  }, [fieldErrors]);

  const closeDialog = () => { if (!savingRef.current) onClose(); };

  const handleDialogKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      closeDialog();
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex="0"]') || [])
      .filter(el => !el.matches(':disabled') && el.tabIndex >= 0 && el.getClientRects().length > 0);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const canQueuePatient = role !== 'patient';

  const handleFieldChange = (key: keyof EnrolmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let value = ev.target.value;
    if (key === 'visit_type' && value !== 'follow_up') {
      const next = { ...enrolment, visit_type: value as EnrolmentFormData['visit_type'], follow_up_date: '' };
      setEnrolment(next);
      draft.saveDraft(next);
      if (fieldErrors.follow_up_date) {
        setFieldErrors(prev => {
          const e = { ...prev };
          delete e.follow_up_date;
          return e;
        });
      }
      return;
    }
    if (key === 'queue_priority_group') {
      const nextGroup = value as EnrolmentFormData['queue_priority_group'];
      const forcedPriority = (nextGroup === 'normal' ? 'normal' : 'priority') as 'normal' | 'priority';
      const next = { ...enrolment, queue_priority_group: nextGroup, queue_priority_level: forcedPriority };
      setEnrolment(next);
      draft.saveDraft(next);
      if (fieldErrors.queue_priority_group || fieldErrors.queue_priority_level) {
        setFieldErrors(prev => {
          const e = { ...prev };
          delete e.queue_priority_group;
          delete e.queue_priority_level;
          return e;
        });
      }
      return;
    }
    if (key === 'contact_number' || key === 'emergency_contact_phone') {
      value = value.replace(/\D/g, '').slice(0, 11);
    } else if (key === 'philhealth_no') {
      value = formatPhilHealthNumber(value);
    } else if (key === 'other_membership_no' && enrolment.other_membership === 'pwd') {
      value = formatPWDNumber(value);
    }
    const next = { ...enrolment, [key]: value };
    setEnrolment(next);
    draft.saveDraft(next);
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const e = { ...prev };
        delete e[key];
        return e;
      });
    }
  };

  // Direct setter for array values or non-string fields (used by GovProgramsSection)
  const handleDirectChange = (key: keyof EnrolmentFormData, value: EnrolmentFormData[keyof EnrolmentFormData]) => {
    setEnrolment(prev => {
      const next = { ...prev, [key]: value };
      draft.saveDraft(next);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (savingRef.current) return;
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
    } else if (enrolment.date_of_birth > new Date().toISOString().split('T')[0]) {
      newFieldErrors.date_of_birth = 'Date of Birth cannot be a future date.';
    }
    if (canQueuePatient && !enrolment.queue_priority_group) {
      newFieldErrors.queue_priority_group = 'Queue category is required';
    }
    if (canQueuePatient && enrolment.queue_priority_group !== 'normal' && !enrolment.queue_priority_level) {
      newFieldErrors.queue_priority_level = 'Priority is required';
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

    focusErrorsRef.current = true;
    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      const errorList = Object.values(newFieldErrors);
      setError(`Required: ${errorList.slice(0, 3).join(' • ')}${errorList.length > 3 ? ` (+${errorList.length - 3} more)` : ''}`);

      return;
    }

    setError('');
    setFieldErrors({});
    savingRef.current = true;
    setSaving(true);

    try {
      await createPatientRecord(enrolment, {
        full: loc.full,
        munName: loc.munName,
        brgyName: loc.brgyName,
        purok: loc.purok,
      }, {
        autoQueue: canQueuePatient,
      });
      draft.clearDraft();
      onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save patient record.';
      const serverErrors = registrationServerErrors(e, enrolment);
      focusErrorsRef.current = true;
      setFieldErrors(serverErrors);
      setError(message);
      if (!Object.keys(serverErrors).length) requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <RegistrationDialog ref={dialogRef} onKeyDown={handleDialogKeys}>
    <FormModal
      title="Patient Registration"
      subtitle="Form 1 — Patient Enrolment"
      onClose={closeDialog}
      maxWidth={900}
      footer={
        <>
          <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} style={{ marginRight: 'auto' }} />
          {draft.hasDraft && draft.status === 'idle' && (
            <button type="button" className="fm-btn fm-btn--cancel" style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => { setEnrolment(INITIAL_ENROLMENT_DATA); draft.clearDraft(); }}
              disabled={saving}>
              Discard draft
            </button>
          )}
          <button type="button" className="fm-btn fm-btn--cancel" onClick={closeDialog} disabled={saving}>Cancel</button>
          <button type="button" className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving\u2026' : 'Save Patient Record'}
          </button>
        </>
      }
    >
      <PatientFormContent>
        <RegistrationErrors.Provider value={fieldErrors}>
        <form ref={formRef} className="registration-form" noValidate aria-label="Patient registration" aria-busy={saving}
          onSubmit={event => event.preventDefault()}
          onKeyDown={event => advanceOnEnter(event, handleSubmit)}
          onChange={event => {
            const target: EventTarget = event.target;
            const name = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement ? target.name : '';
            if (name && fieldErrors[name]) setFieldErrors(previous => { const next = { ...previous }; delete next[name]; return next; });
            // Also schedule a draft save from the current enrolment state captured in next render
            // (handleFieldChange already calls saveDraft for direct changes; this catches
            //  any edge-case native changes that may bypass handleFieldChange)
          }}>
          <p className="registration-intro"><strong>Required fields are marked with *.</strong> Press Enter in a text field to move to the next field, or use Tab.</p>
          {error && <p ref={summaryRef} tabIndex={-1} role="alert" className="registration-error">{error}</p>}
          <PatientInfoSection data={enrolment} onChange={handleFieldChange} errors={fieldErrors} showQueueFields={canQueuePatient} />
          <RegistrationAddressSection loc={loc} errors={fieldErrors} />
          <ContactSection data={enrolment} onChange={handleFieldChange} errors={fieldErrors} />
          <SocioeconomicSection data={enrolment} onChange={handleFieldChange} />
          <GovProgramsSection data={enrolment} onChange={handleFieldChange} onDirectChange={handleDirectChange} errors={fieldErrors} />
        </form>
        </RegistrationErrors.Provider>
      </PatientFormContent>
    </FormModal>
    </RegistrationDialog>
  );
}
