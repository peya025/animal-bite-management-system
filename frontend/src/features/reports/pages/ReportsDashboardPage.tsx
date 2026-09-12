import { useState, useEffect } from 'react';
import api from '../../../services/api';
import tagoloanLogo from '../../../assets/Flag_of_Tagoloan,_Misamis_Oriental.png';
import rhuLogo from '../../../assets/rhu-logo.png';

// ─── Types ────────────────────────────────────────────────────
interface ReportStats {
  total_patients: number;
  total_bite_cases: number;
  category_i: number;
  category_ii: number;
  category_iii: number;
  completed_treatments: number;
  ongoing_treatments: number;
  total_vaccinations: number;
  vaccination_completion_rate: number;
  avg_queue_wait_time: number;
  new_patients_period: number;
  new_cases_period: number;
}

interface BiteCase {
  id: number;
  case_number?: string;
  patient_name: string;
  patient_id?: number;
  category: string;
  animal_type: string;
  status: string;
  created_at: string;
}

interface Patient {
  id: number;
  patient_number?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  contact_number: string;
  created_at: string;
}

interface InventoryItem {
  inventory_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'deleted';
  received_from?: string;
  initial_quantity?: number;
  total_dispensed?: number;
  doses_per_vial?: number;
  open_vial_status?: string;
  open_vial_doses_used?: number;
  open_vial_doses_remaining?: number;
  open_vial_discard_at?: string;
  discarded_vials?: number;
}

interface InventoryStats {
  total_batches: number;
  active_batches: number;
  depleted_batches: number;
  expired_batches: number;
  total_stock: number;
  expiring_soon: number;
  low_stock: number;
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n?: number) => (n != null ? n.toLocaleString() : '—');
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const toYMD = (dateInput: string | Date | undefined): string | null => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getPeriodBounds = (period: 'today' | 'this_week' | 'this_month') => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayYmd = `${year}-${month}-${day}`;

  if (period === 'today') {
    return { from: todayYmd, to: todayYmd };
  }
  if (period === 'this_week') {
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff);
    const sYear = startOfWeek.getFullYear();
    const sMonth = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const sDay = String(startOfWeek.getDate()).padStart(2, '0');
    return { from: `${sYear}-${sMonth}-${sDay}`, to: todayYmd };
  }
  if (period === 'this_month') {
    return { from: `${year}-${month}-01`, to: todayYmd };
  }
  return { from: '', to: '' };
};

// ─── Restored Emerald UI Styles ──────────────────────────────
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--text-h)',
  borderLeft: '3px solid #10b981',
  paddingLeft: 10,
  marginBottom: 12,
};

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '12px 16px',
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6b7280' };

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  outline: 'none',
  fontFamily: 'inherit',
  background: '#fff',
};

const selectStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 32px 6px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  outline: 'none',
  fontFamily: 'inherit',
  background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E") no-repeat right 10px center',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  cursor: 'pointer',
  color: '#374151',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  transition: 'all 0.15s ease-in-out',
};

const tabStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
  color: '#6b7280',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
};

const tabActiveStyle: React.CSSProperties = {
  background: '#10b981',
  color: '#fff',
  border: '1px solid #10b981',
};

const tableWrapStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };

const thStyle: React.CSSProperties = {
  background: '#f0fdf4',
  color: 'var(--text-h)',
  fontWeight: 600,
  padding: '10px 14px',
  textAlign: 'left',
  borderBottom: '2px solid #10b981',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = { padding: '9px 14px', borderBottom: '1px solid #f0f0f0' };

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  width: '100%',
  maxWidth: 860,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};

function btnStyle(bg: string, small = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: small ? '7px 14px' : '9px 18px',
    background: `linear-gradient(135deg, ${bg} 0%, ${bg}cc 100%)`,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: small ? 12 : 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: `0 2px 8px ${bg}44`,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  };
}

// ─── Sub-components ───────────────────────────────────────────
function StatBox({
  label, value, color, sub, loading, onClick, active
}: {
  label: string; value: string; color: string; sub?: string; loading: boolean; onClick?: () => void; active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? '#f0fdf4' : '#fff',
        border: active ? '2px solid #10b981' : '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '16px 14px',
        textAlign: 'center',
        boxShadow: active ? '0 4px 12px rgba(16,185,129,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        userSelect: 'none',
      }}
      title={onClick ? `Click to inspect & print records for ${label}` : undefined}
    >
      {active && (
        <div style={{ position: 'absolute', top: 5, right: 6, fontSize: 9, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '1px 6px', borderRadius: 10 }}>
          ✓ ACTIVE
        </div>
      )}
      <div style={{ fontSize: 26, fontWeight: 800, color: loading ? '#d1d5db' : color, lineHeight: 1 }}>{loading ? '—' : value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#065f46' : '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{sub}</div>}
      <div style={{ fontSize: 9, fontWeight: 600, color: active ? '#059669' : '#3b82f6', marginTop: 5, textDecoration: 'underline' }}>
        {active ? 'Click to deselect' : 'Click to inspect & print'}
      </div>
    </div>
  );
}

function CatBox({
  cat, count, color, desc, loading, active
}: {
  cat: string; count?: number; color: string; desc: string; loading: boolean; active?: boolean;
}) {
  return (
    <div
      style={{
        background: active ? '#f0fdf4' : '#fff',
        border: active ? '2.5px solid #10b981' : `2px solid ${color}`,
        borderRadius: 10,
        padding: '16px 18px',
        boxShadow: active ? '0 4px 12px rgba(16,185,129,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
      }}
    >
      {active && (
        <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: 10 }}>
          ✓ SELECTED
        </div>
      )}
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
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
    abandoned: { bg: '#fee2e2', color: '#991b1b' },
  };
  const s = map[status?.toLowerCase()] ?? { bg: '#f3f4f6', color: '#374151' };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{status || '—'}</span>;
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

