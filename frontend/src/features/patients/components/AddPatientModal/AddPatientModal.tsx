import { useState, useEffect } from 'react';
import FormModal from '../../../../components/forms/FormModal';
import { PatientFormContent } from './AddPatientModal.styles';

// ── PSGC Address Data & Guaranteed Misamis Oriental Fallbacks ──
const PSGC = 'https://psgc.gitlab.io/api';
interface PsgcItem { code: string; name: string; }
const MIS_OR = '104300000';

const MISAMIS_ORIENTAL_MUNICIPALITIES: PsgcItem[] = [
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

const FALLBACK_BARANGAYS: Record<string, PsgcItem[]> = {
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

function useAddressLocation() {
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
    const timer = setTimeout(() => controller.abort(), 3000); // 3s timeout

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
        // Retain MISAMIS_ORIENTAL_MUNICIPALITIES fallback
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
    const timer = setTimeout(() => controller.abort(), 3000); // 3s timeout

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
        // Fallback to offline barangays if available
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

// ── Field helper ─────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="fm-field">
      <label className="fm-label">{label}{required && <span>*</span>}</label>
      {children}
    </div>
  );
}

// ── Form state ───────────────────────────────────────────────
const E0 = {
  last_name:'', first_name:'', middle_name:'', suffix:'',
  date_of_birth:'', sex:'', blood_type:'', civil_status:'', spouse_name:'',
  mother_maiden_name:'', contact_number:'',
  family_member:'', educational_attainment:'', employment_status:'',
  philhealth_member:'', philhealth_status:'', philhealth_no:'', philhealth_category:'',
  fourps_member:'', dswd_nhts:'',
  emergency_contact_name:'', emergency_contact_phone:'',
};
const T0 = {
  mode_of_transaction:'', referral_from:'', referral_to:'',
  date_of_consultation:'', consultation_time:'',
  blood_pressure:'', temperature:'', height:'', weight:'',
  attending_provider:'', referred_by:'', nature_of_visit:'',
  type_of_consultation:[] as string[],
  chief_complaints:'', diagnosis:'', medication_treatment:'',
  laboratory_findings:'', health_care_provider:'', performed_lab_test:'',
};

const CONSULT_TYPES = [
  'General','Family Planning','Prenatal','Postpartum',
  'Dental Care','Tuberculosis','Child Care','Child Immunization',
  'Child Nutrition','Sick Children','Injury','Firecracker Injury','Adult Immunization',
];

// ── Component ────────────────────────────────────────────────
interface Props { onClose: () => void; onSuccess: () => void; role?: string; }

export default function AddPatientModal({ onClose, onSuccess, role: roleProp }: Props) {
  // Read role from localStorage directly as the authoritative source
  const _userData = localStorage.getItem('userData');
  const localRole = _userData ? (JSON.parse(_userData)?.role ?? '') : '';
  const activeRole = roleProp || localRole;

  const [tab, setTab]             = useState<'enrolment'|'treatment'|'card'>(
    activeRole === 'triage' ? 'treatment' : activeRole === 'treatment' ? 'card' : 'enrolment'
  );
  const [enrolment, setEnrolment] = useState(E0);
  const [treatment, setTreatment] = useState(T0);
  const [cardState, setCardState] = useState({
    exposureCategory: 'II',
    modeOfExposure: 'transdermal_bite',
    bodyPartExposed: 'other_parts',
    animalType: 'Dog',
    animalTypeOthers: '',
    pastBiteHistory: false,
    pastBiteDates: '',
    pastPepCompleted: false,
    icd10Code: 'Z20.3',
  });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const loc = useAddressLocation();

  const setE = (k: keyof typeof E0) =>
    (ev: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setEnrolment(f => ({ ...f, [k]: ev.target.value }));

  const setT = (k: keyof typeof T0) =>
    (ev: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setTreatment(f => ({ ...f, [k]: ev.target.value }));

  const toggleConsult = (v: string) =>
    setTreatment(f => ({
      ...f,
      type_of_consultation: f.type_of_consultation.includes(v)
        ? f.type_of_consultation.filter(x => x !== v)
        : [...f.type_of_consultation, v],
    }));

  const handleSubmit = async () => {
    // Only validate Form 1 fields (Patient Enrolment)
    if (!enrolment.last_name || !enrolment.first_name || !enrolment.date_of_birth || !enrolment.sex) {
      setError('Please fill in all required fields (Last Name, First Name, Date of Birth, Sex).');
      return;
    }
    
    // Validate address based on entry mode
    if (loc.useManual) {
      if (!loc.manualMun || !loc.manualBrgy) {
        setError('Please enter Municipality and Barangay.');
        return;
      }
    } else {
      if (!loc.municipality || !loc.barangay) {
        setError('Please select Municipality and Barangay.');
        return;
      }
    }

    setError(''); setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Only send Form 1 data (Patient Enrolment)
      const payload = {
        ...enrolment,
        gender: enrolment.sex,
        address: loc.full,
        address_municipality: loc.munName,
        address_barangay: loc.brgyName,
        address_purok: loc.purok,
        province: 'Misamis Oriental',
        phone: enrolment.contact_number,
        emergency_contact_phone: enrolment.emergency_contact_phone,
      };

      const res = await fetch('http://localhost:8000/api/patients', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json', 
          Accept: 'application/json' 
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) { 
        const j = await res.json(); 
        throw new Error(j.message || 'Failed to save patient.'); 
      }
      
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to save patient.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      title="Patient Registration"
      subtitle="Form 1 — Patient Enrolment"
      onClose={onClose}
      maxWidth={850}
      footer={
        <>
          {error && <p style={{flex:1,fontSize:13,color:'#ef4444',margin:0,alignSelf:'center'}}>{error}</p>}
          <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Patient Record'}
          </button>
        </>
      }
    >
      <PatientFormContent>
        {/* ════ FORM TAB SWITCHER ════ */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          {[
            { id: 'enrolment', label: 'Form 1 — Patient Enrolment' },
            { id: 'treatment', label: 'Form 2 — Individual Treatment' },
            { id: 'card',      label: 'Form 3 — Period Exposure Card' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: tab === t.id ? '#17653a' : '#f1f5f9',
                color: tab === t.id ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'enrolment' && (
          <>
          <div className="fm-section">
            <p className="fm-section-title">I. Patient Information</p>

            <div className="fm-grid fm-grid--4" style={{marginBottom:14}}>
              <Field label="Last Name" required>
                <input className="fm-input" value={enrolment.last_name} onChange={setE('last_name')} placeholder="Dela Cruz" />
              </Field>
              <Field label="First Name" required>
                <input className="fm-input" value={enrolment.first_name} onChange={setE('first_name')} placeholder="Juan" />
              </Field>
              <Field label="Middle Name">
                <input className="fm-input" value={enrolment.middle_name} onChange={setE('middle_name')} placeholder="Santos" />
              </Field>
              <Field label="Suffix">
                <input className="fm-input" value={enrolment.suffix} onChange={setE('suffix')} placeholder="Jr." />
              </Field>
            </div>

            <div className="fm-grid fm-grid--3" style={{marginBottom:14}}>
              <Field label="Sex (Kasarian)" required>
                <div className="fm-radio-group" style={{paddingTop:4}}>
                  <label className="fm-radio"><input type="radio" name="sex" value="female" checked={enrolment.sex==='female'} onChange={setE('sex')} /> Female</label>
                  <label className="fm-radio"><input type="radio" name="sex" value="male"   checked={enrolment.sex==='male'}   onChange={setE('sex')} /> Male</label>
                </div>
              </Field>
              <Field label="Date of Birth" required>
                <input className="fm-input" type="date" value={enrolment.date_of_birth} onChange={setE('date_of_birth')} />
              </Field>
              <Field label="Blood Type">
                <select className="fm-select" value={enrolment.blood_type} onChange={setE('blood_type')}>
                  <option value="">— Select —</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <div className="fm-grid fm-grid--2" style={{marginBottom:14}}>
              <Field label="Mother's Maiden Name">
                <input className="fm-input" value={enrolment.mother_maiden_name} onChange={setE('mother_maiden_name')} placeholder="Last, First Middle" />
              </Field>
              <Field label="Civil Status">
                <select className="fm-select" value={enrolment.civil_status} onChange={setE('civil_status')}>
                  <option value="">— Select —</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="separated">Separated</option>
                  <option value="annulled">Annulled</option>
                  <option value="cohabitation">Co-Habitation</option>
                </select>
              </Field>
            </div>

            {enrolment.civil_status === 'married' && (
              <div style={{marginBottom:14}}>
                <Field label="Spouse's Name">
                  <input className="fm-input" value={enrolment.spouse_name} onChange={setE('spouse_name')} />
                </Field>
              </div>
            )}
          </div>

          {/* Address — Misamis Oriental */}
          <div className="fm-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p className="fm-section-title" style={{ margin: 0 }}>Residential Address — Misamis Oriental (Tirahan)</p>
              <button 
                type="button"
                onClick={() => loc.setUseManual(!loc.useManual)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: loc.useManual ? '#17653a' : '#f1f5f9',
                  color: loc.useManual ? '#fff' : '#334155',
                  border: loc.useManual ? 'none' : '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {loc.useManual ? '✓ Switch to Dropdown' : '✏️ Switch to Manual Typing'}
              </button>
            </div>

            {loc.apiError && !loc.useManual && (
              <div style={{
                padding: '10px 14px',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '13px',
                color: '#92400e'
              }}>
                <strong>⚠️ Address API unavailable.</strong> Click "Use Manual Entry" to type addresses manually.
              </div>
            )}

            {!loc.useManual ? (
              <div className="fm-grid fm-grid--3" style={{marginBottom:12}}>
                <Field label="City / Municipality" required>
                  <select className="fm-select" value={loc.municipality} onChange={e=>loc.setMunicipality(e.target.value)} disabled={loc.loadingMun}>
                    <option value="">{loc.loadingMun ? 'Loading…' : '— Select —'}</option>
                    {loc.municipalities.map(m=><option key={m.code} value={m.code}>{m.name}</option>)}
                  </select>
                </Field>
                <Field label="Barangay" required>
                  <select className="fm-select" value={loc.barangay} onChange={e=>loc.setBarangay(e.target.value)} disabled={!loc.municipality||loc.loadingBrgy}>
                    <option value="">{loc.loadingBrgy ? 'Loading…' : '— Select —'}</option>
                    {loc.barangays.map(b=><option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </Field>
                <Field label="Purok / Zone / Street">
                  <input className="fm-input" value={loc.purok} onChange={e=>loc.setPurok(e.target.value)} placeholder="e.g. Purok 3, Zone 1" disabled={!loc.barangay} />
                </Field>
              </div>
            ) : (
              <div className="fm-grid fm-grid--3" style={{marginBottom:12}}>
                <Field label="City / Municipality" required>
                  <input 
                    className="fm-input" 
                    value={loc.manualMun} 
                    onChange={e=>loc.setManualMun(e.target.value)} 
                    placeholder="e.g. Tagoloan" 
                  />
                </Field>
                <Field label="Barangay" required>
                  <input 
                    className="fm-input" 
                    value={loc.manualBrgy} 
                    onChange={e=>loc.setManualBrgy(e.target.value)} 
                    placeholder="e.g. Poblacion" 
                  />
                </Field>
                <Field label="Purok / Zone / Street">
                  <input 
                    className="fm-input" 
                    value={loc.purok} 
                    onChange={e=>loc.setPurok(e.target.value)} 
                    placeholder="e.g. Purok 3, Zone 1" 
                  />
                </Field>
              </div>
            )}

            {loc.full && (
              <div className="apm-address-preview">
                <strong>Full address:</strong> {loc.full}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="fm-section">
            <p className="fm-section-title">Contact Information</p>
            <div className="fm-grid fm-grid--3" style={{marginBottom:14}}>
              <Field label="Contact Number">
                <input className="fm-input" value={enrolment.contact_number} onChange={setE('contact_number')} placeholder="09XXXXXXXXX" />
              </Field>
              <Field label="Emergency Contact Name">
                <input className="fm-input" value={enrolment.emergency_contact_name} onChange={setE('emergency_contact_name')} />
              </Field>
              <Field label="Emergency Contact Phone">
                <input className="fm-input" value={enrolment.emergency_contact_phone} onChange={setE('emergency_contact_phone')} placeholder="09XXXXXXXXX" />
              </Field>
            </div>
          </div>

          {/* Socioeconomic */}
          <div className="fm-section">
            <p className="fm-section-title">Socioeconomic Information</p>
            <div className="fm-grid fm-grid--3" style={{marginBottom:14}}>
              <Field label="Educational Attainment">
                <select className="fm-select" value={enrolment.educational_attainment} onChange={setE('educational_attainment')}>
                  <option value="">— Select —</option>
                  <option value="no_formal">No Formal Education</option>
                  <option value="elementary">Elementary</option>
                  <option value="high_school">High School</option>
                  <option value="vocational">Vocational</option>
                  <option value="college">College</option>
                  <option value="post_graduate">Post Graduate</option>
                  <option value="student">Student</option>
                  <option value="unknown">Unknown</option>
                </select>
              </Field>
              <Field label="Employment Status">
                <select className="fm-select" value={enrolment.employment_status} onChange={setE('employment_status')}>
                  <option value="">— Select —</option>
                  <option value="employed">Employed</option>
                  <option value="unemployed">None/Unemployed</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="retired">Retired</option>
                  <option value="student">Student</option>
                </select>
              </Field>
              <Field label="Family Member Position">
                <select className="fm-select" value={enrolment.family_member} onChange={setE('family_member')}>
                  <option value="">— Select —</option>
                  <option value="father">Father (Ama)</option>
                  <option value="mother">Mother (Ina)</option>
                  <option value="son">Son (Anak na Lalaki)</option>
                  <option value="daughter">Daughter (Anak na Babae)</option>
                  <option value="others">Others</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Government Programs */}
          <div className="fm-section">
            <p className="fm-section-title">II. Government Program Information</p>
            <div className="fm-grid fm-grid--2">
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <Field label="PhilHealth Member?">
                  <div className="fm-radio-group">
                    <label className="fm-radio"><input type="radio" name="ph_m" value="yes" checked={enrolment.philhealth_member==='yes'} onChange={setE('philhealth_member')} /> Yes</label>
                    <label className="fm-radio"><input type="radio" name="ph_m" value="no"  checked={enrolment.philhealth_member==='no'}  onChange={setE('philhealth_member')} /> No</label>
                  </div>
                </Field>
                {enrolment.philhealth_member === 'yes' && (
                  <>
                    <Field label="Status Type">
                      <div className="fm-radio-group">
                        <label className="fm-radio"><input type="radio" name="ph_s" value="member"    checked={enrolment.philhealth_status==='member'}    onChange={setE('philhealth_status')} /> Member</label>
                        <label className="fm-radio"><input type="radio" name="ph_s" value="dependent" checked={enrolment.philhealth_status==='dependent'} onChange={setE('philhealth_status')} /> Dependent</label>
                      </div>
                    </Field>
                    <Field label="PhilHealth No.">
                      <input className="fm-input" value={enrolment.philhealth_no} onChange={setE('philhealth_no')} placeholder="XX-XXXXXXXXX-X" />
                    </Field>
                    <Field label="Category">
                      <select className="fm-select" value={enrolment.philhealth_category} onChange={setE('philhealth_category')}>
                        <option value="">— Select —</option>
                        <option value="fe_private">FE – Private</option>
                        <option value="fe_government">FE – Government</option>
                        <option value="ie">IE</option>
                        <option value="others">Others</option>
                      </select>
                    </Field>
                  </>
                )}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <Field label="4Ps Member?">
                  <div className="fm-radio-group">
                    <label className="fm-radio"><input type="radio" name="fourps" value="yes" checked={enrolment.fourps_member==='yes'} onChange={setE('fourps_member')} /> Yes</label>
                    <label className="fm-radio"><input type="radio" name="fourps" value="no"  checked={enrolment.fourps_member==='no'}  onChange={setE('fourps_member')} /> No</label>
                  </div>
                </Field>
                <Field label="DSWD NHTS?">
                  <div className="fm-radio-group">
                    <label className="fm-radio"><input type="radio" name="dswd" value="yes" checked={enrolment.dswd_nhts==='yes'} onChange={setE('dswd_nhts')} /> Yes</label>
                    <label className="fm-radio"><input type="radio" name="dswd" value="no"  checked={enrolment.dswd_nhts==='no'}  onChange={setE('dswd_nhts')} /> No</label>
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════ FORM 2 ════ */}
      {tab === 'treatment' && (
        <>
          {/* ── Section I: Patient Information ── */}
          <div className="fm-section">
            <p className="fm-section-title">I. Patient Information (Impormasyon ng Pasyente)</p>

            <div className="fm-grid fm-grid--4" style={{marginBottom:14}}>
              <Field label="Last Name (Apelyido)">
                <input className="fm-input" value={enrolment.last_name} readOnly style={{background:'#f9fafb',color:'#374151'}} />
              </Field>
              <Field label="First Name (Pangalan)">
                <input className="fm-input" value={enrolment.first_name} readOnly style={{background:'#f9fafb',color:'#374151'}} />
              </Field>
              <Field label="Middle Name (Gitnang Pangalan)">
                <input className="fm-input" value={enrolment.middle_name} readOnly style={{background:'#f9fafb',color:'#374151'}} />
              </Field>
              <Field label="Suffix (e.g. Jr., Sr., II, III)">
                <input className="fm-input" value={enrolment.suffix} readOnly style={{background:'#f9fafb',color:'#374151'}} />
              </Field>
            </div>

            <div className="fm-grid fm-grid--3" style={{marginBottom:14}}>
              <Field label="Age (Edad)">
                <input className="fm-input"
                  value={enrolment.date_of_birth ? String(Math.floor((Date.now() - new Date(enrolment.date_of_birth).getTime()) / (1000*60*60*24*365.25))) : ''}
                  readOnly style={{background:'#f9fafb',color:'#374151'}} />
              </Field>
              <Field label="Residential Address (Tirahan)" required>
                <input className="fm-input" value={loc.full} readOnly style={{background:'#f9fafb',color:'#374151'}} placeholder="Auto-filled from Form 1" />
              </Field>
            </div>
          </div>

          {/* ── Section II: For CHU / RHU Personnel Only ── */}
          <div className="fm-section">
            <p className="fm-section-title">II. For CHU / RHU Personnel Only (Para sa Kinatawan ng CHU / RHU Lamang)</p>

            <div className="fm-grid fm-grid--2" style={{marginBottom:14}}>
              <Field label="Mode of Transaction">
                <div className="fm-radio-group" style={{paddingTop:4, flexDirection:'column', gap:6}}>
                  {[
                    {value:'walk_in', label:'Walk-in'},
                    {value:'visited', label:'Visited'},
                    {value:'referral', label:'Referral'},
                  ].map(opt => (
                    <label key={opt.value} className="fm-radio">
                      <input type="radio" name="mot" value={opt.value}
                        checked={treatment.mode_of_transaction === opt.value}
                        onChange={setT('mode_of_transaction')} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </Field>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <p style={{fontSize:11, fontWeight:600, color:'#6b7280', margin:'0 0 2px'}}>For REFERRAL Transaction only.</p>
                <Field label="Referred From">
                  <input className="fm-input" value={treatment.referral_from} onChange={setT('referral_from')}
                    disabled={treatment.mode_of_transaction !== 'referral'}
                    style={{background: treatment.mode_of_transaction !== 'referral' ? '#f9fafb' : '#fff'}} />
                </Field>
                <Field label="Referred To">
                  <input className="fm-input" value={treatment.referral_to} onChange={setT('referral_to')}
                    disabled={treatment.mode_of_transaction !== 'referral'}
                    style={{background: treatment.mode_of_transaction !== 'referral' ? '#f9fafb' : '#fff'}} />
                </Field>
              </div>
            </div>

            <div className="fm-grid fm-grid--2" style={{marginBottom:14}}>
              <Field label="Date of Consultation">
                <input className="fm-input" type="date" value={treatment.date_of_consultation} onChange={setT('date_of_consultation')} />
              </Field>
              <Field label="Consultation Time (AM/PM)">
                <input className="fm-input" type="time" value={treatment.consultation_time} onChange={setT('consultation_time')} />
              </Field>
            </div>

            <div className="apm-vitals" style={{marginBottom:14}}>
              <Field label="Blood Pressure">
                <input className="fm-input" value={treatment.blood_pressure} onChange={setT('blood_pressure')} placeholder="120/80" />
              </Field>
              <Field label="Temperature (°C)">
                <input className="fm-input" value={treatment.temperature} onChange={setT('temperature')} placeholder="36.5" />
              </Field>
              <Field label="Height (cm)">
                <input className="fm-input" value={treatment.height} onChange={setT('height')} placeholder="160" />
              </Field>
              <Field label="Weight (kg)">
                <input className="fm-input" value={treatment.weight} onChange={setT('weight')} placeholder="55" />
              </Field>
            </div>

            <div className="fm-grid fm-grid--2" style={{marginBottom:14}}>
              <Field label="Name of Attending Provider">
                <input className="fm-input" value={treatment.attending_provider} onChange={setT('attending_provider')} />
              </Field>
              <Field label="Referred by">
                <input className="fm-input" value={treatment.referred_by} onChange={setT('referred_by')} />
              </Field>
            </div>

            <Field label="Nature of Visit">
              <div className="fm-radio-group" style={{paddingTop:4}}>
                {['New Consultation/Case','New Admission','Follow-up visit'].map(v => (
                  <label key={v} className="fm-radio">
                    <input type="radio" name="nature" value={v}
                      checked={treatment.nature_of_visit === v} onChange={setT('nature_of_visit')} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          {/* ── Type of Consultation ── */}
          <div className="fm-section">
            <p className="fm-section-title">Type of Consultation / Purpose of Visit</p>
            <div className="apm-check-grid">
              {CONSULT_TYPES.map(t => (
                <label key={t} className="apm-check">
                  <input type="checkbox" checked={treatment.type_of_consultation.includes(t)} onChange={() => toggleConsult(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* ── Clinical Notes ── */}
          <div className="fm-section">
            <p className="fm-section-title">Clinical Notes</p>
            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              <Field label="Chief Complaints">
                <textarea className="fm-textarea" value={treatment.chief_complaints} onChange={setT('chief_complaints')} rows={3} />
              </Field>
              <Field label="Diagnosis">
                <textarea className="fm-textarea" value={treatment.diagnosis} onChange={setT('diagnosis')} rows={3} />
              </Field>
              <div className="fm-grid fm-grid--2">
                <Field label="Medication / Treatment">
                  <textarea className="fm-textarea" value={treatment.medication_treatment} onChange={setT('medication_treatment')} rows={3} />
                </Field>
                <Field label="Name of Health Care Provider">
                  <input className="fm-input" value={treatment.health_care_provider} onChange={setT('health_care_provider')} />
                </Field>
              </div>
              <div className="fm-grid fm-grid--2">
                <Field label="Laboratory Findings / Impression">
                  <textarea className="fm-textarea" value={treatment.laboratory_findings} onChange={setT('laboratory_findings')} rows={3} />
                </Field>
                <Field label="Performed Laboratory Test">
                  <input className="fm-input" value={treatment.performed_lab_test} onChange={setT('performed_lab_test')} />
                </Field>
              </div>
            </div>
          </div>

          <p style={{textAlign:'right', fontSize:11, color:'#94a3b8', paddingTop:4}}>
            Clinic Information System | FORM 2 | Page 1
          </p>
        </>
      )}

      {false && tab === 'card' && (
        <>
          <div className="fm-section">
            <p className="fm-section-title">TAGOLOAN ANIMAL BITE TREATMENT CENTER — Period Exposure Record</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div>
                <strong>Exposure Category:</strong>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                  {(['I', 'II', 'III'] as const).map((cat) => (
                    <label key={cat} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="card_cat"
                        checked={cardState.exposureCategory === cat}
                        onChange={() => setCardState(s => ({ ...s, exposureCategory: cat }))}
                      /> ({cat})
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <strong>Animal Type:</strong>
                <input
                  className="fm-input"
                  value={cardState.animalType}
                  onChange={(e) => setCardState(s => ({ ...s, animalType: e.target.value }))}
                  style={{ marginTop: '4px' }}
                />
              </div>
              <div>
                <strong>ICD 10 Code:</strong>
                <input
                  className="fm-input"
                  value={cardState.icd10Code}
                  onChange={(e) => setCardState(s => ({ ...s, icd10Code: e.target.value }))}
                  placeholder="e.g. Z20.3"
                  style={{ marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.35rem', color: '#17653a' }}>1. Mode of Animal Exposure</strong>
                {[
                  { key: 'nibbling_uncovered_skin', label: 'Nibbling/Licking of uncovered skin' },
                  { key: 'nibbling_broken_skin', label: 'Nibbling/Licking of wounded/broken skin' },
                  { key: 'scratch_abrasion', label: 'Scratch / Abrasion' },
                  { key: 'transdermal_bite', label: 'Transdermal Bite' },
                  { key: 'handling_ingestion_raw_meat', label: 'Handling / Ingestion of raw infected meat' },
                ].map((opt) => (
                  <label key={opt.key} style={{ display: 'block', marginBottom: '0.25rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="card_mode"
                      checked={cardState.modeOfExposure === opt.key}
                      onChange={() => setCardState(s => ({ ...s, modeOfExposure: opt.key }))}
                    />{' '}
                    ( ) {opt.label}
                  </label>
                ))}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.35rem', color: '#17653a' }}>2. Body Part Affected Exposed</strong>
                <label style={{ display: 'block', marginBottom: '0.25rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="card_body"
                    checked={cardState.bodyPartExposed === 'head_neck'}
                    onChange={() => setCardState(s => ({ ...s, bodyPartExposed: 'head_neck' }))}
                  /> ( ) Head and/or neck
                </label>
                <label style={{ display: 'block', marginBottom: '0.25rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="card_body"
                    checked={cardState.bodyPartExposed === 'other_parts'}
                    onChange={() => setCardState(s => ({ ...s, bodyPartExposed: 'other_parts' }))}
                  /> ( ) Other parts of the body
                </label>
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="card_body"
                    checked={cardState.bodyPartExposed === 'na_ingestion'}
                    onChange={() => setCardState(s => ({ ...s, bodyPartExposed: 'na_ingestion' }))}
                  /> ( ) N / A if Ingestion mode
                </label>
              </div>
            </div>

            {/* 9-Row Vaccination Grid Table */}
            <div>
              <strong style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#173d29' }}>
                Period Exposure Vaccination Record
              </strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Period</th>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Adm Route</th>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Date</th>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Given by</th>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Day 0', 'Day 3', 'Day 7', 'Day 28', 'Booster 1', 'Booster 2',
                    'ERIG ________ ml', 'TT (Tetanus Toxoid)', 'ATS (Anti-Tetanus Serum)'
                  ].map((p, i) => (
                    <tr key={p} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}>{p}</td>
                      <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>( ) ID &nbsp;&nbsp; ( ) IM</td>
                      <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>—</td>
                      <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Nurse Staff</td>
                      <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b' }}>Scheduled</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{textAlign:'right', fontSize:11, color:'#94a3b8', paddingTop:4}}>
            Tagoloan RHU | FORM 3 | Period Exposure Vaccination Record Card
          </p>
        </>
      )}
      </PatientFormContent>
    </FormModal>
  );
}
