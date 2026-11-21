import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  DeleteOutlined as DisposeIcon,
  EventBusy as ExpireIcon,
  MedicalServices as MedicalIcon,
  Person as PersonIcon,
  ScienceOutlined as VialIcon,
  Search as SearchIcon,
  VisibilityOutlined as ViewIcon,
} from '@mui/icons-material';
import api from '../../../../services/api';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { formatDate, formatTime } from '../../../../shared/utils';
import {
  getVaccineNames,
  getVials,
  getWastages,
  type VaccineVialDetail,
  type WastageLogItem,
} from '../../services/vaccineInventoryService';
import {
  DisposeVialDialog,
  ExpireVialDialog,
  VialDetailDialog,
  getVialStatusMeta,
} from './VialLifecycleDialogs';

export interface AdministeredVaccineRecord {
  treatment_id: number;
  patient_id: number;
  patient_name: string;
  patient_age?: number | string;
  patient_gender?: string;
  case_number?: string;
  vaccine_brand: string;
  batch_no?: string;
  dose_number: number;
  dose_label: string;
  route: string;
  injection_site?: string;
  treatment_date: string | null;
  administered_at: string | null;
  administered_by_id?: number;
  administered_by_name: string;
  is_external: boolean;
  external_facility_name?: string;
  vial_id?: number | null;
  vial_code?: string | null;
  vial_portion_number?: number | null;
  vial?: VaccineVialDetail | null;
  is_legacy_unlinked?: boolean;
  doses_per_vial: number | null;
  inventory_units_used: number;
  is_shared: boolean;
  dose_index: number | null;
  fraction_used: string;
  usage_badge: string;
  diagnosis_category: string;
  diagnosis_notes?: string;
  remarks?: string;
  administration_notes?: string;
}

interface NurseVaccineListStats {
  total_administrations: number;
  today_administrations: number;
  unique_patients: number;
  open_vials_count?: number;
  expired_pending_disposal_count?: number;
  total_discarded_portions?: number;
}

const DOSE_OPTIONS = [
  { value: 'all', label: 'All Treatments' },
  { value: '0', label: 'Day 0 (Initial PEP)' },
  { value: '3', label: 'Day 3' },
  { value: '7', label: 'Day 7' },
  { value: '28', label: 'Day 28' },
  { value: '90', label: 'Booster 1' },
  { value: '365', label: 'Booster 2' },
];

const VIAL_STATUS_OPTIONS = [
  { value: 'all', label: 'All Vials' },
  { value: 'opened', label: 'Open / Available' },
  { value: 'depleted', label: 'Fully Administered' },
  { value: 'expired', label: 'Expired (Pending Disposal)' },
  { value: 'disposed', label: 'Disposed / Wasted' },
  { value: 'external', label: 'External Clinic' },
  { value: 'unlinked', label: 'Legacy (No Vial ID)' },
];

