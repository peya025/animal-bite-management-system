import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import type { Patient, DuplicatePatientMatch, PsgcItem } from '../types';
import { checkDuplicatePatients } from '../services';
import {
  MISAMIS_ORIENTAL_MUNICIPALITIES,
  FALLBACK_BARANGAYS,
} from '../hooks/useAddressLocation';

const PSGC = 'https://psgc.gitlab.io/api';

const EXTENDED_FALLBACK_BARANGAYS: Record<string, PsgcItem[]> = {
  ...FALLBACK_BARANGAYS,
  '104324000': [ // Tagoloan
    { code: '104324001', name: 'Baluarte' },
    { code: '104324002', name: 'Casinglot' },
    { code: '104324003', name: 'Gracia' },
    { code: '104324004', name: 'Mohon' },
    { code: '104324005', name: 'Natumolan' },
    { code: '104324006', name: 'Poblacion' },
    { code: '104324007', name: 'Rosario' },
    { code: '104324008', name: 'Santa Ana' },
    { code: '104324009', name: 'Santa Cruz' },
    { code: '104324010', name: 'Sugbongcogon' },
    { code: '104324011', name: 'San Francisco' },
    { code: '104324012', name: 'San Isidro' },
    { code: '104324013', name: 'Tugatog' },
    { code: '104324014', name: 'Lower Becerril' },
    { code: '104324015', name: 'Upper Becerril' },
  ],
  '104311000': [ // Jasaan
    { code: '104311001', name: 'Aplaya' },
    { code: '104311002', name: 'Bobontugan' },
    { code: '104311003', name: 'Corrales' },
    { code: '104311004', name: 'Dana-o' },
    { code: '104311005', name: 'Jampason' },
    { code: '104311006', name: 'Kimaya' },
    { code: '104311007', name: 'Lower Jasaan' },
    { code: '104311008', name: 'Luz Banzon' },
    { code: '104311009', name: 'Natubo' },
    { code: '104311010', name: 'Poblacion' },
    { code: '104311011', name: 'San Antonio' },
    { code: '104311012', name: 'San Isidro' },
    { code: '104311013', name: 'San Nicolas' },
    { code: '104311014', name: 'Solana' },
    { code: '104311015', name: 'Upper Jasaan' },
  ],
  '104302000': [ // Balingasag
    { code: '104302001', name: 'Baliwagan' },
    { code: '104302002', name: 'Binitinan' },
    { code: '104302003', name: 'Blanco' },
    { code: '104302004', name: 'Calawag' },
    { code: '104302005', name: 'Camuayan' },
    { code: '104302006', name: 'Cogon' },
    { code: '104302007', name: 'Dansuli' },
    { code: '104302008', name: 'Dumarait' },
    { code: '104302009', name: 'Hermano' },
    { code: '104302010', name: 'Kauswagan' },
    { code: '104302011', name: 'Linabu' },
    { code: '104302012', name: 'Linggangao' },
    { code: '104302013', name: 'Mambayaan' },
    { code: '104302014', name: 'Mandangoa' },
    { code: '104302015', name: 'Napaliran' },
    { code: '104302016', name: 'Poblacion' },
    { code: '104302017', name: 'San Francisco' },
    { code: '104302018', name: 'San Isidro' },
    { code: '104302019', name: 'San Juan' },
    { code: '104302020', name: 'Talusan' },
    { code: '104302021', name: 'Waterfall' },
  ],
  '104321000': [ // Opol
    { code: '104321001', name: 'Barra' },
    { code: '104321002', name: 'Bonbon' },
    { code: '104321003', name: 'Cauyonan' },
    { code: '104321004', name: 'Igpit' },
    { code: '104321005', name: 'Limonda' },
    { code: '104321006', name: 'Lower Patag' },
    { code: '104321007', name: 'Luyong Bonbon' },
    { code: '104321008', name: 'Malanang' },
    { code: '104321009', name: 'Nangcaon' },
    { code: '104321010', name: 'Patag' },
    { code: '104321011', name: 'Poblacion' },
    { code: '104321012', name: 'Taboc' },
    { code: '104321013', name: 'Upper Patag' },
  ],
  '104305000': [ // CDO
    { code: '104305001', name: 'Agusan' },
    { code: '104305002', name: 'Balulang' },
    { code: '104305003', name: 'Bayabas' },
    { code: '104305004', name: 'Bonbon' },
    { code: '104305005', name: 'Bugo' },
    { code: '104305006', name: 'Bulua' },
    { code: '104305007', name: 'Camaman-an' },
    { code: '104305008', name: 'Carmen' },
    { code: '104305009', name: 'Consolacion' },
    { code: '104305010', name: 'Cugman' },
    { code: '104305011', name: 'Gusa' },
    { code: '104305012', name: 'Iponan' },
    { code: '104305013', name: 'Kauswagan' },
    { code: '104305014', name: 'Lapasan' },
    { code: '104305015', name: 'Macabalan' },
    { code: '104305016', name: 'Macasandig' },
    { code: '104305017', name: 'Nazareth' },
    { code: '104305018', name: 'Patag' },
    { code: '104305019', name: 'Poblacion' },
    { code: '104305020', name: 'Puerto' },
    { code: '104305021', name: 'Puntod' },
    { code: '104305022', name: 'Tablon' },
  ],
};

