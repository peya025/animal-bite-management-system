import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';

interface GeneralTreatmentFormProps {
  open: boolean;
  entry: any; // Queue entry with patient data
  onClose: () => void;
  onSave: () => void;
  readOnly?: boolean;
  inline?: boolean;
}

interface TreatmentFormData {
  // Patient Info (read-only, from queue)
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
  diagnosis: string;
  medication_treatment: string;
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

export default function GeneralTreatmentForm({ open, entry, onClose, onSave, readOnly = false, inline = false }: GeneralTreatmentFormProps) {
  const [formData, setFormData] = useState<TreatmentFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && entry?.patient) {
      // Pre-fill patient info from queue entry
      setFormData((prev) => ({
        ...prev,
        last_name: entry.patient.last_name || '',
        first_name: entry.patient.first_name || '',
        middle_name: entry.patient.middle_name || '',
        suffix: entry.patient.suffix || '',
        age: String(entry.patient.age || ''),
        address: entry.patient.address || 'Misamis Oriental',
      }));

      // Load existing treatment record if available
      loadExistingRecord();
    }
  }, [open, entry]);

  const loadExistingRecord = async () => {
    if (!entry?.patient?.patient_id) return;

    try {
      const response = await api.get(`/treatment-records/patient/${entry.patient.patient_id}`);
      if (response.data.latest_treatment) {
        const record = response.data.latest_treatment;
        // Pre-fill with existing data
        setFormData((prev) => ({
          ...prev,
          chief_complaints: record.chief_complaints || '',
          diagnosis: record.diagnosis || '',
          medication_treatment: record.medication_treatment || '',
          // ... map other fields
        }));
      }
    } catch (err) {
      console.error('Failed to load existing record:', err);
    }
  };

  const handleFieldChange = (key: keyof TreatmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [key]: ev.target.value }));
  };

  const handleCheckboxChange = (key: keyof typeof INITIAL_FORM_DATA.consultation_types) => (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      consultation_types: {
        ...prev.consultation_types,
        [key]: ev.target.checked,
      },
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.nature_of_visit) {
      setError('Please select Nature of Visit');
      return;
    }

    const hasConsultationType = Object.values(formData.consultation_types).some((v) => v);
    if (!hasConsultationType) {
      setError('Please select at least one Type of Consultation');
      return;
    }

    if (!formData.chief_complaints.trim()) {
      setError('Please enter Chief Complaints');
      return;
    }

    setError('');
    setSaving(true);

    try {
      await api.post('/treatment-records', {
        patient_id: entry.patient.patient_id,
        queue_id: entry.queue_id,
        consultation_date: formData.date_of_consultation,
        consultation_time: formData.consultation_time,
        mode_of_transaction: formData.mode_of_transaction,
        referred_from: formData.referred_from || null,
        referred_to: formData.referred_to || null,
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
        provider_name: formData.name_of_provider,
        attending_provider: formData.name_of_attending_provider,
        referred_by: formData.referred_by,
      });

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save treatment record');
    } finally {
      setSaving(false);
    }
  };

  if (!entry) return null;

  const formContent = (
    <div style={{ padding: inline ? '0' : '24px 32px' }}>
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
                <label key={mode} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input
                    type="radio"
                    name="mode_of_transaction"
                    value={mode}
                    checked={formData.mode_of_transaction === mode}
                    onChange={handleFieldChange('mode_of_transaction')}
                    disabled={readOnly}
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
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                For REFERRAL Transaction only.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Referred From
                  </label>
                  <input
                    type="text"
                    value={formData.referred_from}
                    onChange={handleFieldChange('referred_from')}
                    disabled={readOnly}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Referred To
                  </label>
                  <input
                    type="text"
                    value={formData.referred_to}
                    onChange={handleFieldChange('referred_to')}
                    disabled={readOnly}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }}
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
                disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }}
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
                disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Blood Pressure</label>
              <input type="text" value={formData.blood_pressure} onChange={handleFieldChange('blood_pressure')} placeholder="120/80" disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Temperature (°C)</label>
              <input type="text" value={formData.temperature} onChange={handleFieldChange('temperature')} placeholder="36.5" disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Height (cm)</label>
              <input type="text" value={formData.height} onChange={handleFieldChange('height')} placeholder="170" disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Weight (kg)</label>
              <input type="text" value={formData.weight} onChange={handleFieldChange('weight')} placeholder="70" disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
          </div>
        </div>

        {/* Provider Details */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Name of Attending Provider</label>
              <input type="text" value={formData.name_of_attending_provider} onChange={handleFieldChange('name_of_attending_provider')} disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Referred by</label>
              <input type="text" value={formData.referred_by} onChange={handleFieldChange('referred_by')} disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
          </div>
        </div>

        {/* Nature of Visit */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Nature of Visit <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { value: 'new_consultation', label: 'New Consultation/Case' },
              { value: 'new_admission', label: 'New Admission' },
              { value: 'follow_up', label: 'Follow-up visit' },
            ].map((option) => (
              <label key={option.value} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                <input
                  type="radio"
                  name="nature_of_visit"
                  value={option.value}
                  checked={formData.nature_of_visit === option.value}
                  onChange={handleFieldChange('nature_of_visit')}
                  disabled={readOnly}
                  style={{ marginRight: 8 }}
                />
                <span style={{ fontSize: 13, color: '#374151' }}>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Type of Consultation */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Type of Consultation / Purpose of Visit
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
              <label key={type.key} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.consultation_types[type.key as keyof typeof formData.consultation_types]}
                  onChange={handleCheckboxChange(type.key as keyof typeof formData.consultation_types)}
                  disabled={readOnly}
                  style={{ marginRight: 8 }}
                />
                <span style={{ fontSize: 13, color: '#374151' }}>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clinical Notes */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Clinical Notes
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Chief Complaints <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea value={formData.chief_complaints} onChange={handleFieldChange('chief_complaints')} rows={3} disabled={readOnly}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', backgroundColor: readOnly ? '#f9fafb' : undefined }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Diagnosis</label>
            <textarea value={formData.diagnosis} onChange={handleFieldChange('diagnosis')} rows={3} disabled={readOnly}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', backgroundColor: readOnly ? '#f9fafb' : undefined }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Medication / Treatment</label>
              <textarea value={formData.medication_treatment} onChange={handleFieldChange('medication_treatment')} rows={3} disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Name of Health Care Provider</label>
              <input type="text" value={formData.name_of_provider} onChange={handleFieldChange('name_of_provider')} disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Laboratory Findings / Impression</label>
              <textarea value={formData.laboratory_findings} onChange={handleFieldChange('laboratory_findings')} rows={3} disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Performed Laboratory Test</label>
              <input type="text" value={formData.performed_lab_test} onChange={handleFieldChange('performed_lab_test')} disabled={readOnly}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
          Clinic Information System | FORM 2 | Page 1
        </div>

        {/* Inline footer buttons */}
        {inline && !readOnly && (
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>{error}</p>}
            <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save Record'}
            </button>
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
          <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Patient Record'}
            </button>
          )}
        </>
      }
    >
      {formContent}
    </FormModal>
  );
}
