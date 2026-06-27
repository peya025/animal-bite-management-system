import { useState, useEffect } from 'react';
import FormModal from '../../../../components/forms/FormModal';
import { PatientFormContent } from './AddPatientModal.styles';

// ── PSGC ─────────────────────────────────────────────────────
const PSGC = 'https://psgc.gitlab.io/api';
interface PsgcItem { code: string; name: string; }
const MIS_OR = '124900000';

function useAddressLocation() {
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay]         = useState('');
  const [purok, setPurok]               = useState('');
  const [municipalities, setMunicipalities] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays]           = useState<PsgcItem[]>([]);
  const [loadingMun, setLoadingMun]   = useState(false);
  const [loadingBrgy, setLoadingBrgy] = useState(false);

  useEffect(() => {
    setLoadingMun(true);
    fetch(`${PSGC}/provinces/${MIS_OR}/cities-municipalities/`)
      .then(r => r.json())
      .then((d: PsgcItem[]) => setMunicipalities(d.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setMunicipalities([]))
      .finally(() => setLoadingMun(false));
  }, []);

  useEffect(() => {
    if (!municipality) { setBarangays([]); setBarangay(''); return; }
    setLoadingBrgy(true);
    fetch(`${PSGC}/cities-municipalities/${municipality}/barangays/`)
      .then(r => r.json())
      .then((d: PsgcItem[]) => { setBarangays(d.sort((a, b) => a.name.localeCompare(b.name))); setBarangay(''); })
      .catch(() => setBarangays([]))
      .finally(() => setLoadingBrgy(false));
  }, [municipality]);

  const munName  = municipalities.find(m => m.code === municipality)?.name || '';
  const brgyName = barangays.find(b => b.code === barangay)?.name || '';
  const full     = [purok, brgyName, munName, 'Misamis Oriental'].filter(Boolean).join(', ');

  return { municipality, setMunicipality, barangay, setBarangay, purok, setPurok,
           municipalities, barangays, loadingMun, loadingBrgy, munName, brgyName, full };
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
interface Props { onClose: () => void; onSuccess: () => void; }

export default function AddPatientModal({ onClose, onSuccess }: Props) {
  const [tab, setTab]             = useState<'enrolment'|'treatment'>('enrolment');
  const [enrolment, setEnrolment] = useState(E0);
  const [treatment, setTreatment] = useState(T0);
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
    if (!enrolment.last_name || !enrolment.first_name || !enrolment.date_of_birth || !enrolment.sex || !loc.full) {
      setError('Please fill in all required fields (name, DOB, sex, address).');
      setTab('enrolment');
      return;
    }
    setError(''); setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:8000/api/patients', {
        method: 'POST',
        headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json', Accept:'application/json' },
        body: JSON.stringify({
          ...enrolment,
          gender: enrolment.sex,
          address: loc.full,
          address_municipality: loc.munName,
          address_barangay: loc.brgyName,
          address_purok: loc.purok,
          province: 'Misamis Oriental',
          phone: enrolment.contact_number,
          treatment_record: treatment,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Failed to save.'); }
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to save patient.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      title="Patient Record"
      subtitle="Integrated Clinic Information System (iCLINICSYS)"
      onClose={onClose}
      maxWidth={800}
      footer={
        <>
          {error && <p style={{flex:1,fontSize:13,color:'#ef4444',margin:0,alignSelf:'center'}}>{error}</p>}
          <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Patient'}
          </button>
        </>
      }
    >
      <PatientFormContent>
      {/* Tabs */}
      <div className="apm-tabs">
        <button className={`apm-tab ${tab==='enrolment'?'apm-tab--active':''}`} onClick={()=>setTab('enrolment')}>
          Form 1 — Patient Enrolment
        </button>
        <button className={`apm-tab ${tab==='treatment'?'apm-tab--active':''}`} onClick={()=>setTab('treatment')}>
          Form 2 — Individual Treatment
        </button>
      </div>

      {/* ════ FORM 1 ════ */}
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
            <p className="fm-section-title">Residential Address — Misamis Oriental (Tirahan)</p>
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
          {/* Section I — Patient Info (auto-filled from Form 1) */}
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
              <div className="fm-grid fm-grid--2">
                <Field label="Suffix">
                  <input className="fm-input" value={enrolment.suffix} readOnly style={{background:'#f9fafb',color:'#374151'}} />
                </Field>
                <Field label="Age">
                  <input
                    className="fm-input"
                    value={enrolment.date_of_birth
                      ? String(Math.floor((Date.now() - new Date(enrolment.date_of_birth).getTime()) / (1000*60*60*24*365.25)))
                      : ''}
                    readOnly
                    style={{background:'#f9fafb',color:'#374151'}}
                  />
                </Field>
              </div>
            </div>
            <Field label="Residential Address (Tirahan)">
              <input className="fm-input" value={loc.full} readOnly style={{background:'#f9fafb',color:'#374151'}} placeholder="Auto-filled from Form 1" />
            </Field>
          </div>
          <div className="fm-section">
            <p className="fm-section-title">II. For CHU / RHU Personnel Only</p>

            <div className="fm-grid fm-grid--2" style={{marginBottom:14}}>
              <Field label="Mode of Transaction">
                <div className="fm-radio-group" style={{paddingTop:4}}>
                  <label className="fm-radio"><input type="radio" name="mot" value="walk_in"  checked={treatment.mode_of_transaction==='walk_in'}  onChange={setT('mode_of_transaction')} /> Walk-in / Visited</label>
                  <label className="fm-radio"><input type="radio" name="mot" value="referral" checked={treatment.mode_of_transaction==='referral'} onChange={setT('mode_of_transaction')} /> Referral</label>
                </div>
              </Field>
              {treatment.mode_of_transaction === 'referral' && (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <Field label="Referred From">
                    <input className="fm-input" value={treatment.referral_from} onChange={setT('referral_from')} />
                  </Field>
                  <Field label="Referred To">
                    <input className="fm-input" value={treatment.referral_to} onChange={setT('referral_to')} />
                  </Field>
                </div>
              )}
            </div>

            <div className="fm-grid fm-grid--2" style={{marginBottom:14}}>
              <Field label="Date of Consultation">
                <input className="fm-input" type="date" value={treatment.date_of_consultation} onChange={setT('date_of_consultation')} />
              </Field>
              <Field label="Consultation Time">
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
              <Field label="Attending Provider">
                <input className="fm-input" value={treatment.attending_provider} onChange={setT('attending_provider')} />
              </Field>
              <Field label="Referred By">
                <input className="fm-input" value={treatment.referred_by} onChange={setT('referred_by')} />
              </Field>
            </div>

            <Field label="Nature of Visit">
              <div className="fm-radio-group" style={{paddingTop:4}}>
                {['New Consultation/Case','New Admission','Follow-up Visit'].map(v => (
                  <label key={v} className="fm-radio">
                    <input type="radio" name="nature" value={v} checked={treatment.nature_of_visit===v} onChange={setT('nature_of_visit')} /> {v}
                  </label>
                ))}
              </div>
            </Field>
          </div>

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

          <div className="fm-section">
            <p className="fm-section-title">Clinical Notes</p>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
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
        </>
      )}
      </PatientFormContent>
    </FormModal>
  );
}
