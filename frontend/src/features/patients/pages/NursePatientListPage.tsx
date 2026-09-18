import { useState, useEffect } from 'react';

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
  Medicine01Icon,
  Search01Icon,
  RefreshIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import TagoloanTreatmentCardModal from '../../vaccinations/components/TagoloanTreatmentCardModal';

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
  registration_source?: string;
  created_at: string;
  status: string;
  appointments?: any[];
  queues?: any[];
  latest_treatment_record?: any;
}

export default function NursePatientListPage() {

  // Station 2 begins with the patients expected for a follow-up dose today.
  const [tab, setTab] = useState<'needs_action' | 'due_today' | 'online' | 'upcoming' | 'overdue' | 'all'>('due_today');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showForm3, setShowForm3] = useState(false);
  const [selectedCardPatientId, setSelectedCardPatientId] = useState<number | null>(null);
  const [showTreatmentCardModal, setShowTreatmentCardModal] = useState(false);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  // Stats for top summary cards
  const [kpiStats, setKpiStats] = useState({
    needsAction: 0,
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
        needsAction: response.data.needs_action_count ?? 0,
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
      const response = await api.post(`/appointments/patient/${patient.patient_id}/check-in`);
      const msg = response.data?.message || 'Patient checked in successfully';
      toast(msg, 'success');

      // A confirmed appointment is now ready for vaccination. Move the nurse
      // directly to the Due Today worklist so Form 3 is immediately available.
      setPage(0);
      if (tab === 'due_today' && page === 0) {
        await loadPatients();
      } else {
        setTab('due_today');
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to check in patient', 'error');
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
    const scheduledAppts = patient.appointments.filter((a: any) => a.status === 'scheduled' || a.status === 'missed' || a.status === 'confirmed');
    if (scheduledAppts.length === 0) return null;
    // Prefer the soonest scheduled appointment (e.g. earliest scheduled_date or appointment_date)
    scheduledAppts.sort((a: any, b: any) => {
      const dateA = new Date(a.scheduled_date || a.appointment_date || 0).getTime();
      const dateB = new Date(b.scheduled_date || b.appointment_date || 0).getTime();
      return dateA - dateB;
    });
    return scheduledAppts[0];
  };

  const getVaccinationStatus = (patient: Patient): { label: string; color: string; bg: string; border: string; subtext?: string } => {
    const activeQueue = (patient as any).queues?.[0];
    const appt = getNextAppointment(patient);
    if (activeQueue) {
      const apptDate = appt ? new Date(appt.scheduled_date || appt.appointment_date) : null;
      const todayDate = new Date();
      const isPastAppt = apptDate && apptDate < todayDate && apptDate.toDateString() !== todayDate.toDateString();
      const lateDays = isPastAppt ? Math.floor((todayDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      if (activeQueue.status === 'waiting') {
        if (isPastAppt) {
          return { label: `In Queue (Waiting · ${lateDays}d Late)`, color: '#92400e', bg: '#fef3c7', border: '#fde68a', subtext: 'Late Arrival' };
        }
        return { label: 'In Queue (Waiting)', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', subtext: `Queue #${activeQueue.queue_number || ''}` };
      }
      if (activeQueue.status === 'in_consultation' || activeQueue.status === 'called' || activeQueue.status === 'serving') {
        if (isPastAppt) {
          return { label: `In Triage (${lateDays}d Late)`, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', subtext: 'Consultation / Triage' };
        }
        return { label: 'In Consultation', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', subtext: `Queue #${activeQueue.queue_number || ''}` };
      }
    }

    const record = patient.latest_treatment_record;
    const hasCompletedTriage = Boolean(
      (patient as any).bite_incidents?.length ||
      (patient as any).biteIncidents?.length ||
      (patient as any).bite_intakes?.length ||
      (patient as any).biteIntakes?.length ||
      record
    );

    if (!hasCompletedTriage) {
      return { label: 'Awaiting Triage (Form 2)', color: '#b45309', bg: '#fef3c7', border: '#fde68a', subtext: 'Needs Consultation' };
    }

    if (!record || record.dose_number === null || record.dose_number === undefined) {
      if (appt) {
        const apptDate = new Date(appt.scheduled_date || appt.appointment_date);
        const today = new Date();
        if (apptDate < today && apptDate.toDateString() !== today.toDateString()) {
          const lateDays = Math.floor((today.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24));
          return { label: 'Missed Booking', color: '#991b1b', bg: '#fef2f2', border: '#fecaca', subtext: `${lateDays}d overdue` };
        }
      }
      if (appt?.status === 'confirmed') {
        return { label: 'Checked In', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', subtext: 'Ready for Dose 1 (Day 0)' };
      }
      return { label: 'Ready for Dose 1 (Day 0)', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', subtext: 'Triage Completed' };
    }

    // Regimen completion logic:
    // DOH NRPCP Primary PEP complete when dose >= 7 (and < 90) with no pending appointments
    // Booster complete when dose >= 365 (or >= 90 with no pending appointments)
    const isPrimaryComplete = record.dose_number >= 7 && record.dose_number < 90;
    const isBoosterComplete = record.dose_number >= 365 || (record.dose_number >= 90 && !appt);

    if ((isPrimaryComplete || isBoosterComplete) && !appt) {
      return {
        label: isBoosterComplete ? 'Booster Complete' : 'Completed',
        color: '#047857',
        bg: '#ecfdf5',
        border: '#a7f3d0',
        subtext: isBoosterComplete ? 'Booster Series Done' : 'Primary Series Done'
      };
    }

    if (appt) {
      const apptDate = new Date(appt.scheduled_date || appt.appointment_date);
      const today = new Date();
      const isToday = apptDate.toDateString() === today.toDateString();
      const isPast = apptDate < today && !isToday;

      if (isPast) {
        const lateDays = Math.floor((today.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24));
        return { label: 'Overdue', color: '#991b1b', bg: '#fef2f2', border: '#fecaca', subtext: `${lateDays}d Past Schedule` };
      }

      if (appt.status === 'confirmed') {
        return { label: 'Checked In / Ready for Dose', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', subtext: 'In Treatment Queue' };
      }

      if (isToday) {
        return { label: 'Due Today', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', subtext: appt.time_slot || 'Regular hours' };
      }
    }

    return { label: 'In Progress', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', subtext: 'Awaiting Next Schedule' };
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const columns: ColumnDef<Patient>[] = [
    {
      key: 'patient_id',
      header: 'PATIENT #',
      align: 'center',
      width: '100px',
      render: (patient) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.25, bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 1.5, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#374151' }}>
            #{patient.patient_id}
          </Box>
        </Box>
      ),
    },
    {
      key: 'name',
      header: 'PATIENT NAME',
      render: (patient) => {
        const isOnline = Boolean(
          patient.registration_source === 'mobile' ||
          patient.registration_source === 'online' ||
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
      align: 'center',
      render: (patient) => {
        const status = getDoseStatus(patient);
        const record = patient.latest_treatment_record;
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
            <Chip
              label={status.label}
              size="small"
              sx={{ bgcolor: status.bg, color: status.color, border: `1px solid ${status.border}`, fontSize: 11.5, fontWeight: 600, height: 24, mb: 0.25 }}
            />
            {record?.treatment_date ? (
              <Typography sx={{ fontSize: 11, color: '#6b7280', display: 'block', textAlign: 'center', lineHeight: 1.2 }}>
                Administered: {new Date(record.treatment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 11, color: '#9ca3af', display: 'block', textAlign: 'center', lineHeight: 1.2 }}>
                Not administered
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      align: 'center',
      render: (patient) => {
        const status = getVaccinationStatus(patient);
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
            <Chip
              label={status.label}
              size="small"
              sx={{ bgcolor: status.bg, color: status.color, border: `1px solid ${status.border}`, fontSize: 11.5, fontWeight: 600, height: 24, mb: 0.25 }}
            />
            {status.subtext ? (
              <Typography sx={{ fontSize: 11, color: '#6b7280', display: 'block', textAlign: 'center', lineHeight: 1.2 }}>
                {status.subtext}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 11, color: 'transparent', display: 'block', textAlign: 'center', lineHeight: 1.2, userSelect: 'none' }}>
                —
              </Typography>
            )}
          </Box>
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

        const isBoosterAppt = appt.appointment_type === 'booster' || appt.notes?.toLowerCase()?.includes('booster');
        let fallbackTitle = 'Initial Consultation / Day 0';
        if (isBoosterAppt) {
          fallbackTitle = 'Booster Vaccination';
        } else if (appt.appointment_type === 'consultation') {
          fallbackTitle = 'Initial Consultation';
        } else if (patient.latest_treatment_record) {
          const prevDose = patient.latest_treatment_record.dose_number;
          if (prevDose === 0) fallbackTitle = 'Day 3 (Dose 1)';
          else if (prevDose === 3) fallbackTitle = 'Day 7 (Dose 2)';
          else if (prevDose >= 7 && prevDose < 90) fallbackTitle = 'Booster 1';
          else if (prevDose >= 90) fallbackTitle = 'Booster 2';
          else fallbackTitle = 'Follow-up Dose';
        }
        const appointmentTitle = appt.dose_number !== undefined && appt.dose_number !== null && doseMap[appt.dose_number]
          ? doseMap[appt.dose_number]
          : fallbackTitle;

        if (appt.status === 'confirmed') {
          return (
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#047857' }}>
                {appointmentTitle}
              </Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#059669' }}>
                Checked In / Ready for Dose
              </Typography>
            </Box>
          );
        }

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
      align: 'center',
      render: (patient) => {
        const activeQueue = (patient as any).queues?.[0];
        const appt = getNextAppointment(patient);
        const isBoosterAppt = appt?.appointment_type === 'booster' || appt?.notes?.toLowerCase()?.includes('booster');

        // Defensive UI guard for old appointments that may still be returned by
        // a saved filter: a booster must be registered and approved in Form 2,
        // never checked in or recorded directly from Station 2.
        if (isBoosterAppt) {
          return (
            <Tooltip title="Register the booster request, then wait for Doctor assessment and Form 2 approval.">
              <Chip
                label="Doctor assessment required"
                size="small"
                sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
              />
            </Tooltip>
          );
        }
        const hasCompletedTriage = Boolean(
          patient.latest_treatment_record ||
          (patient as any).latestTreatmentRecord ||
          (patient as any).latest_consultation_record ||
          (patient as any).latestConsultationRecord ||
          activeQueue?.visit_type === 'vaccination' ||
          activeQueue?.consultation_notes?.includes('Form 2')
        );
        const isCheckedIn = appt?.status === 'confirmed';
        const needsCheckIn = hasCompletedTriage && !isCheckedIn && (appt?.status === 'scheduled' || appt?.status === 'missed');

        const record = patient.latest_treatment_record;
        const isPrimaryComplete = record && record.dose_number >= 7 && record.dose_number < 90;
        const isBoosterComplete = record && (record.dose_number >= 365 || (record.dose_number >= 90 && !appt));
        const isSeriesCompleted = Boolean(
          patient.status?.toLowerCase() === 'completed' ||
          ((isPrimaryComplete || isBoosterComplete) && !appt)
        );

        return (
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            {isSeriesCompleted ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSelectedCardPatientId(patient.patient_id);
                  setShowTreatmentCardModal(true);
                }}
                startIcon={<HugeiconsIcon icon={ViewIcon} size={15} />}
                sx={{
                  fontSize: 12,
                  py: 0.4,
                  px: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '6px',
                  borderColor: '#93c5fd',
                  color: '#1d4ed8',
                  bgcolor: '#eff6ff',
                  '&:hover': { bgcolor: '#dbeafe', borderColor: '#60a5fa' },
                }}
              >
                Completed · View Card
              </Button>
            ) : needsCheckIn ? (
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
                  bgcolor: '#6366f1',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#4f46e5' },
                }}
              >
                {checkingInId === patient.patient_id ? 'Checking in...' : 'Check In'}
              </Button>
            ) : hasCompletedTriage ? (
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
            ) : (
              <Tooltip title="Patient must complete Doctor Assessment & Form 2 before initial Dose 1. Direct to Intake Station (Nurse 1).">
                <Chip
                  label="Intake — Nurse 1"
                  size="small"
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    height: 26,
                    color: '#475569',
                    borderColor: '#cbd5e1',
                    bgcolor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </Tooltip>
            )}

            <Tooltip title="View Treatment Record Card (Printable)">
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedCardPatientId(patient.patient_id);
                  setShowTreatmentCardModal(true);
                }}
                sx={{
                  color: '#4b5563',
                  bgcolor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 1.5,
                  width: 32,
                  height: 32,
                  '&:hover': { bgcolor: '#e5e7eb', color: '#111827' },
                }}
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
            Station 2 · Follow-up Doses
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d', margin: 0 }}>
            {today} · Indigo Station 2: manage Doctor-prescribed scheduled follow-up doses due today, overdue, or upcoming
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loading && <CircularProgress size={18} sx={{ color: '#6366f1' }} />}
          <Tooltip title="Refresh Patients List">
            <IconButton onClick={loadPatients} disabled={loading} sx={{ bgcolor: 'var(--card-bg-solid, #ffffff)', border: '1px solid var(--border-glow, #e0eae3)', borderRadius: 2, color: 'var(--text-m, #6b7280)' }}>
              <HugeiconsIcon icon={RefreshIcon} size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Top Circular Ring Summary Cards (Matching Vaccine Inventory & Queue Design) ── */}

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
            '& .Mui-selected': { color: '#6366f1' },
            '& .MuiTabs-indicator': { bgcolor: '#6366f1', height: 3, borderRadius: '3px 3px 0 0' },
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
                <span>Needs Action</span>
                <Box sx={{ bgcolor: tab === 'needs_action' ? '#fef3c7' : '#f3f4f6', color: tab === 'needs_action' ? '#b45309' : '#6b7280', px: 1, py: 0.1, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {kpiStats.needsAction}
                </Box>
              </Stack>
            }
            value="needs_action"
            sx={{ display: 'none' }}
            icon={<HugeiconsIcon icon={AlertCircleIcon} size={17} />}
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
            sx={{ display: 'none' }}
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
            sx={{ display: 'none' }}
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
                '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: '1.5px' },
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

      {/* Tagoloan Treatment Card (View / Printable) */}
      {showTreatmentCardModal && selectedCardPatientId && (
        <TagoloanTreatmentCardModal
          open={showTreatmentCardModal}
          patientId={selectedCardPatientId}
          onClose={() => {
            setShowTreatmentCardModal(false);
            setSelectedCardPatientId(null);
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
