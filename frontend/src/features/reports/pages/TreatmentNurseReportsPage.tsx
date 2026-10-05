import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  DownloadOutlined,
  PrintOutlined,
  Refresh,
  Close,
} from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';
import { useAuth } from '../../../contexts/AuthContext';
import { getGlobalPrintLogos } from '../../../components/print/printHeaderHelper';
import { printWhenReady } from '../../../components/print/printReady';
import { useAddressLocation } from '../../patients/hooks/useAddressLocation';
import type { VaccineTypePreset } from '../../inventory/types';
import { getCategoryBadgeStyle } from '../../inventory/utils/inventoryStatus';

// ─── Interfaces & Types ──────────────────────────────────────────
export interface ReportStats {
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

export interface BiteCase {
  id: number;
  case_number?: string;
  patient_name: string;
  patient_id?: number;
  category: string;
  animal_type: string;
  status: string;
  created_at: string;
  place_of_exposure?: string;
  municipality?: string;
  barangay?: string;
  purok?: string;
}

export function parseLocation(rawPlace: string): { place: string; purok: string; barangay: string; municipality: string } {
  if (!rawPlace) return { place: '', purok: '', barangay: '', municipality: '' };
  let parts = rawPlace.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/misamis|oriental|province/i.test(last)) {
      parts = parts.slice(0, -1);
    }
  }
  if (parts.length === 0) return { place: rawPlace, purok: '', barangay: '', municipality: '' };
  if (parts.length === 1) return { place: rawPlace, purok: '', barangay: '', municipality: parts[0] };
  if (parts.length === 2) return { place: rawPlace, purok: '', barangay: parts[0], municipality: parts[1] };
  if (parts.length === 3) return { place: rawPlace, purok: parts[0], barangay: parts[1], municipality: parts[2] };
  return {
    place: rawPlace,
    purok: parts[parts.length - 3],
    barangay: parts[parts.length - 2],
    municipality: parts[parts.length - 1],
  };
}

export interface Patient {
  id: number;
  patient_number?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  contact_number: string;
  created_at: string;
}

export interface InventoryItem {
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
  vaccine_category?: string | null;
}

function VaccineCategoryBadge({ category, isDark = false }: { category?: string | null; isDark?: boolean }) {
  const cat = category && category.trim() ? category.trim() : 'Not specified';
  const style = getCategoryBadgeStyle(cat === 'Not specified' ? null : cat, isDark);
  return (
    <Chip
      label={cat}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.72rem',
        height: 22,
        bgcolor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        fontFamily: "'Poppins', sans-serif",
      }}
    />
  );
}

export interface InventoryStats {
  total_batches: number;
  active_batches: number;
  depleted_batches: number;
  expired_batches: number;
  total_stock: number;
  expiring_soon: number;
  low_stock: number;
}

type SectionTab = 'summary' | 'cases' | 'patients' | 'inventory';

// ─── Formatting Helpers ────────────────────────────────────────
const fmt = (n?: number) => (n != null ? n.toLocaleString() : '—');

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const dateString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const todayYmd = dateString(now);

  if (period === 'today') {
    return { from: todayYmd, to: todayYmd };
  }
  if (period === 'this_week') {
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff);
    return { from: dateString(startOfWeek), to: todayYmd };
  }
  if (period === 'this_month') {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return { from: `${year}-${month}-01`, to: todayYmd };
  }
  return { from: '', to: '' };
};

const periodDates = (period: string): { from: string; to: string } => {
  const now = new Date();
  const to = dateString(now);
  if (period === 'today') return { from: to, to };
  if (period === 'this_week' || period === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return { from: dateString(start), to };
  }
  if (period === 'last30') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 29);
    return { from: dateString(start), to };
  }
  if (period === 'year') return { from: `${now.getFullYear()}-01-01`, to };
  return { from: dateString(new Date(now.getFullYear(), now.getMonth(), 1)), to };
};

// ─── Style Constants ──────────────────────────────────────────
const POPPINS = "'Poppins', sans-serif";

const panelSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: 'none',
  bgcolor: 'background.paper',
  fontFamily: POPPINS,
};

const SELECT_MENU_PROPS = {
  slotProps: {
    paper: {
      sx: {
        maxHeight: 260,
      },
    },
  },
};

// ─── Badges ───────────────────────────────────────────────────
function CategoryBadge({ cat }: { cat: string }) {
  const s = String(cat || '');
  const color = s.includes('III') ? '#dc2626' : s.includes('II') ? '#d97706' : '#16a34a';
  const bg = s.includes('III') ? '#fee2e2' : s.includes('II') ? '#fef3c7' : '#dcfce7';
  return (
    <Box
      component="span"
      sx={{
        background: bg,
        color,
        px: 1,
        py: 0.25,
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: POPPINS,
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {cat || '—'}
    </Box>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: '#d1fae5', color: '#065f46' },
    ongoing: { bg: '#dbeafe', color: '#1e40af' },
    active: { bg: '#dbeafe', color: '#1e40af' },
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
    abandoned: { bg: '#fee2e2', color: '#991b1b' },
  };
  const cfg = map[s] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <Box
      component="span"
      sx={{
        background: cfg.bg,
        color: cfg.color,
        px: 1,
        py: 0.25,
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: POPPINS,
        textTransform: 'capitalize',
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {status || '—'}
    </Box>
  );
}

function InvStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: '#d1fae5', color: '#065f46' },
    expired: { bg: '#fee2e2', color: '#991b1b' },
    deleted: { bg: '#f3f4f6', color: '#374151' },
  };
  const cfg = map[status] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <Box
      component="span"
      sx={{
        background: cfg.bg,
        color: cfg.color,
        px: 1.1,
        py: 0.3,
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: POPPINS,
        display: 'inline-block',
      }}
    >
      {status}
    </Box>
  );
}

// ─── Metric Box Component ─────────────────────────────────────
function MetricCard({
  label,
  value,
  detail,
  active,
  onClick,
  color = '#10b981',
}: {
  label: string;
  value: string | number;
  detail?: string;
  active?: boolean;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <Paper
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      elevation={0}
      sx={{
        ...panelSx,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        p: 2,
        minHeight: 125,
        textAlign: 'left',
        font: 'inherit',
        appearance: 'none',
        color: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: active ? 'rgba(16, 185, 129, 0.04)' : 'background.paper',
        border: active ? `2px solid ${color}` : '1px solid',
        borderColor: active ? color : 'divider',
        borderRadius: 2.5,
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onClick
          ? {
              borderColor: color,
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 18px ${color}22`,
            }
          : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, width: '100%', mb: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            fontFamily: POPPINS,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.3,
            flex: 1,
            pr: 0.5,
          }}
        >
          {label}
        </Typography>
        {active && (
          <Box
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: color,
              bgcolor: `${color}18`,
              border: `1px solid ${color}55`,
              px: 0.75,
              py: 0.15,
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              lineHeight: 1.2,
            }}
          >
            ✓ ACTIVE
          </Box>
        )}
      </Box>

      <Typography
        sx={{
          fontSize: { xs: 26, sm: 30 },
          lineHeight: 1.1,
          fontWeight: 800,
          color: 'text.primary',
          my: 0.5,
          fontFamily: POPPINS,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </Typography>

      <Box sx={{ mt: 'auto', pt: 0.5 }}>
        {detail && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: POPPINS,
              fontSize: '0.75rem',
              display: 'block',
              lineHeight: 1.3,
            }}
          >
            {detail}
          </Typography>
        )}
        {onClick && (
          <Typography
            variant="caption"
            sx={{
              color: active ? color : 'primary.main',
              fontSize: '0.75rem',
              fontWeight: 600,
              mt: 0.5,
              display: 'inline-block',
              fontFamily: POPPINS,
            }}
          >
            {active ? 'Click to deselect' : 'Click to inspect'}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// ─── Category Breakdown Box Component ─────────────────────────
function CategoryCard({
  cat,
  count = 0,
  desc,
  active,
  onClick,
}: {
  cat: string;
  count?: number;
  desc: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const catColor = cat.includes('III') ? '#ef4444' : cat.includes('II') ? '#f59e0b' : '#10b981';

  return (
    <Paper
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      elevation={0}
      sx={{
        ...panelSx,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        p: 2.25,
        textAlign: 'left',
        font: 'inherit',
        appearance: 'none',
        color: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: active ? `${catColor}08` : 'background.paper',
        border: active ? `2px solid ${catColor}` : '1px solid',
        borderColor: active ? catColor : 'divider',
        borderRadius: 2.5,
        position: 'relative',
        transition: 'all 0.2s ease',
        '&:hover': onClick
          ? {
              borderColor: catColor,
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 18px ${catColor}22`,
            }
          : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: catColor,
              boxShadow: `0 0 6px ${catColor}`,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary', fontFamily: POPPINS }}>
            {cat}
          </Typography>
        </Box>
        {active && (
          <Box
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: catColor,
              bgcolor: `${catColor}18`,
              border: `1px solid ${catColor}55`,
              px: 0.85,
              py: 0.15,
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              lineHeight: 1.2,
            }}
          >
            ✓ SELECTED
          </Box>
        )}
      </Box>

      <Typography sx={{ fontSize: 32, fontWeight: 800, color: 'text.primary', lineHeight: 1.1, my: 0.75, fontFamily: POPPINS }}>
        {fmt(count)}
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', fontFamily: POPPINS, mt: 0.5 }}>
        {desc}
      </Typography>
    </Paper>
  );
}

