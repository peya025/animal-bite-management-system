import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { RegistrationDialog } from './RegistrationDialog.styles';
import { RegistrationAddressSection } from './RegistrationAddressSection';
import { RegistrationErrors, advanceOnEnter, focusFirstError, registrationServerErrors } from './registrationAccessibility';
import FormModal from '../../../../components/forms/FormModal';
import { formatPhilHealthNumber, formatPWDNumber } from '../../../../shared/utils';
import { isValidFourDigitYearDate, sanitizeDateInput } from '../../../../shared/utils/date';
import { PatientFormContent } from '../../styles/AddPatientModal.styles';
import type { AddPatientModalProps, DuplicatePatientMatch, EnrolmentFormData } from '../../types';
import { getInitialEnrolmentData } from '../../types';
import { useAddressLocation } from '../../hooks';
import { checkDuplicatePatients, createPatientRecord } from '../../services';
import { useFormDraft } from '../../../../shared/hooks/useFormDraft';
import DraftStatusBadge from '../../../../shared/components/DraftStatusBadge';
import {
  PatientInfoSection,
  ContactSection,
  SocioeconomicSection,
  GovProgramsSection,
  RegistrationVitalsSection,
} from './sections';

export default function AddPatientModal({
  onClose,
  onSuccess,
  onSelectExistingPatient,
  role,
}: AddPatientModalProps) {
  const draft = useFormDraft('add-patient');

  const [enrolment, setEnrolment] = useState<EnrolmentFormData>(() => {
    const saved = draft.readDraft<EnrolmentFormData>();
    if (!saved) {
      return getInitialEnrolmentData();
    }
    // Form reopened with draft: keep saved draft values,
    // but if consultation date/time were not previously set in draft, fill them with Manila current date/time.
    const fresh = getInitialEnrolmentData();
    return {
      ...saved,
      reg_date_of_consultation: saved.reg_date_of_consultation || fresh.reg_date_of_consultation,
      reg_consultation_time: saved.reg_consultation_time || fresh.reg_consultation_time,
    };
  });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicatePatientMatch[]>([]);
  const [hasExactDuplicate, setHasExactDuplicate] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [confirmedDifferentPerson, setConfirmedDifferentPerson] = useState(false);
  const [highlightDuplicateConfirmation, setHighlightDuplicateConfirmation] = useState(false);

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

  // Reset override checkbox if primary identity fields change
  useEffect(() => {
    setConfirmedDifferentPerson(false);
    setHighlightDuplicateConfirmation(false);
  }, [enrolment.first_name, enrolment.last_name, enrolment.date_of_birth]);

  // Debounced live duplicate & homonym check (Fail-Open: never blocks form input on network error)
  useEffect(() => {
    const firstName = enrolment.first_name.trim();
    const lastName = enrolment.last_name.trim();

    if (firstName.length < 2 || lastName.length < 2) {
      setDuplicateMatches([]);
      setHasExactDuplicate(false);
      setCheckingDuplicates(false);
      return;
    }

    const dobValid =
      !enrolment.date_of_birth || isValidFourDigitYearDate(enrolment.date_of_birth);

    const abortController = new AbortController();
    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const result = await checkDuplicatePatients(
          {
            first_name: firstName,
            last_name: lastName,
            middle_name: enrolment.middle_name,
            suffix: enrolment.suffix,
            date_of_birth: dobValid ? enrolment.date_of_birth : undefined,
            gender: enrolment.sex || undefined,
          },
          abortController.signal
        );
        if (!abortController.signal.aborted) {
          setDuplicateMatches(result.matches || []);
          setHasExactDuplicate(Boolean(result.has_exact_match));
        }
      } catch {
        // Fail-Open: silently ignore aborted or failed background duplicate checks
      } finally {
        if (!abortController.signal.aborted) {
          setCheckingDuplicates(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [
    enrolment.first_name,
    enrolment.last_name,
    enrolment.middle_name,
    enrolment.suffix,
    enrolment.date_of_birth,
    enrolment.sex,
  ]);

  const closeDialog = () => { if (!savingRef.current) onClose(); };

  const handleUseExistingPatient = (patientId: number) => {
    if (savingRef.current) return;
    draft.clearDraft();
    if (onSelectExistingPatient) {
      onSelectExistingPatient(patientId);
    } else {
      onClose();
    }
  };

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
      const forcedPriority: EnrolmentFormData['queue_priority_level'] = nextGroup === 'normal' ? 'normal' : 'priority';
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
    } else if (key === 'date_of_birth' || key === 'reg_date_of_consultation') {
      value = sanitizeDateInput(value);
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

  // Direct setter for array values or non-string fields (used by GovProgramsSection & RegistrationVitalsSection)
  const handleDirectChange = (key: keyof EnrolmentFormData, value: EnrolmentFormData[keyof EnrolmentFormData]) => {
    setEnrolment(prev => {
      const next = { ...prev, [key]: value };
      draft.saveDraft(next);
      return next;
    });
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const e = { ...prev };
        delete e[key];
        return e;
      });
    }
  };

  const handleSubmit = async () => {
    if (savingRef.current) return;
    const newFieldErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

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
    } else if (!isValidFourDigitYearDate(enrolment.date_of_birth)) {
      newFieldErrors.date_of_birth = 'Please enter a valid 4-digit year.';
    } else if (enrolment.date_of_birth > today) {
      newFieldErrors.date_of_birth = 'Date of Birth cannot be a future date.';
    }
    if (canQueuePatient && !enrolment.queue_priority_group) {
      newFieldErrors.queue_priority_group = 'Priority category is required';
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

    if (!enrolment.contact_number || !enrolment.contact_number.trim()) {
      newFieldErrors.contact_number = 'Contact number is required';
    } else if (!/^09\d{9}$/.test(enrolment.contact_number.trim())) {
      newFieldErrors.contact_number = 'Mobile number must start with 09 and contain 11 digits.';
    }

    if (!enrolment.emergency_contact_name || !enrolment.emergency_contact_name.trim()) {
      newFieldErrors.emergency_contact_name = 'Emergency contact name is required';
    }

    if (!enrolment.emergency_contact_phone || !enrolment.emergency_contact_phone.trim()) {
      newFieldErrors.emergency_contact_phone = 'Emergency contact phone is required';
    } else if (!/^09\d{9}$/.test(enrolment.emergency_contact_phone.trim())) {
      newFieldErrors.emergency_contact_phone = 'Emergency contact phone must start with 09 and contain 11 digits.';
    }

    if (enrolment.philhealth_no && enrolment.philhealth_no.replace(/\D/g, '').length !== 12) {
      newFieldErrors.philhealth_no = 'PhilHealth number must be exactly 12 digits.';
    }

    if (enrolment.other_membership === 'pwd' && enrolment.other_membership_no) {
      if (enrolment.other_membership_no.replace(/\D/g, '').length !== 16) {
        newFieldErrors.other_membership_no = 'PWD ID number must be exactly 16 digits.';
      }
    }

    // Section II: For CHU / RHU Personnel Only (Referred by)
    if (enrolment.mode_of_transaction === 'referral') {
      if (!enrolment.reg_referred_by || !enrolment.reg_referred_by.trim()) {
        newFieldErrors.reg_referred_by = 'Referring health center or facility name is required.';
      }
    }

    // Section III: Consultation Details & Vitals (Required before proceeding to Doctor)
    if (!enrolment.reg_date_of_consultation || !enrolment.reg_date_of_consultation.trim()) {
      newFieldErrors.reg_date_of_consultation = 'Date of Consultation is required.';
    } else if (!isValidFourDigitYearDate(enrolment.reg_date_of_consultation)) {
      newFieldErrors.reg_date_of_consultation = 'Please enter a valid 4-digit year.';
    } else if (enrolment.reg_date_of_consultation > today) {
      newFieldErrors.reg_date_of_consultation = 'Date of Consultation cannot be a future date.';
    }

    if (!enrolment.reg_consultation_time || !enrolment.reg_consultation_time.trim()) {
      newFieldErrors.reg_consultation_time = 'Consultation time is required.';
    }

    const bp = enrolment.reg_blood_pressure ? enrolment.reg_blood_pressure.trim() : '';
    const [sys, dia] = bp ? bp.split('/') : ['', ''];
    const hasSys = Boolean(sys && sys.trim());
    const hasDia = Boolean(dia && dia.trim());
    if (!hasSys || !hasDia) {
      newFieldErrors.reg_blood_pressure = 'Blood pressure (both systolic and diastolic) is required.';
    } else {
      const s = Number(sys);
      const d = Number(dia);
      if (isNaN(s) || isNaN(d) || s < 40 || s > 300 || d < 20 || d > 200) {
        newFieldErrors.reg_blood_pressure = 'Please enter a valid blood pressure (e.g. 120/80).';
      }
    }

    const tempStr = enrolment.reg_temperature ? enrolment.reg_temperature.trim() : '';
    if (!tempStr) {
      newFieldErrors.reg_temperature = 'Temperature is required.';
    } else {
      const temp = Number(tempStr);
      if (isNaN(temp) || temp < 30 || temp > 45) {
        newFieldErrors.reg_temperature = 'Please enter a valid temperature between 30°C and 45°C.';
      }
    }

    const heightStr = enrolment.reg_height ? enrolment.reg_height.trim() : '';
    if (!heightStr) {
      newFieldErrors.reg_height = 'Height is required.';
    } else {
      const h = Number(heightStr);
      if (isNaN(h) || h < 20 || h > 300) {
        newFieldErrors.reg_height = 'Please enter a valid height in cm (e.g. 170).';
      }
    }

    const weightStr = enrolment.reg_weight ? enrolment.reg_weight.trim() : '';
    if (!weightStr) {
      newFieldErrors.reg_weight = 'Weight is required.';
    } else {
      const w = Number(weightStr);
      if (isNaN(w) || w < 1 || w > 500) {
        newFieldErrors.reg_weight = 'Please enter a valid weight in kg (e.g. 70).';
      }
    }

    if (!enrolment.reg_attending_provider || !enrolment.reg_attending_provider.trim()) {
      newFieldErrors.reg_attending_provider = 'Name of attending provider is required.';
    }

    focusErrorsRef.current = true;
    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      const errorList = Object.values(newFieldErrors);
      setError(`Required: ${errorList.slice(0, 3).join(' • ')}${errorList.length > 3 ? ` (+${errorList.length - 3} more)` : ''}`);

      return;
    }

    if (hasExactDuplicate && !confirmedDifferentPerson) {
      setHighlightDuplicateConfirmation(true);
      setError(
        'Possible duplicate patient detected with the same name and birth date. Please click "Use Existing Record" in Section I, or check the confirmation box if you verified this is a different person.'
      );
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setError('');
    setFieldErrors({});
    setHighlightDuplicateConfirmation(false);
    savingRef.current = true;
    setSaving(true);

    try {
      const submissionEnrolment: EnrolmentFormData = {
        ...enrolment,
        queue_priority_level: enrolment.queue_priority_group === 'normal' ? 'normal' : 'priority',
      };
      await createPatientRecord(submissionEnrolment, {
        full: loc.full,
        munName: loc.munName,
        brgyName: loc.brgyName,
        purok: loc.purok,
      }, {
        autoQueue: canQueuePatient,
        forceCreate: confirmedDifferentPerson,
      });
      draft.clearDraft();
      onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save patient record.';
      const causeResponse = (e as { cause?: { response?: { status?: number; data?: { code?: string; duplicates?: DuplicatePatientMatch[] } } } })?.cause?.response;

      if (causeResponse?.status === 409 && Array.isArray(causeResponse.data?.duplicates)) {
        setDuplicateMatches(causeResponse.data.duplicates);
        setHasExactDuplicate(true);
        setHighlightDuplicateConfirmation(true);
        setError(message);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }

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
              onClick={() => {
                setEnrolment(getInitialEnrolmentData());
                setDuplicateMatches([]);
                setHasExactDuplicate(false);
                setConfirmedDifferentPerson(false);
                setHighlightDuplicateConfirmation(false);
                draft.clearDraft();
              }}
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
          }}>
          <p className="registration-intro"><strong>Required fields are marked with *.</strong> Press Enter in a text field to move to the next field, or use Tab.</p>
          {error && <p ref={summaryRef} tabIndex={-1} role="alert" className="registration-error">{error}</p>}
          <PatientInfoSection
            data={enrolment}
            onChange={handleFieldChange}
            errors={fieldErrors}
            showQueueFields={canQueuePatient}
            duplicateMatches={duplicateMatches}
            hasExactDuplicate={hasExactDuplicate}
            checkingDuplicates={checkingDuplicates}
            confirmedDifferentPerson={confirmedDifferentPerson}
            onConfirmDifferentPersonChange={(checked) => {
              setConfirmedDifferentPerson(checked);
              if (checked) {
                setHighlightDuplicateConfirmation(false);
                setError('');
              }
            }}
            onSelectExistingPatient={onSelectExistingPatient ? handleUseExistingPatient : undefined}
            highlightDuplicateConfirmation={highlightDuplicateConfirmation}
          />
          <RegistrationAddressSection loc={loc} errors={fieldErrors} />
          <ContactSection data={enrolment} onChange={handleFieldChange} errors={fieldErrors} />
          <SocioeconomicSection data={enrolment} onChange={handleFieldChange} />
          <GovProgramsSection data={enrolment} onChange={handleFieldChange} onDirectChange={handleDirectChange} errors={fieldErrors} />
          <RegistrationVitalsSection
            data={enrolment}
            onChange={handleFieldChange}
            onDirectChange={(key, value) => handleDirectChange(key, value)}
            errors={fieldErrors}
          />
        </form>
        </RegistrationErrors.Provider>
      </PatientFormContent>
    </FormModal>
    </RegistrationDialog>
  );
}
