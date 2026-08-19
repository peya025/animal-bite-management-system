import { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────
interface ReportStats {
  total_patients: number; total_bite_cases: number;
  category_i: number; category_ii: number; category_iii: number;
  completed_treatments: number; ongoing_treatments: number;
  total_vaccinations: number; vaccination_completion_rate: number;
  avg_queue_wait_time: number; new_patients_period: number; new_cases_period: number;
}
interface BiteCase {
  id: number; patient_name: string; category: string;
  animal_type: string; status: string; created_at: string;
}
interface Patient {
  id: number; first_name: string; last_name: string;
  date_of_birth: string; contact_number: string; created_at: string;
}
interface InventoryItem {
  inventory_id: number; vaccine_type: string; batch_number: string;
  current_quantity: number; expiration_date: string;
  status: 'active' | 'expired' | 'deleted';
}
interface InventoryStats {
  total_batches: number; active_batches: number; depleted_batches: number;
  expired_batches: number; total_stock: number; expiring_soon: number; low_stock: number;
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n?: number) => n != null ? n.toLocaleString() : '—';
const pct = (n?: number) => n != null ? `${Math.round(n)}%` : '—';
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Styles ───────────────────────────────────────────────────
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: 'var(--text-h)',
  borderLeft: '3px solid #10b981', paddingLeft: 10, marginBottom: 12,
};
const filterBarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  flexWrap: 'wrap', gap: 12, background: '#f9fafb', border: '1px solid #e5e7eb',
  borderRadius: 10, padding: '12px 16px', marginBottom: 20,
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6b7280' };
const inputStyle: React.CSSProperties = {
  fontSize: 13, padding: '6px 10px', borderRadius: 6,
  border: '1px solid #d1d5db', outline: 'none', fontFamily: 'inherit',
};
const tabStyle: React.CSSProperties = {
  padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6,
  border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
  color: '#6b7280', fontFamily: 'inherit', transition: 'all 0.15s',
};
const tabActiveStyle: React.CSSProperties = { background: '#10b981', color: '#fff', border: '1px solid #10b981' };
const tableWrapStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thStyle: React.CSSProperties = {
  background: '#f0fdf4', color: 'var(--text-h)', fontWeight: 600,
  padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #10b981', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = { padding: '9px 14px', borderBottom: '1px solid #f0f0f0' };
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
};
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, width: '100%', maxWidth: 820,
  maxHeight: '90vh', display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};

function btnStyle(bg: string, small = false): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: small ? '7px 14px' : '9px 18px',
    background: `linear-gradient(135deg, ${bg} 0%, ${bg}cc 100%)`,
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: small ? 12 : 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', boxShadow: `0 2px 8px ${bg}44`,
    transition: 'all 0.2s', whiteSpace: 'nowrap',
  };
}

// ─── Sub-components ───────────────────────────────────────────
function StatBox({ label, value, color, sub, loading }: { label: string; value: string; color: string; sub?: string; loading: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 14px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: loading ? '#d1d5db' : color, lineHeight: 1 }}>{loading ? '—' : value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
function CatBox({ cat, count, color, desc, loading }: { cat: string; count?: number; color: string; desc: string; loading: boolean }) {
  return (
    <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>{cat}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: loading ? '#d1d5db' : color, lineHeight: 1 }}>{loading ? '—' : (count ?? 0)}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>{desc}</div>
    </div>
  );
}
function CategoryBadge({ cat }: { cat: string }) {
  const s = String(cat);
  const color = s.includes('III') ? '#dc2626' : s.includes('II') ? '#d97706' : '#16a34a';
  const bg    = s.includes('III') ? '#fee2e2' : s.includes('II') ? '#fef3c7' : '#dcfce7';
  return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{cat || '—'}</span>;
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: '#d1fae5', color: '#065f46' },
    ongoing:   { bg: '#dbeafe', color: '#1e40af' },
    active:    { bg: '#dbeafe', color: '#1e40af' },
    abandoned: { bg: '#fee2e2', color: '#991b1b' },
  };
  const s = map[status?.toLowerCase()] ?? { bg: '#f3f4f6', color: '#374151' };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status || '—'}</span>;
}
function InvStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:  { bg: '#d1fae5', color: '#065f46' },
    expired: { bg: '#fee2e2', color: '#991b1b' },
    deleted: { bg: '#f3f4f6', color: '#374151' },
  };
  const s = map[status] ?? { bg: '#f3f4f6', color: '#374151' };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status}</span>;
}

