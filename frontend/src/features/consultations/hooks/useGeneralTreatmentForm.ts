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
  const [previousConsultations, setPreviousConsultations] = useState<any[]>([]);
  const [isPendingTreatmentReassessment, setIsPendingTreatmentReassessment] = useState(false);
  const [pendingTreatmentSummary, setPendingTreatmentSummary] = useState<any>(null);

  // Referral Modal & Slip state
  const [transferSlipOpen, setTransferSlipOpen] = useState(false);

  const [checkedDiagnoses, setCheckedDiagnoses] = useState<string[]>([]);
  const [checkedHistory, setCheckedHistory] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Effective read-only status:
  // If global readOnly is true, OR if patient has already received vaccines (strictly locked),
  // OR if an existing record exists and we are not in edit mode.
  const isFormDisabled = readOnly || hasAdministeredVaccine || (hasExistingRecord && !isEditing);
  const isNatureOfVisitAutomatic = requiresReExposureDecision;

  const isReferralCompleted = Boolean(
    existingRecord?.outcome === 'Transferred/Referred' ||
    existingRecord?.status === 'transferred_out' ||
    selectedIncident?.status === 'transferred_out' ||
    (entry?.status === 'completed' && Boolean(formData.transferred_to_facility && formData.is_referral))
  );

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
      medication_treatment: (record.exposure_category ?? prev.exposure_category) === 'I' ? 'No PEP vaccine prescribed' : (record.prescribed_vaccine_type || medText),
      prescribed_vaccine_type: (record.exposure_category ?? prev.exposure_category) === 'I' ? '' : (record.prescribed_vaccine_type || ''),
      prophylaxis_orders: normalizeProphylaxisOrders(record.prophylaxis_orders),
      name_of_provider: resolveHealthCareProvider(record) || prev.name_of_provider,
      name_of_attending_provider: resolveAttendingProvider(entryRef.current, record) || prev.name_of_attending_provider,
      laboratory_findings: record.laboratory_findings || '',
      performed_lab_test: record.performed_lab_test || '',
      is_referral: Boolean(record.is_referral || record.transferred_to_facility || record.referred_to),
      transferred_to_facility: record.transferred_to_facility || record.referred_to || '',
      transfer_reason: record.transfer_reason || record.reason_for_referral || '',
      transfer_date: record.transfer_date || record.transferred_at || (record.consultation_date || prev.transfer_date),
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
      transfer_date: manilaDate,
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
    setPreviousConsultations([]);
    setIsPendingTreatmentReassessment(false);
    setPendingTreatmentSummary(null);

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
        const prevConsults = Array.isArray(data?.previous_consultations) ? data.previous_consultations : [];
        const isReassessment = Boolean(data?.is_pending_treatment_reassessment);
        setPreviousConsultations(prevConsults);
        setIsPendingTreatmentReassessment(isReassessment);
        setPendingTreatmentSummary(data?.pending_treatment_summary || null);

        setFormData(prev => ({
          ...prev,
          exposure_category: category,
          ...(category === 'I' ? { prescribed_vaccine_type: '', medication_treatment: 'No PEP vaccine prescribed' } : {}),
        }));
        const isVaccinated = Boolean(data?.has_administered_vaccine);
        const isReturning = Boolean(data?.is_returning_new_bite);
        const needsReExposureDecision = Boolean(data?.requires_re_exposure_decision);
        setHasAdministeredVaccine(isVaccinated);
        setIsReturningNewBite(isReturning);
        setRequiresReExposureDecision(needsReExposureDecision);
        if (needsReExposureDecision) {
          setFormData((prev) => ({ ...prev, nature_of_visit: 'new_consultation' }));
        } else if (isReassessment) {
          setFormData((prev) => ({ ...prev, nature_of_visit: 'follow_up' }));
        }
        setEpisodeHistory(data?.episode_history || []);

        const activeInc = data?.active_bite_incident || initialIncident;
        if (activeInc) {
          const intake = activeInc.intake || null;
          setPatientReportedIntake(intake);
          if (activeInc.transferred_to_facility || activeInc.status === 'transferred_out') {
            setFormData((prev) => ({
              ...prev,
              is_referral: true,
              transferred_to_facility: prev.transferred_to_facility || activeInc.transferred_to_facility || '',
              transfer_reason: prev.transfer_reason || activeInc.transfer_reason || '',
              transfer_date: prev.transfer_date || (activeInc.transferred_at ? String(activeInc.transferred_at).split('T')[0] : getManilaCurrentDateTime().date),
            }));
          }
        }

        const isNewSession =
          entryRef.current?.visit_type === 'new_case' || entryRef.current?.visit_type === 'consultation' || isReturning;

        // A TreatmentRecord created by Registration Staff has status='scheduled'
        // and no chief_complaints. It is NOT a completed Doctor Form 2 entry —
        // the Doctor must still fill in all clinical fields.
        const isRegistrationStaffPrefill =
          record &&
          record.status === 'scheduled' &&
          !record.chief_complaints;

        if (record && !isRegistrationStaffPrefill && !isReassessment && (record.treatment_id || record.chief_complaints || record.consultation_date)) {
          setHasExistingRecord(true);
          setIsEditing(false);
          setExistingRecord(record);
          populateFormFromRecord(record, isNewSession);
          if (isNewSession) {
            setFormData((prev) => ({ ...prev, nature_of_visit: 'new_consultation' }));
          }
        } else {
          setHasExistingRecord(false);
          setIsEditing(true);
          setExistingRecord(isRegistrationStaffPrefill ? record : null);
          if ((isRegistrationStaffPrefill || isReassessment) && record) {
            setFormData((prev) => ({
              ...prev,
              mode_of_transaction:  record.mode_of_transaction || prev.mode_of_transaction || 'walk-in',
              date_of_consultation: record.consultation_date || prev.date_of_consultation,
              consultation_time:    record.consultation_time || prev.consultation_time,
              blood_pressure:       record.blood_pressure || prev.blood_pressure,
              temperature:          record.temperature || prev.temperature,
              height:               record.height || prev.height,
              weight:               record.weight || prev.weight,
              nature_of_visit:      isReassessment ? (record.nature_of_visit || 'follow_up') : prev.nature_of_visit,
              name_of_attending_provider: record.attending_provider || prev.name_of_attending_provider,
              referred_by:          record.referred_by || prev.referred_by,
              is_referral:          Boolean(record.transferred_to_facility || record.is_referral || prev.is_referral),
              transferred_to_facility: record.transferred_to_facility || prev.transferred_to_facility || '',
              transfer_reason:      record.transfer_reason || prev.transfer_reason || '',
              transfer_date:        record.transfer_date || prev.transfer_date || getManilaCurrentDateTime().date,
            }));
          }
          const resolvedAttending = resolveAttendingProvider(entryRef.current, null, data?.patient);
          if (resolvedAttending) {
            setFormData((prev) => ({ ...prev, name_of_attending_provider: resolvedAttending }));
          }

          // Restore draft for a new (unsaved) record after server population
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
              ...((savedDraft.formData.exposure_category ?? category) === 'I' ? {
                prescribed_vaccine_type: '',
                medication_treatment: 'No PEP vaccine prescribed',
              } : {}),
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

  const saveDraftSnapshot = useCallback(
    (
      nextData: TreatmentFormData,
      nextDiagnoses: string[] = checkedDiagnoses,
      nextHistory: string[] = checkedHistory
    ) => {
      draft.saveDraft({
        formData: nextData,
        checkedDiagnoses: nextDiagnoses,
        checkedHistory: nextHistory,
      });
    },
    [checkedDiagnoses, checkedHistory, draft]
  );

  const handleFieldBlur = (key: string) => () => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    const newErrors = { ...fieldErrors };
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
      let next: TreatmentFormData = { ...prev, [key]: val };
      if (key === 'exposure_category') {
        if (val === 'I') {
          next = { ...next, prescribed_vaccine_type: '', medication_treatment: 'No PEP vaccine prescribed' };
        } else if (prev.exposure_category === 'I') {
          next = { ...next, prescribed_vaccine_type: '', medication_treatment: '' };
        }
      }
      saveDraftSnapshot(next);
      return next;
    });
    if (fieldErrors[key as string] && (typeof val !== 'string' || val.trim())) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        if (key === 'exposure_category' && val === 'I') {
          delete next.prescribed_vaccine_type;
        }
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
    if (formData.exposure_category === 'I') return;
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

  const handleReassessmentDecisionChange = (
    decision: 'continue' | 'modify' | 'discontinue' | 'no_injection_required' | ''
  ) => {
    const lastPrev = previousConsultations.length > 0 ? previousConsultations[previousConsultations.length - 1] : null;
    setFormData((prev) => {
      let next: TreatmentFormData = { ...prev, reassessment_decision: decision };

      if ((decision === 'continue' || decision === 'modify') && lastPrev) {
        const prevCat = (lastPrev.exposure_category || prev.exposure_category) as 'I' | 'II' | 'III' | '';
        const prevOrders = normalizeProphylaxisOrders(lastPrev.prophylaxis_orders);
        next = {
          ...next,
          exposure_category: prevCat,
          chief_complaints: prev.chief_complaints || lastPrev.chief_complaints || 'Returned for continuation of pending treatment',
          diagnosis: prev.diagnosis || lastPrev.diagnosis || '',
          prescribed_vaccine_type: prevCat === 'I' ? '' : (lastPrev.prescribed_vaccine_type || ''),
          medication_treatment: prevCat === 'I'
            ? 'No PEP vaccine prescribed'
            : (lastPrev.prescribed_vaccine_type || lastPrev.medication_treatment || ''),
          prophylaxis_orders: prevOrders,
        };
      } else if (decision === 'discontinue' || decision === 'no_injection_required') {
        next = {
          ...next,
          chief_complaints: prev.chief_complaints || 'Returned for reassessment — no injection required',
          prescribed_vaccine_type: '',
          medication_treatment: decision === 'discontinue'
            ? 'Previous prescription discontinued upon reassessment'
            : 'No injection required upon reassessment',
          prophylaxis_orders: {
            ...prev.prophylaxis_orders,
            tetanus_category: 'up_to_date',
            tetanus_vaccine: 'none',
            tetanus_passive: 'none',
            rig: 'none',
          },
        };
      }

      saveDraftSnapshot(next);
      return next;
    });

    if (fieldErrors.reassessment_decision && decision) {
      setFieldErrors((errs) => {
        const next = { ...errs };
        delete next.reassessment_decision;
        if (decision === 'continue') {
          delete next.reassessment_notes;
        }
        if (decision === 'discontinue' || decision === 'no_injection_required') {
          delete next.tetanus_category;
          delete next.tetanus_passive;
          delete next.tetanus_vaccine;
        }
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

  // ─── Referral Handlers ─────────────────────────────────────────────────────
  const handleToggleReferral = (enabled: boolean) => {
    setFormData((prev) => {
      const next: TreatmentFormData = {
        ...prev,
        is_referral: enabled,
        transfer_date: prev.transfer_date || getManilaCurrentDateTime().date,
      };
      saveDraftSnapshot(next);
      return next;
    });
  };

  const handleSelectFacility = (facility: string) => {
    setFormData((prev) => {
      const next: TreatmentFormData = {
        ...prev,
        transferred_to_facility: facility,
      };
      saveDraftSnapshot(next);
      return next;
    });
    if (fieldErrors.transferred_to_facility) {
      setFieldErrors((errs) => {
        const next = { ...errs };
        delete next.transferred_to_facility;
        return next;
      });
    }
  };

  const handleSelectReason = (reason: string) => {
    setFormData((prev) => {
      const current = prev.transfer_reason?.trim() || '';
      const nextReason = current
        ? (current.includes(reason) ? current : `${current}\n• ${reason}`)
        : `• ${reason}`;
      const next: TreatmentFormData = {
        ...prev,
        transfer_reason: nextReason,
      };
      saveDraftSnapshot(next);
      return next;
    });
  };

  const handleOpenPrintSlip = () => {
    setTransferSlipOpen(true);
  };

  const handleSaveReferral = async (printAfter: boolean = true) => {
    if (!formData.transferred_to_facility || !formData.transferred_to_facility.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        transferred_to_facility: 'Please specify the receiving hospital or health facility.',
      }));
      setError('Please specify the receiving hospital or health facility before saving referral slip.');
      scrollToFirstError('field-transferred_to_facility');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const patientId = entry.patient.patient_id || entry.patient.id;
      const effectiveCategory = formData.exposure_category || selectedIncident?.exposure_category || 'II';
      const facilityName = formData.transferred_to_facility.trim();
      const transferReason = formData.transfer_reason?.trim() || 'For further evaluation and management.';
      const effectiveDate = formData.transfer_date || getManilaCurrentDateTime().date;
      const chiefNotes = formData.chief_complaints?.trim() || formData.diagnosis?.trim() || `Referral details saved for ${facilityName}`;

      const activeConsultationTypes = Object.keys(formData.consultation_types).filter(
        (key) => formData.consultation_types[key as keyof typeof formData.consultation_types]
      );
      if (activeConsultationTypes.length === 0) {
        activeConsultationTypes.push('injury');
      }

      const payload: TreatmentRecordPayload = {
        patient_id: patientId,
        queue_id: entry.queue_id || null,
        bite_id: entry.bite_id || entry.incident?.bite_id || entry.bite_incident?.bite_id || entry.biteIncident?.bite_id || null,
        nature_of_visit: formData.nature_of_visit || 'new_consultation',
        consultation_types: activeConsultationTypes,
        chief_complaints: chiefNotes,
        diagnosis: formData.diagnosis,
        exposure_category: effectiveCategory,
        treatment_plan: treatmentPlan || 'no_vaccine',
        prescribed_vaccine_type: formData.prescribed_vaccine_type || null,
        medication_treatment: formData.medication_treatment || '',
        transferred_to_facility: facilityName,
        transfer_reason: transferReason,
        transfer_date: effectiveDate,
        is_referral: true,
        complete_referral: false,
        consultation_date: formData.date_of_consultation || getManilaCurrentDateTime().date,
        consultation_time: formData.consultation_time || getManilaCurrentDateTime().time,
        mode_of_transaction: formData.mode_of_transaction || 'referral',
        referred_to: facilityName,
        reason_for_referral: transferReason,
        laboratory_findings: formData.laboratory_findings || '',
        performed_lab_test: formData.performed_lab_test || '',
        laboratory_findings: formData.laboratory_findings || null,
        performed_lab_test: formData.performed_lab_test || null,
        provider_name: formData.name_of_provider || currentUserName || null,
        attending_provider: formData.name_of_attending_provider,
        referred_by: formData.referred_by,
        prophylaxis_orders: formData.prophylaxis_orders,
      };

      const res = await submitTreatmentRecord(payload);
      if (res?.treatment_record) {
        setExistingRecord(res.treatment_record);
      }
      if (printAfter) {
        setTransferSlipOpen(true);
      }
      return res;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save referral details');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteReferral = async () => {
    if (!formData.transferred_to_facility || !formData.transferred_to_facility.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        transferred_to_facility: 'Please specify the receiving hospital or health facility.',
      }));
      setError('Please specify the receiving hospital or health facility to complete referral.');
      scrollToFirstError('field-transferred_to_facility');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const patientId = entry.patient.patient_id || entry.patient.id;
      const effectiveCategory = formData.exposure_category || selectedIncident?.exposure_category || 'II';
      const facilityName = formData.transferred_to_facility.trim();
      const transferReason = formData.transfer_reason?.trim() || 'For further evaluation and management.';
      const effectiveDate = formData.transfer_date || getManilaCurrentDateTime().date;
      const chiefNotes = formData.chief_complaints?.trim() || formData.diagnosis?.trim() || `Referred to ${facilityName}`;

      const activeConsultationTypes = Object.keys(formData.consultation_types).filter(
        (key) => formData.consultation_types[key as keyof typeof formData.consultation_types]
      );
      if (activeConsultationTypes.length === 0) {
        activeConsultationTypes.push('injury');
      }

      const payload: TreatmentRecordPayload = {
        patient_id: patientId,
        queue_id: entry.queue_id || null,
        bite_id: entry.bite_id || entry.incident?.bite_id || entry.bite_incident?.bite_id || entry.biteIncident?.bite_id || null,
        nature_of_visit: formData.nature_of_visit || 'new_consultation',
        consultation_types: activeConsultationTypes,
        chief_complaints: chiefNotes,
        diagnosis: formData.diagnosis || 'Animal bite exposure - referred out',
        exposure_category: effectiveCategory,
        treatment_plan: 'no_vaccine',
        prescribed_vaccine_type: null,
        medication_treatment: `Transferred/Referred to ${facilityName}`,
        transferred_to_facility: facilityName,
        transfer_reason: transferReason,
        transfer_date: effectiveDate,
        is_referral: true,
        complete_referral: true,
        consultation_date: formData.date_of_consultation || getManilaCurrentDateTime().date,
        consultation_time: formData.consultation_time || getManilaCurrentDateTime().time,
        mode_of_transaction: 'referral',
        referred_from: null,
        referred_to: facilityName,
        reason_for_referral: transferReason,
        actions_taken: `Transferred/Referred to ${facilityName} (${transferReason})`,
        laboratory_findings: formData.laboratory_findings || '',
        performed_lab_test: formData.performed_lab_test || '',
        laboratory_findings: formData.laboratory_findings || null,
        performed_lab_test: formData.performed_lab_test || null,
        provider_name: formData.name_of_provider || currentUserName || null,
        attending_provider: formData.name_of_attending_provider,
        referred_by: formData.referred_by,
        prophylaxis_orders: {
          ...formData.prophylaxis_orders,
          tetanus_category: 'not_indicated',
          tetanus_vaccine: 'none',
          tetanus_passive: 'none',
          rig: 'none',
        },
      };

      const res = await submitTreatmentRecord(payload);
      window.dispatchEvent(new Event('exposure-category-saved'));

      setHasExistingRecord(true);
      setIsEditing(false);
      if (res?.treatment_record) {
        setExistingRecord({ ...res.treatment_record, outcome: 'Transferred/Referred', exposure_category: effectiveCategory });
      }

      draft.clearDraft();
      onSave({ ...(res || {}), is_referral_completed: true });
      if (!inline) {
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete referral');
    } finally {
      setSaving(false);
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
    } else if (formData.exposure_category === 'I' && formData.prescribed_vaccine_type) {
      newFieldErrors.prescribed_vaccine_type = 'Category I exposures do not require Rabies PEP vaccination.';
    }

    if (!formData.chief_complaints.trim()) {
      newFieldErrors.chief_complaints = 'Please enter Chief Complaints';
    }

    if (requiresReExposureDecision && !treatmentPlan) {
      newFieldErrors.treatment_plan = 'Please select a Doctor treatment decision.';
    }

    const isNoInjectionReassessment =
      isPendingTreatmentReassessment &&
      (formData.reassessment_decision === 'discontinue' || formData.reassessment_decision === 'no_injection_required');

    if (isPendingTreatmentReassessment) {
      if (!formData.reassessment_decision) {
        newFieldErrors.reassessment_decision = 'Please select a Doctor Reassessment decision for the returning patient.';
      } else if (
        ['modify', 'discontinue', 'no_injection_required'].includes(formData.reassessment_decision) &&
        !formData.reassessment_notes?.trim()
      ) {
        newFieldErrors.reassessment_notes = 'Please provide the clinical reason for modifying, discontinuing, or determining no injection is required.';
      }
    }

    // Tetanus Prophylaxis Order Validation
    const pOrders = formData.prophylaxis_orders;
    const tetanusCat = isNoInjectionReassessment
      ? 'up_to_date'
      : (pOrders?.tetanus_category || getTetanusCategoryFromOrders(pOrders));

    if (!isNoInjectionReassessment) {
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
        ? ['nature_of_visit', 'chief_complaints', 'reassessment_decision', 'reassessment_notes', 'treatment_plan', 'exposure_category', 'tetanus_category', 'tetanus_passive', 'tetanus_vaccine', 'tetanus_last_dose']
        : ['nature_of_visit', 'consultation_types', 'chief_complaints', 'reassessment_decision', 'reassessment_notes', 'treatment_plan', 'exposure_category', 'tetanus_category', 'tetanus_passive', 'tetanus_vaccine', 'tetanus_last_dose'];
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
        treatment_plan: (formData.exposure_category === 'I' || isNoInjectionReassessment) ? 'no_vaccine' : (treatmentPlan || null),
        reassessment_decision: formData.reassessment_decision || null,
        reassessment_notes: formData.reassessment_notes?.trim() || null,
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
        medication_treatment: formData.exposure_category === 'I' ? 'No PEP vaccine prescribed' : formData.medication_treatment,
        prescribed_vaccine_type: (formData.exposure_category === 'I' || isNoInjectionReassessment) ? null : (formData.prescribed_vaccine_type || null),
        prophylaxis_orders: {
          ...formData.prophylaxis_orders,
          tetanus_category: tetanusCat,
          ...(isNoInjectionReassessment ? { tetanus_vaccine: 'none', tetanus_passive: 'none', rig: 'none' } : {}),
        },
        laboratory_findings: formData.laboratory_findings,
        performed_lab_test: formData.performed_lab_test,
        provider_name: formData.name_of_provider || currentUserName || null,
        attending_provider: formData.name_of_attending_provider,
        referred_by: formData.referred_by,
        transferred_to_facility: formData.is_referral ? formData.transferred_to_facility : null,
        transfer_reason: formData.is_referral ? formData.transfer_reason : null,
        transfer_date: formData.is_referral ? formData.transfer_date : null,
        is_referral: formData.is_referral,
        complete_referral: false,
      };

      const res = await submitTreatmentRecord(payload);
      window.dispatchEvent(new Event('exposure-category-saved'));

      setHasExistingRecord(true);
      setIsEditing(false);
      if (res?.treatment_record) {
        setExistingRecord({ ...res.treatment_record, exposure_category: formData.exposure_category });
      }

      draft.clearDraft();
      onSave(res);
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
    previousConsultations,
    isPendingTreatmentReassessment,
    pendingTreatmentSummary,
    checkedDiagnoses,
    checkedHistory,
    fieldErrors,
    touchedFields,
    isCategory1: formData.exposure_category === 'I',
    isFormDisabled,
    isNatureOfVisitAutomatic,
    shouldHideConsultationType,
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
    handleReassessmentDecisionChange,
    handleSaveAddendum,
    handleSubmit,
    handleCancelEdit,
    draftStatus: draft.status,
    draftSavedAt: draft.savedAt,
    // Referral fields & actions
    transferSlipOpen,
    setTransferSlipOpen,
    isReferralCompleted,
    handleToggleReferral,
    handleSelectFacility,
    handleSelectReason,
    handleOpenPrintSlip,
    handleSaveReferral,
    handleCompleteReferral,
  };
}
