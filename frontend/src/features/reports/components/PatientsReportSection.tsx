import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { DownloadOutlined, Refresh } from '@mui/icons-material';
import api from '../../../services/api';

const POPPINS = "'Poppins', sans-serif";

const panelSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: 'none',
  bgcolor: 'background.paper',
  fontFamily: POPPINS,
};

export interface Patient {
  id: number;
  patient_number?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  contact_number: string;
  created_at: string;
}

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

export interface PatientsReportSectionProps {
  rolePrefix?: string;
  initialPatients?: Patient[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function PatientsReportSection({
  rolePrefix = 'admin',
  initialPatients,
  loading: externalLoading,
  onRefresh: externalOnRefresh,
}: PatientsReportSectionProps) {
  const [internalPatients, setInternalPatients] = useState<Patient[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const isControlled = initialPatients !== undefined;
  const patients = isControlled ? initialPatients : internalPatients;
  const loading = isControlled ? (externalLoading ?? false) : internalLoading;

  // Filters & Search
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patientPeriodFilter, setPatientPeriodFilter] = useState<'ALL' | 'today' | 'this_week' | 'this_month'>('ALL');
  const [patientMonthFilter, setPatientMonthFilter] = useState<string>('ALL');
  const [patientYearFilter, setPatientYearFilter] = useState<string>('ALL');
  const [patientPage, setPatientPage] = useState<number>(1);

  const loadPatients = async () => {
    if (isControlled && externalOnRefresh) {
      externalOnRefresh();
      return;
    }
    setInternalLoading(true);
    setError('');
    try {
      const res = await api.get('/patients', { params: { per_page: 500 } });
      const raw = res.data?.data ?? res.data ?? [];
      setInternalPatients(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to load patient report data:', err);
      setError('Failed to load patient registry records. Please try again.');
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (!isControlled) {
      loadPatients();
    }
  }, [isControlled]);

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

  const exportCsv = () => {
    setExporting(true);
    try {
      const headers = ['#', 'First Name', 'Last Name', 'Date of Birth', 'Contact Number', 'Registered On'];
      const csvRows = filteredPatients.map((p, i) => [
        i + 1,
        `"${(p.first_name || '').replace(/"/g, '""')}"`,
        `"${(p.last_name || '').replace(/"/g, '""')}"`,
        `"${p.date_of_birth || ''}"`,
        `"${p.contact_number || ''}"`,
        `"${p.created_at || ''}"`,
      ].join(','));

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${rolePrefix}-patients-${dateString(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setExporting(false);
    }
  };

  const pageSize = 15;
  const paginatedPatients = useMemo(() => {
    const start = (patientPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, patientPage]);

  return (
    <Box sx={{ fontFamily: POPPINS }}>
      {/* ── Filter Bar ────────────────────────────────────────── */}
      <Paper
        component="div"
        elevation={0}
        sx={{
          ...panelSx,
          p: 2,
          mb: 3,
        }}
      >
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
            onClick={loadPatients}
            disabled={loading}
            sx={{ ml: { sm: 'auto' }, fontFamily: POPPINS }}
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5, fontFamily: POPPINS }}>
          {`Showing ${filteredPatients.length} of ${patients.length} registered patient records.`}
        </Typography>
      </Paper>

      {/* ── Error Notification ──────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, fontFamily: POPPINS }}>
          {error}
        </Alert>
      )}

      {/* ── Patient Records Table Panel ─────────────────────────── */}
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
              onClick={exportCsv}
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
    </Box>
  );
}
