import { useState, useEffect, useCallback } from 'react';
import type {
  TreatmentFormData,
  NewBiteData,
  VaccineStockMap,
  GeneralTreatmentFormProps,
  ConsultationTypesMap,
  TreatmentRecordPayload,
} from '../types/consultation.types';
import {
  INITIAL_FORM_DATA,
  INITIAL_NEW_BITE_DATA,
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
} from '../utils/consultationHelpers';
import {
  fetchVaccineNames,
  fetchInventoryStock,
  fetchPatientTreatmentRecord,
  submitTreatmentRecord,
  submitAddendumNote,
} from '../services/consultationService';

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

  const [formData, setFormData] = useState<TreatmentFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vaccineNames, setVaccineNames] = useState<string[]>([]);
  const [vaccineStockMap, setVaccineStockMap] = useState<VaccineStockMap>({});
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
  const [newBiteData, setNewBiteData] = useState<NewBiteData>(INITIAL_NEW_BITE_DATA);

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
      name_of_provider: resolveHealthCareProvider(record) || prev.name_of_provider,
      name_of_attending_provider: resolveAttendingProvider(entry, record) || prev.name_of_attending_provider,
      laboratory_findings: record.laboratory_findings || '',
      performed_lab_test: record.performed_lab_test || '',
    }));

    const matchedDiag = ANIMAL_BITE_DIAGNOSES.filter((d) => diagText.includes(d));
    setCheckedDiagnoses(matchedDiag);

    const histText = asText(record.pertinent_history);
    setCheckedHistory(PERTINENT_HISTORY_OPTIONS.filter((h) => histText.includes(h)));
  }, [entry]);

  // Load existing treatment record when opening form
  useEffect(() => {
    if (!(open && entry?.patient)) return;

    const initialAttending = resolveAttendingProvider(entry);
    const initialProvider = resolveHealthCareProvider();

    setFormData(() => ({
      ...INITIAL_FORM_DATA,
      last_name: entry.patient.last_name || '',
      first_name: entry.patient.first_name || '',
      middle_name: entry.patient.middle_name || '',
      suffix: entry.patient.suffix || '',
      age: String(entry.patient.age || ''),
      address: entry.patient.address || 'Misamis Oriental',
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

    const initialIncident = selectedIncident;
    if (initialIncident) {
      setNewBiteData({
        new_bite_date: initialIncident.bite_date
          ? String(initialIncident.bite_date).split('T')[0]
          : new Date().toISOString().split('T')[0],
        new_bite_place: initialIncident.bite_place || 'Misamis Oriental',
        new_exposure_type: (initialIncident.exposure_type as any) || 'bite',
        new_severity: (initialIncident.severity as any) || 'moderate',
        new_animal_type: (initialIncident.animal_type as any) || 'dog',
        new_animal_status: (initialIncident.animal_status as any) || 'unknown',
        new_site_washed: initialIncident.site_washed !== undefined ? Boolean(initialIncident.site_washed) : true,
        new_body_part: initialIncident.body_part_exposed || initialIncident.site_number || '',
        new_wound_description: initialIncident.wound_description || '',
      });
    }

    const patientId = entry.patient.patient_id || entry.patient.id;
    if (!patientId) {
      setHasExistingRecord(false);
      setIsEditing(true);
      return;
    }

    const biteId =
      entry?.bite_id ||
      entry?.incident?.bite_id ||
      entry?.bite_incident?.bite_id ||
      entry?.biteIncident?.bite_id;

    fetchPatientTreatmentRecord(patientId, biteId)
      .then((data) => {
        const record = data?.latest_treatment;
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
          setNewBiteData({
            new_bite_date: activeInc.bite_date
              ? String(activeInc.bite_date).split('T')[0]
              : new Date().toISOString().split('T')[0],
            new_bite_place: activeInc.bite_place || 'Misamis Oriental',
            new_exposure_type: (activeInc.exposure_type as any) || 'bite',
            new_severity: (activeInc.severity as any) || 'moderate',
            new_animal_type: (activeInc.animal_type as any) || 'dog',
            new_animal_status: (activeInc.animal_status as any) || 'unknown',
            new_site_washed: activeInc.site_washed !== undefined ? Boolean(activeInc.site_washed) : true,
            new_body_part: activeInc.body_part_exposed || activeInc.site_number || '',
            new_wound_description: activeInc.wound_description || '',
          });
        }

        const isNewSession =
          entry?.visit_type === 'new_case' || entry?.visit_type === 'consultation' || isReturning;
        if (record && (record.treatment_id || record.chief_complaints || record.consultation_date)) {
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
          setExistingRecord(null);
          const resolvedAttending = resolveAttendingProvider(entry, null, data?.patient);
          if (resolvedAttending) {
            setFormData((prev) => ({ ...prev, name_of_attending_provider: resolvedAttending }));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load existing record:', err);
        setHasExistingRecord(false);
        setIsEditing(true);
        setExistingRecord(null);
      });
  }, [open, entry, populateFormFromRecord, selectedIncident]);

  const handleFieldBlur = (key: string) => () => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
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
    setFormData((prev) => ({ ...prev, [key]: ev.target.value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleCheckboxChange = (key: keyof ConsultationTypesMap) => (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => {
      const updatedTypes = { ...prev.consultation_types, [key]: ev.target.checked };
      if (Object.values(updatedTypes).some((v) => v) && fieldErrors.consultation_types) {
        setFieldErrors((errs) => {
          const next = { ...errs };
          delete next.consultation_types;
          return next;
        });
      }
      return { ...prev, consultation_types: updatedTypes };
    });
  };

  const toggleDiagnosis = (item: string) => {
    const { nextChecked, nextText } = syncChecklistWithText(
      item,
      checkedDiagnoses,
      formData.diagnosis
    );
    setCheckedDiagnoses(nextChecked);
    setFormData((prev) => ({ ...prev, diagnosis: nextText }));
  };

  const handleClearDiagnoses = () => {
    setCheckedDiagnoses([]);
    setFormData((p) => ({ ...p, diagnosis: '' }));
  };

  const toggleHistory = (item: string) => {
    const { nextChecked, nextText } = syncChecklistWithText(
      item,
      checkedHistory,
      formData.pertinent_history
    );
    setCheckedHistory(nextChecked);
    setFormData((prev) => ({ ...prev, pertinent_history: nextText }));
  };

  const handlePrescribedVaccineChange = (vaccineType: string) => {
    setFormData((prev) => ({
      ...prev,
      prescribed_vaccine_type: vaccineType,
      medication_treatment: vaccineType,
    }));
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
    if (requiresReExposureDecision && !treatmentPlan) {
      setError('Doctor treatment decision is required for this new exposure.');
      return;
    }

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

    if (!formData.chief_complaints.trim()) {
      newFieldErrors.chief_complaints = 'Please enter Chief Complaints';
    }

    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      const errorList = Object.values(newFieldErrors);
      setError(`Required: ${errorList.join(' • ')}`);

      const fieldOrder = shouldHideConsultationType
        ? ['nature_of_visit', 'chief_complaints']
        : ['nature_of_visit', 'consultation_types', 'chief_complaints'];
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
        patient_id: patientId,
        queue_id: entry.queue_id || null,
        bite_id: entry.bite_id || entry.incident?.bite_id || entry.bite_incident?.bite_id || entry.biteIncident?.bite_id || null,
        treatment_plan: treatmentPlan || null,
        new_bite_date: newBiteData.new_bite_date || null,
        new_bite_place: newBiteData.new_bite_place || null,
        new_exposure_type: newBiteData.new_exposure_type || null,
        new_severity: newBiteData.new_severity || null,
        new_animal_type: newBiteData.new_animal_type || null,
        new_animal_status: newBiteData.new_animal_status || null,
        new_site_washed: newBiteData.new_site_washed,
        new_body_part: newBiteData.new_body_part || null,
        new_wound_description: newBiteData.new_wound_description || null,
        consultation_date: formData.date_of_consultation,
        consultation_time: formData.consultation_time,
        mode_of_transaction: formData.mode_of_transaction || 'walk-in',
        referred_from: formData.referred_from || null,
        referred_to:
          formData.mode_of_transaction === 'referral'
            ? formData.referred_to || 'Tagoloan Rural Health Unit (RHU) / ABTC'
            : null,
        pertinent_history:
          formData.mode_of_transaction === 'referral' ? formData.pertinent_history : null,
        reason_for_referral:
          formData.mode_of_transaction === 'referral'
            ? formData.reason_for_referral || 'For further evaluation and management.'
            : null,
        actions_taken: formData.mode_of_transaction === 'referral' ? formData.actions_taken : null,
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
        laboratory_findings: formData.laboratory_findings,
        performed_lab_test: formData.performed_lab_test,
        provider_name: formData.name_of_provider || currentUserName || null,
        attending_provider: formData.name_of_attending_provider,
        referred_by: formData.referred_by,
      };

      const res = await submitTreatmentRecord(payload);

      setHasExistingRecord(true);
      setIsEditing(false);
      if (res?.treatment_record) {
        setExistingRecord(res.treatment_record);
      }

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
    setTreatmentPlan,
    episodeHistory,
    newBiteData,
    setNewBiteData,
    checkedDiagnoses,
    checkedHistory,
    fieldErrors,
    touchedFields,
    isFormDisabled,
    isNatureOfVisitAutomatic,
    shouldHideConsultationType,
    handleFieldChange,
    handleCheckboxChange,
    handleFieldBlur,
    toggleDiagnosis,
    handleClearDiagnoses,
    toggleHistory,
    handlePrescribedVaccineChange,
    handleSaveAddendum,
    handleSubmit,
    handleCancelEdit,
  };
}
