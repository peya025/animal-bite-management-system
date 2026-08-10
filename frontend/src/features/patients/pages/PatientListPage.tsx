import { useState, useEffect, useCallback, useMemo } from 'react';
import AddPatientModal from '../components/AddPatientModal';
import { PatientListRoot } from '../styles/PatientList.styles';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import { printDocument } from '../../../components/print/printDocument';

// ─── Types ───────────────────────────────────────────────────
import type { Patient } from '../types';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const fullName = (p: Patient) =>
  [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');

// ─── Main Component ───────────────────────────────────────────
export default function PatientList() {
  const [patients,       setPatients]       = useState<Patient[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [search,         setSearch]         = useState('');
  const [searchTerm,     setSearchTerm]     = useState(''); // Debounced search term
  const [page,           setPage]           = useState(1);
  const [totalPages,     setTotalPages]     = useState(1);
  const [total,          setTotal]          = useState(0);
  const [perPage,        setPerPage]        = useState(10);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const userData   = localStorage.getItem('userData');
  const clinicData = localStorage.getItem('clinicData');
  const userRole   = userData   ? (JSON.parse(userData)?.role  ?? '') : '';
  const printedBy  = userData   ? (JSON.parse(userData)?.name  ?? 'Unknown') : 'Unknown';
  const clinicName = clinicData ? (JSON.parse(clinicData)?.name ?? 'Animal Bite Treatment Center') : 'Animal Bite Treatment Center';

  // Debounce search input (wait 400ms after user stops typing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const fetchPatients = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token  = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: String(page), per_page: String(perPage), ...(searchTerm ? { search: searchTerm } : {}),
      });
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
  }, [page, searchTerm, perPage]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { setPage(1); }, [perPage]);

  const getStatus = (p: Patient): 'active' | 'pending' | 'inactive' => p.status ?? 'active';
  
  // Memoize statistics to avoid recalculating on every render
  const stats = useMemo(() => ({
    activeCount: patients.filter(p => getStatus(p) === 'active').length,
    pendingCount: patients.filter(p => getStatus(p) === 'pending').length,
  }), [patients]);

  // Build the patient table HTML for the print window
  const buildPrintBody = () => {
    const rows = patients.map((p, i) => {
      const dob    = new Date(p.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const reg    = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const status = p.status ?? 'active';
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td style="font-family:monospace">${p.patient_number}</td>
        <td style="font-weight:700">${fullName(p)}</td>
        <td style="text-align:center">${dob}</td>
        <td style="text-align:center;text-transform:capitalize">${p.gender}</td>
        <td>${p.address || '—'}</td>
        <td style="text-align:center">${reg}</td>
        <td style="text-align:center;text-transform:capitalize">${status}</td>
      </tr>`;
    }).join('');
    return `
      <h3 class="sec">I. Registered Patients (${patients.length} shown)</h3>
      <p class="note">Total registered patients in the system: ${total}</p>
      <table>
        <thead><tr>
          <th style="text-align:center;width:3%">#</th>
          <th>Patient No.</th><th>Full Name</th>
          <th style="text-align:center">Date of Birth</th>
          <th style="text-align:center">Gender</th>
          <th>Address</th>
          <th style="text-align:center">Registered On</th>
          <th style="text-align:center">Status</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#888">No patients found.</td></tr>'}</tbody>
      </table>`;
  };

  const handleConfirmPrint = () => {
    printDocument({
      clinicName,
      printedBy,
      title: 'Patient Registry',
      refPrefix: 'PT',
      bodyHtml: buildPrintBody(),
    });
    setShowPrintModal(false);
  };

  // Preview table for the modal
  const th: React.CSSProperties = {
    background: '#f0fdf4', color: '#173d29', fontWeight: 600,
    padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #10b981',
    whiteSpace: 'nowrap', fontSize: 11,
  };
  const td: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #f0f0f0', fontSize: 11 };

  return (
    <PatientListRoot>
      <div className="pm-layout">
        {/* ── Table panel ── */}
        <div className="pm-main-panel">
          <div className="pm-panel-header">
            <div>
              <h1 className="pm-title">Patient Management</h1>
              <p className="pm-subtitle">Manage and track all registered patients</p>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
                <button
                  onClick={() => { window.location.href = '/dashboard'; }}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Dashboard
                </button>
                <span style={{ color: '#9ca3af' }}>›</span>
                <span style={{ color: '#6b7280' }}>Patients</span>
              </div>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                <p style={{ color: '#ef4444' }}>{error}</p>
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
                      <tr key={`patient-${p.patient_id || p.id}`}>
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
                            <button className="pm-btn-view">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                              View
                            </button>
                            <button className="pm-btn-edit">
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
                <button className="pm-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                {(() => {
                  const pageButtons = [];
                  const maxButtons = Math.min(5, totalPages);
                  
                  // Calculate start page to show centered around current page
                  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
                  const endPage = Math.min(totalPages, startPage + maxButtons - 1);
                  
                  // Adjust start if we're near the end
                  if (endPage - startPage + 1 < maxButtons) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                  }
                  
                  for (let pg = startPage; pg <= endPage; pg++) {
                    pageButtons.push(
                      <button 
                        key={`page-btn-${pg}`} 
                        className={`pm-page-btn ${pg === page ? 'pm-page-btn--active' : ''}`} 
                        onClick={() => setPage(pg)}
                      >
                        {pg}
                      </button>
                    );
                  }
                  
                  return pageButtons;
                })()}
                <button className="pm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
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
              <p className="pm-stat-value">{stats.activeCount}</p>
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
              <p className="pm-stat-value">{stats.pendingCount}</p>
              <p className="pm-stat-sub">Pending follow-up</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddPatientModal
          role={userRole}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchPatients(); }}
        />
      )}

      {showPrintModal && (
        <PrintPreviewModal
          title="Patient Registry"
          clinicName={clinicName}
          printedBy={printedBy}
          onConfirm={handleConfirmPrint}
          onCancel={() => setShowPrintModal(false)}
        >
          {/* Preview table */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#173d29', borderLeft: '3px solid #10b981', paddingLeft: 10, marginBottom: 10 }}>
            Registered Patients ({patients.length} shown)
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['#', 'Patient No.', 'Full Name', 'DOB', 'Gender', 'Registered On', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {patients.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No patients.</td></tr>
                  : patients.map((p, i) => (
                    <tr key={`print-patient-${p.patient_id || p.id}`} style={i % 2 !== 0 ? { background: '#f9fafb' } : {}}>
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: 10 }}>{p.patient_number}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{fullName(p)}</td>
                      <td style={td}>{formatDate(p.date_of_birth)}</td>
                      <td style={{ ...td, textTransform: 'capitalize' }}>{p.gender}</td>
                      <td style={td}>{formatDate(p.created_at)}</td>
                      <td style={td}>
                        <span style={{
                          padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600,
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
        </PrintPreviewModal>
      )}
    </PatientListRoot>
  );
}
