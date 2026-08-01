import { useState, useEffect } from 'react';
import type { PsgcItem } from '../types';

const PSGC = 'https://psgc.gitlab.io/api';
const MIS_OR = '104300000';

export const MISAMIS_ORIENTAL_MUNICIPALITIES: PsgcItem[] = [
  { code: '104301000', name: 'Alubijid' },
  { code: '104302000', name: 'Balingasag' },
  { code: '104303000', name: 'Balingoan' },
  { code: '104304000', name: 'Binuangan' },
  { code: '104305000', name: 'City of Cagayan De Oro' },
  { code: '104306000', name: 'Claveria' },
  { code: '104307000', name: 'City of El Salvador' },
  { code: '104308000', name: 'City of Gingoog' },
  { code: '104309000', name: 'Gitagum' },
  { code: '104310000', name: 'Initao' },
  { code: '104311000', name: 'Jasaan' },
  { code: '104312000', name: 'Kinoguitan' },
  { code: '104313000', name: 'Lagonglong' },
  { code: '104314000', name: 'Laguindingan' },
  { code: '104315000', name: 'Libertad' },
  { code: '104316000', name: 'Lugait' },
  { code: '104317000', name: 'Magsaysay' },
  { code: '104318000', name: 'Manticao' },
  { code: '104319000', name: 'Medina' },
  { code: '104320000', name: 'Naawan' },
  { code: '104321000', name: 'Opol' },
  { code: '104322000', name: 'Salay' },
  { code: '104323000', name: 'Sugbongcogon' },
  { code: '104324000', name: 'Tagoloan' },
  { code: '104325000', name: 'Talisayan' },
  { code: '104326000', name: 'Villanueva' },
];

export const FALLBACK_BARANGAYS: Record<string, PsgcItem[]> = {
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
  ],
  '104326000': [ // Villanueva
    { code: '104326001', name: 'Balacanas' },
    { code: '104326003', name: 'Dayawan' },
    { code: '104326004', name: 'Katipunan' },
    { code: '104326005', name: 'Kimaya' },
    { code: '104326007', name: 'Poblacion 1' },
    { code: '104326008', name: 'San Martin' },
    { code: '104326009', name: 'Tambobong' },
    { code: '104326010', name: 'Imelda' },
    { code: '104326011', name: 'Looc' },
    { code: '104326012', name: 'Poblacion 2' },
    { code: '104326013', name: 'Poblacion 3' },
  ],
};

export function useAddressLocation() {
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay]         = useState('');
  const [purok, setPurok]               = useState('');
  const [municipalities, setMunicipalities] = useState<PsgcItem[]>(MISAMIS_ORIENTAL_MUNICIPALITIES);
  const [barangays, setBarangays]           = useState<PsgcItem[]>([]);
  const [loadingMun, setLoadingMun]   = useState(false);
  const [loadingBrgy, setLoadingBrgy] = useState(false);
  const [apiError, setApiError]       = useState(false);
  const [useManual, setUseManual]     = useState(false);
  const [manualMun, setManualMun]     = useState('');
  const [manualBrgy, setManualBrgy]   = useState('');

  useEffect(() => {
    setLoadingMun(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    fetch(`${PSGC}/provinces/${MIS_OR}/cities-municipalities/`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('API failed');
        return r.json();
      })
      .then((d: PsgcItem[]) => {
        if (Array.isArray(d) && d.length > 0) {
          setMunicipalities(d.sort((a, b) => a.name.localeCompare(b.name)));
          setApiError(false);
        }
      })
      .catch(() => {
        setApiError(true);
        setMunicipalities(MISAMIS_ORIENTAL_MUNICIPALITIES);
      })
      .finally(() => {
        clearTimeout(timer);
        setLoadingMun(false);
      });
  }, []);

  useEffect(() => {
    if (!municipality || useManual) {
      setBarangays([]);
      setBarangay('');
      return;
    }
    setLoadingBrgy(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    fetch(`${PSGC}/cities-municipalities/${municipality}/barangays/`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('API failed');
        return r.json();
      })
      .then((d: PsgcItem[]) => {
        if (Array.isArray(d) && d.length > 0) {
          setBarangays(d.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          throw new Error('Empty barangay response');
        }
        setBarangay('');
      })
      .catch(() => {
        const fallbacks = FALLBACK_BARANGAYS[municipality] || [];
        setBarangays(fallbacks);
        setBarangay('');
      })
      .finally(() => {
        clearTimeout(timer);
        setLoadingBrgy(false);
      });
  }, [municipality, useManual]);

  const munName  = useManual ? manualMun : (municipalities.find(m => m.code === municipality)?.name || '');
  const brgyName = useManual ? manualBrgy : (barangays.find(b => b.code === barangay)?.name || '');
  const full     = [purok, brgyName, munName, 'Misamis Oriental'].filter(Boolean).join(', ');

  return {
    municipality, setMunicipality, barangay, setBarangay, purok, setPurok,
    municipalities, barangays, loadingMun, loadingBrgy, munName, brgyName, full,
    apiError, useManual, setUseManual, manualMun, setManualMun, manualBrgy, setManualBrgy
  };
}

export type AddressLocationState = ReturnType<typeof useAddressLocation>;
