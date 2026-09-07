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
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Vaccines as VaccineIcon,
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 1 }}>
              <VaccineIcon sx={{ color: '#0284c7', fontSize: 24 }} />
              Nurse Vaccine Administration List
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.25 }}>
              Track patients who received rabies PEP vaccines, dose progression, administering staff, and vial deductions (1/3 vial shared tracking).
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={fetchRecords}
            disabled={loading}
            startIcon={<RefreshIcon sx={{ fontSize: 16, ...(loading && { animation: 'spin 0.8s linear infinite' }) }} />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 2,
              px: 2,
              borderColor: '#d1d5db',
              color: '#374151',
              '&:hover': { borderColor: '#0284c7', color: '#0284c7', bgcolor: '#f0f9ff' },
            }}
          >
            {loading ? 'Refreshing…' : 'Refresh Log'}
          </Button>
        </Box>

        {/* ── Summary Stats ── */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                }}
              >
                <MedicalIcon />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  Total Doses Administered
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {stats.total_administrations}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <CalendarIcon />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  Administered Today
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>
                  {stats.today_administrations}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: '#fef3c7',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                }}
              >
                <PersonIcon />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  Unique Patients Served
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {stats.unique_patients}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ── Filter Bar ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
        }}
      >
        <Grid container spacing={1.5} alignItems="center">
          {/* Patient Search */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search patient or case #…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                  </InputAdornment>
                ),
                sx: { fontSize: 13, borderRadius: 2 },
              }}
            />
          </Grid>

          {/* Vaccine Filter */}
          <Grid item xs={6} sm={3} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: 13 }}>Vaccine</InputLabel>
              <Select
                value={vaccineFilter}
                label="Vaccine"
                onChange={(e) => {
                  setVaccineFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ fontSize: 13, borderRadius: 2 }}
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
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: 13 }}>Dose</InputLabel>
              <Select
                value={doseFilter}
                label="Dose"
                onChange={(e) => {
                  setDoseFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ fontSize: 13, borderRadius: 2 }}
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
          <Grid item xs={6} sm={3} md={1.75}>
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
              InputLabelProps={{ shrink: true }}
              inputProps={{ style: { fontSize: 12.5 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>

          {/* Date Range: To */}
          <Grid item xs={6} sm={3} md={1.75}>
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
              InputLabelProps={{ shrink: true }}
              inputProps={{ style: { fontSize: 12.5 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>

          {/* Reset button */}
          <Grid item xs={12} sm={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Reset all filters">
              <Button
                variant="text"
                onClick={handleResetFilters}
                size="small"
                sx={{ textTransform: 'none', color: '#64748b', fontSize: 12, minWidth: 60 }}
              >
                Clear
              </Button>
            </Tooltip>
          </Grid>
        </Grid>

        {/* Quick Date Chips */}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>
            Quick Date:
          </Typography>
          <Chip
            label="All Time"
            size="small"
            clickable
            onClick={() => handleQuickDate('all')}
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: quickDate === 'all' && !dateFrom && !dateTo ? '#0284c7' : '#f1f5f9',
              color: quickDate === 'all' && !dateFrom && !dateTo ? '#ffffff' : '#475569',
            }}
          />
          <Chip
            label="Today"
            size="small"
            clickable
            onClick={() => handleQuickDate('today')}
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: quickDate === 'today' ? '#0284c7' : '#f1f5f9',
              color: quickDate === 'today' ? '#ffffff' : '#475569',
            }}
          />
          <Chip
            label="Last 7 Days"
            size="small"
            clickable
            onClick={() => handleQuickDate('week')}
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: quickDate === 'week' ? '#0284c7' : '#f1f5f9',
              color: quickDate === 'week' ? '#ffffff' : '#475569',
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
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          bgcolor: '#ffffff',
        }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 12, py: 1.2 } }}>
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
                        '&:nth-of-type(even)': { bgcolor: '#fafafa' },
                        '& td': { py: 1.2, fontSize: 12.5 },
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
                              bgcolor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#334151',
                              flexShrink: 0,
                            }}
                          >
                            {row.patient_name ? row.patient_name[0].toUpperCase() : 'P'}
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                              {row.patient_name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#64748b' }}>
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
                              bgcolor: catVisual.bg,
                              color: catVisual.color,
                              border: `1px solid ${catVisual.border}`,
                              width: 'fit-content',
                            }}
                          />
                          {row.diagnosis_notes && (
                            <Typography sx={{ fontSize: 10.5, color: '#64748b', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row.diagnosis_notes}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* 3. Vaccine & Batch */}
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: '#1e293b' }}>
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
                                bgcolor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
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
                              bgcolor: row.dose_number === 0 ? '#ecfdf5' : '#eff6ff',
                              color: row.dose_number === 0 ? '#059669' : '#1d4ed8',
                              border: `1px solid ${row.dose_number === 0 ? '#a7f3d0' : '#bfdbfe'}`,
                            }}
                          />
                          <Typography sx={{ fontSize: 10, color: '#64748b', mt: 0.25 }}>
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
                              bgcolor: row.is_shared ? '#ecfeff' : '#f0fdf4',
                              color: row.is_shared ? '#0e7490' : '#15803d',
                              border: `1px solid ${row.is_shared ? '#a5f3fc' : '#86efac'}`,
                            }}
                          />
                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: row.is_shared ? '#0891b2' : '#166534' }}>
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
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                            {row.treatment_date ? formatDate(row.treatment_date) : 'N/A'}
                          </Typography>
                          {row.administered_at && (
                            <Typography sx={{ fontSize: 10.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <TimeIcon sx={{ fontSize: 11, color: '#94a3b8' }} />
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
                              bgcolor: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            <BadgeIcon sx={{ fontSize: 13 }} />
                          </Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334151' }}>
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
            borderTop: '1px solid #e2e8f0',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: 12,
              color: '#64748b',
            },
          }}
        />
      </Paper>
    </Box>
  );
}
