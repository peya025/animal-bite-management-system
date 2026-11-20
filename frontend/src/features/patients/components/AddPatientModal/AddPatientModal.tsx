import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { RegistrationDialog } from './RegistrationDialog.styles';
import { RegistrationAddressSection } from './RegistrationAddressSection';
import { RegistrationErrors, advanceOnEnter, focusFirstError, registrationServerErrors } from './registrationAccessibility';
import FormModal from '../../../../components/forms/FormModal';
import { formatPhilHealthNumber, formatPWDNumber } from '../../../../shared/utils';
import { isValidFourDigitYearDate, sanitizeDateInput, getManilaDateString } from '../../../../shared/utils/date';
import { PatientFormContent } from '../../styles/AddPatientModal.styles';
import type { AddPatientModalProps, DuplicatePatientMatch, EnrolmentFormData, RegistrationFeePayload } from '../../types';
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
  RegistrationFeesSection,
} from './sections';
import { useClinicModuleConfig } from '../../../../hooks/useClinicModuleConfig';

export default function AddPatientModal({
  onClose,
  onSuccess,
  onSelectExistingPatient,
  role,
}: AddPatientModalProps) {
  const { isFieldVisible, isFieldRequired, isSectionEnabled, getFieldRule, config } = useClinicModuleConfig();
  const draft = useFormDraft('add-patient');

  const [enrolment, setEnrolment] = useState<EnrolmentFormData>(() => {
    const saved = draft.readDraft<EnrolmentFormData>();
    if (!saved) {
      return getInitialEnrolmentData();
    }
    // Form reopened with draft: keep saved draft values,
    // but if consultation date/time were not previously set in draft, fill them with Manila current date/time.
    const fresh = getInitialEnrolmentData();
    // Safety: NEVER replay a successful payment from a restored draft!
    const restoredFee: RegistrationFeePayload | undefined = saved.registration_fee
      ? {
          ...saved.registration_fee,
          record_payment: false,
          payment: undefined,
        }
      : undefined;

    const isSavedReferral = (saved.mode_of_transaction || '').toLowerCase() === 'referral';
    return {
      ...saved,
      reg_date_of_consultation: saved.reg_date_of_consultation || fresh.reg_date_of_consultation,
      reg_consultation_time: saved.reg_consultation_time || fresh.reg_consultation_time,
      reg_attending_provider: isSavedReferral ? (saved.reg_attending_provider || '') : '',
      registration_fee: restoredFee,
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
    let next = { ...enrolment, [key]: value };
    if (key === 'mode_of_transaction' && String(value).toLowerCase() !== 'referral') {
      next = {
        ...next,
        reg_attending_provider: '',
        reg_referred_by: '',
      };
    }
    setEnrolment(next);
    draft.saveDraft(next);
    setFieldErrors(prev => {
      const e = { ...prev };
      delete e[key];
      if (key === 'mode_of_transaction' && String(value).toLowerCase() !== 'referral') {
        delete e.reg_attending_provider;
        delete e.reg_referred_by;
      }
      return e;
    });
  };

  // Direct setter for array values or non-string fields (used by GovProgramsSection & RegistrationVitalsSection)
  const handleDirectChange = (key: keyof EnrolmentFormData, value: EnrolmentFormData[keyof EnrolmentFormData]) => {
    setEnrolment(prev => {
      let next = { ...prev, [key]: value };
      if (key === 'mode_of_transaction' && String(value).toLowerCase() !== 'referral') {
        next = {
          ...next,
          reg_attending_provider: '',
          reg_referred_by: '',
        };
      }
      draft.saveDraft(next);
      return next;
    });
    setFieldErrors(prev => {
      const e = { ...prev };
      delete e[key];
      if (key === 'mode_of_transaction' && String(value).toLowerCase() !== 'referral') {
        delete e.reg_attending_provider;
        delete e.reg_referred_by;
      }
      return e;
    });
  };

  const handleSubmit = async () => {
    if (savingRef.current) return;
    const newFieldErrors: Record<string, string> = {};
    const today = getManilaDateString();

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

    // Dynamic Configurable Patient Registration fields
    if (isSectionEnabled('patient_registration_enabled')) {
      if (isFieldRequired('blood_type') && !enrolment.blood_type) {
        newFieldErrors.blood_type = 'Blood type is required';
      }
      if (isFieldRequired('mother_maiden_name') && !enrolment.mother_maiden_name?.trim()) {
        newFieldErrors.mother_maiden_name = "Mother's maiden name is required";
      }
      if (isFieldRequired('civil_status') && !enrolment.civil_status) {
        newFieldErrors.civil_status = 'Civil status is required';
      }
      if (enrolment.civil_status === 'married' && isFieldRequired('spouse_name') && !enrolment.spouse_name?.trim()) {
        newFieldErrors.spouse_name = "Spouse's name is required";
      }
    }

    // Dynamic Configurable Address fields
    if (isSectionEnabled('address_section_enabled')) {
      if (isFieldRequired('address_purok') && !loc.purok?.trim()) {
        newFieldErrors.purok = 'Purok is required';
      }
    }

    // Dynamic Configurable Socioeconomic fields
    if (isSectionEnabled('socioeconomic_section_enabled')) {
      if (isFieldRequired('educational_attainment') && !enrolment.educational_attainment) {
        newFieldErrors.educational_attainment = 'Educational attainment is required';
      }
      if (isFieldRequired('employment_status') && !enrolment.employment_status) {
        newFieldErrors.employment_status = 'Employment status is required';
      }
      if (isFieldRequired('family_member') && !enrolment.family_member) {
        newFieldErrors.family_member = 'Family member position is required';
      }
    }

    // Dynamic Configurable Government Program fields
    if (isSectionEnabled('gov_programs_section_enabled')) {
      if (isFieldRequired('philhealth_member') && !enrolment.philhealth_member) {
        newFieldErrors.philhealth_member = 'PhilHealth membership status is required';
      }
      if (isFieldRequired('fourps_member') && !enrolment.fourps_member) {
        newFieldErrors.fourps_member = '4Ps membership status is required';
      }
      if (isFieldRequired('dswd_nhts') && !enrolment.dswd_nhts) {
        newFieldErrors.dswd_nhts = 'DSWD NHTS membership status is required';
      }
      if (enrolment.philhealth_member === 'yes' && isFieldRequired('philhealth_no') && !enrolment.philhealth_no?.trim()) {
        newFieldErrors.philhealth_no = 'PhilHealth number is required';
      }
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
    if (isSectionEnabled('triage_section_enabled')) {
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

      if ((enrolment.mode_of_transaction || '').toLowerCase() === 'referral') {
        if (!enrolment.reg_attending_provider || !enrolment.reg_attending_provider.trim()) {
          newFieldErrors.reg_attending_provider = 'Name of attending provider is required.';
        }
      }
    }

    // Validate Registration Fees if enabled
    const rigRule = config?.field_rules?.rig_fee ?? getFieldRule('rig_fee') ?? 'hidden';
    const arRule = config?.field_rules?.anti_rabies_fee ?? getFieldRule('anti_rabies_fee') ?? 'hidden';
    const addRule = config?.field_rules?.additional_fees ?? getFieldRule('additional_fees') ?? 'hidden';

    const feeData = enrolment.registration_fee;

    if (rigRule === 'required') {
      const rig = feeData?.rig_fee;
      if (!rig) {
        newFieldErrors['registration_fee.rig_fee'] = 'RIG Fee is required.';
      } else if (rig.disposition === 'recorded') {
        const amt = String(rig.amount ?? '').trim();
        if (amt === '' || isNaN(Number(amt)) || Number(amt) < 0) {
          newFieldErrors['registration_fee.rig_fee'] = 'A valid RIG fee amount is required (enter 0.00 if free).';
        }
      } else if (!rig.reason || !rig.reason.trim()) {
        newFieldErrors['registration_fee.rig_fee'] = 'A reason is required when RIG Fee is not a recorded amount.';
      }
    }

    if (arRule === 'required') {
      const ar = feeData?.anti_rabies_fee;
      if (!ar) {
        newFieldErrors['registration_fee.anti_rabies_fee'] = 'Anti-Rabies Vaccine Fee is required.';
      } else if (ar.disposition === 'recorded') {
        const amt = String(ar.amount ?? '').trim();
        if (amt === '' || isNaN(Number(amt)) || Number(amt) < 0) {
          newFieldErrors['registration_fee.anti_rabies_fee'] = 'A valid Anti-Rabies fee amount is required (enter 0.00 if free).';
        }
      } else if (!ar.reason || !ar.reason.trim()) {
        newFieldErrors['registration_fee.anti_rabies_fee'] = 'A reason is required when Anti-Rabies Fee is not a recorded amount.';
      }
    }

    if (addRule === 'required') {
      const noAdd = Boolean(feeData?.no_additional_fees);
      const rows = feeData?.additional_fees || [];
      if (!noAdd && rows.length === 0) {
        newFieldErrors['registration_fee.additional_fees'] = 'Additional Fees is required. Enter items or check "No additional fees".';
      } else if (!noAdd) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row.label || !row.label.trim()) {
            newFieldErrors['registration_fee.additional_fees'] = `Additional fee item #${i + 1} requires a description.`;
            break;
          }
          if (row.disposition === 'recorded') {
            const amt = String(row.amount ?? '').trim();
            if (amt === '' || isNaN(Number(amt)) || Number(amt) < 0) {
              newFieldErrors['registration_fee.additional_fees'] = `Additional fee item #${i + 1} requires a valid amount.`;
              break;
            }
          } else if (!row.reason || !row.reason.trim()) {
            newFieldErrors['registration_fee.additional_fees'] = `Additional fee item #${i + 1} requires a reason.`;
            break;
          }
        }
      }
    }

    if (feeData?.record_payment) {
      const pay = feeData.payment;
      const payAmt = Number(pay?.amount ?? 0);
      if (!pay || !pay.amount || isNaN(payAmt) || payAmt <= 0) {
        newFieldErrors['registration_fee.payment.amount'] = 'A positive payment amount is required when recording payment.';
      }
      if (pay?.payment_method === 'other' && (!pay.payment_method_details || !pay.payment_method_details.trim())) {
        newFieldErrors['registration_fee.payment.payment_method_details'] = 'Payment method details are required when Other is selected.';
      }
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
      // Clean fee payload: omit hidden items; if all three hidden, omit fee completely
      let cleanedFee: RegistrationFeePayload | undefined = undefined;
      if (rigRule !== 'hidden' || arRule !== 'hidden' || addRule !== 'hidden') {
        const rawFee = enrolment.registration_fee;
        if (rawFee) {
          cleanedFee = {
            rig_fee: rigRule !== 'hidden' && rawFee.rig_fee?.disposition ? rawFee.rig_fee : undefined,
            anti_rabies_fee: arRule !== 'hidden' && rawFee.anti_rabies_fee?.disposition ? rawFee.anti_rabies_fee : undefined,
            additional_fees: addRule !== 'hidden' && !rawFee.no_additional_fees && rawFee.additional_fees?.length ? rawFee.additional_fees : undefined,
            no_additional_fees: addRule !== 'hidden' ? Boolean(rawFee.no_additional_fees) : undefined,
            record_payment: Boolean(rawFee.record_payment),
            payment: rawFee.record_payment ? rawFee.payment : undefined,
            notes: rawFee.notes || undefined,
          };
          if (
            !cleanedFee.rig_fee &&
            !cleanedFee.anti_rabies_fee &&
            (!cleanedFee.additional_fees || cleanedFee.additional_fees.length === 0) &&
            !cleanedFee.no_additional_fees &&
            !cleanedFee.record_payment
          ) {
            cleanedFee = undefined;
          }
        }
      }

      const submissionEnrolment: EnrolmentFormData = {
        ...enrolment,
        queue_priority_level: enrolment.queue_priority_group === 'normal' ? 'normal' : 'priority',
        registration_fee: cleanedFee,
      };
      const createdResult = await createPatientRecord(submissionEnrolment, {
        full: loc.full,
        munName: loc.munName,
        brgyName: loc.brgyName,
        purok: loc.purok,
      }, {
        autoQueue: canQueuePatient,
        forceCreate: confirmedDifferentPerson,
      });
      draft.clearDraft();
      const newPatient = createdResult?.patient || createdResult?.data || createdResult;
      onSuccess(newPatient);
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
          <RegistrationFeesSection
            data={enrolment.registration_fee}
            onChange={(updatedFee) => handleDirectChange('registration_fee', updatedFee)}
            errors={fieldErrors}
          />
        </form>
        </RegistrationErrors.Provider>
      </PatientFormContent>
    </FormModal>
    </RegistrationDialog>
  );
}
