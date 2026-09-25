import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  MedicalServices as MedicalIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import api from '../../../../services/api';
import { formatDate, formatTime } from '../../../../shared/utils';
import { getVaccineNames } from '../../services/vaccineInventoryService';

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
  doses_per_vial: number;
  inventory_units_used: number;
  is_shared: boolean;
  dose_index: number;
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
}

const DOSE_OPTIONS = [
  { value: 'all', label: 'All Doses' },
  { value: '0', label: 'Day 0 (Initial PEP)' },
  { value: '3', label: 'Day 3' },
  { value: '7', label: 'Day 7' },
  { value: '28', label: 'Day 28' },
  { value: '90', label: 'Booster 1' },
  { value: '365', label: 'Booster 2' },
];

export default function NurseVaccineList() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [vaccineFilter, setVaccineFilter] = useState('all');
  const [doseFilter, setDoseFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quickDate, setQuickDate] = useState<'all' | 'today' | 'week'>('all');

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
  }, [page, rowsPerPage, search, vaccineFilter, doseFilter, dateFrom, dateTo]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  // Quick Date presets
  const handleQuickDate = (type: 'all' | 'today' | 'week') => {
    setQuickDate(type);
    setPage(0);
    const todayStr = new Date().toISOString().split('T')[0];

    if (type === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
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
      <Box sx={{ mb: 3 }}>
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
              id: 'patients',
              label: 'Total Patients Served',
              value: stats.unique_patients,
              icon: <PersonIcon sx={{ fontSize: 20 }} />,
              color: '#f59e0b',
            },
          ].map((c) => {
            const hoverShadow = isDark
              ? c.color === '#f59e0b'
                ? '0 8px 24px rgba(245, 158, 11, 0.35), 0 0 16px rgba(245, 158, 11, 0.25)'
                : '0 8px 24px rgba(16, 185, 129, 0.35), 0 0 16px rgba(16, 185, 129, 0.25)'
              : c.color === '#f59e0b'
              ? '0 8px 22px rgba(245, 158, 11, 0.28), 0 2px 8px rgba(245, 158, 11, 0.16)'
              : '0 8px 22px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.16)';

            return (
              <Grid size={{ xs: 12, sm: 4 }} key={c.id}>
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

      {/* ── Filter Bar ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '20px',
          border: isDark ? '1px solid rgba(163, 230, 53, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
          bgcolor: isDark ? 'rgba(14, 24, 18, 0.85)' : '#ffffff',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(16,185,129,0.06)',
        }}
      >
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          {/* Patient Search */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search patient or case #…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: isDark ? '#a7f3d0' : '#94a3b8', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                  sx: { fontSize: 13, borderRadius: '8px' },
                },
              }}
            />
          </Grid>

          {/* Vaccine Filter */}
          <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: 13 }}>Vaccine</InputLabel>
              <Select
                value={vaccineFilter}
                label="Vaccine"
                onChange={(e) => {
                  setVaccineFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ fontSize: 13, borderRadius: '8px' }}
              >
                <MenuItem value="all" sx={{ fontSize: 13 }}>All Vaccines</MenuItem>
                {availableVaccines.map((v) => (
                  <MenuItem key={v} value={v} sx={{ fontSize: 13 }}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Dose Filter */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: 13 }}>Dose</InputLabel>
              <Select
                value={doseFilter}
                label="Dose"
                onChange={(e) => {
                  setDoseFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ fontSize: 13, borderRadius: '8px' }}
              >
                {DOSE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Range: From */}
          <Grid size={{ xs: 6, sm: 3, md: 1.75 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date from"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setQuickDate('all');
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true }, input: { style: { fontSize: 12.5 } } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
          </Grid>

          {/* Date Range: To */}
          <Grid size={{ xs: 6, sm: 3, md: 1.75 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date to"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setQuickDate('all');
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true }, input: { style: { fontSize: 12.5 } } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
          </Grid>

          {/* Clear / Reset Filter Button */}
          <Grid size={{ xs: 12, sm: 6, md: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Reset all filters">
              <Button
                variant="outlined"
                size="small"
                onClick={handleResetFilters}
                startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                sx={{
                  height: 38,
                  minWidth: 0,
                  px: 1.5,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: '8px',
                  borderColor: isDark ? 'rgba(163, 230, 53, 0.3)' : '#e2e8f0',
                  color: isDark ? '#a7f3d0' : '#64748b',
                  '&:hover': {
                    borderColor: '#10b981',
                    color: '#10b981',
                    bgcolor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                  },
                }}
              >
                Reset
              </Button>
            </Tooltip>
          </Grid>
        </Grid>

        {/* Quick Date Chips */}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
            Quick Date:
          </Typography>
          <Chip
            label="All Time"
            size="small"
            clickable
            onClick={() => handleQuickDate('all')}
            sx={{
              height: 24,
              fontSize: 11,
              fontWeight: 600,
              borderRadius: '6px',
              bgcolor: quickDate === 'all' && !dateFrom && !dateTo ? (isDark ? 'rgba(59, 130, 246, 0.25)' : '#0284c7') : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
              color: quickDate === 'all' && !dateFrom && !dateTo ? (isDark ? '#93c5fd' : '#ffffff') : (isDark ? '#94a3b8' : '#475569'),
              border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            }}
          />
          <Chip
            label="Today"
            size="small"
            clickable
            onClick={() => handleQuickDate('today')}
            sx={{
              height: 24,
              fontSize: 11,
              fontWeight: 600,
              borderRadius: '6px',
              bgcolor: quickDate === 'today' ? (isDark ? 'rgba(59, 130, 246, 0.25)' : '#0284c7') : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
              color: quickDate === 'today' ? (isDark ? '#93c5fd' : '#ffffff') : (isDark ? '#94a3b8' : '#475569'),
              border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            }}
          />
          <Chip
            label="Last 7 Days"
            size="small"
            clickable
            onClick={() => handleQuickDate('week')}
            sx={{
              height: 24,
              fontSize: 11,
              fontWeight: 600,
              borderRadius: '6px',
              bgcolor: quickDate === 'week' ? (isDark ? 'rgba(59, 130, 246, 0.25)' : '#0284c7') : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
              color: quickDate === 'week' ? (isDark ? '#93c5fd' : '#ffffff') : (isDark ? '#94a3b8' : '#475569'),
              border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            }}
          />
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Data Table ── */}
      <Paper
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
                <TableCell>Vaccine & Batch</TableCell>
                <TableCell align="center">Dose / Route</TableCell>
                <TableCell align="center">Vaccine Usage (Vial Count)</TableCell>
                <TableCell>Administered At</TableCell>
                <TableCell>Administering Staff</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#0284c7', mb: 1 }} />
                    <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                      Loading vaccine administration log…
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
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

                      {/* 4. Dose / Route */}
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

                      {/* 5. Vaccine Usage (Vial Count - Matches Inventory 1/3 tracking) */}
                      <TableCell align="center">
                        <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                          {/* Vial Fraction Usage Badge */}
                          <Chip
                            label={`${row.fraction_used} used`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: 11,
                              fontWeight: 800,
                              bgcolor: isDark
                                ? (row.is_shared ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.2)')
                                : (row.is_shared ? '#ecfeff' : '#f0fdf4'),
                              color: isDark
                                ? (row.is_shared ? '#67e8f9' : '#a3e635')
                                : (row.is_shared ? '#0e7490' : '#15803d'),
                              border: isDark
                                ? `1px solid ${row.is_shared ? 'rgba(6, 182, 212, 0.4)' : 'rgba(163, 230, 53, 0.4)'}`
                                : `1px solid ${row.is_shared ? '#a5f3fc' : '#86efac'}`,
                            }}
                          />
                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: isDark ? (row.is_shared ? '#67e8f9' : '#a3e635') : (row.is_shared ? '#0891b2' : '#166534') }}>
                            {row.is_external
                              ? 'Transferred-In'
                              : row.is_shared
                              ? `Shared Open Vial (Dose ${row.dose_index} of ${row.doses_per_vial})`
                              : `New Vial Opened (Dose 1 of ${row.doses_per_vial})`}
                          </Typography>
                        </Box>
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
    </Box>
  );
}