// ─── Form-Style Boxed Table Report HTML Builder (Print) ────────
const buildReportBodyHtml = (
  tab: SectionTab,
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
  dTo: string,
  presets: VaccineTypePreset[] = []
): string => {
  if (tab === 'summary') {
    if (card) {
      if (card.type === 'patients') {
        const rows = card.records
          .map(
            (p, i) =>
              `<tr><td style="text-align:center;border:1px solid #000;">${i + 1}</td><td style="font-weight:600;border:1px solid #000;">${p.last_name}, ${p.first_name}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.date_of_birth)}</td><td style="text-align:center;border:1px solid #000;">${p.contact_number ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.created_at)}</td></tr>`
          )
          .join('');
        return `
          <h3 class="sec">I. Chosen Card Audit Table — ${card.title}</h3>
          <p class="note">Active Card Filter: ${card.title} | Total Records: ${card.records.length}</p>
          <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
            <thead><tr style="background:#fff;"><th style="text-align:center;width:5%;border:1px solid #000;">#</th><th style="border:1px solid #000;">Patient Name (Last, First)</th><th style="text-align:center;border:1px solid #000;">Date of Birth</th><th style="text-align:center;border:1px solid #000;">Contact No.</th><th style="text-align:center;border:1px solid #000;">Registered On</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#000;border:1px solid #000;">No patient records found in this card filter.</td></tr>'}</tbody>
            <tfoot><tr style="font-weight:700;background:#fff"><td colspan="4" style="border:1px solid #000;">Total Patient Records</td><td style="text-align:center;border:1px solid #000;">${card.records.length}</td></tr></tfoot>
          </table>`;
      } else {
        const rows = card.records
          .map(
            (c, i) =>
              `<tr><td style="text-align:center;border:1px solid #000;">${i + 1}</td><td style="font-weight:600;border:1px solid #000;">${c.patient_name ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${c.case_number || '—'}</td><td style="text-align:center;border:1px solid #000;">${c.category || '—'}</td><td style="border:1px solid #000;">${c.animal_type ?? '—'}</td><td style="text-align:center;text-transform:capitalize;border:1px solid #000;">${c.status || '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(c.created_at)}</td></tr>`
          )
          .join('');
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
      const rows = sumCases
        .map(
          (c, i) =>
            `<tr><td style="text-align:center;border:1px solid #000;">${i + 1}</td><td style="font-weight:600;border:1px solid #000;">${c.patient_name ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${c.case_number || '—'}</td><td style="text-align:center;border:1px solid #000;">${c.category || '—'}</td><td style="border:1px solid #000;">${c.animal_type ?? '—'}</td><td style="text-align:center;text-transform:capitalize;border:1px solid #000;">${c.status || '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(c.created_at)}</td></tr>`
        )
        .join('');
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
    const rows = filtCases
      .map(
        (c, i) =>
          `<tr><td style="text-align:center;border:1px solid #000;">${i + 1}</td><td style="font-weight:600;border:1px solid #000;">${c.patient_name ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${c.case_number || '—'}</td><td style="text-align:center;border:1px solid #000;">${c.category || '—'}</td><td style="border:1px solid #000;">${c.animal_type ?? '—'}</td><td style="border:1px solid #000;">${c.place_of_exposure || '—'}</td><td style="text-align:center;text-transform:capitalize;border:1px solid #000;">${c.status || '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(c.created_at)}</td></tr>`
      )
      .join('');
    return `
      <h3 class="sec">I. Bite Case Incident Table</h3>
      <p class="note">Reporting Period: ${fmtDate(dFrom)} to ${fmtDate(dTo)} | Active Filters: ${activeFiltersText} | Filtered Total: ${filtCases.length} of ${allCases.length}</p>
      <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
        <thead><tr style="background:#fff;"><th style="text-align:center;width:5%;border:1px solid #000;">#</th><th style="border:1px solid #000;">Patient Name</th><th style="text-align:center;border:1px solid #000;">Case No.</th><th style="text-align:center;border:1px solid #000;">Category</th><th style="border:1px solid #000;">Animal Type</th><th style="border:1px solid #000;">Place of Exposure</th><th style="text-align:center;border:1px solid #000;">Status</th><th style="text-align:center;border:1px solid #000;">Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#000;border:1px solid #000;">No bite cases match the active filter criteria.</td></tr>'}</tbody>
        <tfoot>
          <tr style="font-weight:700;background:#fff"><td colspan="7" style="border:1px solid #000;">Total Filtered Bite Cases</td><td style="text-align:center;border:1px solid #000;">${filtCases.length}</td></tr>
        </tfoot>
      </table>`;
  } else if (tab === 'patients') {
    const rows = filtPats
      .map(
        (p, i) =>
          `<tr><td style="text-align:center;border:1px solid #000;">${i + 1}</td><td style="font-weight:600;border:1px solid #000;">${p.last_name}, ${p.first_name}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.date_of_birth)}</td><td style="text-align:center;border:1px solid #000;">${p.contact_number ?? '—'}</td><td style="text-align:center;border:1px solid #000;">${fmtDate(p.created_at)}</td></tr>`
      )
      .join('');
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
    const totalReceived = filtInv.reduce(
      (s, i) => s + (Number(i.initial_quantity) || Number(i.current_quantity) + (Number(i.total_dispensed) || 0)),
      0
    );

    const statsRows = `<table class="info-table" style="border:1px solid #000;border-collapse:collapse;width:100%;">
      <tr><td class="lbl" style="border:1px solid #000;">Active Batches</td><td class="val" style="border:1px solid #000;">${invDispStats.active_batches}</td><td class="lbl" style="border:1px solid #000;">Total Sealed Vials in Stock</td><td class="val" style="border:1px solid #000;">${invDispStats.total_stock}</td></tr>
      <tr><td class="lbl" style="border:1px solid #000;">Expiring Soon (≤ 60d)</td><td class="val" style="border:1px solid #000;">${invDispStats.expiring_soon}</td><td class="lbl" style="border:1px solid #000;">Depleted Batches</td><td class="val" style="border:1px solid #000;">${invDispStats.depleted_batches}</td></tr>
      <tr><td class="lbl" style="border:1px solid #000;">Expired Batches</td><td class="val" style="border:1px solid #000;">${invDispStats.expired_batches}</td><td class="lbl" style="border:1px solid #000;">Total Batches Listed</td><td class="val" style="border:1px solid #000;">${filtInv.length}</td></tr>
    </table>`;

    const getCategory = (vType?: string, directCat?: string | null): string => {
      if (directCat && directCat.trim()) return directCat.trim();
      if (!vType) return 'Not specified';
      const found = presets.find(
        p => (p.vaccine_name || '').trim().toLowerCase() === vType.trim().toLowerCase()
      );
      if (found?.category && found.category.trim()) return found.category.trim();
      const invMatch = allInv.find(
        i => (i.vaccine_type || '').trim().toLowerCase() === vType.trim().toLowerCase() && i.vaccine_category
      );
      if (invMatch?.vaccine_category && invMatch.vaccine_category.trim()) return invMatch.vaccine_category.trim();
      return 'Not specified';
    };

    const rows = filtInv
      .map((item, i) => {
        const exp = item.expiration_date
          ? new Date(item.expiration_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—';
        const qtyS = item.current_quantity === 0 ? 'font-weight:700' : '';
        const supplier = item.received_from || 'DOH Central Supply';
        const recQty = item.initial_quantity ?? item.current_quantity + (item.total_dispensed ?? 0);
        const usedQty = item.total_dispensed ?? 0;
        const openStatus = item.open_vial_status ? `${item.open_vial_doses_remaining ?? 0} doses left` : 'Sealed';
        const wasteQty = item.status === 'expired' ? item.current_quantity : item.discarded_vials ?? 0;
        const itemCategory = getCategory(item.vaccine_type, item.vaccine_category);

        return `<tr>
        <td style="text-align:center;border:1px solid #000;">${i + 1}</td>
        <td style="border:1px solid #000;">${itemCategory}</td>
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
      })
      .join('');

    return `
      <h3 class="sec">I. Vaccine Stock &amp; Utilization Summary</h3>${statsRows}
      <h3 class="sec">II. Batch Inventory &amp; Wastage Audit Log</h3>
      <p class="note">Active Filters: ${activeFiltersText} | Showing ${filtInv.length} of ${allInv.length} items</p>
      <table style="border:1px solid #000;border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#fff;">
            <th style="text-align:center;width:4%;border:1px solid #000;">#</th>
            <th style="border:1px solid #000;">Vaccine Category</th>
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
        <tbody>${rows || '<tr><td colspan="12" style="text-align:center;color:#000;border:1px solid #000;">No inventory records matching selected filters.</td></tr>'}</tbody>
        <tfoot>
          <tr style="font-weight:700;background:#fff">
            <td colspan="5" style="border:1px solid #000;">Total Inventory Quantities</td>
            <td style="text-align:center;border:1px solid #000;">${totalReceived}</td>
            <td style="text-align:center;border:1px solid #000;">${totalDispensed}</td>
            <td style="text-align:center;border:1px solid #000;">${totalSealed}</td>
            <td colspan="4" style="border:1px solid #000;"></td>
          </tr>
        </tfoot>
      </table>`;
  }
};

// ─── Main Treatment Nurse Reports Page ─────────────────────────
export default function TreatmentNurseReportsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, clinic: authClinic } = useAuth();
  const storedClinic = localStorage.getItem('clinicData') ? JSON.parse(localStorage.getItem('clinicData')!) : null;
  const clinic = authClinic || storedClinic;

  const today = new Date();
  const todayStr = dateString(today);
  const firstOfMonth = dateString(new Date(today.getFullYear(), today.getMonth(), 1));

  // Section Tab
  const [activeTab, setActiveTab] = useState<SectionTab>('summary');

  // Date Range state
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [preset, setPreset] = useState('this_month');

  // Core Data State
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [biteCases, setBiteCases] = useState<BiteCase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inventory Data State
  const [invItems, setInvItems] = useState<InventoryItem[]>([]);
  const [invStats, setInvStats] = useState<InventoryStats | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [presets, setPresets] = useState<VaccineTypePreset[]>([]);
  const [presetTypes, setPresetTypes] = useState<string[]>([]);

  // Category resolver helper
  const getCategoryForVaccine = (vaccineType?: string, directCategory?: string | null): string => {
    if (directCategory && directCategory.trim()) return directCategory.trim();
    if (!vaccineType) return 'Not specified';
    const found = presets.find(
      p => (p.vaccine_name || '').trim().toLowerCase() === vaccineType.trim().toLowerCase()
    );
    if (found?.category && found.category.trim()) {
      return found.category.trim();
    }
    const invMatch = invItems.find(
      i => (i.vaccine_type || '').trim().toLowerCase() === vaccineType.trim().toLowerCase() && i.vaccine_category
    );
    if (invMatch?.vaccine_category && invMatch.vaccine_category.trim()) {
      return invMatch.vaccine_category.trim();
    }
    return 'Not specified';
  };

  // Inventory Filters
  const [selectedVaccineType, setSelectedVaccineType] = useState<string>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [expiryDateFrom, setExpiryDateFrom] = useState<string>('');
  const [expiryDateTo, setExpiryDateTo] = useState<string>('');

  // Location hooks — same PSGC source as Form 3
  const summaryLoc = useAddressLocation(); // drives Summary tab location dropdowns
  const caseLoc = useAddressLocation();    // drives Bite Cases tab location dropdowns

  // Summary Filters
  const [summaryPeriodFilter, setSummaryPeriodFilter] = useState<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL');
  const [summaryCatFilter, setSummaryCatFilter] = useState<string>('ALL');
  const [summaryPurokFilter, setSummaryPurokFilter] = useState<string>('ALL');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Bite Cases Filters & Search
  const [caseSearch, setCaseSearch] = useState<string>('');
  const [casePeriodFilter, setCasePeriodFilter] = useState<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL');
  const [caseCatFilter, setCaseCatFilter] = useState<string>('ALL');
  const [caseAnimalFilter, setCaseAnimalFilter] = useState<string>('ALL');
  const [caseAnimalOtherText, setCaseAnimalOtherText] = useState<string>('');
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('ALL');
  const [casePurokFilter, setCasePurokFilter] = useState<string>('ALL');
  const [casePage, setCasePage] = useState<number>(1);

  // Patients Filters & Search
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patientPeriodFilter, setPatientPeriodFilter] = useState<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL');
  const [patientMonthFilter, setPatientMonthFilter] = useState<string>('ALL');
  const [patientYearFilter, setPatientYearFilter] = useState<string>('ALL');
  const [patientPage, setPatientPage] = useState<number>(1);

  // Print Preview Dialog State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printHtml, setPrintHtml] = useState('');
  const [exporting, setExporting] = useState(false);

  // Clinic details & Letterhead Info
  const clinicName = clinic?.name ?? 'Animal Bite Treatment Center';
  const printedBy = user?.name ?? 'Treatment Nurse';
  const printDate = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
  const { leftLogoUrl: leftLogo, rightLogoUrl: rightLogo } = getGlobalPrintLogos(clinic);
  const province = (clinic?.province || 'MISAMIS ORIENTAL').toUpperCase();
  const municipality = clinic?.municipality || 'Tagoloan';
  const officeName = (clinic?.name || 'MUNICIPAL HEALTH OFFICE').toUpperCase();
  const phone = clinic?.contact_number || (clinic as any)?.phone || '(088)890-4770';

  // ─── Fetch Reports Data ──────────────────────────────────────
  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [casesRes, patsRes] = await Promise.all([
        api.get('/cases', { params: { per_page: 500 } }),
        api.get('/patients', { params: { per_page: 500 } }),
      ]);
      const casesRaw = casesRes.data?.data ?? casesRes.data ?? [];
      const patsRaw = patsRes.data?.data ?? patsRes.data ?? [];

      const casesData: BiteCase[] = (Array.isArray(casesRaw) ? casesRaw : []).map((c: any) => {
        const rawPlace = c.bite_place || c.place_of_exposure || c.location || '';
        const loc = parseLocation(rawPlace);
        return {
          id: c.id ?? c.bite_id,
          case_number: c.case_number ?? `BC-${c.id ?? c.bite_id}`,
          patient_id: c.patient_id ?? c.patient?.id,
          patient_name: c.patient
            ? `${c.patient.first_name ?? ''} ${c.patient.last_name ?? ''}`.trim()
            : c.patient_name ?? '—',
          category: c.severity
            ? c.severity === 'minor'
              ? 'Category I'
              : c.severity === 'moderate'
              ? 'Category II'
              : 'Category III'
            : c.category ?? '—',
          animal_type: c.animal_type ?? '—',
          status: c.status ?? '—',
          created_at: c.created_at ?? c.bite_date ?? '',
          place_of_exposure: rawPlace || loc.place || '—',
          municipality: loc.municipality || c.patient?.details?.address_municipality || '',
          barangay: loc.barangay || c.patient?.details?.address_barangay || '',
          purok: loc.purok || c.patient?.details?.address_purok || '',
        };
      });

      const patsData: Patient[] = Array.isArray(patsRaw) ? patsRaw : [];
      setBiteCases(casesData);
      setPatients(patsData);

      const catI = casesData.filter(c => c.category === 'Category I').length;
      const catII = casesData.filter(c => c.category === 'Category II').length;
      const catIII = casesData.filter(c => c.category === 'Category III').length;
      const completed = casesData.filter(c => c.status === 'completed').length;
      const ongoing = casesData.filter(c => c.status === 'ongoing' || c.status === 'active').length;

      const [gPats, gCases] = await Promise.allSettled([
        api.get('/patients', { params: { per_page: 1 } }),
        api.get('/cases', { params: { per_page: 1 } }),
      ]);
      const totalPats = gPats.status === 'fulfilled' ? gPats.value.data?.total ?? patsData.length : patsData.length;
      const totalCases = gCases.status === 'fulfilled' ? gCases.value.data?.total ?? casesData.length : casesData.length;

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
        new_cases_period: casesData.length,
      });
    } catch (err) {
      console.error('Report load error:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
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
        const presetsData =
          presetsRes.value.data?.presets ??
          presetsRes.value.data?.data ??
          (Array.isArray(presetsRes.value.data) ? presetsRes.value.data : []);
        if (Array.isArray(presetsData)) {
          setPresets(presetsData);
          setPresetTypes(presetsData.map((p: any) => p.name || p.vaccine_name || p.vaccine_type).filter(Boolean));
        }
      }
    } catch {
      /* silently fail */
    } finally {
      setInvLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    loadInventory();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory' && invItems.length === 0 && !invLoading) {
      loadInventory();
    }
  }, [activeTab]);

  // Handle Preset Changes
  const handlePresetChange = (nextPreset: string) => {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') {
      const { from, to } = periodDates(nextPreset);
      setDateFrom(from);
      setDateTo(to);
    }
  };


  // ─── Filter Helpers ───────────────────────────────────────────
  // Puroks derived from saved bite case records for the selected barangay
  const getAvailablePuroks = (munName: string, brgyName: string) => {
    const map = new Map<string, string>();
    biteCases.forEach(c => {
      const muniMatch = !munName || (c.municipality || '').toLowerCase() === munName.toLowerCase();
      const brgyMatch = !brgyName || (c.barangay || '').toLowerCase() === brgyName.toLowerCase();
      if (muniMatch && brgyMatch && c.purok?.trim()) {
        const key = c.purok.trim().toLowerCase();
        if (!map.has(key)) map.set(key, c.purok.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  };


  const availableSuppliers = useMemo(() => {
    return Array.from(
      new Set([
        'DOH Central Supply',
        'PHO - Provincial Health Office',
        'CHO / MHO - City/Municipal Health Office',
        'LGU Local Procurement',
        'Hospital Pharmacy / Direct Purchase',
        'Donation / NGO',
        ...(invItems.map(i => i.received_from?.trim()).filter(Boolean) as string[]),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [invItems]);

  const availableVaccineTypes = useMemo(() => {
    return Array.from(
      new Set([
        ...invItems.map(i => i.vaccine_type?.trim()).filter(Boolean),
        ...presetTypes.map(p => p?.trim()).filter(Boolean),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [invItems, presetTypes]);

  // Summary Filtered Data
  const filteredSummaryCases = useMemo(() => {
    return biteCases.filter(c => {
      if (summaryPeriodFilter !== 'ALL') {
        const bounds = getPeriodBounds(summaryPeriodFilter);
        const ymd = toYMD(c.created_at);
        if (!ymd || ymd < bounds.from || ymd > bounds.to) return false;
      }
      if (summaryCatFilter !== 'ALL' && c.category !== summaryCatFilter) return false;
      if (summaryLoc.munName) {
        if ((c.municipality || '').toLowerCase() !== summaryLoc.munName.toLowerCase()) return false;
      }
      if (summaryLoc.brgyName) {
        if ((c.barangay || '').toLowerCase() !== summaryLoc.brgyName.toLowerCase()) return false;
      }
      if (summaryPurokFilter !== 'ALL') {
        if ((c.purok || '').toLowerCase() !== summaryPurokFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [biteCases, summaryPeriodFilter, summaryCatFilter, summaryLoc.munName, summaryLoc.brgyName, summaryPurokFilter]);

  const filteredPeriodPatients = useMemo(() => {
    return patients.filter(p => {
      if (summaryPeriodFilter !== 'ALL') {
        const bounds = getPeriodBounds(summaryPeriodFilter);
        const ymd = toYMD(p.created_at);
        if (!ymd || ymd < bounds.from || ymd > bounds.to) return false;
      }
      return true;
    });
  }, [patients, summaryPeriodFilter]);

  // Dynamic 6 Metric Counters for Summary Dashboard
  const summaryMetrics = {
    totalPatients: stats?.total_patients ?? patients.length,
    totalBiteCases: stats?.total_bite_cases ?? biteCases.length,
    newPatients: summaryPeriodFilter !== 'ALL' ? filteredPeriodPatients.length : patients.length,
    newCases: filteredSummaryCases.length,
    completedCases: filteredSummaryCases.filter(c => c.status === 'completed').length,
    ongoingCases: filteredSummaryCases.filter(c => c.status === 'ongoing' || c.status === 'active').length,
  };

  // Card Drilldown Data Resolution
  const cardData = useMemo(() => {
    if (!selectedCard) return null;
    const pLabel =
      summaryPeriodFilter === 'today'
        ? 'Today'
        : summaryPeriodFilter === 'this_week'
        ? 'This Week'
        : summaryPeriodFilter === 'this_month'
        ? 'This Month'
        : 'All Time';
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
      return {
        type: 'cases' as const,
        title: 'Completed Vaccination Treatment Cases',
        records: filteredSummaryCases.filter(c => c.status === 'completed'),
      };
    }
    if (selectedCard === 'ongoing_cases') {
      return {
        type: 'cases' as const,
        title: 'On-going Treatment Cases',
        records: filteredSummaryCases.filter(c => c.status === 'ongoing' || c.status === 'active'),
      };
    }
    return null;
  }, [selectedCard, summaryPeriodFilter, patients, filteredPeriodPatients, biteCases, filteredSummaryCases]);

  // Filtered Bite Cases
  const filteredBiteCases = useMemo(() => {
    return biteCases.filter(c => {
      if (casePeriodFilter !== 'ALL') {
        const bounds = getPeriodBounds(casePeriodFilter);
        const ymd = toYMD(c.created_at);
        if (!ymd || ymd < bounds.from || ymd > bounds.to) return false;
      }
      if (caseSearch.trim()) {
        const q = caseSearch.toLowerCase().trim();
        const matchName = (c.patient_name || '').toLowerCase().includes(q);
        const matchNum = (c.case_number || '').toLowerCase().includes(q);
        const matchId = String(c.id).includes(q);
        const matchPlace = (c.place_of_exposure || '').toLowerCase().includes(q);
        const matchBrgy = (c.barangay || '').toLowerCase().includes(q);
        const matchPurok = (c.purok || '').toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchId && !matchPlace && !matchBrgy && !matchPurok) return false;
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
        if (caseStatusFilter === 'ongoing' && st !== 'ongoing' && st !== 'active') return false;
        if (caseStatusFilter === 'cancelled' && st !== 'cancelled' && st !== 'abandoned') return false;
      }
      if (caseLoc.munName) {
        if ((c.municipality || '').toLowerCase() !== caseLoc.munName.toLowerCase()) return false;
      }
      if (caseLoc.brgyName) {
        if ((c.barangay || '').toLowerCase() !== caseLoc.brgyName.toLowerCase()) return false;
      }
      if (casePurokFilter !== 'ALL') {
        if ((c.purok || '').toLowerCase() !== casePurokFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [
    biteCases,
    casePeriodFilter,
    caseSearch,
    caseCatFilter,
    caseAnimalFilter,
    caseAnimalOtherText,
    caseStatusFilter,
    caseLoc.munName,
    caseLoc.brgyName,
    casePurokFilter,
  ]);

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
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
  }, [patients, patientPeriodFilter, patientSearch, patientMonthFilter, patientYearFilter]);

  // Filtered Inventory Items
  const filteredInvItems = useMemo(() => {
    return invItems.filter(item => {
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
      if (expiryFilter === 'valid') {
        if (item.status === 'expired' || diffDays < 0) return false;
      } else if (expiryFilter === 'expiring_30') {
        if (item.status === 'expired' || diffDays < 0 || diffDays > 30) return false;
      } else if (expiryFilter === 'expiring_60') {
        if (item.status === 'expired' || diffDays < 0 || diffDays > 60) return false;
      } else if (expiryFilter === 'expiring_90') {
        if (item.status === 'expired' || diffDays < 0 || diffDays > 90) return false;
      } else if (expiryFilter === 'expired') {
        if (item.status !== 'expired' && diffDays >= 0) return false;
      } else if (expiryFilter === 'custom') {
        if (expiryDateFrom && expTime < new Date(expiryDateFrom).getTime()) return false;
        if (expiryDateTo && expTime > new Date(expiryDateTo).getTime()) return false;
      }
      return true;
    });
  }, [invItems, selectedVaccineType, supplierFilter, expiryFilter, expiryDateFrom, expiryDateTo]);

  const isInvFiltered =
    selectedVaccineType !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    expiryFilter !== 'ALL' ||
    Boolean(expiryDateFrom) ||
    Boolean(expiryDateTo);

  const invDisplayStats = useMemo(() => {
    return {
      active_batches: filteredInvItems.filter(i => i.status === 'active' && i.current_quantity > 0).length,
      total_stock: filteredInvItems.reduce((s, i) => s + (Number(i.current_quantity) || 0), 0),
      expiring_soon: filteredInvItems.filter(i => {
        if (!i.expiration_date || i.status === 'expired' || i.current_quantity === 0) return false;
        const d = Math.ceil((new Date(i.expiration_date).getTime() - Date.now()) / 86400000);
        return d >= 0 && d <= 60;
      }).length,
      depleted_batches: filteredInvItems.filter(i => i.current_quantity === 0).length,
      expired_batches: filteredInvItems.filter(
        i => i.status === 'expired' || (!i.expiration_date ? false : new Date(i.expiration_date).getTime() < Date.now())
      ).length,
    };
  }, [filteredInvItems]);

  const getActiveFiltersSummaryText = (): string => {
    const list: string[] = [];
    if (activeTab === 'summary') {
      if (summaryPeriodFilter !== 'ALL') {
        const pLabel = summaryPeriodFilter === 'today' ? 'Today' : summaryPeriodFilter === 'this_week' ? 'This Week' : 'This Month';
        list.push(`Period: ${pLabel}`);
      }
      if (selectedCard && cardData) list.push(`Card Selected: ${cardData.title}`);
      else if (summaryCatFilter !== 'ALL') list.push(`Category: ${summaryCatFilter}`);
      if (summaryLoc.munName) list.push(`Municipality: ${summaryLoc.munName}`);
      if (summaryLoc.brgyName) list.push(`Barangay: ${summaryLoc.brgyName}`);
      if (summaryPurokFilter !== 'ALL') list.push(`Purok/Zone: ${summaryPurokFilter}`);
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
      if (caseLoc.munName) list.push(`Municipality: ${caseLoc.munName}`);
      if (caseLoc.brgyName) list.push(`Barangay: ${caseLoc.brgyName}`);
      if (casePurokFilter !== 'ALL') list.push(`Purok/Zone: ${casePurokFilter}`);
    } else if (activeTab === 'patients') {
      if (patientPeriodFilter !== 'ALL') {
        const pLabel = patientPeriodFilter === 'today' ? 'Today' : patientPeriodFilter === 'this_week' ? 'This Week' : 'This Month';
        list.push(`Period: ${pLabel}`);
      }
      if (patientSearch) list.push(`Search: "${patientSearch}"`);
      if (patientMonthFilter !== 'ALL') {
        const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        list.push(`Month: ${mNames[Number(patientMonthFilter) - 1]}`);
      }
      if (patientYearFilter !== 'ALL') list.push(`Year: ${patientYearFilter}`);
    } else if (activeTab === 'inventory') {
      if (selectedVaccineType !== 'ALL') list.push(`Vaccine: ${selectedVaccineType}`);
      if (supplierFilter !== 'ALL') list.push(`Supplier: ${supplierFilter}`);
      if (expiryFilter !== 'ALL') list.push(`Expiry: ${expiryFilter}`);
    }
    return list.length > 0 ? list.join(' | ') : 'All Active Records';
  };

  // ─── Print Handlers ──────────────────────────────────────────
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
      dateTo,
      presets
    );
    setPrintHtml(bodyHtml);
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    const now = new Date();
    const refNo = `ABTC-RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const printDateFull = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const printTimeFull = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const tabLabel =
      activeTab === 'summary'
        ? cardData
          ? `Card Audit: ${cardData.title}`
          : 'Summary Report'
        : activeTab === 'cases'
        ? 'Bite Cases Report'
        : activeTab === 'patients'
        ? 'Patient List Report'
        : 'Vaccine Inventory & Wastage Report';

    const isLandscape = activeTab === 'inventory';
    const CSS = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Poppins',sans-serif;color:#000;background:#fff;padding:${isLandscape ? '16px 24px' : '24px 32px'};font-size:${isLandscape ? '9pt' : '10pt'};line-height:1.4}.letterhead{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:4px}.logo{width:68px;height:68px;object-fit:contain}.org{text-align:center;line-height:1.3}.org .republic{font-size:8pt;font-style:italic}.org .dept{font-size:9.5pt;font-weight:700}.org .mho{font-size:11pt;font-weight:800;margin-top:1px}.org .address{font-size:8pt;font-style:italic}.divider-thick{border:none;border-top:2px solid #000;margin:4px 0 14px}.doc-title{text-align:center;margin:12px 0 16px}.doc-title h2{font-size:14pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:0;text-decoration:underline}.doc-title p{font-size:9pt;margin:2px 0 0}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:16px;font-size:9pt;border:1px solid #000;padding:8px 12px}h3.sec{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #000;padding-bottom:3px;margin:18px 0 10px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:${isLandscape ? '8.5pt' : '9pt'};border:1px solid #000}th{background:#fff;color:#000;font-weight:700;padding:6px 8px;text-align:left;font-size:${isLandscape ? '8.5pt' : '9pt'};border:1px solid #000}td{padding:5px 8px;border:1px solid #000;color:#000;background:#fff}tr:nth-child(even) td{background:#fff}table.info-table td{border:1px solid #000;padding:5px 10px;vertical-align:top;background:#fff}table.info-table td.lbl{background:#fff;font-weight:700;font-size:9pt;width:22%;color:#000}table.info-table td.val{font-size:9pt;width:28%;color:#000;background:#fff}p.note{font-size:8.5pt;color:#000;margin-bottom:8px;font-style:italic}.sig-section{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.sig-block .line{border-top:1px solid #000;margin-top:36px;padding-top:4px}.sig-block .name{font-weight:700;font-size:10pt;text-transform:uppercase}.sig-block .position{font-size:9pt;color:#000}.footer-bar{margin-top:40px;padding-top:8px;border-top:2px solid #000;display:flex;justify-content:space-between;font-size:8.5pt;color:#000}@media print{body{padding:16px 20px}@page{size:${isLandscape ? 'landscape' : 'portrait'};margin:${isLandscape ? '0.8cm' : '1.0cm'}}} `;

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

    const { leftLogoUrl: leftLogo, rightLogoUrl: rightLogo } = getGlobalPrintLogos(clinic);
    const provinceName = (clinic?.province || 'MISAMIS ORIENTAL').toUpperCase();
    const municipalityName = clinic?.municipality || 'Tagoloan';
    const officeHeaderName = (clinic?.name || 'MUNICIPAL HEALTH OFFICE').toUpperCase();
    const contactPhone = clinic?.contact_number || (clinic as any)?.phone || '(088)890-4770';

    win.document.write(`<!DOCTYPE html><html><head><title>${clinicName} — ${tabLabel}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>
      <div class="letterhead">
        ${leftLogo ? `<img onerror="this.style.visibility='hidden'" src="${leftLogo}" alt="Left Print Logo" class="logo" />` : `<div style="width:68px;height:68px;flex-shrink:0;"></div>`}
        <div class="org">
          <div class="republic">Republic of the Philippines</div>
          <div class="dept">PROVINCE OF ${provinceName}</div>
          <div class="dept" style="font-weight:400">Municipality of ${municipalityName}</div>
          <div class="mho">${officeHeaderName}</div>
          <div class="address">Tel. No. ${contactPhone}</div>
        </div>
        ${rightLogo ? `<img onerror="this.style.visibility='hidden'" src="${rightLogo}" alt="Right Print Logo" class="logo" />` : `<div style="width:68px;height:68px;flex-shrink:0;"></div>`}
      </div>
      <hr class="divider-thick">
      <div class="doc-title"><h2>${tabLabel}</h2><p>Reference No.: ${refNo}</p></div>
      ${metaGridHtml}
      ${printHtml}
      <div class="sig-section">
        <div class="sig-block"><div class="line"><div class="name">${printedBy}</div><div class="position">Prepared by (Treatment Nurse / Animal Bite Clinic)</div></div></div>
        <div class="sig-block"><div class="line"><div class="name">____________________________</div><div class="position">Noted &amp; Approved by (Medical Officer / Doctor in Charge)</div></div></div>
      </div>
      <div class="footer-bar"><span>${clinicName} — Animal Bite Treatment Center</span><span>Ref: ${refNo} | ${printDateFull}</span></div>
    </body></html>`);

    win.document.close();
    win.focus();
    setShowPrintModal(false);
    void printWhenReady(win, true);
  };

  // ─── Export CSV Handlers ─────────────────────────────────────
  const exportCsv = (type: 'cases' | 'patients' | 'inventory') => {
    setExporting(true);
    try {
      let headers: string[] = [];
      let csvRows: string[] = [];

      if (type === 'cases') {
        headers = ['#', 'Patient Name', 'Case No.', 'Category', 'Animal Type', 'Place of Exposure', 'Status', 'Date Registered'];
        csvRows = filteredBiteCases.map((c, i) => [
          i + 1,
          `"${(c.patient_name || '').replace(/"/g, '""')}"`,
          `"${c.case_number || ''}"`,
          `"${c.category || ''}"`,
          `"${c.animal_type || ''}"`,
          `"${(c.place_of_exposure || '').replace(/"/g, '""')}"`,
          `"${c.status || ''}"`,
          `"${c.created_at || ''}"`,
        ].join(','));
      } else if (type === 'patients') {
        headers = ['#', 'First Name', 'Last Name', 'Date of Birth', 'Contact Number', 'Registered On'];
        csvRows = filteredPatients.map((p, i) => [
          i + 1,
          `"${(p.first_name || '').replace(/"/g, '""')}"`,
          `"${(p.last_name || '').replace(/"/g, '""')}"`,
          `"${p.date_of_birth || ''}"`,
          `"${p.contact_number || ''}"`,
          `"${p.created_at || ''}"`,
        ].join(','));
      } else if (type === 'inventory') {
        headers = ['#', 'Vaccine Category', 'Vaccine Type', 'Batch No', 'Supplier / Source', 'Received', 'Used', 'Sealed Vials', 'Open Vial Status', 'Wastage', 'Expiration', 'Status'];
        csvRows = filteredInvItems.map((item, i) => {
          const recQty = item.initial_quantity ?? item.current_quantity + (item.total_dispensed ?? 0);
          const usedQty = item.total_dispensed ?? 0;
          const openStatus = item.open_vial_status ? `${item.open_vial_doses_remaining ?? 0} doses left` : 'Sealed';
          const wasteQty = item.status === 'expired' ? item.current_quantity : item.discarded_vials ?? 0;
          const itemCategory = getCategoryForVaccine(item.vaccine_type, item.vaccine_category);
          return [
            i + 1,
            `"${(itemCategory || 'Not specified').replace(/"/g, '""')}"`,
            `"${(item.vaccine_type || '').replace(/"/g, '""')}"`,
            `"${item.batch_number || ''}"`,
            `"${(item.received_from || 'DOH Central Supply').replace(/"/g, '""')}"`,
            recQty,
            usedQty,
            item.current_quantity,
            `"${openStatus}"`,
            wasteQty,
            `"${item.expiration_date || ''}"`,
            `"${item.status || ''}"`,
          ].join(',');
        });
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `treatment-nurse-${type}-${dateFrom}-${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setExporting(false);
    }
  };

  // Pagination slice helpers
  const pageSize = 15;
  const paginatedCases = useMemo(() => {
    const start = (casePage - 1) * pageSize;
    return filteredBiteCases.slice(start, start + pageSize);
  }, [filteredBiteCases, casePage]);

  const paginatedPatients = useMemo(() => {
    const start = (patientPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, patientPage]);

  return (
    <Box sx={{ px: { xs: 1, sm: 3 }, pb: 4, fontFamily: POPPINS }}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: 24,
              fontWeight: 700,
              color: 'text.primary',
              fontFamily: POPPINS,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Reports &amp; Analytics
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS, mt: 0.5, display: 'block' }}>
            <Box
              component={RouterLink}
              to={ROUTES.DASHBOARD}
              sx={{ color: '#3b82f6', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Dashboard
            </Box>
            {' › Reports & Analytics'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<PrintOutlined />}
            onClick={handleOpenPrint}
            disabled={loading || (activeTab === 'inventory' && invLoading)}
            sx={{
              fontFamily: POPPINS,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0fb981 0%, #047857 100%)',
                boxShadow: '0 4px 14px rgba(16,185,129,0.38)',
              },
            }}
          >
            Print Report
          </Button>
        </Stack>
      </Box>

      {/* ── Section Tabs ───────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onChange={(_, value: SectionTab) => {
          setActiveTab(value);
          setSelectedCard(null);
        }}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Treatment Nurse report sections"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': {
            fontFamily: POPPINS,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: '#10b981',
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#10b981',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        <Tab value="summary" label="Summary & Overview" />
        <Tab value="cases" label="Bite Cases" />
        <Tab value="patients" label="Patients" />
        <Tab value="inventory" label="Vaccine Inventory & Wastage" />
      </Tabs>

      {/* ── Contextual Filter Bar ───────────────────────────────── */}
      <Paper
        component="div"
        elevation={0}
        sx={{
          ...panelSx,
          p: 2,
          mb: 3,
        }}
      >
          {/* Summary Tab Filters */}
          {activeTab === 'summary' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Row 1: Period, Category, Municipality, Barangay, Date range, Apply */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  label="Period"
                  value={summaryPeriodFilter}
                  onChange={e => setSummaryPeriodFilter(e.target.value as any)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="ALL">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="this_week">This week</MenuItem>
                  <MenuItem value="this_month">This month</MenuItem>
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Exposure Category"
                  value={summaryCatFilter}
                  onChange={e => setSummaryCatFilter(e.target.value)}
                  sx={{ minWidth: 170 }}
                >
                  <MenuItem value="ALL">All Categories</MenuItem>
                  <MenuItem value="Category I">Category I</MenuItem>
                  <MenuItem value="Category II">Category II</MenuItem>
                  <MenuItem value="Category III">Category III</MenuItem>
                </TextField>

                <TextField
                  select
                  size="small"
                  label="City / Municipality"
                  value={summaryLoc.municipality}
                  onChange={e => {
                    summaryLoc.setMunicipality(e.target.value);
                    summaryLoc.setBarangay('');
                    setSummaryPurokFilter('ALL');
                  }}
                  slotProps={{
                    select: { native: true },
                    inputLabel: { shrink: true },
                  }}
                  sx={{ minWidth: 175 }}
                >
                  <option value="">{summaryLoc.loadingMun ? 'Loading…' : '— Select —'}</option>
                  {summaryLoc.municipalities.map(m => (
                    <option key={m.code} value={m.code}>{m.name}</option>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Barangay"
                  value={summaryLoc.barangay}
                  onChange={e => {
                    summaryLoc.setBarangay(e.target.value);
                    setSummaryPurokFilter('ALL');
                  }}
                  disabled={!summaryLoc.municipality}
                  slotProps={{
                    select: { native: true },
                    inputLabel: { shrink: true },
                  }}
                  sx={{ minWidth: 155 }}
                >
                  <option value="">
                    {summaryLoc.loadingBrgy ? 'Loading…' : (!summaryLoc.municipality ? '— Select Municipality First —' : '— Select —')}
                  </option>
                  {summaryLoc.barangays.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Purok / Zone"
                  value={summaryPurokFilter}
                  onChange={e => setSummaryPurokFilter(e.target.value)}
                  disabled={!summaryLoc.barangay}
                  slotProps={{
                    select: { native: true },
                    inputLabel: { shrink: true },
                  }}
                  sx={{ minWidth: 155 }}
                >
                  <option value="ALL">
                    {!summaryLoc.barangay ? '— Select Barangay First —' : '— Select —'}
                  </option>
                  {getAvailablePuroks(summaryLoc.munName, summaryLoc.brgyName).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </TextField>

                <TextField
                  size="small"
                  type="date"
                  label="From"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  size="small"
                  type="date"
                  label="To"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPreset('custom'); }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <Button
                  variant="contained"
                  onClick={loadReports}
                  disabled={loading}
                  sx={{ bgcolor: '#10b981', color: '#fff', fontFamily: POPPINS, '&:hover': { bgcolor: '#059669' } }}
                >
                  {loading ? 'Loading…' : 'Apply'}
                </Button>

                {(summaryPeriodFilter !== 'ALL' || summaryCatFilter !== 'ALL' ||
                  summaryLoc.municipality || summaryLoc.barangay ||
                  summaryPurokFilter !== 'ALL' || selectedCard !== null) && (
                  <Button
                    onClick={() => {
                      setSummaryPeriodFilter('ALL'); setSummaryCatFilter('ALL');
                      summaryLoc.setMunicipality(''); summaryLoc.setBarangay('');
                      setSummaryPurokFilter('ALL'); setSelectedCard(null);
                    }}
                    sx={{ color: 'error.main', fontFamily: POPPINS }}
                  >
                    Reset
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={loadReports}
                  disabled={loading}
                  sx={{ ml: 'auto', fontFamily: POPPINS }}
                  startIcon={<Refresh />}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          )}

          {/* Bite Cases Tab Filters */}
          {activeTab === 'cases' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Period"
                value={casePeriodFilter}
                onChange={e => { setCasePeriodFilter(e.target.value as any); setCasePage(1); }}
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="ALL">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="this_week">This week</MenuItem>
                <MenuItem value="this_month">This month</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Category"
                value={caseCatFilter}
                onChange={e => { setCaseCatFilter(e.target.value); setCasePage(1); }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="ALL">All Categories</MenuItem>
                <MenuItem value="Category I">Category I</MenuItem>
                <MenuItem value="Category II">Category II</MenuItem>
                <MenuItem value="Category III">Category III</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Animal"
                value={caseAnimalFilter}
                onChange={e => {
                  setCaseAnimalFilter(e.target.value);
                  if (e.target.value !== 'Others') setCaseAnimalOtherText('');
                  setCasePage(1);
                }}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="ALL">All Animals</MenuItem>
                <MenuItem value="Dog">Dog</MenuItem>
                <MenuItem value="Cat">Cat</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
              </TextField>

              {caseAnimalFilter === 'Others' && (
                <TextField
                  size="small"
                  placeholder="Specify animal..."
                  value={caseAnimalOtherText}
                  onChange={e => { setCaseAnimalOtherText(e.target.value); setCasePage(1); }}
                  sx={{ minWidth: 130 }}
                />
              )}

              <TextField
                select
                size="small"
                label="Status"
                value={caseStatusFilter}
                onChange={e => { setCaseStatusFilter(e.target.value); setCasePage(1); }}
                sx={{ minWidth: 135 }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="ongoing">On-going</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="City / Municipality"
                value={caseLoc.municipality}
                onChange={e => {
                  caseLoc.setMunicipality(e.target.value);
                  caseLoc.setBarangay('');
                  setCasePurokFilter('ALL');
                  setCasePage(1);
                }}
                slotProps={{
                  select: { native: true },
                  inputLabel: { shrink: true },
                }}
                sx={{ minWidth: 175 }}
              >
                <option value="">{caseLoc.loadingMun ? 'Loading…' : '— Select —'}</option>
                {caseLoc.municipalities.map(m => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Barangay"
                value={caseLoc.barangay}
                onChange={e => {
                  caseLoc.setBarangay(e.target.value);
                  setCasePurokFilter('ALL');
                  setCasePage(1);
                }}
                disabled={!caseLoc.municipality}
                slotProps={{
                  select: { native: true },
                  inputLabel: { shrink: true },
                }}
                sx={{ minWidth: 155 }}
              >
                <option value="">
                  {caseLoc.loadingBrgy ? 'Loading…' : (!caseLoc.municipality ? '— Select Municipality First —' : '— Select —')}
                </option>
                {caseLoc.barangays.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Purok / Zone"
                value={casePurokFilter}
                onChange={e => { setCasePurokFilter(e.target.value); setCasePage(1); }}
                disabled={!caseLoc.barangay}
                slotProps={{
                  select: { native: true },
                  inputLabel: { shrink: true },
                }}
                sx={{ minWidth: 150 }}
              >
                <option value="ALL">
                  {!caseLoc.barangay ? '— Select Barangay First —' : '— Select —'}
                </option>
                {getAvailablePuroks(caseLoc.munName, caseLoc.brgyName).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </TextField>

              <TextField
                size="small"
                placeholder="Search name, case #, location..."
                value={caseSearch}
                onChange={e => { setCaseSearch(e.target.value); setCasePage(1); }}
                sx={{ minWidth: 200, flexGrow: 1 }}
              />

              {(casePeriodFilter !== 'ALL' || caseCatFilter !== 'ALL' ||
                caseAnimalFilter !== 'ALL' || caseStatusFilter !== 'ALL' ||
                caseLoc.municipality || caseLoc.barangay ||
                casePurokFilter !== 'ALL' || caseSearch !== '') && (
                <Button
                  onClick={() => {
                    setCasePeriodFilter('ALL'); setCaseCatFilter('ALL');
                    setCaseAnimalFilter('ALL'); setCaseAnimalOtherText('');
                    setCaseStatusFilter('ALL');
                    caseLoc.setMunicipality(''); caseLoc.setBarangay('');
                    setCasePurokFilter('ALL'); setCaseSearch(''); setCasePage(1);
                  }}
                  sx={{ color: 'error.main', fontFamily: POPPINS }}
                >
                  Reset
                </Button>
              )}

              <Button
                type="button"
                onClick={loadReports}
                disabled={loading}
                sx={{ fontFamily: POPPINS }}
                startIcon={<Refresh />}
              >
                Refresh
              </Button>
            </Box>
          )}

          {/* Patients Tab Filters */}

          {activeTab === 'patients' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Period"
                value={patientPeriodFilter}
                onChange={e => {
                  setPatientPeriodFilter(e.target.value as any);
                  setPatientPage(1);
                }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="ALL">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="this_week">This week</MenuItem>
                <MenuItem value="this_month">This month</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Reg. Month"
                value={patientMonthFilter}
                onChange={e => {
                  setPatientMonthFilter(e.target.value);
                  setPatientPage(1);
                }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="ALL">All Months</MenuItem>
                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map((m, idx) => (
                  <MenuItem key={m} value={String(idx + 1)}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Reg. Year"
                value={patientYearFilter}
                onChange={e => {
                  setPatientYearFilter(e.target.value);
                  setPatientPage(1);
                }}
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="ALL">All Years</MenuItem>
                <MenuItem value="2026">2026</MenuItem>
                <MenuItem value="2025">2025</MenuItem>
                <MenuItem value="2024">2024</MenuItem>
              </TextField>

              <TextField
                size="small"
                placeholder="Search name, contact, ID..."
                value={patientSearch}
                onChange={e => {
                  setPatientSearch(e.target.value);
                  setPatientPage(1);
                }}
                sx={{ minWidth: 220, flexGrow: 1 }}
              />

              {(patientPeriodFilter !== 'ALL' ||
                patientMonthFilter !== 'ALL' ||
                patientYearFilter !== 'ALL' ||
                patientSearch !== '') && (
                <Button
                  onClick={() => {
                    setPatientPeriodFilter('ALL');
                    setPatientMonthFilter('ALL');
                    setPatientYearFilter('ALL');
                    setPatientSearch('');
                    setPatientPage(1);
                  }}
                  sx={{ color: 'error.main', fontFamily: POPPINS }}
                >
                  Reset
                </Button>
              )}

              <Button
                type="button"
                onClick={loadReports}
                disabled={loading}
                sx={{ ml: { sm: 'auto' }, fontFamily: POPPINS }}
                startIcon={<Refresh />}
              >
                Refresh
              </Button>
            </Box>
          )}

          {/* Inventory Tab Filters */}
          {activeTab === 'inventory' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Supplier / Source"
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="ALL">All Suppliers / Sources</MenuItem>
                {availableSuppliers.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Vaccine Type"
                value={selectedVaccineType}
                onChange={e => setSelectedVaccineType(e.target.value)}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="ALL">All Vaccine Types</MenuItem>
                {availableVaccineTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Expiration Date"
                value={expiryFilter}
                onChange={e => setExpiryFilter(e.target.value)}
                sx={{ minWidth: 185 }}
              >
                <MenuItem value="ALL">All Expiration Dates</MenuItem>
                <MenuItem value="valid">Valid / Active (Not Expired)</MenuItem>
                <MenuItem value="expiring_30">Expiring in ≤ 30 Days</MenuItem>
                <MenuItem value="expiring_60">Expiring in ≤ 60 Days</MenuItem>
                <MenuItem value="expiring_90">Expiring in ≤ 90 Days</MenuItem>
                <MenuItem value="expired">Expired Batches</MenuItem>
                <MenuItem value="custom">Custom Range…</MenuItem>
              </TextField>

              {expiryFilter === 'custom' && (
                <>
                  <TextField
                    size="small"
                    type="date"
                    label="Exp. From"
                    value={expiryDateFrom}
                    onChange={e => setExpiryDateFrom(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Exp. To"
                    value={expiryDateTo}
                    onChange={e => setExpiryDateTo(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </>
              )}

              {isInvFiltered && (
                <Button
                  onClick={() => {
                    setSelectedVaccineType('ALL');
                    setSupplierFilter('ALL');
                    setExpiryFilter('ALL');
                    setExpiryDateFrom('');
                    setExpiryDateTo('');
                  }}
                  sx={{ color: 'error.main', fontFamily: POPPINS }}
                >
                  Reset
                </Button>
              )}

              <Button
                type="button"
                onClick={loadInventory}
                disabled={invLoading}
                sx={{ ml: { sm: 'auto' }, fontFamily: POPPINS }}
                startIcon={<Refresh />}
              >
                Refresh Inventory
              </Button>
            </Box>
          )}

          {/* Filter Summary Caption */}
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5, fontFamily: POPPINS }}>
            {activeTab === 'summary' &&
              `Showing overview for ${
                summaryCatFilter !== 'ALL' ? summaryCatFilter : 'all categories'
              } · Reporting Period: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}.`}
            {activeTab === 'cases' &&
              `Showing ${filteredBiteCases.length} of ${biteCases.length} bite incident records.`}
            {activeTab === 'patients' &&
              `Showing ${filteredPatients.length} of ${patients.length} registered patient records.`}
            {activeTab === 'inventory' &&
              `Showing ${filteredInvItems.length} of ${invItems.length} vaccine inventory batches.`}
          </Typography>
        </Paper>

      {/* ── Error Notification ──────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, fontFamily: POPPINS }}>
          {error}
        </Alert>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: SUMMARY & OVERVIEW ─────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'summary' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700, fontFamily: POPPINS, color: 'text.primary' }}>
              Clinic Summary Statistics
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
              Current figures as of {todayStr}
            </Typography>
          </Box>

          {loading && !stats ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
                gap: 1.5,
                mb: 3,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
                gap: 1.5,
                mb: 3,
              }}
            >
              <MetricCard
                label="Total Patients"
                value={fmt(summaryMetrics.totalPatients)}
                detail="Unique patient profiles"
                active={selectedCard === 'total_patients'}
                onClick={() => setSelectedCard(prev => (prev === 'total_patients' ? null : 'total_patients'))}
                color="#6366f1"
              />
              <MetricCard
                label="Total Bite Cases"
                value={fmt(summaryMetrics.totalBiteCases)}
                detail="All-time registered cases"
                active={selectedCard === 'total_bite_cases'}
                onClick={() => setSelectedCard(prev => (prev === 'total_bite_cases' ? null : 'total_bite_cases'))}
                color="#f59e0b"
              />
              <MetricCard
                label="New Patients"
                value={fmt(summaryMetrics.newPatients)}
                detail="Registered in period"
                active={selectedCard === 'new_patients'}
                onClick={() => setSelectedCard(prev => (prev === 'new_patients' ? null : 'new_patients'))}
                color="#10b981"
              />
              <MetricCard
                label="New Cases"
                value={fmt(summaryMetrics.newCases)}
                detail="Incidents in period"
                active={selectedCard === 'new_cases'}
                onClick={() => setSelectedCard(prev => (prev === 'new_cases' ? null : 'new_cases'))}
                color="#f97316"
              />
              <MetricCard
                label="Completed"
                value={fmt(summaryMetrics.completedCases)}
                detail="Completed PEP course"
                active={selectedCard === 'completed_cases'}
                onClick={() => setSelectedCard(prev => (prev === 'completed_cases' ? null : 'completed_cases'))}
                color="#22c55e"
              />
              <MetricCard
                label="On-going"
                value={fmt(summaryMetrics.ongoingCases)}
                detail="Active treatment schedule"
                active={selectedCard === 'ongoing_cases'}
                onClick={() => setSelectedCard(prev => (prev === 'ongoing_cases' ? null : 'ongoing_cases'))}
                color="#3b82f6"
              />
            </Box>
          )}

          {/* Category Breakdown Cards */}
          <Box sx={{ mb: 3 }}>
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS, mb: 1.5, color: 'text.primary' }}>
              Bite Case Categories (Period Breakdown)
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              <CategoryCard
                cat="Category I"
                count={stats?.category_i}
                desc="Minor — Licking of intact skin (no exposure)"
                active={summaryCatFilter === 'Category I'}
                onClick={() => setSummaryCatFilter(prev => (prev === 'Category I' ? 'ALL' : 'Category I'))}
              />
              <CategoryCard
                cat="Category II"
                count={stats?.category_ii}
                desc="Moderate — Minor scratches or abrasions without bleeding"
                active={summaryCatFilter === 'Category II'}
                onClick={() => setSummaryCatFilter(prev => (prev === 'Category II' ? 'ALL' : 'Category II'))}
              />
              <CategoryCard
                cat="Category III"
                count={stats?.category_iii}
                desc="Severe — Transdermal bites, scratches, or mucous contamination"
                active={summaryCatFilter === 'Category III'}
                onClick={() => setSummaryCatFilter(prev => (prev === 'Category III' ? 'ALL' : 'Category III'))}
              />
            </Box>
          </Box>

          {/* Card Drilldown / Inspection Table */}
          {cardData && (
            <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 }, mb: 3, borderColor: '#10b981' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
                    {cardData.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                    Displaying records for selected card ({cardData.records.length} total)
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setSelectedCard(null)} sx={{ fontFamily: POPPINS }}>
                  Close Table
                </Button>
              </Box>

              {cardData.type === 'patients' ? (
                <TableContainer>
                  <Table size="small" aria-label="Patient card audit table">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Full Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Date of Birth</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Contact Number</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Registered On</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cardData.records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontFamily: POPPINS }}>
                            No patient records found in this category.
                          </TableCell>
                        </TableRow>
                      ) : (
                        cardData.records.map((p, i) => (
                          <TableRow key={p.id || i} hover>
                            <TableCell sx={{ fontFamily: POPPINS }}>{i + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>
                              {p.first_name} {p.last_name}
                            </TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(p.date_of_birth)}</TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>{p.contact_number ?? '—'}</TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(p.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <TableContainer>
                  <Table size="small" aria-label="Bite cases card audit table">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Patient Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Case No.</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Animal Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Place of Exposure</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Date Registered</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cardData.records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontFamily: POPPINS }}>
                            No bite cases found in this category.
                          </TableCell>
                        </TableRow>
                      ) : (
                        cardData.records.map((c, i) => (
                          <TableRow key={c.id || i} hover>
                            <TableCell sx={{ fontFamily: POPPINS }}>{i + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>{c.patient_name ?? '—'}</TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>{c.case_number || '—'}</TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>
                              <CategoryBadge cat={c.category} />
                            </TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>{c.animal_type ?? '—'}</TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>{c.place_of_exposure || '—'}</TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>
                              <StatusBadge status={c.status} />
                            </TableCell>
                            <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(c.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}

          {/* Category Dropdown Inspection Table */}
          {!cardData && summaryCatFilter !== 'ALL' && (
            <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 }, mb: 3, borderColor: '#10b981' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
                    {summaryCatFilter} Incident Records
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                    Showing bite cases for {summaryCatFilter} ({filteredSummaryCases.length} records)
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setSummaryCatFilter('ALL')} sx={{ fontFamily: POPPINS }}>
                  Clear Filter
                </Button>
              </Box>

              <TableContainer>
                <Table size="small" aria-label="Category filter audit table">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Patient Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Case No.</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Animal Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Place of Exposure</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Date Registered</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSummaryCases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontFamily: POPPINS }}>
                          No bite cases found for {summaryCatFilter}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSummaryCases.map((c, i) => (
                        <TableRow key={c.id || i} hover>
                          <TableCell sx={{ fontFamily: POPPINS }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>{c.patient_name ?? '—'}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{c.case_number || '—'}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>
                            <CategoryBadge cat={c.category} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{c.animal_type ?? '—'}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{c.place_of_exposure || '—'}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>
                            <StatusBadge status={c.status} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(c.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: BITE CASES ─────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'cases' && (
        <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Box>
              <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
                Bite Case Incident Records
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                Showing {filteredBiteCases.length} of {biteCases.length} total recorded cases
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadOutlined />}
                onClick={() => exportCsv('cases')}
                disabled={filteredBiteCases.length === 0 || exporting}
                sx={{ fontFamily: POPPINS }}
              >
                Export CSV
              </Button>
            </Stack>
          </Box>

          <TableContainer>
            <Table size="small" aria-label="Bite cases records table">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Patient Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Case No.</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Animal Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Place of Exposure</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Date Registered</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                      <CircularProgress size={24} sx={{ mb: 1, display: 'block', mx: 'auto', color: '#10b981' }} />
                      Loading bite cases…
                    </TableCell>
                  </TableRow>
                ) : filteredBiteCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                      No bite cases match the selected search or filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCases.map((c, i) => (
                    <TableRow key={c.id || i} hover>
                      <TableCell sx={{ fontFamily: POPPINS }}>{(casePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>{c.patient_name ?? '—'}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{c.case_number || '—'}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>
                        <CategoryBadge cat={c.category} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{c.animal_type ?? '—'}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{c.place_of_exposure || '—'}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(c.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredBiteCases.length > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                Showing {(casePage - 1) * pageSize + 1}–{Math.min(casePage * pageSize, filteredBiteCases.length)} of{' '}
                {filteredBiteCases.length} records
              </Typography>
              <Pagination
                count={Math.ceil(filteredBiteCases.length / pageSize)}
                page={casePage}
                onChange={(_, p) => setCasePage(p)}
                size="small"
                color="primary"
              />
            </Box>
          )}
        </Paper>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: PATIENTS ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'patients' && (
        <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Box>
              <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
                Registered Patients Registry
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                Showing {filteredPatients.length} of {patients.length} total registered patients
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadOutlined />}
                onClick={() => exportCsv('patients')}
                disabled={filteredPatients.length === 0 || exporting}
                sx={{ fontFamily: POPPINS }}
              >
                Export CSV
              </Button>
            </Stack>
          </Box>

          <TableContainer>
            <Table size="small" aria-label="Patients registry table">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Full Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Date of Birth</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Contact Number</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Registered On</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                      <CircularProgress size={24} sx={{ mb: 1, display: 'block', mx: 'auto', color: '#10b981' }} />
                      Loading patient registry…
                    </TableCell>
                  </TableRow>
                ) : filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                      No patients match the selected search or date filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPatients.map((p, i) => (
                    <TableRow key={p.id || i} hover>
                      <TableCell sx={{ fontFamily: POPPINS }}>{(patientPage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>
                        {p.first_name} {p.last_name}
                      </TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(p.date_of_birth)}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{p.contact_number ?? '—'}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(p.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredPatients.length > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                Showing {(patientPage - 1) * pageSize + 1}–{Math.min(patientPage * pageSize, filteredPatients.length)} of{' '}
                {filteredPatients.length} records
              </Typography>
              <Pagination
                count={Math.ceil(filteredPatients.length / pageSize)}
                page={patientPage}
                onChange={(_, p) => setPatientPage(p)}
                size="small"
                color="primary"
              />
            </Box>
          )}
        </Paper>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: VACCINE INVENTORY & WASTAGE ────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <>
          {/* Stock Metrics Overview */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#10b981', fontFamily: POPPINS, lineHeight: 1 }}>
                {invDisplayStats.active_batches}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: POPPINS,
                  display: 'block',
                  mt: 0.5,
                }}
              >
                Active Batches
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#3b82f6', fontFamily: POPPINS, lineHeight: 1 }}>
                {invDisplayStats.total_stock}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: POPPINS,
                  display: 'block',
                  mt: 0.5,
                }}
              >
                Total Sealed Vials
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#f59e0b', fontFamily: POPPINS, lineHeight: 1 }}>
                {invDisplayStats.expiring_soon}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: POPPINS,
                  display: 'block',
                  mt: 0.5,
                }}
              >
                Expiring (≤ 60d)
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#ef4444', fontFamily: POPPINS, lineHeight: 1 }}>
                {invDisplayStats.depleted_batches}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: POPPINS,
                  display: 'block',
                  mt: 0.5,
                }}
              >
                Depleted Batches
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#6b7280', fontFamily: POPPINS, lineHeight: 1 }}>
                {invDisplayStats.expired_batches}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: POPPINS,
                  display: 'block',
                  mt: 0.5,
                }}
              >
                Expired Batches
              </Typography>
            </Paper>
          </Box>

          {/* Detailed Batch Utilization Table */}
          <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
              <Box>
                <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
                  Comprehensive Batch Utilization &amp; Wastage Audit Log
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                  Showing {filteredInvItems.length} of {invItems.length} inventory items
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadOutlined />}
                  onClick={() => exportCsv('inventory')}
                  disabled={filteredInvItems.length === 0 || exporting}
                  sx={{ fontFamily: POPPINS }}
                >
                  Export CSV
                </Button>
              </Stack>
            </Box>

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Inventory audit table">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, width: '45px' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, minWidth: '175px' }}>Vaccine Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, minWidth: '130px' }}>Vaccine Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Batch No.</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Supplier / Source</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Received</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Used</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Sealed Vials</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Open Vial Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Wastage</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Expiration</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invLoading ? (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                        <CircularProgress size={24} sx={{ mb: 1, display: 'block', mx: 'auto', color: '#10b981' }} />
                        Loading inventory audit data…
                      </TableCell>
                    </TableRow>
                  ) : filteredInvItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                        No inventory records match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvItems.map((item, i) => {
                      const recQty = item.initial_quantity ?? item.current_quantity + (item.total_dispensed ?? 0);
                      const usedQty = item.total_dispensed ?? 0;
                      const supplier = item.received_from || 'DOH Central Supply';
                      const openStatus = item.open_vial_status
                        ? `${item.open_vial_doses_remaining ?? 0} doses remaining`
                        : 'Sealed';
                      const wasteQty = item.status === 'expired' ? item.current_quantity : item.discarded_vials ?? 0;
                      const itemCategory = getCategoryForVaccine(item.vaccine_type, item.vaccine_category);

                      return (
                        <TableRow key={item.inventory_id || i} hover>
                          <TableCell sx={{ fontFamily: POPPINS }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>
                            <VaccineCategoryBadge category={itemCategory} isDark={isDark} />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>{item.vaccine_type}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{item.batch_number}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{supplier}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontFamily: POPPINS }}>{recQty}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontFamily: POPPINS }}>{usedQty}</TableCell>
                          <TableCell
                            sx={{
                              textAlign: 'center',
                              fontWeight: 700,
                              fontFamily: POPPINS,
                              color: item.current_quantity === 0 ? 'error.main' : 'text.primary',
                            }}
                          >
                            {item.current_quantity}
                          </TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{openStatus}</TableCell>
                          <TableCell
                            sx={{
                              textAlign: 'center',
                              fontFamily: POPPINS,
                              color: wasteQty > 0 ? 'error.main' : 'text.secondary',
                              fontWeight: wasteQty > 0 ? 600 : 400,
                            }}
                          >
                            {wasteQty}
                          </TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(item.expiration_date)}</TableCell>
                          <TableCell sx={{ fontFamily: POPPINS }}>
                            <InvStatusBadge status={item.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* ── Corporate Print Preview Dialog ─────────────────────── */}
      <Dialog
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="print-dialog-title"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              p: 1,
              fontFamily: POPPINS,
            },
          },
        }}
      >
        <DialogTitle
          id="print-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: POPPINS,
            fontWeight: 700,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <PrintOutlined fontSize="small" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
                Print Preview &amp; Verification
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
                Official DOH animal bite clinic report layout
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={() => setShowPrintModal(false)} size="small">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5, bgcolor: '#f3f4f6' }}>
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              bgcolor: '#ffffff',
              color: '#000000',
              border: '1px solid #d1d5db',
              borderRadius: 2,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              maxHeight: '65vh',
              overflowY: 'auto',
              fontFamily: POPPINS,
              fontSize: '0.875rem',
              '& table': { width: '100%', borderCollapse: 'collapse', my: 1, fontFamily: POPPINS },
              '& th, & td': { border: '1px solid #000', p: 0.75, fontSize: '0.8125rem', fontFamily: POPPINS },
              '& th': { bgcolor: '#ffffff', fontWeight: 700, color: '#000000' },
              '& .sec': {
                fontSize: '0.9375rem',
                fontWeight: 700,
                borderBottom: '2px solid #000',
                pb: 0.5,
                mt: 2.5,
                mb: 1,
                textTransform: 'uppercase',
                color: '#000000',
              },
              '& .note': { fontSize: '0.75rem', fontStyle: 'italic', mb: 1, color: '#000000' },
              '& .info-table td': { border: '1px solid #000' },
              '& .info-table .lbl': { fontWeight: 700, width: '22%', bgcolor: '#ffffff' },
              '& .info-table .val': { width: '28%', bgcolor: '#ffffff' },
            }}
          >
            {/* Republic Header & Dynamic Logos */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 0.5 }}>
              {leftLogo ? (
                <Box
                  component="img"
                  src={leftLogo}
                  alt="Left Print Logo"
                  sx={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }}
                  onError={(e: any) => {
                    e.target.style.visibility = 'hidden';
                  }}
                />
              ) : (
                <Box sx={{ width: 64, height: 64, flexShrink: 0 }} />
              )}
              <Box sx={{ textAlign: 'center', lineHeight: 1.3 }}>
                <Typography sx={{ fontSize: '8pt', fontStyle: 'italic', fontFamily: POPPINS, color: '#000' }}>
                  Republic of the Philippines
                </Typography>
                <Typography sx={{ fontSize: '9.5pt', fontWeight: 700, fontFamily: POPPINS, color: '#000' }}>
                  PROVINCE OF {province}
                </Typography>
                <Typography sx={{ fontSize: '8.5pt', fontFamily: POPPINS, color: '#000' }}>
                  Municipality of {municipality}
                </Typography>
                <Typography sx={{ fontSize: '11pt', fontWeight: 800, fontFamily: POPPINS, mt: '1px', color: '#000' }}>
                  {officeName}
                </Typography>
                <Typography sx={{ fontSize: '8pt', fontStyle: 'italic', fontFamily: POPPINS, color: '#000' }}>
                  Tel. No. {phone}
                </Typography>
              </Box>
              {rightLogo ? (
                <Box
                  component="img"
                  src={rightLogo}
                  alt="Right Print Logo"
                  sx={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }}
                  onError={(e: any) => {
                    e.target.style.visibility = 'hidden';
                  }}
                />
              ) : (
                <Box sx={{ width: 64, height: 64, flexShrink: 0 }} />
              )}
            </Box>

            <Box sx={{ borderTop: '2px solid #000', my: 1.5 }} />

            {/* Document Title */}
            <Box sx={{ textAlign: 'center', my: 1.5 }}>
              <Typography
                sx={{
                  fontSize: '12pt',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textDecoration: 'underline',
                  fontFamily: POPPINS,
                  color: '#000',
                }}
              >
                {activeTab === 'summary'
                  ? cardData
                    ? `Card Audit: ${cardData.title}`
                    : 'Summary Report'
                  : activeTab === 'cases'
                  ? 'Bite Cases Report'
                  : activeTab === 'patients'
                  ? 'Patient List Report'
                  : 'Vaccine Inventory & Wastage Report'}
              </Typography>
            </Box>

            {/* Metadata Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3px 20px',
                border: '1px solid #000',
                p: 1.25,
                mb: 2,
                fontSize: '8.5pt',
                fontFamily: POPPINS,
                color: '#000',
              }}
            >
              <span>Reporting Period:</span>
              <span style={{ fontWeight: 700 }}>
                {fmtDate(dateFrom)} – {fmtDate(dateTo)}
              </span>
              <span>Active Filters:</span>
              <span style={{ fontWeight: 700 }}>{getActiveFiltersSummaryText() || 'None (All Records)'}</span>
              <span>Date Generated:</span>
              <span style={{ fontWeight: 700 }}>{printDate}</span>
              <span>Prepared by:</span>
              <span style={{ fontWeight: 700 }}>{printedBy}</span>
            </Box>

            {/* Table Content */}
            <Box dangerouslySetInnerHTML={{ __html: printHtml }} />

            {/* Signatures */}
            <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: POPPINS }}>
              <Box>
                <Box sx={{ borderTop: '1px solid #000', mt: 3, pt: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '9pt', fontFamily: POPPINS, color: '#000' }}>
                    {printedBy}
                  </Typography>
                  <Typography sx={{ fontSize: '8pt', color: '#000', fontFamily: POPPINS }}>
                    Prepared by (Treatment Nurse / Animal Bite Clinic)
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Box sx={{ borderTop: '1px solid #000', mt: 3, pt: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: POPPINS, color: '#000' }}>
                    ____________________________
                  </Typography>
                  <Typography sx={{ fontSize: '8pt', color: '#000', fontFamily: POPPINS }}>
                    Noted &amp; Approved by (Medical Officer / Doctor in Charge)
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Footer Bar */}
            <Box
              sx={{
                mt: 3,
                pt: 1,
                borderTop: '2px solid #000',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '7.5pt',
                color: '#000',
                fontFamily: POPPINS,
              }}
            >
              <span>{clinicName} — Animal Bite Treatment Center</span>
              <span>{printDate}</span>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setShowPrintModal(false)} sx={{ fontFamily: POPPINS }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintOutlined />}
            onClick={handleConfirmPrint}
            sx={{
              bgcolor: '#10b981',
              color: '#fff',
              fontFamily: POPPINS,
              fontWeight: 600,
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            Confirm &amp; Print Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