// ─── Print Preview Modal ──────────────────────────────────────
interface PrintPreviewModalProps {
  html: string; clinicName: string; printedBy: string; printDate: string;
  dateFrom: string; dateTo: string; activeTab: string;
  onConfirm: () => void; onCancel: () => void;
}
function PrintPreviewModal({ html, clinicName, printedBy, printDate, dateFrom, dateTo, activeTab, onConfirm, onCancel }: PrintPreviewModalProps) {
  const tabLabel = activeTab === 'summary' ? 'Summary Report' : activeTab === 'cases' ? 'Bite Cases Report' : activeTab === 'inventory' ? 'Vaccine Inventory Report' : 'Patient Registry Report';
  return (
    <div style={overlayStyle} onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="print-title">
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </div>
            <div>
              <h2 id="print-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>Print Preview</h2>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Review before sending to printer</p>
            </div>
          </div>
          <button onClick={onCancel} aria-label="Close"
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {/* Preview paper */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', background: '#f3f4f6' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', minHeight: 500, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
              <div style={{ width: 52, height: 52, border: '2px solid #000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>✚</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#333' }}>Republic of the Philippines — Department of Health</div>
                <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', margin: '2px 0' }}>{clinicName}</div>
                <div style={{ fontSize: 9, color: '#555' }}>Animal Bite Treatment Center</div>
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '3px double #000', margin: '6px 0 3px' }}/>
            <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '2px 0 14px' }}/>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'underline' }}>{tabLabel}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px', border: '1px solid #ccc', padding: '9px 12px', marginBottom: 16, fontSize: 11 }}>
              <span style={{ color: '#444' }}>Reporting Period:</span><span style={{ fontWeight: 700 }}>{fmtDate(dateFrom)} – {fmtDate(dateTo)}</span>
              <span style={{ color: '#444' }}>Date Generated:</span><span style={{ fontWeight: 700 }}>{printDate}</span>
              <span style={{ color: '#444' }}>Prepared by:</span><span style={{ fontWeight: 700 }}>{printedBy}</span>
            </div>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div><div style={{ borderTop: '1px solid #000', marginTop: 32, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>{printedBy}</div>
                <div style={{ fontSize: 10, color: '#555' }}>Prepared by</div>
              </div></div>
              <div><div style={{ borderTop: '1px solid #000', marginTop: 32, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>____________________________</div>
                <div style={{ fontSize: 10, color: '#555' }}>Noted by / Authorized Signatory</div>
              </div></div>
            </div>
            <div style={{ marginTop: 28, paddingTop: 8, borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555' }}>
              <span>{clinicName} — Animal Bite Treatment Center</span>
              <span>{printDate}</span>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #e5e7eb', flexShrink: 0, background: '#fafafa', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
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
export default function ReportsDashboardPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [dateFrom,       setDateFrom]   = useState(firstOfMonth);
  const [dateTo,         setDateTo]     = useState(todayStr);
  const [stats,          setStats]      = useState<ReportStats | null>(null);
  const [biteCases,      setBiteCases]  = useState<BiteCase[]>([]);
  const [patients,       setPatients]   = useState<Patient[]>([]);
  const [loading,        setLoading]    = useState(false);
  const [error,          setError]      = useState('');
  const [activeTab,      setActiveTab]  = useState<'summary' | 'cases' | 'patients' | 'inventory'>('summary');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printHtml,      setPrintHtml]  = useState('');
  const [invItems,       setInvItems]   = useState<InventoryItem[]>([]);
  const [invStats,       setInvStats]   = useState<InventoryStats | null>(null);
  const [invLoading,     setInvLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const clinicData = localStorage.getItem('clinicData');
  const clinic     = clinicData ? JSON.parse(clinicData) : null;
  const userData   = localStorage.getItem('userData');
  const user       = userData   ? JSON.parse(userData)   : null;
  const clinicName = clinic?.name ?? 'Animal Bite Treatment Center';
  const printedBy  = user?.name  ?? 'Unknown';
  const printDate  = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

  const loadReports = async () => {
    setLoading(true); setError('');
    try {
      // Backend uses /cases (not /bite-cases), from_date/to_date (not date_from/date_to)
      const params = { from_date: dateFrom, to_date: dateTo };
      const [casesRes, patsRes] = await Promise.all([
        api.get('/cases',    { params: { ...params, per_page: 100 } }),
        api.get('/patients', { params: { per_page: 100 } }),
      ]);
      const casesRaw = casesRes.data?.data ?? casesRes.data ?? [];
      const patsRaw  = patsRes.data?.data  ?? patsRes.data  ?? [];

      const casesData: BiteCase[] = (Array.isArray(casesRaw) ? casesRaw : []).map((c: any) => ({
        id:           c.id ?? c.bite_id,
        // backend returns patient.first_name + last_name, not patient_name
        patient_name: c.patient ? `${c.patient.first_name ?? ''} ${c.patient.last_name ?? ''}`.trim() : (c.patient_name ?? '—'),
        // backend uses 'severity' (minor/moderate/severe) not 'category'
        category:     c.severity
          ? (c.severity === 'minor' ? 'Category I' : c.severity === 'moderate' ? 'Category II' : 'Category III')
          : (c.category ?? '—'),
        animal_type:  c.animal_type ?? '—',
        status:       c.status ?? '—',
        created_at:   c.created_at ?? c.bite_date ?? '',
      }));

      const patsData: Patient[] = Array.isArray(patsRaw) ? patsRaw : [];
      setBiteCases(casesData);
      setPatients(patsData);

      const catI   = casesData.filter(c => c.category === 'Category I').length;
      const catII  = casesData.filter(c => c.category === 'Category II').length;
      const catIII = casesData.filter(c => c.category === 'Category III').length;
      const completed = casesData.filter(c => c.status === 'completed').length;
      const ongoing   = casesData.filter(c => c.status === 'ongoing' || c.status === 'active').length;

      const [gPats, gCases] = await Promise.allSettled([
        api.get('/patients', { params: { per_page: 1 } }),
        api.get('/cases',    { params: { per_page: 1 } }),
      ]);
      const totalPats  = gPats.status  === 'fulfilled' ? (gPats.value.data?.total   ?? patsData.length)  : patsData.length;
      const totalCases = gCases.status === 'fulfilled' ? (gCases.value.data?.total  ?? casesData.length) : casesData.length;

      setStats({
        total_patients: totalPats, total_bite_cases: totalCases,
        category_i: catI, category_ii: catII, category_iii: catIII,
        completed_treatments: completed, ongoing_treatments: ongoing,
        total_vaccinations: 0,
        vaccination_completion_rate: casesData.length > 0 ? Math.round((completed / casesData.length) * 100) : 0,
        avg_queue_wait_time: 0,
        new_patients_period: patsData.length,
        new_cases_period:    casesData.length,
      });
    } catch (err) {
      console.error('Report load error:', err);
      setError('Failed to load report data. Please try again.');
    }
    finally { setLoading(false); }
  };

  const loadInventory = async () => {
    setInvLoading(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        api.get('/inventory', { params: { per_page: 200 } }),
        api.get('/inventory/statistics'),
      ]);
      const data = itemsRes.data?.data ?? itemsRes.data ?? [];
      setInvItems(Array.isArray(data) ? data : []);
      setInvStats(statsRes.data);
    } catch { /* silently fail */ }
    finally { setInvLoading(false); }
  };

  useEffect(() => { loadReports(); }, []); // eslint-disable-line
  useEffect(() => {
    if (activeTab === 'inventory' && invItems.length === 0 && !invLoading) loadInventory();
  }, [activeTab]); // eslint-disable-line

  const handleOpenPrint = () => {
    setPrintHtml(printRef.current?.innerHTML ?? '');
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    const now = new Date();
    const refNo = `ABTC-RPT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const printDateFull = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const printTimeFull = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    const tabLabel = activeTab === 'summary' ? 'Summary Report' : activeTab === 'cases' ? 'Bite Cases Report' : activeTab === 'patients' ? 'Patient Registry Report' : 'Vaccine Inventory Report';

    let bodyHtml = '';
    if (activeTab === 'summary' && stats) {
      bodyHtml = `
        <h3 class="sec">I. Statistical Overview</h3>
        <table class="info-table">
          <tr><td class="lbl">Total Registered Patients</td><td class="val">${fmt(stats.total_patients)}</td><td class="lbl">Total Bite Cases (All Time)</td><td class="val">${fmt(stats.total_bite_cases)}</td></tr>
          <tr><td class="lbl">New Patients (Period)</td><td class="val">${fmt(stats.new_patients_period)}</td><td class="lbl">New Cases (Period)</td><td class="val">${fmt(stats.new_cases_period)}</td></tr>
          <tr><td class="lbl">Completed Treatments</td><td class="val">${fmt(stats.completed_treatments)}</td><td class="lbl">Ongoing Treatments</td><td class="val">${fmt(stats.ongoing_treatments)}</td></tr>
          <tr><td class="lbl">Treatment Completion Rate</td><td class="val">${pct(stats.vaccination_completion_rate)}</td><td class="lbl">Reporting Period</td><td class="val">${fmtDate(dateFrom)} – ${fmtDate(dateTo)}</td></tr>
        </table>
        <h3 class="sec">II. Bite Case Classification (Reporting Period)</h3>
        <table>
          <thead><tr><th>Category</th><th>Classification</th><th>Description</th><th style="text-align:right">Count</th></tr></thead>
          <tbody>
            <tr><td>Category I</td><td>Minor</td><td>Licking of intact skin; no exposure</td><td style="text-align:right">${fmt(stats.category_i)}</td></tr>
            <tr><td>Category II</td><td>Moderate</td><td>Nibbling of uncovered skin; minor scratches without bleeding</td><td style="text-align:right">${fmt(stats.category_ii)}</td></tr>
            <tr><td>Category III</td><td>Severe</td><td>Transdermal bites or scratches; licks on broken skin</td><td style="text-align:right">${fmt(stats.category_iii)}</td></tr>
          </tbody>
        </table>`;
    } else if (activeTab === 'cases') {
      const rows = biteCases.map((c, i) => `<tr><td style="text-align:center">${i+1}</td><td>${c.patient_name ?? '—'}</td><td style="text-align:center">${c.category || '—'}</td><td>${c.animal_type ?? '—'}</td><td style="text-align:center;text-transform:capitalize">${c.status || '—'}</td><td style="text-align:center">${fmtDate(c.created_at)}</td></tr>`).join('');
      bodyHtml = `
        <h3 class="sec">I. Bite Case Records</h3>
        <p class="note">Reporting Period: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)} | Total Records: ${biteCases.length}</p>
        <table><thead><tr><th style="text-align:center">#</th><th>Patient Name</th><th style="text-align:center">Category</th><th>Animal Type</th><th style="text-align:center">Status</th><th style="text-align:center">Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#888">No records found.</td></tr>'}</tbody></table>`;
    } else if (activeTab === 'patients') {
      const rows = patients.map((p, i) => `<tr><td style="text-align:center">${i+1}</td><td>${p.last_name}, ${p.first_name}</td><td style="text-align:center">${fmtDate(p.date_of_birth)}</td><td style="text-align:center">${p.contact_number ?? '—'}</td><td style="text-align:center">${fmtDate(p.created_at)}</td></tr>`).join('');
      bodyHtml = `
        <h3 class="sec">I. Patient Registry</h3>
        <p class="note">Reporting Period: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)} | Total Records: ${patients.length}</p>
        <table><thead><tr><th style="text-align:center">#</th><th>Patient Name (Last, First)</th><th style="text-align:center">Date of Birth</th><th style="text-align:center">Contact No.</th><th style="text-align:center">Registered On</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888">No records found.</td></tr>'}</tbody></table>`;
    } else {
      const statsRows = invStats ? `<table class="info-table">
        <tr><td class="lbl">Active Batches</td><td class="val">${invStats.active_batches}</td><td class="lbl">Total Vials in Stock</td><td class="val">${invStats.total_stock}</td></tr>
        <tr><td class="lbl">Expiring Soon</td><td class="val">${invStats.expiring_soon}</td><td class="lbl">Depleted Batches</td><td class="val">${invStats.depleted_batches}</td></tr>
        <tr><td class="lbl">Expired Batches</td><td class="val">${invStats.expired_batches}</td><td class="lbl">Total Batches</td><td class="val">${invStats.total_batches}</td></tr>
      </table>` : '';
      const rows = invItems.map((item, i) => {
        const exp = item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
        const qtyS = item.current_quantity === 0 ? 'color:#c00;font-weight:700' : '';
        return `<tr><td style="text-align:center">${i+1}</td><td style="font-weight:700">${item.vaccine_type}</td><td style="text-align:center">${item.batch_number}</td><td style="text-align:center;${qtyS}">${item.current_quantity}</td><td style="text-align:center">${exp}</td><td style="text-align:center;text-transform:capitalize">${item.status}</td></tr>`;
      }).join('');
      bodyHtml = `
        <h3 class="sec">I. Stock Summary</h3>${statsRows}
        <h3 class="sec">II. Inventory Listing</h3>
        <p class="note">Total Items: ${invItems.length}</p>
        <table><thead><tr><th style="text-align:center;width:4%">#</th><th>Vaccine Type</th><th style="text-align:center">Batch No.</th><th style="text-align:center;width:8%">Qty</th><th style="text-align:center">Expiration Date</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#888">No inventory records found.</td></tr>'}</tbody></table>`;
    }

    const CSS = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',Times,serif;color:#000;background:#fff;padding:40px 48px;font-size:12pt;line-height:1.5}.letterhead{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:6px}.logo{width:64px;height:64px;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0}.org{text-align:center}.org .republic{font-size:9pt;letter-spacing:1px;text-transform:uppercase}.org .dept{font-size:9pt;font-weight:700;text-transform:uppercase}.org .clinic{font-size:14pt;font-weight:700;text-transform:uppercase;margin:2px 0}.org .address{font-size:9pt;color:#333}.divider-thick{border:none;border-top:3px double #000;margin:8px 0 4px}.divider-thin{border:none;border-top:1px solid #000;margin:2px 0 16px}.doc-title{text-align:center;margin:16px 0 20px}.doc-title h2{font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-decoration:underline}.doc-title p{font-size:10pt;margin-top:4px}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:20px;font-size:10pt;border:1px solid #ccc;padding:10px 14px}h3.sec{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #000;padding-bottom:3px;margin:20px 0 10px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10pt}th{background:#000;color:#fff;font-weight:700;padding:6px 10px;text-align:left;font-size:10pt}td{padding:5px 10px;border-bottom:1px solid #ccc}tr:nth-child(even) td{background:#f5f5f5}table.info-table td{border:1px solid #ccc;padding:5px 10px;vertical-align:top}table.info-table td.lbl{background:#f0f0f0;font-weight:700;font-size:9.5pt;width:22%}table.info-table td.val{font-size:10pt;width:28%}p.note{font-size:10pt;color:#333;margin-bottom:8px;font-style:italic}.sig-section{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.sig-block .line{border-top:1px solid #000;margin-top:36px;padding-top:4px}.sig-block .name{font-weight:700;font-size:11pt;text-transform:uppercase}.sig-block .position{font-size:9.5pt}.footer-bar{margin-top:40px;padding-top:8px;border-top:2px solid #000;display:flex;justify-content:space-between;font-size:8.5pt;color:#555}@media print{body{padding:20px 28px}@page{margin:1.5cm}}`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${clinicName} — ${tabLabel}</title><style>${CSS}</style></head><body>
      <div class="letterhead"><div class="logo">✚</div><div class="org"><div class="republic">Republic of the Philippines</div><div class="dept">Department of Health</div><div class="clinic">${clinicName}</div><div class="address">Animal Bite Treatment Center</div></div></div>
      <hr class="divider-thick"><hr class="divider-thin">
      <div class="doc-title"><h2>${tabLabel}</h2><p>Reference No.: ${refNo}</p></div>
      <div class="meta-grid"><span style="color:#444">Reporting Period:</span><span style="font-weight:700">${fmtDate(dateFrom)} – ${fmtDate(dateTo)}</span><span style="color:#444">Date Generated:</span><span style="font-weight:700">${printDateFull}</span><span style="color:#444">Time Generated:</span><span style="font-weight:700">${printTimeFull}</span><span style="color:#444">Prepared by:</span><span style="font-weight:700">${printedBy}</span></div>
      ${bodyHtml}
      <div class="sig-section"><div class="sig-block"><div class="line"><div class="name">${printedBy}</div><div class="position">Prepared by</div></div></div><div class="sig-block"><div class="line"><div class="name">____________________________</div><div class="position">Noted by / Authorized Signatory</div></div></div></div>
      <div class="footer-bar"><span>${clinicName} — Animal Bite Treatment Center</span><span>Ref: ${refNo} | ${printDateFull}</span></div>
    </body></html>`);
    win.document.close(); win.focus();
    setShowPrintModal(false);
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div style={{ padding: '0 24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 600, color: 'var(--text-h)', margin: '0 0 7px', letterSpacing: -0.5 }}>Reports &amp; Analytics</h1>
          <p style={{ fontSize: 13, color: '#77877d', margin: 0 }}>Generate and print system reports for the clinic</p>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Reports</span>
          </div>
        </div>
        <button onClick={handleOpenPrint}
          disabled={loading || (activeTab !== 'inventory' && !stats) || (activeTab === 'inventory' && invLoading)}
          style={btnStyle('#10b981')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print Report
        </button>
      </div>

      {/* Filters */}
      <div style={filterBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={labelStyle}>From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>To</label>
          <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={inputStyle} />
          <button onClick={loadReports} disabled={loading} style={btnStyle('#059669', true)}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
          {activeTab === 'inventory' && (
            <button onClick={loadInventory} disabled={invLoading} style={btnStyle('#6366f1', true)}>
              {invLoading ? 'Loading…' : 'Refresh Inventory'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['summary', 'cases', 'patients', 'inventory'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ ...tabStyle, ...(activeTab === tab ? tabActiveStyle : {}) }}>
              {tab === 'summary' ? 'Summary' : tab === 'cases' ? 'Bite Cases' : tab === 'patients' ? 'Patients' : 'Inventory'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Printable content */}
      <div ref={printRef}>

        {/* SUMMARY */}
        {activeTab === 'summary' && (
          <>
            <div style={sectionTitleStyle}>Summary Statistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatBox label="Total Patients"   value={fmt(stats?.total_patients)}              color="#6366f1" loading={loading} />
              <StatBox label="Total Bite Cases" value={fmt(stats?.total_bite_cases)}            color="#f59e0b" loading={loading} />
              <StatBox label="New Patients"     value={fmt(stats?.new_patients_period)}         color="#10b981" loading={loading} sub={`${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`} />
              <StatBox label="New Cases"        value={fmt(stats?.new_cases_period)}            color="#f97316" loading={loading} sub={`${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`} />
              <StatBox label="Completed"        value={fmt(stats?.completed_treatments)}        color="#22c55e" loading={loading} />
              <StatBox label="Ongoing"          value={fmt(stats?.ongoing_treatments)}          color="#3b82f6" loading={loading} />
              <StatBox label="Completion Rate"  value={pct(stats?.vaccination_completion_rate)} color="#8b5cf6" loading={loading} />
            </div>
            <div style={sectionTitleStyle}>Bite Case Categories (Period)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <CatBox cat="Category I"   count={stats?.category_i}   color="#a7d7b9" desc="Minor — licks on intact skin" loading={loading} />
              <CatBox cat="Category II"  count={stats?.category_ii}  color="#56a978" desc="Moderate — minor scratches or abrasions" loading={loading} />
              <CatBox cat="Category III" count={stats?.category_iii} color="#1f7043" desc="Severe — transdermal bites or scratches" loading={loading} />
            </div>
          </>
        )}

        {/* CASES */}
        {activeTab === 'cases' && (
          <>
            <div style={sectionTitleStyle}>
              Bite Cases — {fmtDate(dateFrom)} to {fmtDate(dateTo)}
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: '#6b7280' }}>({biteCases.length} record{biteCases.length !== 1 ? 's' : ''})</span>
            </div>
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead><tr>{['#','Patient','Category','Animal','Status','Date'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>Loading…</td></tr>
                  : biteCases.length === 0 ? <tr><td colSpan={6} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>No bite cases in this period.</td></tr>
                  : biteCases.map((c, i) => (
                    <tr key={c.id} style={i % 2 !== 0 ? { background:'#f9fafb' } : {}}>
                      <td style={tdStyle}>{i+1}</td>
                      <td style={tdStyle}>{c.patient_name ?? '—'}</td>
                      <td style={tdStyle}><CategoryBadge cat={c.category} /></td>
                      <td style={tdStyle}>{c.animal_type ?? '—'}</td>
                      <td style={tdStyle}><StatusBadge status={c.status} /></td>
                      <td style={tdStyle}>{fmtDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PATIENTS */}
        {activeTab === 'patients' && (
          <>
            <div style={sectionTitleStyle}>
              Registered Patients — {fmtDate(dateFrom)} to {fmtDate(dateTo)}
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: '#6b7280' }}>({patients.length} record{patients.length !== 1 ? 's' : ''})</span>
            </div>
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead><tr>{['#','Full Name','Date of Birth','Contact','Registered On'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>Loading…</td></tr>
                  : patients.length === 0 ? <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>No patients registered in this period.</td></tr>
                  : patients.map((p, i) => (
                    <tr key={p.id} style={i % 2 !== 0 ? { background:'#f9fafb' } : {}}>
                      <td style={tdStyle}>{i+1}</td>
                      <td style={tdStyle}>{p.first_name} {p.last_name}</td>
                      <td style={tdStyle}>{fmtDate(p.date_of_birth)}</td>
                      <td style={tdStyle}>{p.contact_number ?? '—'}</td>
                      <td style={tdStyle}>{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* INVENTORY */}
        {activeTab === 'inventory' && (
          <>
            {invStats && (
              <>
                <div style={sectionTitleStyle}>Stock Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Active Batches',  value: invStats.active_batches,   color: '#10b981' },
                    { label: 'Total Vials',      value: invStats.total_stock,      color: '#3b82f6' },
                    { label: 'Expiring Soon',    value: invStats.expiring_soon,    color: '#f59e0b' },
                    { label: 'Depleted',         value: invStats.depleted_batches, color: '#ef4444' },
                    { label: 'Expired Batches',  value: invStats.expired_batches,  color: '#6b7280' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'14px 12px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:10, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginTop:5 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={sectionTitleStyle}>
              Inventory Listing
              <span style={{ marginLeft:10, fontSize:13, fontWeight:400, color:'#6b7280' }}>({invItems.length} item{invItems.length !== 1 ? 's' : ''})</span>
            </div>
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead><tr>{['#','Vaccine Type','Batch Number','Qty','Expiration Date','Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {invLoading ? <tr><td colSpan={6} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>Loading…</td></tr>
                  : invItems.length === 0 ? <tr><td colSpan={6} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>No inventory records found.</td></tr>
                  : invItems.map((item, i) => (
                    <tr key={item.inventory_id} style={i % 2 !== 0 ? { background:'#f9fafb' } : {}}>
                      <td style={tdStyle}>{i+1}</td>
                      <td style={{ ...tdStyle, fontWeight:600 }}>{item.vaccine_type}</td>
                      <td style={tdStyle}>{item.batch_number}</td>
                      <td style={{ ...tdStyle, fontWeight:700, color: item.current_quantity === 0 ? '#ef4444' : 'var(--text-h)' }}>{item.current_quantity}</td>
                      <td style={tdStyle}>{fmtDate(item.expiration_date)}</td>
                      <td style={tdStyle}><InvStatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>{/* /printRef */}

      {showPrintModal && (
        <PrintPreviewModal
          html={printHtml} clinicName={clinicName} printedBy={printedBy}
          printDate={printDate} dateFrom={dateFrom} dateTo={dateTo}
          activeTab={activeTab} onConfirm={handleConfirmPrint}
          onCancel={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
