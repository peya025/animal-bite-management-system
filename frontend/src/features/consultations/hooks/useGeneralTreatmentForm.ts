import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeProphylaxisOrders, getTetanusCategoryFromOrders } from '../../../shared/types/prophylaxis';
import type { ProphylaxisOrders, ProphylaxisStock } from '../../../shared/types/prophylaxis';
import type {
  TreatmentFormData,
  VaccineStockMap,
  GeneralTreatmentFormProps,
  ConsultationTypesMap,
  TreatmentRecordPayload,
  PatientReportedIntake,
} from '../types/consultation.types';
import {
  INITIAL_FORM_DATA,
  ANIMAL_BITE_DIAGNOSES,
  PERTINENT_HISTORY_OPTIONS,
} from '../constants/consultation.constants';
import {
  asText,
  getCurrentUserName,
  getCurrentUserRole,
  resolveAttendingProvider,
  resolveHealthCareProvider,
  syncChecklistWithText,
  scrollToFirstError,
  isValidFourDigitYearDate,
} from '../utils/consultationHelpers';
import {
  fetchVaccineNames,
  fetchInventoryStock,
  fetchProphylaxisStock,
  fetchPatientTreatmentRecord,
  submitTreatmentRecord,
  submitAddendumNote,
} from '../services/consultationService';
import { useFormDraft } from '../../../shared/hooks/useFormDraft';
import { getManilaCurrentDateTime } from '../../../shared/utils';

