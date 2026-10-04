import { useEffect, useState } from 'react';
import { useSavedExposureCategory } from '../hooks/useSavedExposureCategory';
import ProphylaxisAdministrationSection from './ProphylaxisAdministrationSection';
import type { ProphylaxisRecord } from './ProphylaxisAdministrationSection';
import type { ProphylaxisAdministration, ProphylaxisStock } from '../../../shared/types/prophylaxis';
import { isProphylaxisInventoryName } from '../../../shared/types/prophylaxis';
import SignatureImage from '../../../shared/components/SignatureImage';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { formatPhilHealthNumber } from '../../../shared/utils';
import { isValidFourDigitYearDate } from '../../../shared/utils/date';
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
import {
  SegmentedControl,
  ChipGroup,
  FormSection,
  DoseCard,
  DoseRow,
} from './form3';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  LockIcon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';

const BORDER_RADIUS = 8;

const MODE_OF_EXPOSURE_CHIPS = [
  { key: 'nibbling_uncovered', label: 'Lick, intact skin' },
  { key: 'nibbling_wounded', label: 'Lick, broken skin' },
  { key: 'scratch_abrasion', label: 'Scratch' },
  { key: 'transdermal_bite', label: 'Bite' },
  { key: 'handling_ingestion', label: 'Raw meat contact' },
] as const;

const BODY_PART_CHIPS = [
  { key: 'head_neck', label: 'Head & neck' },
  { key: 'upper_extremities', label: 'Arm / hand' },
  { key: 'lower_extremities', label: 'Leg / foot' },
  { key: 'trunk_torso', label: 'Trunk' },
  { key: 'multiple_sites', label: 'Multiple' },
  { key: 'na_ingestion', label: 'Ingestion' },
] as const;

