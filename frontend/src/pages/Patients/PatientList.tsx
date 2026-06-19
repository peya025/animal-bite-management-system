import { useState, useEffect, useCallback } from 'react';
import AddPatientModal from './AddPatientModal';
import './PatientList.css';

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
}

function getAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const GENDER_BADGE: Record<string, string> = {
  male: 'pl-badge--blue',
  female: 'pl-badge--pink',
  other: 'pl-badge--gray',
};

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const PER_PAGE = 10;

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        ...(search ? { search } : {}),
        ...(genderFilter ? { gender: genderFilter } : {}),
      });
      const res = await fetch(`http://localhost:8000/api/patients?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to load patients');
      const json = await res.json();
      // Support both paginated and plain array responses
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
  }, [page, search, genderFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, genderFilter]);

  const initials = (p: Patient) =>
    `${p.first_name[0]}${p.last_name[0]}`.toUpperCase();

  const fullName = (p: Patient) =>
    [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');

  return (
    <div className="pl-page">
      {/* ── Header ── */}
      <div className="pl-header">
        <div>
          <h1 className="pl-title">Patients</h1>
          <p className="pl-subtitle">{total} patient{total !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="pl-add-btn" onClick={() => setShowAddModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Patient
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="pl-filters">
        <div className="pl-search-wrap">
          <svg className="pl-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="pl-search"
            placeholder="Search by name or patient number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pl-search-clear" onClick={() => setSearch('')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <select
          className="pl-select"
          value={genderFilter}
          onChange={e => setGenderFilter(e.target.value)}
        >
          <option value="">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="pl-table-wrap">
        {loading ? (
          <div className="pl-loading">
            <div className="pl-spinner" />
            <p>Loading patients…</p>
          </div>
        ) : error ? (
          <div className="pl-error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>{error}</p>
            <button className="pl-retry-btn" onClick={fetchPatients}>Retry</button>
          </div>
        ) : patients.length === 0 ? (
          <div className="pl-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>{search || genderFilter ? 'No patients match your search.' : 'No patients registered yet.'}</p>
          </div>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Patient No.</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="pl-patient-cell">
                      <div className="pl-avatar">{initials(p)}</div>
                      <div>
                        <p className="pl-patient-name">{fullName(p)}</p>
                        <p className="pl-patient-address">{p.address}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pl-patient-no">{p.patient_number}</span>
                  </td>
                  <td>{getAge(p.date_of_birth)} yrs</td>
                  <td>
                    <span className={`pl-badge ${GENDER_BADGE[p.gender]}`}>
                      {p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}
                    </span>
                  </td>
                  <td>{p.phone || <span className="pl-muted">—</span>}</td>
                  <td>{formatDate(p.created_at)}</td>
                  <td>
                    <div className="pl-actions">
                      <button className="pl-action-btn pl-action-view" title="View">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button className="pl-action-btn pl-action-edit" title="Edit">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="pl-action-btn pl-action-delete" title="Delete">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && totalPages > 1 && (
        <div className="pl-pagination">
          <span className="pl-page-info">
            Page {page} of {totalPages}
          </span>
          <div className="pl-page-btns">
            <button
              className="pl-page-btn"
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
                  className={`pl-page-btn ${pg === page ? 'pl-page-btn--active' : ''}`}
                  onClick={() => setPage(pg)}
                >
                  {pg}
                </button>
              );
            })}
            <button
              className="pl-page-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Add Patient Modal ── */}
      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchPatients();
          }}
        />
      )}
    </div>
  );
}
