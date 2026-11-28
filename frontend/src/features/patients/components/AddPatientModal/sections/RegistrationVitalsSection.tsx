import OnlineReferralPhoto from '../../OnlineReferralPhoto';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { FormField } from './FormField';
import { SearchableSelect } from '../../../../../components/forms/SearchableSelect';
import { RegistrationErrors } from '../registrationAccessibility';
import type { EnrolmentFormData } from '../../../types';
import { useClinicModuleConfig } from '../../../../../hooks/useClinicModuleConfig';
import { NATURE_OF_VISIT_OPTIONS } from '../../../../consultations/constants/consultation.constants';
import {
  formatTemperatureInput,
  handleTemperatureKeyDown,
  normalizeTemperatureOnBlur,
} from '../../../../../shared/utils/temperature';
import {
  MISAMIS_ORIENTAL_MUNICIPALITIES,
  FALLBACK_BARANGAYS,
  suggestReferralFacility,
} from '../../../hooks/useAddressLocation';
import type { PsgcItem } from '../../../types';

const PSGC = 'https://psgc.gitlab.io/api';

// Fallback barangays shared with ReferralLocationSelector (same source of truth)
const EXTENDED_FALLBACK_BARANGAYS: Record<string, PsgcItem[]> = {
  ...FALLBACK_BARANGAYS,
  '104324000': [
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
  '104311000': [
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
  '104302000': [
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
  '104321000': [
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
  '104305000': [
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
    { code: '104305018', name: 'Poblacion' },
    { code: '104305019', name: 'Puerto' },
    { code: '104305020', name: 'Puntod' },
    { code: '104305021', name: 'Tablon' },
  ],
};

export interface RegistrationVitalsFields extends Pick<EnrolmentFormData, 'animal_type' | 'animal_type_others' | 'animal_status' | 'animal_available' | 'animal_condition'> {
  reg_date_of_consultation: string;
  reg_consultation_time: string;
  reg_blood_pressure: string;
  reg_temperature: string;
  reg_height: string;
  reg_weight: string;
  reg_attending_provider: string;
  reg_referred_by: string;
  mode_of_transaction?: 'walk-in' | 'visited' | 'referral' | string;
  nature_of_visit: 'new_consultation' | 'new_admission' | 'follow_up' | '';
}

export interface RegistrationVitalsSectionProps<T extends RegistrationVitalsFields = any> {
  referralPatient?: React.ComponentProps<typeof OnlineReferralPhoto>['patient'];
  data: T;
  onChange: (
    key: any
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onDirectChange: (key: any, value: string) => void;
  layout?: 'default' | 'two-column';
  errors?: Record<string, string>;
  sectionStartNumber?: 2 | 3;
  strictBpFormat?: boolean;
}

/**
 * For CHU / RHU Personnel Only, Consultation Details & Vitals, and Nature of Visit.
 *
 * Entered by Registration Staff during patient registration (Add Patient)
 * and during Re-Exposure registration check-in.
 * Values are saved to the treatment_records table (see PatientController::store & BiteCaseController::registerNewExposure).
 * Displayed read-only in Form 2 (ReferralSection, VitalsConsultationSection, NatureOfVisitSection).
 * Displayed in Form 1 print via patient-enrolment.blade.php.
 *
 * Field mapping to treatment_records columns:
 *   mode_of_transaction       → mode_of_transaction ('walk-in' | 'visited' | 'referral')
 *   reg_date_of_consultation  → consultation_date
 *   reg_consultation_time     → consultation_time
 *   reg_blood_pressure        → blood_pressure  (stored as "systolic/diastolic")
 *   reg_temperature           → temperature
 *   reg_height                → height
 *   reg_weight                → weight
 *   reg_attending_provider    → attending_provider
 *   reg_referred_by           → referred_by  (full facility name string)
 *   nature_of_visit           → nature_of_visit ('new_consultation' | 'new_admission' | 'follow_up')
 */
export function RegistrationVitalsSection<T extends RegistrationVitalsFields = any>({
  data,
  onChange,
  onDirectChange,
  layout = 'two-column',
  errors: propsErrors,
  referralPatient,
  sectionStartNumber = 2,
  strictBpFormat = false,
}: RegistrationVitalsSectionProps<T>) {
  const contextErrors = useContext(RegistrationErrors);
  const errors = propsErrors || contextErrors || {};
  const { isFieldVisible, isFieldRequired, isSectionEnabled } = useClinicModuleConfig();
  const isReferral = (data.mode_of_transaction || '').toLowerCase() === 'referral';
  const sectionLabels = sectionStartNumber === 3
    ? { personnel: 'III', vitals: 'IV' }
    : { personnel: 'II', vitals: 'III' };

  const systolicInputRef = useRef<HTMLInputElement>(null);
  const diastolicInputRef = useRef<HTMLInputElement>(null);

  // --- Blood pressure split/combine ---
  const splitBP = (bp: string) => {
    if (!bp) return { systolic: '', diastolic: '' };
    const parts = bp.split('/');
    return { systolic: parts[0] ?? '', diastolic: parts[1] ?? '' };
  };
  const { systolic, diastolic } = splitBP(data.reg_blood_pressure);

  const handleSystolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (strictBpFormat) {
      const raw = e.target.value;
      if (raw.includes('/')) {
        const [left = '', right = ''] = raw.split('/');
        const sys = left.replace(/\D/g, '').slice(0, 3);
        const dia = right.replace(/\D/g, '').slice(0, 3);
        const combined = sys || dia ? `${sys}/${dia}` : '';
        onDirectChange('reg_blood_pressure', combined);
        diastolicInputRef.current?.focus();
        return;
      }
      const digits = raw.replace(/\D/g, '');
      if (digits.length > 3 && !diastolic) {
        const sys = digits.slice(0, 3);
        const dia = digits.slice(3, 6);
        onDirectChange('reg_blood_pressure', `${sys}/${dia}`);
        diastolicInputRef.current?.focus();
        return;
      }
      const sys = digits.slice(0, 3);
      const combined = sys || diastolic ? `${sys}/${diastolic}` : '';
      onDirectChange('reg_blood_pressure', combined);
      if (sys.length === 3 && systolic.length < 3) {
        diastolicInputRef.current?.focus();
      }
      return;
    }
    const sys = e.target.value;
    const combined = sys || diastolic ? `${sys}/${diastolic}` : '';
    onDirectChange('reg_blood_pressure', combined);
  };

  const handleDiastolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (strictBpFormat) {
      const dia = e.target.value.replace(/\D/g, '').slice(0, 3);
      const combined = systolic || dia ? `${systolic}/${dia}` : '';
      onDirectChange('reg_blood_pressure', combined);
      return;
    }
    const dia = e.target.value;
    const combined = systolic || dia ? `${systolic}/${dia}` : '';
    onDirectChange('reg_blood_pressure', combined);
  };

  const handleBpKeyDown = (side: 'systolic' | 'diastolic') => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!strictBpFormat) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'Home', 'End',
    ];

    if (side === 'systolic' && e.key === '/') {
      e.preventDefault();
      diastolicInputRef.current?.focus();
      return;
    }

    if (side === 'diastolic' && e.key === 'Backspace' && diastolic.length === 0) {
      systolicInputRef.current?.focus();
      return;
    }

    if (allowedKeys.includes(e.key)) return;

    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    const input = e.currentTarget;
    const hasSelection = input.selectionStart !== null
      && input.selectionEnd !== null
      && input.selectionStart !== input.selectionEnd;
    if (!hasSelection && input.value.length >= 3) {
      e.preventDefault();
    }
  };

  // --- Referred By: municipality/barangay cascade (same logic as ReferralLocationSelector) ---
  const [municipalityCode, setMunicipalityCode] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);
  const [loadingBrgy, setLoadingBrgy] = useState(false);

  useEffect(() => {
    if (!municipalityCode || municipalityCode === 'other') {
      setBarangays([]);
      return;
    }
    setLoadingBrgy(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    fetch(`${PSGC}/cities-municipalities/${municipalityCode}/barangays/`, { signal: controller.signal })
      .then(r => {
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

  const handleMunicipalityChange = (code: string) => {
    setMunicipalityCode(code);
    setBarangayName('');
    if (code === 'other') {
      onDirectChange('reg_referred_by', 'Other Facility (Specify)');
    } else if (!code) {
      onDirectChange('reg_referred_by', '');
    }
  };

  const handleBarangayChange = (name: string) => {
    setBarangayName(name);
    if (!name) return;
    onDirectChange('reg_referred_by', suggestReferralFacility(name));
  };

  const referralMunicipalityOptions = [
    ...MISAMIS_ORIENTAL_MUNICIPALITIES.map(m => ({ value: m.code, label: m.name })),
    { value: 'other', label: 'Other / Outside MisOr' },
  ];
  const referralBarangayOptions = barangays.map(b => ({ value: b.name, label: b.name }));
  const referralBarangayPlaceholder = loadingBrgy
    ? 'Loading…'
    : !municipalityCode
    ? '— Select Municipality First —'
    : '— Select Barangay —';

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('mode_of_transaction')(e);
    if (e.target.value !== 'referral') {
      setMunicipalityCode('');
      setBarangayName('');
      onDirectChange('reg_referred_by', '');
      onDirectChange('reg_attending_provider', '');
    }
  };

  return (
    <RegistrationErrors.Provider value={errors || {}}>
      {/* For CHU / RHU Personnel Only */}
      <div className="fm-section">
        <h3 className="fm-section-title">
          {sectionLabels.personnel}. For CHU / RHU Personnel Only (Para sa Kinatawan ng CHU / RHU Lamang)
        </h3>
        <div className="fm-grid" style={{ marginBottom: 14 }}>
          <FormField label="Mode of Transaction">
            <div className="fm-segmented-group">
              {(['walk-in', 'visited', 'referral'] as const).map((mode) => {
                const isSelected = (data.mode_of_transaction || 'walk-in') === mode;
                return (
                  <label
                    key={mode}
                    className={`fm-segmented-option ${isSelected ? 'fm-segmented-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="mode_of_transaction"
                      value={mode}
                      checked={isSelected}
                      onChange={handleModeChange}
                    />
                    <span style={{ textTransform: 'capitalize' }}>
                      {mode.replace('-', ' ')}
                    </span>
                  </label>
                );
              })}
            </div>
          </FormField>
        </div>
        {layout === 'two-column' ? (
          <>
            {/* Referred by */}
            {isReferral && <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 10 }}>
                <label className="fm-label" style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>
                  <span>Referred by</span> <span style={{ color: 'var(--registration-error-color, #dc2626)' }}>*</span>
                </label>
                <span className="registration-field-hint" style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                  Select referring facility location from referral paper form, or enter facility name manually.
                </span>
              </div>

              <div
                className="fm-grid fm-grid--2"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '16px 20px',
                  marginBottom: 16,
                }}
              >
                {/* 1. City / Municipality */}
                <FormField label="1. City / Municipality">
                  <SearchableSelect
                    name="reg_referred_by_municipality"
                    value={municipalityCode}
                    options={referralMunicipalityOptions}
                    placeholder="— Select Municipality —"
                    searchPlaceholder="Search municipality..."
                    onChange={handleMunicipalityChange}
                  />
                </FormField>

                {/* 2. Barangay */}
                <FormField label="2. Barangay">
                  <SearchableSelect
                    name="reg_referred_by_barangay"
                    value={barangayName}
                    options={referralBarangayOptions}
                    placeholder={referralBarangayPlaceholder}
                    searchPlaceholder="Search barangay..."
                    onChange={handleBarangayChange}
                    disabled={municipalityCode === 'other' || !municipalityCode}
                  />
                </FormField>
              </div>

              {/* 3. Health Center / Facility Name */}
              <div style={{ marginBottom: 14 }}>
                <FormField
                  id="field-reg_referred_by"
                  label="3. Health Center / Facility Name"
                  required
                  hint="Auto-populates from municipality & barangay, or can be specified manually"
                  error={!!errors?.reg_referred_by}
                  errorText={errors?.reg_referred_by}
                >
                  <input
                    className="fm-input"
                    type="text"
                    name="reg_referred_by"
                    value={data.reg_referred_by}
                    onChange={onChange('reg_referred_by')}
                    placeholder="e.g. Barangay Health Station (BHS)"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </FormField>
              </div>
            </div>}
          </>
        ) : (
          <>
            {/* Referred by (City/Municipality → Barangay → Facility) */}
            {isReferral && <div style={{ marginBottom: 14 }}>
              <label className="fm-label">
                <span>Referred by</span> <span style={{ color: 'var(--registration-error-color, #dc2626)' }}>*</span>
              </label>
              <div
                className="fm-grid"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 16px', marginTop: 6 }}
              >
                {/* 1. City / Municipality */}
                <FormField label="1. City / Municipality">
                  <SearchableSelect
                    name="reg_referred_by_municipality"
                    value={municipalityCode}
                    options={referralMunicipalityOptions}
                    placeholder="— Select Municipality —"
                    searchPlaceholder="Search municipality..."
                    onChange={handleMunicipalityChange}
                  />
                </FormField>

                {/* 2. Barangay */}
                <FormField label="2. Barangay">
                  <SearchableSelect
                    name="reg_referred_by_barangay"
                    value={barangayName}
                    options={referralBarangayOptions}
                    placeholder={referralBarangayPlaceholder}
                    searchPlaceholder="Search barangay..."
                    onChange={handleBarangayChange}
                    disabled={municipalityCode === 'other' || !municipalityCode}
                  />
                </FormField>

                {/* 3. Health Center / Facility Name */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField
                    id="field-reg_referred_by"
                    label="3. Health Center / Facility Name"
                    required
                    hint="Auto-populates from municipality & barangay, or can be specified manually"
                    error={!!errors?.reg_referred_by}
                    errorText={errors?.reg_referred_by}
                  >
                    <input
                      className="fm-input"
                      type="text"
                      name="reg_referred_by"
                      value={data.reg_referred_by}
                      onChange={onChange('reg_referred_by')}
                      placeholder="e.g. Barangay Health Station (BHS)"
                    />
                  </FormField>
                </div>
              </div>
            </div>}
          </>
        )}
      </div>

      {/* Consultation Details & Vitals */}
      <div className="fm-section">
        <h3 className="fm-section-title">{sectionLabels.vitals}. Consultation Details &amp; Vitals</h3>
        {isSectionEnabled('triage_section_enabled') && (
          <>
            <OnlineReferralPhoto patient={referralPatient} />
            <p className="registration-field-hint" style={{ marginBottom: 12, marginTop: -4 }}>
              Entered by Registration Staff from the patient's referral paper or intake form. These values will be visible to the attending doctor in read-only mode.
            </p>
          </>
        )}

        {/* Nature of Visit (Full-width above Date of Consultation; displayed read-only in Form 2) */}
        <div
          style={{
            marginBottom: isSectionEnabled('triage_section_enabled')
              ? (layout === 'two-column' ? 16 : 14)
              : 0,
          }}
        >
          <FormField
            id="field-nature_of_visit"
            label="Nature of Visit"
            required
            error={!!errors?.nature_of_visit}
            errorText={errors?.nature_of_visit}
          >
            <div
              role="radiogroup"
              aria-label="Nature of Visit"
              aria-required="true"
              className="fm-radio-group"
            >
              {NATURE_OF_VISIT_OPTIONS.map((option) => (
                <label key={option.value} className="fm-radio">
                  <input
                    type="radio"
                    name="nature_of_visit"
                    value={option.value}
                    checked={data.nature_of_visit === option.value}
                    onChange={onChange('nature_of_visit')}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>

      {isSectionEnabled('triage_section_enabled') && (layout === 'two-column' ? (
        <>
          {/* Row 1: Date + Time */}
          <div
            className="fm-grid fm-grid--2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '16px 20px',
              marginBottom: 16,
            }}
          >
            <FormField
              id="field-reg_date_of_consultation"
              label="Date of Consultation"
              required
              error={!!errors?.reg_date_of_consultation}
              errorText={errors?.reg_date_of_consultation}
            >
              <input
                className="fm-input"
                type="date"
                name="reg_date_of_consultation"
                min="1900-01-01"
                max={new Date().toISOString().split('T')[0]}
                value={data.reg_date_of_consultation}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val) {
                    const parts = val.split('-');
                    if (parts.length > 0 && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      val = parts.join('-');
                    }
                  }
                  const customEv = { ...e, target: { ...e.target, value: val, name: 'reg_date_of_consultation' } } as any;
                  onChange('reg_date_of_consultation')(customEv);
                }}
                onInput={(e) => {
                  const target = e.currentTarget;
                  if (target.value) {
                    const parts = target.value.split('-');
                    if (parts.length > 0 && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      target.value = parts.join('-');
                      const customEv = { target: { value: target.value, name: 'reg_date_of_consultation' } } as any;
                      onChange('reg_date_of_consultation')(customEv);
                    }
                  }
                }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <FormField
              id="field-reg_consultation_time"
              label="Consultation Time (AM/PM)"
              required
              error={!!errors?.reg_consultation_time}
              errorText={errors?.reg_consultation_time}
            >
              <input
                className="fm-input"
                type="time"
                name="reg_consultation_time"
                value={data.reg_consultation_time}
                onChange={onChange('reg_consultation_time')}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
          </div>

          {/* Row 2: Blood Pressure (Combined Systolic / Diastolic) + Temperature */}
          <div
            className="fm-grid fm-grid--2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '16px 20px',
              marginBottom: 16,
            }}
          >
            <FormField
              id="field-reg_blood_pressure"
              label="Blood Pressure (mmHg)"
              required
              error={!!(errors?.reg_blood_pressure || errors?.bp_systolic || errors?.bp_diastolic)}
              errorText={errors?.reg_blood_pressure || errors?.bp_systolic || errors?.bp_diastolic}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: (errors?.reg_blood_pressure || errors?.bp_systolic || errors?.bp_diastolic)
                    ? '1px solid #ef4444'
                    : '1px solid var(--input-border, #d1d5db)',
                  borderRadius: 9999,
                  minHeight: 46,
                  height: 46,
                  background: 'var(--input-bg, #fff)',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  width: '100%',
                  padding: '0 14px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    e.currentTarget.style.borderColor = (errors?.reg_blood_pressure || errors?.bp_systolic || errors?.bp_diastolic)
                      ? '#ef4444'
                      : 'var(--input-border, #d1d5db)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <input
                  ref={systolicInputRef}
                  type={strictBpFormat ? 'text' : 'number'}
                  inputMode={strictBpFormat ? 'numeric' : undefined}
                  pattern={strictBpFormat ? '[0-9]{1,3}' : undefined}
                  maxLength={strictBpFormat ? 3 : undefined}
                  min={strictBpFormat ? undefined : 0}
                  max={strictBpFormat ? undefined : 300}
                  name="bp_systolic"
                  value={systolic}
                  onChange={handleSystolicChange}
                  onKeyDown={handleBpKeyDown('systolic')}
                  placeholder="120"
                  aria-label="Systolic Blood Pressure"
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
                  ref={diastolicInputRef}
                  type={strictBpFormat ? 'text' : 'number'}
                  inputMode={strictBpFormat ? 'numeric' : undefined}
                  pattern={strictBpFormat ? '[0-9]{1,3}' : undefined}
                  maxLength={strictBpFormat ? 3 : undefined}
                  min={strictBpFormat ? undefined : 0}
                  max={strictBpFormat ? undefined : 200}
                  name="bp_diastolic"
                  value={diastolic}
                  onChange={handleDiastolicChange}
                  onKeyDown={handleBpKeyDown('diastolic')}
                  placeholder={strictBpFormat ? '080' : '80'}
                  aria-label="Diastolic Blood Pressure"
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
            </FormField>

            <FormField
              id="field-reg_temperature"
              label="Temperature (°C)"
              required
              error={!!errors?.reg_temperature}
              errorText={errors?.reg_temperature}
            >
              <input
                className="fm-input"
                type="text"
                inputMode="decimal"
                pattern="[0-9]{2}\.[0-9]"
                maxLength={4}
                name="reg_temperature"
                value={data.reg_temperature}
                onChange={(e) => onDirectChange('reg_temperature', formatTemperatureInput(e.target.value, data.reg_temperature))}
                onBlur={(e) => {
                  const normalized = normalizeTemperatureOnBlur(e.target.value);
                  if (normalized !== data.reg_temperature) {
                    onDirectChange('reg_temperature', normalized);
                  }
                }}
                onKeyDown={handleTemperatureKeyDown}
                placeholder="36.5"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
          </div>

          {/* Row 3: Height + Weight */}
          <div
            className="fm-grid fm-grid--2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '16px 20px',
              marginBottom: 16,
            }}
          >
            <FormField
              id="field-reg_height"
              label="Height (cm)"
              required
              error={!!errors?.reg_height}
              errorText={errors?.reg_height}
            >
              <input
                className="fm-input"
                type="text"
                name="reg_height"
                value={data.reg_height}
                onChange={onChange('reg_height')}
                placeholder="170"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <FormField
              id="field-reg_weight"
              label="Weight (kg)"
              required
              error={!!errors?.reg_weight}
              errorText={errors?.reg_weight}
            >
              <input
                className="fm-input"
                type="text"
                name="reg_weight"
                value={data.reg_weight}
                onChange={onChange('reg_weight')}
                placeholder="70"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
          </div>

          {/* Row 4: Attending Provider */}
          {isReferral && (
            <div style={{ marginBottom: 16 }}>
              <FormField
                id="field-reg_attending_provider"
                label="Name of Attending Provider"
                required
                hint="From patient's referral paper form"
                error={!!errors?.reg_attending_provider}
                errorText={errors?.reg_attending_provider}
              >
                <input
                  className="fm-input"
                  type="text"
                  name="reg_attending_provider"
                  value={data.reg_attending_provider}
                  onChange={onChange('reg_attending_provider')}
                  placeholder="e.g. Dr. Juan Dela Cruz"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
            </div>
          )}

        </>
      ) : (
        <>
          {/* Row 1: Date + Time */}
          <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
            <FormField
              id="field-reg_date_of_consultation"
              label="Date of Consultation"
              required
              error={!!errors?.reg_date_of_consultation}
              errorText={errors?.reg_date_of_consultation}
            >
              <input
                className="fm-input"
                type="date"
                name="reg_date_of_consultation"
                min="1900-01-01"
                max={new Date().toISOString().split('T')[0]}
                value={data.reg_date_of_consultation}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val) {
                    const parts = val.split('-');
                    if (parts.length > 0 && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      val = parts.join('-');
                    }
                  }
                  const customEv = { ...e, target: { ...e.target, value: val, name: 'reg_date_of_consultation' } } as any;
                  onChange('reg_date_of_consultation')(customEv);
                }}
                onInput={(e) => {
                  const target = e.currentTarget;
                  if (target.value) {
                    const parts = target.value.split('-');
                    if (parts.length > 0 && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      target.value = parts.join('-');
                      const customEv = { target: { value: target.value, name: 'reg_date_of_consultation' } } as any;
                      onChange('reg_date_of_consultation')(customEv);
                    }
                  }
                }}
              />
            </FormField>
            <FormField
              id="field-reg_consultation_time"
              label="Consultation Time (AM/PM)"
              required
              error={!!errors?.reg_consultation_time}
              errorText={errors?.reg_consultation_time}
            >
              <input
                className="fm-input"
                type="time"
                name="reg_consultation_time"
                value={data.reg_consultation_time}
                onChange={onChange('reg_consultation_time')}
              />
            </FormField>
          </div>

          {/* Row 2: BP + Temperature */}
          <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
            <FormField
              id="field-reg_blood_pressure"
              label="Blood Pressure (mmHg)"
              required
              error={!!(errors?.reg_blood_pressure || errors?.bp_systolic || errors?.bp_diastolic)}
              errorText={errors?.reg_blood_pressure || errors?.bp_systolic || errors?.bp_diastolic}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: (errors?.reg_blood_pressure || errors?.bp_systolic || errors?.bp_diastolic)
                    ? '1px solid #ef4444'
                    : '1px solid var(--input-border, #d1d5db)',
                  borderRadius: 9999,
                  minHeight: 46,
                  height: 46,
                  background: 'var(--input-bg, #fff)',
                  overflow: 'hidden',
                  boxSizing: 'border-box' as const,
                  padding: '0 14px',
                }}
              >
                <input
                  ref={systolicInputRef}
                  type={strictBpFormat ? 'text' : 'number'}
                  inputMode={strictBpFormat ? 'numeric' : undefined}
                  pattern={strictBpFormat ? '[0-9]{1,3}' : undefined}
                  maxLength={strictBpFormat ? 3 : undefined}
                  min={strictBpFormat ? undefined : 0}
                  max={strictBpFormat ? undefined : 300}
                  name="bp_systolic"
                  value={systolic}
                  onChange={handleSystolicChange}
                  onKeyDown={handleBpKeyDown('systolic')}
                  placeholder="120"
                  style={{
                    width: '45%',
                    padding: '8px',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    backgroundColor: 'transparent',
                    textAlign: 'center' as const,
                    color: 'var(--input-text, #111827)',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary, #6b7280)', userSelect: 'none' as const }}>
                  /
                </span>
                <input
                  ref={diastolicInputRef}
                  type={strictBpFormat ? 'text' : 'number'}
                  inputMode={strictBpFormat ? 'numeric' : undefined}
                  pattern={strictBpFormat ? '[0-9]{1,3}' : undefined}
                  maxLength={strictBpFormat ? 3 : undefined}
                  min={strictBpFormat ? undefined : 0}
                  max={strictBpFormat ? undefined : 200}
                  name="bp_diastolic"
                  value={diastolic}
                  onChange={handleDiastolicChange}
                  onKeyDown={handleBpKeyDown('diastolic')}
                  placeholder={strictBpFormat ? '080' : '80'}
                  style={{
                    width: '45%',
                    padding: '8px',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    backgroundColor: 'transparent',
                    textAlign: 'center' as const,
                    color: 'var(--input-text, #111827)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </FormField>

            <FormField
              id="field-reg_temperature"
              label="Temperature (°C)"
              required
              error={!!errors?.reg_temperature}
              errorText={errors?.reg_temperature}
            >
              <input
                className="fm-input"
                type="text"
                inputMode="decimal"
                pattern="[0-9]{2}\.[0-9]"
                maxLength={4}
                name="reg_temperature"
                value={data.reg_temperature}
                onChange={(e) => onDirectChange('reg_temperature', formatTemperatureInput(e.target.value, data.reg_temperature))}
                onBlur={(e) => {
                  const normalized = normalizeTemperatureOnBlur(e.target.value);
                  if (normalized !== data.reg_temperature) {
                    onDirectChange('reg_temperature', normalized);
                  }
                }}
                onKeyDown={handleTemperatureKeyDown}
                placeholder="36.5"
              />
            </FormField>
          </div>

          {/* Row 3: Height + Weight */}
          <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
            <FormField
              id="field-reg_height"
              label="Height (cm)"
              required
              error={!!errors?.reg_height}
              errorText={errors?.reg_height}
            >
              <input
                className="fm-input"
                type="text"
                name="reg_height"
                value={data.reg_height}
                onChange={onChange('reg_height')}
                placeholder="170"
              />
            </FormField>
            <FormField
              id="field-reg_weight"
              label="Weight (kg)"
              required
              error={!!errors?.reg_weight}
              errorText={errors?.reg_weight}
            >
              <input
                className="fm-input"
                type="text"
                name="reg_weight"
                value={data.reg_weight}
                onChange={onChange('reg_weight')}
                placeholder="70"
              />
            </FormField>
          </div>

          {/* Row 4: Attending Provider (full width) */}
          {isReferral && (
            <div style={{ marginBottom: 14 }}>
              <FormField
                id="field-reg_attending_provider"
                label="Name of Attending Provider"
                required
                hint="Enter name from patient's referral paper form"
                error={!!errors?.reg_attending_provider}
                errorText={errors?.reg_attending_provider}
              >
                <input
                  className="fm-input"
                  type="text"
                  name="reg_attending_provider"
                  value={data.reg_attending_provider}
                  onChange={onChange('reg_attending_provider')}
                  placeholder="e.g. Dr. Juan Dela Cruz"
                />
              </FormField>
            </div>
          )}

        </>
      ))}
      </div>
    </RegistrationErrors.Provider>
  );
}
