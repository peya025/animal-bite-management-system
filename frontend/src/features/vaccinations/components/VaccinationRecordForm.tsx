import { useEffect, useState } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { formatPhilHealthNumber } from '../../../shared/utils';
import {
  getNextFifoBatch,
  getVaccineNames,
  getVaccinePresets,
} from '../../inventory/services/vaccineInventoryService';
import type { VaccineTypePreset } from '../../inventory/types';
import DohTransferSlipModal from './DohTransferSlipModal';
import {
  useAddressLocation,
} from '../../patients/hooks/useAddressLocation';
import { useFormDraft } from '../../../shared/hooks/useFormDraft';
import DraftStatusBadge from '../../../shared/components/DraftStatusBadge';

const FORM3_ANIMAL_SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'other', label: 'Other' },
] as const;

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
    upper_extremities: boolean;
    lower_extremities: boolean;
    trunk_torso: boolean;
    multiple_sites: boolean;
    other_parts: boolean;
    na_ingestion: boolean;
  };
  body_part_affected_text: string;
  animal_type: string;
  animal_type_other: string;
  past_history_bite: 'yes' | 'no' | '';
  past_bite_dates: string;
  pep_completed: 'yes' | 'no' | '';
}

interface VaccinationDose {
  period: string;
  route: 'ID' | 'IM' | '';
  date: string;
  ideal_date?: string;
  schedule_drift_days?: number;
  schedule_adjustment_reason?: string;
  given_by: string;
  license_no?: string;
  signature: string;
  signature_path?: string;
  vaccine_type: string;
  inventory_units_used: string;
  batch_number: string;
  expiration_date?: string;
  available_stock?: number;
  is_open_vial?: boolean;
  next_dose_index?: number;
  total_doses?: number;
  inventory_linked: boolean;
  is_completed?: boolean;
  is_external?: boolean;
  external_facility_name?: string;
}

interface ExistingVaccinationRecord {
  treatment_id: number;
  dose_number: number;
  status?: string | null;
  route?: 'ID' | 'IM' | null;
  treatment_date?: string | null;
  scheduled_date?: string | null;
  vaccine_brand?: string | null;
  vaccine_generic?: string | null;
  batch_no?: string | null;
  expiration_date?: string | null;
  inventory_id?: number | null;
  inventory_units_used?: number | null;
  signature?: string | null;
  remarks?: string | null;
  administered_by?: {
    id?: number;
    name?: string | null;
    professional_license_no?: string | null;
    signature_path?: string | null;
  } | number | null;
  administeredBy?: {
    id?: number;
    name?: string | null;
    professional_license_no?: string | null;
    signature_path?: string | null;
  } | null;
  is_external?: boolean;
  external_facility_name?: string | null;
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

const DOSE_DAY_OFFSETS: Record<string, number> = {
  'Day 0': 0,
  'Day 3': 3,
  'Day 7': 7,
  'Day 28': 28,
  'Booster 1': 90,
  'Booster 2': 365,
};

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function getLoggedInStaffInfo(): { name: string; signature: string } {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return { name: '', signature: '' };
    const u = JSON.parse(raw);
    const name = u.name || '';
    const signature = name
      ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase()
      : '';
    return { name, signature };
  } catch {
    return { name: '', signature: '' };
  }
}

const addDaysToDate = (baseDateStr: string, days: number): string => {
  if (!baseDateStr) return '';
  const clean = baseDateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d + days);
  if (isNaN(date.getTime())) return '';
  const rY = date.getFullYear();
  const rM = String(date.getMonth() + 1).padStart(2, '0');
  const rD = String(date.getDate()).padStart(2, '0');
  return `${rY}-${rM}-${rD}`;
};

/**
 * Shifts a date string forward to the next clinic open day (Mon–Fri).
 * Mirrors backend ClinicScheduleService: Sat → Mon (+2d), Sun → Mon (+1d).
 * Returns the adjusted date string and how many days were drifted.
 */
const shiftToOpenDay = (dateStr: string): { date: string; driftDays: number } => {
  if (!dateStr) return { date: dateStr, driftDays: 0 };
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return { date: dateStr, driftDays: 0 };
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);
  if (isNaN(date.getTime())) return { date: dateStr, driftDays: 0 };
  let drift = 0;
  // 0 = Sunday → +1 to Monday; 6 = Saturday → +2 to Monday
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
    drift++;
  }
  const rY = date.getFullYear();
  const rM = String(date.getMonth() + 1).padStart(2, '0');
  const rD = String(date.getDate()).padStart(2, '0');
  return { date: `${rY}-${rM}-${rD}`, driftDays: drift };
};

/**
 * Returns the raw ideal date (no schedule adjustment) for a dose offset.
 */
const idealDoseDate = (baseDateStr: string, days: number): string => addDaysToDate(baseDateStr, days);

/**
 * Returns the clinic-schedule-adjusted date for a dose offset, plus drift metadata.
 */
const scheduledDoseDate = (baseDateStr: string, days: number): { date: string; ideal_date: string; schedule_drift_days: number; schedule_adjustment_reason?: string } => {
  const ideal = idealDoseDate(baseDateStr, days);
  const { date, driftDays } = shiftToOpenDay(ideal);
  return {
    date,
    ideal_date: ideal,
    schedule_drift_days: driftDays,
    schedule_adjustment_reason: driftDays > 0 ? `Shifted +${driftDays}d — clinic closed on weekend` : undefined,
  };
};

const calculateDoseDates = (baseDateStr: string, currentDoses: VaccinationDose[]): VaccinationDose[] => {
  if (!baseDateStr) return currentDoses;
  return currentDoses.map((dose) => {
    if (dose.is_completed || dose.inventory_linked) return dose;
    const offset = DOSE_DAY_OFFSETS[dose.period];
    if (offset !== undefined) {
      // Day 0 is today — no shift needed; follow-up doses get schedule drift applied
      if (offset === 0) {
        return { ...dose, date: baseDateStr, ideal_date: baseDateStr, schedule_drift_days: 0 };
      }
      const { date, ideal_date, schedule_drift_days, schedule_adjustment_reason } = scheduledDoseDate(baseDateStr, offset);
      return { ...dose, date, ideal_date, schedule_drift_days, schedule_adjustment_reason };
    }
    return dose;
  });
};

const createInitialDoses = (baseDate: string = getLocalDateString()): VaccinationDose[] => {
  const d3 = scheduledDoseDate(baseDate, 3);
  const d7 = scheduledDoseDate(baseDate, 7);
  const b1 = scheduledDoseDate(baseDate, 90);
  const b2 = scheduledDoseDate(baseDate, 365);
  return [
    { period: 'Day 0', route: 'IM', date: baseDate, ideal_date: baseDate, schedule_drift_days: 0, given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false, is_external: false, external_facility_name: '' },
    { period: 'Day 3', route: 'IM', ...d3, given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false, is_external: false, external_facility_name: '' },
    { period: 'Day 7', route: 'IM', ...d7, given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false, is_external: false, external_facility_name: '' },
    { period: 'Booster 1', route: '', ...b1, given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false, is_external: false, external_facility_name: '' },
    { period: 'Booster 2', route: '', ...b2, given_by: '', signature: '', vaccine_type: '', inventory_units_used: '1', batch_number: '', expiration_date: '', available_stock: undefined, inventory_linked: false, is_external: false, external_facility_name: '' },
  ];
};

const INITIAL_FORM_DATA: TreatmentFormData = {
  date: getLocalDateString(),
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
  date_treatment_started: '',
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
    upper_extremities: false,
    lower_extremities: false,
    trunk_torso: false,
    multiple_sites: false,
    other_parts: false,
    na_ingestion: false,
  },
  body_part_affected_text: '',
  animal_type: '',
  animal_type_other: '',
  past_history_bite: '',
  past_bite_dates: '',
  pep_completed: '',
};

// Helper function to format date to yyyy-MM-dd in local timezone
const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const str = String(dateString).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str.slice(0, 10);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return str.slice(0, 10);
  }
};

