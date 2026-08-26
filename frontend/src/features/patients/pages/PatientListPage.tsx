import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AddPatientModal from '../components/AddPatientModal';
import InvitePatientModal from '../components/InvitePatientModal';
import EditPatientModal from '../components/EditPatientModal';
import PatientDetailsModal from '../components/PatientDetailsModal';
import { PatientListRoot } from '../styles/PatientList.styles';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import { printDocument } from '../../../components/print/printDocument';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import api from '../../../shared/services/api';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  Stethoscope02Icon,
  Calendar03Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';

// ─── Types ───────────────────────────────────────────────────
import type { Patient } from '../types';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const fullName = (p: Patient) =>
  [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');

// ─── Main Component ───────────────────────────────────────────
export default function PatientList() {
  const navigate = useNavigate();
  const [patients,             setPatients]             = useState<Patient[]>([]);
  const [loading,              setLoading]              = useState(true);
  const [error,                setError]                = useState('');
  const [search,               setSearch]               = useState('');
  const [searchTerm,           setSearchTerm]           = useState(''); // Debounced search term
  const [page,                 setPage]                 = useState(1);
  const [totalPages,           setTotalPages]           = useState(1);
  const [total,                setTotal]                = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [showAddModal,         setShowAddModal]         = useState(false);
  const [showPrintModal,       setShowPrintModal]       = useState(false);
  const [selectedInvitePatient, setSelectedInvitePatient] = useState<Patient | null>(null);
  const [showInviteModal,      setShowInviteModal]      = useState(false);

  // Edit & View Modal states
  const [selectedEditPatient,   setSelectedEditPatient]   = useState<Patient | null>(null);
  const [showEditModal,        setShowEditModal]        = useState(false);
  const [selectedViewPatient,   setSelectedViewPatient]   = useState<Patient | null>(null);
  const [showViewModal,        setShowViewModal]        = useState(false);

  const [checkInModalData,     setCheckInModalData]     = useState<{
    patientName: string;
    patientNumber: string;
    queueNumber: number | string;
    station: string;
  } | null>(null);
  const [checkInError,         setCheckInError]         = useState('');

  const userData   = localStorage.getItem('userData');
  const clinicData = localStorage.getItem('clinicData');
  const userRole   = userData   ? (JSON.parse(userData)?.role  ?? '') : '';
  const printedBy  = userData   ? (JSON.parse(userData)?.name  ?? 'Unknown') : 'Unknown';
  const clinicName = clinicData ? (JSON.parse(clinicData)?.name ?? 'Animal Bite Treatment Center') : 'Animal Bite Treatment Center';

  const [tab,                  setTab]                  = useState<'all' | 'today_queue' | 'online' | 'overdue'>('all');
  const [tabCounts,            setTabCounts]            = useState({ all: 0, today_queue: 0, online: 0, overdue: 0 });
  const [checkingInId,         setCheckingInId]         = useState<number | null>(null);

  // Bulk walk-in portal invite state
  const [selectedWalkinIds,    setSelectedWalkinIds]    = useState<number[]>([]);
  const [bulkInviting,         setBulkInviting]         = useState(false);
  const [bulkFeedback,         setBulkFeedback]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showBulkConfirm,      setShowBulkConfirm]      = useState(false);

  // Helper to distinguish online appointment patients from walk-in patients
  const isOnlinePatient = (p: Patient) => {
    const biteIntakes = (p as any).bite_intakes || (p as any).biteIntakes || [];
    const hasIntake = Boolean(biteIntakes.length > 0);
    const hasConfirmedBooking = Boolean(
      (p as any).appointments?.some((a: any) => a.booked_by_account_id && a.status !== 'cancelled')
    );
    const isMobileRegistered = p.registration_source === 'mobile' || Boolean((p as any).accounts && (p as any).accounts.length > 0);

    return hasIntake || hasConfirmedBooking || (isMobileRegistered && Boolean((p as any).appointments && (p as any).appointments.length > 0));
  };

  // Debounce search input (wait 400ms after user stops typing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Clear selection on filter/tab/page changes
  useEffect(() => {
    setSelectedWalkinIds([]);
    setBulkFeedback(null);
  }, [tab, page, searchTerm, perPage, membershipFilter]);

  const fetchPatients = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/patients', {
        params: {
          page,
          per_page: perPage,
          tab,
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(membershipFilter !== 'all' ? { membership_type: membershipFilter } : {}),
        },
      });
      const json = response.data;
      if (Array.isArray(json)) {
        setPatients(json); setTotal(json.length); setTotalPages(1);
      } else {
        setPatients(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.last_page ?? 1);
        if (json.all_count !== undefined) {
          setTabCounts({
            all: json.all_count ?? 0,
            today_queue: json.today_queue_count ?? 0,
            online: json.online_count ?? 0,
            overdue: json.overdue_count ?? 0,
          });
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, perPage, membershipFilter, tab]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { setPage(1); }, [perPage, membershipFilter, tab]);

  // Visible walk-in patients on current page
  const visibleWalkins = useMemo(() => {
    return patients.filter(p => !isOnlinePatient(p));
  }, [patients]);

  const isAllWalkinSelected = visibleWalkins.length > 0 && visibleWalkins.every(p => selectedWalkinIds.includes(p.patient_id || p.id));

  const handleToggleSelectAllWalkins = () => {
    if (isAllWalkinSelected) {
      const visibleIds = new Set(visibleWalkins.map(p => p.patient_id || p.id));
      setSelectedWalkinIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const newIds = new Set([...selectedWalkinIds, ...visibleWalkins.map(p => p.patient_id || p.id)]);
      setSelectedWalkinIds(Array.from(newIds));
    }
  };

  const handleToggleWalkinPatient = (patientId: number) => {
    setSelectedWalkinIds(prev =>
      prev.includes(patientId) ? prev.filter(id => id !== patientId) : [...prev, patientId]
    );
  };

  const handleConfirmBulkInvite = async () => {
    if (selectedWalkinIds.length === 0) return;
    setBulkInviting(true);
    setBulkFeedback(null);
    setShowBulkConfirm(false);
    try {
      const res = await api.post('/patient-invitations/bulk', {
        patient_ids: selectedWalkinIds,
      });
      setBulkFeedback({
        message: res.data?.message || `Successfully sent ${selectedWalkinIds.length} portal invitation(s).`,
        type: 'success',
      });
      setSelectedWalkinIds([]);
      fetchPatients();
    } catch (err: any) {
      setBulkFeedback({
        message: err.response?.data?.message || 'Failed to send bulk invitations.',
        type: 'error',
      });
    } finally {
      setBulkInviting(false);
    }
  };

  const handleCheckIn = async (p: Patient) => {
    const patientId = p.patient_id || p.id;
    setCheckingInId(patientId);
    try {
      const appt = (p as any).appointments?.[0];
      const isConsultation = !appt || appt?.appointment_type === 'consultation' || appt?.appointment_type === 'checkup' || (p as any).bite_intakes?.length > 0;
      const visitType = isConsultation ? 'new_case' : 'vaccination';
      const res = await api.post('/queue', {
        patient_id: patientId,
        visit_type: visitType,
        queue_category: 'appointment',
        priority: 'normal',
      });
      const station = visitType === 'new_case' ? 'Triage Queue (Doctor Assessment)' : 'Treatment Queue (Vaccination)';
      setCheckInModalData({
        patientName: fullName(p),
        patientNumber: p.patient_number,
        queueNumber: res.data?.queue_number || '1',
        station,
      });
      fetchPatients();
    } catch (err: any) {
      setCheckInError(err.response?.data?.message || 'Failed to check in patient to queue');
    } finally {
      setCheckingInId(null);
    }
  };

  const getLiveStatus = (p: Patient): { label: string; icon?: any; bg: string; color: string } => {
    const activeQueue = (p as any).queues?.[0];
    const appt = (p as any).appointments?.[0];

    if (activeQueue) {
      const apptDate = appt ? new Date(appt.scheduled_date || appt.appointment_date) : null;
      const todayDate = new Date();
      const isPastAppt = apptDate && apptDate < todayDate && apptDate.toDateString() !== todayDate.toDateString();
      const lateDays = isPastAppt ? Math.floor((todayDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      if (activeQueue.status === 'waiting') {
        if (isPastAppt) {
          return { label: `Queue #${activeQueue.queue_number || ''} (Waiting · ${lateDays}d Late)`, icon: Clock01Icon, bg: '#fef3c7', color: '#92400e' };
        }
        return { label: `Queue #${activeQueue.queue_number || ''} (Waiting)`, icon: Clock01Icon, bg: '#d1fae5', color: '#065f46' };
      }
      if (activeQueue.status === 'in_consultation' || activeQueue.status === 'called' || activeQueue.status === 'serving') {
        if (isPastAppt) {
          return { label: `Queue #${activeQueue.queue_number || ''} (In Triage · ${lateDays}d Late)`, icon: Stethoscope02Icon, bg: '#eff6ff', color: '#1d4ed8' };
        }
        return { label: `Queue #${activeQueue.queue_number || ''} (In Triage/Exam)`, icon: Stethoscope02Icon, bg: '#eff6ff', color: '#1d4ed8' };
      }
    }
    if (appt && appt.status === 'scheduled') {
      const apptDate = new Date(appt.scheduled_date || appt.appointment_date);
      const todayDate = new Date();
      const isToday = apptDate.toDateString() === todayDate.toDateString();
      const isPast = apptDate < todayDate && !isToday;
      if (isToday) {
        return { label: `Appt Today (${appt.time_slot || 'regular'})`, icon: Clock01Icon, bg: '#fef3c7', color: '#92400e' };
      }
      if (isPast) {
        return { label: `Missed Booking (${Math.floor((todayDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24))}d ago)`, icon: AlertCircleIcon, bg: '#fef2f2', color: '#991b1b' };
      }
      return { label: `Next Appt: ${apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, icon: Calendar03Icon, bg: '#f0fdf4', color: '#166534' };
    }
    const record = (p as any).latest_treatment_record;
    if (record?.dose_number !== undefined && record?.dose_number !== null) {
      const doseName = record.dose_number === 0 ? 'Day 0 (Initial) Done' : (record.dose_number >= 28 ? 'Regimen Completed' : `Day ${record.dose_number} Done`);
      return { label: doseName, icon: CheckmarkCircle02Icon, bg: '#ecfdf5', color: '#059669' };
    }
    return { label: 'Registered (No Dose)', icon: UserMultiple02Icon, bg: '#f3f4f6', color: '#4b5563' };
  };
  
  // Memoize statistics to avoid recalculating on every render
  const stats = useMemo(() => ({
    activeCount: patients.filter(p => (p.status ?? 'active').toLowerCase() === 'active').length,
    pendingCount: patients.filter(p => (p.status ?? 'active').toLowerCase() === 'pending').length,
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
    background: '#f0fdf4', color: 'var(--text-h)', fontWeight: 600,
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
              <p className="pm-subtitle">Manage and track all registered walk-in and online patients</p>
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

          {/* Unified Filter Tabs */}
          <div className="pm-tabs">
            <button
              className={`pm-tab-btn ${tab === 'all' ? 'pm-tab-btn--active' : ''}`}
              onClick={() => setTab('all')}
            >
              All Patients
              <span className="pm-tab-badge">{tabCounts.all || total}</span>
            </button>
            <button
              className={`pm-tab-btn ${tab === 'today_queue' ? 'pm-tab-btn--active' : ''}`}
              onClick={() => setTab('today_queue')}
            >
              Today's Queue
              <span className="pm-tab-badge">{tabCounts.today_queue}</span>
            </button>
            <button
              className={`pm-tab-btn ${tab === 'online' ? 'pm-tab-btn--active' : ''}`}
              onClick={() => setTab('online')}
            >
              Online Appointments
              <span className="pm-tab-badge">{tabCounts.online}</span>
            </button>
            <button
              className={`pm-tab-btn ${tab === 'overdue' ? 'pm-tab-btn--active' : ''}`}
              onClick={() => setTab('overdue')}
            >
              Overdue
              <span className="pm-tab-badge">{tabCounts.overdue}</span>
            </button>
          </div>

          {/* Controls */}
          <div className="pm-controls">
            <div className="pm-show-entries">
              <span>Show</span>
              <select className="pm-entries-select" value={perPage} onChange={e => setPerPage(Number(e.target.value))}>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="pm-controls-right">
              <div className="pm-membership-filter-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>Program:</span>
                <select
                  value={membershipFilter}
                  onChange={(e) => setMembershipFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontWeight: 500,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Programs</option>
                  <option value="philhealth">PhilHealth</option>
                  <option value="fourps">4Ps Beneficiaries</option>
                  <option value="dswd_nhts">DSWD NHTS</option>
                  <option value="senior_citizen">Senior Citizens</option>
                  <option value="pwd">PWD (Disability)</option>
                  <option value="indigenous_member">Indigenous Tribe</option>
                </select>
              </div>
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

          {/* Bulk Walk-in Portal Invite Action Bar */}
          {selectedWalkinIds.length > 0 && (
            <div className="pm-bulk-bar">
              <div className="pm-bulk-bar-info">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>{selectedWalkinIds.length} Walk-in Patient{selectedWalkinIds.length > 1 ? 's' : ''} Selected for Portal Invitation</span>
              </div>
              <div className="pm-bulk-bar-actions">
                <button
                  className="pm-btn-bulk-send"
                  disabled={bulkInviting}
                  onClick={() => setShowBulkConfirm(true)}
                >
                  {bulkInviting ? 'Sending Invites...' : `Send Portal Invites (${selectedWalkinIds.length})`}
                </button>
                <button
                  className="pm-btn-bulk-clear"
                  onClick={() => setSelectedWalkinIds([])}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Bulk Action Feedback Message */}
          {bulkFeedback && (
            <div style={{
              padding: '10px 16px',
              borderRadius: '8px',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: bulkFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: bulkFeedback.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${bulkFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>{bulkFeedback.message}</span>
              <button
                onClick={() => setBulkFeedback(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}

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
                <p>{search ? 'No patients match your search.' : 'No patients registered in this category.'}</p>
              </div>
            ) : (
              <table className="pm-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      {visibleWalkins.length > 0 && (
                        <input
                          type="checkbox"
                          className="pm-checkbox"
                          checked={isAllWalkinSelected}
                          onChange={handleToggleSelectAllWalkins}
                          title="Select all walk-in patients on this page"
                        />
                      )}
                    </th>
                    <th>Patient No.</th>
                    <th>Patient Name</th>
                    <th>Source</th>
                    <th>Date Registered</th>
                    <th>Status / Schedule</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => {
                    const statusInfo = getLiveStatus(p);
                    const isOnline = isOnlinePatient(p);
                    const activeQueue = (p as any).queues?.[0];
                    const appt = (p as any).appointments?.[0];
                    const canCheckIn = isOnline && !activeQueue && appt?.status === 'scheduled';
                    const patientId = p.patient_id || p.id;

                    return (
                      <tr key={`patient-${patientId}`}>
                        <td style={{ textAlign: 'center' }}>
                          {!isOnline ? (
                            <input
                              type="checkbox"
                              className="pm-checkbox"
                              checked={selectedWalkinIds.includes(patientId)}
                              onChange={() => handleToggleWalkinPatient(patientId)}
                              title="Select walk-in patient for portal invite"
                            />
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td><span className="pm-patient-no">{p.patient_number}</span></td>
                        <td>
                          <div>
                            <span className="pm-patient-name">{fullName(p)}</span>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                              {p.age ? `${p.age}y · ` : ''}{p.gender} {p.contact_number ? `· ${p.contact_number}` : ''}
                            </div>
                          </div>
                        </td>
                        <td>
                          {isOnline ? (
                            <span className="pm-chip-online">
                              Online
                            </span>
                          ) : (
                            <span className="pm-chip-walkin">
                              Walk-in
                            </span>
                          )}
                        </td>
                        <td>{formatDate(p.created_at)}</td>
                        <td>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            {statusInfo.icon && <HugeiconsIcon icon={statusInfo.icon} size={13} strokeWidth={2} />}
                            {statusInfo.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="pm-actions" style={{ justifyContent: 'center' }}>
                            {canCheckIn && (
                              <button
                                className="pm-btn-checkin"
                                title="Check-in patient into today's queue"
                                disabled={checkingInId === patientId}
                                onClick={() => handleCheckIn(p)}
                              >
                                {checkingInId === patientId ? 'Checking in...' : 'Check In'}
                              </button>
                            )}
                            {!isOnline && (
                              <button
                                className="pm-btn-invite"
                                title="Invite Walk-in Patient to Mobile Portal"
                                onClick={() => {
                                  setSelectedInvitePatient(p);
                                  setShowInviteModal(true);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 9px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  border: '1px solid #bbf7d0',
                                  backgroundColor: '#f0fdf4',
                                  color: '#166534',
                                  cursor: 'pointer',
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                Portal Invite
                              </button>
                            )}
                            <button
                              className="pm-btn-view"
                              onClick={() => {
                                setSelectedViewPatient(p);
                                setShowViewModal(true);
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                              View
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
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h)', borderLeft: '3px solid #10b981', paddingLeft: 10, marginBottom: 10 }}>
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

      {/* ── Invite Patient to Mobile Portal Modal ── */}
      <InvitePatientModal
        open={showInviteModal}
        patient={selectedInvitePatient}
        onClose={() => {
          setShowInviteModal(false);
          setSelectedInvitePatient(null);
        }}
        onSuccess={() => {
          fetchPatients();
        }}
      />

      {/* ── Edit Patient Profile Modal ── */}
      <EditPatientModal
        open={showEditModal}
        patient={selectedEditPatient}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEditPatient(null);
        }}
        onSuccess={() => {
          fetchPatients();
        }}
      />

      {/* ── View Patient Profile Modal ── */}
      <PatientDetailsModal
        open={showViewModal}
        patient={selectedViewPatient}
        onClose={() => {
          setShowViewModal(false);
          setSelectedViewPatient(null);
        }}
        onEdit={(p) => {
          setSelectedEditPatient(p);
          setShowEditModal(true);
        }}
      />

      {/* ── Check-In Success Modal (Modern Notification) ── */}
      {checkInModalData && (
        <ConfirmationDialog
          variant="success"
          title="Patient Checked In"
          message={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', marginTop: '6px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '1.5px solid #86efac',
                borderRadius: '14px',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                width: '100%',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Live Queue Number
                </span>
                <span style={{ fontSize: '36px', fontWeight: 800, color: '#047857', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                  #{String(checkInModalData.queueNumber).padStart(3, '0')}
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#059669', background: '#ffffff', padding: '2px 10px', borderRadius: '999px', border: '1px solid #a7f3d0' }}>
                  {checkInModalData.station}
                </span>
              </div>

              <div style={{ fontSize: '13.5px', color: '#4b5563', textAlign: 'center', lineHeight: 1.5 }}>
                <strong style={{ color: '#111827' }}>{checkInModalData.patientName}</strong> has been successfully placed in the active queue.
              </div>
            </div>
          }
          confirmLabel="Go to Queue"
          cancelLabel="Done"
          onConfirm={() => {
            setCheckInModalData(null);
            navigate('/queue');
          }}
          onCancel={() => setCheckInModalData(null)}
        />
      )}

      {/* ── Check-In Error Modal ── */}
      {checkInError && (
        <ConfirmationDialog
          variant="danger"
          title="Check-In Notice"
          message={checkInError}
          confirmLabel="OK"
          hideCancel
          onConfirm={() => setCheckInError('')}
        />
      )}

      {/* ── Bulk Portal Invite Confirmation Modal ── */}
      {showBulkConfirm && (
        <ConfirmationDialog
          variant="confirm"
          title="Send Portal Invitations"
          message={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#374151' }}>
                Are you sure you want to send Mobile Patient Portal invitations via SMS and Email to{' '}
                <strong>{selectedWalkinIds.length} selected walk-in patient(s)</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                Patients with existing verified accounts or missing contact numbers will be automatically skipped.
              </p>
            </div>
          }
          confirmLabel={bulkInviting ? 'Sending...' : 'Send Invitations'}
          cancelLabel="Cancel"
          onConfirm={handleConfirmBulkInvite}
          onCancel={() => setShowBulkConfirm(false)}
        />
      )}
    </PatientListRoot>
  );
}
