import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────
interface VaccinationRow {
  period: string;
  route: 'ID' | 'IM' | '';
  date: string;
  givenBy: string;
  signature: string;
}

interface TreatmentRecord {
  id: string;
  date: string;
  registryNo: string;
  hospitalNo: string;
  referredBy: string;
  philhealthPin: string;
  philhealthType: 'member' | 'dependent' | '';
  patientName: string;
  age: string;
  dateOfBirth: string;
  address: string;
  sex: 'male' | 'female' | '';
  exposure: 'I' | 'II' | 'III' | '';
  dateOfExposure: string;
  dateTreatmentStarted: string;
  placeOfExposure: string;
  // Mode of Exposure
  modeNibbling: boolean;
  modeNibblingWounded: boolean;
  modeScratch: boolean;
  modeTransdermal: boolean;
  modeIngestion: boolean;
  // Body Part
  bodyHeadNeck: boolean;
  bodyOther: boolean;
  bodyNA: boolean;
  // Animal
  animalDog: boolean;
  animalOther: string;
  // History
  pastHistoryYes: boolean;
  pastHistorySpecify: string;
  pepCompleted: 'yes' | 'no' | '';
  // Vaccination rows
  vaccinations: VaccinationRow[];
  icd10: string;
  createdAt: string;
}

const defaultVaccinations: VaccinationRow[] = [
  { period: 'Day 0',    route: '', date: '', givenBy: '', signature: '' },
  { period: 'Day 3',    route: '', date: '', givenBy: '', signature: '' },
  { period: 'Day 7',    route: '', date: '', givenBy: '', signature: '' },
  { period: 'Day 28',   route: '', date: '', givenBy: '', signature: '' },
  { period: 'Booster 1',route: '', date: '', givenBy: '', signature: '' },
  { period: 'Booster 2',route: '', date: '', givenBy: '', signature: '' },
  { period: 'ERIG',     route: '', date: '', givenBy: '', signature: '' },
  { period: 'TT',       route: '', date: '', givenBy: '', signature: '' },
  { period: 'ATS',      route: '', date: '', givenBy: '', signature: '' },
];

const emptyRecord = (): Omit<TreatmentRecord, 'id' | 'createdAt'> => ({
  date: '', registryNo: '', hospitalNo: '', referredBy: '', philhealthPin: '',
  philhealthType: '', patientName: '', age: '', dateOfBirth: '', address: '',
  sex: '', exposure: '', dateOfExposure: '', dateTreatmentStarted: '',
  placeOfExposure: '', modeNibbling: false, modeNibblingWounded: false,
  modeScratch: false, modeTransdermal: false, modeIngestion: false,
  bodyHeadNeck: false, bodyOther: false, bodyNA: false,
  animalDog: false, animalOther: '', pastHistoryYes: false, pastHistorySpecify: '',
  pepCompleted: '', vaccinations: defaultVaccinations.map(v => ({ ...v })), icd10: '',
});

// ─── Helpers ─────────────────────────────────────────────────
const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const clinicData = localStorage.getItem('clinicData');
const clinicName = clinicData ? (JSON.parse(clinicData)?.name ?? 'Tagoloan Animal Bite Treatment Center') : 'Tagoloan Animal Bite Treatment Center';
const userData   = localStorage.getItem('userData');
const printedBy  = userData   ? (JSON.parse(userData)?.name  ?? '') : '';

