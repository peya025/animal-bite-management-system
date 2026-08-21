import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import { formatPhilHealthNumber } from '../../../shared/utils';
import { HEALTH_FACILITY_GROUPS, ALL_HEALTH_FACILITIES } from '../../../shared/constants/healthFacilities';
import ReferralLocationSelector from '../../consultations/components/ReferralLocationSelector';

interface VaccinationRecordFormProps {
  open: boolean;
  entry: any;
  onClose: () => void;
  onSave: () => void;
  readOnly?: boolean;
  inline?: boolean;
}

interface TreatmentFormData {
  date: string;
  registry_no: string;
  hospital_no: string;
  referred_by: string;
  philhealth_pin: string;
  philhealth_type: 'member' | 'dependent' | '';
  patient_name: string;
  age: string;
  date_of_birth: string;
  address: string;
  sex: 'male' | 'female' | '';
  exposure_category: 'I' | 'II' | 'III' | '';
  date_of_exposure: string;
  date_treatment_started: string;
  place_of_exposure: string;
  mode_of_exposure: {
    nibbling_uncovered: boolean;
    nibbling_wounded: boolean;
    scratch_abrasion: boolean;
    transdermal_bite: boolean;
    handling_ingestion: boolean;
  };
  body_part_affected: {
    head_neck: boolean;
    other_parts: boolean;
    na_ingestion: boolean;
  };
  animal_type: 'dog' | 'other' | '';
  animal_type_other: string;
  past_history_bite: 'yes' | 'no' | '';
  pep_completed: 'yes' | 'no' | '';
}

interface VaccinationDose {
  period: string;
  route: 'ID' | 'IM' | '';
  date: string;
  given_by: string;
  signature: string;
}

interface AdditionalMeds {
  erig: boolean;
  tt: boolean;
  ats: boolean;
}

const INITIAL_FORM_DATA: TreatmentFormData = {
  date: new Date().toISOString().split('T')[0],
  registry_no: '',
  hospital_no: '',
  referred_by: '',
  philhealth_pin: '',
  philhealth_type: '',
  patient_name: '',
  age: '',
  date_of_birth: '',
  address: '',
  sex: '',
  exposure_category: '',
  date_of_exposure: '',
  date_treatment_started: new Date().toISOString().split('T')[0],
  place_of_exposure: '',
  mode_of_exposure: {
    nibbling_uncovered: false,
    nibbling_wounded: false,
    scratch_abrasion: false,
    transdermal_bite: false,
    handling_ingestion: false,
  },
  body_part_affected: {
    head_neck: false,
    other_parts: false,
    na_ingestion: false,
  },
  animal_type: '',
  animal_type_other: '',
  past_history_bite: '',
  pep_completed: '',
};