// ─── Form-Style Boxed Table Report HTML Builder ───────────────
const buildReportBodyHtml = (
  tab: 'summary' | 'cases' | 'patients' | 'inventory',
  card: { type: 'patients' | 'cases'; title: string; records: any[] } | null,
  catFilter: string,
  st: ReportStats | null,
  sumMetrics: {
    totalPatients: number;
    totalBiteCases: number;
    newPatients: number;
    newCases: number;
    completedCases: number;
    ongoingCases: number;
  },
  sumCases: BiteCase[],
  filtCases: BiteCase[],
  allCases: BiteCase[],
  filtPats: Patient[],
  allPats: Patient[],
  filtInv: InventoryItem[],
  allInv: InventoryItem[],
  invDispStats: {
    active_batches: number;
    total_stock: number;
    expiring_soon: number;
    depleted_batches: number;
    expired_batches: number;
  },
  activeFiltersText: string,
  dFrom: string,
  dTo: string
): string => {
  if (tab === 'summary') {
    if (card) {
      if (card.type === 'patients') {
        const rows = card.records.map((p, i) =>
          `<tr><td style="text-align:center;border:1px solid #000;">${i+1}</td><td style="font-weight:600;border:1px solid #000;">${p.last_name}, ${p.first_name}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.date_of_birth)}</td><td style="text-align:center;border:1px solid #000;">${p.contact_number ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.created_at)}</td></tr>`
        ).join('');
        return `
          <h3 class="sec">I. Chosen Card Audit Table — ${card.title}</h3>
          <p class="note">Active Card Filter: ${card.title} | Total Records: ${card.records.length}</p>
          <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
            <thead><tr style="background:#fff;"><th style="text-align:center;width:5%;border:1px solid #000;">#</th><th style="border:1px solid #000;">Patient Name (Last, First)</th><th style="text-align:center;border:1px solid #000;">Date of Birth</th><th style="text-align:center;border:1px solid #000;">Contact No.</th><th style="text-align:center;border:1px solid #000;">Registered On</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#000;border:1px solid #000;">No patient records found in this card filter.</td></tr>'}</tbody>
            <tfoot><tr style="font-weight:700;background:#fff"><td colspan="4" style="border:1px solid #000;">Total Patient Records</td><td style="text-align:center;border:1px solid #000;">${card.records.length}</td></tr></tfoot>
          </table>`;
      } else {
        const rows = card.records.map((c, i) =>
          `<tr><td style="text-align:center;border:1px solid #000;">${i+1}</td><td style="font-weight:600;border:1px solid #000;">${c.patient_name ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${c.case_number || '—'}</td><td style="text-align:center;border:1px solid #000;">${c.category || '—'}</td><td style="border:1px solid #000;">${c.animal_type ?? '—'}</td><td style="text-align:center;text-transform:capitalize;border:1px solid #000;">${c.status || '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(c.created_at)}</td></tr>`
        ).join('');
        return `
          <h3 class="sec">I. Chosen Card Audit Table — ${card.title}</h3>
          <p class="note">Active Card Filter: ${card.title} | Total Records: ${card.records.length}</p>
          <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
            <thead><tr style="background:#fff;"><th style="text-align:center;width:5%;border:1px solid #000;">#</th><th style="border:1px solid #000;">Patient Name</th><th style="text-align:center;border:1px solid #000;">Case No.</th><th style="text-align:center;border:1px solid #000;">Category</th><th style="border:1px solid #000;">Animal Type</th><th style="text-align:center;border:1px solid #000;">Status</th><th style="text-align:center;border:1px solid #000;">Date</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#000;border:1px solid #000;">No bite cases found in this card filter.</td></tr>'}</tbody>
            <tfoot><tr style="font-weight:700;background:#fff"><td colspan="6" style="border:1px solid #000;">Total Bite Cases</td><td style="text-align:center;border:1px solid #000;">${card.records.length}</td></tr></tfoot>
          </table>`;
      }
    } else if (catFilter !== 'ALL') {
      const rows = sumCases.map((c, i) =>
        `<tr><td style="text-align:center;border:1px solid #000;">${i+1}</td><td style="font-weight:600;border:1px solid #000;">${c.patient_name ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${c.case_number || '—'}</td><td style="text-align:center;border:1px solid #000;">${c.category || '—'}</td><td style="border:1px solid #000;">${c.animal_type ?? '—'}</td><td style="text-align:center;text-transform:capitalize;border:1px solid #000;">${c.status || '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(c.created_at)}</td></tr>`
      ).join('');
      return `
        <h3 class="sec">I. Chosen Category Incident Table — ${catFilter}</h3>
        <p class="note">Active Category Filter: ${catFilter} | Total Records: ${sumCases.length}</p>
        <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
          <thead><tr style="background:#fff;"><th style="text-align:center;width:5%;border:1px solid #000;">#</th><th style="border:1px solid #000;">Patient Name</th><th style="text-align:center;border:1px solid #000;">Case No.</th><th style="text-align:center;border:1px solid #000;">Category</th><th style="border:1px solid #000;">Animal Type</th><th style="text-align:center;border:1px solid #000;">Status</th><th style="text-align:center;border:1px solid #000;">Date</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#000;border:1px solid #000;">No bite cases found for ' + catFilter + '.</td></tr>'}</tbody>
          <tfoot><tr style="font-weight:700;background:#fff"><td colspan="6" style="border:1px solid #000;">Total Bite Cases</td><td style="text-align:center;border:1px solid #000;">${sumCases.length}</td></tr></tfoot>
        </table>`;
    } else {
      return `
        <h3 class="sec">I. Summary Statistics Table</h3>
        <table class="info-table" style="border:1px solid #000;border-collapse:collapse;width:100%;">
          <tr><td class="lbl" style="border:1px solid #000;">Total Registered Patients</td><td class="val" style="border:1px solid #000;">${fmt(sumMetrics.totalPatients)}</td><td class="lbl" style="border:1px solid #000;">Total Bite Cases (All Time)</td><td class="val" style="border:1px solid #000;">${fmt(sumMetrics.totalBiteCases)}</td></tr>
          <tr><td class="lbl" style="border:1px solid #000;">New Patients (Period)</td><td class="val" style="border:1px solid #000;">${fmt(sumMetrics.newPatients)}</td><td class="lbl" style="border:1px solid #000;">New Cases (Period)</td><td class="val" style="border:1px solid #000;">${fmt(sumMetrics.newCases)}</td></tr>
          <tr><td class="lbl" style="border:1px solid #000;">Completed Treatments</td><td class="val" style="border:1px solid #000;">${fmt(sumMetrics.completedCases)}</td><td class="lbl" style="border:1px solid #000;">Ongoing Treatments</td><td class="val" style="border:1px solid #000;">${fmt(sumMetrics.ongoingCases)}</td></tr>
          <tr><td class="lbl" style="border:1px solid #000;">Category Filter Active</td><td class="val" style="border:1px solid #000;">${catFilter}</td><td class="lbl" style="border:1px solid #000;">Reporting Period</td><td class="val" style="border:1px solid #000;">${fmtDate(dFrom)} – ${fmtDate(dTo)}</td></tr>
        </table>
        <h3 class="sec">II. Bite Case Classification Breakdown Table</h3>
        <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
          <thead><tr style="background:#fff;"><th style="border:1px solid #000;">Category</th><th style="border:1px solid #000;">Classification</th><th style="border:1px solid #000;">Description</th><th style="text-align:right;border:1px solid #000;">Count</th></tr></thead>
          <tbody>
            <tr><td style="border:1px solid #000;">Category I</td><td style="border:1px solid #000;">Minor</td><td style="border:1px solid #000;">Licking of intact skin; no exposure</td><td style="text-align:right;border:1px solid #000;">${fmt(st?.category_i)}</td></tr>
            <tr><td style="border:1px solid #000;">Category II</td><td style="border:1px solid #000;">Moderate</td><td style="border:1px solid #000;">Nibbling of uncovered skin; minor scratches without bleeding</td><td style="text-align:right;border:1px solid #000;">${fmt(st?.category_ii)}</td></tr>
            <tr><td style="border:1px solid #000;">Category III</td><td style="border:1px solid #000;">Severe</td><td style="border:1px solid #000;">Transdermal bites or scratches; licks on broken skin</td><td style="text-align:right;border:1px solid #000;">${fmt(st?.category_iii)}</td></tr>
          </tbody>
          <tfoot>
            <tr style="font-weight:700;background:#fff"><td colspan="3" style="border:1px solid #000;">Total Registered Incident Cases</td><td style="text-align:right;border:1px solid #000;">${fmt((st?.category_i ?? 0) + (st?.category_ii ?? 0) + (st?.category_iii ?? 0))}</td></tr>
          </tfoot>
        </table>`;
    }
  } else if (tab === 'cases') {
    const rows = filtCases.map((c, i) =>
      `<tr><td style="text-align:center;border:1px solid #000;">${i+1}</td><td style="font-weight:600;border:1px solid #000;">${c.patient_name ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${c.case_number || '—'}</td><td style="text-align:center;border:1px solid #000;">${c.category || '—'}</td><td style="border:1px solid #000;">${c.animal_type ?? '—'}</td><td style="text-align:center;text-transform:capitalize;border:1px solid #000;">${c.status || '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(c.created_at)}</td></tr>`
    ).join('');
    return `
      <h3 class="sec">I. Bite Case Incident Table</h3>
      <p class="note">Reporting Period: ${fmtDate(dFrom)} to ${fmtDate(dTo)} | Active Filters: ${activeFiltersText} | Filtered Total: ${filtCases.length} of ${allCases.length}</p>
      <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
        <thead><tr style="background:#fff;"><th style="text-align:center;width:5%;border:1px solid #000;">#</th><th style="border:1px solid #000;">Patient Name</th><th style="text-align:center;border:1px solid #000;">Case No.</th><th style="text-align:center;border:1px solid #000;">Category</th><th style="border:1px solid #000;">Animal Type</th><th style="text-align:center;border:1px solid #000;">Status</th><th style="text-align:center;border:1px solid #000;">Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#000;border:1px solid #000;">No bite cases match the active filter criteria.</td></tr>'}</tbody>
        <tfoot>
          <tr style="font-weight:700;background:#fff"><td colspan="6" style="border:1px solid #000;">Total Filtered Bite Cases</td><td style="text-align:center;border:1px solid #000;">${filtCases.length}</td></tr>
        </tfoot>
      </table>`;
  } else if (tab === 'patients') {
    const rows = filtPats.map((p, i) =>
      `<tr><td style="text-align:center;border:1px solid #000;">${i+1}</td><td style="font-weight:600;border:1px solid #000;">${p.last_name}, ${p.first_name}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.date_of_birth)}</td><td style="text-align:center;border:1px solid #000;">${p.contact_number ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.created_at)}</td></tr>`
    ).join('');
    return `
      <h3 class="sec">I. Patient Intake Registry Table</h3>
      <p class="note">Reporting Period: ${fmtDate(dFrom)} to ${fmtDate(dTo)} | Active Filters: ${activeFiltersText} | Filtered Total: ${filtPats.length} of ${allPats.length}</p>
      <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
        <thead><tr style="background:#fff;"><th style="text-align:center;width:5%;border:1px solid #000;">#</th><th style="border:1px solid #000;">Patient Name (Last, First)</th><th style="text-align:center;border:1px solid #000;">Date of Birth</th><th style="text-align:center;border:1px solid #000;">Contact No.</th><th style="text-align:center;border:1px solid #000;">Registered On</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#000;border:1px solid #000;">No patient records match the active filter criteria.</td></tr>'}</tbody>
        <tfoot>
          <tr style="font-weight:700;background:#fff"><td colspan="4" style="border:1px solid #000;">Total Filtered Patients</td><td style="text-align:center;border:1px solid #000;">${filtPats.length}</td></tr>
        </tfoot>
      </table>`;
  } else {
    const totalSealed = filtInv.reduce((s, i) => s + (Number(i.current_quantity) || 0), 0);
    const totalDispensed = filtInv.reduce((s, i) => s + (Number(i.total_dispensed) || 0), 0);
    const totalReceived = filtInv.reduce((s, i) => s + (Number(i.initial_quantity) || (Number(i.current_quantity) + (Number(i.total_dispensed) || 0))), 0);

    const statsRows = `<table class="info-table" style="border:1px solid #000;border-collapse:collapse;width:100%;">
      <tr><td class="lbl" style="border:1px solid #000;">Active Batches</td><td class="val" style="border:1px solid #000;">${invDispStats.active_batches}</td><td class="lbl" style="border:1px solid #000;">Total Sealed Vials in Stock</td><td class="val" style="border:1px solid #000;">${invDispStats.total_stock}</td></tr>
      <tr><td class="lbl" style="border:1px solid #000;">Expiring Soon (≤ 60d)</td><td class="val" style="border:1px solid #000;">${invDispStats.expiring_soon}</td><td class="lbl" style="border:1px solid #000;">Depleted Batches</td><td class="val" style="border:1px solid #000;">${invDispStats.depleted_batches}</td></tr>
      <tr><td class="lbl" style="border:1px solid #000;">Expired Batches</td><td class="val" style="border:1px solid #000;">${invDispStats.expired_batches}</td><td class="lbl" style="border:1px solid #000;">Total Batches Listed</td><td class="val" style="border:1px solid #000;">${filtInv.length}</td></tr>
    </table>`;
    const rows = filtInv.map((item, i) => {
      const exp = item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
      const qtyS = item.current_quantity === 0 ? 'font-weight:700' : '';
      const supplier = item.received_from || 'DOH Central Supply';
      const recQty = item.initial_quantity ?? (item.current_quantity + (item.total_dispensed ?? 0));
      const usedQty = item.total_dispensed ?? 0;
      const openStatus = item.open_vial_status ? `${item.open_vial_doses_remaining ?? 0} doses left` : 'Sealed';
      const wasteQty = item.status === 'expired' ? item.current_quantity : (item.discarded_vials ?? 0);

      return `<tr>
        <td style="text-align:center;border:1px solid #000;">${i+1}</td>
        <td style="font-weight:700;border:1px solid #000;">${item.vaccine_type}</td>
        <td style="text-align:center;border:1px solid #000;">${item.batch_number}</td>
        <td style="border:1px solid #000;">${supplier}</td>
        <td style="text-align:center;border:1px solid #000;">${recQty}</td>
        <td style="text-align:center;border:1px solid #000;">${usedQty}</td>
        <td style="text-align:center;border:1px solid #000;${qtyS}">${item.current_quantity}</td>
        <td style="text-align:center;border:1px solid #000;">${openStatus}</td>
        <td style="text-align:center;border:1px solid #000;">${wasteQty}</td>
        <td style="text-align:center;border:1px solid #000;">${exp}</td>
        <td style="text-align:center;text-transform:capitalize;border:1px solid #000;">${item.status}</td>
      </tr>`;
    }).join('');

    return `
      <h3 class="sec">I. Vaccine Stock &amp; Utilization Summary</h3>${statsRows}
      <h3 class="sec">II. Batch Inventory &amp; Wastage Audit Log</h3>
      <p class="note">Active Filters: ${activeFiltersText} | Showing ${filtInv.length} of ${allInv.length} items</p>
      <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#fff;">
            <th style="text-align:center;width:4%;border:1px solid #000;">#</th>
            <th style="border:1px solid #000;">Vaccine Type</th>
            <th style="text-align:center;border:1px solid #000;">Batch No.</th>
            <th style="border:1px solid #000;">Supplier / Source</th>
            <th style="text-align:center;border:1px solid #000;">Received</th>
            <th style="text-align:center;border:1px solid #000;">Used</th>
            <th style="text-align:center;border:1px solid #000;">Sealed</th>
            <th style="text-align:center;border:1px solid #000;">Open Vial Status</th>
            <th style="text-align:center;border:1px solid #000;">Wastage</th>
            <th style="text-align:center;border:1px solid #000;">Expiration</th>
            <th style="text-align:center;border:1px solid #000;">Status</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="11" style="text-align:center;color:#000;border:1px solid #000;">No inventory records matching selected filters.</td></tr>'}</tbody>
        <tfoot>
          <tr style="font-weight:700;background:#fff">
            <td colspan="4" style="border:1px solid #000;">Total Inventory Quantities</td>
            <td style="text-align:center;border:1px solid #000;">${totalReceived}</td>
            <td style="text-align:center;border:1px solid #000;">${totalDispensed}</td>
            <td style="text-align:center;border:1px solid #000;">${totalSealed}</td>
            <td colspan="4" style="border:1px solid #000;"></td>
          </tr>
        </tfoot>
      </table>`;
  }
};

