import { useEffect, useState } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import { formatPhilHealthNumber } from '../../../shared/utils';
import ReferralLocationSelector from '../../consultations/components/ReferralLocationSelector';
import {
  getNextFifoBatch,
  getVaccineNames,
  getVaccinePresets,
} from '../../inventory/services/vaccineInventoryService';
import type { VaccineTypePreset } from '../../inventory/types';

type ApiError = {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
};

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
  vaccine_type: string;
  inventory_units_used: string;
  batch_number: string;
  expiration_date?: string;
  available_stock?: number;
  is_open_vial?: boolean;
  next_dose_index?: number;
  total_doses?: number;
  inventory_linked: boolean;
}

interface ExistingVaccinationRecord {
  treatment_id: number;
  dose_number: number;
  route?: 'ID' | 'IM' | null;
  treatment_date?: string | null;
  vaccine_brand?: string | null;
  vaccine_generic?: string | null;
  batch_no?: string | null;
  expiration_date?: string | null;
  inventory_id?: number | null;
  inventory_units_used?: number | null;
  signature?: string | null;
  remarks?: string | null;
  administeredBy?: { name?: string | null } | null;
}

interface AdditionalMeds {
  erig: boolean;
  tt: boolean;
  ats: boolean;
}

const PERIOD_TO_DOSE_NUMBER: Record<string, number> = {
  'Day 0': 0,
  'Day 3': 3,
  'Day 7': 7,
  'Day 28': 28,
  'Booster 1': 90,
  'Booster 2': 365,
};

const DOSE_NUMBER_TO_PERIOD: Record<number, string> = Object.fromEntries(
  Object.entries(PERIOD_TO_DOSE_NUMBER).map(([period, value]) => [value, period]),
) as Record<number, string>;

