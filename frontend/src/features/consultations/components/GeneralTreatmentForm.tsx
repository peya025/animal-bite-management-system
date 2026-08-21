import { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { LockOutlined as LockIcon } from '@mui/icons-material';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import { HEALTH_FACILITY_GROUPS, ALL_HEALTH_FACILITIES } from '../../../shared/constants/healthFacilities';
import ReferralLocationSelector from './ReferralLocationSelector';

// ── Animal-bite related diagnoses (multi-select) ──────────────────────────────
const ANIMAL_BITE_DIAGNOSES = [
  'Rabies Exposure (PEP Indicated)',
  'Suspect Rabies (Human)',
  'Wound Infection — Animal Bite',
  'Laceration / Open Wound — Bite',
  'Abrasion / Scratch — Animal',
  'Puncture Wound — Animal Bite',
  'Tetanus Prone Wound',
  'Category I Exposure (WHO)',
  'Category II Exposure (WHO)',
  'Category III Exposure (WHO)',
  'Dog Bite — Domestic',
  'Dog Bite — Stray',
  'Cat Scratch / Bite',
  'Bat Exposure',
  'Other Animal Bite',
  'Wound Abscess',
  'Cellulitis — Bite Site',
  'Allergic Reaction — Vaccine',
  'Anaphylaxis',
  'Post-Exposure Prophylaxis (PEP)',
];

const PERTINENT_HISTORY_OPTIONS = [
  'Asthma',
  'Hypertension (High blood pressure)',
  'Diabetes Mellitus',
  'Heart disease',
  'Tuberculosis (TB)',
  'Pneumonia',
  'Chronic kidney disease',
  'Liver disease',
  'Seizure/Epilepsy',
  'Allergies',
  'Previous surgery',
  'Previous hospitalization',
  'Cancer',
  'Anemia',
  'Arthritis',
  'Stroke',
  'Migraine',
  'Gastritis/Ulcer',
  'Fever',
  'Cough',
  'Difficulty breathing',
  'Chest pain',
  'Abdominal pain',
  'Headache',
  'Dizziness',
  'Vomiting',
  'Diarrhea',
  'Weakness/Fatigue',
  'Elevated blood pressure',
  'High blood sugar',
];

interface GeneralTreatmentFormProps {
  open: boolean;
  entry: any; // Queue entry with patient data
  onClose: () => void;
  onSave: () => void;
  readOnly?: boolean;
  inline?: boolean;
}

interface TreatmentFormData {
  // Patient Info (read-only, from queue/patient)
  last_name: string;
  first_name: string;
  middle_name: string;
  suffix: string;
  age: string;
  address: string;

  // CHU/RHU Personnel Only
  mode_of_transaction: 'walk-in' | 'visited' | 'referral' | '';
  referred_from: string;
  referred_to: string;
  pertinent_history: string;
  reason_for_referral: string;
  actions_taken: string;

  // Consultation Details
  date_of_consultation: string;
  consultation_time: string;
  blood_pressure: string;
  temperature: string;
  height: string;
  weight: string;

  // Nature of Visit
  nature_of_visit: 'new_consultation' | 'new_admission' | 'follow_up' | '';

  // Type of Consultation
  consultation_types: {
    general: boolean;
    prenatal: boolean;
    dental_care: boolean;
    child_care: boolean;
    child_nutrition: boolean;
    injury: boolean;
    adult_immunization: boolean;
    family_planning: boolean;
    postpartum: boolean;
    tuberculosis: boolean;
    child_immunization: boolean;
    sick_children: boolean;
    firecracker_injury: boolean;
  };

  // Clinical Notes
  chief_complaints: string;
  diagnosis: string;           // saved as free text (checklist selections auto-fill this)
  medication_treatment: string; // saved as free text (inventory checklist auto-fills this)

  name_of_provider: string;
  laboratory_findings: string;
  performed_lab_test: string;

  // Provider Details
  name_of_attending_provider: string;
  referred_by: string;
}

const INITIAL_FORM_DATA: TreatmentFormData = {
  last_name: '',
  first_name: '',
  middle_name: '',
  suffix: '',
  age: '',
  address: 'Misamis Oriental',
  mode_of_transaction: '',
  referred_from: '',
  referred_to: '',
  pertinent_history: '',
  reason_for_referral: 'For further evaluation and management.',
  actions_taken: '',
  date_of_consultation: new Date().toISOString().split('T')[0],
  consultation_time: new Date().toTimeString().slice(0, 5),
  blood_pressure: '',
  temperature: '',
  height: '',
  weight: '',
  nature_of_visit: '',
  consultation_types: {
    general: false,
    prenatal: false,
    dental_care: false,
    child_care: false,
    child_nutrition: false,
    injury: false,
    adult_immunization: false,
    family_planning: false,
    postpartum: false,
    tuberculosis: false,
    child_immunization: false,
    sick_children: false,
    firecracker_injury: false,
  },
  chief_complaints: '',
  diagnosis: '',
  medication_treatment: '',
  name_of_provider: '',
  laboratory_findings: '',
  performed_lab_test: '',
  name_of_attending_provider: '',
  referred_by: '',
};

function getCurrentUserName(): string {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.name === 'string' ? parsed.name.trim() : '';
  } catch {
    return '';
  }
}

