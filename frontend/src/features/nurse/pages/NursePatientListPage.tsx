import { useState, useEffect } from 'react';
import {
  Box, Chip, Paper, Tab, Tabs, Typography, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Visibility as ViewIcon,
  LocalHospital as DoseIcon,
} from '@mui/icons-material';
import api from '../../../shared/services/api';

export default function NursePatientListPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ dueToday: 0, upcoming: 0, overdue: 0, all: 0 });

  const tabs = ['due_today', 'upcoming', 'overdue', 'all'];
  const tabLabels = ['Due Today', 'Upcoming', 'Overdue', 'All Patients'];

  useEffect(() => {
    loadPatients();
  }, [activeTab]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/nurse/patients?tab=${tabs[activeTab]}`);
      setPatients(response.data.data || []);
      
      // Load stats for badges
      const [todayRes, upcomingRes, overdueRes, allRes] = await Promise.all([
        api.get('/nurse/patients?tab=due_today&per_page=1'),
        api.get('/nurse/patients?tab=upcoming&per_page=1'),
        api.get('/nurse/patients?tab=overdue&per_page=1'),
        api.get('/nurse/patients?tab=all&per_page=1'),
      ]);
      
      setStats({
        dueToday: todayRes.data.total || 0,
        upcoming: upcomingRes.data.total || 0,
        overdue: overdueRes.data.total || 0,
        all: allRes.data.total || 0,
      });
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (patient: any) => {
    const lastRecord = patient.latest_treatment_record;
    const appointment = patient.appointments?.[0];

    if (!lastRecord) return <Chip label="No Records" size="small" />;

    const doseNumber = lastRecord.dose_number || 0;
    const doseLabel = doseNumber === 0 ? 'Day 0' : doseNumber === 3 ? 'Day 3' : doseNumber === 7 ? 'Day 7' : doseNumber === 28 ? 'Day 28' : `Day ${doseNumber}`;

    if (appointment) {
      const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();
      const isPast = new Date(appointment.appointment_date) < new Date();

      if (isPast && appointment.status === 'scheduled') {
        return <Chip icon={<WarningIcon />} label="Overdue" size="small" color="error" />;
      }
      if (isToday) {
        return <Chip icon={<ScheduleIcon />} label="Due Today" size="small" color="warning" />;
      }
      return <Chip icon={<ScheduleIcon />} label="Upcoming" size="small" color="info" />;
    }

    return <Chip icon={<CheckIcon />} label={`Last: ${doseLabel}`} size="small" color="success" />;
  };

  const getNextDose = (patient: any) => {
    const appointment = patient.appointments?.[0];
    if (!appointment) return '—';

    const doseNumber = appointment.dose_number;
    const doseLabel = doseNumber === 3 ? 'Day 3' : doseNumber === 7 ? 'Day 7' : doseNumber === 28 ? 'Day 28' : doseNumber === 90 ? 'Booster 1' : doseNumber === 365 ? 'Booster 2' : `Dose ${doseNumber}`;
    const date = new Date(appointment.appointment_date).toLocaleDateString();

    return `${doseLabel} (${date})`;
  };

  return (
    <Box sx={{ px: 3, py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-h)', mb: 1 }}>
          Treatment Patient List
        </Typography>
        <Typography variant="body2" sx={{ color: '#77877d' }}>
          Track vaccination schedules and follow-up appointments
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0', border: '1px solid #ffe0b2' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#f57c00' }}>{stats.dueToday}</Typography>
          <Typography variant="caption" sx={{ color: '#e65100' }}>Due Today</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd', border: '1px solid #bbdefb' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>{stats.upcoming}</Typography>
          <Typography variant="caption" sx={{ color: '#0d47a1' }}>Upcoming</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee', border: '1px solid #ffcdd2' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#d32f2f' }}>{stats.overdue}</Typography>
          <Typography variant="caption" sx={{ color: '#b71c1c' }}>Overdue</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#6b7280' }}>{stats.all}</Typography>
          <Typography variant="caption" sx={{ color: '#374151' }}>All Patients</Typography>
        </Paper>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {tabLabels.map((label, idx) => (
            <Tab key={idx} label={label} />
          ))}
        </Tabs>
      </Paper>

      {/* Patient Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : patients.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>No patients found</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PATIENT #</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>NAME</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>AGE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>LAST DOSE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>NEXT APPOINTMENT</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((patient: any) => (
                  <TableRow key={patient.patient_id} hover>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                        #{patient.patient_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                        {patient.last_name}, {patient.first_name} {patient.middle_name || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{patient.age || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>
                        {patient.latest_treatment_record 
                          ? `Day ${patient.latest_treatment_record.dose_number || 0}`
                          : '—'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{getNextDose(patient)}</Typography>
                    </TableCell>
                    <TableCell>{getStatusBadge(patient)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Treatment Card">
                        <IconButton size="small" sx={{ color: '#3b82f6' }}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Give Dose">
                        <IconButton size="small" sx={{ color: '#10b981' }}>
                          <DoseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