interface OnlineIntakeCheckInModalProps {
  open: boolean;
  patient: Patient | null;
  intake: any;
  onClose: () => void;
  onSuccess: (data: {
    patientName: string;
    patientNumber: string;
    queueNumber: number | string;
    station: string;
  }) => void;
}

function getManilaDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getManilaTimeString(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function formatPatientName(patient: Patient | null): string {
  if (!patient) return '';
  return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ').trim() || 'Patient';
}

function formatExposureType(type?: string | null): string {
  if (!type) return 'Bite Exposure';
  const map: Record<string, string> = {
    transdermal_bite: 'Transdermal bite',
    scratch_abrasion: 'Scratch / abrasion',
    nibbling_uncovered_skin: 'Nibbling on uncovered skin',
    nibbling_broken_skin: 'Licking on broken skin / mucous',
    bite: 'Bite',
    scratch: 'Scratch',
  };
  return map[type] || type.replace(/_/g, ' ');
}

export default function OnlineIntakeCheckInModal({
  open,
  patient,
  intake,
  onClose,
  onSuccess,
}: OnlineIntakeCheckInModalProps) {
  const { user } = useAuth();

  const [consultationDate, setConsultationDate] = useState(getManilaDateString());
  const [consultationTime, setConsultationTime] = useState(getManilaTimeString());
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [attendingProvider, setAttendingProvider] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [modeOfTransaction, setModeOfTransaction] = useState('online');

  // Referral toggle and Cascading Location state
  const [hasReferralPaper, setHasReferralPaper] = useState(false);
  const [municipalityCode, setMunicipalityCode] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);
  const [loadingBrgy, setLoadingBrgy] = useState(false);

  // Split Blood Pressure: systolic / diastolic
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Layer 2 Link & Merge: Duplicate check state
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicatePatientMatch | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [dismissDuplicate, setDismissDuplicate] = useState(false);
  const [merging, setMerging] = useState(false);

  // Cascading barangays loader for referral facility
  useEffect(() => {
    if (!municipalityCode || municipalityCode === 'other') {
      setBarangays([]);
      return;
    }
    setLoadingBrgy(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    fetch(`${PSGC}/cities-municipalities/${municipalityCode}/barangays/`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('API failed');
        return r.json();
      })
      .then((d: PsgcItem[]) => {
        if (Array.isArray(d) && d.length > 0) {
          setBarangays(d.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          throw new Error('Empty response');
        }
      })
      .catch(() => {
        const fallback = EXTENDED_FALLBACK_BARANGAYS[municipalityCode] || [];
        setBarangays(fallback);
      })
      .finally(() => {
        clearTimeout(timer);
        setLoadingBrgy(false);
      });
  }, [municipalityCode]);

  const handleMunicipalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setMunicipalityCode(code);
    setBarangayName('');
    if (code === 'other') {
      setReferredBy('Other Facility (Specify)');
    } else if (!code) {
      setReferredBy('');
    }
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setBarangayName(name);
    if (!name) return;
    const munObj = MISAMIS_ORIENTAL_MUNICIPALITIES.find((m) => m.code === municipalityCode);
    const munName = munObj?.name || 'Tagoloan';
    if (name.toLowerCase() === 'poblacion') {
      setReferredBy(`${munName} Rural Health Unit (RHU) / BHS`);
    } else {
      setReferredBy(`Barangay ${name} Health Station (BHS)`);
    }
  };

  const handleSystolicChange = (val: string) => {
    setSystolic(val);
    const combined = val || diastolic ? `${val}/${diastolic}` : '';
    setBloodPressure(combined);
  };

  const handleDiastolicChange = (val: string) => {
    setDiastolic(val);
    const combined = systolic || val ? `${systolic}/${val}` : '';
    setBloodPressure(combined);
  };

  useEffect(() => {
    if (open && patient) {
      setConsultationDate(getManilaDateString());
      setConsultationTime(getManilaTimeString());

      const referralFacility = intake?.referral_facility || intake?.referral_source || '';
      const hasOnlineReferral = Boolean(
        referralFacility ||
        intake?.referral_provider_name ||
        intake?.referral_blood_pressure ||
        intake?.referral_document_photo
      );

      setHasReferralPaper(hasOnlineReferral);
      setModeOfTransaction(hasOnlineReferral ? 'referral' : 'online');
      setReferredBy(referralFacility);
      setMunicipalityCode('');
      setBarangayName('');

      const rawBP = intake?.referral_blood_pressure || '';
      if (rawBP && rawBP.includes('/')) {
        const [sys, dia] = rawBP.split('/');
        setSystolic(sys || '');
        setDiastolic(dia || '');
        setBloodPressure(rawBP);
      } else {
        setSystolic('');
        setDiastolic('');
        setBloodPressure('');
      }

      setTemperature(intake?.referral_temperature || '');
      setWeight(intake?.referral_weight || '');
      setHeight(intake?.referral_height || '');
      setAttendingProvider(intake?.referral_provider_name || user?.name || '');
      setError('');
      setSubmitting(false);
      setDismissDuplicate(false);
      setDuplicateMatch(null);

      // Check for existing walk-in or clinic records with matching demographics
      const patientId = Number(patient.patient_id || (patient as any).id);
      if (patient.first_name && patient.last_name) {
        setCheckingDuplicates(true);
        checkDuplicatePatients({
          first_name: patient.first_name,
          last_name: patient.last_name,
          middle_name: patient.middle_name || undefined,
          date_of_birth: patient.date_of_birth || undefined,
          exclude_patient_id: patientId,
        })
          .then((res) => {
            const match = res.matches?.find((m) => m.match_tier === 'exact') || res.matches?.[0] || null;
            if (match) {
              setDuplicateMatch(match);
            }
          })
          .catch((err) => {
            console.warn('Failed to check duplicate patients:', err);
          })
          .finally(() => {
            setCheckingDuplicates(false);
          });
      }
    }
  }, [open, patient, intake, user]);

  if (!open || !patient) return null;

  const intakeId = Number(intake?.intake_id ?? intake?.id);
  const patientDisplayName = formatPatientName(patient);
  const referralFacility = intake?.referral_facility || intake?.referral_source;
  const hasReferral = Boolean(
    referralFacility ||
    intake?.referral_provider_name ||
    intake?.referral_blood_pressure ||
    intake?.referral_document_photo
  );

  const referralPhoto = intake?.referral_document_photo;
  const validPhoto = typeof referralPhoto === 'string' &&
    referralPhoto.length <= 2796236 && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(referralPhoto);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (!Number.isInteger(intakeId) || intakeId <= 0) {
      setError('The mobile bite intake could not be identified. Please refresh the page and try again.');
      return;
    }

    let finalBP: string | undefined = undefined;
    const sysTrim = systolic.trim();
    const diaTrim = diastolic.trim();
    if (sysTrim || diaTrim) {
      if (!sysTrim || !diaTrim) {
        setError('Both systolic and diastolic values are required for blood pressure (e.g. 120/80).');
        return;
      }
      finalBP = `${sysTrim}/${diaTrim}`;
      if (!/^\d{2,3}\/\d{2,3}$/.test(finalBP)) {
        setError('Blood Pressure must be formatted as systolic/diastolic (e.g. 120/80).');
        return;
      }
    }

    if (temperature.trim()) {
      const tempNum = Number(temperature.trim());
      if (isNaN(tempNum) || tempNum < 30 || tempNum > 45) {
        setError('Temperature must be a valid number between 30 and 45 °C.');
        return;
      }
    }

    if (height.trim()) {
      const hNum = Number(height.trim());
      if (isNaN(hNum) || hNum < 20 || hNum > 250) {
        setError('Height must be a valid number between 20 and 250 cm.');
        return;
      }
    }

    if (weight.trim()) {
      const wNum = Number(weight.trim());
      if (isNaN(wNum) || wNum < 0.5 || wNum > 300) {
        setError('Weight must be a valid number between 0.5 and 300 kg.');
        return;
      }
    }

    if (hasReferralPaper && !referredBy.trim()) {
      setError('Referring Health Center / Facility Name is required when referral form is selected.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post(`/bite-intakes/${intakeId}/check-in`, {
        consultation_date: consultationDate || getManilaDateString(),
        consultation_time: consultationTime || getManilaTimeString(),
        blood_pressure: finalBP,
        temperature: temperature.trim() ? Number(temperature.trim()) : undefined,
        weight: weight.trim() ? Number(weight.trim()) : undefined,
        height: height.trim() ? Number(height.trim()) : undefined,
        attending_provider: attendingProvider.trim() || user?.name || undefined,
        referred_by: hasReferralPaper && referredBy.trim() ? referredBy.trim() : undefined,
        mode_of_transaction: hasReferralPaper ? 'referral' : 'online',
      });

      const queue = response.data?.queue;
      onSuccess({
        patientName: patientDisplayName,
        patientNumber: patient.patient_number || '',
        queueNumber: response.data?.queue_number || queue?.queue_number || '',
        station: 'Doctor Assessment',
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Unable to check in this mobile bite intake. Please check the entered data and try again.'
      );
      setSubmitting(false);
    }
  };

  const handleMergeAndCheckIn = async (canonicalPatientId: number) => {
    if (submitting || merging) return;
    const patientId = Number(patient.patient_id || (patient as any).id);

    let finalBP: string | undefined = undefined;
    const sysTrim = systolic.trim();
    const diaTrim = diastolic.trim();
    if (sysTrim || diaTrim) {
      if (!sysTrim || !diaTrim) {
        setError('Both systolic and diastolic values are required for blood pressure (e.g. 120/80).');
        return;
      }
      finalBP = `${sysTrim}/${diaTrim}`;
      if (!/^\d{2,3}\/\d{2,3}$/.test(finalBP)) {
        setError('Blood Pressure must be formatted as systolic/diastolic (e.g. 120/80).');
        return;
      }
    }

    if (temperature.trim()) {
      const tempNum = Number(temperature.trim());
      if (isNaN(tempNum) || tempNum < 30 || tempNum > 45) {
        setError('Temperature must be a valid number between 30 and 45 °C.');
        return;
      }
    }

    if (height.trim()) {
      const hNum = Number(height.trim());
      if (isNaN(hNum) || hNum < 20 || hNum > 250) {
        setError('Height must be a valid number between 20 and 250 cm.');
        return;
      }
    }

    if (weight.trim()) {
      const wNum = Number(weight.trim());
      if (isNaN(wNum) || wNum < 0.5 || wNum > 300) {
        setError('Weight must be a valid number between 0.5 and 300 kg.');
        return;
      }
    }

    if (hasReferralPaper && !referredBy.trim()) {
      setError('Referring Health Center / Facility Name is required when referral form is selected.');
      return;
    }

    setMerging(true);
    setError('');

    try {
      const response = await api.post(`/patients/${patientId}/merge-online-booking`, {
        canonical_patient_id: canonicalPatientId,
        consultation_date: consultationDate || getManilaDateString(),
        consultation_time: consultationTime || getManilaTimeString(),
        blood_pressure: finalBP,
        temperature: temperature.trim() ? Number(temperature.trim()) : undefined,
        weight: weight.trim() ? Number(weight.trim()) : undefined,
        height: height.trim() ? Number(height.trim()) : undefined,
        attending_provider: attendingProvider.trim() || user?.name || undefined,
        referred_by: hasReferralPaper && referredBy.trim() ? referredBy.trim() : undefined,
        mode_of_transaction: hasReferralPaper ? 'referral' : 'online',
      });

      const mergedPatient = response.data?.patient;
      const checkIn = response.data?.check_in;
      const queue = checkIn?.queue;

      onSuccess({
        patientName: mergedPatient?.name || duplicateMatch?.full_name || patientDisplayName,
        patientNumber: mergedPatient?.patient_number || duplicateMatch?.patient_number || '',
        queueNumber: checkIn?.queue_number || queue?.queue_number || '',
        station: 'Doctor Assessment',
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Failed to merge online booking into existing clinic chart. Please try again.'
      );
      setMerging(false);
    }
  };

  return (
    <FormModal
      title="Online Patient Check-In &amp; Vitals"
      subtitle={`Mobile Bite Intake Review • ${patientDisplayName} (${patient.patient_number || 'Online Registration'})`}
      onClose={onClose}
      maxWidth={680}
      footer={
        <>
          <button
            type="button"
            className="fm-btn fm-btn--cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fm-btn fm-btn--submit"
            onClick={() => handleSubmit()}
            disabled={submitting}
            style={{
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            {submitting ? 'Checking In…' : 'Confirm Check In to Doctor Triage'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* Layer 2 Link & Merge: Existing Clinic Chart Detected Alert */}
        {duplicateMatch && !dismissDuplicate && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#fffbeb',
              border: '1px solid #f59e0b',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#92400e', fontSize: '13px' }}>
              <span>⚠️ Potential Existing Clinic Chart Detected</span>
            </div>
            <div style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
              This online-booked patient matches existing clinic chart:{' '}
              <strong style={{ color: '#92400e' }}>{duplicateMatch.full_name} (#{duplicateMatch.patient_number})</strong>
              {duplicateMatch.has_completed_primary && (
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  Primary PEP Completed
                </span>
              )}
              {duplicateMatch.last_visit_date && (
                <div style={{ marginTop: '3px', fontSize: '12px', color: '#b45309' }}>
                  Last clinic visit: {duplicateMatch.last_visit_date}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={merging || submitting}
                onClick={() => handleMergeAndCheckIn(duplicateMatch.patient_id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: merging || submitting ? 'not-allowed' : 'pointer',
                  opacity: merging ? 0.7 : 1,
                }}
              >
                {merging ? 'Linking & Checking In…' : '🔗 Link to Existing Chart & Check In'}
              </button>
              <button
                type="button"
                disabled={merging || submitting}
                onClick={() => setDismissDuplicate(true)}
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                }}
              >
                Keep as Separate Patient
              </button>
            </div>
          </div>
        )}

        {/* 1. Patient & Incident Exposure Summary */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '12.5px',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span>Patient &amp; Reported Bite Incident</span>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              {patient.gender ? `${patient.gender} · ` : ''}{patient.age ? `${patient.age} yrs` : ''}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '8px 16px',
              color: '#334155',
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Date of Incident</span>
              <strong style={{ color: '#0f172a' }}>{intake?.bite_date || '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Animal &amp; Exposure Type</span>
              <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>
                {intake?.animal_type || 'Animal'} · {formatExposureType(intake?.exposure_type)}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Incident Place</span>
              <span style={{ color: '#0f172a' }}>{intake?.bite_place || 'Tagoloan, Misamis Oriental'}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Wound Location</span>
              <span style={{ color: '#0f172a' }}>{intake?.wound_location || intake?.body_part_exposed || '—'}</span>
            </div>
            {(intake?.patient_description || intake?.incident_narrative) && (
              <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Patient Description</span>
                <span style={{ color: '#334155', fontStyle: 'italic' }}>
                  "{intake.patient_description || intake.incident_narrative}"
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Referral Information Section */}
        <div
          style={{
            backgroundColor: hasReferralPaper ? '#f0fdf4' : '#f8fafc',
            border: `1.5px solid ${hasReferralPaper ? '#86efac' : '#cbd5e1'}`,
            borderRadius: '10px',
            padding: '16px',
            fontSize: '12.5px',
          }}
        >
          {/* Mode of Transaction Segmented Selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="fm-label" style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-h, #374151)' }}>
                Mode of Transaction / Referral Status
              </label>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: hasReferralPaper ? '#059669' : '#e2e8f0',
                  color: hasReferralPaper ? '#ffffff' : '#475569',
                }}
              >
                {hasReferralPaper ? 'Referral Transaction' : 'Direct Online Booking'}
              </span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                backgroundColor: '#e2e8f0',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: 3,
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setHasReferralPaper(false);
                  setModeOfTransaction('online');
                }}
                disabled={submitting}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: '12.5px',
                  fontWeight: !hasReferralPaper ? 700 : 500,
                  backgroundColor: !hasReferralPaper ? '#059669' : 'transparent',
                  color: !hasReferralPaper ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ● Online (No Referral)
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasReferralPaper(true);
                  setModeOfTransaction('referral');
                }}
                disabled={submitting}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: '12.5px',
                  fontWeight: hasReferralPaper ? 700 : 500,
                  backgroundColor: hasReferralPaper ? '#059669' : 'transparent',
                  color: hasReferralPaper ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ● Has Referral Paper Form
              </button>
            </div>
          </div>

          {!hasReferralPaper ? (
            /* Online Booking without Referral Card */
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontWeight: 600, fontSize: '13px' }}>
                <span style={{ fontSize: '15px' }}>ℹ️</span>
                <span>Direct Online Booking (No External Referral)</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                The patient booked directly online without an external health center / BHS referral.
                No referring facility will be linked. Please measure and record their clinic baseline vitals below.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setHasReferralPaper(true);
                    setModeOfTransaction('referral');
                  }}
                  disabled={submitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#059669',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  📄 Patient presented a physical referral paper form at the desk
                </button>
              </div>
            </div>
          ) : (
            /* Cascading Referral Location: City/Mun -> Barangay -> Facility Name */
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <label className="fm-label" style={{ fontWeight: 600, fontSize: 13, display: 'block', color: '#166534' }}>
                  <span>Referred by</span> <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                  Select referring facility location from referral paper form, or enter facility name manually.
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '14px 18px',
                }}
              >
                {/* 1. City / Municipality */}
                <div className="fm-field">
                  <label className="fm-label" style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                    1. City / Municipality
                  </label>
                  <select
                    className="fm-select"
                    value={municipalityCode}
                    onChange={handleMunicipalityChange}
                    disabled={submitting}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">— Select Municipality —</option>
                    {MISAMIS_ORIENTAL_MUNICIPALITIES.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))}
                    <option value="other">Other / Outside MisOr</option>
                  </select>
                </div>

                {/* 2. Barangay */}
                <div className="fm-field">
                  <label className="fm-label" style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                    2. Barangay
                  </label>
                  <select
                    className="fm-select"
                    value={barangayName}
                    onChange={handleBarangayChange}
                    disabled={submitting || municipalityCode === 'other' || !municipalityCode}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">
                      {loadingBrgy
                        ? 'Loading…'
                        : !municipalityCode
                        ? '— Select Municipality First —'
                        : '— Select Barangay —'}
                    </option>
                    {barangays.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Health Center / Facility Name */}
              <div className="fm-field">
                <label className="fm-label" style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                  <span>3. Health Center / Facility Name</span> <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  className="fm-input"
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="e.g. Barangay Health Station / Rural Health Unit"
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Auto-populates from municipality &amp; barangay, or can be specified manually
                </span>
              </div>

              {/* Pre-arrival referral summary if submitted via mobile */}
              {hasReferral && (
                <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px dashed #a7f3d0' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#065f46', marginBottom: 6 }}>
                    📱 Mobile Pre-Arrival Referral Information:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '6px 14px',
                      fontSize: '12px',
                      color: '#334155',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Mobile Recorded Facility</span>
                      <strong>{referralFacility || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Pre-Arrival BP</span>
                      <strong>{intake?.referral_blood_pressure ? `${intake.referral_blood_pressure} mmHg` : 'Not recorded'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Pre-Arrival Temp</span>
                      <strong>{intake?.referral_temperature ? `${intake.referral_temperature} °C` : 'Not recorded'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Pre-Arrival Ht / Wt</span>
                      <strong>
                        {intake?.referral_height ? `${intake.referral_height} cm` : '—'} / {intake?.referral_weight ? `${intake.referral_weight} kg` : '—'}
                      </strong>
                    </div>
                  </div>

                  {validPhoto && (
                    <details style={{ marginTop: 8, borderTop: '1px dashed #a7f3d0', paddingTop: 8 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#047857', fontSize: '12px' }}>
                        🔍 View Attached Referral Paper Form Photo
                      </summary>
                      <img
                        src={referralPhoto}
                        alt="Referral Form attached by patient"
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: 380,
                          objectFit: 'contain',
                          marginTop: 10,
                          borderRadius: 8,
                          border: '1px solid #94a3b8',
                        }}
                      />
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Station 1 Registration Vital Signs & Consultation Details */}
        <div className="fm-section" style={{ marginTop: 4 }}>
          <h3
            className="fm-section-title"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#10b981',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '6px',
              paddingBottom: '8px',
              borderBottom: '1px solid #ecfdf5',
            }}
          >
            III. CONSULTATION DETAILS &amp; VITALS
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', margin: '0 0 16px', lineHeight: 1.4 }}>
            Entered by Registration Staff from the patient's referral paper or intake form. These values will be visible to the attending doctor in read-only mode.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Row 1: Date + Time */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '14px 18px',
              }}
            >
              <div className="fm-field">
                <label className="fm-label">
                  <span>Date of Consultation</span> <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="fm-input"
                  type="date"
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  value={consultationDate}
                  onChange={(e) => setConsultationDate(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="fm-field">
                <label className="fm-label">
                  <span>Consultation Time (AM/PM)</span> <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="fm-input"
                  type="time"
                  value={consultationTime}
                  onChange={(e) => setConsultationTime(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Row 2: Blood Pressure (Systolic / Diastolic) + Temperature */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '14px 18px',
              }}
            >
              <div className="fm-field">
                <label className="fm-label">
                  <span>Blood Pressure (mmHg)</span> <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--input-border, #e5e7eb)',
                    borderRadius: 8,
                    minHeight: 44,
                    height: 44,
                    background: 'var(--input-bg, #fff)',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    width: '100%',
                    padding: '0 8px',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      e.currentTarget.style.borderColor = 'var(--input-border, #e5e7eb)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={systolic}
                    onChange={(e) => handleSystolicChange(e.target.value)}
                    placeholder="120"
                    aria-label="Systolic Blood Pressure"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      width: '45%',
                      padding: '8px 4px',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      backgroundColor: 'transparent',
                      textAlign: 'center',
                      color: 'var(--input-text, #111827)',
                      fontFamily: 'inherit',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--text-secondary, #6b7280)',
                      padding: '0 6px',
                      userSelect: 'none',
                    }}
                  >
                    /
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={diastolic}
                    onChange={(e) => handleDiastolicChange(e.target.value)}
                    placeholder="80"
                    aria-label="Diastolic Blood Pressure"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      width: '45%',
                      padding: '8px 4px',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      backgroundColor: 'transparent',
                      textAlign: 'center',
                      color: 'var(--input-text, #111827)',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div className="fm-field">
                <label className="fm-label">
                  <span>Temperature (°C)</span> <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="fm-input"
                  type="text"
                  placeholder="36.5"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Row 3: Height + Weight */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '14px 18px',
              }}
            >
              <div className="fm-field">
                <label className="fm-label">
                  <span>Height (cm)</span> <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="fm-input"
                  type="text"
                  placeholder="170"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="fm-field">
                <label className="fm-label">
                  <span>Weight (kg)</span> <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="fm-input"
                  type="text"
                  placeholder="70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Row 4: Attending Provider */}
            <div className="fm-field">
              <label className="fm-label">
                <span>Attending Provider / Officer</span>
              </label>
              <input
                className="fm-input"
                type="text"
                placeholder="e.g. Dr. Juan Dela Cruz / Registration Officer"
                value={attendingProvider}
                onChange={(e) => setAttendingProvider(e.target.value)}
                disabled={submitting}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: 11, color: '#64748b' }}>
                From patient's referral paper form or registration staff on duty
              </span>
            </div>
          </div>
        </div>
      </form>
    </FormModal>
  );
}