export function useGeneralTreatmentForm({
  open,
  entry,
  onClose,
  onSave,
  readOnly = false,
  inline = false,
  hideConsultationType,
}: GeneralTreatmentFormProps) {
  const userRole = getCurrentUserRole();
  const shouldHideConsultationType =
    hideConsultationType ?? (userRole === 'triage' || userRole === 'doctor');
  const selectedIncident = entry?.incident || entry?.bite_incident || entry?.biteIncident;

  const entryRef = useRef(entry);
  entryRef.current = entry;

  // Build a stable draft key from patient + bite so each clinical episode
  // has its own isolated draft.
  const patientId = entry?.patient?.patient_id ?? entry?.patient?.id ?? null;
  const biteId =
    entry?.bite_id ??
    entry?.incident?.bite_id ??
    entry?.bite_incident?.bite_id ??
    entry?.biteIncident?.bite_id ??
    null;
  const sessionKey = open && patientId ? `${patientId}-${biteId ?? 'active'}` : null;
  const loadedSessionKeyRef = useRef<string | null>(null);

  const draftKey =
    open && patientId && !readOnly
      ? `treatment-${patientId}${biteId ? `-${biteId}` : ''}`
      : null;
  const draft = useFormDraft(draftKey);

  const [formData, setFormData] = useState<TreatmentFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vaccineNames, setVaccineNames] = useState<string[]>([]);
  const [vaccineStockMap, setVaccineStockMap] = useState<VaccineStockMap>({});
  const [prophylaxisStock, setProphylaxisStock] = useState<ProphylaxisStock | null | undefined>(undefined);
  const [tetanusBrands, setTetanusBrands] = useState<string[]>([]);
  const [atsBrands, setAtsBrands] = useState<string[]>([]);
  const [currentUserName] = useState<string>(() => getCurrentUserName());

  // Track if a record has already been saved for this patient
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  // Track whether the form is currently in edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [existingRecord, setExistingRecord] = useState<any>(null);

  // Medical-legal post-treatment lock: true if patient has >= 1 administered vaccine dose
  const [hasAdministeredVaccine, setHasAdministeredVaccine] = useState(false);
  const [isReturningNewBite, setIsReturningNewBite] = useState(false);
  const [requiresReExposureDecision, setRequiresReExposureDecision] = useState(false);
  const [addendumNote, setAddendumNote] = useState('');
  const [savingAddendum, setSavingAddendum] = useState(false);
  const [addendumSuccess, setAddendumSuccess] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [episodeHistory, setEpisodeHistory] = useState<any[]>([]);
  const [patientReportedIntake, setPatientReportedIntake] = useState<PatientReportedIntake | null>(null);

  const [checkedDiagnoses, setCheckedDiagnoses] = useState<string[]>([]);
  const [checkedHistory, setCheckedHistory] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Effective read-only status:
  // If global readOnly is true, OR if patient has already received vaccines (strictly locked),
  // OR if an existing record exists and we are not in edit mode.
  const isFormDisabled = readOnly || hasAdministeredVaccine || (hasExistingRecord && !isEditing);
  const isNatureOfVisitAutomatic = requiresReExposureDecision;

  // Fetch available vaccine names and live inventory stock
  useEffect(() => {
    fetchVaccineNames().then(setVaccineNames);
    fetchInventoryStock().then(setVaccineStockMap);
    fetchProphylaxisStock().then(res => {
      setProphylaxisStock(res.stock);
      if (res.tetanus_brands && res.tetanus_brands.length > 0) {
        setTetanusBrands(res.tetanus_brands);
      }
      if (res.ats_brands && res.ats_brands.length > 0) {
        setAtsBrands(res.ats_brands);
      }
    }).catch(() => setProphylaxisStock(null));
  }, []);

  const populateFormFromRecord = useCallback((record: any, preserveEmptyMeds: boolean = false) => {
    const diagText = asText(record.diagnosis);
    const medText = preserveEmptyMeds ? '' : asText(record.medication_treatment);

    let cTypes: string[] = [];
    if (Array.isArray(record.consultation_types)) {
      cTypes = record.consultation_types;
    } else if (typeof record.consultation_types === 'string') {
      try {
        const parsed = JSON.parse(record.consultation_types);
        if (Array.isArray(parsed)) cTypes = parsed;
      } catch {
        // ignore
      }
    }

    setFormData((prev) => ({
      ...prev,
      mode_of_transaction: record.mode_of_transaction || '',
      exposure_category: record.exposure_category ?? prev.exposure_category,
      referred_from: record.referred_from || '',
      referred_to: record.referred_to || '',
      referred_by: record.referred_by || '',
      pertinent_history: asText(record.pertinent_history),
      reason_for_referral: record.reason_for_referral || 'For further evaluation and management.',
      actions_taken: asText(record.actions_taken),
      date_of_consultation: record.consultation_date || prev.date_of_consultation,
      consultation_time: record.consultation_time || prev.consultation_time,
      blood_pressure: record.blood_pressure || '',
      temperature: record.temperature || '',
      height: record.height || '',
      weight: record.weight || '',
      nature_of_visit: record.nature_of_visit || '',
      consultation_types: {
        general: cTypes.includes('general'),
        prenatal: cTypes.includes('prenatal'),
        dental_care: cTypes.includes('dental_care'),
        child_care: cTypes.includes('child_care'),
        child_nutrition: cTypes.includes('child_nutrition'),
        injury: cTypes.includes('injury'),
        adult_immunization: cTypes.includes('adult_immunization'),
        family_planning: cTypes.includes('family_planning'),
        postpartum: cTypes.includes('postpartum'),
        tuberculosis: cTypes.includes('tuberculosis'),
        child_immunization: cTypes.includes('child_immunization'),
        sick_children: cTypes.includes('sick_children'),
        firecracker_injury: cTypes.includes('firecracker_injury'),
      },
      chief_complaints: record.chief_complaints || '',
      diagnosis: diagText,
      medication_treatment: record.prescribed_vaccine_type || medText,
      prescribed_vaccine_type: record.prescribed_vaccine_type || '',
      prophylaxis_orders: normalizeProphylaxisOrders(record.prophylaxis_orders),
      name_of_provider: resolveHealthCareProvider(record) || prev.name_of_provider,
      name_of_attending_provider: resolveAttendingProvider(entryRef.current, record) || prev.name_of_attending_provider,
      laboratory_findings: record.laboratory_findings || '',
      performed_lab_test: record.performed_lab_test || '',
    }));

    const matchedDiag = ANIMAL_BITE_DIAGNOSES.filter((d) => diagText.includes(d));
    setCheckedDiagnoses(matchedDiag);

    const histText = asText(record.pertinent_history);
    setCheckedHistory(PERTINENT_HISTORY_OPTIONS.filter((h) => histText.includes(h)));
  }, []);

  // Load existing treatment record when opening form
  useEffect(() => {
    if (!open || !patientId) {
      loadedSessionKeyRef.current = null;
      return;
    }

    if (loadedSessionKeyRef.current === sessionKey) {
      return;
    }
    loadedSessionKeyRef.current = sessionKey;

    const currentEntry = entryRef.current;
    const initialAttending = resolveAttendingProvider(currentEntry);
    const initialProvider = resolveHealthCareProvider();
    const { date: manilaDate, time: manilaTime } = getManilaCurrentDateTime();

    setFormData(() => ({
      ...INITIAL_FORM_DATA,
      date_of_consultation: manilaDate,
      consultation_time: manilaTime,
      last_name: currentEntry?.patient?.last_name || '',
      first_name: currentEntry?.patient?.first_name || '',
      middle_name: currentEntry?.patient?.middle_name || '',
      suffix: currentEntry?.patient?.suffix || '',
      age: String(currentEntry?.patient?.age || ''),
      address: currentEntry?.patient?.address || 'Misamis Oriental',
      name_of_provider: initialProvider,
      name_of_attending_provider: initialAttending,
      medication_treatment: '',
      nature_of_visit: '',
    }));
    setCheckedDiagnoses([]);
    setCheckedHistory([]);
    setError('');
    setTreatmentPlan('');
    setEpisodeHistory([]);
    setFieldErrors({});
    setTouchedFields({});
    setIsReturningNewBite(false);
    setRequiresReExposureDecision(false);
    setPatientReportedIntake(null);

    const initialIncident = selectedIncident;
    if (initialIncident) {
      const intake = initialIncident.intake || null;
      setPatientReportedIntake(intake);
    }

    const pid = patientId;
    const fetchBiteId = biteId;

    fetchPatientTreatmentRecord(pid, fetchBiteId)
      .then((data) => {
        const category = data?.exposure_category ?? data?.active_bite_incident?.exposure_category ?? '';
        const record = data?.latest_treatment ? { ...data.latest_treatment, exposure_category: category } : null;
        setFormData(prev => ({ ...prev, exposure_category: category }));
        const isVaccinated = Boolean(data?.has_administered_vaccine);
        const isReturning = Boolean(data?.is_returning_new_bite);
        const needsReExposureDecision = Boolean(data?.requires_re_exposure_decision);
        setHasAdministeredVaccine(isVaccinated);
        setIsReturningNewBite(isReturning);
        setRequiresReExposureDecision(needsReExposureDecision);
        if (needsReExposureDecision) {
          setFormData((prev) => ({ ...prev, nature_of_visit: 'new_consultation' }));
        }
        setEpisodeHistory(data?.episode_history || []);

        const activeInc = data?.active_bite_incident || initialIncident;
        if (activeInc) {
          const intake = activeInc.intake || null;
          setPatientReportedIntake(intake);
        }

        const isNewSession =
          entryRef.current?.visit_type === 'new_case' || entryRef.current?.visit_type === 'consultation' || isReturning;

        // A TreatmentRecord created by Registration Staff has status='scheduled'
        // and no chief_complaints. It is NOT a completed Doctor Form 2 entry —
        // the Doctor must still fill in all clinical fields.
        // Treat it as a vitals-pre-filled new session so the form opens in
        // entry mode ("Save Patient Record") rather than view mode ("Edit Record").
        const isRegistrationStaffPrefill =
          record &&
          record.status === 'scheduled' &&
          !record.chief_complaints;

        if (record && !isRegistrationStaffPrefill && (record.treatment_id || record.chief_complaints || record.consultation_date)) {
          setHasExistingRecord(true);
          setIsEditing(false);
          setExistingRecord(record);
          populateFormFromRecord(record, isNewSession);
          if (isNewSession) {
            setFormData((prev) => ({ ...prev, nature_of_visit: 'new_consultation' }));
          }
        } else {
          // Either no record at all, or a Registration Staff pre-fill.
          // Open in new-entry mode. Still populate vitals from the pre-fill
          // so the Doctor sees them read-only in Section III.
          setHasExistingRecord(false);
          setIsEditing(true);
          setExistingRecord(isRegistrationStaffPrefill ? record : null);
          // If this is a Registration Staff pre-fill, populate vitals fields into
          // formData so VitalsConsultationSection can display them read-only.
          if (isRegistrationStaffPrefill && record) {
            setFormData((prev) => ({
              ...prev,
              mode_of_transaction:  record.mode_of_transaction || prev.mode_of_transaction || 'walk-in',
              date_of_consultation: record.consultation_date || prev.date_of_consultation,
              consultation_time:    record.consultation_time || prev.consultation_time,
              blood_pressure:       record.blood_pressure || prev.blood_pressure,
              temperature:          record.temperature || prev.temperature,
              height:               record.height || prev.height,
              weight:               record.weight || prev.weight,
              name_of_attending_provider: record.attending_provider || prev.name_of_attending_provider,
              referred_by:          record.referred_by || prev.referred_by,
            }));
          }
          const resolvedAttending = resolveAttendingProvider(entryRef.current, null, data?.patient);
          if (resolvedAttending) {
            setFormData((prev) => ({ ...prev, name_of_attending_provider: resolvedAttending }));
          }

          // Restore draft for a new (unsaved) record after the server
          // population is complete so draft values win over the fresh defaults.
          const savedDraft = draft.readDraft<{
            formData: TreatmentFormData;
            checkedDiagnoses: string[];
            checkedHistory: string[];
          }>();
          if (savedDraft) {
            setFormData({
              ...INITIAL_FORM_DATA,
              ...savedDraft.formData,
              exposure_category: savedDraft.formData.exposure_category ?? category,
              ...(isRegistrationStaffPrefill && record ? {
                mode_of_transaction: record.mode_of_transaction || 'walk-in',
                referred_by: record.referred_by || '',
              } : {}),
            });
            setCheckedDiagnoses(savedDraft.checkedDiagnoses ?? []);
            setCheckedHistory(savedDraft.checkedHistory ?? []);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load existing record:', err);
        setHasExistingRecord(false);
        setIsEditing(true);
        setExistingRecord(null);

        // Still try to restore draft even on fetch error
        const savedDraft = draft.readDraft<{
          formData: TreatmentFormData;
          checkedDiagnoses: string[];
          checkedHistory: string[];
        }>();
        if (savedDraft) {
          setFormData({ ...INITIAL_FORM_DATA, ...savedDraft.formData });
          setCheckedDiagnoses(savedDraft.checkedDiagnoses ?? []);
          setCheckedHistory(savedDraft.checkedHistory ?? []);
        }
      });
  }, [open, sessionKey, patientId, biteId, populateFormFromRecord, selectedIncident, draftKey, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Save the complete form snapshot to draft storage */
  const saveDraftSnapshot = useCallback(
    (nextFormData: TreatmentFormData, nextDiagnoses?: string[], nextHistory?: string[]) => {
      draft.saveDraft({
        formData: nextFormData,
        checkedDiagnoses: nextDiagnoses ?? checkedDiagnoses,
        checkedHistory: nextHistory ?? checkedHistory,
      });
    },
    [draft, checkedDiagnoses, checkedHistory],
  );

  const handleFieldBlur = (key: string) => () => {    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    const newErrors: Record<string, string> = { ...fieldErrors };
    if (key === 'nature_of_visit' && !formData.nature_of_visit) {
      newErrors.nature_of_visit = 'Please select Nature of Visit';
    } else if (key === 'nature_of_visit') {
      delete newErrors.nature_of_visit;
    }
    if (key === 'chief_complaints' && !formData.chief_complaints.trim()) {
      newErrors.chief_complaints = 'Please enter Chief Complaints';
    } else if (key === 'chief_complaints') {
      delete newErrors.chief_complaints;
    }
    setFieldErrors(newErrors);
  };

  const handleFieldChange = (key: keyof TreatmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = ev.target.value;
    setFormData((prev) => {
      const next = { ...prev, [key]: val };
      saveDraftSnapshot(next);
      return next;
    });
    if (fieldErrors[key as string] && (typeof val !== 'string' || val.trim())) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        if (Object.keys(next).length === 0) {
          setError('');
        } else {
          setError(`Required: ${Object.values(next).join(' • ')}`);
        }
        return next;
      });
    }
  };

  const handleCheckboxChange = (key: keyof ConsultationTypesMap) => (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => {
      const updatedTypes = { ...prev.consultation_types, [key]: ev.target.checked };
      const hasAny = Object.values(updatedTypes).some((v) => v);
      if (hasAny && fieldErrors.consultation_types) {
        setFieldErrors((errs) => {
          const next = { ...errs };
          delete next.consultation_types;
          if (Object.keys(next).length === 0) {
            setError('');
          } else {
            setError(`Required: ${Object.values(next).join(' • ')}`);
          }
          return next;
        });
      }
      const next = { ...prev, consultation_types: updatedTypes };
      saveDraftSnapshot(next);
      return next;
    });
  };

  const toggleDiagnosis = (item: string) => {
    const { nextChecked, nextText } = syncChecklistWithText(
      item,
      checkedDiagnoses,
      formData.diagnosis
    );
    setCheckedDiagnoses(nextChecked);
    setFormData((prev) => {
      const next = { ...prev, diagnosis: nextText };
      saveDraftSnapshot(next, nextChecked, checkedHistory);
      return next;
    });
  };

  const handleClearDiagnoses = () => {
    setCheckedDiagnoses([]);
    setFormData((p) => {
      const next = { ...p, diagnosis: '' };
      saveDraftSnapshot(next, [], checkedHistory);
      return next;
    });
  };

  const toggleHistory = (item: string) => {
    const { nextChecked, nextText } = syncChecklistWithText(
      item,
      checkedHistory,
      formData.pertinent_history
    );
    setCheckedHistory(nextChecked);
    setFormData((prev) => {
      const next = { ...prev, pertinent_history: nextText };
      saveDraftSnapshot(next, checkedDiagnoses, nextChecked);
      return next;
    });
  };

  const handlePrescribedVaccineChange = (vaccineType: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        prescribed_vaccine_type: vaccineType,
        medication_treatment: vaccineType,
      };
      saveDraftSnapshot(next);
      return next;
    });
  };

  const handleProphylaxisChange = (orders: ProphylaxisOrders) => {
    const nextOrders = normalizeProphylaxisOrders(orders);
    setFormData((prev) => ({ ...prev, prophylaxis_orders: nextOrders }));
    saveDraftSnapshot({ ...formData, prophylaxis_orders: nextOrders });

    setFieldErrors((errs) => {
      let changed = false;
      const next = { ...errs };
      const tetanusCat = nextOrders.tetanus_category || getTetanusCategoryFromOrders(nextOrders);
      if (tetanusCat && next.tetanus_category) {
        delete next.tetanus_category;
        changed = true;
      }
      if (nextOrders.tetanus_passive && nextOrders.tetanus_passive !== 'none' && next.tetanus_passive) {
        delete next.tetanus_passive;
        changed = true;
      }
      if (nextOrders.tetanus_vaccine && nextOrders.tetanus_vaccine !== 'none' && next.tetanus_vaccine) {
        delete next.tetanus_vaccine;
        changed = true;
      }
      if (next.tetanus_last_dose) {
        if (!nextOrders.tetanus_last_dose || isValidFourDigitYearDate(nextOrders.tetanus_last_dose)) {
          delete next.tetanus_last_dose;
          changed = true;
        }
      }
      if (changed) {
        if (Object.keys(next).length === 0) {
          setError('');
        } else {
          setError(`Required: ${Object.values(next).join(' • ')}`);
        }
        return next;
      }
      return errs;
    });
  };

  const handleTreatmentPlanChange = (plan: string) => {
    setTreatmentPlan(plan);
    if (plan && fieldErrors.treatment_plan) {
      setFieldErrors((errs) => {
        const next = { ...errs };
        delete next.treatment_plan;
        if (Object.keys(next).length === 0) {
          setError('');
        } else {
          setError(`Required: ${Object.values(next).join(' • ')}`);
        }
        return next;
      });
    }
  };

  const handleSaveAddendum = async () => {
    const patientId = entry?.patient?.patient_id || entry?.patient?.id;
    if (!patientId || !addendumNote.trim()) return;

    setSavingAddendum(true);
    setAddendumSuccess('');
    setError('');

    try {
      const biteId = entry?.bite_id || entry?.incident?.bite_id || entry?.bite_incident?.bite_id || entry?.biteIncident?.bite_id || null;
      if (!biteId) {
        setError('Select a bite episode before adding a clinical note.');
        return;
      }
      const data = await submitAddendumNote(patientId, addendumNote.trim(), biteId);
      setAddendumSuccess('Clinical addendum recorded successfully.');
      setAddendumNote('');
      if (data?.treatment_record) {
        setExistingRecord(data.treatment_record);
        populateFormFromRecord(data.treatment_record);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save clinical addendum note');
    } finally {
      setSavingAddendum(false);
    }
  };

  const handleSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};

    if (!formData.nature_of_visit) {
      newFieldErrors.nature_of_visit = 'Please select Nature of Visit';
    }

    const hasConsultationType = Object.values(formData.consultation_types).some((v) => v);
    if (!hasConsultationType) {
      if (shouldHideConsultationType) {
        formData.consultation_types.injury = true;
      } else {
        newFieldErrors.consultation_types = 'Please select at least one Type of Consultation';
      }
    }

    if (!formData.exposure_category) {
      newFieldErrors.exposure_category = 'Please select Exposure Category';
    }

    if (!formData.chief_complaints.trim()) {
      newFieldErrors.chief_complaints = 'Please enter Chief Complaints';
    }

    if (requiresReExposureDecision && !treatmentPlan) {
      newFieldErrors.treatment_plan = 'Please select a Doctor treatment decision.';
    }

    // Tetanus Prophylaxis Order Validation
    const pOrders = formData.prophylaxis_orders;
    const tetanusCat = pOrders?.tetanus_category || getTetanusCategoryFromOrders(pOrders);

    if (!tetanusCat) {
      newFieldErrors.tetanus_category = 'Please select the tetanus prophylaxis assessment.';
    } else if (tetanusCat === 'ats') {
      if (!pOrders.tetanus_passive || pOrders.tetanus_passive === 'none') {
        newFieldErrors.tetanus_passive = 'Please select an available ATS product.';
      }
    } else if (tetanusCat === 'tt') {
      if (!pOrders.tetanus_vaccine || pOrders.tetanus_vaccine === 'none') {
        newFieldErrors.tetanus_vaccine = 'Please select an available TT vaccine product.';
      }
    } else if (tetanusCat === 'ats_tt') {
      if (!pOrders.tetanus_passive || pOrders.tetanus_passive === 'none') {
        newFieldErrors.tetanus_passive = 'Please select an available ATS product.';
      }
      if (!pOrders.tetanus_vaccine || pOrders.tetanus_vaccine === 'none') {
        newFieldErrors.tetanus_vaccine = 'Please select an available TT vaccine product.';
      }
    }

    // Validate Tetanus Last Dose (if entered, must have exactly 4-digit year and be a valid date)
    if (pOrders?.tetanus_last_dose && pOrders.tetanus_last_dose.trim()) {
      const lastDoseVal = pOrders.tetanus_last_dose.trim();
      const parts = lastDoseVal.split('-');
      const yearStr = parts[0] || '';
      const yearNum = parseInt(yearStr, 10);
      const todayStr = getManilaCurrentDateTime().date;

      if (
        yearStr.length !== 4 ||
        isNaN(yearNum) ||
        yearNum < 1000 ||
        yearNum > 9999 ||
        !isValidFourDigitYearDate(lastDoseVal)
      ) {
        newFieldErrors.tetanus_last_dose = 'Please enter a valid 4-digit year.';
      } else if (lastDoseVal > todayStr) {
        newFieldErrors.tetanus_last_dose = 'Last tetanus dose cannot be a future date.';
      }
    }

    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      const errorList = Object.values(newFieldErrors);
      setError(`Required: ${errorList.join(' • ')}`);

      const fieldOrder = shouldHideConsultationType
        ? ['nature_of_visit', 'exposure_category', 'chief_complaints', 'treatment_plan', 'tetanus_category', 'tetanus_passive', 'tetanus_vaccine', 'tetanus_last_dose']
        : ['nature_of_visit', 'consultation_types', 'exposure_category', 'chief_complaints', 'treatment_plan', 'tetanus_category', 'tetanus_passive', 'tetanus_vaccine', 'tetanus_last_dose'];
      const firstErrorKey = fieldOrder.find((key) => newFieldErrors[key]);

      if (firstErrorKey) {
        scrollToFirstError(firstErrorKey);
      }
      return;
    }

    setError('');
    setSaving(true);

    try {
      const patientId = entry.patient.patient_id || entry.patient.id;
      const payload: TreatmentRecordPayload = {
        exposure_category: formData.exposure_category,
        patient_id: patientId,
        queue_id: entry.queue_id || null,
        bite_id: entry.bite_id || entry.incident?.bite_id || entry.bite_incident?.bite_id || entry.biteIncident?.bite_id || null,
        treatment_plan: treatmentPlan || null,
        consultation_date: formData.date_of_consultation,
        consultation_time: formData.consultation_time,
        mode_of_transaction: formData.mode_of_transaction || 'walk-in',
        referred_from: existingRecord?.referred_from || null,
        referred_to:
          formData.mode_of_transaction === 'referral'
            ? formData.referred_to || 'Tagoloan Rural Health Unit (RHU) / ABTC'
            : null,
        pertinent_history: existingRecord?.pertinent_history ?? null,
        reason_for_referral: existingRecord?.reason_for_referral ?? null,
        actions_taken: existingRecord?.actions_taken ?? null,
        blood_pressure: formData.blood_pressure || null,
        temperature: formData.temperature || null,
        height: formData.height || null,
        weight: formData.weight || null,
        nature_of_visit: formData.nature_of_visit,
        consultation_types: Object.keys(formData.consultation_types).filter(
          (key) => formData.consultation_types[key as keyof typeof formData.consultation_types]
        ),
        chief_complaints: formData.chief_complaints,
        diagnosis: formData.diagnosis,
        medication_treatment: formData.medication_treatment,
        prescribed_vaccine_type: formData.prescribed_vaccine_type || null,
        prophylaxis_orders: {
          ...formData.prophylaxis_orders,
          tetanus_category: tetanusCat,
        },
        laboratory_findings: formData.laboratory_findings,
        performed_lab_test: formData.performed_lab_test,
        provider_name: formData.name_of_provider || currentUserName || null,
        attending_provider: formData.name_of_attending_provider,
        referred_by: formData.referred_by,
      };

      const res = await submitTreatmentRecord(payload);
      window.dispatchEvent(new Event('exposure-category-saved'));

      setHasExistingRecord(true);
      setIsEditing(false);
      if (res?.treatment_record) {
        setExistingRecord({ ...res.treatment_record, exposure_category: formData.exposure_category });
      }

      draft.clearDraft();
      onSave();
      if (!inline) {
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save treatment record');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (existingRecord) {
      populateFormFromRecord(existingRecord);
    }
    setIsEditing(false);
  };

  return {
    formData,
    setFormData,
    saving,
    error,
    vaccineNames,
    vaccineStockMap,
    prophylaxisStock,
    tetanusBrands,
    atsBrands,
    hasExistingRecord,
    isEditing,
    setIsEditing,
    existingRecord,
    hasAdministeredVaccine,
    isReturningNewBite,
    requiresReExposureDecision,
    addendumNote,
    setAddendumNote,
    savingAddendum,
    addendumSuccess,
    treatmentPlan,
    setTreatmentPlan: handleTreatmentPlanChange,
    episodeHistory,
    patientReportedIntake,
    checkedDiagnoses,
    checkedHistory,
    fieldErrors,
    touchedFields,
    isFormDisabled,
    isNatureOfVisitAutomatic,
    shouldHideConsultationType,
    /**
     * True when the vitals in Section III were pre-filled by Registration Staff
     * (TreatmentRecord status='scheduled', no chief_complaints) and the Doctor has
     * not yet submitted Form 2.  Once the Doctor saves Form 2, a new completed
     * TreatmentRecord is created and this condition no longer applies.
     *
     * When true, VitalsConsultationSection renders all Section III fields as
     * read-only display values — the Doctor can VIEW but not EDIT them.
     *
     * NOTE: hasExistingRecord is FALSE for pre-fills (form is in new-entry mode),
     * so we check existingRecord directly rather than combining with hasExistingRecord.
     */
    isVitalsReadOnly: !hasExistingRecord &&
      existingRecord?.status === 'scheduled' &&
      !existingRecord?.chief_complaints,
    handleFieldChange,
    handleCheckboxChange,
    handleFieldBlur,
    toggleDiagnosis,
    handleClearDiagnoses,
    toggleHistory,
    handlePrescribedVaccineChange,
    handleProphylaxisChange,
    handleSaveAddendum,
    handleSubmit,
    handleCancelEdit,
    // Draft auto-save status — consumed by the form UI to show the badge
    draftStatus: draft.status,
    draftSavedAt: draft.savedAt,
  };
}
