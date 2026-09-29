import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';
import {
  MISAMIS_ORIENTAL_MUNICIPALITIES,
  FALLBACK_BARANGAYS,
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

interface RegistrationVitalsSectionProps {
  data: EnrolmentFormData;
  onChange: (
    key: keyof EnrolmentFormData
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onDirectChange: (key: keyof EnrolmentFormData, value: string) => void;
}

/**
 * III. Consultation Details & Vitals
 *
 * Entered by Registration Staff during patient registration (Add Patient).
 * Values are saved to the treatment_records table (see PatientController::store).
 * Displayed read-only in Form 2 (VitalsConsultationSection with readOnly=true).
 * Displayed in Form 1 print via patient-enrolment.blade.php.
 *
 * Field mapping to treatment_records columns:
 *   reg_date_of_consultation  → consultation_date
 *   reg_consultation_time     → consultation_time
 *   reg_blood_pressure        → blood_pressure  (stored as "systolic/diastolic")
 *   reg_temperature           → temperature
 *   reg_height                → height
 *   reg_weight                → weight
 *   reg_attending_provider    → attending_provider
 *   reg_referred_by           → referred_by  (full facility name string)
 */
export function RegistrationVitalsSection({
  data,
  onChange,
  onDirectChange,
}: RegistrationVitalsSectionProps) {
  // --- Blood pressure split/combine ---
  const splitBP = (bp: string) => {
    if (!bp) return { systolic: '', diastolic: '' };
    const parts = bp.split('/');
    return { systolic: parts[0] ?? '', diastolic: parts[1] ?? '' };
  };
  const { systolic, diastolic } = splitBP(data.reg_blood_pressure);

  const handleSystolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sys = e.target.value;
    const combined = sys || diastolic ? `${sys}/${diastolic}` : '';
    onDirectChange('reg_blood_pressure', combined);
  };

  const handleDiastolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dia = e.target.value;
    const combined = systolic || dia ? `${systolic}/${dia}` : '';
    onDirectChange('reg_blood_pressure', combined);
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

  const handleMunicipalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setMunicipalityCode(code);
    setBarangayName('');
    if (code === 'other') {
      onDirectChange('reg_referred_by', 'Other Facility (Specify)');
    } else if (!code) {
      onDirectChange('reg_referred_by', '');
    }
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setBarangayName(name);
    if (!name) return;
    const munObj = MISAMIS_ORIENTAL_MUNICIPALITIES.find(m => m.code === municipalityCode);
    const munName = munObj?.name || '';
    if (name.toLowerCase() === 'poblacion') {
      onDirectChange('reg_referred_by', `${munName} Rural Health Unit (RHU) / BHS`);
    } else {
      onDirectChange('reg_referred_by', `Barangay ${name} Health Station (BHS)`);
    }
  };

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">III. Consultation Details &amp; Vitals</h3>
      <p className="registration-field-hint" style={{ marginBottom: 12, marginTop: -4 }}>
        Entered by Registration Staff from the patient's referral paper or intake form. These values will be visible to the attending doctor in read-only mode.
      </p>

      {/* Row 1: Date + Time */}
      <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
        <FormField label="Date of Consultation">
          <input
            className="fm-input"
            type="date"
            name="reg_date_of_consultation"
            value={data.reg_date_of_consultation}
            onChange={onChange('reg_date_of_consultation')}
          />
        </FormField>
        <FormField label="Consultation Time (AM/PM)">
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
        <FormField label="Blood Pressure (mmHg)">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--input-border, #d1d5db)',
              borderRadius: 8,
              minHeight: 46,
              height: 46,
              background: 'var(--input-bg, #fff)',
              overflow: 'hidden',
              boxSizing: 'border-box' as const,
              padding: '0 8px',
            }}
          >
            <input
              type="number"
              min={0}
              max={300}
              name="bp_systolic"
              value={systolic}
              onChange={handleSystolicChange}
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
              type="number"
              min={0}
              max={200}
              name="bp_diastolic"
              value={diastolic}
              onChange={handleDiastolicChange}
              placeholder="80"
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

        <FormField label="Temperature (°C)">
          <input
            className="fm-input"
            type="text"
            name="reg_temperature"
            value={data.reg_temperature}
            onChange={onChange('reg_temperature')}
            placeholder="36.5"
          />
        </FormField>
      </div>

      {/* Row 3: Height + Weight */}
      <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
        <FormField label="Height (cm)">
          <input
            className="fm-input"
            type="text"
            name="reg_height"
            value={data.reg_height}
            onChange={onChange('reg_height')}
            placeholder="170"
          />
        </FormField>
        <FormField label="Weight (kg)">
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
      <div style={{ marginBottom: 14 }}>
        <FormField label="Name of Attending Provider" hint="Enter name from patient's referral paper form">
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

      {/* Row 5: Referred By (City/Municipality → Barangay → Facility) */}
      <div style={{ marginBottom: 14 }}>
        <label className="fm-label">Referred by</label>
        <div
          className="fm-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 16px', marginTop: 6 }}
        >
          {/* 1. City / Municipality */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary, #6b7280)',
                marginBottom: 6,
              }}
            >
              1. City / Municipality
            </span>
            <select
              className="fm-select"
              value={municipalityCode}
              onChange={handleMunicipalityChange}
            >
              <option value="">— Select Municipality —</option>
              {MISAMIS_ORIENTAL_MUNICIPALITIES.map(m => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
              <option value="other">Other / Outside MisOr</option>
            </select>
          </div>

          {/* 2. Barangay */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary, #6b7280)',
                marginBottom: 6,
              }}
            >
              2. Barangay
            </span>
            <select
              className="fm-select"
              value={barangayName}
              onChange={handleBarangayChange}
              disabled={municipalityCode === 'other' || !municipalityCode}
            >
              <option value="">
                {loadingBrgy
                  ? 'Loading…'
                  : !municipalityCode
                  ? '— Select Municipality First —'
                  : '— Select Barangay —'}
              </option>
              {barangays.map(b => (
                <option key={b.code} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Health Center / Facility Name */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary, #6b7280)',
                marginBottom: 6,
              }}
            >
              3. Health Center / Facility Name
            </span>
            <input
              className="fm-input"
              type="text"
              name="reg_referred_by"
              value={data.reg_referred_by}
              onChange={onChange('reg_referred_by')}
              placeholder="e.g. Barangay Health Station"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