export default function GeneralTreatmentForm({
  open,
  entry,
  onClose,
  onSave,
  readOnly = false,
  inline = false,
}: GeneralTreatmentFormProps) {
  const [formData, setFormData] = useState<TreatmentFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vaccineNames, setVaccineNames] = useState<string[]>([]);
  const [currentUserName] = useState<string>(() => getCurrentUserName());

  // Track if a record has already been saved for this patient
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  // Track whether the form is currently in edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [existingRecord, setExistingRecord] = useState<any>(null);

  // Track which checklist items are checked (separate from the editable text box)
  const [checkedDiagnoses, setCheckedDiagnoses] = useState<string[]>([]);
  const [checkedMeds, setCheckedMeds] = useState<string[]>([]);
  const [checkedHistory, setCheckedHistory] = useState<string[]>([]);

  // Fetch available vaccine names from inventory
  useEffect(() => {
    api.get('/inventory/vaccine-names')
      .then(res => setVaccineNames(res.data.vaccine_names || []))
      .catch(() => {
        setVaccineNames([
          'Anti-Rabies Vaccine (ARV)',
          'Tetanus Toxoid (TT)',
          'Tetanus and Diphtheria (Td)',
          'Rabies Immunoglobulin (RIG)',
          'Human Rabies Immunoglobulin (HRIG)',
          'Equine Rabies Immunoglobulin (ERIG)',
          'Amoxicillin',
          'Co-Amoxiclav (Augmentin)',
          'Metronidazole',
          'Wound Irrigation Solution',
        ]);
      });
  }, []);

  const asText = (val: unknown): string => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join('\n');
    if (typeof val === 'string') {
      try {
        const parsed: unknown = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.join('\n') : val;
      } catch {
        return val;
      }
    }
    return String(val);
  };

  const populateFormFromRecord = (record: any) => {
    const diagText = asText(record.diagnosis);
    const medText = asText(record.medication_treatment);

    // Parse consultation types
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
      medication_treatment: medText,
      name_of_provider: record.provider_name || currentUserName || prev.name_of_provider,
      name_of_attending_provider: record.attending_provider || '',
      laboratory_findings: record.laboratory_findings || '',
      performed_lab_test: record.performed_lab_test || '',
    }));

    // Sync checklist checkmarks
    const matchedDiag = ANIMAL_BITE_DIAGNOSES.filter(d => diagText.includes(d));
    setCheckedDiagnoses(matchedDiag);

    const histText = asText(record.pertinent_history);
    setCheckedHistory(PERTINENT_HISTORY_OPTIONS.filter(h => histText.includes(h)));

    if (vaccineNames.length > 0) {
      const matchedMeds = vaccineNames.filter(v => medText.includes(v));
      setCheckedMeds(matchedMeds);
    }
  };

  useEffect(() => {
    if (!(open && entry?.patient)) return;

    // Reset base patient info
    setFormData((prev) => ({
      ...INITIAL_FORM_DATA,
      last_name: entry.patient.last_name || '',
      first_name: entry.patient.first_name || '',
      middle_name: entry.patient.middle_name || '',
      suffix: entry.patient.suffix || '',
      age: String(entry.patient.age || ''),
      address: entry.patient.address || 'Misamis Oriental',
      name_of_provider: currentUserName || '',
    }));
    setCheckedDiagnoses([]);
    setCheckedMeds([]);
    setCheckedHistory([]);
    setError('');

    const patientId = entry.patient.patient_id || entry.patient.id;
    if (!patientId) {
      setHasExistingRecord(false);
      setIsEditing(true);
      return;
    }

    // Load existing record
    api.get(`/treatment-records/patient/${patientId}`)
      .then((response) => {
        const record = response.data?.latest_treatment;
        if (record && (record.treatment_id || record.chief_complaints || record.consultation_date)) {
          setHasExistingRecord(true);
          setIsEditing(false); // Read-only by default if already saved
          setExistingRecord(record);
          populateFormFromRecord(record);
        } else {
          setHasExistingRecord(false);
          setIsEditing(true); // Editable immediately if not filled up yet
          setExistingRecord(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load existing record:', err);
        setHasExistingRecord(false);
        setIsEditing(true);
        setExistingRecord(null);
      });
  }, [open, entry?.patient?.patient_id, entry?.patient?.id]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleCheckboxChange = (key: keyof typeof INITIAL_FORM_DATA.consultation_types) => (
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

  // Toggle a diagnosis checklist item → also add/remove from the text box
  const toggleDiagnosis = (item: string) => {
    const isChecked = checkedDiagnoses.includes(item);
    const next = isChecked
      ? checkedDiagnoses.filter(d => d !== item)
      : [...checkedDiagnoses, item];
    setCheckedDiagnoses(next);

    setFormData(prev => {
      const existingLines = prev.diagnosis.split('\n').map(l => l.trim()).filter(Boolean);
      let updated: string[];
      if (isChecked) {
        updated = existingLines.filter(l => l !== item);
      } else {
        updated = existingLines.includes(item) ? existingLines : [...existingLines, item];
      }
      return { ...prev, diagnosis: updated.join('\n') };
    });
  };

  // Toggle a medication checklist item → also add/remove from the text box
  const toggleMed = (item: string) => {
    const isChecked = checkedMeds.includes(item);
    const next = isChecked
      ? checkedMeds.filter(m => m !== item)
      : [...checkedMeds, item];
    setCheckedMeds(next);

    setFormData(prev => {
      const existingLines = prev.medication_treatment.split('\n').map(l => l.trim()).filter(Boolean);
      let updated: string[];
      if (isChecked) {
        updated = existingLines.filter(l => l !== item);
      } else {
        updated = existingLines.includes(item) ? existingLines : [...existingLines, item];
      }
      return { ...prev, medication_treatment: updated.join('\n') };
    });
  };

  // Toggle a pertinent history checklist item → also add/remove from the text box
  const toggleHistory = (item: string) => {
    const isChecked = checkedHistory.includes(item);
    const next = isChecked
      ? checkedHistory.filter(h => h !== item)
      : [...checkedHistory, item];
    setCheckedHistory(next);

    setFormData(prev => {
      const existingLines = prev.pertinent_history.split('\n').map(l => l.trim()).filter(Boolean);
      let updated: string[];
      if (isChecked) {
        updated = existingLines.filter(l => l !== item);
      } else {
        updated = existingLines.includes(item) ? existingLines : [...existingLines, item];
      }
      return { ...prev, pertinent_history: updated.join('\n') };
    });
  };

  const handleSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};

    if (!formData.nature_of_visit) {
      newFieldErrors.nature_of_visit = 'Please select Nature of Visit';
    }

    const hasConsultationType = Object.values(formData.consultation_types).some((v) => v);
    if (!hasConsultationType) {
      newFieldErrors.consultation_types = 'Please select at least one Type of Consultation';
    }

    if (!formData.chief_complaints.trim()) {
      newFieldErrors.chief_complaints = 'Please enter Chief Complaints';
    }

    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      setError('Please fill in the required field(s) highlighted in red.');

      const fieldOrder = ['nature_of_visit', 'consultation_types', 'chief_complaints'];
      const firstErrorKey = fieldOrder.find((key) => newFieldErrors[key]);

      if (firstErrorKey) {
        setTimeout(() => {
          const el = document.getElementById(`field-${firstErrorKey}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = el.querySelector('input, textarea, select') as HTMLElement;
            if (focusable) {
              focusable.focus({ preventScroll: true });
            }
          }
        }, 50);
      }
      return;
    }

    setError('');
    setSaving(true);

    try {
      const patientId = entry.patient.patient_id || entry.patient.id;
      const res = await api.post('/treatment-records', {
        patient_id: patientId,
        queue_id: entry.queue_id || null,
        consultation_date: formData.date_of_consultation,
        consultation_time: formData.consultation_time,
        mode_of_transaction: formData.mode_of_transaction,
        referred_from: formData.referred_from || null,
        referred_to: formData.mode_of_transaction === 'referral' ? (formData.referred_to || 'Tagoloan Rural Health Unit (RHU) / ABTC') : null,
        pertinent_history: formData.mode_of_transaction === 'referral' ? formData.pertinent_history : null,
        reason_for_referral: formData.mode_of_transaction === 'referral' ? (formData.reason_for_referral || 'For further evaluation and management.') : null,
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
        laboratory_findings: formData.laboratory_findings,
        performed_lab_test: formData.performed_lab_test,
        provider_name: formData.name_of_provider || currentUserName || null,
        attending_provider: formData.name_of_attending_provider,
        referred_by: formData.referred_by,
      });

      setHasExistingRecord(true);
      setIsEditing(false);
      if (res.data?.treatment_record) {
        setExistingRecord(res.data.treatment_record);
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

  if (!entry) return null;

  // Effective read-only status:
  // If global readOnly is true, OR if an existing record exists and we are not in edit mode.
  const isFormDisabled = readOnly || (hasExistingRecord && !isEditing);

  const formContent = (
    <div style={{ padding: inline ? '0' : '24px 32px' }}>
      
      {/* Read-Only Status Banner with Edit Option */}
      {hasExistingRecord && !isEditing && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, mb: 3,
          bgcolor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LockIcon sx={{ fontSize: 16, color: '#d97706', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, color: '#92400e' }}>
              You are viewing this form in <strong>read-only mode</strong>.
            </Typography>
          </Box>
          {!readOnly && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setIsEditing(true)}
              sx={{
                borderColor: '#d97706',
                color: '#b45309',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'none',
                py: 0.25,
                px: 1.5,
                '&:hover': { bgcolor: '#fef3c7', borderColor: '#b45309' },
              }}
            >
              ✏️ Edit Form 2
            </Button>
          )}
        </Box>
      )}

      {/* Edit Mode Notification Banner */}
      {hasExistingRecord && isEditing && !readOnly && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.25, mb: 3,
          bgcolor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <span style={{ fontSize: 14 }}>✏️</span>
            <Typography sx={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
              Editing Consultation Record — make your adjustments below and save.
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => {
              if (existingRecord) populateFormFromRecord(existingRecord);
              setIsEditing(false);
            }}
            sx={{
              color: '#6b7280', fontSize: 12, fontWeight: 600, textTransform: 'none',
              '&:hover': { color: '#111827', bgcolor: 'transparent' },
            }}
          >
            Cancel Edit
          </Button>
        </Box>
      )}

      {/* SECTION 1: PATIENT INFORMATION */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          I. Patient Information (Impormasyon ng Pasyente)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Last Name (Apelyido)
            </label>
            <input
              type="text"
              value={formData.last_name}
              readOnly
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              First Name (Pangalan)
            </label>
            <input
              type="text"
              value={formData.first_name}
              readOnly
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Middle Name (Gitnang Pangalan)
            </label>
            <input
              type="text"
              value={formData.middle_name}
              readOnly
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Suffix (e.g. Jr., Sr., II, III)
            </label>
            <input
              type="text"
              value={formData.suffix}
              readOnly
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Age (Edad)
            </label>
            <input
              type="text"
              value={formData.age}
              readOnly
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Residential Address (Tirahan) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              readOnly
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: CHU/RHU PERSONNEL ONLY */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          II. For CHU / RHU Personnel Only (Para sa Kinatawan ng CHU / RHU Lamang)
        </h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Mode of Transaction
          </label>
          <div style={{ display: 'flex', gap: 24 }}>
            {(['walk-in', 'visited', 'referral'] as const).map((mode) => (
              <label key={mode} style={{ display: 'flex', alignItems: 'center', cursor: isFormDisabled ? 'default' : 'pointer' }}>
                <input
                  type="radio"
                  name="mode_of_transaction"
                  value={mode}
                  checked={formData.mode_of_transaction === mode}
                  onChange={handleFieldChange('mode_of_transaction')}
                  disabled={isFormDisabled}
                  style={{ marginRight: 8 }}
                />
                <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>
                  {mode.replace('-', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>
        {formData.mode_of_transaction === 'referral' && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: 0 }}>
              For REFERRAL Transaction only.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <ReferralLocationSelector
                label="Referred From"
                value={formData.referred_from}
                onChange={(val) => setFormData((prev) => ({ ...prev, referred_from: val }))}
                disabled={isFormDisabled}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Referred To
                </label>
                <div style={{ marginTop: 22 }}>
                  <input
                    type="text"
                    value="Tagoloan Rural Health Unit (RHU) / ABTC"
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 12,
                      backgroundColor: '#f3f4f6',
                      color: '#1f2937',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ display: 'block', fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                    📍 Primary Receiving Facility: Tagoloan RHU
                  </span>
                </div>
              </div>
            </div>

            {/* ── 1. PERTINENT HISTORY OF ILLNESS AND FINDINGS ── */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Pertinent History of Illness and Findings
                {checkedHistory.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#059669', borderRadius: 99, padding: '2px 8px', border: '1px solid #a7f3d0' }}>
                    {checkedHistory.length} checked
                  </span>
                )}
              </label>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 0' }}>
                Check items to auto-fill the findings box — or write on the side (maaaring pumili o mag-type)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* LEFT: Scrollable checklist */}
                <div style={{
                  border: '1px solid #d1d5db', borderRadius: 8,
                  maxHeight: 220, overflowY: 'auto',
                  backgroundColor: isFormDisabled ? '#f9fafb' : '#fff',
                }}>
                  {PERTINENT_HISTORY_OPTIONS.map((item, idx) => {
                    const isChecked = checkedHistory.includes(item);
                    return (
                      <label key={item} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px',
                        borderBottom: idx < PERTINENT_HISTORY_OPTIONS.length - 1 ? '1px solid #f3f4f6' : 'none',
                        cursor: isFormDisabled ? 'default' : 'pointer',
                        background: isChecked ? '#f0fdf4' : 'transparent',
                        transition: 'background 0.1s',
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => !isFormDisabled && toggleHistory(item)}
                          disabled={isFormDisabled}
                          style={{ accentColor: '#10b981', width: 14, height: 14, flexShrink: 0, cursor: isFormDisabled ? 'default' : 'pointer' }}
                        />
                        <span style={{ fontSize: 12.5, color: isChecked ? '#065f46' : '#374151', fontWeight: isChecked ? 600 : 400, lineHeight: 1.3 }}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* RIGHT: Auto-filled + manually editable text box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1v6H2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="7" stroke="#9ca3af" strokeWidth="1.5"/></svg>
                    Auto-fills when checked · Editable
                  </div>
                  <textarea
                    value={formData.pertinent_history}
                    onChange={handleFieldChange('pertinent_history')}
                    disabled={isFormDisabled}
                    rows={8}
                    placeholder={isFormDisabled ? '—' : 'Checked history and findings appear here.\nYou can also type additional clinical notes…'}
                    style={{
                      width: '100%', flex: 1,
                      padding: '10px 12px',
                      border: isFormDisabled ? '1px solid #d1d5db' : '1.5px solid #a7f3d0',
                      borderRadius: 8,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      backgroundColor: isFormDisabled ? '#f9fafb' : '#f0fdf4',
                      color: isFormDisabled ? '#374151' : '#065f46',
                      lineHeight: 1.6,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── 2. REASON FOR REFERRAL & ACTION/S TAKEN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: '#f9fafb', padding: '16px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Reason for Referral (Dahilan ng Referral)
                </label>
                <input
                  type="text"
                  value={formData.reason_for_referral}
                  onChange={handleFieldChange('reason_for_referral')}
                  disabled={isFormDisabled}
                  placeholder="For further evaluation and management."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    backgroundColor: '#f3f4f6',
                    color: '#4b5563',
                    outline: 'none',
                    fontWeight: 500,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Action/s Taken (Mga Aksyong Ginawa Bago I-refer)
                </label>
                <textarea
                  value={formData.actions_taken}
                  onChange={handleFieldChange('actions_taken')}
                  disabled={isFormDisabled}
                  rows={4}
                  placeholder={isFormDisabled ? '—' : 'Enter actions taken prior to referral (e.g. Wound washed with soap and water for 15 mins, antiseptic applied, tetanus toxoid given, etc.)'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    backgroundColor: isFormDisabled ? '#f9fafb' : '#ffffff',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: CONSULTATION DETAILS */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Date of Consultation
            </label>
            <input
              type="date"
              value={formData.date_of_consultation}
              onChange={handleFieldChange('date_of_consultation')}
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Consultation Time (AM/PM)
            </label>
            <input
              type="time"
              value={formData.consultation_time}
              onChange={handleFieldChange('consultation_time')}
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Blood Pressure</label>
            <input type="text" value={formData.blood_pressure} onChange={handleFieldChange('blood_pressure')} placeholder="120/80" disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Temperature (°C)</label>
            <input type="text" value={formData.temperature} onChange={handleFieldChange('temperature')} placeholder="36.5" disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Height (cm)</label>
            <input type="text" value={formData.height} onChange={handleFieldChange('height')} placeholder="170" disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Weight (kg)</label>
            <input type="text" value={formData.weight} onChange={handleFieldChange('weight')} placeholder="70" disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }} />
          </div>
        </div>
      </div>

      {/* Provider Details */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Name of Attending Provider</label>
            <input type="text" value={formData.name_of_attending_provider} onChange={handleFieldChange('name_of_attending_provider')} disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }} />
          </div>
          <div>
            <ReferralLocationSelector
              label="Referred by"
              value={formData.referred_by}
              onChange={(val) => setFormData((prev) => ({ ...prev, referred_by: val }))}
              disabled={isFormDisabled}
            />
          </div>
        </div>
      </div>

      {/* Nature of Visit */}
      <div
        id="field-nature_of_visit"
        style={{
          marginBottom: 32,
          padding: fieldErrors.nature_of_visit ? '16px' : '0px',
          border: fieldErrors.nature_of_visit ? '2px solid #ef4444' : 'none',
          borderRadius: '10px',
          backgroundColor: fieldErrors.nature_of_visit ? '#fef2f2' : 'transparent',
          boxShadow: fieldErrors.nature_of_visit ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: fieldErrors.nature_of_visit ? '#dc2626' : '#374151', marginBottom: 8 }}>
          Nature of Visit <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { value: 'new_consultation', label: 'New Consultation/Case' },
            { value: 'new_admission', label: 'New Admission' },
            { value: 'follow_up', label: 'Follow-up visit' },
          ].map((option) => (
            <label key={option.value} style={{ display: 'flex', alignItems: 'center', cursor: isFormDisabled ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name="nature_of_visit"
                value={option.value}
                checked={formData.nature_of_visit === option.value}
                onChange={handleFieldChange('nature_of_visit')}
                disabled={isFormDisabled}
                style={{ marginRight: 8, accentColor: fieldErrors.nature_of_visit ? '#ef4444' : undefined }}
              />
              <span style={{ fontSize: 13, color: fieldErrors.nature_of_visit ? '#991b1b' : '#374151', fontWeight: fieldErrors.nature_of_visit ? 600 : 400 }}>{option.label}</span>
            </label>
          ))}
        </div>
        {fieldErrors.nature_of_visit && (
          <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>⚠</span> {fieldErrors.nature_of_visit}
          </div>
        )}
      </div>

      {/* Type of Consultation */}
      <div
        id="field-consultation_types"
        style={{
          marginBottom: 32,
          padding: fieldErrors.consultation_types ? '16px' : '0px',
          border: fieldErrors.consultation_types ? '2px solid #ef4444' : 'none',
          borderRadius: '10px',
          backgroundColor: fieldErrors.consultation_types ? '#fef2f2' : 'transparent',
          boxShadow: fieldErrors.consultation_types ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <h3 style={{ color: fieldErrors.consultation_types ? '#dc2626' : '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Type of Consultation / Purpose of Visit <span style={{ color: '#ef4444' }}>*</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}>
          {[
            { key: 'general', label: 'General' },
            { key: 'family_planning', label: 'Family Planning' },
            { key: 'prenatal', label: 'Prenatal' },
            { key: 'postpartum', label: 'Postpartum' },
            { key: 'dental_care', label: 'Dental Care' },
            { key: 'tuberculosis', label: 'Tuberculosis' },
            { key: 'child_care', label: 'Child Care' },
            { key: 'child_immunization', label: 'Child Immunization' },
            { key: 'child_nutrition', label: 'Child Nutrition' },
            { key: 'sick_children', label: 'Sick Children' },
            { key: 'injury', label: 'Injury' },
            { key: 'firecracker_injury', label: 'Firecracker Injury' },
            { key: 'adult_immunization', label: 'Adult Immunization' },
          ].map((type) => (
            <label key={type.key} style={{ display: 'flex', alignItems: 'center', cursor: isFormDisabled ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.consultation_types[type.key as keyof typeof formData.consultation_types]}
                onChange={handleCheckboxChange(type.key as keyof typeof formData.consultation_types)}
                disabled={isFormDisabled}
                style={{ marginRight: 8, accentColor: fieldErrors.consultation_types ? '#ef4444' : undefined }}
              />
              <span style={{ fontSize: 13, color: fieldErrors.consultation_types ? '#991b1b' : '#374151' }}>{type.label}</span>
            </label>
          ))}
        </div>
        {fieldErrors.consultation_types && (
          <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>⚠</span> {fieldErrors.consultation_types}
          </div>
        )}
      </div>

      {/* Clinical Notes */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Clinical Notes
        </h3>
        <div
          id="field-chief_complaints"
          style={{
            marginBottom: 16,
            padding: fieldErrors.chief_complaints ? '16px' : '0px',
            border: fieldErrors.chief_complaints ? '2px solid #ef4444' : 'none',
            borderRadius: '10px',
            backgroundColor: fieldErrors.chief_complaints ? '#fef2f2' : 'transparent',
            boxShadow: fieldErrors.chief_complaints ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : 'none',
            transition: 'all 0.25s ease',
          }}
        >
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: fieldErrors.chief_complaints ? '#dc2626' : '#374151', marginBottom: 6 }}>
            Chief Complaints <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            value={formData.chief_complaints}
            onChange={handleFieldChange('chief_complaints')}
            rows={3}
            disabled={isFormDisabled}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: fieldErrors.chief_complaints ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
              backgroundColor: isFormDisabled ? '#f9fafb' : (fieldErrors.chief_complaints ? '#ffffff' : undefined),
              boxShadow: fieldErrors.chief_complaints ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
              outline: 'none',
            }}
          />
          {fieldErrors.chief_complaints && (
            <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>⚠</span> {fieldErrors.chief_complaints}
            </div>
          )}
        </div>

        {/* ── Diagnosis: Checklist (left) + Text Box (right) ── */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Diagnosis
            {checkedDiagnoses.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#059669', borderRadius: 99, padding: '2px 8px', border: '1px solid #a7f3d0' }}>
                {checkedDiagnoses.length} checked
              </span>
            )}
          </label>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 0' }}>
            Check a diagnosis to auto-fill the box — or type manually (maaaring pumili o mag-type)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* LEFT: Scrollable checklist */}
            <div style={{
              border: '1px solid #d1d5db', borderRadius: 8,
              maxHeight: 230, overflowY: 'auto',
              backgroundColor: isFormDisabled ? '#f9fafb' : '#fff',
            }}>
              {ANIMAL_BITE_DIAGNOSES.map((diag, idx) => {
                const isChecked = checkedDiagnoses.includes(diag);
                return (
                  <label key={diag} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px',
                    borderBottom: idx < ANIMAL_BITE_DIAGNOSES.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: isFormDisabled ? 'default' : 'pointer',
                    background: isChecked ? '#f0fdf4' : 'transparent',
                    transition: 'background 0.1s',
                  }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => !isFormDisabled && toggleDiagnosis(diag)}
                      disabled={isFormDisabled}
                      style={{ accentColor: '#10b981', width: 14, height: 14, flexShrink: 0, cursor: isFormDisabled ? 'default' : 'pointer' }}
                    />
                    <span style={{ fontSize: 12.5, color: isChecked ? '#065f46' : '#374151', fontWeight: isChecked ? 600 : 400, lineHeight: 1.3 }}>
                      {diag}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* RIGHT: Auto-filled + manually editable text box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1v6H2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="7" stroke="#9ca3af" strokeWidth="1.5"/></svg>
                Auto-fills when checked · Editable
              </div>
              <textarea
                value={formData.diagnosis}
                onChange={handleFieldChange('diagnosis')}
                disabled={isFormDisabled}
                rows={9}
                placeholder={isFormDisabled ? '—' : 'Checked items appear here.\nYou can also type additional notes…'}
                style={{
                  width: '100%', flex: 1,
                  padding: '10px 12px',
                  border: isFormDisabled ? '1px solid #d1d5db' : '1.5px solid #a7f3d0',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: isFormDisabled ? '#f9fafb' : '#f0fdf4',
                  color: isFormDisabled ? '#374151' : '#065f46',
                  lineHeight: 1.6,
                  outline: 'none',
                }}
              />
              {!isFormDisabled && (
                <button
                  type="button"
                  onClick={() => { setCheckedDiagnoses([]); setFormData(p => ({ ...p, diagnosis: '' })); }}
                  style={{ alignSelf: 'flex-start', fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Medication / Treatment: Checklist (left) + Text Box (right) ── */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Medication / Treatment
            {checkedMeds.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', borderRadius: 99, padding: '2px 8px', border: '1px solid #bfdbfe' }}>
                {checkedMeds.length} checked
              </span>
            )}
          </label>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 0' }}>
            Check vaccines/medications from inventory — or type manually
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* LEFT: Vaccine inventory checklist */}
            <div style={{
              border: '1px solid #d1d5db', borderRadius: 8,
              maxHeight: 230, overflowY: 'auto',
              backgroundColor: isFormDisabled ? '#f9fafb' : '#fff',
            }}>
              {vaccineNames.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                  Loading vaccines from inventory…
                </div>
              ) : vaccineNames.map((vaccine, idx) => {
                const isChecked = checkedMeds.includes(vaccine);
                return (
                  <label key={vaccine} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px',
                    borderBottom: idx < vaccineNames.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: isFormDisabled ? 'default' : 'pointer',
                    background: isChecked ? '#eff6ff' : 'transparent',
                    transition: 'background 0.1s',
                  }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => !isFormDisabled && toggleMed(vaccine)}
                      disabled={isFormDisabled}
                      style={{ accentColor: '#3b82f6', width: 14, height: 14, flexShrink: 0, cursor: isFormDisabled ? 'default' : 'pointer' }}
                    />
                    <span style={{ fontSize: 12.5, color: isChecked ? '#1d4ed8' : '#374151', fontWeight: isChecked ? 600 : 400, lineHeight: 1.3 }}>
                      {vaccine}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* RIGHT: Auto-filled + manually editable text box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1v6H2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="7" stroke="#9ca3af" strokeWidth="1.5"/></svg>
                Auto-fills when checked · Editable
              </div>
              <textarea
                value={formData.medication_treatment}
                onChange={handleFieldChange('medication_treatment')}
                disabled={isFormDisabled}
                rows={9}
                placeholder={isFormDisabled ? '—' : 'Checked vaccines appear here.\nYou can also type dosage, notes…'}
                style={{
                  width: '100%', flex: 1,
                  padding: '10px 12px',
                  border: isFormDisabled ? '1px solid #d1d5db' : '1.5px solid #bfdbfe',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: isFormDisabled ? '#f9fafb' : '#eff6ff',
                  color: isFormDisabled ? '#374151' : '#1d4ed8',
                  lineHeight: 1.6,
                  outline: 'none',
                }}
              />
              {!isFormDisabled && (
                <button
                  type="button"
                  onClick={() => { setCheckedMeds([]); setFormData(p => ({ ...p, medication_treatment: '' })); }}
                  style={{ alignSelf: 'flex-start', fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Provider + Lab */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Name of Health Care Provider</label>
            <input
              type="text"
              value={formData.name_of_provider}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Performed Laboratory Test</label>
            <input type="text" value={formData.performed_lab_test} onChange={handleFieldChange('performed_lab_test')} disabled={isFormDisabled}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: isFormDisabled ? '#f9fafb' : undefined }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Laboratory Findings / Impression</label>
          <textarea value={formData.laboratory_findings} onChange={handleFieldChange('laboratory_findings')} rows={3} disabled={isFormDisabled}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', backgroundColor: isFormDisabled ? '#f9fafb' : undefined }} />
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        Clinic Information System | FORM 2 | Page 1
      </div>

      {/* Inline footer buttons */}
      {inline && (
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>}
          
          {hasExistingRecord && !isEditing ? (
            !readOnly && (
              <button
                type="button"
                className="fm-btn"
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ✏️ Edit Record
              </button>
            )
          ) : (
            <>
              {hasExistingRecord && isEditing && (
                <button
                  type="button"
                  className="fm-btn fm-btn--cancel"
                  onClick={() => {
                    if (existingRecord) populateFormFromRecord(existingRecord);
                    setIsEditing(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
              <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : hasExistingRecord ? '✓ Save Changes' : '✓ Save Record'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  // Inline mode: return content directly without Dialog wrapper
  if (inline) return formContent;

  // Modal mode: wrap in FormModal
  return (
    <FormModal
      title="Individual Treatment"
      subtitle="Form 2 — General Consultation"
      onClose={onClose}
      maxWidth={950}
      footer={
        <>
          {error && (
            <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>
              {error}
            </p>
          )}
          {hasExistingRecord && !isEditing ? (
            <>
              <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>
                Close
              </button>
              {!readOnly && (
                <button
                  type="button"
                  className="fm-btn fm-btn--submit"
                  onClick={() => setIsEditing(true)}
                  style={{ backgroundColor: '#10b981' }}
                >
                  ✏️ Edit Record
                </button>
              )}
            </>
          ) : (
            <>
              <button
                className="fm-btn fm-btn--cancel"
                onClick={() => {
                  if (hasExistingRecord && isEditing) {
                    if (existingRecord) populateFormFromRecord(existingRecord);
                    setIsEditing(false);
                  } else {
                    onClose();
                  }
                }}
                disabled={saving}
              >
                {hasExistingRecord && isEditing ? 'Cancel Edit' : 'Cancel'}
              </button>
              <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : hasExistingRecord ? 'Save Changes' : 'Save Patient Record'}
              </button>
            </>
          )}
        </>
      }
    >
      {formContent}
    </FormModal>
  );
}
