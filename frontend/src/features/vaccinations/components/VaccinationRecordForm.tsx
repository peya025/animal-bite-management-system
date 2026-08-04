import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';

interface VaccinationRecordFormProps {
  open: boolean;
  entry: any;
  onClose: () => void;
  onSave: () => void;
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

export default function VaccinationRecordForm({ open, entry, onClose, onSave }: VaccinationRecordFormProps) {
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

  useEffect(() => {
    if (open && entry?.patient) {
      setFormData(prev => ({
        ...prev,
        patient_name: `${entry.patient.last_name}, ${entry.patient.first_name} ${entry.patient.middle_name || ''}`.trim(),
        age: String(entry.patient.age || ''),
        date_of_birth: formatDateForInput(entry.patient.date_of_birth),
        address: entry.patient.address || '',
        sex: entry.patient.gender === 'M' ? 'male' : entry.patient.gender === 'F' ? 'female' : '',
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

  const handleFieldChange = (key: keyof TreatmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [key]: ev.target.value }));
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
    if (!formData.exposure_category) {
      setError('Please select Exposure Category');
      return;
    }
    if (!formData.date_of_exposure) {
      setError('Please enter Date of Exposure');
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

  return (
    <FormModal
      title="New Treatment Record"
      subtitle="TAGOLOAN ANIMAL BITE TREATMENT CENTER — Official Form"
      onClose={onClose}
      maxWidth={1000}
      footer={
        <>
          {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>{error}</p>}
          <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : '✓ Save Record'}
          </button>
        </>
      }
    >
      <div style={{ padding: '24px 32px' }}>
        {/* SECTION 1: PATIENT & REGISTRATION INFORMATION */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            PATIENT & REGISTRATION INFORMATION
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date</label>
              <input type="date" value={formData.date} onChange={handleFieldChange('date')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Registry No.</label>
              <input type="text" value={formData.registry_no} onChange={handleFieldChange('registry_no')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Hospital No.</label>
              <input type="text" value={formData.hospital_no} onChange={handleFieldChange('hospital_no')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Referred by</label>
              <input type="text" value={formData.referred_by} onChange={handleFieldChange('referred_by')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>PhilHealth Identification Number (PIN)</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="text" value={formData.philhealth_pin} onChange={handleFieldChange('philhealth_pin')} placeholder="XX-XXXXXXXXX-X" style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: 16 }}>
                <input type="radio" name="philhealth_type" value="member" checked={formData.philhealth_type === 'member'} onChange={handleFieldChange('philhealth_type')} style={{ marginRight: 6 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>Member</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="philhealth_type" value="dependent" checked={formData.philhealth_type === 'dependent'} onChange={handleFieldChange('philhealth_type')} style={{ marginRight: 6 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>Dependent</span>
              </label>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Patient Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" value={formData.patient_name} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }} placeholder="Last, First Middle" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Age</label>
              <input type="text" value={formData.age} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: '#f9fafb', color: '#6b7280' }} placeholder="e.g. 25" />
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
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="sex" value="male" checked={formData.sex === 'male'} readOnly style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Male</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="sex" value="female" checked={formData.sex === 'female'} readOnly style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Female</span>
                </label>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Exposure Category <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 16 }}>
                {(['I', 'II', 'III'] as const).map((cat) => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="radio" name="exposure_category" value={cat} checked={formData.exposure_category === cat} onChange={handleFieldChange('exposure_category')} style={{ marginRight: 6 }} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date of Exposure <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="date" value={formData.date_of_exposure} onChange={handleFieldChange('date_of_exposure')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date Treatment Started</label>
              <input type="date" value={formData.date_treatment_started} onChange={handleFieldChange('date_treatment_started')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Place of Exposure</label>
            <input type="text" value={formData.place_of_exposure} onChange={handleFieldChange('place_of_exposure')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
          </div>
        </div>

        {/* SECTION 2: EXPOSURE DETAILS */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            EXPOSURE DETAILS
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>1. Mode of Animal Exposure</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.mode_of_exposure.nibbling_uncovered} onChange={handleCheckboxChange('mode_of_exposure', 'nibbling_uncovered')} style={{ marginRight: 8, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Nibbling/Licking of uncovered skin</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.mode_of_exposure.nibbling_wounded} onChange={handleCheckboxChange('mode_of_exposure', 'nibbling_wounded')} style={{ marginRight: 8, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Nibbling/Licking of wounded/broken skin</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.mode_of_exposure.scratch_abrasion} onChange={handleCheckboxChange('mode_of_exposure', 'scratch_abrasion')} style={{ marginRight: 8, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Scratch / Abrasion</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.mode_of_exposure.transdermal_bite} onChange={handleCheckboxChange('mode_of_exposure', 'transdermal_bite')} style={{ marginRight: 8, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Transdermal Bite</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.mode_of_exposure.handling_ingestion} onChange={handleCheckboxChange('mode_of_exposure', 'handling_ingestion')} style={{ marginRight: 8, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Handling / Ingestion of raw infected meat</span>
                </label>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>2. Body Part Affected Exposed</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.body_part_affected.head_neck} onChange={handleCheckboxChange('body_part_affected', 'head_neck')} style={{ marginRight: 8 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Head and/or neck</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.body_part_affected.other_parts} onChange={handleCheckboxChange('body_part_affected', 'other_parts')} style={{ marginRight: 8 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Other parts of the body</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.body_part_affected.na_ingestion} onChange={handleCheckboxChange('body_part_affected', 'na_ingestion')} style={{ marginRight: 8 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>N/A if Ingestion mode</span>
                </label>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>3. Type of Animal</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.animal_type === 'dog'} onChange={(e) => setFormData(prev => ({ ...prev, animal_type: e.target.checked ? 'dog' : '' }))} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Dog</span>
                </label>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Others:</span>
                <input type="text" value={formData.animal_type_other} onChange={handleFieldChange('animal_type_other')} onFocus={() => setFormData(prev => ({ ...prev, animal_type: 'other' }))} style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>4. Past History of animal bite</p>
              <div style={{ display: 'flex', gap: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="past_history_bite" value="yes" checked={formData.past_history_bite === 'yes'} onChange={handleFieldChange('past_history_bite')} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Yes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="past_history_bite" value="no" checked={formData.past_history_bite === 'no'} onChange={handleFieldChange('past_history_bite')} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>No</span>
                </label>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Was PEP Immunization completed?</p>
              <div style={{ display: 'flex', gap: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="pep_completed" value="yes" checked={formData.pep_completed === 'yes'} onChange={handleFieldChange('pep_completed')} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>Yes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="pep_completed" value="no" checked={formData.pep_completed === 'no'} onChange={handleFieldChange('pep_completed')} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>No</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: VACCINATION RECORD */}
        <div>
          <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            PERIOD EXPOSURE VACCINATION RECORD
          </h3>
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
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`route_${index}`}
                            value="ID"
                            checked={dose.route === 'ID'}
                            onChange={() => handleDoseChange(index, 'route', 'ID')}
                            style={{ marginRight: 6 }}
                          />
                          <span style={{ fontSize: 12 }}>ID</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`route_${index}`}
                            value="IM"
                            checked={dose.route === 'IM'}
                            onChange={() => handleDoseChange(index, 'route', 'IM')}
                            style={{ marginRight: 6 }}
                          />
                          <span style={{ fontSize: 12 }}>IM</span>
                        </label>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                      <input
                        type="date"
                        value={dose.date}
                        onChange={(e) => handleDoseChange(index, 'date', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                      <input
                        type="text"
                        value={dose.given_by}
                        onChange={(e) => handleDoseChange(index, 'given_by', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                      <input
                        type="text"
                        value={dose.signature}
                        onChange={(e) => handleDoseChange(index, 'signature', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                      />
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
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
              Additional Medications
            </h3>
            <div style={{ display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={additionalMeds.erig}
                  onChange={(e) => setAdditionalMeds(prev => ({ ...prev, erig: e.target.checked }))}
                  style={{ marginRight: 8 }}
                />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>ERIG</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={additionalMeds.tt}
                  onChange={(e) => setAdditionalMeds(prev => ({ ...prev, tt: e.target.checked }))}
                  style={{ marginRight: 8 }}
                />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>TT</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={additionalMeds.ats}
                  onChange={(e) => setAdditionalMeds(prev => ({ ...prev, ats: e.target.checked }))}
                  style={{ marginRight: 8 }}
                />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>ATS</span>
              </label>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              ICD 10 Code
            </label>
            <input
              type="text"
              value={icdCode}
              onChange={(e) => setIcdCode(e.target.value)}
              placeholder="e.g., W54.0"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
            />
          </div>
        </div>
      </div>
    </FormModal>
  );
}