export default function VaccinationRecordForm({ open, entry, onClose, onSave, readOnly = false, inline = false }: VaccinationRecordFormProps) {
  const [formData, setFormData] = useState<TreatmentFormData>(INITIAL_FORM_DATA);
  const [doses, setDoses] = useState<VaccinationDose[]>([
    { period: 'Day 0', route: 'IM', date: '', given_by: '', signature: '' },
    { period: 'Day 3', route: 'IM', date: '', given_by: '', signature: '' },
    { period: 'Day 7', route: 'IM', date: '', given_by: '', signature: '' },
    { period: 'Day 28', route: '', date: '', given_by: '', signature: '' },
    { period: 'Booster 1', route: '', date: '', given_by: '', signature: '' },
    { period: 'Booster 2', route: '', date: '', given_by: '', signature: '' },
  ]);
  const [additionalMeds, setAdditionalMeds] = useState<AdditionalMeds>({
    erig: false,
    tt: false,
    ats: false,
  });
  const [icdCode, setIcdCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Helper function to format date to yyyy-MM-dd
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const isPhilHealthMember = Boolean(
    entry?.patient?.philhealth_member === 'yes' ||
    entry?.patient?.details?.philhealth_member === 'yes' ||
    entry?.patient?.philhealth_no ||
    entry?.patient?.details?.philhealth_no
  );

  useEffect(() => {
    if (open && entry?.patient) {
      const pObj = entry.patient;
      const dObj = entry.patient.details || {};
      const isMember = Boolean(
        pObj.philhealth_member === 'yes' ||
        dObj.philhealth_member === 'yes' ||
        pObj.philhealth_no ||
        dObj.philhealth_no
      );
      const rawPin = isMember ? (pObj.philhealth_no || dObj.philhealth_no || '') : '';
      const rawType = isMember ? (pObj.philhealth_status || dObj.philhealth_status || '') : '';

      setFormData(prev => ({
        ...prev,
        patient_name: `${entry.patient.last_name}, ${entry.patient.first_name} ${entry.patient.middle_name || ''}`.trim(),
        age: String(entry.patient.age || ''),
        date_of_birth: formatDateForInput(entry.patient.date_of_birth),
        address: entry.patient.address || '',
        sex: entry.patient.gender === 'M' ? 'male' : entry.patient.gender === 'F' ? 'female' : '',
        philhealth_pin: isMember ? formatPhilHealthNumber(rawPin) : '',
        philhealth_type: (rawType === 'member' || rawType === 'dependent') ? rawType : '',
      }));

      // Load appointments and pre-fill scheduled dates
      loadPatientAppointments();
    }
  }, [open, entry]);

  const loadPatientAppointments = async () => {
    if (!entry?.patient?.patient_id) return;

    try {
      const response = await api.get(`/appointments?patient_id=${entry.patient.patient_id}&status=scheduled`);
      const appointments = response.data.data || [];

      // Pre-fill doses with scheduled appointment dates
      setDoses(prevDoses => {
        return prevDoses.map(dose => {
          const doseNumberMap: Record<string, number> = {
            'Day 0': 0,
            'Day 3': 3,
            'Day 7': 7,
            'Day 28': 28,
            'Booster 1': 90,
            'Booster 2': 365,
          };

          const doseNumber = doseNumberMap[dose.period];
          const appointment = appointments.find((a: any) => a.dose_number === doseNumber);

          if (appointment && !dose.date) {
            // Pre-fill with scheduled date (but keep it editable)
            return {
              ...dose,
              date: formatDateForInput(appointment.appointment_date),
            };
          }

          return dose;
        });
      });
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (key: keyof TreatmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let value = ev.target.value;
    if (key === 'philhealth_pin') {
      value = formatPhilHealthNumber(value);
    }
    setFormData(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleCheckboxChange = (section: 'mode_of_exposure' | 'body_part_affected', key: string) => (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: ev.target.checked,
      },
    }));
  };

  const handleDoseChange = (index: number, field: keyof VaccinationDose, value: any) => {
    setDoses(prev => prev.map((dose, i) => (i === index ? { ...dose, [field]: value } : dose)));
  };

  const handleSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};

    if (isPhilHealthMember && formData.philhealth_pin && formData.philhealth_pin.replace(/\D/g, '').length !== 12) {
      newFieldErrors.philhealth_pin = 'PhilHealth PIN must be exactly 12 digits.';
    }
    if (!formData.exposure_category) {
      newFieldErrors.exposure_category = 'Please select Exposure Category';
    }
    if (!formData.date_of_exposure) {
      newFieldErrors.date_of_exposure = 'Please enter Date of Exposure';
    }

    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      setError('Please fill in the required field(s) highlighted in red.');

      const fieldOrder = ['philhealth_pin', 'exposure_category', 'date_of_exposure'];
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
    setSaving(true);

    try {
      await api.post('/vaccination-records', {
        patient_id: entry.patient.patient_id,
        queue_id: entry.queue_id,
        ...formData,
        mode_of_exposure: Object.keys(formData.mode_of_exposure).filter(
          key => formData.mode_of_exposure[key as keyof typeof formData.mode_of_exposure]
        ),
        body_part_affected: Object.keys(formData.body_part_affected).filter(
          key => formData.body_part_affected[key as keyof typeof formData.body_part_affected]
        ),
        doses: doses.filter(d => d.date).map(d => ({
          period: d.period,
          route: d.route || null,
          date: d.date,
          given_by: d.given_by || null,
          signature: d.signature || null,
        })),
        additional_meds: additionalMeds,
        icd_code: icdCode || null,
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
      {/* SECTION 1: PATIENT & REGISTRATION INFORMATION */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          PATIENT &amp; REGISTRATION INFORMATION
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date</label>
            <input type="date" value={formData.date} onChange={handleFieldChange('date')} disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Registry No.</label>
            <input type="text" value={formData.registry_no} onChange={handleFieldChange('registry_no')} disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Hospital No.</label>
            <input type="text" value={formData.hospital_no} onChange={handleFieldChange('hospital_no')} disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
          </div>
          <div>
            <ReferralLocationSelector
              label="Referred by"
              value={formData.referred_by}
              onChange={(val) => setFormData((prev) => ({ ...prev, referred_by: val }))}
              disabled={readOnly}
            />
          </div>
        </div>
        <div id="field-philhealth_pin" style={{
          marginBottom: 16,
          padding: fieldErrors.philhealth_pin ? '12px' : '0px',
          border: fieldErrors.philhealth_pin ? '2px solid #ef4444' : 'none',
          borderRadius: '8px',
          backgroundColor: fieldErrors.philhealth_pin ? '#fef2f2' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: fieldErrors.philhealth_pin ? '#dc2626' : '#374151' }}>
              PhilHealth Identification Number (PIN)
            </label>
            {!isPhilHealthMember && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span>⚠</span> No PhilHealth Information Provided in Form 1
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="text"
              value={isPhilHealthMember ? formData.philhealth_pin : 'No PhilHealth Information Provided in Form 1'}
              onChange={handleFieldChange('philhealth_pin')}
              placeholder={isPhilHealthMember ? "XX-XXXXXXXXX-X" : "No PhilHealth Information Provided in Form 1"}
              maxLength={14}
              disabled={readOnly || !isPhilHealthMember}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: fieldErrors.philhealth_pin ? '2px solid #ef4444' : !isPhilHealthMember ? '1px dashed #fca5a5' : '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: !isPhilHealthMember ? '#fef2f2' : readOnly ? '#f9fafb' : '#ffffff',
                color: !isPhilHealthMember ? '#dc2626' : '#111827',
                fontWeight: !isPhilHealthMember ? 500 : 400,
                fontStyle: !isPhilHealthMember ? 'italic' : 'normal',
                cursor: !isPhilHealthMember ? 'not-allowed' : undefined,
              }}
            />
            <select
              value={isPhilHealthMember ? formData.philhealth_type : ''}
              onChange={handleFieldChange('philhealth_type')}
              disabled={readOnly || !isPhilHealthMember}
              style={{
                padding: '8px 12px',
                border: !isPhilHealthMember ? '1px dashed #fca5a5' : '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: !isPhilHealthMember ? '#fef2f2' : readOnly ? '#f9fafb' : '#ffffff',
                color: !isPhilHealthMember ? '#dc2626' : '#111827',
                outline: 'none',
                cursor: !isPhilHealthMember ? 'not-allowed' : undefined,
              }}
            >
              <option value="">{isPhilHealthMember ? '— Select —' : '— Not Provided —'}</option>
              {isPhilHealthMember && (
                <>
                  <option value="member">Member</option>
                  <option value="dependent">Dependent</option>
                </>
              )}
            </select>
          </div>
          {fieldErrors.philhealth_pin && (
            <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 6 }}>⚠ {fieldErrors.philhealth_pin}</div>
          )}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Patient Name <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="text" value={formData.patient_name} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }} placeholder="Last, First Middle" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Age</label>
            <input type="text" value={formData.age} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date of Birth</label>
            <input type="date" value={formData.date_of_birth} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Address</label>
          <input type="text" value={formData.address} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Sex</label>
            <div style={{ display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}>
                <input type="radio" name="sex" value="male" checked={formData.sex === 'male'} readOnly style={{ marginRight: 6 }} />
                <span style={{ fontSize: 13, color: '#6b7280' }}>Male</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}>
                <input type="radio" name="sex" value="female" checked={formData.sex === 'female'} readOnly style={{ marginRight: 6 }} />
                <span style={{ fontSize: 13, color: '#6b7280' }}>Female</span>
              </label>
            </div>
          </div>
          <div id="field-exposure_category" style={{
            padding: fieldErrors.exposure_category ? '10px' : '0px',
            border: fieldErrors.exposure_category ? '2px solid #ef4444' : 'none',
            borderRadius: '8px',
            backgroundColor: fieldErrors.exposure_category ? '#fef2f2' : 'transparent',
          }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: fieldErrors.exposure_category ? '#dc2626' : '#374151', marginBottom: 8 }}>Exposure Category <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', gap: 16 }}>
              {(['I', 'II', 'III'] as const).map((cat) => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input type="radio" name="exposure_category" value={cat} checked={formData.exposure_category === cat} onChange={handleFieldChange('exposure_category')} disabled={readOnly} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: fieldErrors.exposure_category ? '#991b1b' : '#374151' }}>{cat}</span>
                </label>
              ))}
            </div>
            {fieldErrors.exposure_category && (
              <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 6 }}>⚠ {fieldErrors.exposure_category}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div id="field-date_of_exposure" style={{
            padding: fieldErrors.date_of_exposure ? '10px' : '0px',
            border: fieldErrors.date_of_exposure ? '2px solid #ef4444' : 'none',
            borderRadius: '8px',
            backgroundColor: fieldErrors.date_of_exposure ? '#fef2f2' : 'transparent',
          }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: fieldErrors.date_of_exposure ? '#dc2626' : '#374151', marginBottom: 6 }}>Date of Exposure <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="date" value={formData.date_of_exposure} onChange={handleFieldChange('date_of_exposure')} disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: fieldErrors.date_of_exposure ? '2px solid #ef4444' : '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            {fieldErrors.date_of_exposure && (
              <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 6 }}>⚠ {fieldErrors.date_of_exposure}</div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date Treatment Started</label>
            <input type="date" value={formData.date_treatment_started} onChange={handleFieldChange('date_treatment_started')} disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Place of Exposure</label>
          <input type="text" value={formData.place_of_exposure} onChange={handleFieldChange('place_of_exposure')} disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
        </div>
      </div>

      {/* SECTION 2: EXPOSURE DETAILS */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EXPOSURE DETAILS</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>1. Mode of Animal Exposure</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['nibbling_uncovered', 'Nibbling/Licking of uncovered skin'],
                ['nibbling_wounded', 'Nibbling/Licking of wounded/broken skin'],
                ['scratch_abrasion', 'Scratch / Abrasion'],
                ['transdermal_bite', 'Transdermal Bite'],
                ['handling_ingestion', 'Handling / Ingestion of raw infected meat'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'start', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input type="checkbox" checked={formData.mode_of_exposure[key as keyof typeof formData.mode_of_exposure]} onChange={handleCheckboxChange('mode_of_exposure', key as any)} disabled={readOnly} style={{ marginRight: 8, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>2. Body Part Affected Exposed</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {[
                ['head_neck', 'Head and/or neck'],
                ['other_parts', 'Other parts of the body'],
                ['na_ingestion', 'N/A if Ingestion mode'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input type="checkbox" checked={formData.body_part_affected[key as keyof typeof formData.body_part_affected]} onChange={handleCheckboxChange('body_part_affected', key as any)} disabled={readOnly} style={{ marginRight: 8 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>3. Type of Animal</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                <input type="checkbox" checked={formData.animal_type === 'dog'} onChange={(e) => setFormData(prev => ({ ...prev, animal_type: e.target.checked ? 'dog' : '' }))} disabled={readOnly} style={{ marginRight: 6 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>Dog</span>
              </label>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Others:</span>
              <input type="text" value={formData.animal_type_other} onChange={handleFieldChange('animal_type_other')} onFocus={() => setFormData(prev => ({ ...prev, animal_type: 'other' }))} disabled={readOnly} style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>4. Past History of animal bite</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['yes', 'no'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input type="radio" name="past_history_bite" value={v} checked={formData.past_history_bite === v} onChange={handleFieldChange('past_history_bite')} disabled={readOnly} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{v}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Was PEP Immunization completed?</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['yes', 'no'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input type="radio" name="pep_completed" value={v} checked={formData.pep_completed === v} onChange={handleFieldChange('pep_completed')} disabled={readOnly} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{v}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: VACCINATION RECORD */}
      <div>
        <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PERIOD EXPOSURE VACCINATION RECORD</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, border: '1px solid #e5e7eb' }}>Period</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 700, border: '1px solid #e5e7eb' }}>Adm Route</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, border: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, border: '1px solid #e5e7eb' }}>Given by</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, border: '1px solid #e5e7eb' }}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {doses.map((dose, index) => (
                <tr key={dose.period}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, border: '1px solid #e5e7eb' }}>{dose.period}</td>
                  <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                      {(['ID', 'IM'] as const).map(route => (
                        <label key={route} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                          <input type="radio" name={`route_${index}`} value={route} checked={dose.route === route} onChange={() => handleDoseChange(index, 'route', route)} disabled={readOnly} style={{ marginRight: 6 }} />
                          <span style={{ fontSize: 12 }}>{route}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                    <input type="date" value={dose.date} onChange={(e) => handleDoseChange(index, 'date', e.target.value)} disabled={readOnly} style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
                  </td>
                  <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                    <input type="text" value={dose.given_by} onChange={(e) => handleDoseChange(index, 'given_by', e.target.value)} disabled={readOnly} style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
                  </td>
                  <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                    <input type="text" value={dose.signature} onChange={(e) => handleDoseChange(index, 'signature', e.target.value)} disabled={readOnly} style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: ADDITIONAL MEDICATIONS & ICD CODE */}
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Additional Medications</h3>
          <div style={{ display: 'flex', gap: 24 }}>
            {(['erig', 'tt', 'ats'] as const).map(med => (
              <label key={med} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                <input type="checkbox" checked={additionalMeds[med]} onChange={(e) => setAdditionalMeds(prev => ({ ...prev, [med]: e.target.checked }))} disabled={readOnly} style={{ marginRight: 8 }} />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{med.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>ICD 10 Code</label>
          <input type="text" value={icdCode} onChange={(e) => setIcdCode(e.target.value)} placeholder="e.g., W54.0" disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? '#f9fafb' : undefined }} />
        </div>
      </div>

      {/* Inline footer buttons */}
      {inline && (
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>{error}</p>}
          {!readOnly && (
            <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save Record'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (inline) return formContent;

  return (
    <FormModal
      title="New Treatment Record"
      subtitle="TAGOLOAN ANIMAL BITE TREATMENT CENTER — Official Form"
      onClose={onClose}
      maxWidth={1000}
      footer={
        <>
          {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>{error}</p>}
          <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save Record'}
            </button>
          )}
        </>
      }
    >
      {formContent}
    </FormModal>
  );
}
