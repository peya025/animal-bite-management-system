import { useState, useEffect, useCallback } from 'react';
import AddPatientModal from '../components/AddPatientModal';
import { PatientListRoot } from '../styles/PatientList.styles';

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [perPage, setPerPage] = useState(10);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`http://localhost:8000/api/patients?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to load patients');
      const json = await res.json();
      if (Array.isArray(json)) {
        setPatients(json);
        setTotal(json.length);
        setTotalPages(1);
      } else {
        setPatients(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.last_page ?? 1);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page, search, perPage]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { setPage(1); }, [search, perPage]);

  const fullName = (p: Patient) =>
    [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');

  const getStatus = (p: Patient): 'active' | 'pending' | 'inactive' =>
    p.status ?? 'active';

  const activeCount  = patients.filter(p => getStatus(p) === 'active').length;
  const pendingCount = patients.filter(p => getStatus(p) === 'pending').length;

  return (
    <PatientListRoot>
      {/* ── Breadcrumb ── */}
      <div className="pm-breadcrumb">
        <button className="pm-breadcrumb-link" onClick={() => { window.location.href = '/dashboard'; }}>
          Dashboard
        </button>
        <span className="pm-breadcrumb-sep">›</span>
        <span>Patients</span>
      </div>

      <div className="pm-layout">
        {/* ── Left: Table panel ── */}
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

          {/* Controls row */}
          <div className="pm-controls">
            <div className="pm-show-entries">
              <span>Show</span>
              <select
                className="pm-entries-select"
                value={perPage}
                onChange={e => setPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="pm-search-wrap">
              <svg className="pm-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="pm-search"
                placeholder="Search patients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="pm-search-clear" onClick={() => setSearch('')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="pm-table-wrap">
            {loading ? (
              <div className="pm-state">
                <div className="pm-spinner" />
                <p>Loading patients…</p>
              </div>
            ) : error ? (
              <div className="pm-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
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
                    <th>Patient No.</th>
                    <th>Patient Name</th>
                    <th>Date Registered</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => {
                    const status = getStatus(p);
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="pm-patient-no">{p.patient_number}</span>
                        </td>
                        <td>
                          <span className="pm-patient-name">{fullName(p)}</span>
                        </td>
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
              <span className="pm-page-info">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="pm-page-btns">
                <button
                  className="pm-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                  return (
                    <button
                      key={pg}
                      className={`pm-page-btn ${pg === page ? 'pm-page-btn--active' : ''}`}
                      onClick={() => setPage(pg)}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  className="pm-page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Stat cards ── */}
        <div className="pm-side-panel">
          <div className="pm-stat-card pm-stat-card--teal">
            <div className="pm-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
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
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
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
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
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

      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchPatients(); }}
        />
      )}
    </PatientListRoot>
  );
}