export default function VaccinationRecordForm({ open, entry, onClose, onSave, readOnly = false, inline = false }: VaccinationRecordFormProps) {
  const { user: currentUser } = useAuth();

  // Draft key is scoped to patient + bite episode so each case has an isolated draft
  const vacDraftPatientId = entry?.patient?.patient_id ?? entry?.patient?.id ?? null;
  const vacDraftBiteId = entry?.bite_id ?? entry?.incident?.bite_id ?? entry?.bite_incident?.bite_id ?? entry?.biteIncident?.bite_id ?? null;
  const vacDraftQueueId = entry?.queue_id ?? null;
  const vacDraftKey = open && vacDraftPatientId && !readOnly
    ? `vaccination-${vacDraftPatientId}${vacDraftBiteId ? `-b${vacDraftBiteId}` : ''}${vacDraftQueueId ? `-q${vacDraftQueueId}` : ''}`
    : null;
  const draft = useFormDraft(vacDraftKey);
  // Whether to skip restoring the draft (once-per-open flag, flipped after first restore attempt)
  const draftRestored = useState(false);

  const [formData, setFormData] = useState<TreatmentFormData>(INITIAL_FORM_DATA);

  // ── Place of Exposure address location (same hook as Add Patient) ──────────
  const expLoc = useAddressLocation();

  // Reset the location selector whenever a different patient/episode opens.
  // The saved incident/intake place is loaded afterward; no clinic-wide default
  // should overwrite the actual place of exposure.
  useEffect(() => {
    expLoc.setMunicipality('');
    expLoc.setBarangay('');
    expLoc.setUseManual(false);
    expLoc.setManualMun('');
    expLoc.setManualBrgy('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vacDraftPatientId, vacDraftBiteId]);

  // Sync composed address string → place_of_exposure field (Municipality + Barangay only)
  useEffect(() => {
    // Do not overwrite a saved barangay while municipality options are still
    // hydrating. Commit the composed place only when both values are ready.
    if (expLoc.brgyName && expLoc.munName) {
      setFormData(prev => ({ ...prev, place_of_exposure: `${expLoc.brgyName}, ${expLoc.munName}` }));
    }
  }, [expLoc.munName, expLoc.brgyName]);

  // Synchronize expLoc with the saved incident/intake place.
  useEffect(() => {
    if (!open) {
      expLoc.setMunicipality('');
      expLoc.setBarangay('');
      expLoc.setUseManual(false);
      expLoc.setManualMun('');
      expLoc.setManualBrgy('');
      return;
    }

    if (expLoc.loadingMun) return;

    const rawPlace = (formData.place_of_exposure || '').trim();

    if (rawPlace && !expLoc.municipality && !expLoc.manualMun) {
      const parts = rawPlace.split(',').map(s => s.trim()).filter(Boolean);
      
      const matchedMun = expLoc.municipalities.find(m => 
        parts.some(p => p.toLowerCase() === m.name.toLowerCase() || m.name.toLowerCase().includes(p.toLowerCase()))
      );

      if (matchedMun) {
        expLoc.setMunicipality(matchedMun.code);
      } else if (parts.length > 0) {
        expLoc.setUseManual(true);
        if (parts.length >= 2) {
          expLoc.setManualBrgy(parts[0]);
          expLoc.setManualMun(parts[1]);
        } else {
          expLoc.setManualMun(parts[0]);
        }
      }
    }
  }, [open, expLoc.loadingMun, expLoc.municipalities, formData.place_of_exposure]);

  // When barangays finish loading for selected municipality, match the barangay from place_of_exposure
  useEffect(() => {
    if (!open || expLoc.useManual || !expLoc.barangays.length || expLoc.barangay) return;
    const rawPlace = (formData.place_of_exposure || '').trim();
    if (!rawPlace) return;

    const parts = rawPlace.split(',').map(s => s.trim()).filter(Boolean);
    const matchedBrgy = expLoc.barangays.find(b => 
      parts.some(p => p.toLowerCase() === b.name.toLowerCase() || b.name.toLowerCase().includes(p.toLowerCase()))
    );
    if (matchedBrgy) {
      expLoc.setBarangay(matchedBrgy.code);
    }
  }, [open, expLoc.barangays, expLoc.useManual, formData.place_of_exposure]);
  const [doses, setDoses] = useState<VaccinationDose[]>(createInitialDoses());
  
  // ── Immutability Logic: Lock patient info & exposure fields if ANY dose is completed ──────────
  // NOTE: This only locks for CURRENT incident. Re-exposure creates NEW incident with NEW doses.
  // For new incidents, all doses are is_completed=false, so form stays unlocked.
  const hasCompletedDoseInCurrentIncident = doses.some(dose => dose.is_completed || dose.inventory_linked);
  const isFormLocked = readOnly || hasCompletedDoseInCurrentIncident;
  // The nurse owns Form 3 exposure classification and anatomical details.
  // They lock only after a dose has been administered or in read-only mode.
  const clinicalAssessmentLocked = isFormLocked;
  
  const [showFullSchedule, setShowFullSchedule] = useState(false); // 8.1: expand to show Day 28 + Boosters
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
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<any>(null);
  const [doctorPlanType, setDoctorPlanType] = useState<string>('');
  const [existingRecordsData, setExistingRecordsData] = useState<ExistingVaccinationRecord[]>([]);
  const [isReturningNewBite, setIsReturningNewBite] = useState(false);
  const [manualReExposure, setManualReExposure] = useState(false); // 8.2: staff-flagged re-bite
  const [pastHistoryRecords, setPastHistoryRecords] = useState<ExistingVaccinationRecord[]>([]);
  // Doctor's prescribed vaccine from Form 2 — hard-locks nurse's vaccine dropdown
  const [prescribedVaccineType, setPrescribedVaccineType] = useState('');
  const [latestConsultation, setLatestConsultation] = useState<any>(null);
  const [patientReportedIntake, setPatientReportedIntake] = useState<any>(null);
  const [showHistoricalPEP, setShowHistoricalPEP] = useState(false);

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

      const fullName = pObj.full_name || pObj.name || [pObj.last_name, pObj.first_name].filter(Boolean).join(', ') || '';

      setFormData(prev => ({
        ...INITIAL_FORM_DATA,
        ...prev,
        patient_name: fullName || `${entry.patient.last_name || ''}, ${entry.patient.first_name || ''} ${entry.patient.middle_name || ''}`.trim(),
        age: String(entry.patient.age || ''),
        date_of_birth: formatDateForInput(entry.patient.date_of_birth),
        address: entry.patient.address || '',
        sex: entry.patient.gender === 'M' || entry.patient.gender === 'male' ? 'male' : entry.patient.gender === 'F' || entry.patient.gender === 'female' ? 'female' : '',
        philhealth_pin: isMember ? formatPhilHealthNumber(rawPin) : '',
        philhealth_type: (rawType === 'member' || rawType === 'dependent') ? rawType : '',
      }));
      setDoses(createInitialDoses());
      setFifoErrors({});
      setError('');
      setDoctorPlanType('');

      void loadInventoryOptions();
      void loadAllFormData();
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

  const getAdministeredStaff = (record: ExistingVaccinationRecord) => {
    if (record.administered_by && typeof record.administered_by === 'object') {
      return record.administered_by;
    }
    if (record.administeredBy && typeof record.administeredBy === 'object') {
      return record.administeredBy;
    }
    return null;
  };

  const extractGivenBy = (remarks?: string | null, administeredByName?: string | null) => {
    if (administeredByName && administeredByName.trim()) {
      return administeredByName.trim();
    }
    const match = remarks?.match(/Given by:\s*([^|]+)/i);
    if (match?.[1]) return match[1].trim();
    return '';
  };

  const loadAllFormData = async () => {
    const patientId = entry?.patient?.patient_id || entry?.patient?.id;
    if (!patientId) return;

    try {
      const activeBiteId = entry?.bite_id || entry?.incident?.bite_id || entry?.bite_incident?.bite_id || entry?.biteIncident?.bite_id;
      const biteIdParam = activeBiteId ? `?bite_id=${activeBiteId}` : '';
      const [cardRes, apptRes, vacRes, incidentRes] = await Promise.all([
        api.get(`/tagoloan-treatment-cards/patient/${patientId}${biteIdParam}`).catch(() => null),
        api.get(`/appointments?patient_id=${patientId}&status=scheduled`).catch(() => null),
        api.get(`/vaccination-records/patient/${patientId}${biteIdParam}`).catch(() => null),
        activeBiteId ? api.get(`/cases/${activeBiteId}`).catch(() => null) : Promise.resolve(null),
      ]);

      const isReturning = Boolean(vacRes?.data?.is_returning_new_bite);
      setIsReturningNewBite(isReturning);
      setPastHistoryRecords(vacRes?.data?.past_history_records || []);

      const bite = vacRes?.data?.active_bite_incident || cardRes?.data?.bite_incident || entry?.incident;
      const card = cardRes?.data?.existing_card;
      const intake = cardRes?.data?.patient_reported_intake;
      setPatientReportedIntake(intake || null);
      const consultation = cardRes?.data?.latest_consultation;
      setLatestConsultation(consultation || null);
      setDoctorPlanType(incidentRes?.data?.incident?.treatment_plan?.plan_type || consultation?.treatment_plan || bite?.treatment_plan?.plan_type || '');
      const appointments = apptRes?.data?.data || [];
      const records: ExistingVaccinationRecord[] = vacRes?.data?.vaccination_records || [];

      setCurrentIncident(bite || null);
      setExistingRecordsData(records);

      // Read doctor's prescribed vaccine from treatment record (Form 2 → hard-locks Form 3)
      const doctorPrescribed = consultation?.prescribed_vaccine_type || '';
      setPrescribedVaccineType(doctorPrescribed);

      // 1. Resolve Day 0 and Exposure dates
      const day0Record = records.find((item) => item.dose_number === 0);
      const day0AdministeredDate = formatDateForInput(day0Record?.treatment_date || day0Record?.scheduled_date);
      const cardDate = formatDateForInput(card?.card_date);
      const biteExposureDate = formatDateForInput(bite?.bite_date || intake?.date_of_exposure || intake?.bite_date);

      // Date of Exposure is from bite incident (or fallback to card if any)
      const resolvedExposureDate = biteExposureDate || cardDate || '';

      // Date Treatment Started is from Day 0 dose record, or saved treatment card date, or exposure date, or today for new unsaved forms
      const treatmentStartDate = day0AdministeredDate || cardDate || biteExposureDate || (readOnly ? '' : getLocalDateString());

      // 2. Set Form Metadata
      const mode = card?.mode_of_exposure || bite?.mode_of_exposure || intake?.reported_mode_of_exposure || intake?.exposure_type || '';
      const bodyPart = card?.body_part_exposed || bite?.body_part_exposed || intake?.body_part_group || intake?.body_part_exposed || '';
      const bodyPartDetail = bite?.body_part_detail || bite?.site_number || intake?.body_part_detail || intake?.wound_location || '';
      const animal = card?.animal_type || bite?.animal_type || intake?.animal_species || intake?.animal_type || '';
      const animalOther = card?.animal_type_others || bite?.animal_type_others || intake?.animal_species_other || intake?.animal_type_others || '';
      const resolvedReferredBy = consultation?.referred_by || consultation?.referred_from || card?.referred_by || bite?.referred_from || '';

      // Clinic hospital number configured in Clinic Information
      const clinicRaw = localStorage.getItem('clinicData');
      const clinicHospitalNo = cardRes?.data?.clinic?.hospital_no 
        || (clinicRaw ? JSON.parse(clinicRaw)?.hospital_no : '') 
        || '';

      setFormData(prev => ({
        ...prev,
        registry_no: prev.registry_no || card?.registry_no || bite?.case_number || '',
        hospital_no: card?.hospital_no || clinicHospitalNo || prev.hospital_no || '',
        referred_by: resolvedReferredBy || prev.referred_by || '',
        exposure_category: card?.exposure_category || bite?.exposure_category || prev.exposure_category || '',
        date_of_exposure: resolvedExposureDate || prev.date_of_exposure,
        date_treatment_started: treatmentStartDate || prev.date_treatment_started,
        place_of_exposure: bite?.bite_place || intake?.place_of_exposure || intake?.bite_place || prev.place_of_exposure,
        date: cardDate || day0AdministeredDate || prev.date || getLocalDateString(),
        mode_of_exposure: {
          nibbling_uncovered: mode === 'nibbling_uncovered_skin',
          nibbling_wounded: mode === 'nibbling_broken_skin',
          scratch_abrasion: mode === 'scratch_abrasion',
          transdermal_bite: mode === 'transdermal_bite',
          handling_ingestion: mode === 'handling_ingestion_raw_meat',
        },
        body_part_affected: {
          head_neck:         bodyPart === 'head_neck',
          upper_extremities: bodyPart === 'upper_extremities',
          lower_extremities: bodyPart === 'lower_extremities',
          trunk_torso:       bodyPart === 'trunk_torso',
          multiple_sites:    bodyPart === 'multiple_sites',
          other_parts:       bodyPart === 'other_parts',
          na_ingestion:      bodyPart === 'na_ingestion',
        },
        body_part_affected_text: bodyPartDetail || '',
        animal_type: FORM3_ANIMAL_SPECIES_OPTIONS.some((option) => option.value === animal.toLowerCase())
          ? animal.toLowerCase()
          : animal
            ? 'other'
            : prev.animal_type,
        animal_type_other: animalOther || (animal && !FORM3_ANIMAL_SPECIES_OPTIONS.some((option) => option.value === animal.toLowerCase()) ? animal : ''),
        past_history_bite: card
          ? (card.past_bite_history ? 'yes' : 'no')
          : (['yes', 'no'].includes(intake?.past_bite_history) ? intake.past_bite_history : prev.past_history_bite),
        past_bite_dates: card?.past_bite_dates || intake?.past_bite_dates || prev.past_bite_dates,
        pep_completed: card
          ? (card.past_pep_completed ? 'yes' : 'no')
          : intake?.prior_pep_status === 'completed'
            ? 'yes'
            : intake?.prior_pep_status === 'none'
              ? 'no'
              : prev.pep_completed,
      }));

      // 3. Map Doses cleanly
      const todayStr = getLocalDateString();
      const baseDoseDate = treatmentStartDate || resolvedExposureDate || todayStr;
      const initialDoses = createInitialDoses(baseDoseDate);
      const mappedDoses = initialDoses.map(dose => {
        const doseNumber = PERIOD_TO_DOSE_NUMBER[dose.period];
        const record = records.find((item) => DOSE_NUMBER_TO_PERIOD[item.dose_number] === dose.period);
        const appointment = appointments.find((a: any) => a.dose_number === doseNumber);

        const isCompletedRecord = Boolean(
          record &&
          (record.status === 'completed' || Boolean(record.treatment_date)) &&
          record.status !== 'scheduled'
        );

        if (isCompletedRecord && record) {
          const staff = getAdministeredStaff(record);
          const staffName = staff?.name || extractGivenBy(record.remarks, null) || (record.is_external ? (record.external_facility_name ? `External (${record.external_facility_name})` : 'External Clinic') : 'Staff Nurse');
          const staffLicense = staff?.professional_license_no || '';
          const signaturePath = staff?.signature_path || record.signature || '';

          return {
            ...dose,
            route: record.route || dose.route,
            date: formatDateForInput(record.treatment_date) || dose.date,
            given_by: staffName,
            license_no: staffLicense,
            signature: record.signature || (signaturePath ? 'On File' : ''),
            signature_path: signaturePath,
            vaccine_type: record.vaccine_brand || record.vaccine_generic || '',
            inventory_units_used: (record.inventory_units_used !== null && record.inventory_units_used !== undefined) ? String(record.inventory_units_used) : '1',
            batch_number: record.batch_no || '',
            expiration_date: record.expiration_date ? formatDateForInput(record.expiration_date) : '',
            available_stock: undefined,
            inventory_linked: Boolean(record.inventory_id),
            is_completed: true,
            is_external: Boolean(record.is_external),
            external_facility_name: record.external_facility_name || '',
          };
        }

        if (appointment || (record && record.status === 'scheduled')) {
          const scheduledDate = appointment ? (appointment.appointment_date || appointment.scheduled_date) : record?.scheduled_date;
          return {
            ...dose,
            date: formatDateForInput(scheduledDate) || dose.date,
            ideal_date: appointment?.ideal_date ? formatDateForInput(appointment.ideal_date) : (formatDateForInput(scheduledDate) || undefined),
            schedule_drift_days: appointment?.schedule_drift_days,
            schedule_adjustment_reason: appointment?.schedule_adjustment_reason,
            is_completed: false,
            inventory_linked: false,
            batch_number: '',
            vaccine_type: '',
          };
        }

        return dose;
      });

      // 4. Auto-prepare active follow-up dose (either late or on time) ready to update
      if (!readOnly) {
        const staffInfo = getLoggedInStaffInfo();

        let activeIdx = -1;
        if (entry?.next_appointment?.dose_number !== undefined) {
          activeIdx = mappedDoses.findIndex(d => PERIOD_TO_DOSE_NUMBER[d.period] === entry.next_appointment.dose_number);
        }
        if (activeIdx === -1) {
          activeIdx = mappedDoses.findIndex(d => !d.is_completed && !d.inventory_linked);
        }

        if (activeIdx !== -1) {
          const activeDose = mappedDoses[activeIdx];
          const scheduledDate = activeDose.ideal_date || activeDose.date;
          let driftDays = activeDose.schedule_drift_days ?? 0;

          if (scheduledDate) {
            const schedTime = new Date(scheduledDate.slice(0, 10)).getTime();
            const todayTime = new Date(todayStr).getTime();
            const calcDrift = Math.round((todayTime - schedTime) / (1000 * 60 * 60 * 24));
            if (!isNaN(calcDrift)) driftDays = calcDrift;
          }

          // Prioritize: 1) Doctor's prescription from Form 2, 2) prior dose brand, 3) blank
          const priorWithVaccine = mappedDoses.slice(0, activeIdx).reverse().find(d => Boolean(d.vaccine_type));
          const preferredVaccine = doctorPrescribed || priorWithVaccine?.vaccine_type || '';

          mappedDoses[activeIdx] = {
            ...activeDose,
            date: todayStr, // Administration date is today!
            ideal_date: scheduledDate || activeDose.ideal_date,
            schedule_drift_days: driftDays,
            given_by: currentUser?.name || activeDose.given_by || staffInfo.name || 'Staff Nurse',
            license_no: currentUser?.professional_license_no || '',
            signature: currentUser?.signature_path ? 'On File' : (staffInfo.signature || ''),
            signature_path: currentUser?.signature_path || '',
            vaccine_type: activeDose.vaccine_type || preferredVaccine,
          };

          // If preferred vaccine is available and batch is not yet set, trigger FIFO batch fetch
          if (preferredVaccine && !activeDose.batch_number) {
            void (async () => {
              try {
                const response = await getNextFifoBatch(preferredVaccine);
                if (response?.fifo_batch) {
                  const fifoBatch = response.fifo_batch;
                  const isOpenVial = Boolean(response.is_open_vial);
                  const unitsToDeduct = response.units_to_deduct !== undefined ? String(response.units_to_deduct) : (isOpenVial ? '0' : '1');
                  setDoses(prev => prev.map((d, idx) => (
                    idx === activeIdx && !d.batch_number
                      ? {
                          ...d,
                          batch_number: fifoBatch.batch_number,
                          expiration_date: fifoBatch.expiration_date ? formatDateForInput(fifoBatch.expiration_date) : '',
                          available_stock: fifoBatch.current_quantity,
                          is_open_vial: isOpenVial,
                          next_dose_index: response.next_dose_index ?? 1,
                          total_doses: response.total_doses ?? 1,
                          inventory_units_used: unitsToDeduct,
                        }
                      : d
                  )));
                }
              } catch {
                // Background fetch failed; user can manually select from dropdown
              }
            })();
          }
        }
      }

      setDoses(mappedDoses);
    } catch (err) {
      console.error('Failed to load form data:', err);
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

    if (key === 'date_of_exposure') {
      setFormData(prev => {
        // Only set date_treatment_started if it's currently blank; do NOT overwrite existing saved or chosen date
        const nextTreatmentDate = prev.date_treatment_started || value;
        if (!prev.date_treatment_started && value) {
          setDoses(d => calculateDoseDates(value, d));
        }

        return {
          ...prev,
          date_of_exposure: value,
          date_treatment_started: nextTreatmentDate,
        };
      });
    } else if (key === 'date_treatment_started') {
      setFormData(prev => ({ ...prev, [key]: value }));
      if (value) {
        setDoses(d => calculateDoseDates(value, d));
      }
    } else {
      setFormData(prev => ({ ...prev, [key]: value }));
    }

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
    if (doses[index]?.is_completed || doses[index]?.inventory_linked) return;
    setDoses(prev => {
      const updated = prev.map((dose, i) => {
        if (i === index) {
          const next = { ...dose, [field]: value };
          if (field === 'is_external') {
            if (value === true) {
              next.inventory_units_used = '0';
              next.batch_number = 'External';
            } else {
              next.inventory_units_used = '1';
              next.batch_number = '';
              next.external_facility_name = '';
            }
          }
          return next;
        }
        return dose;
      });
      if (index === 0 && field === 'date' && typeof value === 'string' && value) {
        setFormData(f => ({ ...f, date_treatment_started: value }));
        return calculateDoseDates(value, updated);
      }
      return updated;
    });
  };

  const handleDoseVaccineTypeChange = async (index: number, vaccineType: string) => {
    const selectedDose = doses[index];
    if (!selectedDose || selectedDose.is_completed || selectedDose.inventory_linked) return;

    setFifoErrors(prev => ({ ...prev, [selectedDose.period]: '' }));

    const todayStr = getLocalDateString();
    const suggestedUnits = vaccineType ? getSuggestedWholeUnits(vaccineType) : '1';

    if (selectedDose.is_external) {
      setDoses(prev => prev.map((dose, i) => (
        i === index
          ? {
              ...dose,
              date: dose.date || (vaccineType ? todayStr : ''),
              vaccine_type: vaccineType,
              batch_number: 'External',
              inventory_units_used: '0',
            }
          : dose
      )));
      return;
    }

    setDoses(prev => prev.map((dose, i) => (
      i === index
        ? {
            ...dose,
            date: dose.date || (vaccineType ? todayStr : ''),
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
              date: dose.date || todayStr,
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

  // ── Auto-save draft whenever formData or non-completed dose fields change ───
  // We only draft when the form is actively being edited (not readOnly, not locked).
  // The dependency on formData / doses triggers a debounced write via useFormDraft.
  useEffect(() => {
    if (!open || readOnly || isFormLocked) return;
    const pendingDoses = doses.filter(d => !d.is_completed && !d.inventory_linked);
    draft.saveDraft({ formData, pendingDoses });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, doses]);

  const handleSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

    if (isPhilHealthMember && formData.philhealth_pin && formData.philhealth_pin.replace(/\D/g, '').length !== 12) {
      newFieldErrors.philhealth_pin = 'PhilHealth PIN must be exactly 12 digits.';
    }
    if (!formData.exposure_category) {
      newFieldErrors.exposure_category = 'Please select Exposure Category';
    }
    if (!formData.date_of_exposure) {
      newFieldErrors.date_of_exposure = 'Please enter Date of Exposure';
    } else if (formData.date_of_exposure > today) {
      newFieldErrors.date_of_exposure = 'Date of Exposure cannot be a future date.';
    }
    if (formData.date_treatment_started && formData.date_treatment_started > today) {
      newFieldErrors.date_treatment_started = 'Date Treatment Started cannot be a future date.';
    }
    if (!Object.values(formData.mode_of_exposure).some(Boolean)) {
      newFieldErrors.mode_of_exposure = 'Please select at least one mode of exposure.';
    }
    if (!Object.values(formData.body_part_affected).some(Boolean) && !formData.body_part_affected_text.trim()) {
      newFieldErrors.body_part_affected = 'Please select or specify the affected body part.';
    }
    if (!formData.animal_type) {
      newFieldErrors.animal_type = 'Please select the animal type.';
    } else if (formData.animal_type === 'other' && !formData.animal_type_other.trim()) {
      newFieldErrors.animal_type_other = 'Please specify the other animal.';
    }

    // Validate dose dates — only check doses the nurse is actually submitting now
    // (has vaccine_type + date set, not already completed).
    // Scheduled future rows (Day 3, Day 7) without a vaccine type selected are skipped.
    // NOTE: actual check happens below after filledDoses is computed

    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      const errorList = Object.values(newFieldErrors);
      setError(`Required: ${errorList.join(' • ')}`);

      const fieldOrder = ['philhealth_pin', 'exposure_category', 'date_of_exposure', 'mode_of_exposure', 'body_part_affected', 'animal_type'];
      const firstErrorKey = fieldOrder.find((key) => newFieldErrors[key]);

      if (firstErrorKey) {
        setTimeout(() => {
          const el = document.getElementById(`field-${firstErrorKey}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const scrollParent = el.closest('[class*="Body"]') || el.closest('.fm-body');
            if (scrollParent) {
              const rect = el.getBoundingClientRect();
              const parentRect = scrollParent.getBoundingClientRect();
              if (rect.top < parentRect.top || rect.bottom > parentRect.bottom) {
                scrollParent.scrollBy({ top: rect.top - parentRect.top - 40, behavior: 'smooth' });
              }
            }
            const focusable = el.querySelector('input, select') as HTMLElement;
            if (focusable) {
              focusable.focus({ preventScroll: true });
            }
          }
        }, 50);
      }
      return;
    }

    const patientId = entry?.patient?.patient_id || entry?.patient?.id;

    // Auto-fill today's date for candidate doses with vaccine type selected
    const todayStr = getLocalDateString();
    const candidateDoses = doses.map(d => {
      if (d.vaccine_type && !d.date) {
        return { ...d, date: todayStr };
      }
      return d;
    });

    // Only submit active uncompleted doses being administered today
    const filledDoses = candidateDoses.filter(d => {
      if (d.is_completed || !d.date || !d.vaccine_type) return false;
      // 22.1 — block prerequisite-locked doses from being submitted
      const PREREQ: Record<string, string> = { 'Day 3': 'Day 0', 'Day 7': 'Day 3', 'Day 28': 'Day 7', 'Booster 2': 'Booster 1' };
      const prereqPeriod = PREREQ[d.period];
      if (prereqPeriod) {
        const prereq = doses.find(x => x.period === prereqPeriod);
        if (prereq && !prereq.is_completed && !prereq.inventory_linked) return false;
      }
      return true;
    });
    if (filledDoses.length === 0) {
      setError("Please select a Vaccine Type for today's dose before saving.");
      return;
    }

    // Validate: doses being submitted now cannot have future dates
    const futureDose = filledDoses.find(d => d.date && d.date > todayStr);
    if (futureDose) {
      setError(`${futureDose.period} administration date cannot be a future date.`);
      return;
    }

    for (const d of filledDoses) {
      const units = parseInt(d.inventory_units_used, 10);
      if (isNaN(units) || units < 0) {
        setError(`Please enter valid Stock Units Used (0 for shared open vial, or 1+ for new vial) for ${d.period}.`);
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
        patient_id: patientId,
        queue_id: entry.queue_id,
        ...formData,
        mode_of_exposure: Object.keys(formData.mode_of_exposure).filter(
          key => formData.mode_of_exposure[key as keyof typeof formData.mode_of_exposure]
        ),
        body_part_affected: Object.keys(formData.body_part_affected).filter(
          key => formData.body_part_affected[key as keyof typeof formData.body_part_affected]
        ),
        body_part_detail: formData.body_part_affected_text || null,
        animal_type: formData.animal_type || 'dog',
        animal_type_other: formData.animal_type === 'other' ? formData.animal_type_other : '',
        doses: filledDoses.map(d => ({
          period: d.period,
          route: d.route || null,
          date: d.date || todayStr,
          given_by: currentUser?.name || d.given_by || null,
          signature: currentUser?.signature_path || d.signature || null,
          vaccine_type: d.vaccine_type,
          inventory_units_used: d.is_external ? 0 : (parseInt(d.inventory_units_used, 10) || 0),
          is_external: Boolean(d.is_external),
          external_facility_name: d.external_facility_name || null,
        })),
        bite_id: currentIncident?.bite_id || entry?.bite_id || entry?.incident?.bite_id || entry?.bite_incident?.bite_id || entry?.biteIncident?.bite_id || null,
        episode_type: manualReExposure ? 're_exposure' : (currentIncident?.episode_type || entry?.incident?.episode_type || 'primary'),
        additional_meds: additionalMeds,
        icd_code: icdCode || null,
      });

      onSave();
      draft.clearDraft();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save treatment record');
    } finally {
      setSaving(false);
    }
  };

  if (!entry) return null;

  const isBoosterPlan = doctorPlanType === 'single_booster'
    || doctorPlanType === 'two_dose_booster'
    || currentIncident?.episode_type === 're_exposure'
    || (currentIncident?.episode_number && Number(currentIncident.episode_number) > 1)
    || manualReExposure;
  const orderedDosePeriods = doctorPlanType === 'single_booster'
    ? ['Day 0']
    : (doctorPlanType === 'two_dose_booster' || isBoosterPlan)
      ? ['Day 0', 'Day 3']
      : doctorPlanType === 'full_pep'
        ? ['Day 0', 'Day 3', 'Day 7']
        : null;

  const formContent = (
    <div style={{ padding: inline ? '0' : '24px 32px' }}>
      {/* Lock Alert - Show when form has completed doses */}
      {hasCompletedDoseInCurrentIncident && !readOnly && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
              Patient Information & Exposure Details Locked
            </div>
            <div style={{ fontSize: 12, color: '#78350f' }}>
              These fields cannot be edited because at least one dose has been administered for this incident. Only future doses can be recorded. For re-exposure cases, create a new treatment card.
            </div>
          </div>
        </div>
      )}
      
      {/* SECTION 1: PATIENT & REGISTRATION INFORMATION */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#10b981', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          PATIENT &amp; REGISTRATION INFORMATION
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date</label>
            <input type="date" value={formData.date} onChange={handleFieldChange('date')} disabled={readOnly} max={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? 'var(--bg-secondary, #e8fdf6)' : undefined }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Registry No. <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>(Admin / System Managed)</span>
            </label>
            <input
              type="text"
              value={formData.registry_no || '—'}
              readOnly
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--input-border)',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: '#f3f4f6',
                color: '#374151',
                fontWeight: 600,
                cursor: 'not-allowed',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Hospital No. <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>(Admin Managed)</span>
            </label>
            <input
              type="text"
              value={formData.hospital_no || ''}
              placeholder="Not assigned (Managed in Admin Patient Profile)"
              readOnly
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--input-border)',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: '#f3f4f6',
                color: '#374151',
                fontWeight: formData.hospital_no ? 600 : 400,
                cursor: 'not-allowed',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Referred by
            </label>
            <input
              type="text"
              value={formData.referred_by || ''}
              readOnly
              disabled
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--input-border)',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: 'var(--bg-secondary, #e8fdf6)',
                color: '#374151',
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
              placeholder="— Form 2 Consultation"
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
                border: fieldErrors.philhealth_pin ? '2px solid #ef4444' : !isPhilHealthMember ? '1px dashed #fca5a5' : '1px solid var(--input-border)',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: !isPhilHealthMember ? '#fef2f2' : readOnly ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
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
                border: !isPhilHealthMember ? '1px dashed #fca5a5' : '1px solid var(--input-border)',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: !isPhilHealthMember ? '#fef2f2' : readOnly ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
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
          <input type="text" value={formData.patient_name} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: 'var(--bg-secondary, #f9fafb)', color: '#6b7280' }} placeholder="Last, First Middle" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Age</label>
            <input type="text" value={formData.age} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: 'var(--bg-secondary, #f9fafb)', color: '#6b7280' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date of Birth</label>
            <input type="date" value={formData.date_of_birth} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: 'var(--bg-secondary, #f9fafb)', color: '#6b7280' }} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Address</label>
          <input type="text" value={formData.address} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, backgroundColor: 'var(--bg-secondary, #f9fafb)', color: '#6b7280' }} />
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
                <label key={cat} style={{ display: 'flex', alignItems: 'center', cursor: isFormLocked ? 'default' : 'pointer' }}>
                  <input type="radio" name="exposure_category" value={cat} checked={formData.exposure_category === cat} onChange={handleFieldChange('exposure_category')} disabled={clinicalAssessmentLocked} style={{ marginRight: 6 }} />
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: fieldErrors.date_of_exposure ? '#dc2626' : '#374151', marginBottom: 6 }}>
              Date of Exposure <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="date" 
              value={formData.date_of_exposure} 
              onChange={handleFieldChange('date_of_exposure')} 
              max={new Date().toISOString().split('T')[0]}
              disabled={clinicalAssessmentLocked}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: fieldErrors.date_of_exposure ? '2px solid #ef4444' : '1px solid var(--input-border)', 
                borderRadius: 6, 
                fontSize: 13, 
                backgroundColor: readOnly ? '#f3f4f6' : undefined,
                cursor: readOnly ? 'not-allowed' : undefined,
              }} 
            />
            {fieldErrors.date_of_exposure && (
              <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 6 }}>⚠ {fieldErrors.date_of_exposure}</div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Date Treatment Started
            </label>
            <input 
              type="date" 
              value={formData.date_treatment_started} 
              onChange={handleFieldChange('date_treatment_started')} 
              max={new Date().toISOString().split('T')[0]}
              disabled={readOnly} 
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: '1px solid var(--input-border)', 
                borderRadius: 6, 
                fontSize: 13, 
                backgroundColor: readOnly ? '#f3f4f6' : undefined,
                cursor: readOnly ? 'not-allowed' : undefined,
              }} 
            />
          </div>
        </div>
        <div>
          {/* ── Label row: "Place of Exposure" label + toggle button side by side ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Place of Exposure</label>
            {false && !readOnly && (
              <button
                type="button"
                onClick={() => expLoc.setUseManual(!expLoc.useManual)}
                style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: 600,
                  background: '#f8fbff', color: '#475569',
                  border: '1px solid #cfd8e3', borderRadius: 10,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  flexShrink: 0, whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {expLoc.useManual ? (
                    <>
                      <path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/>
                      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/>
                      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/>
                      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
                    </>
                  ) : (
                    <>
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/>
                    </>
                  )}
                </svg>
                {expLoc.useManual ? 'Switch to Dropdown' : 'Switch to Manual Typing'}
              </button>
            )}
          </div>

          {/* ── Same dropdown UI as Add Patient residential address ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* API error warning */}
            {expLoc.apiError && !expLoc.useManual && (
              <div style={{ padding: '6px 10px', background: '#fef9c3', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                ⚠ Address API unavailable. <button type="button" onClick={() => expLoc.setUseManual(true)} style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}>Switch to manual entry</button>
              </div>
            )}

            {expLoc.useManual ? (
              /* ── Manual free-text mode ── */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>City / Municipality</label>
                  <input
                    type="text"
                    value={expLoc.manualMun}
                    onChange={e => expLoc.setManualMun(e.target.value)}
                    disabled={clinicalAssessmentLocked}
                    placeholder="Enter municipality"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', backgroundColor: readOnly ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Barangay</label>
                  <input
                    type="text"
                    value={expLoc.manualBrgy}
                    onChange={e => expLoc.setManualBrgy(e.target.value)}
                    disabled={clinicalAssessmentLocked}
                    placeholder="Enter barangay"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', backgroundColor: readOnly ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)' }}
                  />
                </div>
              </div>
            ) : (
              /* ── Dropdown mode (same as Add Patient) ── */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>City / Municipality *</label>
                  <select
                    value={expLoc.municipality}
                    onChange={e => expLoc.setMunicipality(e.target.value)}
                    disabled={clinicalAssessmentLocked || expLoc.loadingMun}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)', boxSizing: 'border-box' }}
                  >
                    <option value="">{expLoc.loadingMun ? 'Loading…' : '— Select —'}</option>
                    {expLoc.municipalities.map(m => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Barangay *</label>
                  <select
                    value={expLoc.barangay}
                    onChange={e => expLoc.setBarangay(e.target.value)}
                    disabled={clinicalAssessmentLocked || !expLoc.municipality || expLoc.loadingBrgy}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: 13, backgroundColor: (readOnly || !expLoc.municipality) ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)', boxSizing: 'border-box' }}
                  >
                    <option value="">{expLoc.loadingBrgy ? 'Loading…' : '— Select —'}</option>
                    {expLoc.barangays.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Read-only display when form is read-only and value came from bite record */}
            {readOnly && !expLoc.full && formData.place_of_exposure && (
              <div style={{ padding: '7px 11px', background: 'var(--bg-secondary, #f9fafb)', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#374151' }}>
                {formData.place_of_exposure}
              </div>
            )}
          </div>
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
                <label key={key} style={{ display: 'flex', alignItems: 'start', cursor: isFormLocked ? 'default' : 'pointer' }}>
                  <input type="checkbox" checked={formData.mode_of_exposure[key as keyof typeof formData.mode_of_exposure]} onChange={handleCheckboxChange('mode_of_exposure', key as any)} disabled={clinicalAssessmentLocked} style={{ marginRight: 8, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>2. Body Part Affected / Exposed</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'start', cursor: isFormLocked ? 'default' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.body_part_affected.head_neck} 
                  onChange={handleCheckboxChange('body_part_affected', 'head_neck')} 
                  disabled={clinicalAssessmentLocked}
                  style={{ marginRight: 8, marginTop: 2 }} 
                />
                <span style={{ fontSize: 13, color: '#374151' }}>Head & Neck</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'start', cursor: isFormLocked ? 'default' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.body_part_affected.upper_extremities} 
                  onChange={handleCheckboxChange('body_part_affected', 'upper_extremities')} 
                  disabled={clinicalAssessmentLocked}
                  style={{ marginRight: 8, marginTop: 2 }} 
                />
                <span style={{ fontSize: 13, color: '#374151' }}>Upper Extremities (Arm/Hand)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'start', cursor: isFormLocked ? 'default' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.body_part_affected.lower_extremities} 
                  onChange={handleCheckboxChange('body_part_affected', 'lower_extremities')} 
                  disabled={clinicalAssessmentLocked}
                  style={{ marginRight: 8, marginTop: 2 }} 
                />
                <span style={{ fontSize: 13, color: '#374151' }}>Lower Extremities (Leg/Foot)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'start', cursor: isFormLocked ? 'default' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.body_part_affected.trunk_torso} 
                  onChange={handleCheckboxChange('body_part_affected', 'trunk_torso')} 
                  disabled={clinicalAssessmentLocked}
                  style={{ marginRight: 8, marginTop: 2 }} 
                />
                <span style={{ fontSize: 13, color: '#374151' }}>Trunk / Torso</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'start', cursor: isFormLocked ? 'default' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.body_part_affected.multiple_sites} 
                  onChange={handleCheckboxChange('body_part_affected', 'multiple_sites')} 
                  disabled={clinicalAssessmentLocked}
                  style={{ marginRight: 8, marginTop: 2 }} 
                />
                <span style={{ fontSize: 13, color: '#374151' }}>Multiple Sites</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'start', cursor: isFormLocked ? 'default' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.body_part_affected.na_ingestion} 
                  onChange={handleCheckboxChange('body_part_affected', 'na_ingestion')} 
                  disabled={clinicalAssessmentLocked}
                  style={{ marginRight: 8, marginTop: 2 }} 
                />
                <span style={{ fontSize: 13, color: '#374151' }}>N/A (Ingestion)</span>
              </label>
            </div>
            <input
                type="text"
                value={formData.body_part_affected_text}
                onChange={handleFieldChange('body_part_affected_text')}
                placeholder="Specify exact location (optional)"
                disabled={clinicalAssessmentLocked}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid var(--input-border)',
                  borderRadius: 4,
                  fontSize: 13,
                  backgroundColor: isFormLocked ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                }}
              />
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>3. Type of Animal</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
              {FORM3_ANIMAL_SPECIES_OPTIONS.map(({ value, label }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input
                    type="radio"
                    name="vr_animal_type"
                    checked={formData.animal_type === value}
                    onChange={() => setFormData((prev) => ({
                      ...prev,
                      animal_type: value,
                      animal_type_other: value === 'other' ? prev.animal_type_other : '',
                    }))}
                    disabled={clinicalAssessmentLocked}
                    style={{ marginRight: 6 }}
                  />
                  <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                </label>
              ))}
              {formData.animal_type === 'other' && (
                <input
                  type="text"
                  value={formData.animal_type_other}
                  onChange={handleFieldChange('animal_type_other')}
                  placeholder="Specify the other animal species"
                  disabled={clinicalAssessmentLocked}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    padding: '6px 10px',
                    border: '1px solid var(--input-border)',
                    borderRadius: 4,
                    fontSize: 13,
                    backgroundColor: readOnly ? 'var(--bg-secondary, #f9fafb)' : undefined,
                  }}
                />
              )}
            </div>
          </div>
        </div>
        {patientReportedIntake && (
          <p style={{ margin: '12px 0 0', padding: '8px 10px', borderRadius: 6, background: '#eff6ff', color: '#1e40af', fontSize: 11.5 }}>
            Past-bite and PEP answers may be prefilled from the patient-reported mobile intake. Verify them before saving Form 3.
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>4. Past History of animal bite</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['yes', 'no'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', cursor: isFormLocked ? 'default' : 'pointer' }}>
                  <input type="radio" name="past_history_bite" value={v} checked={formData.past_history_bite === v} onChange={handleFieldChange('past_history_bite')} disabled={isFormLocked} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{v}</span>
                </label>
              ))}
            </div>
            {formData.past_history_bite === 'yes' && (
              <input
                type="text"
                value={formData.past_bite_dates}
                onChange={handleFieldChange('past_bite_dates')}
                placeholder="Approximate previous bite date(s)"
                disabled={isFormLocked}
                style={{ width: '100%', marginTop: 10, padding: '7px 10px', border: '1px solid var(--input-border)', borderRadius: 4, fontSize: 13 }}
              />
            )}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Was PEP Immunization completed?</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['yes', 'no'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', cursor: isFormLocked ? 'default' : 'pointer' }}>
                  <input type="radio" name="pep_completed" value={v} checked={formData.pep_completed === v} onChange={handleFieldChange('pep_completed')} disabled={isFormLocked} style={{ marginRight: 6 }} />
                  <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{v}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEPARATE SECTION: DOCTOR FINDINGS & NEW BITE EXPOSURE SUMMARY (BOOSTER / RE-EXPOSURE) ── */}
      {(isBoosterPlan || isReturningNewBite || (currentIncident?.episode_number && Number(currentIncident.episode_number) > 1)) && (
        <div style={{ marginBottom: 28 }}>
          {/* Card 1: Doctor Triage Findings & Clinical Orders */}
          <div style={{
            padding: '18px 20px',
            borderRadius: 12,
            border: '1.5px solid #bfdbfe',
            background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(30, 58, 138, 0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid #dbeafe', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🩺</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#1e40af' }}>
                    Doctor Consultation &amp; Triage Findings (Form 2)
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#475569' }}>
                    Clinical triage vitals and prescribed rabies vaccination regimen from the attending physician.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', backgroundColor: '#dbeafe', padding: '3px 9px', borderRadius: 12 }}>
                  Dr. {latestConsultation?.attending_provider || latestConsultation?.provider_name || 'Attending Physician'}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {latestConsultation?.consultation_date || formData.date}
                </span>
              </div>
            </div>

            {/* Vitals Highlights: Temperature & Blood Pressure */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14, padding: '12px 16px', borderRadius: 8, backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Body Temperature</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <strong style={{ fontSize: 15, color: '#1e293b' }}>
                    {latestConsultation?.temperature ? `${latestConsultation.temperature} °C` : 'Not recorded'}
                  </strong>
                  {latestConsultation?.temperature && (
                    parseFloat(latestConsultation.temperature) >= 38.0 ? (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>High Fever</span>
                    ) : parseFloat(latestConsultation.temperature) >= 37.5 ? (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>Low Grade</span>
                    ) : (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>Afebrile</span>
                    )
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Blood Pressure</span>
                <strong style={{ fontSize: 15, color: '#1e293b', display: 'block', marginTop: 3 }}>
                  {latestConsultation?.blood_pressure ? `${latestConsultation.blood_pressure} mmHg` : '—'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Weight / Height</span>
                <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, display: 'block', marginTop: 4 }}>
                  {latestConsultation?.weight ? `${latestConsultation.weight} kg` : '—'} · {latestConsultation?.height ? `${latestConsultation.height} cm` : '—'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Doctor Prescribed Regimen</span>
                <span style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#4338ca',
                  backgroundColor: '#e0e7ff',
                  padding: '2px 8px',
                  borderRadius: 6,
                  display: 'inline-block',
                  marginTop: 3
                }}>
                  {doctorPlanType === 'two_dose_booster'
                    ? '🛡️ 2-Dose Booster (Day 0, 3)'
                    : doctorPlanType === 'single_booster'
                      ? '🛡️ 1-Dose Booster (Day 0)'
                      : doctorPlanType === 'full_pep'
                        ? 'Full PEP (Day 0, 3, 7)'
                        : 'Re-Exposure Regimen'}
                </span>
              </div>
            </div>

            {/* Doctor Clinical Impression & Orders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, fontSize: 12.5 }}>
              <div style={{ padding: '10px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#334155', display: 'block', marginBottom: 3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Doctor Diagnosis / Clinical Impression:
                </strong>
                <span style={{ color: '#0f172a' }}>
                  {latestConsultation?.diagnosis || 'Animal bite exposure, awaiting clinical impression.'}
                </span>
                {latestConsultation?.chief_complaints && (
                  <div style={{ marginTop: 6, fontSize: 11.5, color: '#64748b' }}>
                    <em>Chief complaint:</em> {latestConsultation.chief_complaints}
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#334155', display: 'block', marginBottom: 3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Prescribed PEP Vaccine Brand:
                </strong>
                <span style={{ fontWeight: 700, color: prescribedVaccineType ? '#15803d' : '#b45309' }}>
                  {prescribedVaccineType ? `💉 ${prescribedVaccineType}` : '⚠️ Follow clinic standard vaccine'}
                </span>
                {latestConsultation?.medication_treatment && (
                  <div style={{ marginTop: 6, fontSize: 11.5, color: '#64748b' }}>
                    <em>Orders:</em> {latestConsultation.medication_treatment}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: New Bite Incident & Exposure Details */}
          <div style={{
            padding: '16px 20px',
            borderRadius: 12,
            border: '1.5px solid #fed7aa',
            background: '#fffaf5',
            boxShadow: '0 2px 6px rgba(234, 88, 12, 0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #ffedd5', paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  New Bite Exposure Details (Episode #{currentIncident?.episode_number || 2})
                </h4>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9a3412', backgroundColor: '#ffedd5', padding: '2px 8px', borderRadius: 10 }}>
                {currentIncident?.episode_type === 're_exposure' ? 'Re-Exposure Case' : 'New Animal Incident'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12.5, color: '#334155' }}>
              <div>
                <span style={{ fontSize: 11, color: '#78350f', fontWeight: 600, display: 'block' }}>EXPOSURE DATE</span>
                <strong>{formData.date_of_exposure || currentIncident?.bite_date || 'Not recorded'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#78350f', fontWeight: 600, display: 'block' }}>INCIDENT LOCATION</span>
                <strong>{formData.place_of_exposure || currentIncident?.bite_place || 'Misamis Oriental'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#78350f', fontWeight: 600, display: 'block' }}>CATEGORY &amp; NATURE</span>
                <strong>Category {formData.exposure_category || currentIncident?.severity || 'II'} · {currentIncident?.exposure_type || 'Bite'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#78350f', fontWeight: 600, display: 'block' }}>ANIMAL INVOLVED</span>
                <strong>
                  {formData.animal_type ? formData.animal_type.toUpperCase() : (currentIncident?.animal_type ? currentIncident.animal_type.toUpperCase() : 'CANINE')}
                  {currentIncident?.animal_status ? ` (${currentIncident.animal_status})` : ''}
                </strong>
              </div>
            </div>

            {(formData.body_part_affected_text || currentIncident?.body_part_exposed || currentIncident?.wound_description) && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #fed7aa', display: 'flex', gap: 16, fontSize: 12, color: '#431407' }}>
                {(formData.body_part_affected_text || currentIncident?.body_part_exposed) && (
                  <div>
                    <strong>Anatomical Site:</strong> {formData.body_part_affected_text || currentIncident?.body_part_exposed}
                  </div>
                )}
                {currentIncident?.wound_description && (
                  <div>
                    <strong>Wound Characteristics:</strong> {currentIncident.wound_description}
                  </div>
                )}
                {currentIncident?.site_washed !== undefined && (
                  <div>
                    <strong>Washed:</strong> {currentIncident.site_washed ? 'Yes (Soap & Water)' : 'No'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: VACCINATION RECORD */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ color: isBoosterPlan ? '#7c3aed' : '#10b981', fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isBoosterPlan ? '🛡️ RE-EXPOSURE BOOSTER VACCINE ADMINISTRATION' : 'PERIOD EXPOSURE VACCINATION RECORD'}
            </h3>
            <span style={{ fontSize: 12, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: isBoosterPlan ? '#7c3aed' : '#10b981' }}></span>
              {isBoosterPlan ? 'Dedicated Episode Booster Table • Historical Records Archived Below' : 'Automatic FIFO Stock Deduction on Save • Cross-Clinic Continuity Supported'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 8.2 — Re-Exposure / Re-Bite toggle */}
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  setManualReExposure(v => !v);
                  // Reset show full schedule when switching modes
                  setShowFullSchedule(false);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  backgroundColor: manualReExposure ? '#fef3c7' : 'var(--card-bg-solid, #ffffff)',
                  border: `1px solid ${manualReExposure ? '#f59e0b' : '#cbd5e1'}`,
                  borderRadius: 6, fontSize: 12, fontWeight: 700,
                  color: manualReExposure ? '#92400e' : '#64748b',
                  cursor: 'pointer',
                }}
                title="Toggle if this is a new bite on a previously vaccinated patient (DOH 2-dose booster protocol)"
              >
                {manualReExposure ? '🔄 Re-Bite Active' : '🔄 Re-Bite / Re-Exposure?'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setTransferModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                backgroundColor: 'var(--card-bg-solid, #ffffff)',
                border: '1px solid var(--border-glow, #cbd5e1)',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-h, #1e293b)',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              📄 Transfer Out / Referral Slip
            </button>
          </div>
        </div>

        {isBoosterPlan ? (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            backgroundColor: '#f5f3ff',
            border: '1.5px solid #c4b5fd',
            borderRadius: 8,
            color: '#4c1d95',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {doctorPlanType === 'single_booster' ? 'Single-Dose Booster Regimen' : 'Two-Dose Booster Regimen (Day 0 & Day 3)'}
                </div>
                <div style={{ fontSize: 12, color: '#5b21b6', marginTop: 1 }}>
                  {doctorPlanType === 'single_booster'
                    ? 'Doctor ordered Day 0 booster only. Administer dose below and complete consultation.'
                    : 'Doctor ordered Day 0 and Day 3 boosters per re-exposure management guidelines.'}
                </div>
              </div>
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#5b21b6',
              background: '#ede9fe',
              padding: '4px 10px',
              borderRadius: 14,
              border: '1px solid #ddd6fe'
            }}>
              Episode #{currentIncident?.episode_number || 2} Active
            </span>
          </div>
        ) : (manualReExposure || currentIncident?.episode_type === 're_exposure' || entry?.episode_type === 're_exposure') && (
          <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--border-glow, #a7f3d0)', borderRadius: 6, color: 'var(--text-h, #065f46)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛡️</span>
            <span><strong>Legacy re-exposure record</strong>: This historical schedule predates the Doctor-plan workflow. Follow its documented order; all new exposures require a Doctor decision before any dose is recorded.</span>
          </div>
        )}

        {inventorySetupMessage && (
          <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--border-glow, #fde68a)', borderRadius: 6, color: 'var(--text-b, #92400e)', fontSize: 12 }}>
            ⚠ {inventorySetupMessage}
          </div>
        )}

        {isReturningNewBite && pastHistoryRecords.length > 0 && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid var(--border-glow, #a7f3d0)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h, #065f46)' }}>
                Prior Immunization History Verified ({pastHistoryRecords.filter(r => r.status === 'completed').length} completed doses on file)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-b, #047857)', marginTop: 2 }}>
                Patient is returning with a new animal bite exposure. A fresh vaccination regimen has been initiated — doses below are open for recording today's treatment.
              </div>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid var(--border-glow, #e5e7eb)', borderRadius: 8, backgroundColor: 'var(--card-bg-solid, #ffffff)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--table-header-bg, #f8fafc)', borderBottom: '2px solid var(--border-glow, #e2e8f0)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 85 }}>Period</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 95 }}>Route</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 125 }}>Date</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 185 }}>Vaccine Type & Source</th>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 195 }}>FIFO Batch Preview</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 105 }}>Stock Units</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 155 }}>Given by / Attended by</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 110 }}>Signature</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-m, #334155)', minWidth: 100 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(orderedDosePeriods
                ? doses.filter(d => orderedDosePeriods.includes(d.period))
                : (manualReExposure || currentIncident?.episode_type === 're_exposure' || entry?.episode_type === 're_exposure'
                ? doses.filter(d => ['Day 0', 'Day 3'].includes(d.period))
                : showFullSchedule
                  ? doses
                  : doses.filter(d => ['Day 0', 'Day 3', 'Day 7'].includes(d.period)))
              ).map((dose, index) => {
                const isFilled = Boolean(dose.date);
                const isLinked = dose.inventory_linked;
                const isCompleted = Boolean(dose.is_completed || isLinked);

                // 22.1 — Prerequisite dose lock
                // Determine which dose must be completed before this one can be recorded.
                // Chain: Day 3 → requires Day 0 | Day 7 → requires Day 3 | Day 28 → requires Day 7
                const PREREQ: Record<string, string> = {
                  'Day 3':     'Day 0',
                  'Day 7':     'Day 3',
                  'Day 28':    'Day 7',
                  'Booster 2': 'Booster 1',
                };
                const prereqPeriod = PREREQ[dose.period];
                const prereqDose = prereqPeriod ? doses.find(d => d.period === prereqPeriod) : undefined;
                const isPrerequisiteLocked =
                  !isCompleted &&
                  !!prereqDose &&
                  !prereqDose.is_completed &&
                  !prereqDose.inventory_linked;

                const isLocked = readOnly || isCompleted || isPrerequisiteLocked;
                const hasFifoError = Boolean(fifoErrors[dose.period]);
                const candidateList = orderedDosePeriods
                  ? doses.filter(d => orderedDosePeriods.includes(d.period))
                  : (manualReExposure || currentIncident?.episode_type === 're_exposure' || entry?.episode_type === 're_exposure'
                  ? doses.filter(d => ['Day 0', 'Day 3'].includes(d.period))
                  : showFullSchedule ? doses : doses.filter(d => ['Day 0', 'Day 3', 'Day 7'].includes(d.period)));
                const activeCandidateIdx = candidateList.findIndex(d => !d.is_completed && !d.inventory_linked && !PREREQ[d.period]?.includes(doses.find(x => x.period === PREREQ[d.period])?.is_completed === false ? 'no' : 'yes'));
                const isActiveFollowUp = !readOnly && !isCompleted && !isPrerequisiteLocked && index === activeCandidateIdx;
                const isActivelyRecording = !isCompleted && !isPrerequisiteLocked && (isActiveFollowUp || Boolean(dose.vaccine_type || dose.is_external));
                const showRequiredWarning = isActivelyRecording && !dose.is_external && !dose.vaccine_type;

                return (
                  <tr
                    key={dose.period}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isPrerequisiteLocked ? 'var(--bg-secondary, #f9fafb)' : isCompleted ? '#f0fdf4' : isActiveFollowUp ? '#f0fdf4' : isFilled ? 'var(--table-header-bg, #f8fafc)' : 'var(--card-bg-solid, #ffffff)',
                      boxShadow: isActiveFollowUp ? 'inset 4px 0 0 #10b981' : isPrerequisiteLocked ? 'inset 4px 0 0 #f59e0b' : undefined,
                      opacity: isPrerequisiteLocked ? 0.65 : 1,
                    }}
                  >
                    {/* 1. Period */}
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: isCompleted ? '#15803d' : isPrerequisiteLocked ? '#92400e' : '#1e293b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isCompleted && <span style={{ color: '#16a34a', fontSize: 14 }}>✓</span>}
                          {isPrerequisiteLocked && <span style={{ color: '#f59e0b', fontSize: 13 }}>🔒</span>}
                          <span>{isBoosterPlan ? (dose.period === 'Day 0' ? 'Booster (Day 0)' : dose.period === 'Day 3' ? 'Booster (Day 3)' : dose.period) : dose.period}</span>
                          {isActiveFollowUp && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                            }}>
                              Ready to Administer
                            </span>
                          )}
                          {isPrerequisiteLocked && prereqPeriod && (
                            <span
                              title={`Prerequisite dose (${prereqPeriod}) must be administered before ${dose.period} can be recorded.`}
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fcd34d',
                                cursor: 'help',
                              }}
                            >
                              Locked — {prereqPeriod} pending
                            </span>
                          )}
                        </div>
                        {isActiveFollowUp && dose.schedule_drift_days !== undefined && dose.schedule_drift_days > 0 && (
                          <span style={{ fontSize: 10.5, color: '#dc2626', fontWeight: 600 }}>
                            ⚠️ {dose.schedule_drift_days}d overdue
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Route */}
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                        {(['ID', 'IM'] as const).map(route => (
                          <label key={route} style={{ display: 'inline-flex', alignItems: 'center', cursor: isLocked ? 'default' : 'pointer', fontSize: 12, fontWeight: 500, color: '#475569' }}>
                            <input
                              type="radio"
                              name={`route_${index}`}
                              value={route}
                              checked={dose.route === route}
                              onChange={() => handleDoseChange(index, 'route', route)}
                              disabled={isLocked}
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
                        disabled={isLocked}
                        max={isActiveFollowUp ? new Date().toISOString().split('T')[0] : undefined}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: isFilled ? '1px solid #94a3b8' : '1px solid #cbd5e1',
                          borderRadius: 5,
                          fontSize: 12,
                          backgroundColor: isCompleted ? 'var(--card-bg-nested, #f8fafc)' : 'var(--card-bg-solid, #ffffff)',
                          color: isCompleted ? '#334155' : '#0f172a',
                          cursor: isCompleted ? 'not-allowed' : 'text',
                          fontWeight: isCompleted ? 600 : 400,
                        }}
                      />
                      {isActiveFollowUp && dose.ideal_date && dose.ideal_date !== dose.date && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            marginTop: 4,
                            padding: '2px 6px',
                            backgroundColor: (dose.schedule_drift_days || 0) > 0 ? '#fef2f2' : '#eff6ff',
                            border: `1px solid ${(dose.schedule_drift_days || 0) > 0 ? '#fecaca' : '#bfdbfe'}`,
                            borderRadius: 4,
                            fontSize: 10,
                            color: (dose.schedule_drift_days || 0) > 0 ? '#b91c1c' : '#1d4ed8',
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          <span>{(dose.schedule_drift_days || 0) > 0 ? '⚠️' : 'ℹ️'}</span>
                          <span>
                            {(dose.schedule_drift_days || 0) > 0
                              ? `Was scheduled: ${dose.ideal_date} (+${dose.schedule_drift_days}d late)`
                              : `Was scheduled: ${dose.ideal_date}`}
                          </span>
                        </div>
                      )}
                      {!isActiveFollowUp && dose.schedule_drift_days !== undefined && dose.schedule_drift_days !== 0 && (
                        <div
                          title={dose.schedule_adjustment_reason || 'Operating schedule adjustment'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            marginTop: 4,
                            padding: '2px 6px',
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: 4,
                            fontSize: 10,
                            color: '#b45309',
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          <span>ℹ️</span>
                          <span>
                            Ideal: {dose.ideal_date || 'Standard'} ({dose.schedule_drift_days > 0 ? `+${dose.schedule_drift_days}d` : `${dose.schedule_drift_days}d`})
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 4. Vaccine Type & Source Selection */}
                    <td style={{ padding: '8px 10px' }}>
                      {/* Doctor's Order badge — shown when vaccine is prescribed */}
                      {prescribedVaccineType && !isCompleted && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 10, fontWeight: 700, color: '#166534', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 99, padding: '2px 8px', width: 'fit-content' }}>
                          🩺 Doctor's Order: {prescribedVaccineType}
                        </div>
                      )}
                      <select
                        value={dose.vaccine_type}
                        onChange={(e) => handleDoseVaccineTypeChange(index, e.target.value)}
                        disabled={isLocked || Boolean(prescribedVaccineType && !isCompleted)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: showRequiredWarning ? '1.5px solid #ef4444' : prescribedVaccineType && !isCompleted ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                          borderRadius: 5,
                          fontSize: 12,
                          backgroundColor: isCompleted ? 'var(--card-bg-nested, #f8fafc)' : prescribedVaccineType && !isCompleted ? '#f0fdf4' : 'var(--card-bg-solid, #ffffff)',
                          color: dose.vaccine_type ? '#166534' : '#64748b',
                          fontWeight: dose.vaccine_type ? 700 : 400,
                          cursor: (isCompleted || Boolean(prescribedVaccineType && !isCompleted)) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <option value="">— Select Vaccine —</option>
                        {availableVaccineTypes.map((vType) => (
                          <option key={vType} value={vType}>
                            {vType}
                          </option>
                        ))}
                      </select>

                      {/* Transferred-in external toggle */}
                      <div style={{ marginTop: 4 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#0369a1', cursor: isLocked ? 'default' : 'pointer', fontWeight: 500 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(dose.is_external)}
                            disabled={isLocked}
                            onChange={(e) => handleDoseChange(index, 'is_external', e.target.checked)}
                          />
                          <span>Transferred-In (External Clinic)</span>
                        </label>
                        {dose.is_external && (
                          <input
                            type="text"
                            value={dose.external_facility_name || ''}
                            placeholder="External hospital / clinic name"
                            disabled={isLocked}
                            onChange={(e) => handleDoseChange(index, 'external_facility_name', e.target.value)}
                            style={{
                              width: '100%',
                              marginTop: 4,
                              padding: '3px 6px',
                              fontSize: 10.5,
                              borderRadius: 4,
                              border: '1px solid #7dd3fc',
                              backgroundColor: '#f0f9ff',
                              color: '#0c4a6e',
                            }}
                          />
                        )}
                      </div>

                      {showRequiredWarning ? (
                        <div style={{ color: '#dc2626', fontSize: 10, fontWeight: 600, marginTop: 3 }}>
                          Required to record dose
                        </div>
                      ) : isActiveFollowUp && dose.vaccine_type ? (
                        <div style={{ color: '#15803d', fontSize: 10, fontWeight: 600, marginTop: 3 }}>
                          ✓ Ready to record for today
                        </div>
                      ) : isActiveFollowUp && !dose.vaccine_type ? (
                        <div style={{ color: '#059669', fontSize: 10, fontWeight: 600, marginTop: 3 }}>
                          👉 Select vaccine to record
                        </div>
                      ) : dose.date && !dose.vaccine_type && !isCompleted ? (
                        <div style={{ color: '#0369a1', fontSize: 10, fontWeight: 500, marginTop: 3 }}>
                          📅 Scheduled follow-up
                        </div>
                      ) : null}
                    </td>

                    {/* 5. FIFO Batch & Open-Vial Preview */}
                    <td style={{ padding: '8px 10px' }}>
                      {dose.is_external ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, padding: '4px 8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>
                            🏥 Transferred-In Dose
                          </span>
                          <span style={{ fontSize: 10, color: '#0284c7' }}>
                            {dose.external_facility_name || 'External Facility'} (0 local stock deducted)
                          </span>
                        </div>
                      ) : isCompleted ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, padding: '4px 8px', backgroundColor: dose.inventory_units_used === '0' ? '#ecfeff' : '#dcfce7', border: dose.inventory_units_used === '0' ? '1px solid #a5f3fc' : '1px solid #86efac', borderRadius: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: dose.inventory_units_used === '0' ? '#0e7490' : '#15803d' }}>
                            ✓ Batch: {dose.batch_number || 'Administered'} {dose.inventory_units_used === '0' ? '(Shared Vial)' : dose.inventory_units_used ? `(${dose.inventory_units_used} deducted)` : ''}
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
                      {dose.is_external ? (
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, backgroundColor: '#f0f9ff', color: '#0369a1', fontSize: 11, fontWeight: 600 }}>
                          External (0 stock)
                        </span>
                      ) : isCompleted ? (
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, backgroundColor: 'var(--card-bg-nested, #f8fafc)', color: '#475569', fontSize: 11, fontWeight: 600 }}>
                          {dose.inventory_units_used === '0' ? 'Shared Vial' : `${dose.inventory_units_used || 1} vial(s)`}
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

                    {/* 7. Given by / Attended by */}
                    <td style={{ padding: '8px 12px' }}>
                      {isCompleted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 12 }}>
                              {dose.given_by || 'Staff Nurse'}
                            </span>
                            <span title="Verified Clinician" style={{ color: '#16a34a', fontSize: 12, fontWeight: 700 }}>✓</span>
                          </div>
                          {dose.license_no ? (
                            <span style={{ fontSize: 10.5, color: '#0369a1', fontWeight: 600 }}>
                              PRC: {dose.license_no}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#64748b' }}>
                              Licensed Staff
                            </span>
                          )}
                        </div>
                      ) : dose.is_external ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0369a1' }}>
                            🏥 {dose.external_facility_name || dose.given_by || 'External Clinic'}
                          </span>
                          <span style={{ fontSize: 10, color: '#64748b' }}>External Clinician</span>
                        </div>
                      ) : (isActiveFollowUp || isActivelyRecording) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 12 }}>
                              {currentUser?.name || dose.given_by || 'Current Nurse'}
                            </span>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 4,
                              backgroundColor: '#dbeafe',
                              color: '#1d4ed8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>
                              Attending
                            </span>
                          </div>
                          {(currentUser?.professional_license_no || dose.license_no) ? (
                            <span style={{ fontSize: 10.5, color: '#0369a1', fontWeight: 600 }}>
                              PRC: {currentUser?.professional_license_no || dose.license_no}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#64748b' }}>
                              Registered Nurse
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* 8. Signature */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {isCompleted ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                          title="Digital signature on file stamped on official record"
                        >
                          <span>✍️</span>
                          <span>{dose.signature && dose.signature !== 'On File' ? dose.signature : 'On File'}</span>
                          <span>✓</span>
                        </div>
                      ) : dose.is_external ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: '#f0f9ff',
                          color: '#0369a1',
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          External Card
                        </span>
                      ) : (isActiveFollowUp || isActivelyRecording) ? (
                        (currentUser?.signature_path || dose.signature_path) ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            title="Digital signature on file will authenticate this dose upon saving"
                          >
                            <span>✍️</span>
                            <span>On File</span>
                            <span style={{ color: '#16a34a' }}>✓</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                              fontSize: 10.5,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            title="Digital signature is optional. Sign the printed record by hand if required by your clinic."
                          >
                            <span>⚠️</span>
                            <span>Hand-sign printout</span>
                          </div>
                        )
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* 9. Status Pill */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {dose.is_external ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: 10, fontWeight: 700 }}>
                          🏥 External
                        </span>
                      ) : isCompleted ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, backgroundColor: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 700 }}>
                          ✓ Administered
                        </span>
                      ) : (isActiveFollowUp || isActivelyRecording) ? (
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
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, backgroundColor: 'var(--card-bg-nested, #e4fbf4)', color: '#64748b', fontSize: 10, fontWeight: 500 }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 8.1 — Expand / Collapse Day 28 + Booster rows (primary regimen only) */}
          {false && !orderedDosePeriods && !(manualReExposure || currentIncident?.episode_type === 're_exposure' || entry?.episode_type === 're_exposure') && !readOnly && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowFullSchedule(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px',
                  background: showFullSchedule ? 'var(--card-bg-nested, #e4fbf4)' : '#f0fdf4',
                  border: `1px solid ${showFullSchedule ? '#cbd5e1' : '#a7f3d0'}`,
                  borderRadius: 20, fontSize: 12, fontWeight: 600,
                  color: showFullSchedule ? '#475569' : '#065f46',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {showFullSchedule
                  ? '▲ Hide Booster Doses'
                  : '▼ Show Booster 1 / Booster 2 (optional follow-up)'}
              </button>
            </div>
          )}
        </div>

        {/* ── Collapsible Prior Immunization History (Read Only) ── */}
        {false && pastHistoryRecords.length > 0 && isBoosterPlan && (
          <div style={{ marginTop: 20, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowHistoricalPEP(prev => !prev)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#f8fafc',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>📁</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                  Historical Primary PEP Immunization Course (Episode 1: {pastHistoryRecords.filter(r => r.status === 'completed').length} Completed Doses)
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                {showHistoricalPEP ? '▲ Hide Historical Records' : '▼ View Historical PEP Record'}
              </span>
            </button>

            {showHistoricalPEP && (
              <div style={{ padding: '12px 16px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Dose Period</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Date Administered</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Vaccine Brand</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Batch No.</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Administered By</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastHistoryRecords.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                          Day {r.dose_number}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {r.treatment_date || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {r.vaccine_brand || 'ARV'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {r.batch_no || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {(typeof r.administered_by === 'object' && r.administered_by?.name) ? r.administered_by.name : (r.administeredBy?.name || 'Staff')}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '1px 8px', borderRadius: 10 }}>
                            Completed ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: ADDITIONAL MEDICATIONS & ICD CODE */}
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Additional Medications</h3>
          <div style={{ display: 'flex', gap: 24 }}>
            {(['erig', 'tt', 'ats'] as const).map(med => {
              const isReExposure = manualReExposure || currentIncident?.episode_type === 're_exposure' || entry?.episode_type === 're_exposure' || entry?.incident?.episode_type === 're_exposure';
              const isErigContraindicated = med === 'erig' && isReExposure;
              return (
                <label
                  key={med}
                  title={isErigContraindicated ? 'RIG omitted — contraindicated in previously immunized patients (DOH Rabies Manual)' : undefined}
                  style={{ display: 'flex', alignItems: 'center', cursor: isErigContraindicated || readOnly ? 'not-allowed' : 'pointer', opacity: isErigContraindicated ? 0.45 : 1 }}
                >
                  <input
                    type="checkbox"
                    checked={additionalMeds[med]}
                    onChange={(e) => setAdditionalMeds(prev => ({ ...prev, [med]: e.target.checked }))}
                    disabled={readOnly || isErigContraindicated}
                    style={{ marginRight: 8 }}
                  />
                  <span style={{ fontSize: 13, color: isErigContraindicated ? '#9ca3af' : '#374151', fontWeight: 500 }}>
                    {med.toUpperCase()}
                    {isErigContraindicated && <span style={{ fontSize: 10, marginLeft: 4, color: '#6b7280' }}>(contraindicated)</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>ICD 10 Code</label>
          <input type="text" value={icdCode} onChange={(e) => setIcdCode(e.target.value)} placeholder="e.g., W54.0" disabled={readOnly} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: 13, backgroundColor: readOnly ? 'var(--bg-secondary, #e8fdf6)' : undefined }} />
        </div>
      </div>

      {/* Inline footer buttons */}
      {inline && (
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
          <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} style={{ marginRight: 'auto' }} />
          {error && <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>{error}</p>}
          {!readOnly && (
            <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save Record'}
            </button>
          )}
        </div>
      )}

      <DohTransferSlipModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        patient={entry?.patient}
        incident={currentIncident || entry?.incident}
        treatmentRecords={existingRecordsData}
      />
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
          <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} style={{ marginRight: 'auto' }} />
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
