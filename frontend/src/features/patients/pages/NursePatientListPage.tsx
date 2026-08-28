import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  SmartPhone01Icon,
  Calendar03Icon,
  AlertCircleIcon,
  UserMultiple02Icon,
  CheckmarkCircle02Icon,
  Medicine01Icon,
  Search01Icon,
  RefreshIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import StatCard from '../../../components/common/StatCard/StatCard';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import api from '../../../shared/services/api';

interface Patient {
  patient_id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  age: number;
  contact_number?: string;
  address?: string;
  emergency_contact?: string;
  membership_type?: string;
  created_at: string;
  status: string;
  appointments?: any[];
  queues?: any[];
  latest_treatment_record?: any;
}

export default function NursePatientListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'due_today' | 'online' | 'upcoming' | 'overdue' | 'all'>('due_today');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showForm3, setShowForm3] = useState(false);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  const [checkInModalData, setCheckInModalData] = useState<{
    patientName: string;
    patientNumber: string;
    queueNumber: number | string;
    station: string;
  } | null>(null);

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
      const isConsultation = !appt || appt?.appointment_type === 'consultation' || appt?.appointment_type === 'checkup' || (patient as any).bite_intakes?.length > 0;
      const visitType = isConsultation ? 'new_case' : 'vaccination';
      const res = await api.post('/queue', {
        patient_id: patient.patient_id,
        visit_type: visitType,
        queue_category: 'appointment',
        priority: 'normal',
      });
      const station = visitType === 'new_case' ? 'Triage Queue (Doctor Assessment)' : 'Treatment Queue (Vaccination)';
      setCheckInModalData({
        patientName: `${patient.last_name}, ${patient.first_name}`,
        patientNumber: patient.patient_number,
        queueNumber: res.data?.queue_number || '1',
        station,
      });
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
    if (!record || record.dose_number === null || record.dose_number === undefined) {
      return { label: 'No doses', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
    }
    
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
    const scheduledAppts = patient.appointments.filter((a: any) => a.status === 'scheduled');
    if (scheduledAppts.length === 0) return null;
    // Prefer the soonest upcoming scheduled appointment (e.g. today or future)
    scheduledAppts.sort((a: any, b: any) => {
      const dateA = new Date(a.appointment_date || a.scheduled_date || 0).getTime();
      const dateB = new Date(b.appointment_date || b.scheduled_date || 0).getTime();
      return dateA - dateB;
    });
    return scheduledAppts[0];
  };

  const getVaccinationStatus = (patient: Patient) => {
    const activeQueue = (patient as any).queues?.[0];
    const appt = getNextAppointment(patient);
    if (activeQueue) {
      const apptDate = appt ? new Date(appt.appointment_date || appt.scheduled_date) : null;
      const todayDate = new Date();
      const isPastAppt = apptDate && apptDate < todayDate && apptDate.toDateString() !== todayDate.toDateString();
      const lateDays = isPastAppt ? Math.floor((todayDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      if (activeQueue.status === 'waiting') {
        if (isPastAppt) {
          return { label: `In Queue (Waiting · ${lateDays}d Late)`, color: '#92400e', bg: '#fef3c7', border: '#fde68a' };
        }
        return { label: 'In Queue (Waiting)', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
      }
      if (activeQueue.status === 'in_consultation' || activeQueue.status === 'called' || activeQueue.status === 'serving') {
        if (isPastAppt) {
          return { label: `In Triage (${lateDays}d Late)`, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
        }
        return { label: 'In Consultation', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
      }
    }

    const record = patient.latest_treatment_record;

    if (!record || record.dose_number === null || record.dose_number === undefined) {
      if (appt) {
        const apptDate = new Date(appt.appointment_date || appt.scheduled_date);
        const today = new Date();
        if (apptDate < today && apptDate.toDateString() !== today.toDateString()) {
          return { label: 'Missed Booking', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
        }
      }
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
          0: 'Day 0 (Initial)',
          3: 'Day 3 (Dose 1)',
          7: 'Day 7 (Dose 2)',
          14: 'Day 14 (Dose 3)',
          28: 'Day 28 (Dose 4)',
          90: 'Booster 1',
          365: 'Booster 2',
        };

        const appointmentTitle = appt.dose_number !== undefined && appt.dose_number !== null && doseMap[appt.dose_number]
          ? doseMap[appt.dose_number]
          : (appt.appointment_type === 'consultation' ? 'Initial Consultation' : 'Initial Consultation / Day 0');

        const activeQueue = (patient as any).queues?.[0];
        const isCurrentlyInClinic = activeQueue && ['waiting', 'called', 'serving', 'in_consultation'].includes(activeQueue.status);

        if (isCurrentlyInClinic) {
          return (
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: isPast ? '#b45309' : '#047857' }}>
                {appointmentTitle}
              </Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: isPast ? '#d97706' : '#059669' }}>
                {isPast 
                  ? `In Clinic Today (Queue #${activeQueue.queue_number || ''} · ${Math.floor((todayDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24))}d Late Arrival)` 
                  : `In Clinic Today (Queue #${activeQueue.queue_number || ''})`}
              </Typography>
            </Box>
          );
        }

        return (
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: isPast ? '#991b1b' : isToday ? '#047857' : '#111827' }}>
              {appointmentTitle}
            </Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: isToday || isPast ? 700 : 400, color: isPast ? '#dc2626' : isToday ? '#059669' : '#6b7280' }}>
              {isToday
                ? `Scheduled Today (${appt.time_slot || 'regular'})`
                : isPast
                ? `Missed / No Show (${Math.floor((todayDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24))}d ago)`
                : apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Typography>
            {appt.schedule_drift_days && appt.schedule_drift_days !== 0 ? (
              <Tooltip title={appt.schedule_adjustment_reason || 'Schedule adjusted for clinic operating hours'}>
                <Typography component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, fontSize: 10, bgcolor: '#fef3c7', color: '#92400e', px: 0.7, py: 0.1, borderRadius: 1, fontWeight: 700, mt: 0.3 }}>
                  ℹ️ {appt.schedule_drift_days > 0 ? `+${appt.schedule_drift_days}d` : `${appt.schedule_drift_days}d`} drift
                </Typography>
              </Tooltip>
            ) : null}
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
              startIcon={<HugeiconsIcon icon={Medicine01Icon} size={15} />}
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
                <HugeiconsIcon icon={ViewIcon} size={15} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  const filteredPatients = patients;

  return (
    <Box sx={{ px: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-h)',
              letterSpacing: '-0.02em',
              mb: 0.5,
            }}
          >
            Treatment Patient List
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d', margin: 0 }}>
            {today} · Track vaccination schedules, online appointments, doses, and follow-ups
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}
          <Tooltip title="Refresh Patients List">
            <IconButton onClick={loadPatients} disabled={loading} sx={{ bgcolor: '#ffffff', border: '1px solid #e0eae3', borderRadius: 2 }}>
              <HugeiconsIcon icon={RefreshIcon} size={18} />
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
            icon={<HugeiconsIcon icon={Clock01Icon} size={17} />}
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
            icon={<HugeiconsIcon icon={SmartPhone01Icon} size={17} />}
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
            icon={<HugeiconsIcon icon={Calendar03Icon} size={17} />}
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
            icon={<HugeiconsIcon icon={AlertCircleIcon} size={17} />}
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
            icon={<HugeiconsIcon icon={UserMultiple02Icon} size={17} />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* ── Patient Table Container ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', background: 'background.paper', p: 3 }}>
        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
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
                    <HugeiconsIcon icon={Search01Icon} size={16} color="#9ca3af" />
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
        </Box>

        <DataTable
          columns={columns}
          rows={filteredPatients}
          loading={loading}
          skeletonRows={rowsPerPage}
          rowKey={(p) => p.patient_id}
          emptyIcon={<HugeiconsIcon icon={Medicine01Icon} size={36} color="#d1d5db" />}
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