export function cleanPurok(val: string): string {
  if (!val) return '';
  let cleaned = val.trim().replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\b(purok|zone|sitio|block|blk|street|st|phase|prk)\b/gi, (match) => {
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });
  return cleaned;
}

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
  animal_status: 'owned' | 'stray' | 'unknown' | '';
  animal_available: 'yes' | 'no' | 'unknown' | '';
  animal_condition: 'healthy' | 'sick' | 'died' | 'unknown' | '';
  past_history_bite: 'yes' | 'no' | 'unsure' | '';
  past_bite_dates: string;
  pep_completed: 'completed' | 'incomplete' | 'none' | 'unsure' | 'yes' | 'no' | '';
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
  treatment_id?: number;
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
  date_of_exposure: getLocalDateString(),
  date_treatment_started: getLocalDateString(),
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
  animal_status: 'unknown',
  animal_available: 'unknown',
  animal_condition: 'unknown',
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
  const [purok, setPurok] = useState('');

  // Reset the location selector whenever a different patient/episode opens.
  // The saved incident/intake place is loaded afterward; no clinic-wide default
  // should overwrite the actual place of exposure.
  useEffect(() => {
    expLoc.setMunicipality('');
    expLoc.setBarangay('');
    expLoc.setUseManual(false);
    expLoc.setManualMun('');
    expLoc.setManualBrgy('');
    setPurok('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vacDraftPatientId, vacDraftBiteId]);

  // Sync composed address string → place_of_exposure field
  // Format: [Purok/Zone, ]Barangay, City/Municipality
  useEffect(() => {
    const currentMun = expLoc.useManual ? expLoc.manualMun : expLoc.munName;
    const currentBrgy = expLoc.useManual ? expLoc.manualBrgy : expLoc.brgyName;

    if (currentBrgy && currentMun) {
      const parts: string[] = [];
      const cleanP = cleanPurok(purok);
      if (cleanP) parts.push(cleanP);
      parts.push(currentBrgy);
      parts.push(currentMun);
      setFormData(prev => ({ ...prev, place_of_exposure: parts.join(', ') }));
    }
  }, [expLoc.munName, expLoc.brgyName, expLoc.manualMun, expLoc.manualBrgy, expLoc.useManual, purok]);

  // Synchronize expLoc with the saved incident/intake place.
  useEffect(() => {
    if (!open) {
      expLoc.setMunicipality('');
      expLoc.setBarangay('');
      expLoc.setUseManual(false);
      expLoc.setManualMun('');
      expLoc.setManualBrgy('');
      setPurok('');
      return;
    }

    if (expLoc.loadingMun) return;

    const rawPlace = (formData.place_of_exposure || '').trim();

    if (rawPlace && !expLoc.municipality && !expLoc.manualMun) {
      let parts = rawPlace.split(',').map(s => s.trim()).filter(Boolean);
      // If the last part is a province, strip it for matching
      if (parts.length >= 2) {
        const last = parts[parts.length - 1];
        if (/misamis|oriental|province/i.test(last)) {
          parts = parts.slice(0, -1);
        }
      }
      
      const matchedMun = expLoc.municipalities.find(m => 
        parts.some(p => p.toLowerCase() === m.name.toLowerCase() || m.name.toLowerCase().includes(p.toLowerCase()))
      );

      if (matchedMun) {
        expLoc.setMunicipality(matchedMun.code);
      } else if (parts.length > 0) {
        expLoc.setUseManual(true);
        if (parts.length >= 2) {
          expLoc.setManualBrgy(parts[parts.length - 2]);
          expLoc.setManualMun(parts[parts.length - 1]);
        } else {
          expLoc.setManualMun(parts[0]);
        }
      }
    }
  }, [open, expLoc.loadingMun, expLoc.municipalities, formData.place_of_exposure]);

  // When barangays finish loading for selected municipality, match the barangay and purok from place_of_exposure
  useEffect(() => {
    if (!open || expLoc.useManual || !expLoc.barangays.length || expLoc.barangay) return;
    const rawPlace = (formData.place_of_exposure || '').trim();
    if (!rawPlace) return;

    let parts = rawPlace.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      if (/misamis|oriental|province/i.test(last)) {
        parts = parts.slice(0, -1);
      }
    }

    const matchedBrgyIndex = parts.findIndex(p => 
      expLoc.barangays.some(b => b.name.toLowerCase() === p.toLowerCase() || b.name.toLowerCase().includes(p.toLowerCase()))
    );

    if (matchedBrgyIndex !== -1) {
      const matchedBrgyName = parts[matchedBrgyIndex];
      const matchedBrgy = expLoc.barangays.find(b => 
        b.name.toLowerCase() === matchedBrgyName.toLowerCase() || b.name.toLowerCase().includes(matchedBrgyName.toLowerCase())
      );
      if (matchedBrgy) {
        expLoc.setBarangay(matchedBrgy.code);

        const priorParts = parts.slice(0, matchedBrgyIndex);
        if (priorParts.length >= 1) {
          setPurok(priorParts.join(', '));
        }
      }
    }
  }, [open, expLoc.barangays, expLoc.useManual, formData.place_of_exposure]);
  const [doses, setDoses] = useState<VaccinationDose[]>(createInitialDoses());
  
  // ── Immutability Logic: Lock patient info & exposure fields if ANY dose is completed ──────────
  // NOTE: This only locks for CURRENT incident. Re-exposure creates NEW incident with NEW doses.
  // For new incidents, all doses are is_completed=false, so form stays unlocked.
  const hasCompletedDoseInCurrentIncident = doses.some(dose => dose.is_completed || dose.inventory_linked);
  const isFormLocked = readOnly || hasCompletedDoseInCurrentIncident;
  // The nurse owns the remaining exposure and anatomical details; category is from Form 2.
  // They lock only after a dose has been administered or in read-only mode.
  const clinicalAssessmentLocked = isFormLocked;
  const savedExposureCategory = useSavedExposureCategory(open,
    entry?.patient?.patient_id || entry?.patient?.id,
    entry?.bite_id || entry?.incident?.bite_id || entry?.bite_incident?.bite_id || entry?.biteIncident?.bite_id);
  const exposureCategory = savedExposureCategory ?? '';
  
  const [showFullSchedule, setShowFullSchedule] = useState(false); // 8.1: expand to show Day 28 + Boosters
  const [prophylaxisAdministrations, setProphylaxisAdministrations] = useState<ProphylaxisAdministration[]>([]);
  const [prophylaxisRecords, setProphylaxisRecords] = useState<ProphylaxisRecord[]>([]);
  const [prophylaxisStock, setProphylaxisStock] = useState<ProphylaxisStock | null | undefined>(undefined);
  const [icdCode, setIcdCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [signatureVersion, setSignatureVersion] = useState<string | null>(null);
  const [signatureReady, setSignatureReady] = useState(false);
  const [applySignature, setApplySignature] = useState(false);
  const [signatureLoadError, setSignatureLoadError] = useState(false);
  const [signatureRefresh, setSignatureRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setApplySignature(false);
    setSignatureReady(false);
    setSignatureVersion(null);
    setSignatureLoadError(false);
    if (open && !readOnly) {
      api.get('/staff-signature').then(response => {
        if (active) {
          const path = response.data?.signature_path;
          setSignatureVersion(path || null);
          if (path) {
            setSignatureReady(true);
            setApplySignature(true);
          }
        }
      }).catch(() => { if (active) setSignatureLoadError(true); });
    }
    return () => { active = false; };
  }, [open, readOnly, currentUser?.id, entry?.queue_id, entry?.patient_id, entry?.bite_id, signatureRefresh]);
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  const isPhilHealthMember = Boolean(
    entry?.patient?.philhealth_member === 'yes' ||
    entry?.patient?.details?.philhealth_member === 'yes' ||
    entry?.patient?.philhealth_no ||
    entry?.patient?.details?.philhealth_no
  );

  useEffect(() => {
    if (open && entry?.patient) {
      setSelectedPeriod('');
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
      setAvailableVaccineTypes(Array.isArray(names) ? names.filter(name => !isProphylaxisInventoryName(name)) : []);
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
    setProphylaxisAdministrations([]);
    setProphylaxisRecords([]);
    setProphylaxisStock(undefined);
    const patientId = entry?.patient?.patient_id || entry?.patient?.id;
    if (!patientId) return;

    try {
      const activeBiteId = entry?.bite_id || entry?.incident?.bite_id || entry?.bite_incident?.bite_id || entry?.biteIncident?.bite_id;
      const biteIdParam = activeBiteId ? `?bite_id=${activeBiteId}` : '';
      const [cardRes, apptRes, vacRes, incidentRes, stockRes] = await Promise.all([
        api.get(`/tagoloan-treatment-cards/patient/${patientId}${biteIdParam}`).catch(() => null),
        api.get(`/appointments?patient_id=${patientId}&status=scheduled`).catch(() => null),
        api.get(`/vaccination-records/patient/${patientId}${biteIdParam}`).catch(() => null),
        activeBiteId ? api.get(`/cases/${activeBiteId}`).catch(() => null) : Promise.resolve(null),
        api.get('/inventory/prophylaxis-stock').catch(() => null),
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
      setProphylaxisRecords(vacRes?.data?.prophylaxis_records || []);
      setProphylaxisStock(stockRes?.data?.stock || null);

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
        date_of_exposure: resolvedExposureDate || prev.date_of_exposure || getLocalDateString(),
        date_treatment_started: treatmentStartDate || prev.date_treatment_started || getLocalDateString(),
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
        animal_status: (bite?.animal_status || intake?.animal_ownership || intake?.animal_status || prev.animal_status || 'unknown') as any,
        animal_available: (bite?.animal_available != null
          ? (bite.animal_available ? 'yes' : 'no')
          : (intake?.animal_available != null
            ? (intake.animal_available ? 'yes' : 'no')
            : (prev.animal_available || 'unknown'))) as any,
        animal_condition: (bite?.animal_observation_status
          ? (bite.animal_observation_status === 'apparently_healthy' ? 'healthy' : (bite.animal_observation_status === 'dead' ? 'died' : bite.animal_observation_status))
          : (intake?.animal_condition_reported === 'apparently_healthy' ? 'healthy' : (intake?.animal_condition_reported === 'dead' ? 'died' : (bite?.animal_condition_reported || intake?.animal_condition_reported || prev.animal_condition || 'unknown')))) as any,
        past_history_bite: card
          ? (card.past_bite_history ? 'yes' : 'no')
          : (['yes', 'no', 'unsure'].includes(intake?.past_bite_history) ? intake.past_bite_history : prev.past_history_bite),
        past_bite_dates: card?.past_bite_dates || intake?.past_bite_dates || prev.past_bite_dates,
        pep_completed: card
          ? (card.past_pep_completed ? 'completed' : (intake?.prior_pep_status || 'none'))
          : (intake?.prior_pep_status || prev.pep_completed || ''),
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
          const signaturePath = record.signature || '';

          return {
            ...dose,
            route: record.route || dose.route,
            date: formatDateForInput(record.treatment_date) || dose.date,
            given_by: staffName,
            license_no: staffLicense,
            signature: record.signature || (signaturePath ? 'On File' : ''),
            signature_path: signaturePath,
            treatment_id: record.treatment_id,
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
            signature: '',
            signature_path: '',
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

  const scrollToFirstError = (elementId: string) => {
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (!el) return;

      let scrollParent: HTMLElement | null = el.parentElement;
      while (scrollParent && scrollParent !== document.body) {
        const overflowY = window.getComputedStyle(scrollParent).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          break;
        }
        scrollParent = scrollParent.parentElement;
      }

      if (scrollParent && scrollParent !== document.body) {
        const parentRect = scrollParent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const relativeTop = elRect.top - parentRect.top + scrollParent.scrollTop;
        scrollParent.scrollTo({
          top: Math.max(0, relativeTop - 24),
          behavior: 'smooth',
        });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const focusable = el.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
      ) || (el.matches('input, select, textarea, button') ? el : null);

      if (focusable) {
        focusable.focus({ preventScroll: true });
      }
    }, 50);
  };

  const handleFieldChange = (key: keyof TreatmentFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let value = ev.target.value;
    if (key === 'philhealth_pin') {
      value = formatPhilHealthNumber(value);
    }

    if (key === 'date_of_exposure') {
      setFormData(prev => {
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

    setFieldErrors(prev => {
      if (!prev[key] && (key !== 'body_part_affected_text' || !prev.body_part_affected)) return prev;
      const next = { ...prev };
      delete next[key];
      if (key === 'body_part_affected_text' && value.trim()) {
        delete next.body_part_affected;
      }
      return next;
    });
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
    const currentPeriod = doses[index]?.period;

    setFieldErrors(fe => {
      const next = { ...fe };
      if (currentPeriod) {
        delete next[`dose_${currentPeriod}_${String(field)}`];
        delete next[`dose_${currentPeriod}_date`];
        delete next[`dose_${currentPeriod}_route`];
        delete next[`dose_${currentPeriod}_external_facility_name`];
      }
      if (field === 'date') delete next.dose_date;
      if (field === 'route') delete next.route;
      if (field === 'external_facility_name') delete next.external_facility_name;
      return next;
    });

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
    setFieldErrors(fe => {
      const next = { ...fe };
      delete next[`dose_${selectedDose.period}_vaccine_type`];
      delete next.vaccine_type;
      delete next[`fifo_${selectedDose.period}`];
      delete next.fifo;
      return next;
    });

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

  const FIELD_ORDER = [
    'mode_of_exposure',
    'body_part_affected',
    'body_part_affected_text',
    'animal_type',
    'animal_type_other',
    'animal_status',
    'animal_available',
    'animal_condition',
    'past_history_bite',
    'past_bite_dates',
    'pep_completed',
    'dose_route',
    'dose_date',
    'vaccine_type',
    'external_facility_name',
    'fifo',
  ];

  const getElementIdForErrorKey = (errorKey: string, period: string): string => {
    if (errorKey === 'mode_of_exposure') return 'field-mode_of_exposure';
    if (errorKey === 'body_part_affected') return 'field-body_part_affected';
    if (errorKey === 'body_part_affected_text') return 'field-body_part_affected_text';
    if (errorKey === 'animal_type') return 'field-animal_type';
    if (errorKey === 'animal_type_other') return 'field-animal_type_other';
    if (errorKey === 'animal_status') return 'field-animal_status';
    if (errorKey === 'animal_available') return 'field-animal_available';
    if (errorKey === 'animal_condition') return 'field-animal_condition';
    if (errorKey === 'past_history_bite') return 'field-past_history_bite';
    if (errorKey === 'past_bite_dates') return 'field-past_bite_dates';
    if (errorKey === 'pep_completed') return 'field-pep_completed';
    if (errorKey.includes('route')) return `field-dose_route-${period}`;
    if (errorKey.includes('date') && errorKey.includes('dose')) return `field-dose_date-${period}`;
    if (errorKey === 'dose_date') return `field-dose_date-${period}`;
    if (errorKey.includes('vaccine_type') || errorKey === 'vaccine_type') return `field-vaccine_type-${period}`;
    if (errorKey.includes('external_facility') || errorKey === 'external_facility_name') return `field-dose_external_facility-${period}`;
    if (errorKey.includes('fifo') || errorKey === 'fifo') return `field-fifo-${period}`;
    return `field-${errorKey}`;
  };

  const handleSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};
    const todayStr = getLocalDateString();

    if (!clinicalAssessmentLocked) {
      if (!Object.values(formData.mode_of_exposure).some(Boolean)) {
        newFieldErrors.mode_of_exposure = 'Please select an option.';
      }
      if (!Object.values(formData.body_part_affected).some(Boolean) && !formData.body_part_affected_text.trim()) {
        newFieldErrors.body_part_affected = 'Please select an option.';
      }
      if (!formData.animal_type) {
        newFieldErrors.animal_type = 'Please select an option.';
      } else if (formData.animal_type === 'other' && !formData.animal_type_other.trim()) {
        newFieldErrors.animal_type_other = 'This field is required.';
      }
    }

    // Auto-fill today's date for candidate doses with vaccine type selected
    const candidateDoses = doses.map(d => {
      if (d.vaccine_type && !d.date) {
        return { ...d, date: todayStr };
      }
      return d;
    });

    // Only submit active uncompleted doses being administered today
    const filledDoses = candidateDoses.filter(d => {
      if (d.is_completed || !d.date || !d.vaccine_type) return false;
      const PREREQ: Record<string, string> = { 'Day 3': 'Day 0', 'Day 7': 'Day 3', 'Day 28': 'Day 7', 'Booster 2': 'Booster 1' };
      const prereqPeriod = PREREQ[d.period];
      if (prereqPeriod) {
        const prereq = doses.find(x => x.period === prereqPeriod);
        if (prereq && !prereq.is_completed && !prereq.inventory_linked) return false;
      }
      return true;
    });

    const activeDose = candidateDoses.find(d => !d.is_completed && !d.inventory_linked && !isDosePrerequisiteLocked(d.period));
    const targetPeriod = activeDose ? activeDose.period : activeUnlockedPeriod;

    if (activeDose && prophylaxisAdministrations.length === 0) {
      if (!activeDose.vaccine_type) {
        newFieldErrors[`dose_${activeDose.period}_vaccine_type`] = 'Please select an option.';
        newFieldErrors.vaccine_type = 'Please select an option.';
      }
      if (!activeDose.date) {
        newFieldErrors[`dose_${activeDose.period}_date`] = 'Please enter a valid date.';
        newFieldErrors.dose_date = 'Please enter a valid date.';
      } else if (!isValidFourDigitYearDate(activeDose.date)) {
        newFieldErrors[`dose_${activeDose.period}_date`] = 'Please enter a valid 4-digit year.';
        newFieldErrors.dose_date = 'Please enter a valid 4-digit year.';
      } else if (activeDose.date > todayStr) {
        newFieldErrors[`dose_${activeDose.period}_date`] = 'Date cannot be a future date.';
        newFieldErrors.dose_date = 'Date cannot be a future date.';
      }
      if (activeDose.is_external && !activeDose.external_facility_name?.trim()) {
        newFieldErrors[`dose_${activeDose.period}_external_facility_name`] = 'This field is required.';
        newFieldErrors.external_facility_name = 'This field is required.';
      }
      if (!activeDose.is_external && fifoErrors[activeDose.period]) {
        newFieldErrors[`fifo_${activeDose.period}`] = fifoErrors[activeDose.period];
        newFieldErrors.fifo = fifoErrors[activeDose.period];
      }
    }

    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      setError('');
      const firstErrorKey = FIELD_ORDER.find(key => (
        newFieldErrors[key] ||
        newFieldErrors[`dose_${targetPeriod}_${key}`] ||
        newFieldErrors[`dose_${targetPeriod}_date`] && key === 'dose_date' ||
        newFieldErrors[`dose_${targetPeriod}_vaccine_type`] && key === 'vaccine_type' ||
        newFieldErrors[`dose_${targetPeriod}_external_facility_name`] && key === 'external_facility_name' ||
        newFieldErrors[`fifo_${targetPeriod}`] && key === 'fifo'
      )) || Object.keys(newFieldErrors)[0];

      if (firstErrorKey) {
        const elementId = getElementIdForErrorKey(firstErrorKey, targetPeriod);
        scrollToFirstError(elementId);
      }
      return;
    }

    const patientId = entry?.patient?.patient_id || entry?.patient?.id;

    if (currentUser?.role === 'triage') {
      setError('Triage doctors are not permitted to record vaccine doses (Form 3). Dose administration must be recorded by the Treatment Nurse.');
      return;
    }

    if (filledDoses.length === 0 && prophylaxisAdministrations.length === 0) {
      setError("Select a vaccine dose or record a prescribed prophylaxis administration before saving.");
      return;
    }

    const invalidYearDose = filledDoses.find(d => d.date && !isValidFourDigitYearDate(d.date));
    if (invalidYearDose) {
      newFieldErrors[`dose_${invalidYearDose.period}_date`] = 'Please enter a valid 4-digit year.';
      newFieldErrors.dose_date = 'Please enter a valid 4-digit year.';
      setFieldErrors(newFieldErrors);
      scrollToFirstError(`field-dose_date-${invalidYearDose.period}`);
      return;
    }

    const futureDose = filledDoses.find(d => d.date && d.date > todayStr);
    if (futureDose) {
      newFieldErrors[`dose_${futureDose.period}_date`] = 'Date cannot be a future date.';
      newFieldErrors.dose_date = 'Date cannot be a future date.';
      setFieldErrors(newFieldErrors);
      scrollToFirstError(`field-dose_date-${futureDose.period}`);
      return;
    }

    const invalidProphDate = prophylaxisAdministrations.find(p => p.date && !isValidFourDigitYearDate(p.date));
    if (invalidProphDate) {
      setError('Please enter a valid 4-digit year for prophylaxis administration date.');
      return;
    }

    for (const d of filledDoses) {
      const units = parseInt(d.inventory_units_used, 10);
      if (isNaN(units) || units < 0) {
        setError(`Please enter valid Stock Units Used (0 for shared open vial, or 1+ for new vial) for ${d.period}.`);
        return;
      }
      if (!d.inventory_linked && fifoErrors[d.period] && units > 0) {
        newFieldErrors[`fifo_${d.period}`] = fifoErrors[d.period];
        setFieldErrors(newFieldErrors);
        scrollToFirstError(`field-fifo-${d.period}`);
        return;
      }
    }

    setError('');
    setSaving(true);

    try {
      await api.post('/vaccination-records', {
        patient_id: patientId,
        queue_id: entry.queue_id,
        apply_signature: Boolean(applySignature && (signatureReady || signatureVersion)),
        signature_version: (applySignature && signatureVersion) ? signatureVersion : null,
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
        animal_status: formData.animal_status || 'unknown',
        animal_available: formData.animal_available || 'unknown',
        animal_condition: formData.animal_condition || 'unknown',
        doses: filledDoses.map(d => ({
          period: d.period,
          route: d.route || null,
          date: d.date || todayStr,
          given_by: currentUser?.name || d.given_by || null,
          vaccine_type: d.vaccine_type,
          inventory_units_used: d.is_external ? 0 : (parseInt(d.inventory_units_used, 10) || 0),
          is_external: Boolean(d.is_external),
          external_facility_name: d.external_facility_name || null,
        })),
        bite_id: currentIncident?.bite_id || entry?.bite_id || entry?.incident?.bite_id || entry?.bite_incident?.bite_id || entry?.biteIncident?.bite_id || null,
        episode_type: manualReExposure ? 're_exposure' : (currentIncident?.episode_type || entry?.incident?.episode_type || 'primary'),
        prophylaxis_administrations: prophylaxisAdministrations,
        icd_code: icdCode || null,
      });

      onSave();
      draft.clearDraft();
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        const mappedErrors: Record<string, string> = {};

        for (const [key, msgs] of Object.entries(backendErrors)) {
          const msg = Array.isArray(msgs) ? msgs[0] : String(msgs);
          if (key === 'mode_of_exposure' || key.startsWith('mode_of_exposure.')) {
            mappedErrors.mode_of_exposure = msg;
          } else if (key === 'body_part_affected' || key.startsWith('body_part_affected.')) {
            mappedErrors.body_part_affected = msg;
          } else if (key === 'body_part_detail') {
            mappedErrors.body_part_affected_text = msg;
          } else if (key === 'animal_type') {
            mappedErrors.animal_type = msg;
          } else if (key === 'animal_type_other') {
            mappedErrors.animal_type_other = msg;
          } else if (key === 'animal_status') {
            mappedErrors.animal_status = msg;
          } else if (key === 'animal_available') {
            mappedErrors.animal_available = msg;
          } else if (key === 'animal_condition') {
            mappedErrors.animal_condition = msg;
          } else if (key === 'past_history_bite') {
            mappedErrors.past_history_bite = msg;
          } else if (key === 'past_bite_dates') {
            mappedErrors.past_bite_dates = msg;
          } else if (key === 'pep_completed') {
            mappedErrors.pep_completed = msg;
          } else if (key.startsWith('doses.')) {
            const parts = key.split('.');
            const doseIdx = parseInt(parts[1], 10);
            const doseField = parts[2];
            const dosePeriod = filledDoses[doseIdx]?.period || targetPeriod;
            if (doseField === 'vaccine_type') {
              mappedErrors[`dose_${dosePeriod}_vaccine_type`] = msg;
              mappedErrors.vaccine_type = msg;
            } else if (doseField === 'date') {
              mappedErrors[`dose_${dosePeriod}_date`] = msg;
              mappedErrors.dose_date = msg;
            } else if (doseField === 'route') {
              mappedErrors[`dose_${dosePeriod}_route`] = msg;
              mappedErrors.route = msg;
            } else if (doseField === 'external_facility_name') {
              mappedErrors[`dose_${dosePeriod}_external_facility_name`] = msg;
              mappedErrors.external_facility_name = msg;
            } else {
              mappedErrors[`dose_${dosePeriod}_vaccine_type`] = msg;
            }
          } else if (key === 'doses') {
            mappedErrors[`dose_${targetPeriod}_vaccine_type`] = msg;
            mappedErrors.vaccine_type = msg;
          } else {
            mappedErrors[key] = msg;
          }
        }

        setFieldErrors(mappedErrors);
        const firstErrorKey = FIELD_ORDER.find(key => (
          mappedErrors[key] ||
          mappedErrors[`dose_${targetPeriod}_${key}`] ||
          mappedErrors[`dose_${targetPeriod}_date`] && key === 'dose_date' ||
          mappedErrors[`dose_${targetPeriod}_vaccine_type`] && key === 'vaccine_type' ||
          mappedErrors[`dose_${targetPeriod}_external_facility_name`] && key === 'external_facility_name' ||
          mappedErrors[`fifo_${targetPeriod}`] && key === 'fifo'
        )) || Object.keys(mappedErrors)[0];

        if (firstErrorKey) {
          const elementId = getElementIdForErrorKey(firstErrorKey, targetPeriod);
          scrollToFirstError(elementId);
        }
      } else {
        setError(err.response?.data?.message || 'Failed to save treatment record');
      }
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

  const candidateDoseList = orderedDosePeriods
    ? doses.filter(d => orderedDosePeriods.includes(d.period))
    : (manualReExposure || currentIncident?.episode_type === 're_exposure' || entry?.episode_type === 're_exposure'
    ? doses.filter(d => ['Day 0', 'Day 3'].includes(d.period))
    : showFullSchedule ? doses : doses.filter(d => ['Day 0', 'Day 3', 'Day 7'].includes(d.period)));

  const PREREQ: Record<string, string> = {
    'Day 3':     'Day 0',
    'Day 7':     'Day 3',
    'Day 28':    'Day 7',
    'Booster 2': 'Booster 1',
  };

  const isDosePrerequisiteLocked = (period: string) => {
    const prereqPeriod = PREREQ[period];
    if (!prereqPeriod) return false;
    const prereqDose = doses.find(d => d.period === prereqPeriod);
    return !prereqDose || (!prereqDose.is_completed && !prereqDose.inventory_linked);
  };

  const activeCandidate = candidateDoseList.find(d => !d.is_completed && !d.inventory_linked && !isDosePrerequisiteLocked(d.period));
  const activeUnlockedPeriod = activeCandidate ? activeCandidate.period : (candidateDoseList[0]?.period || 'Day 0');
  const currentExpandedPeriod = selectedPeriod || activeUnlockedPeriod;

  const handleToggleExposureMode = (key: string) => {
    if (clinicalAssessmentLocked) return;
    setFormData(prev => {
      const nextMode = {
        ...prev.mode_of_exposure,
        [key]: !prev.mode_of_exposure[key as keyof typeof prev.mode_of_exposure],
      };
      if (Object.values(nextMode).some(Boolean)) {
        setFieldErrors(fe => {
          if (!fe.mode_of_exposure) return fe;
          const next = { ...fe };
          delete next.mode_of_exposure;
          return next;
        });
      }
      return {
        ...prev,
        mode_of_exposure: nextMode,
      };
    });
  };

  const handleToggleBodyPart = (key: string) => {
    if (clinicalAssessmentLocked) return;
    setFormData(prev => {
      const nextBodyPart = {
        ...prev.body_part_affected,
        [key]: !prev.body_part_affected[key as keyof typeof prev.body_part_affected],
      };
      if (Object.values(nextBodyPart).some(Boolean)) {
        setFieldErrors(fe => {
          if (!fe.body_part_affected) return fe;
          const next = { ...fe };
          delete next.body_part_affected;
          return next;
        });
      }
      return {
        ...prev,
        body_part_affected: nextBodyPart,
      };
    });
  };

  const formContent = (
    <div style={{ padding: inline ? '0' : '24px 32px' }}>
      {/* Lock Alert - Show when form has completed doses */}
      {hasCompletedDoseInCurrentIncident && !readOnly && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: BORDER_RADIUS,
          padding: 12,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <HugeiconsIcon icon={LockIcon} size={20} color="#b45309" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
              Patient Information &amp; Exposure Details Locked
            </div>
            <div style={{ fontSize: 12, color: '#78350f' }}>
              These fields cannot be edited because at least one dose has been administered for this incident. Pending vaccine doses and prescribed tetanus / immunoglobulin administrations can still be recorded.
            </div>
          </div>
        </div>
      )}

      {/* 1. EXPOSURE */}
      <FormSection title="Exposure">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 12 }}>
          <div id="field-mode_of_exposure">
            <ChipGroup
              label="Mode of exposure"
              options={MODE_OF_EXPOSURE_CHIPS}
              selectedKeys={formData.mode_of_exposure}
              onToggle={handleToggleExposureMode}
              disabled={clinicalAssessmentLocked}
              error={fieldErrors.mode_of_exposure}
            />
          </div>

          <div id="field-body_part_affected">
            <ChipGroup
              label="Body part"
              options={BODY_PART_CHIPS}
              selectedKeys={formData.body_part_affected}
              onToggle={handleToggleBodyPart}
              disabled={clinicalAssessmentLocked}
              error={fieldErrors.body_part_affected}
            />
          </div>
        </div>

        <div id="field-body_part_affected_text">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: fieldErrors.body_part_affected_text ? '#dc2626' : 'var(--text-h, #374151)', marginBottom: 6 }}>
            Exact location (optional)
          </label>
          <input
            type="text"
            value={formData.body_part_affected_text}
            onChange={handleFieldChange('body_part_affected_text')}
            placeholder="e.g. left forearm, near the wrist"
            disabled={clinicalAssessmentLocked}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: fieldErrors.body_part_affected_text ? '1.5px solid #ef4444' : '1px solid var(--input-border, #d1d5db)',
              borderRadius: BORDER_RADIUS,
              fontSize: 13,
              backgroundColor: isFormLocked ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
              color: 'var(--input-text, #111827)',
              boxSizing: 'border-box',
              outline: 'none',
              boxShadow: fieldErrors.body_part_affected_text ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              if (fieldErrors.body_part_affected_text) {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
              } else {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
              }
            }}
            onBlur={(e) => {
              if (fieldErrors.body_part_affected_text) {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.15)';
              } else {
                e.currentTarget.style.borderColor = 'var(--input-border, #d1d5db)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          />
          {fieldErrors.body_part_affected_text && (
            <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500, marginTop: 4, display: 'block' }}>
              {fieldErrors.body_part_affected_text}
            </span>
          )}
        </div>

        {/* Place of Exposure Address */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light, #e5e7eb)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-h, #374151)' }}>
              Place of Exposure
            </label>
            <button
              type="button"
              onClick={() => expLoc.setUseManual(!expLoc.useManual)}
              disabled={clinicalAssessmentLocked}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                color: '#047857',
                fontSize: 12,
                fontWeight: 500,
                cursor: clinicalAssessmentLocked ? 'not-allowed' : 'pointer',
                opacity: clinicalAssessmentLocked ? 0.5 : 1,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { if (!clinicalAssessmentLocked) e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {expLoc.useManual ? 'Switch to Dropdown' : 'Switch to Manual'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary, #6b7280)', marginBottom: 4 }}>
                Municipality
              </label>
              {expLoc.useManual ? (
                <input
                  type="text"
                  value={expLoc.manualMun}
                  onChange={(e) => expLoc.setManualMun(e.target.value)}
                  placeholder="e.g. Tagoloan"
                  disabled={clinicalAssessmentLocked}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--input-border, #d1d5db)',
                    borderRadius: BORDER_RADIUS,
                    fontSize: 13,
                    backgroundColor: clinicalAssessmentLocked ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                    color: 'var(--input-text, #111827)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              ) : (
                <select
                  value={expLoc.municipality}
                  onChange={(e) => expLoc.setMunicipality(e.target.value)}
                  disabled={clinicalAssessmentLocked || expLoc.loadingMun}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--input-border, #d1d5db)',
                    borderRadius: BORDER_RADIUS,
                    fontSize: 13,
                    backgroundColor: (clinicalAssessmentLocked || expLoc.loadingMun) ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                    color: 'var(--input-text, #111827)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                >
                  <option value="">{expLoc.loadingMun ? 'Loading…' : '— Select —'}</option>
                  {expLoc.municipalities.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary, #6b7280)', marginBottom: 4 }}>
                Barangay
              </label>
              {expLoc.useManual ? (
                <input
                  type="text"
                  value={expLoc.manualBrgy}
                  onChange={(e) => expLoc.setManualBrgy(e.target.value)}
                  placeholder="e.g. Poblacion"
                  disabled={clinicalAssessmentLocked}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--input-border, #d1d5db)',
                    borderRadius: BORDER_RADIUS,
                    fontSize: 13,
                    backgroundColor: clinicalAssessmentLocked ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                    color: 'var(--input-text, #111827)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              ) : (
                <select
                  value={expLoc.barangay}
                  onChange={(e) => expLoc.setBarangay(e.target.value)}
                  disabled={clinicalAssessmentLocked || !expLoc.municipality || expLoc.loadingBrgy}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--input-border, #d1d5db)',
                    borderRadius: BORDER_RADIUS,
                    fontSize: 13,
                    backgroundColor: (clinicalAssessmentLocked || !expLoc.municipality || expLoc.loadingBrgy) ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                    color: 'var(--input-text, #111827)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                >
                  <option value="">{expLoc.loadingBrgy ? 'Loading…' : '— Select —'}</option>
                  {expLoc.barangays.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary, #6b7280)', marginBottom: 4 }}>
                Purok / Zone / Street
              </label>
              <input
                type="text"
                value={purok}
                onChange={(e) => setPurok(e.target.value)}
                placeholder="e.g. Purok 3"
                disabled={clinicalAssessmentLocked || (!expLoc.useManual && !expLoc.barangay)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--input-border, #d1d5db)',
                  borderRadius: BORDER_RADIUS,
                  fontSize: 13,
                  backgroundColor: (clinicalAssessmentLocked || (!expLoc.useManual && !expLoc.barangay)) ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                  color: 'var(--input-text, #111827)',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {formData.place_of_exposure && (
            <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: 'var(--bg-secondary, #f9fafb)', borderRadius: BORDER_RADIUS, fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
              <strong>Full address:</strong> {formData.place_of_exposure}
            </div>
          )}
        </div>
      </FormSection>

      {/* 2. ANIMAL */}
      <FormSection title="Animal">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div id="field-animal_type">
            <SegmentedControl
              label="Species"
              options={[
                { value: 'dog', label: 'Dog' },
                { value: 'cat', label: 'Cat' },
                { value: 'other', label: 'Other' },
              ]}
              value={formData.animal_type}
              onChange={(val) => {
                setFormData(prev => ({
                  ...prev,
                  animal_type: val,
                  animal_type_other: val === 'other' ? prev.animal_type_other : '',
                }));
                setFieldErrors(fe => {
                  const next = { ...fe };
                  delete next.animal_type;
                  if (val !== 'other') delete next.animal_type_other;
                  return next;
                });
              }}
              disabled={clinicalAssessmentLocked}
              error={fieldErrors.animal_type}
            />
            {formData.animal_type === 'other' && (
              <div id="field-animal_type_other" style={{ marginTop: 8 }}>
                <input
                  type="text"
                  value={formData.animal_type_other}
                  onChange={handleFieldChange('animal_type_other')}
                  placeholder="Specify other species"
                  disabled={clinicalAssessmentLocked}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: fieldErrors.animal_type_other ? '1.5px solid #ef4444' : '1px solid var(--input-border, #d1d5db)',
                    borderRadius: BORDER_RADIUS,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                    boxShadow: fieldErrors.animal_type_other ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onFocus={(e) => {
                    if (fieldErrors.animal_type_other) {
                      e.currentTarget.style.borderColor = '#ef4444';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
                    } else {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
                    }
                  }}
                  onBlur={(e) => {
                    if (fieldErrors.animal_type_other) {
                      e.currentTarget.style.borderColor = '#ef4444';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.15)';
                    } else {
                      e.currentTarget.style.borderColor = 'var(--input-border, #d1d5db)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                />
                {fieldErrors.animal_type_other && (
                  <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500, marginTop: 4, display: 'block' }}>
                    {fieldErrors.animal_type_other}
                  </span>
                )}
              </div>
            )}
          </div>

          <div id="field-animal_status">
            <SegmentedControl
              label="Ownership"
              options={[
                { value: 'owned', label: 'Owned' },
                { value: 'stray', label: 'Stray' },
                { value: 'unknown', label: 'Unknown' },
              ]}
              value={formData.animal_status || 'unknown'}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, animal_status: val as any }));
                setFieldErrors(fe => {
                  const next = { ...fe };
                  delete next.animal_status;
                  return next;
                });
              }}
              disabled={clinicalAssessmentLocked}
              error={fieldErrors.animal_status}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div id="field-animal_available">
            <SegmentedControl
              label="Available for 14-day observation"
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'unknown', label: 'Unknown' },
              ]}
              value={formData.animal_available || 'unknown'}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, animal_available: val as any }));
                setFieldErrors(fe => {
                  const next = { ...fe };
                  delete next.animal_available;
                  return next;
                });
              }}
              disabled={clinicalAssessmentLocked}
              error={fieldErrors.animal_available}
            />
          </div>

          <div id="field-animal_condition">
            <SegmentedControl
              label="Condition"
              options={[
                { value: 'healthy', label: 'Healthy' },
                { value: 'sick', label: 'Sick' },
                { value: 'died', label: 'Dead' },
                { value: 'unknown', label: 'Unknown' },
              ]}
              value={formData.animal_condition || 'unknown'}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, animal_condition: val as any }));
                setFieldErrors(fe => {
                  const next = { ...fe };
                  delete next.animal_condition;
                  return next;
                });
              }}
              disabled={clinicalAssessmentLocked}
              error={fieldErrors.animal_condition}
            />
          </div>
        </div>
      </FormSection>

      {/* 3. HISTORY */}
      <FormSection title="History">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div id="field-past_history_bite">
            <SegmentedControl
              label="Past animal bite"
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'unsure', label: 'Unsure' },
              ]}
              value={formData.past_history_bite || ''}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, past_history_bite: val }));
                setFieldErrors(fe => {
                  const next = { ...fe };
                  delete next.past_history_bite;
                  if (val !== 'yes') delete next.past_bite_dates;
                  return next;
                });
              }}
              disabled={isFormLocked}
              error={fieldErrors.past_history_bite}
            />
          </div>

          <div id="field-pep_completed">
            <SegmentedControl
              label="Previous rabies vaccination"
              options={[
                { value: 'completed', label: 'Completed' },
                { value: 'incomplete', label: 'Incomplete' },
                { value: 'none', label: 'None' },
                { value: 'unsure', label: 'Unsure' },
              ]}
              value={
                formData.pep_completed === 'yes'
                  ? 'completed'
                  : formData.pep_completed === 'no'
                  ? 'none'
                  : formData.pep_completed || ''
              }
              onChange={(val) => {
                setFormData(prev => ({ ...prev, pep_completed: val }));
                setFieldErrors(fe => {
                  const next = { ...fe };
                  delete next.pep_completed;
                  return next;
                });
              }}
              disabled={isFormLocked}
              error={fieldErrors.pep_completed}
            />
            {patientReportedIntake?.prior_pep_date && (
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#64748b' }}>
                Reported prior date: <strong>{patientReportedIntake.prior_pep_date}</strong>
              </p>
            )}
          </div>
        </div>

        {formData.past_history_bite === 'yes' && (
          <div id="field-past_bite_dates" style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: fieldErrors.past_bite_dates ? '#dc2626' : 'var(--text-h, #374151)', marginBottom: 6 }}>
              Approximate previous bite date(s)
            </label>
            <input
              type="text"
              value={formData.past_bite_dates || ''}
              onChange={handleFieldChange('past_bite_dates')}
              placeholder="Approximate previous bite date(s)"
              disabled={isFormLocked}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: fieldErrors.past_bite_dates ? '1.5px solid #ef4444' : '1px solid var(--input-border, #d1d5db)',
                borderRadius: BORDER_RADIUS,
                fontSize: 13,
                backgroundColor: isFormLocked ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                color: 'var(--input-text, #111827)',
                boxSizing: 'border-box',
                outline: 'none',
                boxShadow: fieldErrors.past_bite_dates ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                if (fieldErrors.past_bite_dates) {
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
                } else {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
                }
              }}
              onBlur={(e) => {
                if (fieldErrors.past_bite_dates) {
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.15)';
                } else {
                  e.currentTarget.style.borderColor = 'var(--input-border, #d1d5db)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            />
            {fieldErrors.past_bite_dates && (
              <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500, marginTop: 4, display: 'block' }}>
                {fieldErrors.past_bite_dates}
              </span>
            )}
          </div>
        )}
      </FormSection>

      {/* 4. VACCINATION RECORD */}
      <FormSection title="Vaccination record" showDivider={false}>
        {inventorySetupMessage && (
          <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid #fde68a', borderRadius: BORDER_RADIUS, color: '#92400e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <HugeiconsIcon icon={AlertCircleIcon} size={14} color="#92400e" />
            <span>{inventorySetupMessage}</span>
          </div>
        )}

        {/* Dose List: active/selected dose as DoseCard, other doses as DoseRow */}
        <div style={{ marginBottom: 12 }}>
          {candidateDoseList.map((dose) => {
            const isCompleted = Boolean(dose.is_completed || dose.inventory_linked);
            const isPrereqLocked = isDosePrerequisiteLocked(dose.period);
            const isLocked = readOnly || isCompleted || isPrereqLocked;
            const isExpanded = dose.period === currentExpandedPeriod;

            if (isExpanded) {
              const doseIndex = doses.findIndex(d => d.period === dose.period);
              return (
                <DoseCard
                  key={dose.period}
                  dose={dose}
                  index={doseIndex}
                  isToday={dose.period === activeUnlockedPeriod}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  prescribedVaccineType={prescribedVaccineType}
                  availableVaccineTypes={availableVaccineTypes}
                  fifoError={fifoErrors[dose.period]}
                  fieldErrors={fieldErrors}
                  readOnly={readOnly}
                  currentUser={currentUser}
                  applySignature={applySignature}
                  signatureReady={signatureReady}
                  signatureVersion={signatureVersion}
                  signatureLoadError={signatureLoadError}
                  onDoseChange={handleDoseChange}
                  onDoseVaccineTypeChange={handleDoseVaccineTypeChange}
                  onToggleSignature={setApplySignature}
                  onSignatureReady={() => setSignatureReady(true)}
                  onRefreshSignature={() => setSignatureRefresh(v => v + 1)}
                />
              );
            }

            return (
              <DoseRow
                key={dose.period}
                dose={dose}
                isCompleted={isCompleted}
                isPrerequisiteLocked={isPrereqLocked}
                prereqPeriod={PREREQ[dose.period]}
                onClick={() => setSelectedPeriod(dose.period)}
              />
            );
          })}
        </div>

        {/* Secondary text buttons below the list */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' }}>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setManualReExposure(v => !v);
                setShowFullSchedule(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: manualReExposure ? '#b45309' : '#047857',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {manualReExposure ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} color="#b45309" />
                  <span>Re-bite active</span>
                </span>
              ) : (
                'Re-bite / re-exposure'
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setTransferModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#047857',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            Transfer out / referral slip
          </button>
        </div>

        {/* Subtle helper line */}
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, marginBottom: 0 }}>
          Automatic FIFO stock deduction on save · Cross-clinic continuity supported
        </p>
      </FormSection>

      {/* PROPHYLAXIS (ATS / TT / RIG) ADMINISTRATION IF PRESCRIBED */}
      {(latestConsultation?.prophylaxis_orders && latestConsultation.prophylaxis_orders.length > 0) && (
        <div style={{ marginTop: 24, borderTop: '1px solid var(--border-color, #e5e7eb)', paddingTop: 20 }}>
          <ProphylaxisAdministrationSection
            orders={latestConsultation?.prophylaxis_orders}
            stock={prophylaxisStock}
            records={prophylaxisRecords}
            value={prophylaxisAdministrations}
            onChange={setProphylaxisAdministrations}
            disabled={readOnly || saving}
            today={getLocalDateString()}
            icdCode={icdCode}
            onIcdCodeChange={setIcdCode}
          />
        </div>
      )}

      {/* Sticky footer for inline mode */}
      {inline && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--card-bg-solid, #ffffff)',
            borderTop: '1px solid var(--border-color, #e5e7eb)',
            padding: '16px 0',
            marginTop: 24,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
            zIndex: 10,
          }}
        >
          <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} style={{ marginRight: 'auto' }} />
          {error && (
            <span style={{ fontSize: 13, color: '#ef4444', marginRight: 12, fontWeight: 500 }}>
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: BORDER_RADIUS,
              border: '1px solid var(--border-color, #d1d5db)',
              background: 'var(--card-bg-solid, #ffffff)',
              color: 'var(--text-secondary, #475569)',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || currentUser?.role === 'triage'}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: BORDER_RADIUS,
                border: 'none',
                background: '#047857',
                color: '#ffffff',
                cursor: (saving || currentUser?.role === 'triage') ? 'not-allowed' : 'pointer',
                opacity: (saving || currentUser?.role === 'triage') ? 0.6 : 1,
                transition: 'background-color 0.15s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              {saving ? 'Saving…' : `Save and record ${activeUnlockedPeriod}`}
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
            <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving || currentUser?.role === 'triage'}>
              {saving ? 'Saving…' : `Save and record ${activeUnlockedPeriod}`}
            </button>
          )}
        </>
      }
    >
      {formContent}
    </FormModal>
  );
}
