import React, { useState, useEffect } from 'react';
import {
  MISAMIS_ORIENTAL_MUNICIPALITIES,
  FALLBACK_BARANGAYS,
} from '../../patients/hooks/useAddressLocation';
import type { PsgcItem } from '../../patients/types';

const PSGC = 'https://psgc.gitlab.io/api';

// Additional fallback barangays for Misamis Oriental
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
  '104305000': [ // Cagayan de Oro
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

interface ReferralLocationSelectorProps {
  label: string;
  value: string;
  onChange: (facility: string) => void;
  disabled?: boolean;
}

export default function ReferralLocationSelector({
  label,
  value,
  onChange,
  disabled = false,
}: ReferralLocationSelectorProps) {
  const [municipalityCode, setMunicipalityCode] = useState<string>('');
  const [barangayName, setBarangayName] = useState<string>('');
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);
  const [loadingBrgy, setLoadingBrgy] = useState<boolean>(false);

  // Fetch barangays when municipality changes
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
      onChange('Other Facility (Specify)');
    }
  };

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setBarangayName(name);
    if (!name) return;

    const munObj = MISAMIS_ORIENTAL_MUNICIPALITIES.find(m => m.code === municipalityCode);
    const munName = munObj?.name || 'Tagoloan';

    // Auto-suggest health station name based on selected barangay
    if (name.toLowerCase() === 'poblacion') {
      onChange(`${munName} Rural Health Unit (RHU) / BHS`);
    } else {
      onChange(`Barangay ${name} Health Station (BHS)`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151' }}>
        {label}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10 }}>
        {/* 1. City / Municipality */}
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>
            1. City / Municipality
          </span>
          <select
            value={municipalityCode}
            onChange={handleMunicipalityChange}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              backgroundColor: disabled ? '#f9fafb' : '#ffffff',
              outline: 'none',
            }}
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
          <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>
            2. Barangay
          </span>
          <select
            value={barangayName}
            onChange={handleBarangayChange}
            disabled={disabled || municipalityCode === 'other' || !municipalityCode}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              backgroundColor: disabled || municipalityCode === 'other' || !municipalityCode ? '#f9fafb' : '#ffffff',
              outline: 'none',
            }}
          >
            <option value="">
              {loadingBrgy ? 'Loading…' : !municipalityCode ? '— Select Municipality First —' : '— Select Barangay —'}
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
          <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>
            3. Health Center / Facility Name
          </span>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="e.g. Barangay Health Station"
            disabled={disabled}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              backgroundColor: disabled ? '#f9fafb' : '#ffffff',
              outline: 'none',
              fontWeight: 500,
              color: '#111827',
            }}
          />
        </div>
      </div>
    </div>
  );
}