export default function NurseVaccineList() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user } = useAuth();
  const canManageVials = ['admin', 'treatment', 'nurse', 'developer'].includes(String(user?.role || '').toLowerCase());
  const [records, setRecords] = useState<AdministeredVaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [stats, setStats] = useState<NurseVaccineListStats>({
    total_administrations: 0,
    today_administrations: 0,
    unique_patients: 0,
    open_vials_count: 0,
    expired_pending_disposal_count: 0,
    total_discarded_portions: 0,
  });

  // Sub-view mode within /inventory/administrations
  const [activeSubView, setActiveSubView] = useState<'administrations' | 'vials' | 'wastages'>('administrations');
  const [vials, setVials] = useState<VaccineVialDetail[]>([]);
  const [vialsTotal, setVialsTotal] = useState(0);
  const [vialsLoading, setVialsLoading] = useState(false);
  const [wastages, setWastages] = useState<WastageLogItem[]>([]);
  const [wastagesTotal, setWastagesTotal] = useState(0);
  const [wastagesLoading, setWastagesLoading] = useState(false);

  // Vial Detail & Action Dialog States
  const [detailTarget, setDetailTarget] = useState<VaccineVialDetail | null>(null);
  const [expireTarget, setExpireTarget] = useState<VaccineVialDetail | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<VaccineVialDetail | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  // Filter States
  const [search, setSearch] = useState('');
  const [vaccineFilter, setVaccineFilter] = useState('all');
  const [doseFilter, setDoseFilter] = useState('all');
  const [vialStatusFilter, setVialStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quickDate, setQuickDate] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const filterPrimaryText = isDark ? '#f8fafc' : '#111827';
  const filterSecondaryText = isDark ? '#94a3b8' : '#64748b';
  const hasFilters = Boolean(
    search || vaccineFilter !== 'all' || doseFilter !== 'all' || vialStatusFilter !== 'all' || dateFrom || dateTo,
  );
  const filterFieldSx = {
    '& .MuiOutlinedInput-root': {
      height: 40,
      bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
      borderRadius: 2,
      '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
      '&:hover fieldset': { borderColor: '#10b981' },
      '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: 1 },
    },
    '& .MuiOutlinedInput-input, & .MuiSelect-select': {
      fontSize: 12.5,
      color: filterPrimaryText,
      fontFamily: "'Poppins', sans-serif",
    },
    '& .MuiInputLabel-root': {
      fontSize: 12.5,
      color: filterSecondaryText,
      fontFamily: "'Poppins', sans-serif",
    },
  };

  // Available vaccines for filter dropdown
  const [availableVaccines, setAvailableVaccines] = useState<string[]>([]);

  // Load available vaccine names on mount
  useEffect(() => {
    void (async () => {
      try {
        const names = await getVaccineNames();
        if (Array.isArray(names)) {
          setAvailableVaccines(names);
        }
      } catch {
        // Fallback
      }
    })();
  }, []);

  // Fetch administration list
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = {
        page: page + 1,
        per_page: rowsPerPage,
      };

      if (search.trim()) params.search = search.trim();
      if (vaccineFilter && vaccineFilter !== 'all') params.vaccine = vaccineFilter;
      if (doseFilter && doseFilter !== 'all') params.dose = doseFilter;
      if (vialStatusFilter && vialStatusFilter !== 'all') params.vial_status = vialStatusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/vaccination-records/administrations', { params });
      const data = res.data;

      setRecords(data.data || []);
      setTotal(data.total || 0);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load vaccine administration list.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, vaccineFilter, doseFilter, vialStatusFilter, dateFrom, dateTo]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const fetchVials = useCallback(async () => {
    setVialsLoading(true);
    try {
      const res = await getVials({
        page: page + 1,
        per_page: rowsPerPage,
        vaccine_type: vaccineFilter !== 'all' ? vaccineFilter : undefined,
        status: ['opened', 'depleted', 'expired', 'disposed'].includes(vialStatusFilter) ? vialStatusFilter : undefined,
        search: search.trim() || undefined,
      });
      setVials(res.data);
      setVialsTotal(res.total);
    } catch {
      setVials([]);
    } finally {
      setVialsLoading(false);
    }
  }, [page, rowsPerPage, vaccineFilter, vialStatusFilter, search]);

  const fetchWastages = useCallback(async () => {
    setWastagesLoading(true);
    try {
      const res = await getWastages({
        page: page + 1,
        per_page: rowsPerPage,
        vaccine_type: vaccineFilter !== 'all' ? vaccineFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setWastages(res.data);
      setWastagesTotal(res.total);
    } catch {
      setWastages([]);
    } finally {
      setWastagesLoading(false);
    }
  }, [page, rowsPerPage, vaccineFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (activeSubView === 'vials') {
      void fetchVials();
    } else if (activeSubView === 'wastages') {
      void fetchWastages();
    }
  }, [activeSubView, fetchVials, fetchWastages]);

  const refreshAllViews = useCallback(() => {
    void fetchRecords();
    if (activeSubView === 'vials') {
      void fetchVials();
    } else if (activeSubView === 'wastages') {
      void fetchWastages();
    }
  }, [activeSubView, fetchRecords, fetchVials, fetchWastages]);

  // Quick Date presets
  const handleQuickDate = (type: 'all' | 'today' | 'week' | 'month') => {
    setQuickDate(type);
    setPage(0);
    const toLocalDateValue = (date: Date) => {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
      return localDate.toISOString().split('T')[0];
    };
    const todayStr = toLocalDateValue(new Date());

    if (type === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (type === 'week' || type === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - (type === 'week' ? 6 : 29));
      setDateFrom(toLocalDateValue(d));
      setDateTo(todayStr);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setVaccineFilter('all');
    setDoseFilter('all');
    setVialStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setQuickDate('all');
    setPage(0);
  };

  const getCategoryVisual = (category: string) => {
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('iii') || catLower.includes('severe')) {
      return { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5', label: 'Cat III (Severe)' };
    }
    if (catLower.includes('ii') || catLower.includes('moderate')) {
      return { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'Cat II (Moderate)' };
    }
    if (catLower.includes('i') || catLower.includes('minor')) {
      return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Cat I (Minor)' };
    }
    return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: category || 'Standard' };
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* ── Header & Stat Cards ── */}
      <Box sx={{ mb: 2.5 }} data-walkthrough="vax-tx-summary-cards" data-tour="vax-tx-summary-cards">
        {/* ── Summary Stats ── */}
        <Grid container spacing={2}>
          {[
            {
              id: 'total',
              label: 'Total Doses Administered',
              value: stats.total_administrations,
              icon: <MedicalIcon sx={{ fontSize: 20 }} />,
              color: '#10b981',
            },
            {
              id: 'today',
              label: 'Administered Today',
              value: stats.today_administrations,
              icon: <CalendarIcon sx={{ fontSize: 20 }} />,
              color: '#10b981',
            },
            {
              id: 'open-vials',
              label: 'Active Open Vials',
              value: stats.open_vials_count ?? 0,
              icon: <VialIcon sx={{ fontSize: 20 }} />,
              color: '#0284c7',
            },
            {
              id: 'discarded-portions',
              label: 'Portions Discarded',
              value: stats.total_discarded_portions ?? 0,
              icon: <DisposeIcon sx={{ fontSize: 20 }} />,
              color: '#ef4444',
            },
          ].map((c) => {
            const hoverShadow = isDark
              ? `0 8px 24px ${c.color}55, 0 0 16px ${c.color}40`
              : `0 8px 22px ${c.color}40, 0 2px 8px ${c.color}25`;

            return (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={c.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: '18px 20px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    minHeight: 100,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'default',
                    transition: 'box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(isDark
                      ? {
                          background: '#111827',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                          '&:hover': {
                            boxShadow: hoverShadow,
                          },
                        }
                      : {
                          background: '#ffffff',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                          '&:hover': {
                            boxShadow: hoverShadow,
                          },
                        }),
                  }}
                >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    bgcolor: isDark ? `${c.color}20` : `${c.color}15`,
                    border: `1px solid ${c.color}40`,
                    boxShadow: `0 0 12px ${c.color}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: c.color,
                    flexShrink: 0,
                  }}
                >
                  {c.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a7f3d0' : '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Poppins', sans-serif" }}>
                    {c.label}
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: isDark ? '#ffffff' : '#064e3b', lineHeight: 1.15, fontFamily: "'Poppins', sans-serif", mt: 0.25, textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none' }}>
                    {c.value}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ── Sub-view Switcher (Administrations / Physical Vials / Wastage Log) ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 1.5,
          px: 1.5,
          borderRadius: 2.5,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          bgcolor: isDark ? '#111827' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Tabs
          value={activeSubView}
          onChange={(_, val) => {
            setActiveSubView(val);
            setPage(0);
          }}
          sx={{
            minHeight: 42,
            '& .MuiTab-root': {
              minHeight: 42,
              fontSize: 12.5,
              fontWeight: 700,
              textTransform: 'none',
              fontFamily: "'Poppins', sans-serif",
            },
          }}
        >
          <Tab label="Patient Administrations" value="administrations" />
          <Tab label={`Physical Vials (${stats.open_vials_count ?? 0} open)`} value="vials" />
          <Tab label={`Wastage & Disposals (${stats.total_discarded_portions ?? 0})`} value="wastages" />
        </Tabs>
        <Typography sx={{ fontSize: 11.5, color: filterSecondaryText }}>
          Unique Patients Served: <strong>{stats.unique_patients}</strong>
        </Typography>
      </Paper>

      {/* ── Filter Bar ── */}
      <Paper
        data-walkthrough="vax-tx-filter-bar"
        data-tour="vax-tx-filter-bar"
        elevation={0}
        sx={{
          p: 1.25,
          mb: 1.5,
          borderRadius: 2.5,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          bgcolor: isDark ? '#111827' : '#ffffff',
          fontFamily: "'Poppins', sans-serif",
          '& .MuiInputBase-root, & .MuiInputBase-input, & .MuiInputLabel-root, & .MuiSelect-select, & .MuiButton-root': {
            fontFamily: "'Poppins', sans-serif",
          },
        }}
      >
        <Grid container spacing={1} sx={{ alignItems: 'center' }}>
          {/* Patient / Case / Batch / Vial Search */}
          <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search patient, case #, batch, or vial ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: filterSecondaryText, fontSize: 17 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={filterFieldSx}
            />
          </Grid>

          {/* Vaccine Filter */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small" sx={filterFieldSx}>
              <Select
                value={vaccineFilter}
                onChange={(e) => {
                  setVaccineFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all" sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>All Vaccines</MenuItem>
                {availableVaccines.map((v) => (
                  <MenuItem key={v} value={v} sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Treatment Filter */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small" sx={filterFieldSx}>
              <Select
                value={doseFilter}
                onChange={(e) => {
                  setDoseFilter(e.target.value);
                  setPage(0);
                }}
              >
                {DOSE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Vial Status Filter */}
          <Grid size={{ xs: 6, sm: 4, md: 2.25 }}>
            <FormControl fullWidth size="small" sx={filterFieldSx}>
              <Select
                value={vialStatusFilter}
                onChange={(e) => {
                  setVialStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                {VIAL_STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Quick Date Preset */}
          <Grid size={{ xs: 6, sm: 4, md: 1.4 }}>
            <FormControl fullWidth size="small" sx={filterFieldSx}>
              <Select
                value={quickDate}
                onChange={(e) => {
                  const value = e.target.value as 'all' | 'today' | 'week' | 'month';
                  handleQuickDate(value);
                }}
              >
                {quickDate === 'custom' && (
                  <MenuItem value="custom" disabled sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
                    Custom Range
                  </MenuItem>
                )}
                <MenuItem value="all" sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>All Time</MenuItem>
                <MenuItem value="today" sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>Today</MenuItem>
                <MenuItem value="week" sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>Last 7 Days</MenuItem>
                <MenuItem value="month" sx={{ fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Clear / Reset Filter Button */}
          <Grid size={{ xs: 12, sm: 4, md: 0.85 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              disabled={!hasFilters}
              onClick={handleResetFilters}
              sx={{
                minWidth: 0,
                px: 1,
                color: filterSecondaryText,
                textTransform: 'none',
                fontSize: 11.5,
                whiteSpace: 'nowrap',
              }}
            >
              Clear
            </Button>
          </Grid>

          {/* Date Range: From & To */}
          <Grid size={{ xs: 6, sm: 4, md: 2.25 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setQuickDate('custom');
                setPage(0);
              }}
              slotProps={{
                htmlInput: { 'aria-label': 'Date from' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 0.5 }}>
                      <Typography sx={{ fontSize: 11.5, color: filterSecondaryText, fontFamily: "'Poppins', sans-serif" }}>
                        From
                      </Typography>
                    </InputAdornment>
                  ),
                },
              }}
              sx={filterFieldSx}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 2.25 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setQuickDate('custom');
                setPage(0);
              }}
              slotProps={{
                htmlInput: { 'aria-label': 'Date to' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 0.5 }}>
                      <Typography sx={{ fontSize: 11.5, color: filterSecondaryText, fontFamily: "'Poppins', sans-serif" }}>
                        To
                      </Typography>
                    </InputAdornment>
                  ),
                },
              }}
              sx={filterFieldSx}
            />
          </Grid>
        </Grid>

      </Paper>

      {(stats.expired_pending_disposal_count ?? 0) > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 1.5, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setVialStatusFilter('expired');
                setPage(0);
              }}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Filter Pending Disposal
            </Button>
          }
        >
          <strong>{stats.expired_pending_disposal_count}</strong> expired open vial(s) still have unused portions awaiting physical disposal confirmation.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {activeSubView === 'administrations' && !loading && records.some((r) => r.is_legacy_unlinked) && (
        <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>
          Historical records created before physical vial tracking was enabled show <strong>Vial ID Not Tracked</strong>. Newly opened vials and new administrations automatically assign a unique Vial ID (e.g., <code>V-101</code>) with portion progress, expiry, and disposal actions.
        </Alert>
      )}

      {activeSubView === 'administrations' ? (
      <>
      {/* ── Data Table ── */}
      <Paper
        data-walkthrough="vax-tx-table"
        data-tour="vax-tx-table"
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)',
          overflow: 'hidden',
          bgcolor: isDark ? 'rgba(14, 24, 18, 0.85)' : '#ffffff',
          boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 4px 16px rgba(16,185,129,0.08)',
        }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc', color: isDark ? '#a7f3d0' : '#475569', fontWeight: 700, fontSize: 12, py: 1.4, borderBottom: isDark ? '1px solid rgba(163, 230, 53, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                <TableCell>Patient</TableCell>
                <TableCell>Diagnosis / Category</TableCell>
                <TableCell>Vaccine &amp; Batch</TableCell>
                <TableCell align="center">Treatment / Route</TableCell>
                <TableCell align="center">Vial Usage</TableCell>
                <TableCell>Administered At</TableCell>
                <TableCell>Administering Staff</TableCell>
                <TableCell align="center">Vial Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#0284c7', mb: 1 }} />
                    <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                      Loading vaccine administration log…
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                      No vaccine administration records found
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>
                      Try clearing or adjusting your search filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((row) => {
                  const catVisual = getCategoryVisual(row.diagnosis_category);

                  return (
                    <TableRow
                      key={row.treatment_id}
                      hover
                      sx={{
                        '&:nth-of-type(even)': { bgcolor: isDark ? 'rgba(34, 197, 94, 0.03)' : '#fafafa' },
                        '& td': {
                          py: 1.4,
                          fontSize: 12.5,
                          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9',
                        },
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(34, 197, 94, 0.08) !important' : 'rgba(16, 185, 129, 0.04) !important',
                        },
                      }}
                    >
                      {/* 1. Patient Info */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f1f5f9',
                              border: isDark ? '1px solid rgba(163, 230, 53, 0.3)' : '1px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              color: isDark ? '#a3e635' : '#334151',
                              flexShrink: 0,
                            }}
                          >
                            {row.patient_name ? row.patient_name[0].toUpperCase() : 'P'}
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: isDark ? '#ffffff' : '#0f172a' }}>
                              {row.patient_name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                              ID #{row.patient_id}
                              {row.case_number ? ` · Case #${row.case_number}` : ''}
                              {row.patient_age ? ` · ${row.patient_age}y` : ''}
                              {row.patient_gender ? ` / ${row.patient_gender[0].toUpperCase()}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* 2. Diagnosis / Category */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          <Chip
                            label={catVisual.label}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10.5,
                              fontWeight: 700,
                              bgcolor: isDark ? `${catVisual.color}25` : catVisual.bg,
                              color: isDark ? '#f8fafc' : catVisual.color,
                              border: `1px solid ${catVisual.border}`,
                              width: 'fit-content',
                            }}
                          />
                          {row.diagnosis_notes && (
                            <Typography sx={{ fontSize: 10.5, color: isDark ? '#94a3b8' : '#64748b', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row.diagnosis_notes}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* 3. Vaccine & Batch */}
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: isDark ? '#ffffff' : '#1e293b' }}>
                            {row.vaccine_brand}
                          </Typography>
                          {row.batch_no && (
                            <Chip
                              label={`Batch: ${row.batch_no}`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 9.5,
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                                color: isDark ? '#cbd5e1' : '#475569',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
                                mt: 0.25,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      {/* 4. Treatment / Route */}
                      <TableCell align="center">
                        <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Chip
                            label={row.dose_label}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: isDark
                                ? (row.dose_number === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)')
                                : (row.dose_number === 0 ? '#ecfdf5' : '#eff6ff'),
                              color: isDark
                                ? (row.dose_number === 0 ? '#a3e635' : '#93c5fd')
                                : (row.dose_number === 0 ? '#059669' : '#1d4ed8'),
                              border: isDark
                                ? `1px solid ${row.dose_number === 0 ? 'rgba(163, 230, 53, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
                                : `1px solid ${row.dose_number === 0 ? '#a7f3d0' : '#bfdbfe'}`,
                            }}
                          />
                          <Typography sx={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', mt: 0.25 }}>
                            {row.route || 'ID'} {row.injection_site ? `· ${row.injection_site}` : ''}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* 5. Vial Usage */}
                      <TableCell align="center">
                        {row.is_external ? (
                          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.35 }}>
                            <Chip
                              label="External · 0 deducted"
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: 11,
                                fontWeight: 700,
                                bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                                color: isDark ? '#93c5fd' : '#1d4ed8',
                                border: isDark ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #bfdbfe',
                              }}
                            />
                            <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                              {row.external_facility_name ? `Transferred-In · ${row.external_facility_name}` : 'Transferred-In'}
                            </Typography>
                          </Box>
                        ) : row.vial ? (
                          (() => {
                            const vial = row.vial;
                            const isExpired = vial.effective_status === 'expired';
                            const isDisposed = vial.effective_status === 'disposed' || vial.discarded_portions > 0;
                            const isDepleted = vial.effective_status === 'depleted';

                            const badgeBg = isDisposed
                              ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2')
                              : isExpired
                              ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb')
                              : isDepleted
                              ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4')
                              : (isDark ? 'rgba(6, 182, 212, 0.2)' : '#ecfeff');

                            const badgeColor = isDisposed
                              ? (isDark ? '#fca5a5' : '#b91c1c')
                              : isExpired
                              ? (isDark ? '#fcd34d' : '#b45309')
                              : isDepleted
                              ? (isDark ? '#a3e635' : '#15803d')
                              : (isDark ? '#67e8f9' : '#0e7490');

                            const badgeBorder = isDisposed
                              ? (isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fca5a5')
                              : isExpired
                              ? (isDark ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fcd34d')
                              : isDepleted
                              ? (isDark ? '1px solid rgba(163, 230, 53, 0.4)' : '1px solid #86efac')
                              : (isDark ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid #a5f3fc');

                            const portionNo = row.vial_portion_number || row.dose_index || 1;
                            const stockLabel = row.inventory_units_used > 0 ? '1 vial deducted' : '0 deducted (shared)';

                            return (
                              <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, maxWidth: 320 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                                  <Chip
                                    icon={<VialIcon sx={{ fontSize: '13px !important' }} />}
                                    label={`Vial ${vial.vial_code}`}
                                    size="small"
                                    clickable
                                    onClick={() => setDetailTarget(vial)}
                                    sx={{
                                      height: 22,
                                      fontSize: 11,
                                      fontWeight: 800,
                                      bgcolor: badgeBg,
                                      color: badgeColor,
                                      border: badgeBorder,
                                      '& .MuiChip-icon': { color: badgeColor },
                                    }}
                                  />
                                  <Chip
                                    label={`Portion ${portionNo}/${vial.total_portions} · ${stockLabel}`}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                                      color: isDark ? '#cbd5e1' : '#475569',
                                      border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
                                    }}
                                  />
                                </Box>

                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b', lineHeight: 1.3 }}>
                                  {vial.summary_text}
                                </Typography>

                                {isDisposed && vial.wastage_reason && (
                                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: isDark ? '#fca5a5' : '#b91c1c' }}>
                                    Wastage reason: {vial.wastage_reason}
                                  </Typography>
                                )}

                                {!isDisposed && isExpired && (
                                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: isDark ? '#fcd34d' : '#b45309' }}>
                                    {vial.expired_reason ? `Expired: ${vial.expired_reason}` : 'Expired — physical disposal pending'}
                                  </Typography>
                                )}

                                {!isDisposed && !isExpired && vial.effective_status === 'opened' && vial.use_by_at && (
                                  <Typography sx={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' }}>
                                    Use by {formatDate(vial.use_by_at)} · {formatTime(vial.use_by_at)}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })()
                        ) : (
                          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                            <Chip
                              label="Vial ID Not Tracked"
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: 10.5,
                                fontWeight: 700,
                                bgcolor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9',
                                color: isDark ? '#cbd5e1' : '#475569',
                                border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
                              }}
                            />
                            <Typography sx={{ fontSize: 10.5, color: isDark ? '#94a3b8' : '#64748b' }}>
                              Legacy record · {row.inventory_units_used > 0 ? `${row.inventory_units_used} vial deducted` : '0 vials deducted'}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>

                      {/* 6. Administered At */}
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#ffffff' : '#1e293b' }}>
                            {row.treatment_date ? formatDate(row.treatment_date) : 'N/A'}
                          </Typography>
                          {row.administered_at && (
                            <Typography sx={{ fontSize: 10.5, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <TimeIcon sx={{ fontSize: 11, color: isDark ? '#a7f3d0' : '#94a3b8' }} />
                              {formatTime(row.administered_at)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* 7. Administering Staff */}
                      <TableCell>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                              color: isDark ? '#93c5fd' : '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            <BadgeIcon sx={{ fontSize: 13 }} />
                          </Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#e2e8f0' : '#334151' }}>
                            {row.administered_by_name}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* 8. Vial Actions */}
                      <TableCell align="center">
                        {row.vial ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={`Inspect Vial ${row.vial.vial_code} details`}>
                              <IconButton
                                size="small"
                                onClick={() => setDetailTarget(row.vial!)}
                                aria-label={`View Vial ${row.vial.vial_code}`}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canManageVials && row.vial.effective_status === 'opened' && row.vial.undisposed_portions > 0 && (
                              <Tooltip title="Mark Expired / Unavailable">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => setExpireTarget(row.vial!)}
                                  aria-label={`Mark Vial ${row.vial.vial_code} expired`}
                                >
                                  <ExpireIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canManageVials && !row.vial.is_disposed && row.vial.undisposed_portions > 0 && (
                              <Tooltip title="Record Physical Disposal">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setDisposeTarget(row.vial!)}
                                  aria-label={`Dispose Vial ${row.vial.vial_code}`}
                                >
                                  <DisposeIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Pagination ── */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 15, 25, 50]}
          sx={{
            borderTop: isDark ? '1px solid rgba(163, 230, 53, 0.15)' : '1px solid #e2e8f0',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: 12,
              color: isDark ? '#94a3b8' : '#64748b',
            },
          }}
        />
      </Paper>
      </>
      ) : activeSubView === 'vials' ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '20px',
            border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)',
            overflow: 'hidden',
            bgcolor: isDark ? 'rgba(14, 24, 18, 0.85)' : '#ffffff',
          }}
        >
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc', fontWeight: 700, fontSize: 12, py: 1.4, textTransform: 'uppercase' } }}>
                  <TableCell>Vial ID</TableCell>
                  <TableCell>Vaccine &amp; Batch</TableCell>
                  <TableCell>Opened &amp; Use-By</TableCell>
                  <TableCell align="center">Portion Outcome</TableCell>
                  <TableCell>Status / Wastage Reason</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vialsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={26} />
                    </TableCell>
                  </TableRow>
                ) : vials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                        No physical vials tracked yet
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>
                        Open a vial in Vaccine Inventory or administer a new vaccination dose to start tracking physical vials.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  vials.map((vial) => {
                    const meta = getVialStatusMeta(vial.effective_status);
                    return (
                      <TableRow key={vial.vial_id} hover>
                        <TableCell>
                          <Chip
                            icon={<VialIcon sx={{ fontSize: '13px !important' }} />}
                            label={`Vial ${vial.vial_code}`}
                            size="small"
                            clickable
                            onClick={() => setDetailTarget(vial)}
                            sx={{ fontWeight: 800, bgcolor: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{vial.vaccine_type}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Batch: {vial.batch_number}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12 }}>
                            Opened: {vial.opened_at ? `${formatDate(vial.opened_at)} · ${formatTime(vial.opened_at)}` : '—'}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {vial.use_by_at ? `Use by: ${formatDate(vial.use_by_at)} · ${formatTime(vial.use_by_at)}` : 'Single-use vial'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{vial.summary_text}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meta.label}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: 10.5, bgcolor: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                          />
                          {(vial.wastage_reason || vial.expired_reason) && (
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.35 }}>
                              {vial.wastage_reason || vial.expired_reason}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                            <Tooltip title="View Vial Details">
                              <IconButton size="small" onClick={() => setDetailTarget(vial)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canManageVials && vial.effective_status === 'opened' && vial.undisposed_portions > 0 && (
                              <Tooltip title="Mark Expired / Unavailable">
                                <IconButton size="small" color="warning" onClick={() => setExpireTarget(vial)}>
                                  <ExpireIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canManageVials && !vial.is_disposed && vial.undisposed_portions > 0 && (
                              <Tooltip title="Record Physical Disposal">
                                <IconButton size="small" color="error" onClick={() => setDisposeTarget(vial)}>
                                  <DisposeIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={vialsTotal}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 15, 25, 50]}
          />
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '20px',
            border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)',
            overflow: 'hidden',
            bgcolor: isDark ? 'rgba(14, 24, 18, 0.85)' : '#ffffff',
          }}
        >
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc', fontWeight: 700, fontSize: 12, py: 1.4, textTransform: 'uppercase' } }}>
                  <TableCell>Vial ID</TableCell>
                  <TableCell>Vaccine &amp; Batch</TableCell>
                  <TableCell align="center">Portions Discarded</TableCell>
                  <TableCell>Wastage Reason</TableCell>
                  <TableCell>Disposed At</TableCell>
                  <TableCell>Staff Member</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {wastagesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={26} />
                    </TableCell>
                  </TableRow>
                ) : wastages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                        No vial wastage records logged yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  wastages.map((w) => (
                    <TableRow key={w.wastage_id} hover>
                      <TableCell>
                        <Chip
                          label={`Vial ${w.vial_code || `V-${w.vial_id}`}`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{w.vaccine_type}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Batch: {w.batch_number}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#b91c1c' }}>
                          {w.portions_discarded} {w.portions_discarded === 1 ? 'portion' : 'portions'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5 }}>{w.reason}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>
                          {formatDate(w.disposed_at)} · {formatTime(w.disposed_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{w.disposed_by_name}</Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={wastagesTotal}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 15, 25, 50]}
          />
        </Paper>
      )}

      <VialDetailDialog
        open={Boolean(detailTarget)}
        vialId={detailTarget?.vial_id ?? null}
        initialVial={detailTarget}
        canManageVials={canManageVials}
        onClose={() => setDetailTarget(null)}
        onRequestExpire={(vial) => setExpireTarget(vial)}
        onRequestDispose={(vial) => setDisposeTarget(vial)}
      />

      <ExpireVialDialog
        open={Boolean(expireTarget)}
        vial={expireTarget}
        onClose={() => setExpireTarget(null)}
        onSuccess={(message) => {
          setSnackbar({ open: true, message });
          setDetailTarget(null);
          refreshAllViews();
        }}
      />

      <DisposeVialDialog
        open={Boolean(disposeTarget)}
        vial={disposeTarget}
        staffName={user?.name || 'Staff'}
        onClose={() => setDisposeTarget(null)}
        onSuccess={(message) => {
          setSnackbar({ open: true, message });
          setDetailTarget(null);
          refreshAllViews();
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