// ─── Print Preview Modal ──────────────────────────────────────
interface PrintPreviewModalProps {
  html: string;
  clinicName: string;
  printedBy: string;
  printDate: string;
  dateFrom: string;
  dateTo: string;
  activeTab: string;
  activeFiltersText: string;
  onConfirm: () => void;
  onCancel: () => void;
}
function PrintPreviewModal({
  html, clinicName, printedBy, printDate, dateFrom, dateTo, activeTab,
  activeFiltersText, onConfirm, onCancel
}: PrintPreviewModalProps) {
  const tabLabel = activeTab === 'summary' ? 'Summary Report' : activeTab === 'cases' ? 'Bite Cases Report' : activeTab === 'inventory' ? 'Vaccine Inventory & Wastage Report' : 'Patient Registry Report';

  return (
    <div style={overlayStyle} onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="print-title">
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fff', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </div>
            <div>
              <h2 id="print-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>
                Formal Print Preview
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                Strictly displays chosen dataset in form-style boxed table layout
              </p>
            </div>
          </div>
          <button onClick={onCancel} aria-label="Close"
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', background: '#f3f4f6' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
            .print-modal-content h3.sec {
              font-family: 'Poppins', sans-serif;
              font-size: 10pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: .5px;
              border-bottom: 2px solid #000;
              padding-bottom: 3px;
              margin: 18px 0 10px;
              color: #000;
            }
            .print-modal-content p.note {
              font-family: 'Poppins', sans-serif;
              font-size: 8.5pt;
              color: #000;
              margin-bottom: 8px;
              font-style: italic;
            }
            .print-modal-content table {
              font-family: 'Poppins', sans-serif;
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
              font-size: 9pt;
              border: 1px solid #000;
            }
            .print-modal-content th {
              background: #fff;
              color: #000;
              font-weight: 700;
              padding: 6px 8px;
              text-align: left;
              font-size: 9pt;
              border: 1px solid #000;
            }
            .print-modal-content td {
              padding: 5px 8px;
              border: 1px solid #000;
              color: #000;
              background: #fff;
            }
            .print-modal-content tr:nth-child(even) td {
              background: #fff;
            }
            .print-modal-content table.info-table td {
              border: 1px solid #000;
              padding: 5px 10px;
              vertical-align: top;
              background: #fff;
            }
            .print-modal-content table.info-table td.lbl {
              background: #fff;
              font-weight: 700;
              font-size: 9pt;
              width: 22%;
              color: #000;
            }
            .print-modal-content table.info-table td.val {
              font-size: 9pt;
              width: 28%;
              color: #000;
              background: #fff;
            }
          `}</style>

          <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', minHeight: 500, fontSize: 13, color: '#000', fontFamily: "'Poppins', sans-serif" }}>
            {/* Header with Specified Logos: Left Tagoloan Flag, Right RHU Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 4 }}>
              <img src={tagoloanLogo} alt="Tagoloan Flag" style={{ width: 68, height: 68, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { (e.target as HTMLElement).style.visibility = 'hidden'; }} />
              <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
                <div style={{ fontSize: '8pt', fontFamily: "'Poppins', sans-serif", fontStyle: 'italic' }}>Republic of the Philippines</div>
                <div style={{ fontSize: '9.5pt', fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>PROVINCE OF MISAMIS ORIENTAL</div>
                <div style={{ fontSize: '8.5pt', fontFamily: "'Poppins', sans-serif" }}>Municipality of Tagoloan</div>
                <div style={{ fontSize: '11pt', fontWeight: 800, fontFamily: "'Poppins', sans-serif", marginTop: 1 }}>MUNICIPAL HEALTH OFFICE</div>
                <div style={{ fontSize: '8pt', fontFamily: "'Poppins', sans-serif", fontStyle: 'italic' }}>Tel. No. (088)890-4770</div>
              </div>
              <img src={rhuLogo} alt="RHU Logo" style={{ width: 68, height: 68, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { (e.target as HTMLElement).style.visibility = 'hidden'; }} />
            </div>
            <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '4px 0 14px' }}/>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'underline', fontFamily: "'Poppins', sans-serif" }}>{tabLabel}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px', border: '1px solid #000', padding: '9px 12px', marginBottom: 16, fontSize: 11, fontFamily: "'Poppins', sans-serif" }}>
              <span style={{ color: '#000' }}>Reporting Period:</span>
              <span style={{ fontWeight: 700 }}>{fmtDate(dateFrom)} – {fmtDate(dateTo)}</span>
              <span style={{ color: '#000' }}>Active Filters:</span>
              <span style={{ fontWeight: 700 }}>{activeFiltersText || 'None (All Records)'}</span>
              <span style={{ color: '#000' }}>Date Generated:</span>
              <span style={{ fontWeight: 700 }}>{printDate}</span>
              <span style={{ color: '#000' }}>Prepared by:</span>
              <span style={{ fontWeight: 700 }}>{printedBy}</span>
            </div>

            <div className="print-modal-content" dangerouslySetInnerHTML={{ __html: html }} />

            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, fontFamily: "'Poppins', sans-serif" }}>
              <div><div style={{ borderTop: '1px solid #000', marginTop: 32, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>{printedBy}</div>
                <div style={{ fontSize: 10, color: '#000' }}>Prepared by (Clinic Nurse / Inventory Officer)</div>
              </div></div>
              <div><div style={{ borderTop: '1px solid #000', marginTop: 32, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>____________________________</div>
                <div style={{ fontSize: 10, color: '#000' }}>Noted &amp; Approved by (Medical Officer / Doctor in Charge)</div>
              </div></div>
            </div>

            <div style={{ marginTop: 28, paddingTop: 8, borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#000', fontFamily: "'Poppins', sans-serif" }}>
              <span>{clinicName} — Animal Bite Treatment Center</span>
              <span>{printDate}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #e5e7eb', flexShrink: 0, background: '#fafafa', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} style={btnStyle('#10b981')}>
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

  const [dateFrom,            setDateFrom]            = useState(firstOfMonth);
  const [dateTo,              setDateTo]              = useState(todayStr);
  const [stats,               setStats]               = useState<ReportStats | null>(null);
  const [biteCases,           setBiteCases]           = useState<BiteCase[]>([]);
  const [patients,            setPatients]            = useState<Patient[]>([]);
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState('');
  const [activeTab,           setActiveTab]           = useState<'summary' | 'cases' | 'patients' | 'inventory'>('summary');
  const [showPrintModal,      setShowPrintModal]      = useState(false);
  const [printHtml,           setPrintHtml]           = useState('');
  const [invItems,            setInvItems]            = useState<InventoryItem[]>([]);
  const [invStats,            setInvStats]            = useState<InventoryStats | null>(null);
  const [invLoading,          setInvLoading]          = useState(false);
  const [presetTypes,         setPresetTypes]         = useState<string[]>([]);
  
  // Inventory filters (Task 12)
  const [selectedVaccineType, setSelectedVaccineType] = useState<string>('ALL');
  const [expiryFilter,        setExpiryFilter]        = useState<string>('ALL');
  const [supplierFilter,      setSupplierFilter]      = useState<string>('ALL');
  const [expiryDateFrom,      setExpiryDateFrom]      = useState<string>('');
  const [expiryDateTo,        setExpiryDateTo]        = useState<string>('');

  // Summary Category, Period & Card selection filters (Task 9)
  const [summaryPeriodFilter, setSummaryPeriodFilter] = useState<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL');
  const [summaryCatFilter,    setSummaryCatFilter]    = useState<string>('ALL');
  const [selectedCard,        setSelectedCard]        = useState<string | null>(null);

  // Bite Cases module filters & search (Task 10)
  const [caseSearch,          setCaseSearch]          = useState<string>('');
  const [casePeriodFilter,    setCasePeriodFilter]    = useState<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL');
  const [caseCatFilter,       setCaseCatFilter]       = useState<string>('ALL');
  const [caseAnimalFilter,    setCaseAnimalFilter]    = useState<string>('ALL');
  const [caseAnimalOtherText, setCaseAnimalOtherText] = useState<string>('');
  const [caseStatusFilter,    setCaseStatusFilter]    = useState<string>('ALL');

  // Patients module search & registration date filter (Task 11)
  const [patientSearch,       setPatientSearch]       = useState<string>('');
  const [patientPeriodFilter, setPatientPeriodFilter] = useState<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL');
  const [patientMonthFilter,  setPatientMonthFilter]  = useState<string>('ALL');
  const [patientYearFilter,   setPatientYearFilter]   = useState<string>('ALL');

  const clinicData = localStorage.getItem('clinicData');
  const clinic     = clinicData ? JSON.parse(clinicData) : null;
  const userData   = localStorage.getItem('userData');
  const user       = userData   ? JSON.parse(userData)   : null;
  const clinicName = clinic?.name ?? 'Animal Bite Treatment Center';
  const printedBy  = user?.name  ?? 'Unknown';
  const printDate  = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

  const getExpiryFilterLabel = (filter: string, from?: string, to?: string) => {
    if (filter === 'valid') return 'Valid / Active (Not Expired)';
    if (filter === 'expiring_30') return 'Expiring in ≤ 30 Days';
    if (filter === 'expiring_60') return 'Expiring in ≤ 60 Days';
    if (filter === 'expiring_90') return 'Expiring in ≤ 90 Days';
    if (filter === 'expired') return 'Expired Batches';
    if (filter === 'custom') {
      if (from && to) return `Expires: ${fmtDate(from)} – ${fmtDate(to)}`;
      if (from) return `Expires after ${fmtDate(from)}`;
      if (to) return `Expires before ${fmtDate(to)}`;
      return 'Custom Expiry Range';
    }
    return 'All Expiry Dates';
  };

  const loadReports = async () => {
    setLoading(true); setError('');
    try {
      const [casesRes, patsRes] = await Promise.all([
        api.get('/cases',    { params: { per_page: 500 } }),
        api.get('/patients', { params: { per_page: 500 } }),
      ]);
      const casesRaw = casesRes.data?.data ?? casesRes.data ?? [];
      const patsRaw  = patsRes.data?.data  ?? patsRes.data  ?? [];

      const casesData: BiteCase[] = (Array.isArray(casesRaw) ? casesRaw : []).map((c: any) => ({
        id:           c.id ?? c.bite_id,
        case_number:  c.case_number ?? `BC-${c.id ?? c.bite_id}`,
        patient_id:   c.patient_id ?? c.patient?.id,
        patient_name: c.patient ? `${c.patient.first_name ?? ''} ${c.patient.last_name ?? ''}`.trim() : (c.patient_name ?? '—'),
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
      const totalPats  = gPats.status  === 'fulfilled' ? (gPats.value.data?.total  ?? patsData.length)  : patsData.length;
      const totalCases = gCases.status === 'fulfilled' ? (gCases.value.data?.total ?? casesData.length) : casesData.length;

      setStats({
        total_patients: totalPats,
        total_bite_cases: totalCases,
        category_i: catI,
        category_ii: catII,
        category_iii: catIII,
        completed_treatments: completed,
        ongoing_treatments: ongoing,
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
      const [itemsRes, statsRes, presetsRes] = await Promise.allSettled([
        api.get('/inventory', { params: { per_page: 200 } }),
        api.get('/inventory/statistics'),
        api.get('/inventory/presets'),
      ]);
      if (itemsRes.status === 'fulfilled') {
        const data = itemsRes.value.data?.data ?? itemsRes.value.data ?? [];
        setInvItems(Array.isArray(data) ? data : []);
      }
      if (statsRes.status === 'fulfilled') setInvStats(statsRes.value.data);
      if (presetsRes.status === 'fulfilled') {
        const presets = presetsRes.value.data?.data ?? presetsRes.value.data ?? [];
        if (Array.isArray(presets)) {
          setPresetTypes(presets.map((p: any) => p.name || p.vaccine_name || p.vaccine_type).filter(Boolean));
        }
      }
    } catch { /* silently fail */ }
    finally { setInvLoading(false); }
  };

  useEffect(() => { loadReports(); }, []); // eslint-disable-line
  useEffect(() => {
    if (activeTab === 'inventory' && invItems.length === 0 && !invLoading) loadInventory();
  }, [activeTab]); // eslint-disable-line

  // Unique suppliers list
  const availableSuppliers = Array.from(
    new Set([
      'DOH Central Supply',
      'PHO - Provincial Health Office',
      'CHO / MHO - City/Municipal Health Office',
      'LGU Local Procurement',
      'Hospital Pharmacy / Direct Purchase',
      'Donation / NGO',
      ...invItems.map(i => i.received_from?.trim()).filter(Boolean) as string[],
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Available unique vaccine types
  const availableVaccineTypes = Array.from(
    new Set([
      ...invItems.map(i => i.vaccine_type?.trim()).filter(Boolean),
      ...presetTypes.map(p => p?.trim()).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Filtered Summary Cases (Task 9.1)
  const filteredSummaryCases = biteCases.filter(c => {
    if (summaryPeriodFilter !== 'ALL') {
      const bounds = getPeriodBounds(summaryPeriodFilter);
      const ymd = toYMD(c.created_at);
      if (!ymd || ymd < bounds.from || ymd > bounds.to) return false;
    }
    if (summaryCatFilter !== 'ALL' && c.category !== summaryCatFilter) return false;
    return true;
  });

  const filteredPeriodPatients = patients.filter(p => {
    if (summaryPeriodFilter !== 'ALL') {
      const bounds = getPeriodBounds(summaryPeriodFilter);
      const ymd = toYMD(p.created_at);
      if (!ymd || ymd < bounds.from || ymd > bounds.to) return false;
    }
    return true;
  });

  // Dynamic 6 Metric Counters for Summary Dashboard (Task 9.2)
  const summaryMetrics = {
    totalPatients: stats?.total_patients ?? patients.length,
    totalBiteCases: stats?.total_bite_cases ?? biteCases.length,
    newPatients: summaryPeriodFilter !== 'ALL' ? filteredPeriodPatients.length : patients.length,
    newCases: filteredSummaryCases.length,
    completedCases: filteredSummaryCases.filter(c => c.status === 'completed').length,
    ongoingCases: filteredSummaryCases.filter(c => c.status === 'ongoing' || c.status === 'active').length,
  };

  // Card Drilldown Data Resolution (Clickable Summary Cards)
  const getSelectedCardData = () => {
    if (!selectedCard) return null;
    const pLabel = summaryPeriodFilter === 'today' ? 'Today' : summaryPeriodFilter === 'this_week' ? 'This Week' : summaryPeriodFilter === 'this_month' ? 'This Month' : 'All Time';
    if (selectedCard === 'total_patients') {
      return { type: 'patients' as const, title: 'Total Registered Patients (All Time)', records: patients };
    }
    if (selectedCard === 'new_patients') {
      return { type: 'patients' as const, title: `Patients Registered (${pLabel})`, records: filteredPeriodPatients };
    }
    if (selectedCard === 'total_bite_cases') {
      return { type: 'cases' as const, title: 'Total Bite Cases (All Time)', records: biteCases };
    }
    if (selectedCard === 'new_cases') {
      return { type: 'cases' as const, title: `Incident Cases (${pLabel})`, records: filteredSummaryCases };
    }
    if (selectedCard === 'completed_cases') {
      return { type: 'cases' as const, title: 'Completed Vaccination Treatment Cases', records: filteredSummaryCases.filter(c => c.status === 'completed') };
    }
    if (selectedCard === 'ongoing_cases') {
      return { type: 'cases' as const, title: 'On-going Treatment Cases', records: filteredSummaryCases.filter(c => c.status === 'ongoing' || c.status === 'active') };
    }
    return null;
  };

  const cardData = getSelectedCardData();

  // Filtered Bite Cases (Task 10)
  const filteredBiteCases = biteCases.filter(c => {
    if (casePeriodFilter !== 'ALL') {
      const bounds = getPeriodBounds(casePeriodFilter);
      const ymd = toYMD(c.created_at);
      if (!ymd || ymd < bounds.from || ymd > bounds.to) return false;
    }
    if (caseSearch.trim()) {
      const q = caseSearch.toLowerCase().trim();
      const matchName = (c.patient_name || '').toLowerCase().includes(q);
      const matchNum  = (c.case_number || '').toLowerCase().includes(q);
      const matchId   = String(c.id).includes(q);
      if (!matchName && !matchNum && !matchId) return false;
    }
    if (caseCatFilter !== 'ALL' && c.category !== caseCatFilter) return false;
    if (caseAnimalFilter !== 'ALL') {
      const animal = (c.animal_type || '').toLowerCase();
      if (caseAnimalFilter === 'Dog' && animal !== 'dog') return false;
      if (caseAnimalFilter === 'Cat' && animal !== 'cat') return false;
      if (caseAnimalFilter === 'Others') {
        if (caseAnimalOtherText.trim()) {
          if (!animal.includes(caseAnimalOtherText.trim().toLowerCase())) return false;
        } else {
          if (animal === 'dog' || animal === 'cat') return false;
        }
      }
    }
    if (caseStatusFilter !== 'ALL') {
      const st = (c.status || '').toLowerCase();
      if (caseStatusFilter === 'completed' && st !== 'completed') return false;
      if (caseStatusFilter === 'ongoing'   && st !== 'ongoing' && st !== 'active') return false;
      if (caseStatusFilter === 'cancelled' && st !== 'cancelled' && st !== 'abandoned') return false;
    }
    return true;
  });

  // Filtered Patients (Task 11)
  const filteredPatients = patients.filter(p => {
    if (patientPeriodFilter !== 'ALL') {
      const bounds = getPeriodBounds(patientPeriodFilter);
      const ymd = toYMD(p.created_at);
      if (!ymd || ymd < bounds.from || ymd > bounds.to) return false;
    }
    if (patientSearch.trim()) {
      const q = patientSearch.toLowerCase().trim();
      const matchName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(q);
      const matchContact = (p.contact_number || '').includes(q);
      const matchId = String(p.id).includes(q) || (p.patient_number || '').toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchId) return false;
    }
    if (patientMonthFilter !== 'ALL' && p.created_at) {
      const month = new Date(p.created_at).getMonth() + 1;
      if (String(month) !== patientMonthFilter) return false;
    }
    if (patientYearFilter !== 'ALL' && p.created_at) {
      const year = new Date(p.created_at).getFullYear();
      if (String(year) !== patientYearFilter) return false;
    }
    return true;
  });

  // Filtered Inventory Items (Task 12)
  const filteredInvItems = invItems.filter(item => {
    if (selectedVaccineType !== 'ALL') {
      if ((item.vaccine_type || '').trim().toLowerCase() !== selectedVaccineType.trim().toLowerCase()) return false;
    }
    if (supplierFilter !== 'ALL') {
      if (!(item.received_from || 'DOH Central Supply').toLowerCase().includes(supplierFilter.toLowerCase())) return false;
    }
    if (expiryFilter === 'ALL') return true;
    if (!item.expiration_date) return expiryFilter === 'expired';
    const expTime = new Date(item.expiration_date).getTime();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.ceil((expTime - startOfToday) / (1000 * 60 * 60 * 24));
    if (expiryFilter === 'valid')        { if (item.status === 'expired' || diffDays < 0) return false; }
    else if (expiryFilter === 'expiring_30') { if (item.status === 'expired' || diffDays < 0 || diffDays > 30) return false; }
    else if (expiryFilter === 'expiring_60') { if (item.status === 'expired' || diffDays < 0 || diffDays > 60) return false; }
    else if (expiryFilter === 'expiring_90') { if (item.status === 'expired' || diffDays < 0 || diffDays > 90) return false; }
    else if (expiryFilter === 'expired') { if (item.status !== 'expired' && diffDays >= 0) return false; }
    else if (expiryFilter === 'custom') {
      if (expiryDateFrom && expTime < new Date(expiryDateFrom).getTime()) return false;
      if (expiryDateTo   && expTime > new Date(expiryDateTo).getTime())   return false;
    }
    return true;
  });

  const isInvFiltered = selectedVaccineType !== 'ALL' || supplierFilter !== 'ALL' || expiryFilter !== 'ALL' || Boolean(expiryDateFrom) || Boolean(expiryDateTo);
  const invDisplayStats = {
    active_batches:   filteredInvItems.filter(i => i.status === 'active' && i.current_quantity > 0).length,
    total_stock:      filteredInvItems.reduce((s, i) => s + (Number(i.current_quantity) || 0), 0),
    expiring_soon:    filteredInvItems.filter(i => {
      if (!i.expiration_date || i.status === 'expired' || i.current_quantity === 0) return false;
      const d = Math.ceil((new Date(i.expiration_date).getTime() - Date.now()) / 86400000);
      return d >= 0 && d <= 60;
    }).length,
    depleted_batches: filteredInvItems.filter(i => i.current_quantity === 0).length,
    expired_batches:  filteredInvItems.filter(i => i.status === 'expired' || (!i.expiration_date ? false : new Date(i.expiration_date).getTime() < Date.now())).length,
  };

  const getActiveFiltersSummaryText = (): string => {
    const list: string[] = [];
    if (activeTab === 'summary') {
      if (summaryPeriodFilter !== 'ALL') {
        const pLabel = summaryPeriodFilter === 'today' ? 'Today' : summaryPeriodFilter === 'this_week' ? 'This Week' : 'This Month';
        list.push(`Period: ${pLabel}`);
      }
      if (selectedCard && cardData) list.push(`Card Selected: ${cardData.title}`);
      else if (summaryCatFilter !== 'ALL') list.push(`Category: ${summaryCatFilter}`);
    } else if (activeTab === 'cases') {
      if (casePeriodFilter !== 'ALL') {
        const pLabel = casePeriodFilter === 'today' ? 'Today' : casePeriodFilter === 'this_week' ? 'This Week' : 'This Month';
        list.push(`Period: ${pLabel}`);
      }
      if (caseSearch) list.push(`Search: "${caseSearch}"`);
      if (caseCatFilter !== 'ALL') list.push(`Category: ${caseCatFilter}`);
      if (caseAnimalFilter !== 'ALL') {
        if (caseAnimalFilter === 'Others' && caseAnimalOtherText.trim()) {
          list.push(`Animal: Others (${caseAnimalOtherText.trim()})`);
        } else {
          list.push(`Animal: ${caseAnimalFilter}`);
        }
      }
      if (caseStatusFilter !== 'ALL') list.push(`Status: ${caseStatusFilter}`);
    } else if (activeTab === 'patients') {
      if (patientPeriodFilter !== 'ALL') {
        const pLabel = patientPeriodFilter === 'today' ? 'Today' : patientPeriodFilter === 'this_week' ? 'This Week' : 'This Month';
        list.push(`Period: ${pLabel}`);
      }
      if (patientSearch) list.push(`Search: "${patientSearch}"`);
      if (patientMonthFilter !== 'ALL') {
        const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        list.push(`Month: ${mNames[Number(patientMonthFilter)-1]}`);
      }
      if (patientYearFilter !== 'ALL') list.push(`Year: ${patientYearFilter}`);
    } else if (activeTab === 'inventory') {
      if (selectedVaccineType !== 'ALL') list.push(`Vaccine: ${selectedVaccineType}`);
      if (supplierFilter !== 'ALL') list.push(`Supplier: ${supplierFilter}`);
      if (expiryFilter !== 'ALL') list.push(`Expiry: ${getExpiryFilterLabel(expiryFilter, expiryDateFrom, expiryDateTo)}`);
    }
    return list.length > 0 ? list.join(' | ') : 'All Active Records';
  };

  const handleOpenPrint = () => {
    const bodyHtml = buildReportBodyHtml(
      activeTab,
      cardData,
      summaryCatFilter,
      stats,
      summaryMetrics,
      filteredSummaryCases,
      filteredBiteCases,
      biteCases,
      filteredPatients,
      patients,
      filteredInvItems,
      invItems,
      invDisplayStats,
      getActiveFiltersSummaryText(),
      dateFrom,
      dateTo
    );
    setPrintHtml(bodyHtml);
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    const now = new Date();
    const refNo = `ABTC-RPT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const printDateFull = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const printTimeFull = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    const tabLabel = activeTab === 'summary' ? (cardData ? `Card Audit: ${cardData.title}` : 'Summary Report') : activeTab === 'cases' ? 'Bite Cases Report' : activeTab === 'patients' ? 'Patient Registry Report' : 'Vaccine Inventory & Wastage Report';

    const CSS = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Poppins',sans-serif;color:#000;background:#fff;padding:24px 32px;font-size:10pt;line-height:1.4}.letterhead{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:4px}.logo{width:68px;height:68px;object-fit:contain}.org{text-align:center;line-height:1.3}.org .republic{font-size:8pt;font-style:italic}.org .dept{font-size:9.5pt;font-weight:700}.org .mho{font-size:11pt;font-weight:800;margin-top:1px}.org .address{font-size:8pt;font-style:italic}.divider-thick{border:none;border-top:2px solid #000;margin:4px 0 14px}.doc-title{text-align:center;margin:12px 0 16px}.doc-title h2{font-size:14pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:0;text-decoration:underline}.doc-title p{font-size:9pt;margin:2px 0 0}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:16px;font-size:9pt;border:1px solid #000;padding:8px 12px}h3.sec{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #000;padding-bottom:3px;margin:18px 0 10px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:9pt;border:1px solid #000}th{background:#fff;color:#000;font-weight:700;padding:6px 8px;text-align:left;font-size:9pt;border:1px solid #000}td{padding:5px 8px;border:1px solid #000;color:#000;background:#fff}tr:nth-child(even) td{background:#fff}table.info-table td{border:1px solid #000;padding:5px 10px;vertical-align:top;background:#fff}table.info-table td.lbl{background:#fff;font-weight:700;font-size:9pt;width:22%;color:#000}table.info-table td.val{font-size:9pt;width:28%;color:#000;background:#fff}p.note{font-size:8.5pt;color:#000;margin-bottom:8px;font-style:italic}.sig-section{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.sig-block .line{border-top:1px solid #000;margin-top:36px;padding-top:4px}.sig-block .name{font-weight:700;font-size:10pt;text-transform:uppercase}.sig-block .position{font-size:9pt;color:#000}.footer-bar{margin-top:40px;padding-top:8px;border-top:2px solid #000;display:flex;justify-content:space-between;font-size:8.5pt;color:#000}@media print{body{padding:16px 20px}@page{margin:1.0cm}}`;

    const metaGridHtml = `
      <div class="meta-grid">
        <span>Reporting Period:</span><span style="font-weight:700">${fmtDate(dateFrom)} – ${fmtDate(dateTo)}</span>
        <span>Active Filters:</span><span style="font-weight:700">${getActiveFiltersSummaryText()}</span>
        <span>Date Generated:</span><span style="font-weight:700">${printDateFull} (${printTimeFull})</span>
        <span>Prepared by:</span><span style="font-weight:700">${printedBy}</span>
      </div>
    `;

    const win = window.open('', '_blank', 'width=950,height=750');
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>${clinicName} — ${tabLabel}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>
      <div class="letterhead">
        <img src="/assets/Flag_of_Tagoloan,_Misamis_Oriental.png" alt="Tagoloan Flag" class="logo" />
        <div class="org">
          <div class="republic">Republic of the Philippines</div>
          <div class="dept">PROVINCE OF MISAMIS ORIENTAL</div>
          <div class="dept" style="font-weight:400">Municipality of Tagoloan</div>
          <div class="mho">MUNICIPAL HEALTH OFFICE</div>
          <div class="address">Tel. No. (088)890-4770</div>
        </div>
        <img src="/assets/rhu-logo.png" alt="RHU Logo" class="logo" />
      </div>
      <hr class="divider-thick">
      <div class="doc-title"><h2>${tabLabel}</h2><p>Reference No.: ${refNo}</p></div>
      ${metaGridHtml}
      ${printHtml}
      <div class="sig-section">
        <div class="sig-block"><div class="line"><div class="name">${printedBy}</div><div class="position">Prepared by (Clinic Nurse / Inventory Officer)</div></div></div>
        <div class="sig-block"><div class="line"><div class="name">____________________________</div><div class="position">Noted &amp; Approved by (Medical Officer / Doctor in Charge)</div></div></div>
      </div>
      <div class="footer-bar"><span>${clinicName} — Animal Bite Treatment Center</span><span>Ref: ${refNo} | ${printDateFull}</span></div>
    </body></html>`);

    win.document.close(); win.focus();
    setShowPrintModal(false);
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    <div style={{ padding: '0 24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 600, color: 'var(--text-h)', margin: '0 0 7px', letterSpacing: -0.5 }}>Reports &amp; Analytics</h1>
          <p style={{ fontSize: 13, color: '#77877d', margin: 0 }}>Generate, filter, and print audit-ready clinical and inventory reports</p>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}>
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

      {/* Primary Navigation & Date Range Bar */}
      <div style={{ ...filterBarStyle, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        {/* Row 1: Reporting Period & Tab Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={labelStyle}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
            <label style={labelStyle}>To</label>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={inputStyle} />
            <button onClick={loadReports} disabled={loading} style={btnStyle('#059669', true)}>
              {loading ? 'Loading…' : 'Apply Period'}
            </button>
            {activeTab === 'inventory' && (
              <button onClick={loadInventory} disabled={invLoading} style={btnStyle('#6366f1', true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                {invLoading ? 'Loading…' : 'Refresh Inventory'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', flexShrink: 0 }}>
            {(['summary', 'cases', 'patients', 'inventory'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ ...tabStyle, ...(activeTab === tab ? tabActiveStyle : {}), whiteSpace: 'nowrap' }}>
                {tab === 'summary' ? 'Summary' : tab === 'cases' ? 'Bite Cases' : tab === 'patients' ? 'Patients' : 'Inventory'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Contextual Module Filters */}
        {/* 1. Summary Category & Period Filter */}
        {activeTab === 'summary' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Period</label>
                <select value={summaryPeriodFilter} onChange={e => setSummaryPeriodFilter(e.target.value as any)}
                  style={{ ...selectStyle, minWidth: 140, borderColor: summaryPeriodFilter !== 'ALL' ? '#10b981' : '#d1d5db', fontWeight: summaryPeriodFilter !== 'ALL' ? 600 : 500 }}>
                  <option value="ALL">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Category</label>
                <select value={summaryCatFilter} onChange={e => setSummaryCatFilter(e.target.value)}
                  style={{ ...selectStyle, minWidth: 180, borderColor: summaryCatFilter !== 'ALL' ? '#10b981' : '#d1d5db', fontWeight: summaryCatFilter !== 'ALL' ? 600 : 500 }}>
                  <option value="ALL">All Bite Categories</option>
                  <option value="Category I">Category I (Minor)</option>
                  <option value="Category II">Category II (Moderate)</option>
                  <option value="Category III">Category III (Severe)</option>
                </select>
              </div>
              {(summaryPeriodFilter !== 'ALL' || summaryCatFilter !== 'ALL' || selectedCard !== null) && (
                <button
                  onClick={() => { setSummaryPeriodFilter('ALL'); setSummaryCatFilter('ALL'); setSelectedCard(null); }}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Reset Filters
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Showing overview for <strong>{summaryCatFilter !== 'ALL' ? summaryCatFilter : 'All Categories'}</strong>
              {summaryPeriodFilter !== 'ALL' && <span> • <strong>{summaryPeriodFilter === 'today' ? 'Today' : summaryPeriodFilter === 'this_week' ? 'This Week' : 'This Month'}</strong></span>}
            </div>
          </div>
        )}

        {/* 2. Bite Cases Module Filters & Search Bar */}
        {activeTab === 'cases' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Period</label>
                <select value={casePeriodFilter} onChange={e => setCasePeriodFilter(e.target.value as any)}
                  style={{ ...selectStyle, minWidth: 140, borderColor: casePeriodFilter !== 'ALL' ? '#10b981' : '#d1d5db', fontWeight: casePeriodFilter !== 'ALL' ? 600 : 500 }}>
                  <option value="ALL">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Category</label>
                <select value={caseCatFilter} onChange={e => setCaseCatFilter(e.target.value)} style={selectStyle}>
                  <option value="ALL">All Categories</option>
                  <option value="Category I">Category I</option>
                  <option value="Category II">Category II</option>
                  <option value="Category III">Category III</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Animal</label>
                <select value={caseAnimalFilter} onChange={e => {
                  setCaseAnimalFilter(e.target.value);
                  if (e.target.value !== 'Others') setCaseAnimalOtherText('');
                }} style={selectStyle}>
                  <option value="ALL">All Animals</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Others">Others</option>
                </select>
                {caseAnimalFilter === 'Others' && (
                  <input
                    type="text"
                    placeholder="Specify animal (e.g. Monkey, Bat)..."
                    value={caseAnimalOtherText}
                    onChange={e => setCaseAnimalOtherText(e.target.value)}
                    style={{ ...inputStyle, minWidth: 160 }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Status</label>
                <select value={caseStatusFilter} onChange={e => setCaseStatusFilter(e.target.value)} style={selectStyle}>
                  <option value="ALL">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="ongoing">On-going</option>
                  <option value="cancelled">Cancelled / Abandoned</option>
                </select>
              </div>
              {(casePeriodFilter !== 'ALL' || caseCatFilter !== 'ALL' || caseAnimalFilter !== 'ALL' || caseStatusFilter !== 'ALL' || caseSearch !== '') && (
                <button
                  onClick={() => { setCasePeriodFilter('ALL'); setCaseCatFilter('ALL'); setCaseAnimalFilter('ALL'); setCaseAnimalOtherText(''); setCaseStatusFilter('ALL'); setCaseSearch(''); }}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Reset Filters
                </button>
              )}
            </div>

            {/* Top-Right Patient Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search patient name or case #..."
                  value={caseSearch}
                  onChange={e => setCaseSearch(e.target.value)}
                  style={{ ...inputStyle, width: 280, minWidth: 280, paddingRight: caseSearch ? 28 : 10 }}
                />
                {caseSearch && (
                  <button
                    onClick={() => setCaseSearch('')}
                    style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13, padding: 0 }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>({filteredBiteCases.length} records)</span>
            </div>
          </div>
        )}

        {/* 3. Patients Module Search Bar & Registration Filter */}
        {activeTab === 'patients' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Period</label>
                <select value={patientPeriodFilter} onChange={e => setPatientPeriodFilter(e.target.value as any)}
                  style={{ ...selectStyle, minWidth: 140, borderColor: patientPeriodFilter !== 'ALL' ? '#10b981' : '#d1d5db', fontWeight: patientPeriodFilter !== 'ALL' ? 600 : 500 }}>
                  <option value="ALL">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Reg. Month</label>
                <select value={patientMonthFilter} onChange={e => setPatientMonthFilter(e.target.value)} style={selectStyle}>
                  <option value="ALL">All Months</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, idx) => (
                    <option key={m} value={String(idx + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Reg. Year</label>
                <select value={patientYearFilter} onChange={e => setPatientYearFilter(e.target.value)} style={selectStyle}>
                  <option value="ALL">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
              {(patientPeriodFilter !== 'ALL' || patientMonthFilter !== 'ALL' || patientYearFilter !== 'ALL' || patientSearch !== '') && (
                <button
                  onClick={() => { setPatientPeriodFilter('ALL'); setPatientMonthFilter('ALL'); setPatientYearFilter('ALL'); setPatientSearch(''); }}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Reset Filters
                </button>
              )}
            </div>

            {/* Top-Right Patient Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search patient name, contact..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  style={{ ...inputStyle, width: 290, minWidth: 290, paddingRight: patientSearch ? 28 : 10 }}
                />
                {patientSearch && (
                  <button
                    onClick={() => setPatientSearch('')}
                    style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13, padding: 0 }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>({filteredPatients.length} records)</span>
            </div>
          </div>
        )}

        {/* 4. Inventory Module Filters */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Supplier / Source</label>
                <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
                  style={{ ...selectStyle, minWidth: 180, borderColor: supplierFilter !== 'ALL' ? '#10b981' : '#d1d5db', fontWeight: supplierFilter !== 'ALL' ? 600 : 500 }}>
                  <option value="ALL">All Suppliers / Sources</option>
                  {availableSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Vaccine Type</label>
                <select value={selectedVaccineType} onChange={e => setSelectedVaccineType(e.target.value)}
                  style={{ ...selectStyle, minWidth: 170, borderColor: selectedVaccineType !== 'ALL' ? '#10b981' : '#d1d5db', fontWeight: selectedVaccineType !== 'ALL' ? 600 : 500 }}>
                  <option value="ALL">All Vaccine Types</option>
                  {availableVaccineTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>Expiry Date</label>
                <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)}
                  style={{ ...selectStyle, minWidth: 185, borderColor: expiryFilter !== 'ALL' ? '#10b981' : '#d1d5db', fontWeight: expiryFilter !== 'ALL' ? 600 : 500 }}>
                  <option value="ALL">All Expiration Dates</option>
                  <option value="valid">Valid / Active (Not Expired)</option>
                  <option value="expiring_30">Expiring in ≤ 30 Days</option>
                  <option value="expiring_60">Expiring in ≤ 60 Days</option>
                  <option value="expiring_90">Expiring in ≤ 90 Days</option>
                  <option value="expired">Expired Batches</option>
                  <option value="custom">Custom Expiry Range…</option>
                </select>
              </div>
              {expiryFilter === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', padding: '2px 6px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>From</span>
                  <input type="date" value={expiryDateFrom} onChange={e => setExpiryDateFrom(e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: '4px 6px' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>To</span>
                  <input type="date" value={expiryDateTo} onChange={e => setExpiryDateTo(e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: '4px 6px' }} />
                </div>
              )}
              {isInvFiltered && (
                <button onClick={() => { setSelectedVaccineType('ALL'); setSupplierFilter('ALL'); setExpiryFilter('ALL'); setExpiryDateFrom(''); setExpiryDateTo(''); }}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Reset Filters
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Showing <strong>{filteredInvItems.length}</strong> of <strong>{invItems.length}</strong> batches
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* WEB INTERFACE CONTENT */}
      <div>

        {/* SUMMARY DASHBOARD */}
        {activeTab === 'summary' && (
          <>
            <div style={sectionTitleStyle}>
              Summary Statistics
              {summaryCatFilter !== 'ALL' && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: '#059669' }}>({summaryCatFilter})</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatBox
                label="Total Patients"
                value={fmt(summaryMetrics.totalPatients)}
                color="#6366f1"
                loading={loading}
                sub="Unique records"
                active={selectedCard === 'total_patients'}
                onClick={() => setSelectedCard(prev => prev === 'total_patients' ? null : 'total_patients')}
              />
              <StatBox
                label="Total Bite Cases"
                value={fmt(summaryMetrics.totalBiteCases)}
                color="#f59e0b"
                loading={loading}
                sub="Registered incidents"
                active={selectedCard === 'total_bite_cases'}
                onClick={() => setSelectedCard(prev => prev === 'total_bite_cases' ? null : 'total_bite_cases')}
              />
              <StatBox
                label="New Patients"
                value={fmt(summaryMetrics.newPatients)}
                color="#10b981"
                loading={loading}
                sub={`${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`}
                active={selectedCard === 'new_patients'}
                onClick={() => setSelectedCard(prev => prev === 'new_patients' ? null : 'new_patients')}
              />
              <StatBox
                label="New Cases"
                value={fmt(summaryMetrics.newCases)}
                color="#f97316"
                loading={loading}
                sub={`${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`}
                active={selectedCard === 'new_cases'}
                onClick={() => setSelectedCard(prev => prev === 'new_cases' ? null : 'new_cases')}
              />
              <StatBox
                label="Completed Cases"
                value={fmt(summaryMetrics.completedCases)}
                color="#22c55e"
                loading={loading}
                sub="Finished regimen"
                active={selectedCard === 'completed_cases'}
                onClick={() => setSelectedCard(prev => prev === 'completed_cases' ? null : 'completed_cases')}
              />
              <StatBox
                label="On-going Cases"
                value={fmt(summaryMetrics.ongoingCases)}
                color="#3b82f6"
                loading={loading}
                sub="Active treatment"
                active={selectedCard === 'ongoing_cases'}
                onClick={() => setSelectedCard(prev => prev === 'ongoing_cases' ? null : 'ongoing_cases')}
              />
            </div>

            <div style={sectionTitleStyle}>Bite Case Categories (Period Breakdown)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <CatBox
                cat="Category I"
                count={stats?.category_i}
                color="#a7d7b9"
                desc="Minor — licks on intact skin"
                loading={loading}
                active={summaryCatFilter === 'Category I'}
              />
              <CatBox
                cat="Category II"
                count={stats?.category_ii}
                color="#56a978"
                desc="Moderate — minor scratches or abrasions"
                loading={loading}
                active={summaryCatFilter === 'Category II'}
              />
              <CatBox
                cat="Category III"
                count={stats?.category_iii}
                color="#1f7043"
                desc="Severe — transdermal bites or scratches"
                loading={loading}
                active={summaryCatFilter === 'Category III'}
              />
            </div>

            {/* Category Dropdown Selection Table */}
            {!cardData && summaryCatFilter !== 'ALL' && (
              <div style={{ marginTop: 24, marginBottom: 28, background: '#fff', border: '2px solid #10b981', borderRadius: 12, padding: 18, boxShadow: '0 4px 16px rgba(16,185,129,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 700 }}>✓</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>{summaryCatFilter} Incident Records</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                      Showing bite cases for {summaryCatFilter} ({filteredSummaryCases.length} record{filteredSummaryCases.length !== 1 ? 's' : ''})
                    </p>
                  </div>
                </div>

                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>{['#','Patient Name','Case No.','Category','Animal Type','Status','Date Registered'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filteredSummaryCases.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>No bite case records found for {summaryCatFilter}.</td></tr>
                      ) : filteredSummaryCases.map((c, i) => (
                        <tr key={c.id} style={i % 2 !== 0 ? { background: '#f9fafb' } : {}}>
                          <td style={tdStyle}>{i+1}</td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{c.patient_name ?? '—'}</td>
                          <td style={tdStyle}>{c.case_number || '—'}</td>
                          <td style={tdStyle}><CategoryBadge cat={c.category} /></td>
                          <td style={tdStyle}>{c.animal_type ?? '—'}</td>
                          <td style={tdStyle}><StatusBadge status={c.status} /></td>
                          <td style={tdStyle}>{fmtDate(c.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Clicked Card Data Inspection Table */}
            {cardData && (
              <div style={{ marginTop: 24, marginBottom: 28, background: '#fff', border: '2px solid #10b981', borderRadius: 12, padding: 18, boxShadow: '0 4px 16px rgba(16,185,129,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 700 }}>✓</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>{cardData.title}</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                      Showing strictly the records inside clicked card ({cardData.records.length} record{cardData.records.length !== 1 ? 's' : ''})
                    </p>
                  </div>
                </div>

                {cardData.type === 'patients' ? (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>{['#','Full Name','Date of Birth','Contact Number','Registered On'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {cardData.records.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>No patient records found in this card.</td></tr>
                        ) : cardData.records.map((p, i) => (
                          <tr key={p.id} style={i % 2 !== 0 ? { background: '#f9fafb' } : {}}>
                            <td style={tdStyle}>{i+1}</td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
                            <td style={tdStyle}>{fmtDate(p.date_of_birth)}</td>
                            <td style={tdStyle}>{p.contact_number ?? '—'}</td>
                            <td style={tdStyle}>{fmtDate(p.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>{['#','Patient Name','Case No.','Category','Animal Type','Status','Date Registered'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {cardData.records.length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>No bite cases found in this card.</td></tr>
                        ) : cardData.records.map((c, i) => (
                          <tr key={c.id} style={i % 2 !== 0 ? { background: '#f9fafb' } : {}}>
                            <td style={tdStyle}>{i+1}</td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{c.patient_name ?? '—'}</td>
                            <td style={tdStyle}>{c.case_number || '—'}</td>
                            <td style={tdStyle}><CategoryBadge cat={c.category} /></td>
                            <td style={tdStyle}>{c.animal_type ?? '—'}</td>
                            <td style={tdStyle}><StatusBadge status={c.status} /></td>
                            <td style={tdStyle}>{fmtDate(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* BITE CASES MODULE */}
        {activeTab === 'cases' && (
          <>
            <div style={sectionTitleStyle}>
              Bite Case Incident Records — {fmtDate(dateFrom)} to {fmtDate(dateTo)}
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: '#6b7280' }}>
                ({filteredBiteCases.length} of {biteCases.length} records)
              </span>
            </div>
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {['#','Patient Name','Case No.','Category','Animal Type','Status','Date Registered'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>Loading bite cases…</td></tr>
                  ) : filteredBiteCases.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>No bite cases match the selected search or filter criteria.</td></tr>
                  ) : filteredBiteCases.map((c, i) => (
                    <tr key={c.id} style={i % 2 !== 0 ? { background:'#f9fafb' } : {}}>
                      <td style={tdStyle}>{i+1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{c.patient_name ?? '—'}</td>
                      <td style={tdStyle}>{c.case_number || '—'}</td>
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

        {/* PATIENTS MODULE */}
        {activeTab === 'patients' && (
          <>
            <div style={sectionTitleStyle}>
              Registered Patients — {fmtDate(dateFrom)} to {fmtDate(dateTo)}
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: '#6b7280' }}>
                ({filteredPatients.length} of {patients.length} records)
              </span>
            </div>
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {['#','Full Name','Date of Birth','Contact Number','Registered On'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>Loading patient registry…</td></tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>No patients match the selected search or date filters.</td></tr>
                  ) : filteredPatients.map((p, i) => (
                    <tr key={p.id} style={i % 2 !== 0 ? { background:'#f9fafb' } : {}}>
                      <td style={tdStyle}>{i+1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
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

        {/* INVENTORY UTILIZATION & WASTAGE MODULE */}
        {activeTab === 'inventory' && (
          <>
            {invStats && (
              <>
                <div style={sectionTitleStyle}>
                  Stock Summary
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Active Batches',  value: invDisplayStats.active_batches,   color: '#10b981' },
                    { label: 'Total Sealed Vials', value: invDisplayStats.total_stock,    color: '#3b82f6' },
                    { label: 'Expiring Soon',    value: invDisplayStats.expiring_soon,    color: '#f59e0b' },
                    { label: 'Depleted Batches', value: invDisplayStats.depleted_batches, color: '#ef4444' },
                    { label: 'Expired Batches',  value: invDisplayStats.expired_batches,  color: '#6b7280' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'14px 12px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:10, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginTop:5 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div style={sectionTitleStyle}>
                Comprehensive Batch Utilization &amp; Wastage Audit Table
                <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: '#6b7280' }}>
                  ({filteredInvItems.length} of {invItems.length} items)
                </span>
              </div>
            </div>
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {['#','Vaccine Type','Batch Number','Supplier / Source','Received','Used','Sealed Vials','Open Vial Status','Wastage','Expiration','Status'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invLoading ? (
                    <tr><td colSpan={11} style={{ textAlign:'center', padding:24, color:'#6b7280' }}>Loading inventory audit data…</td></tr>
                  ) : filteredInvItems.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign:'center', padding:32, color:'#6b7280' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>No inventory records match the selected filters.</div>
                      {isInvFiltered && (
                        <button onClick={() => { setSelectedVaccineType('ALL'); setSupplierFilter('ALL'); setExpiryFilter('ALL'); setExpiryDateFrom(''); setExpiryDateTo(''); }}
                          style={{ marginTop: 8, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Show All Inventory Batches
                        </button>
                      )}
                    </td></tr>
                  ) : filteredInvItems.map((item, i) => {
                    const recQty = item.initial_quantity ?? (item.current_quantity + (item.total_dispensed ?? 0));
                    const usedQty = item.total_dispensed ?? 0;
                    const supplier = item.received_from || 'DOH Central Supply';
                    const openStatus = item.open_vial_status ? `${item.open_vial_doses_remaining ?? 0} doses remaining` : 'Sealed';
                    const wasteQty = item.status === 'expired' ? item.current_quantity : (item.discarded_vials ?? 0);

                    return (
                      <tr key={item.inventory_id} style={i % 2 !== 0 ? { background:'#f9fafb' } : {}}>
                        <td style={tdStyle}>{i+1}</td>
                        <td style={{ ...tdStyle, fontWeight:600 }}>{item.vaccine_type}</td>
                        <td style={tdStyle}>{item.batch_number}</td>
                        <td style={tdStyle}>{supplier}</td>
                        <td style={tdStyle}>{recQty}</td>
                        <td style={tdStyle}>{usedQty}</td>
                        <td style={{ ...tdStyle, fontWeight:700, color: item.current_quantity === 0 ? '#ef4444' : 'var(--text-h)' }}>{item.current_quantity}</td>
                        <td style={tdStyle}>{openStatus}</td>
                        <td style={{ ...tdStyle, color: wasteQty > 0 ? '#dc2626' : '#6b7280', fontWeight: wasteQty > 0 ? 600 : 400 }}>{wasteQty}</td>
                        <td style={tdStyle}>{fmtDate(item.expiration_date)}</td>
                        <td style={tdStyle}><InvStatusBadge status={item.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>

      {/* Corporate Print Preview Modal */}
      {showPrintModal && (
        <PrintPreviewModal
          html={printHtml}
          clinicName={clinicName}
          printedBy={printedBy}
          printDate={printDate}
          dateFrom={dateFrom}
          dateTo={dateTo}
          activeTab={activeTab}
          activeFiltersText={getActiveFiltersSummaryText()}
          onConfirm={handleConfirmPrint}
          onCancel={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