const createInitialDoses = (): VaccinationDose[] => [
  { period: 'Day 0', route: 'IM', date: '', given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false },
  { period: 'Day 3', route: 'IM', date: '', given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false },
  { period: 'Day 7', route: 'IM', date: '', given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false },
  { period: 'Day 28', route: '', date: '', given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false },
  { period: 'Booster 1', route: '', date: '', given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false },
  { period: 'Booster 2', route: '', date: '', given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false },
];

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
  const [doses, setDoses] = useState<VaccinationDose[]>(createInitialDoses());
  const [additionalMeds, setAdditionalMeds] = useState<AdditionalMeds>({
    erig: false,
    tt: false,
    ats: false,
  });
  const [icdCode, setIcdCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [availableVaccineTypes, setAvailableVaccineTypes] = useState<string[]>([]);
  const [vaccinePresets, setVaccinePresets] = useState<VaccineTypePreset[]>([]);
  const [fifoErrors, setFifoErrors] = useState<Record<string, string>>({});
  const [inventorySetupMessage, setInventorySetupMessage] = useState('');

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
        ...INITIAL_FORM_DATA,
        ...prev,
        patient_name: `${entry.patient.last_name}, ${entry.patient.first_name} ${entry.patient.middle_name || ''}`.trim(),
        age: String(entry.patient.age || ''),
        date_of_birth: formatDateForInput(entry.patient.date_of_birth),
        address: entry.patient.address || '',
        sex: entry.patient.gender === 'M' ? 'male' : entry.patient.gender === 'F' ? 'female' : '',
        philhealth_pin: isMember ? formatPhilHealthNumber(rawPin) : '',
        philhealth_type: (rawType === 'member' || rawType === 'dependent') ? rawType : '',
      }));
      setDoses(createInitialDoses());
      setFifoErrors({});
      setError('');

      void loadInventoryOptions();
      void loadPatientAppointments();
      void loadPatientIncidentData();
      void loadExistingVaccinationRecords();
    }
  }, [open, entry]);

  const loadInventoryOptions = async () => {
    try {
      const [names, presets] = await Promise.all([
        getVaccineNames(),
        getVaccinePresets(),
      ]);
      setAvailableVaccineTypes(Array.isArray(names) ? names : []);
      setVaccinePresets(Array.isArray(presets) ? presets : []);
      setInventorySetupMessage('');
    } catch {
      setAvailableVaccineTypes([]);
      setVaccinePresets([]);
      setInventorySetupMessage('Could not load vaccine stock rules. Make sure inventory and vaccine types are set up before recording administered doses.');
    }
  };

  const extractGivenBy = (remarks?: string | null, administeredByName?: string | null) => {
    const match = remarks?.match(/Given by:\s*([^|]+)/i);
    if (match?.[1]) return match[1].trim();
    return administeredByName || '';
  };

  const loadExistingVaccinationRecords = async () => {
    if (!entry?.patient?.patient_id) return;

    try {
      const response = await api.get(`/vaccination-records/patient/${entry.patient.patient_id}`);
      const records: ExistingVaccinationRecord[] = response.data?.vaccination_records || [];

      setDoses((prevDoses) => prevDoses.map((dose) => {
        const record = records.find((item) => DOSE_NUMBER_TO_PERIOD[item.dose_number] === dose.period);
        if (!record) return dose;

        return {
          ...dose,
          route: record.route || dose.route,
          date: formatDateForInput(record.treatment_date),
          given_by: extractGivenBy(record.remarks, record.administeredBy?.name),
          signature: record.signature || '',
          vaccine_type: record.vaccine_brand || record.vaccine_generic || '',
          inventory_units_used: record.inventory_units_used ? String(record.inventory_units_used) : '1',
          batch_number: record.batch_no || '',
          expiration_date: record.expiration_date ? formatDateForInput(record.expiration_date) : '',
          available_stock: undefined,
          inventory_linked: Boolean(record.inventory_id),
        };
      }));
    } catch {
      // Keep form usable even if historical records fail to load.
    }
  };

  const loadPatientIncidentData = async () => {
    if (!entry?.patient?.patient_id) return;

    try {
      const res = await api.get(`/tagoloan-treatment-cards/patient/${entry.patient.patient_id}`);
      const bite = res.data?.bite_incident;
      const card = res.data?.existing_card;

      if (bite || card) {
        const mode = card?.mode_of_exposure || bite?.mode_of_exposure || '';
        const bodyPart = card?.body_part_exposed || bite?.body_part_exposed || '';
        const animal = card?.animal_type || bite?.animal_type || '';
        const animalOther = card?.animal_type_others || bite?.animal_type_others || '';

        setFormData(prev => ({
          ...prev,
          registry_no: prev.registry_no || card?.registry_no || bite?.case_number || '',
          hospital_no: prev.hospital_no || card?.hospital_no || '',
          referred_by: prev.referred_by || card?.referred_by || bite?.referred_from || '',
          exposure_category: card?.exposure_category || prev.exposure_category || '',
          date_of_exposure: formatDateForInput(card?.card_date || bite?.bite_date) || prev.date_of_exposure,
          place_of_exposure: bite?.bite_place || prev.place_of_exposure,
          mode_of_exposure: {
            nibbling_uncovered: mode === 'nibbling_uncovered_skin',
            nibbling_wounded: mode === 'nibbling_broken_skin',
            scratch_abrasion: mode === 'scratch_abrasion',
            transdermal_bite: mode === 'transdermal_bite',
            handling_ingestion: mode === 'handling_ingestion_raw_meat',
          },
          body_part_affected: {
            head_neck: bodyPart === 'head_neck',
            other_parts: bodyPart === 'other_parts',
            na_ingestion: bodyPart === 'na_ingestion',
          },
          animal_type: animal.toLowerCase() === 'dog' ? 'dog' : animal ? 'other' : prev.animal_type,
          animal_type_other: animalOther || (animal.toLowerCase() !== 'dog' ? animal : ''),
          past_history_bite: card?.past_bite_history ? 'yes' : card ? 'no' : prev.past_history_bite,
          pep_completed: card?.past_pep_completed ? 'yes' : card ? 'no' : prev.pep_completed,
        }));
      }
    } catch (err) {
      console.error('Failed to load patient incident data:', err);
    }
  };

  const loadPatientAppointments = async () => {
    if (!entry?.patient?.patient_id) return;

    try {
      const response = await api.get(`/appointments?patient_id=${entry.patient.patient_id}&status=scheduled`);
      const appointments = response.data.data || [];

      // Pre-fill doses with scheduled appointment dates
      setDoses(prevDoses => {
        return prevDoses.map(dose => {
          const doseNumber = PERIOD_TO_DOSE_NUMBER[dose.period];
          const appointment = appointments.find((a: { dose_number?: number; appointment_date?: string }) => a.dose_number === doseNumber);

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

  const findPreset = (vaccineType: string) => vaccinePresets.find((preset) => preset.vaccine_name === vaccineType);

  const getSuggestedWholeUnits = (vaccineType: string) => {
    const rawValue = Number(findPreset(vaccineType)?.regimen_units_per_patient ?? 1);
    if (Number.isInteger(rawValue) && rawValue >= 1) {
      return String(rawValue);
    }
    return '1';
  };

  const handleDoseChange = (index: number, field: keyof VaccinationDose, value: string | boolean) => {
    setDoses(prev => prev.map((dose, i) => (i === index ? { ...dose, [field]: value } : dose)));
  };

  const handleDoseVaccineTypeChange = async (index: number, vaccineType: string) => {
    const selectedDose = doses[index];
    if (!selectedDose) return;

    setFifoErrors(prev => ({ ...prev, [selectedDose.period]: '' }));

    const suggestedUnits = vaccineType ? getSuggestedWholeUnits(vaccineType) : '1';

    setDoses(prev => prev.map((dose, i) => (
      i === index
        ? {
            ...dose,
            vaccine_type: vaccineType,
            batch_number: dose.inventory_linked ? dose.batch_number : '',
            expiration_date: dose.inventory_linked ? dose.expiration_date : '',
            available_stock: dose.inventory_linked ? dose.available_stock : undefined,
            is_open_vial: dose.inventory_linked ? dose.is_open_vial : false,
            next_dose_index: dose.inventory_linked ? dose.next_dose_index : undefined,
            total_doses: dose.inventory_linked ? dose.total_doses : undefined,
            inventory_units_used: dose.inventory_linked ? dose.inventory_units_used : suggestedUnits,
          }
        : dose
    )));

    if (!vaccineType || selectedDose.inventory_linked) {
      return;
    }

    try {
      const response = await getNextFifoBatch(vaccineType);
      const fifoBatch = response.fifo_batch;
      const isOpenVial = Boolean(response.is_open_vial);
      const nextDoseIndex = response.next_dose_index ?? 1;
      const totalDoses = response.total_doses ?? 1;
      const unitsToDeduct = response.units_to_deduct !== undefined ? String(response.units_to_deduct) : (isOpenVial ? '0' : '1');

      setDoses(prev => prev.map((dose, i) => (
        i === index
          ? {
              ...dose,
              batch_number: fifoBatch.batch_number,
              expiration_date: fifoBatch.expiration_date ? formatDateForInput(fifoBatch.expiration_date) : '',
              available_stock: fifoBatch.current_quantity,
              is_open_vial: isOpenVial,
              next_dose_index: nextDoseIndex,
              total_doses: totalDoses,
              inventory_units_used: unitsToDeduct,
            }
          : dose
      )));
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setDoses(prev => prev.map((dose, i) => (
        i === index
          ? { ...dose, batch_number: '', expiration_date: '', available_stock: 0, is_open_vial: false, next_dose_index: undefined, total_doses: undefined }
          : dose
      )));
      setFifoErrors(prev => ({
        ...prev,
        [selectedDose.period]: apiError.response?.data?.message || 'No active FIFO stock batch available for this vaccine type.',
      }));
    }
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

    // Validate doses with recorded dates
    const filledDoses = doses.filter(d => d.date);
    for (const d of filledDoses) {
      if (!d.vaccine_type) {
        setError(`Please select a Vaccine Type for ${d.period} before saving.`);
        return;
      }
      const units = parseInt(d.inventory_units_used, 10);
      if (isNaN(units) || units < 0) {
        setError(`Please enter a valid Stock Units Used (0 for shared open vial, or 1+ for new vial) for ${d.period}.`);
        return;
      }
      if (!d.inventory_linked && fifoErrors[d.period] && units > 0) {
        setError(`Cannot save dose ${d.period}: ${fifoErrors[d.period]}`);
        return;
      }
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
        doses: filledDoses.map(d => ({
          period: d.period,
          route: d.route || null,
          date: d.date,
          given_by: d.given_by || null,
          signature: d.signature || null,
          vaccine_type: d.vaccine_type,
          inventory_units_used: parseInt(d.inventory_units_used, 10) || 1,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            PERIOD EXPOSURE VACCINATION RECORD
          </h3>
          <span style={{ fontSize: 12, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            Automatic FIFO Stock Deduction on Save
          </span>
        </div>

        {inventorySetupMessage && (
          <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, color: '#92400e', fontSize: 12 }}>
            ⚠ {inventorySetupMessage}
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', minWidth: 85 }}>Period</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', minWidth: 95 }}>Route</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', minWidth: 125 }}>Date</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', minWidth: 175 }}>Vaccine Type</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', minWidth: 195 }}>FIFO Batch Preview</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', minWidth: 105 }}>Stock Units</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', minWidth: 120 }}>Given by</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', minWidth: 100 }}>Signature</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#334155', minWidth: 100 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {doses.map((dose, index) => {
                const isFilled = Boolean(dose.date);
                const isLinked = dose.inventory_linked;
                const hasFifoError = Boolean(fifoErrors[dose.period]);

                return (
                  <tr key={dose.period} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isLinked ? '#f0fdf4' : isFilled ? '#f8fafc' : '#ffffff' }}>
                    {/* 1. Period */}
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: isLinked ? '#15803d' : '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isLinked && <span style={{ color: '#16a34a', fontSize: 14 }}>✓</span>}
                        {dose.period}
                      </div>
                    </td>

                    {/* 2. Route */}
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                        {(['ID', 'IM'] as const).map(route => (
                          <label key={route} style={{ display: 'inline-flex', alignItems: 'center', cursor: readOnly || isLinked ? 'default' : 'pointer', fontSize: 12, fontWeight: 500, color: '#475569' }}>
                            <input
                              type="radio"
                              name={`route_${index}`}
                              value={route}
                              checked={dose.route === route}
                              onChange={() => handleDoseChange(index, 'route', route)}
                              disabled={readOnly || isLinked}
                              style={{ marginRight: 4 }}
                            />
                            {route}
                          </label>
                        ))}
                      </div>
                    </td>

                    {/* 3. Date */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="date"
                        value={dose.date}
                        onChange={(e) => handleDoseChange(index, 'date', e.target.value)}
                        disabled={readOnly || isLinked}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: isFilled ? '1px solid #94a3b8' : '1px solid #cbd5e1',
                          borderRadius: 5,
                          fontSize: 12,
                          backgroundColor: isLinked ? '#f1f5f9' : '#ffffff',
                          color: '#0f172a',
                        }}
                      />
                    </td>

                    {/* 4. Vaccine Type Selection */}
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        value={dose.vaccine_type}
                        onChange={(e) => handleDoseVaccineTypeChange(index, e.target.value)}
                        disabled={readOnly || isLinked}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: isFilled && !dose.vaccine_type ? '1px solid #ef4444' : '1px solid #cbd5e1',
                          borderRadius: 5,
                          fontSize: 12,
                          backgroundColor: isLinked ? '#f1f5f9' : '#ffffff',
                          color: dose.vaccine_type ? '#0f172a' : '#64748b',
                          fontWeight: dose.vaccine_type ? 600 : 400,
                        }}
                      >
                        <option value="">— Select Vaccine —</option>
                        {availableVaccineTypes.map((vType) => (
                          <option key={vType} value={vType}>
                            {vType}
                          </option>
                        ))}
                      </select>
                      {isFilled && !dose.vaccine_type && !isLinked && (
                        <div style={{ color: '#dc2626', fontSize: 10, fontWeight: 600, marginTop: 3 }}>
                          Required to deduct stock
                        </div>
                      )}
                    </td>

                    {/* 5. FIFO Batch & Open-Vial Preview */}
                    <td style={{ padding: '8px 10px' }}>
                      {isLinked ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, padding: '4px 8px', backgroundColor: dose.inventory_units_used === '0' ? '#ecfeff' : '#dcfce7', border: dose.inventory_units_used === '0' ? '1px solid #a5f3fc' : '1px solid #86efac', borderRadius: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: dose.inventory_units_used === '0' ? '#0e7490' : '#15803d' }}>
                            ✓ Batch: {dose.batch_number || 'Linked'} {dose.inventory_units_used === '0' ? '(Shared Vial)' : `(${dose.inventory_units_used} deducted)`}
                          </span>
                          {dose.expiration_date && (
                            <span style={{ fontSize: 10, color: dose.inventory_units_used === '0' ? '#155e75' : '#166534' }}>
                              Exp: {dose.expiration_date}
                            </span>
                          )}
                        </div>
                      ) : dose.vaccine_type ? (
                        dose.batch_number ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 8px', backgroundColor: dose.is_open_vial ? '#ecfeff' : '#eff6ff', border: dose.is_open_vial ? '1px solid #a5f3fc' : '1px solid #bfdbfe', borderRadius: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: dose.is_open_vial ? '#0e7490' : '#1e40af' }}>
                                {dose.is_open_vial ? `🟢 Open Vial (Dose ${dose.next_dose_index} of ${dose.total_doses})` : `📦 Opening New Vial (Dose 1 of ${dose.total_doses || 1})`}
                              </span>
                              {dose.available_stock !== undefined && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: dose.available_stock > 5 ? '#059669' : '#d97706' }}>
                                  {dose.available_stock} in stock
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
                              <span>Batch: {dose.batch_number} {dose.expiration_date ? `• Exp: ${dose.expiration_date}` : ''}</span>
                              <span style={{ color: dose.is_open_vial ? '#0891b2' : '#1d4ed8', fontWeight: 600 }}>
                                {dose.is_open_vial ? '0 vials deducted' : '1 vial deducted'}
                              </span>
                            </div>
                          </div>
                        ) : hasFifoError ? (
                          <div style={{ padding: '4px 8px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', fontSize: 11, fontWeight: 600 }}>
                            ⚠ Out of Stock / No FIFO Batch
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                            Fetching FIFO allocation...
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                          Select vaccine to preview
                        </span>
                      )}
                    </td>

                    {/* 6. Automated Stock Allocation */}
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {isLinked ? (
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, backgroundColor: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 600 }}>
                          {dose.inventory_units_used === '0' ? 'Shared Vial' : `${dose.inventory_units_used} vial(s)`}
                        </span>
                      ) : dose.vaccine_type && dose.batch_number ? (
                        dose.is_open_vial ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 5, backgroundColor: '#cffafe', color: '#0e7490', fontSize: 10, fontWeight: 700 }}>
                              🤝 Auto-Shared
                            </span>
                            <span style={{ fontSize: 10, color: '#0891b2', fontWeight: 600 }}>0 stock</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 5, backgroundColor: '#dbeafe', color: '#1e40af', fontSize: 10, fontWeight: 700 }}>
                              📦 Auto-New
                            </span>
                            <span style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 600 }}>1 vial</span>
                          </div>
                        )
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* 7. Given by */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        value={dose.given_by}
                        onChange={(e) => handleDoseChange(index, 'given_by', e.target.value)}
                        placeholder="Nurse name"
                        disabled={readOnly || isLinked}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 5,
                          fontSize: 12,
                          backgroundColor: isLinked ? '#f1f5f9' : '#ffffff',
                        }}
                      />
                    </td>

                    {/* 8. Signature */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        value={dose.signature}
                        onChange={(e) => handleDoseChange(index, 'signature', e.target.value)}
                        placeholder="Initial"
                        disabled={readOnly || isLinked}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 5,
                          fontSize: 12,
                          backgroundColor: isLinked ? '#f1f5f9' : '#ffffff',
                        }}
                      />
                    </td>

                    {/* 9. Status Pill */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {isLinked ? (
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, backgroundColor: dose.inventory_units_used === '0' ? '#cffafe' : '#dcfce7', color: dose.inventory_units_used === '0' ? '#0e7490' : '#15803d', fontSize: 10, fontWeight: 700 }}>
                          {dose.inventory_units_used === '0' ? 'Shared Dose' : 'Administered'}
                        </span>
                      ) : isFilled ? (
                        dose.vaccine_type && dose.batch_number ? (
                          dose.is_open_vial ? (
                            <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, backgroundColor: '#cffafe', color: '#0891b2', fontSize: 10, fontWeight: 700 }}>
                              Auto-Shared ({dose.next_dose_index}/{dose.total_doses})
                            </span>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, backgroundColor: '#dbeafe', color: '#1e40af', fontSize: 10, fontWeight: 700 }}>
                              Auto-New Vial (1/{dose.total_doses || 1})
                            </span>
                          )
                        ) : (
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 10, fontWeight: 700 }}>
                            Missing Stock Info
                          </span>
                        )
                      ) : (
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, backgroundColor: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 500 }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
