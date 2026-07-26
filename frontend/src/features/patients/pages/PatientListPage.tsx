import { useState, useEffect, useCallback } from 'react';
import AddPatientModal from '../components/AddPatientModal';
import { PatientListRoot } from '../styles/PatientList.styles';
import { ROUTES } from '../../../shared/config/routes';

// ─── Types ────────────────────────────────────────────────────
interface Patient {
  id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  phone?: string;
  created_at: string;
  status?: 'active' | 'pending' | 'inactive';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fullName(p: Patient) {
  return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
}

// ─── Print Preview Modal ──────────────────────────────────────
interface PrintModalProps {
  patients: Patient[]; total: number;
  clinicName: string; printedBy: string;
  onConfirm: () => void; onCancel: () => void;
}
function PrintPreviewModal({ patients, total, clinicName, printedBy, onConfirm, onCancel }: PrintModalProps) {
  const printDate = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
  const th: React.CSSProperties = {
    background: '#f0fdf4', color: '#173d29', fontWeight: 600,
    padding: '9px 12px', textAlign: 'left', borderBottom: '2px solid #10b981',
    whiteSpace: 'nowrap', fontSize: 12,
  };
  const td: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 12 };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}
      onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="pt-print-title">
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:900, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #e5e7eb', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </div>
            <div>
              <h2 id="pt-print-title" style={{ margin:0, fontSize:16, fontWeight:700, color:'#173d29' }}>Print Preview — Patient Registry</h2>
              <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>Review before sending to printer</p>
            </div>
          </div>
          <button onClick={onCancel} aria-label="Close" style={{ width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Preview paper */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 22px', background:'#f3f4f6' }}>
          <div style={{ background:'#fff', borderRadius:8, padding:'28px 32px', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', fontSize:13 }}>

            {/* Letterhead */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:6 }}>
              <div style={{ width:52, height:52, border:'2px solid #000', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, flexShrink:0 }}>✚</div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:8, letterSpacing:1, textTransform:'uppercase', color:'#333' }}>Republic of the Philippines — Department of Health</div>
                <div style={{ fontSize:14, fontWeight:700, textTransform:'uppercase', margin:'2px 0' }}>{clinicName}</div>
                <div style={{ fontSize:9, color:'#555' }}>Animal Bite Treatment Center</div>
              </div>
            </div>
            <hr style={{ border:'none', borderTop:'3px double #000', margin:'6px 0 3px' }}/>
            <hr style={{ border:'none', borderTop:'1px solid #000', margin:'2px 0 14px' }}/>

            <div style={{ textAlign:'center', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:1, textDecoration:'underline' }}>Patient Registry</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px 20px', border:'1px solid #ccc', padding:'9px 12px', marginBottom:16, fontSize:11 }}>
              <span style={{ color:'#444' }}>Total Patients:</span><span style={{ fontWeight:700 }}>{total}</span>
              <span style={{ color:'#444' }}>Date Generated:</span><span style={{ fontWeight:700 }}>{printDate}</span>
              <span style={{ color:'#444' }}>Prepared by:</span><span style={{ fontWeight:700 }}>{printedBy}</span>
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:'#173d29', borderLeft:'3px solid #10b981', paddingLeft:10, marginBottom:10 }}>
              Registered Patients ({patients.length} shown)
            </div>
            <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['#','Patient No.','Full Name','Date of Birth','Gender','Address','Registered On','Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {patients.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>No patients to display.</td></tr>
                    : patients.map((p, i) => (
                      <tr key={p.id} style={i % 2 !== 0 ? { background:'#f9fafb' } : {}}>
                        <td style={td}>{i+1}</td>
                        <td style={{ ...td, fontFamily:'monospace', fontSize:11 }}>{p.patient_number}</td>
                        <td style={{ ...td, fontWeight:600 }}>{fullName(p)}</td>
                        <td style={td}>{formatDate(p.date_of_birth)}</td>
                        <td style={{ ...td, textTransform:'capitalize' }}>{p.gender}</td>
                        <td style={{ ...td, fontSize:11 }}>{p.address || '—'}</td>
                        <td style={td}>{formatDate(p.created_at)}</td>
                        <td style={td}>
                          <span style={{
                            padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600,
                            background: p.status === 'active' ? '#d1fae5' : p.status === 'pending' ? '#fef3c7' : '#f3f4f6',
                            color:      p.status === 'active' ? '#065f46' : p.status === 'pending' ? '#92400e' : '#374151',
                          }}>
                            {(p.status ?? 'active').charAt(0).toUpperCase() + (p.status ?? 'active').slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {/* Signature */}
            <div style={{ marginTop:32, display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
              <div><div style={{ borderTop:'1px solid #000', marginTop:32, paddingTop:4 }}>
                <div style={{ fontWeight:700, textTransform:'uppercase', fontSize:11 }}>{printedBy}</div>
                <div style={{ fontSize:10, color:'#555' }}>Prepared by</div>
              </div></div>
              <div><div style={{ borderTop:'1px solid #000', marginTop:32, paddingTop:4 }}>
                <div style={{ fontWeight:700, fontSize:11 }}>____________________________</div>
                <div style={{ fontSize:10, color:'#555' }}>Noted by / Authorized Signatory</div>
              </div></div>
            </div>
            <div style={{ marginTop:24, paddingTop:8, borderTop:'2px solid #000', display:'flex', justifyContent:'space-between', fontSize:9, color:'#555' }}>
              <span>{clinicName} — Animal Bite Treatment Center</span>
              <span>{printDate}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid #e5e7eb', flexShrink:0, background:'#fafafa', borderRadius:'0 0 16px 16px' }}>
          <button onClick={onCancel} style={{ padding:'8px 20px', fontSize:13, fontWeight:600, borderRadius:8, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', color:'#374151', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 20px', fontSize:13, fontWeight:600, borderRadius:8, background:'linear-gradient(135deg, #10b981 0%, #059669 100%)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(16,185,129,0.3)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function PatientList() {
  const [patients,    setPatients]    = useState<Patient[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [perPage,     setPerPage]     = useState(10);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // User / clinic context
  const userData   = localStorage.getItem('userData');
  const clinicData = localStorage.getItem('clinicData');
  const userRole   = userData   ? (JSON.parse(userData)?.role  ?? '') : '';
  const printedBy  = userData   ? (JSON.parse(userData)?.name  ?? 'Unknown') : 'Unknown';
  const clinicName = clinicData ? (JSON.parse(clinicData)?.name ?? 'Animal Bite Treatment Center') : 'Animal Bite Treatment Center';

  const fetchPatients = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token  = localStorage.getItem('authToken');
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(search ? { search } : {}) });
      const res = await fetch(`http://localhost:8000/api/patients?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to load patients');
      const json = await res.json();
      if (Array.isArray(json)) {
        setPatients(json); setTotal(json.length); setTotalPages(1);
      } else {
        setPatients(json.data ?? []); setTotal(json.total ?? 0); setTotalPages(json.last_page ?? 1);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page, search, perPage]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { setPage(1); }, [search, perPage]);

  const getStatus = (p: Patient): 'active' | 'pending' | 'inactive' => p.status ?? 'active';
  const activeCount  = patients.filter(p => getStatus(p) === 'active').length;
  const pendingCount = patients.filter(p => getStatus(p) === 'pending').length;

  const handleConfirmPrint = () => {
    const now = new Date();
    const refNo         = `ABTC-PT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const printDateFull = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const printTimeFull = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

    const rows = patients.map((p, i) => {
      const dob    = new Date(p.date_of_birth).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const reg    = new Date(p.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const status = p.status ?? 'active';
      return `<tr>
        <td style="text-align:center">${i+1}</td>
        <td style="font-family:monospace">${p.patient_number}</td>
        <td style="font-weight:700">${fullName(p)}</td>
        <td style="text-align:center">${dob}</td>
        <td style="text-align:center;text-transform:capitalize">${p.gender}</td>
        <td>${p.address || '—'}</td>
        <td style="text-align:center">${reg}</td>
        <td style="text-align:center;text-transform:capitalize">${status}</td>
      </tr>`;
    }).join('');

    const CSS = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',Times,serif;color:#000;background:#fff;padding:40px 48px;font-size:12pt;line-height:1.5}.letterhead{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:6px}.logo{width:64px;height:64px;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0}.org{text-align:center}.org .republic{font-size:9pt;letter-spacing:1px;text-transform:uppercase}.org .dept{font-size:9pt;font-weight:700;text-transform:uppercase}.org .clinic{font-size:14pt;font-weight:700;text-transform:uppercase;margin:2px 0}.org .address{font-size:9pt;color:#333}.divider-thick{border:none;border-top:3px double #000;margin:8px 0 4px}.divider-thin{border:none;border-top:1px solid #000;margin:2px 0 16px}.doc-title{text-align:center;margin:16px 0 20px}.doc-title h2{font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-decoration:underline}.doc-title p{font-size:10pt;margin-top:4px}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:20px;font-size:10pt;border:1px solid #ccc;padding:10px 14px}h3.sec{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #000;padding-bottom:3px;margin:20px 0 10px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:9.5pt}th{background:#000;color:#fff;font-weight:700;padding:5px 8px;text-align:left}td{padding:4px 8px;border-bottom:1px solid #ccc}tr:nth-child(even) td{background:#f5f5f5}.sig-section{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.sig-block .line{border-top:1px solid #000;margin-top:36px;padding-top:4px}.sig-block .name{font-weight:700;font-size:11pt;text-transform:uppercase}.sig-block .position{font-size:9.5pt}.footer-bar{margin-top:40px;padding-top:8px;border-top:2px solid #000;display:flex;justify-content:space-between;font-size:8.5pt;color:#555}@media print{body{padding:20px 28px}@page{margin:1.5cm}}`;

    const win = window.open('', '_blank', 'width=1000,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${clinicName} — Patient Registry</title><style>${CSS}</style></head><body>
      <div class="letterhead"><div class="logo">✚</div><div class="org"><div class="republic">Republic of the Philippines</div><div class="dept">Department of Health</div><div class="clinic">${clinicName}</div><div class="address">Animal Bite Treatment Center</div></div></div>
      <hr class="divider-thick"><hr class="divider-thin">
      <div class="doc-title"><h2>Patient Registry</h2><p>Reference No.: ${refNo}</p></div>
      <div class="meta-grid">
        <span style="color:#444">Total Patients:</span><span style="font-weight:700">${total}</span>
        <span style="color:#444">Date Generated:</span><span style="font-weight:700">${printDateFull}</span>
        <span style="color:#444">Time Generated:</span><span style="font-weight:700">${printTimeFull}</span>
        <span style="color:#444">Prepared by:</span><span style="font-weight:700">${printedBy}</span>
      </div>
      <h3 class="sec">I. Registered Patients (${patients.length} shown)</h3>
      <table>
        <thead><tr>
          <th style="text-align:center;width:3%">#</th><th>Patient No.</th><th>Full Name</th>
          <th style="text-align:center">Date of Birth</th><th style="text-align:center">Gender</th>
          <th>Address</th><th style="text-align:center">Registered On</th><th style="text-align:center">Status</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#888">No patients found.</td></tr>'}</tbody>
      </table>
      <div class="sig-section">
        <div class="sig-block"><div class="line"><div class="name">${printedBy}</div><div class="position">Prepared by</div></div></div>
        <div class="sig-block"><div class="line"><div class="name">____________________________</div><div class="position">Noted by / Authorized Signatory</div></div></div>
      </div>
      <div class="footer-bar"><span>${clinicName} — Animal Bite Treatment Center</span><span>Ref: ${refNo} | ${printDateFull}</span></div>
    </body></html>`);
    win.document.close(); win.focus();
    setShowPrintModal(false);
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <PatientListRoot>
      {/* Breadcrumb */}
      <div className="pm-breadcrumb">
        <button className="pm-breadcrumb-link" onClick={() => { window.location.href = ROUTES.DASHBOARD; }}>Dashboard</button>
        <span className="pm-breadcrumb-sep">›</span>
        <span>Patients</span>
      </div>

      <div className="pm-layout">
        {/* ── Left: Table ── */}
        <div className="pm-main-panel">
          <div className="pm-panel-header">
            <div>
              <h1 className="pm-title">Patient Management</h1>
              <p className="pm-subtitle">Manage and track all registered patients</p>
            </div>
            <button className="pm-add-btn" onClick={() => setShowAddModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Patient
            </button>
          </div>

          {/* Controls */}
          <div className="pm-controls">
            <div className="pm-show-entries">
              <span>Show</span>
              <select className="pm-entries-select" value={perPage} onChange={e => setPerPage(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="pm-controls-right">
              <div className="pm-search-wrap">
                <svg className="pm-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input className="pm-search" placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} />
                {search && (
                  <button className="pm-search-clear" onClick={() => setSearch('')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              <button className="pm-print-btn" onClick={() => setShowPrintModal(true)} title="Print patient list">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="pm-table-wrap">
            {loading ? (
              <div className="pm-state"><div className="pm-spinner" /><p>Loading patients…</p></div>
            ) : error ? (
              <div className="pm-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ color:'#ef4444' }}>{error}</p>
                <button className="pm-retry-btn" onClick={fetchPatients}>Retry</button>
              </div>
            ) : patients.length === 0 ? (
              <div className="pm-state">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p>{search ? 'No patients match your search.' : 'No patients registered yet.'}</p>
              </div>
            ) : (
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Patient No.</th><th>Patient Name</th>
                    <th>Date Registered</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => {
                    const status = getStatus(p);
                    return (
                      <tr key={p.id}>
                        <td><span className="pm-patient-no">{p.patient_number}</span></td>
                        <td><span className="pm-patient-name">{fullName(p)}</span></td>
                        <td>{formatDate(p.created_at)}</td>
                        <td>
                          <span className={`pm-status pm-status--${status}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="pm-actions">
                            <button className="pm-btn-view" title="View">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              View
                            </button>
                            <button className="pm-btn-edit" title="Edit">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="pm-pagination">
              <span className="pm-page-info">Page {page} of {totalPages} ({total} total)</span>
              <div className="pm-page-btns">
                <button className="pm-page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>← Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                  return (
                    <button key={pg} className={`pm-page-btn ${pg===page?'pm-page-btn--active':''}`} onClick={() => setPage(pg)}>{pg}</button>
                  );
                })}
                <button className="pm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Stats ── */}
        <div className="pm-side-panel">
          <div className="pm-stat-card pm-stat-card--teal">
            <div className="pm-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="pm-stat-body">
              <p className="pm-stat-label">Total Patients</p>
              <p className="pm-stat-value">{total}</p>
              <p className="pm-stat-sub">All registered</p>
            </div>
          </div>
          <div className="pm-stat-card pm-stat-card--green">
            <div className="pm-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="pm-stat-body">
              <p className="pm-stat-label">Active Patients</p>
              <p className="pm-stat-value">{activeCount}</p>
              <p className="pm-stat-sub">Currently active</p>
            </div>
          </div>
          <div className="pm-stat-card pm-stat-card--emerald">
            <div className="pm-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="pm-stat-body">
              <p className="pm-stat-label">Follow-up Patients</p>
              <p className="pm-stat-value">{pendingCount}</p>
              <p className="pm-stat-sub">Pending follow-up</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddPatientModal
          role={userRole}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchPatients(); }}
        />
      )}
      {showPrintModal && (
        <PrintPreviewModal
          patients={patients}
          total={total}
          clinicName={clinicName}
          printedBy={printedBy}
          onConfirm={handleConfirmPrint}
          onCancel={() => setShowPrintModal(false)}
        />
      )}
    </PatientListRoot>
  );
}
