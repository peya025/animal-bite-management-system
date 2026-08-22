import { useState, useEffect } from 'react';
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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Healing as VaccinationIcon,
  Warning as OverdueIcon,
  Schedule as UpcomingIcon,
  CheckCircle as CompletedIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  EventNote as CalendarIcon,
} from '@mui/icons-material';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import StatCard from '../../../components/common/StatCard/StatCard';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import api from '../../../shared/services/api';

interface Patient {
  patient_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age: number;
  gender: string;
  contact_number?: string;
  address?: string;
  appointments?: any[];
  latest_treatment_record?: any;
}

export default function NursePatientListPage() {
  const [tab, setTab] = useState<'due_today' | 'online' | 'upcoming' | 'overdue' | 'all'>('due_today');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showForm3, setShowForm3] = useState(false);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  // Stats for top summary cards
  const [kpiStats, setKpiStats] = useState({
    dueToday: 0,
    online: 0,
    upcoming: 0,
    overdue: 0,
    total: 0,
  });

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/nurse/patients', {
        params: {
          tab,
          search: search || undefined,
          page: page + 1,
          per_page: rowsPerPage,
        },
      });
      const dataList = response.data.data || [];
      setPatients(dataList);
      setTotalCount(response.data.total || 0);

      setKpiStats({
        dueToday: response.data.due_today_count ?? 0,
        online: response.data.online_count ?? 0,
        upcoming: response.data.upcoming_count ?? 0,
        overdue: response.data.overdue_count ?? 0,
        total: response.data.total || dataList.length,
      });
    } catch (error: any) {
      toast(error.response?.data?.message || 'Failed to load patients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (patient: Patient) => {
    setCheckingInId(patient.patient_id);
    try {
      const appt = (patient as any).appointments?.[0];
      const isConsultation = appt?.appointment_type === 'consultation';
      const res = await api.post('/queue', {
        patient_id: patient.patient_id,
        visit_type: isConsultation ? 'consultation' : 'vaccination',
        queue_category: 'appointment',
        priority: 'normal',
      });
      toast(`Patient ${patient.last_name}, ${patient.first_name} checked in as Queue #${res.data?.queue_number || 'OK'}!`);
      loadPatients();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to add patient to queue', 'error');
    } finally {
      setCheckingInId(null);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [tab, page, rowsPerPage]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) loadPatients();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tab, page, rowsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 0) loadPatients();
      else setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const getDoseStatus = (patient: Patient) => {
    const record = patient.latest_treatment_record;
    if (!record || !record.dose_number) return { label: 'No doses', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
    
    const doseMap: Record<number, string> = {
      0: 'Day 0 (Initial)',
      3: 'Day 3 (Dose 1)',
      7: 'Day 7 (Dose 2)',
      14: 'Day 14 (Dose 3)',
      28: 'Day 28 (Dose 4)',
      90: 'Booster 1',
      365: 'Booster 2',
    };

    return {
      label: doseMap[record.dose_number] || `Dose ${record.dose_number}`,
      bg: '#d1fae5',
      color: '#065f46',
      border: '#a7f3d0',
    };
  };

  const getNextAppointment = (patient: Patient) => {
    if (!patient.appointments || patient.appointments.length === 0) return null;
    const upcoming = patient.appointments.find((a: any) => a.status === 'scheduled');
    return upcoming;
  };

  const getVaccinationStatus = (patient: Patient) => {
    const activeQueue = (patient as any).queues?.[0];
    if (activeQueue) {
      if (activeQueue.status === 'waiting') {
        return { label: 'In Queue (Waiting)', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
      }
      if (activeQueue.status === 'in_consultation') {
        return { label: 'In Consultation', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
      }
    }

    const record = patient.latest_treatment_record;
    const appt = getNextAppointment(patient);

    if (!record || !record.dose_number) {
      return { label: 'Registered', color: '#4b5563', bg: '#f3f4f6', border: '#e5e7eb' };
    }

    if (record.dose_number >= 28 && !appt) {
      return { label: 'Completed', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
    }

    if (appt) {
      const apptDate = new Date(appt.appointment_date);
      const today = new Date();
      if (apptDate < today && apptDate.toDateString() !== today.toDateString()) {
        return { label: 'Overdue', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
      }
    }

    return { label: 'In Progress', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const columns: ColumnDef<Patient>[] = [
    {
      key: 'patient_id',
      header: 'PATIENT #',
      width: '100px',
      render: (patient) => (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.25, bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 1.5, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#374151' }}>
          #{patient.patient_id}
        </Box>
      ),
    },
    {
      key: 'name',
      header: 'PATIENT NAME',
      render: (patient) => {
        const isOnline = Boolean(
          (patient as any).appointments?.some((a: any) => a.booked_by_account_id) ||
          (patient as any).bite_intakes?.length ||
          ((patient as any).accounts && (patient as any).accounts.length > 0)
        );
        return (
          <Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.25 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827', lineHeight: 1.3 }}>
                {patient.last_name}, {patient.first_name} {patient.middle_name || ''}
              </Typography>
              {isOnline ? (
                <Chip
                  label="Online"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    bgcolor: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                  }}
                />
              ) : (
                <Chip
                  label="Walk-in"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    bgcolor: '#f3f4f6',
                    color: '#4b5563',
                    border: '1px solid #e5e7eb',
                  }}
                />
              )}
            </Stack>
            <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
              {patient.age}y · {patient.gender} {patient.contact_number ? `· ${patient.contact_number}` : ''}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'last_dose',
      header: 'LAST DOSE',
      render: (patient) => {
        const status = getDoseStatus(patient);
        const record = patient.latest_treatment_record;
        return (
          <Box>
            <Chip
              label={status.label}
              size="small"
              sx={{ bgcolor: status.bg, color: status.color, border: `1px solid ${status.border}`, fontSize: 11.5, fontWeight: 600, height: 24, mb: 0.25 }}
            />
            {record?.treatment_date && (
              <Typography sx={{ fontSize: 11, color: '#6b7280', display: 'block' }}>
                Administered: {new Date(record.treatment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (patient) => {
        const status = getVaccinationStatus(patient);
        return (
          <Chip
            label={status.label}
            size="small"
            sx={{ bgcolor: status.bg, color: status.color, border: `1px solid ${status.border}`, fontSize: 11.5, fontWeight: 600, height: 24 }}
          />
        );
      },
    },
    {
      key: 'next_appointment',
      header: 'NEXT APPOINTMENT',
      render: (patient) => {
        const appt = getNextAppointment(patient);
        if (!appt) {
          return <Typography sx={{ fontSize: 12, color: '#9ca3af' }}>—</Typography>;
        }

        const apptDate = new Date(appt.scheduled_date || appt.appointment_date);
        const todayDate = new Date();
        const isToday = apptDate.toDateString() === todayDate.toDateString();
        const isPast = apptDate < todayDate && !isToday;

        const doseMap: Record<number, string> = {
          3: 'Day 3 (Dose 1)',
          7: 'Day 7 (Dose 2)',
          14: 'Day 14 (Dose 3)',
          28: 'Day 28 (Dose 4)',
          90: 'Booster 1',
          365: 'Booster 2',
        };

        return (
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: isPast ? '#991b1b' : isToday ? '#047857' : '#111827' }}>
              {doseMap[appt.dose_number] || (appt.appointment_type === 'consultation' ? 'Initial Consultation' : `Dose ${appt.dose_number || '1'}`)}
            </Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: isToday || isPast ? 700 : 400, color: isPast ? '#dc2626' : isToday ? '#059669' : '#6b7280' }}>
              {isToday
                ? `Scheduled Today (${appt.time_slot || 'regular'})`
                : isPast
                ? `${Math.floor((todayDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue`
                : apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'right',
      render: (patient) => {
        const activeQueue = (patient as any).queues?.[0];
        const appt = (patient as any).appointments?.[0];
        const canCheckIn = !activeQueue && appt?.status === 'scheduled';

        return (
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
            {canCheckIn && (
              <Button
                size="small"
                variant="contained"
                disabled={checkingInId === patient.patient_id}
                onClick={() => handleCheckIn(patient)}
                sx={{
                  fontSize: 12,
                  py: 0.4,
                  px: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '6px',
                  bgcolor: '#10b981',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#059669' },
                }}
              >
                {checkingInId === patient.patient_id ? 'Checking in...' : 'Check In'}
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSelectedPatient(patient);
                setShowForm3(true);
              }}
              startIcon={<VaccinationIcon fontSize="small" />}
              sx={{
                fontSize: 12,
                py: 0.4,
                px: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '6px',
                borderColor: '#bbf7d0',
                color: '#166534',
                bgcolor: '#f0fdf4',
                '&:hover': { bgcolor: '#dcfce7', borderColor: '#86efac' },
              }}
            >
              Record Dose (Form 3)
            </Button>
            <Tooltip title="View Treatment Record Card">
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedPatient(patient);
                  setShowForm3(true);
                }}
                sx={{ color: '#6b7280', bgcolor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 1.5, width: 32, height: 32, '&:hover': { bgcolor: '#eff6ff', color: '#2563eb' } }}
              >
                <ViewIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  // Filter shown list by optional status filter dropdown
  const filteredPatients = patients.filter((p) => {
    if (!statusFilter) return true;
    const st = getVaccinationStatus(p);
    if (statusFilter === 'waiting') return st.label.includes('Waiting');
    if (statusFilter === 'in_progress') return st.label === 'In Progress' || st.label === 'In Consultation';
    if (statusFilter === 'overdue') return st.label === 'Overdue';
    if (statusFilter === 'completed') return st.label === 'Completed';
    return true;
  });

  return (
    <Box sx={{ px: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '25px',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              color: 'var(--text-h)',
              margin: '0 0 4px 0',
            }}
          >
            Treatment Patient List
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d', margin: 0 }}>
            {today} · Track vaccination schedules, online appointments, doses, and follow-ups
          </Typography>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px' }}>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Nurse Patients</span>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}
          <Tooltip title="Refresh Patients List">
            <IconButton onClick={loadPatients} disabled={loading} sx={{ bgcolor: '#ffffff', border: '1px solid #e0eae3', borderRadius: 2 }}>
              <RefreshIcon sx={{ fontSize: 20, color: 'var(--primary)' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Top Circular Ring Summary Cards (Matching Vaccine Inventory & Queue Design) ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard label="DUE TODAY" value={kpiStats.dueToday} color="info" total={totalCount || 1} loading={loading} />
        <StatCard label="ONLINE APPOINTMENTS" value={kpiStats.online} color="primary" total={totalCount || 1} loading={loading} />
        <StatCard label="UPCOMING DOSES" value={kpiStats.upcoming} color="success" total={totalCount || 1} loading={loading} />
        <StatCard label="OVERDUE DOSES" value={kpiStats.overdue} color="error" total={totalCount || 1} loading={loading} />
        <StatCard label="TOTAL TRACKED" value={totalCount} color="warning" total={totalCount || 1} loading={loading} />
      </Box>

      {/* ── Tabs Bar with Soft Count Badges ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', background: 'background.paper', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(0); }}
          sx={{
            borderBottom: '1px solid #f3f4f6',
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13.5,
              minHeight: 48,
            },
            '& .Mui-selected': { color: '#10b981' },
            '& .MuiTabs-indicator': { bgcolor: '#10b981', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <span>Due Today</span>
                <Box sx={{ bgcolor: tab === 'due_today' ? '#eff6ff' : '#f3f4f6', color: tab === 'due_today' ? '#2563eb' : '#6b7280', px: 1, py: 0.1, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {kpiStats.dueToday}
                </Box>
              </Stack>
            }
            value="due_today"
            icon={<UpcomingIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <span>Online Bookings</span>
                <Box sx={{ bgcolor: tab === 'online' ? '#e0f2fe' : '#f3f4f6', color: tab === 'online' ? '#0284c7' : '#6b7280', px: 1, py: 0.1, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {kpiStats.online}
                </Box>
              </Stack>
            }
            value="online"
            icon={<CalendarIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <span>Upcoming</span>
                <Box sx={{ bgcolor: tab === 'upcoming' ? '#ecfdf5' : '#f3f4f6', color: tab === 'upcoming' ? '#047857' : '#6b7280', px: 1, py: 0.1, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {kpiStats.upcoming}
                </Box>
              </Stack>
            }
            value="upcoming"
            icon={<CalendarIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <span>Overdue</span>
                <Box sx={{ bgcolor: tab === 'overdue' ? '#fef2f2' : '#f3f4f6', color: tab === 'overdue' ? '#dc2626' : '#6b7280', px: 1, py: 0.1, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {kpiStats.overdue}
                </Box>
              </Stack>
            }
            value="overdue"
            icon={<OverdueIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <span>All Patients</span>
                <Box sx={{ bgcolor: tab === 'all' ? '#e0e7ff' : '#f3f4f6', color: tab === 'all' ? '#3730a3' : '#6b7280', px: 1, py: 0.1, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {totalCount}
                </Box>
              </Stack>
            }
            value="all"
            icon={<CompletedIcon fontSize="small" />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* ── Patient Table Container ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', background: 'background.paper', p: 3 }}>
        {/* Search & Filter Bar */}
        <Grid container spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, patient number, or contact phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#f9fafb',
                  borderRadius: 2,
                  fontSize: 13,
                  '& fieldset': { borderColor: '#e5e7eb' },
                  '&:hover fieldset': { borderColor: '#9ca3af' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '1.5px' },
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: 13 }}>Status Filter</InputLabel>
              <Select
                label="Status Filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ bgcolor: '#f9fafb', borderRadius: 2, fontSize: 13, '& fieldset': { borderColor: '#e5e7eb' } }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="waiting">In Queue (Waiting)</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <DataTable
          columns={columns}
          rows={filteredPatients}
          loading={loading}
          skeletonRows={rowsPerPage}
          rowKey={(p) => p.patient_id}
          emptyIcon={<VaccinationIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
          emptyTitle="No patients found"
          emptySubtitle={tab === 'due_today' ? 'No patients scheduled for dose administration today' : 'Try adjusting your search or filters'}
        />

        <TablePager
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        />
      </Paper>

      {/* Form 3 Tagoloan Treatment Card Modal */}
      {showForm3 && selectedPatient && (
        <VaccinationRecordForm
          open={showForm3}
          entry={{
            patient: {
              patient_id: selectedPatient.patient_id,
              name: `${selectedPatient.last_name}, ${selectedPatient.first_name}`,
              last_name: selectedPatient.last_name,
              first_name: selectedPatient.first_name,
              middle_name: selectedPatient.middle_name,
              age: selectedPatient.age,
              gender: selectedPatient.gender,
              address: selectedPatient.address,
            },
            queue_id: null,
          }}
          onClose={() => {
            setShowForm3(false);
            setSelectedPatient(null);
          }}
          onSave={() => {
            toast('Vaccination record saved successfully');
            loadPatients();
            setShowForm3(false);
            setSelectedPatient(null);
          }}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
