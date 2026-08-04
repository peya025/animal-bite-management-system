import { useState, useEffect } from 'react';
import {
  Alert, Box, CircularProgress, Paper, Snackbar,
  Tab, Tabs, Typography, Chip, IconButton, Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Healing as VaccinationIcon,
  Warning as OverdueIcon,
  Schedule as UpcomingIcon,
  CheckCircle as CompletedIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
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
  const [tab, setTab] = useState<'due_today' | 'upcoming' | 'overdue' | 'all'>('due_today');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showForm3, setShowForm3] = useState(false);

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
      setPatients(response.data.data || []);
      setTotalCount(response.data.total || 0);
    } catch (error: any) {
      toast(error.response?.data?.message || 'Failed to load patients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [tab, page, rowsPerPage]);

  // Auto-refresh when page becomes visible (user returns from queue)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPatients();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tab, page, rowsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 0) {
        loadPatients();
      } else {
        setPage(0);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const getDoseStatus = (patient: Patient) => {
    const record = patient.latest_treatment_record;
    if (!record || !record.dose_number) return { label: 'No doses', color: '#9ca3af' };
    
    const doseMap: Record<number, string> = {
      0: 'Day 0',
      3: 'Day 3',
      7: 'Day 7',
      28: 'Day 28',
      90: 'Booster 1',
      365: 'Booster 2',
    };

    return {
      label: doseMap[record.dose_number] || `Dose ${record.dose_number}`,
      color: '#10b981',
    };
  };

  const getNextAppointment = (patient: Patient) => {
    if (!patient.appointments || patient.appointments.length === 0) return null;
    const upcoming = patient.appointments.find((a: any) => a.status === 'scheduled');
    return upcoming;
  };

  const getVaccinationStatus = (patient: Patient) => {
    const record = patient.latest_treatment_record;
    const appt = getNextAppointment(patient);

    if (!record || !record.dose_number) {
      return { label: 'Not Started', color: '#9ca3af', bg: '#f3f4f6' };
    }

    // Check if all doses completed (Day 28 or later)
    if (record.dose_number >= 28 && !appt) {
      return { label: 'Completed', color: '#065f46', bg: '#d1fae5' };
    }

    // Check if overdue
    if (appt) {
      const apptDate = new Date(appt.appointment_date);
      const today = new Date();
      if (apptDate < today) {
        return { label: 'Overdue', color: '#dc2626', bg: '#fee2e2' };
      }
    }

    // Active treatment
    return { label: 'In Progress', color: '#2563eb', bg: '#eff6ff' };
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
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.25, bgcolor: '#f3f4f6', borderRadius: 1, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#6b7280' }}>
          #{patient.patient_id}
        </Box>
      ),
    },
    {
      key: 'name',
      header: 'PATIENT NAME',
      render: (patient) => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#111827', lineHeight: 1.3 }}>
            {patient.last_name}, {patient.first_name} {patient.middle_name || ''}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
            {patient.age}y · {patient.gender}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'last_dose',
      header: 'LAST DOSE',
      render: (patient) => {
        const status = getDoseStatus(patient);
        const record = patient.latest_treatment_record;
        return (
          <Box>
            <Chip label={status.label} size="small" sx={{ bgcolor: status.color, color: '#fff', fontSize: 11, fontWeight: 600, mb: 0.5 }} />
            {record?.treatment_date && (
              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                {new Date(record.treatment_date).toLocaleDateString()}
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
        return <Chip label={status.label} size="small" sx={{ bgcolor: status.bg, color: status.color, fontSize: 11, fontWeight: 600 }} />;
      },
    },
    {
      key: 'next_appointment',
      header: 'NEXT APPOINTMENT',
      render: (patient) => {
        const appt = getNextAppointment(patient);
        if (!appt) {
          return <Typography sx={{ fontSize: 12, color: '#d1d5db' }}>—</Typography>;
        }

        const apptDate = new Date(appt.appointment_date);
        const today = new Date();
        const isToday = apptDate.toDateString() === today.toDateString();
        const isPast = apptDate < today && !isToday;

        const doseMap: Record<number, string> = {
          3: 'Day 3',
          7: 'Day 7',
          28: 'Day 28',
          90: 'Booster 1',
          365: 'Booster 2',
        };

        return (
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: isPast ? '#ef4444' : isToday ? '#10b981' : '#374151' }}>
              {doseMap[appt.dose_number] || `Dose ${appt.dose_number}`}
            </Typography>
            <Typography sx={{ fontSize: 11, color: isPast ? '#ef4444' : '#6b7280' }}>
              {isToday ? 'TODAY' : isPast ? `${Math.floor((today.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue` : apptDate.toLocaleDateString()}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'right',
      render: (patient) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Tooltip title="View Treatment History">
            <IconButton size="small" sx={{ color: '#6b7280', bgcolor: '#f9fafb', borderRadius: 1.5, width: 32, height: 32, '&:hover': { bgcolor: '#eff6ff', color: '#3b82f6' } }}>
              <ViewIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Give Dose / Update Record">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedPatient(patient);
                setShowForm3(true);
              }}
              sx={{ color: '#6b7280', bgcolor: '#f9fafb', borderRadius: 1.5, width: 32, height: 32, '&:hover': { bgcolor: '#ecfdf5', color: '#059669' } }}
            >
              <VaccinationIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ px: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '25px',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              color: '#173d29',
              margin: '0 0 7px 0',
            }}
          >
            Treatment Patient List
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d', margin: 0 }}>
            {today} · Track vaccination schedules and follow-ups
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
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
          <Tooltip title="Refresh">
            <IconButton onClick={loadPatients} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', background: '#ffffff', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #f3f4f6', px: 2 }}>
          <Tab label="Due Today" value="due_today" icon={<VaccinationIcon />} iconPosition="start" />
          <Tab label="Upcoming" value="upcoming" icon={<UpcomingIcon />} iconPosition="start" />
          <Tab label="Overdue" value="overdue" icon={<OverdueIcon />} iconPosition="start" />
          <Tab label="All Patients" value="all" icon={<CompletedIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Patient List */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', background: '#ffffff', p: 3 }}>
        {/* Search */}
        <Box sx={{ mb: 3 }}>
          <input
            type="text"
            placeholder="Search by name or patient number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </Box>

        <DataTable
          columns={columns}
          rows={patients}
          loading={loading}
          skeletonRows={rowsPerPage}
          rowKey={(p) => p.patient_id}
          emptyIcon={<VaccinationIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
          emptyTitle="No patients found"
          emptySubtitle={tab === 'due_today' ? 'No patients scheduled for today' : 'Try adjusting your filters'}
        />

        <TablePager
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        />
      </Paper>

      {/* Form 3 Modal */}
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