// ─── Print handler ────────────────────────────────────────────
function printRecord(rec: TreatmentRecord) {
  const win = window.open('', '_blank', 'width=900,height=850');
  if (!win) return;
  const vaxRows = rec.vaccinations.map(v => `
    <tr>
      <td style="font-weight:600">${v.period}</td>
      <td style="text-align:center">${v.period.startsWith('ERIG') || v.period === 'TT' || v.period === 'ATS' ? '' : `( ) ID &nbsp; ( ) ${v.period === 'Day 0' ? 'iM' : 'IM'}`}</td>
      <td>${v.date}</td>
      <td>${v.givenBy}</td>
      <td>${v.signature}</td>
    </tr>`).join('');

  win.document.write(`<!DOCTYPE html><html><head>
    <title>${clinicName} — Treatment Record</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:10pt;padding:20px 28px;color:#000;line-height:1.4}
      h2{text-align:center;font-size:12pt;text-transform:uppercase;font-weight:bold;margin-bottom:14px;letter-spacing:0.5px}
      .top{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px}
      .fl{display:flex;align-items:baseline;gap:4px;margin-bottom:3px;font-size:9.5pt}
      .fl .lbl{white-space:nowrap;font-weight:bold}
      .fl .ln{flex:1;border-bottom:1px solid #000;min-width:60px}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
      .sec{font-weight:bold;font-size:9.5pt;margin:10px 0 4px}
      .cb{font-size:9pt;margin-left:8px;margin-bottom:2px}
      .il{display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:9.5pt;margin-bottom:3px}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:9pt}
      th,td{border:1px solid #000;padding:3px 6px;text-align:center}
      th{font-weight:bold;background:#f0f0f0}
      .tbl-title{text-align:center;font-weight:bold;font-size:9pt;margin-bottom:2px}
      .icd{font-size:8.5pt;text-align:right;margin-top:4px}
      @media print{body{padding:12px 16px}@page{margin:1cm}}
    </style>
  </head><body>
    <h2>${clinicName}</h2>
    <div class="top">
      <div>
        <div class="fl"><span class="lbl">Date:</span><span class="ln">${rec.date}</span></div>
        <div class="fl"><span class="lbl">DOH Accreditation No:</span><span class="ln" style="font-weight:bold">2022-10-037</span></div>
        <div class="fl"><span class="lbl">PhilHealth Accreditation Number:</span><span class="ln" style="font-weight:bold">B10034377</span></div>
        <div class="fl"><span class="lbl">PhilHealth Identification Number (PIN):</span><span class="ln">${rec.philhealthPin}</span></div>
      </div>
      <div>
        <div class="fl"><span class="lbl">Registry No:</span><span class="ln">${rec.registryNo}</span></div>
        <div class="fl"><span class="lbl">Hospital No:</span><span class="ln">${rec.hospitalNo}</span></div>
        <div class="fl"><span class="lbl">Referred by:</span><span class="ln">${rec.referredBy}</span></div>
        <div class="il">
          <span>${rec.philhealthType === 'member' ? '[X]' : '( )'} Member</span>
          <span>${rec.philhealthType === 'dependent' ? '[X]' : '( )'} Dependent</span>
        </div>
      </div>
    </div>
    <div class="fl"><span class="lbl">Patient Name:</span><span class="ln">${rec.patientName}</span><span class="lbl" style="margin-left:12px">Age:</span><span class="ln" style="max-width:50px">${rec.age}</span><span class="lbl" style="margin-left:8px">Date of Birth:</span><span class="ln">${rec.dateOfBirth}</span></div>
    <div class="fl"><span class="lbl">Address:</span><span class="ln">${rec.address}</span><span style="margin-left:12px">Sex: ${rec.sex === 'male' ? '[X]' : '( )'} Male &nbsp; ${rec.sex === 'female' ? '[X]' : '( )'} Female</span></div>
    <div class="il">
      <span class="lbl">Exposure:</span>
      <span>${rec.exposure === 'I' ? '[X]' : '( )'} I</span>
      <span>${rec.exposure === 'II' ? '[X]' : '( )'} II</span>
      <span>${rec.exposure === 'III' ? '[X]' : '( )'} III</span>
      <span class="lbl" style="margin-left:8px">Date of Exposure:</span><span class="ln" style="min-width:80px">${rec.dateOfExposure}</span>
      <span class="lbl" style="margin-left:8px">Date Treatment Started:</span><span class="ln" style="min-width:80px">${rec.dateTreatmentStarted}</span>
    </div>
    <div class="fl"><span class="lbl">Place of Exposure:</span><span class="ln">${rec.placeOfExposure}</span></div>
    <div class="two" style="margin-top:10px">
      <div>
        <div class="sec">1. Mode of Animal Exposure</div>
        <div class="cb">${rec.modeNibbling ? '[X]' : '( )'} Nibbling/Licking of uncovered skin</div>
        <div class="cb">${rec.modeNibblingWounded ? '[X]' : '( )'} Nibbling/Licking of wounded/broken skin</div>
        <div class="cb">${rec.modeScratch ? '[X]' : '( )'} Scratch / Abrasion</div>
        <div class="cb">${rec.modeTransdermal ? '[X]' : '( )'} Transdermal Bite</div>
        <div class="cb">${rec.modeIngestion ? '[X]' : '( )'} Handling / Ingestion of raw infected meat</div>
        <div class="il" style="margin-top:4px"><span class="lbl">4. Past History of animal bite:</span><span>${rec.pastHistoryYes ? '[X]' : '( )'} Yes</span><span>${!rec.pastHistoryYes ? '[X]' : '( )'} No</span></div>
      </div>
      <div>
        <div class="sec">2. Body Part Affected Exposed</div>
        <div class="cb">${rec.bodyHeadNeck ? '[X]' : '( )'} Head and/or neck</div>
        <div class="cb">${rec.bodyOther ? '[X]' : '( )'} other parts of the body</div>
        <div class="cb">${rec.bodyNA ? '[X]' : '( )'} N / A if Ingestion mode</div>
        <div class="il" style="margin-top:6px"><span class="lbl">3. Type of Animal</span><span>${rec.animalDog ? '[X]' : '( )'} Dog</span><span>( ) Others: ${rec.animalOther}</span></div>
        <div class="fl" style="margin-top:3px"><span>If yes, specify dates:</span><span class="ln">${rec.pastHistorySpecify}</span></div>
        <div class="il"><span>Was PEP Immunization completed:</span><span>${rec.pepCompleted === 'yes' ? '[X]' : '( )'} Yes ${rec.pepCompleted === 'no' ? '[X]' : '( )'} No</span></div>
      </div>
    </div>
    <div class="tbl-title" style="margin-top:14px">Period Exposure Vaccination Record</div>
    <table>
      <thead><tr><th style="width:15%">Period</th><th style="width:22%">Adm Route</th><th style="width:22%">Date</th><th style="width:22%">Given by</th><th style="width:19%">Signature</th></tr></thead>
      <tbody>${vaxRows}</tbody>
    </table>
    <div class="icd">ICD 10 Code: ${rec.icd10 || '_______________'}</div>
    <div style="margin-top:24px;padding-top:8px;border-top:1px solid #000;display:flex;justify-content:space-between;font-size:8pt;color:#555">
      <span>${clinicName}</span>
      <span>Printed by: ${printedBy} | ${new Date().toLocaleString()}</span>
    </div>
  </body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

// ─── Patient Copy Print handler ───────────────────────────────
function printPatientCopy(rec: TreatmentRecord) {
  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) return;

  // Only Day 0-28 for the patient copy table
  const doseRows = rec.vaccinations
    .filter(v => ['Day 0','Day 3','Day 7','Day 28'].includes(v.period))
    .map(v => `
      <tr>
        <td style="font-weight:600;text-align:center">${v.period}</td>
        <td>${v.signature}</td>
        <td></td>
        <td>${v.date}</td>
      </tr>`).join('');

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Patient Copy — Treatment Record</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;padding:24px 28px;color:#000;line-height:1.45}
      .header-box{border:2px solid #000;padding:10px 14px;text-align:center;margin-bottom:16px}
      .header-box h2{font-size:13pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
      .header-box p{font-size:10pt;font-weight:700;text-transform:uppercase;font-style:italic}
      h3{text-align:center;font-size:12pt;font-weight:700;text-decoration:underline;text-transform:uppercase;margin-bottom:14px;letter-spacing:0.5px}
      .fl{display:flex;align-items:baseline;gap:4px;margin-bottom:4px;font-size:10pt}
      .fl .lbl{font-weight:600;white-space:nowrap}
      .fl .ln{flex:1;border-bottom:1px solid #000;min-width:50px}
      .sec{font-weight:700;font-size:10pt;text-transform:uppercase;margin:12px 0 5px}
      .row{margin-bottom:4px;font-size:10pt}
      table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10pt}
      th,td{border:1px solid #000;padding:4px 8px;text-align:left}
      th{font-weight:700;background:#f0f0f0;text-align:center}
      .line-field{border-bottom:1px solid #000;display:inline-block;min-width:80px}
      @media print{body{padding:14px 16px}@page{margin:0.8cm}}
    </style>
  </head><body>
    <div class="header-box">
      <h2>Tagoloan Animal Bite Center</h2>
      <p>Tagoloan Misamis Oriental</p>
    </div>
    <h3>Treatment Record</h3>

    <div class="fl"><span class="lbl">Registration No.</span><span class="ln">${rec.registryNo}</span><span class="lbl" style="margin-left:12px">Date Registered</span><span class="ln">${rec.date}</span></div>
    <div class="fl"><span class="lbl">Name:</span><span class="ln">${rec.patientName}</span><span class="lbl" style="margin-left:12px">Age:</span><span class="ln" style="max-width:50px">${rec.age}</span></div>
    <div class="fl"><span class="lbl">Address:</span><span class="ln">${rec.address}</span><span style="margin-left:12px;white-space:nowrap">Sex: ${rec.sex === 'male' ? '[X]' : '( )'} M ${rec.sex === 'female' ? '[X]' : '( )'} F</span></div>
    <div class="fl"><span class="lbl">Contact Number:</span><span class="ln"></span></div>

    <div class="sec">History of Exposure</div>
    <div class="row"><span style="font-weight:600">Date:</span> <span class="line-field">${rec.dateOfExposure}</span> &nbsp;&nbsp; <span style="font-weight:600">Place:</span> <span class="line-field" style="min-width:140px">${rec.placeOfExposure}</span></div>
    <div class="row"><span style="font-weight:600">Type:</span> ${rec.modeTransdermal || rec.modeScratch || rec.modeNibbling ? '[X]' : '( )'} Bite &nbsp; ( ) None &nbsp; <span style="font-weight:600">Bite Site:</span> <span class="line-field" style="min-width:120px">${rec.bodyHeadNeck ? 'Head/Neck' : rec.bodyOther ? 'Other parts' : ''}</span></div>
    <div class="row"><span style="font-weight:600">Source of Exposure:</span> ${rec.exposure === 'I' ? '[X]' : '( )'} 1 &nbsp; ${rec.exposure === 'II' ? '[X]' : '( )'} 2 &nbsp; ${rec.exposure === 'III' ? '[X]' : '( )'} 3</div>
    <div class="row"><span style="font-weight:600">Washing of Site:</span> ( ) Yes &nbsp; ( ) No</div>
    <div class="fl" style="margin-top:4px"><span class="lbl">RIG date given:</span><span class="ln" style="max-width:100px"></span><span style="margin:0 8px">at</span><span class="ln"></span></div>

    <div class="sec">Post Exposure Immunization</div>
    <table>
      <thead>
        <tr>
          <th style="width:15%">DOSE</th>
          <th style="width:25%">SIGNATURE</th>
          <th style="width:30%">COST RECOVERY</th>
          <th style="width:30%">REMARKS</th>
        </tr>
      </thead>
      <tbody>${doseRows}</tbody>
    </table>

    <div class="row"><span style="font-weight:600">Route:</span> ( ) ID &nbsp; ( ) IM</div>
    <div class="row"><span style="font-weight:600">Vaccine: Brand Name:</span> ( ) Verorab &nbsp; ( ) Speeda &nbsp; ( ) Vaxirab</div>
    <div class="row" style="margin-left:16px"><span style="font-weight:600">Generic Name</span> ( ) PVRV &nbsp; ( ) PCEC</div>
    <div class="fl" style="margin-top:4px"><span class="lbl">Batch / Lot No.</span><span class="ln"></span><span class="lbl" style="margin-left:12px">Expiration Date:</span><span class="ln"></span></div>
    <div class="row"><span style="font-weight:600">Outcome of vaccination:</span> ( ) Complete &nbsp; ( ) Incomplete</div>
    <div class="fl"><span class="lbl">TT Vaccination Status:</span><span class="ln"></span></div>
    <div class="fl"><span class="lbl">Medication Given:</span><span class="ln"></span></div>
    <div class="fl"><span class="lbl">Remarks:</span><span class="ln"></span></div>

    <div style="margin-top:24px;padding-top:8px;border-top:1px solid #000;font-size:8pt;color:#555;text-align:center">
      Patient Copy — ${clinicName} | Generated: ${new Date().toLocaleDateString()}
    </div>
  </body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

// ─── Form Modal ────────────────────────────────────────────────
interface FormProps { record: Omit<TreatmentRecord,'id'|'createdAt'>; onChange: (r: Omit<TreatmentRecord,'id'|'createdAt'>) => void; }

function TreatmentForm({ record: r, onChange }: FormProps) {
  const set = (field: string, value: unknown) => onChange({ ...r, [field]: value });
  const vaxSet = (i: number, field: keyof VaccinationRow, value: string) => {
    const rows = r.vaccinations.map((v, idx) => idx === i ? { ...v, [field]: value } : v);
    onChange({ ...r, vaccinations: rows });
  };

  const inp: React.CSSProperties = { padding:'7px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' };
  const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:3 };
  const sec: React.CSSProperties = { fontSize:11, fontWeight:700, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 12px', paddingBottom:7, borderBottom:'1px solid #ecfdf5' };

  return (
    <div style={{ fontFamily:'inherit' }}>

      {/* ── Header info ── */}
      <p style={sec}>Patient &amp; Registration Information</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px', marginBottom:16 }}>
        <div><label style={lbl}>Date</label><input style={inp} type="date" value={r.date} onChange={e=>set('date',e.target.value)} /></div>
        <div><label style={lbl}>Registry No.</label><input style={inp} value={r.registryNo} onChange={e=>set('registryNo',e.target.value)} /></div>
        <div><label style={lbl}>Hospital No.</label><input style={inp} value={r.hospitalNo} onChange={e=>set('hospitalNo',e.target.value)} /></div>
        <div><label style={lbl}>Referred by</label><input style={inp} value={r.referredBy} onChange={e=>set('referredBy',e.target.value)} /></div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>PhilHealth Identification Number (PIN)</label>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <input style={{...inp,flex:1}} value={r.philhealthPin} onChange={e=>set('philhealthPin',e.target.value)} placeholder="XX-XXXXXXXXX-X"/>
            <label style={{display:'flex',alignItems:'center',gap:5,fontSize:13,whiteSpace:'nowrap'}}><input type="radio" checked={r.philhealthType==='member'} onChange={()=>set('philhealthType','member')} /> Member</label>
            <label style={{display:'flex',alignItems:'center',gap:5,fontSize:13,whiteSpace:'nowrap'}}><input type="radio" checked={r.philhealthType==='dependent'} onChange={()=>set('philhealthType','dependent')} /> Dependent</label>
          </div>
        </div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Patient Name <span style={{color:'#ef4444'}}>*</span></label><input style={inp} value={r.patientName} onChange={e=>set('patientName',e.target.value)} placeholder="Last, First Middle" /></div>
        <div><label style={lbl}>Age</label><input style={inp} value={r.age} onChange={e=>set('age',e.target.value)} placeholder="e.g. 25" /></div>
        <div><label style={lbl}>Date of Birth</label><input style={inp} type="date" value={r.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)} /></div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Address</label><input style={inp} value={r.address} onChange={e=>set('address',e.target.value)} /></div>
        <div><label style={lbl}>Sex</label>
          <div style={{display:'flex',gap:16,paddingTop:6}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><input type="radio" checked={r.sex==='male'} onChange={()=>set('sex','male')} /> Male</label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><input type="radio" checked={r.sex==='female'} onChange={()=>set('sex','female')} /> Female</label>
          </div>
        </div>
        <div><label style={lbl}>Exposure Category</label>
          <div style={{display:'flex',gap:12,paddingTop:6}}>
            {(['I','II','III'] as const).map(v=>(
              <label key={v} style={{display:'flex',alignItems:'center',gap:5,fontSize:13}}><input type="radio" checked={r.exposure===v} onChange={()=>set('exposure',v)} /> {v}</label>
            ))}
          </div>
        </div>
        <div><label style={lbl}>Date of Exposure</label><input style={inp} type="date" value={r.dateOfExposure} onChange={e=>set('dateOfExposure',e.target.value)} /></div>
        <div><label style={lbl}>Date Treatment Started</label><input style={inp} type="date" value={r.dateTreatmentStarted} onChange={e=>set('dateTreatmentStarted',e.target.value)} /></div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Place of Exposure</label><input style={inp} value={r.placeOfExposure} onChange={e=>set('placeOfExposure',e.target.value)} /></div>
      </div>

      {/* ── Exposure details ── */}
      <p style={sec}>Exposure Details</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px', marginBottom:16 }}>
        <div>
          <p style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>1. Mode of Animal Exposure</p>
          {[
            ['modeNibbling','Nibbling/Licking of uncovered skin'],
            ['modeNibblingWounded','Nibbling/Licking of wounded/broken skin'],
            ['modeScratch','Scratch / Abrasion'],
            ['modeTransdermal','Transdermal Bite'],
            ['modeIngestion','Handling / Ingestion of raw infected meat'],
          ].map(([k,l])=>(
            <label key={k} style={{display:'flex',alignItems:'center',gap:7,fontSize:13,marginBottom:5,cursor:'pointer'}}>
              <input type="checkbox" checked={!!(r as any)[k]} onChange={e=>set(k,e.target.checked)} style={{accentColor:'#10b981',width:14,height:14}} /> {l}
            </label>
          ))}
        </div>
        <div>
          <p style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>2. Body Part Affected Exposed</p>
          {[
            ['bodyHeadNeck','Head and/or neck'],
            ['bodyOther','Other parts of the body'],
            ['bodyNA','N/A if Ingestion mode'],
          ].map(([k,l])=>(
            <label key={k} style={{display:'flex',alignItems:'center',gap:7,fontSize:13,marginBottom:5,cursor:'pointer'}}>
              <input type="checkbox" checked={!!(r as any)[k]} onChange={e=>set(k,e.target.checked)} style={{accentColor:'#10b981',width:14,height:14}} /> {l}
            </label>
          ))}
          <p style={{ fontSize:12, fontWeight:600, margin:'10px 0 6px' }}>3. Type of Animal</p>
          <div style={{display:'flex',gap:12,marginBottom:6}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><input type="checkbox" checked={r.animalDog} onChange={e=>set('animalDog',e.target.checked)} style={{accentColor:'#10b981',width:14,height:14}}/> Dog</label>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:13}}>Others: <input style={{...inp,width:100,padding:'4px 8px'}} value={r.animalOther} onChange={e=>set('animalOther',e.target.value)} /></div>
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px', marginBottom:16 }}>
        <div>
          <p style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>4. Past History of animal bite</p>
          <div style={{display:'flex',gap:12}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><input type="radio" checked={r.pastHistoryYes} onChange={()=>set('pastHistoryYes',true)} /> Yes</label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><input type="radio" checked={!r.pastHistoryYes} onChange={()=>set('pastHistoryYes',false)} /> No</label>
          </div>
        </div>
        {r.pastHistoryYes && <div><label style={lbl}>If yes, specify dates</label><input style={inp} value={r.pastHistorySpecify} onChange={e=>set('pastHistorySpecify',e.target.value)} /></div>}
        <div>
          <p style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>Was PEP Immunization completed?</p>
          <div style={{display:'flex',gap:12}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><input type="radio" checked={r.pepCompleted==='yes'} onChange={()=>set('pepCompleted','yes')} /> Yes</label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}><input type="radio" checked={r.pepCompleted==='no'} onChange={()=>set('pepCompleted','no')} /> No</label>
          </div>
        </div>
      </div>

      {/* ── Vaccination table ── */}
      <p style={sec}>Period Exposure Vaccination Record</p>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', marginBottom:16 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#f0fdf4' }}>
              {['Period','Adm Route','Date','Given by','Signature'].map(h=>(
                <th key={h} style={{ padding:'9px 10px', textAlign:'left', fontWeight:600, fontSize:11, color:'var(--text-h)', borderBottom:'2px solid #10b981', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.vaccinations.map((v,i)=>(
              <tr key={i} style={{ background: i%2===0 ? '#fff' : '#f9fafb' }}>
                <td style={{ padding:'7px 10px', fontWeight:600, fontSize:13, whiteSpace:'nowrap', borderBottom:'1px solid #f0f0f0' }}>{v.period}</td>
                <td style={{ padding:'5px 8px', borderBottom:'1px solid #f0f0f0' }}>
                  {(v.period !== 'ERIG' && v.period !== 'TT' && v.period !== 'ATS') && (
                    <div style={{display:'flex',gap:12}}>
                      <label style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}><input type="radio" checked={v.route==='ID'} onChange={()=>vaxSet(i,'route','ID')} style={{accentColor:'#10b981'}}/> ID</label>
                      <label style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}><input type="radio" checked={v.route==='IM'} onChange={()=>vaxSet(i,'route','IM')} style={{accentColor:'#10b981'}}/> IM</label>
                    </div>
                  )}
                </td>
                <td style={{ padding:'5px 8px', borderBottom:'1px solid #f0f0f0' }}><input style={{...inp,padding:'5px 8px',fontSize:12}} type="date" value={v.date} onChange={e=>vaxSet(i,'date',e.target.value)} /></td>
                <td style={{ padding:'5px 8px', borderBottom:'1px solid #f0f0f0' }}><input style={{...inp,padding:'5px 8px',fontSize:12}} value={v.givenBy} onChange={e=>vaxSet(i,'givenBy',e.target.value)} /></td>
                <td style={{ padding:'5px 8px', borderBottom:'1px solid #f0f0f0' }}><input style={{...inp,padding:'5px 8px',fontSize:12}} value={v.signature} onChange={e=>vaxSet(i,'signature',e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <div style={{ width:200 }}>
          <label style={lbl}>ICD 10 Code</label>
          <input style={inp} value={r.icd10} onChange={e=>set('icd10',e.target.value)} placeholder="e.g. Z20.3" />
        </div>
      </div>
    </div>
  );
}

// ─── Storage key ─────────────────────────────────────────────
const STORAGE_KEY = 'abtc_treatment_records';

// ─── Main Page ────────────────────────────────────────────────
export default function TreatmentRecordsPage() {
  // Load from localStorage on mount
  const [records, setRecords] = useState<TreatmentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<TreatmentRecord | null>(null);
  const [formData, setFormData] = useState<Omit<TreatmentRecord,'id'|'createdAt'>>(emptyRecord());
  const [search, setSearch] = useState('');
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const [patientCopyRec, setPatientCopyRec] = useState<TreatmentRecord | null>(null);

  // Persist to localStorage whenever records change
  const saveRecords = (updated: TreatmentRecord[]) => {
    setRecords(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* quota exceeded */ }
  };

  const openNew = () => {
    setEditRecord(null);
    setFormData(emptyRecord());
    setShowModal(true);
  };

  const openEdit = (rec: TreatmentRecord) => {
    setEditRecord(rec);
    setFormData({ ...rec });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.patientName.trim()) return;
    if (editRecord) {
      saveRecords(records.map(r => r.id === editRecord.id ? { ...formData, id: editRecord.id, createdAt: editRecord.createdAt } : r));
    } else {
      const newRec: TreatmentRecord = {
        ...formData,
        id: `TR-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      saveRecords([newRec, ...records]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    saveRecords(records.filter(r => r.id !== id));
    setShowDeleteId(null);
  };

  const filtered = records.filter(r =>
    r.patientName.toLowerCase().includes(search.toLowerCase()) ||
    r.registryNo.toLowerCase().includes(search.toLowerCase())
  );

  const btn = (bg: string, sm = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: sm ? '6px 14px' : '9px 18px',
    background: `linear-gradient(135deg, ${bg} 0%, ${bg}cc 100%)`,
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: sm ? 12 : 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
    boxShadow: `0 2px 8px ${bg}44`,
  });

  return (
    <div style={{ padding: '0 24px 32px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:6 }}>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 600, color: 'var(--text-h)', margin: '0 0 7px', letterSpacing: -0.5 }}>Treatment Records</h1>
          <p style={{ fontSize:13, color:'#77877d', margin:0 }}>ABTC paper form and clinical management for animal bite treatments.</p>
          {/* Breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontSize:13 }}>
            <button onClick={()=>{window.location.href='/dashboard';}} style={{ background:'none', border:'none', padding:0, color:'#3b82f6', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>Dashboard</button>
            <span style={{ color:'#d1d5db' }}>›</span>
            <span style={{ color:'#6b7280' }}>Treatment Records</span>
          </div>
        </div>
        <button onClick={openNew} style={btn('#10b981')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Treatment Record
        </button>
      </div>

      {/* Search */}
      <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by patient name or registry no…"
          style={{ flex:1, border:'none', background:'none', outline:'none', fontSize:13, fontFamily:'inherit', color:'#374151' }}
        />
        {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:0, display:'flex' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 24px', color:'#9ca3af' }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{margin:'0 auto 16px',display:'block'}}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p style={{ fontSize:15, fontWeight:600, color:'#374151', marginBottom:6 }}>No treatment records yet</p>
          <p style={{ fontSize:13 }}>Click "New Treatment Record" to create the first ABTC form.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(rec => (
            <div key={rec.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, flex:1, minWidth:0 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'#111827', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rec.patientName || '—'}</p>
                  <div style={{ display:'flex', gap:12, fontSize:12, color:'#6b7280', flexWrap:'wrap' }}>
                    {rec.registryNo && <span>Registry: <b>{rec.registryNo}</b></span>}
                    {rec.date && <span>Date: <b>{fmtDate(rec.date)}</b></span>}
                    {rec.exposure && <span>Exposure: <b>Category {rec.exposure}</b></span>}
                    <span style={{ color:'#d1d5db' }}>ID: {rec.id}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button onClick={()=>setPatientCopyRec(rec)} style={btn('#0ea5e9', true)} title="Print Patient Copy">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Patient Copy
                </button>
                <button onClick={()=>printRecord(rec)} style={btn('#6366f1', true)} title="Print Official">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print
                </button>
                <button onClick={()=>openEdit(rec)} style={btn('#10b981', true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button onClick={()=>setShowDeleteId(rec.id)} style={btn('#ef4444', true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}
          onClick={()=>setShowModal(false)}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:820, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}
            onClick={e=>e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid #f3f4f6', flexShrink:0 }}>
              <div>
                <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#111827' }}>{editRecord ? 'Edit Treatment Record' : 'New Treatment Record'}</h2>
                <p style={{ margin:'2px 0 0', fontSize:12, color:'#6b7280' }}>TAGOLOAN ANIMAL BITE TREATMENT CENTER — Official Form</p>
              </div>
              <button onClick={()=>setShowModal(false)} style={{ width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7280' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* Modal body */}
            <div style={{ overflowY:'auto', padding:'24px', flex:1 }}>
              <TreatmentForm record={formData} onChange={setFormData} />
            </div>
            {/* Modal footer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, padding:'14px 24px', borderTop:'1px solid #f3f4f6', flexShrink:0, background:'#fafafa', borderRadius:'0 0 16px 16px' }}>
              <button onClick={()=>setShowModal(false)} style={{ padding:'8px 20px', fontSize:13, fontWeight:600, borderRadius:8, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', color:'#374151', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={!formData.patientName.trim()} style={btn('#10b981')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {editRecord ? 'Save Changes' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Copy Preview Modal */}
      {patientCopyRec && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}
          onClick={()=>setPatientCopyRec(null)}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:600, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', borderBottom:'1px solid #f3f4f6', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:9, background:'#f0f9ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:'#111827' }}>Patient Copy Preview</h2>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'#6b7280' }}>Tagoloan Animal Bite Center — Treatment Record</p>
                </div>
              </div>
              <button onClick={()=>setPatientCopyRec(null)} style={{ width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7280' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* Preview paper */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', background:'#f3f4f6' }}>
              <div style={{ background:'#fff', borderRadius:8, padding:'22px 24px', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', fontFamily:'Arial,sans-serif', fontSize:12, lineHeight:1.5, color:'#000' }}>
                {/* Clinic header box */}
                <div style={{ border:'2px solid #000', padding:'8px 12px', textAlign:'center', marginBottom:14 }}>
                  <p style={{ fontWeight:900, fontSize:13, textTransform:'uppercase', letterSpacing:0.5, margin:'0 0 3px' }}>Tagoloan Animal Bite Center</p>
                  <p style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', fontStyle:'italic', margin:0 }}>Tagoloan Misamis Oriental</p>
                </div>
                <p style={{ textAlign:'center', fontWeight:700, fontSize:13, textDecoration:'underline', textTransform:'uppercase', marginBottom:14 }}>Treatment Record</p>

                <div style={{ display:'flex', gap:4, marginBottom:4 }}><b>Registration No.</b><span style={{ flex:1, borderBottom:'1px solid #000' }}>{patientCopyRec.registryNo}</span><b style={{ marginLeft:10 }}>Date Registered</b><span style={{ flex:1, borderBottom:'1px solid #000' }}>{patientCopyRec.date}</span></div>
                <div style={{ display:'flex', gap:4, marginBottom:4 }}><b>Name:</b><span style={{ flex:2, borderBottom:'1px solid #000' }}>{patientCopyRec.patientName}</span><b style={{ marginLeft:8 }}>Age:</b><span style={{ width:40, borderBottom:'1px solid #000' }}>{patientCopyRec.age}</span></div>
                <div style={{ display:'flex', gap:4, marginBottom:4 }}><b>Address:</b><span style={{ flex:2, borderBottom:'1px solid #000' }}>{patientCopyRec.address}</span><span style={{ marginLeft:8, whiteSpace:'nowrap' }}>Sex: {patientCopyRec.sex==='male'?'[X]':'( )'} M {patientCopyRec.sex==='female'?'[X]':'( )'} F</span></div>
                <div style={{ display:'flex', gap:4, marginBottom:12 }}><b>Contact Number:</b><span style={{ flex:1, borderBottom:'1px solid #000' }}></span></div>

                <p style={{ fontWeight:700, textTransform:'uppercase', marginBottom:5, fontSize:11 }}>History of Exposure</p>
                <div style={{ display:'flex', gap:8, marginBottom:3 }}><b>Date:</b><span style={{ width:80, borderBottom:'1px solid #000' }}>{patientCopyRec.dateOfExposure}</span><b>Place:</b><span style={{ flex:1, borderBottom:'1px solid #000' }}>{patientCopyRec.placeOfExposure}</span></div>
                <div style={{ marginBottom:3 }}><b>Type:</b> {(patientCopyRec.modeTransdermal||patientCopyRec.modeScratch||patientCopyRec.modeNibbling)?'[X]':'( )'} Bite &nbsp; ( ) None &nbsp; <b>Bite Site:</b> <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:80 }}>{patientCopyRec.bodyHeadNeck?'Head/Neck':patientCopyRec.bodyOther?'Other parts':''}</span></div>
                <div style={{ marginBottom:3 }}><b>Source of Exposure:</b> {patientCopyRec.exposure==='I'?'[X]':'( )'} 1 &nbsp; {patientCopyRec.exposure==='II'?'[X]':'( )'} 2 &nbsp; {patientCopyRec.exposure==='III'?'[X]':'( )'} 3</div>
                <div style={{ marginBottom:3 }}><b>Washing of Site:</b> ( ) Yes &nbsp; ( ) No</div>
                <div style={{ display:'flex', gap:4, marginBottom:3 }}><b>RIG date given:</b><span style={{ width:80, borderBottom:'1px solid #000' }}></span><span style={{ margin:'0 6px' }}>at</span><span style={{ flex:1, borderBottom:'1px solid #000' }}></span></div>

                <p style={{ fontWeight:700, textTransform:'uppercase', margin:'12px 0 5px', fontSize:11 }}>Post Exposure Immunization</p>
                <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:10, fontSize:11 }}>
                  <thead>
                    <tr>{['DOSE','SIGNATURE','COST RECOVERY','REMARKS'].map(h=><th key={h} style={{ border:'1px solid #000', padding:'4px 6px', background:'#f5f5f5', fontWeight:700, textAlign:'center' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {patientCopyRec.vaccinations.filter(v=>['Day 0','Day 3','Day 7','Day 28'].includes(v.period)).map(v=>(
                      <tr key={v.period}>
                        <td style={{ border:'1px solid #000', padding:'4px 6px', fontWeight:600, textAlign:'center' }}>{v.period}</td>
                        <td style={{ border:'1px solid #000', padding:'4px 6px' }}>{v.signature}</td>
                        <td style={{ border:'1px solid #000', padding:'4px 6px' }}></td>
                        <td style={{ border:'1px solid #000', padding:'4px 6px' }}>{v.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginBottom:3 }}><b>Route:</b> ( ) ID &nbsp; ( ) IM</div>
                <div style={{ marginBottom:3 }}><b>Vaccine: Brand Name:</b> ( ) Verorab &nbsp; ( ) Speeda &nbsp; ( ) Vaxirab</div>
                <div style={{ marginBottom:6, marginLeft:8 }}><b>Generic Name</b> ( ) PVRV &nbsp; ( ) PCEC</div>
                <div style={{ display:'flex', gap:4, marginBottom:3 }}><b>Batch / Lot No.</b><span style={{ flex:1, borderBottom:'1px solid #000' }}></span><b style={{ marginLeft:8 }}>Expiration Date:</b><span style={{ flex:1, borderBottom:'1px solid #000' }}></span></div>
                <div style={{ marginBottom:3 }}><b>Outcome of vaccination:</b> ( ) Complete &nbsp; ( ) Incomplete</div>
                <div style={{ display:'flex', gap:4, marginBottom:3 }}><b>TT Vaccination Status:</b><span style={{ flex:1, borderBottom:'1px solid #000' }}></span></div>
                <div style={{ display:'flex', gap:4, marginBottom:3 }}><b>Medication Given:</b><span style={{ flex:1, borderBottom:'1px solid #000' }}></span></div>
                <div style={{ display:'flex', gap:4, marginBottom:0 }}><b>Remarks:</b><span style={{ flex:1, borderBottom:'1px solid #000' }}></span></div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, padding:'12px 22px', borderTop:'1px solid #f3f4f6', flexShrink:0, background:'#fafafa', borderRadius:'0 0 16px 16px' }}>
              <button onClick={()=>setPatientCopyRec(null)} style={{ padding:'8px 18px', fontSize:13, fontWeight:600, borderRadius:8, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', color:'#374151', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={()=>{ printPatientCopy(patientCopyRec); setPatientCopyRec(null); }} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', fontSize:13, fontWeight:600, borderRadius:8, background:'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(14,165,233,0.3)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print Patient Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
          onClick={()=>setShowDeleteId(null)}>
          <div style={{ background:'#fff', borderRadius:12, padding:'28px 32px', maxWidth:400, width:'100%', margin:20, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ margin:'0 0 10px', color:'#111827' }}>Delete this record?</h3>
            <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 20px' }}>This action cannot be undone.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowDeleteId(null)} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>Cancel</button>
              <button onClick={()=>handleDelete(showDeleteId)} style={{ ...btn('#ef4444'), padding:'8px 18px' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
