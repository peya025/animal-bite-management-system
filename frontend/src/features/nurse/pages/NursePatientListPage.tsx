import { useState, useEffect, useCallback } from 'react';
import {
  Box, Chip, Paper, Tab, Tabs, Typography, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Snackbar, Alert, TextField, InputAdornment,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Visibility as ViewIcon,
  LocalHospital as DoseIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../../../shared/services/api';

// ─── Types ────────────────────────────────────────────────────

interface PatientRow {
  patient_id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  age?: number;
  latest_treatment_record?: { dose_number: number | null; treatment_date: string } | null;
  appointments?: Array<{ appointment_date: string; scheduled_date?: string; dose_number?: number; status: string }>;
  queues?: Array<{ status: string; visit_type: string }>;
}

interface Stats {
  dueToday: number;
  upcoming: number;
  overdue: number;
  completedToday: number;
  all: number;
}

// ─── Tab config ───────────────────────────────────────────────

const TABS: Array<{ key: string; label: string; color: string }> = [
  { key: 'due_today',       label: 'Due Today',        color: '#f57c00' },
  { key: 'upcoming',        label: 'Upcoming',         color: '#1976d2' },
  { key: 'overdue',         label: 'Overdue',          color: '#d32f2f' },
  { key: 'completed_today', label: 'Completed Today',  color: '#10b981' },
  { key: 'all',             label: 'All Patients',     color: '#6b7280' },
];

// ─── Helpers ──────────────────────────────────────────────────

function doseLabel(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const map: Record<number, string> = { 0: 'Day 0', 3: 'Day 3', 7: 'Day 7', 28: 'Day 28', 90: 'Booster 1', 365: 'Booster 2' };
  return map[n] ?? `Day ${n}`;
}

function StatusBadge({ patient }: { patient: PatientRow }) {
  const rec = patient.latest_treatment_record;
  const appt = patient.appointments?.[0];
  const inQueue = patient.queues?.some(q => ['waiting', 'called', 'serving', 'in_consultation'].includes(q.status));

  if (inQueue) return <Chip icon={<ScheduleIcon />} label="In Queue" size="small" color="warning" />;

  if (appt) {
    const today = new Date().toDateString();
    const apptDate = new Date(appt.appointment_date ?? appt.scheduled_date ?? '');
    if (appt.status === 'scheduled' && apptDate.toDateString() === today)
      return <Chip icon={<ScheduleIcon />} label="Due Today" size="small" color="warning" />;
    if (appt.status === 'scheduled' && apptDate < new Date())
      return <Chip icon={<WarningIcon />} label="Overdue" size="small" color="error" />;
    if (appt.status === 'scheduled')
      return <Chip icon={<ScheduleIcon />} label="Upcoming" size="small" color="info" />;
  }

  if (rec?.dose_number != null)
    return <Chip icon={<CheckIcon />} label={`Last: ${doseLabel(rec.dose_number)}`} size="small" color="success" />;

  return <Chip label="No Records" size="small" variant="outlined" />;
}

function NextDose({ patient }: { patient: PatientRow }) {
  const appt = patient.appointments?.[0];
  if (!appt) return <>—</>;
  const date = new Date(appt.appointment_date ?? appt.scheduled_date ?? '').toLocaleDateString();
  return <>{doseLabel(appt.dose_number)} ({date})</>;
}

// ─── Page ─────────────────────────────────────────────────────

export default function NursePatientListPage() {
  const [activeTab, setActiveTab]   = useState(0);
  const [patients, setPatients]     = useState<PatientRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [stats, setStats]           = useState<Stats>({
    dueToday: 0, upcoming: 0, overdue: 0, completedToday: 0, all: 0,
  });

  const loadPatients = useCallback(async (tab: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tab });
      if (q.trim()) params.set('search', q.trim());

      const res = await api.get(`/nurse/patients?${params}`);
      setPatients(res.data.data ?? []);

      // Update badge counts from the extra count fields the backend returns
      // (avoids 4 extra requests — the backend computes all counts in one call)
      setStats(prev => ({
        ...prev,
        dueToday:       res.data.due_today_count       ?? prev.dueToday,
        upcoming:       res.data.upcoming_count        ?? prev.upcoming,
        overdue:        res.data.overdue_count         ?? prev.overdue,
        completedToday: res.data.completed_today_count ?? prev.completedToday,
        all:            res.data.total                 ?? prev.all,
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to load patient list';
      setError(msg);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever tab or search changes
  useEffect(() => {
    loadPatients(TABS[activeTab].key, search);
  }, [activeTab, search, loadPatients]);

  // ── Stat cards ────────────────────────────────────────────

  const STAT_CARDS = [
    { label: 'Due Today',       value: stats.dueToday,       bg: '#fff3e0', border: '#ffe0b2', text: '#f57c00', sub: '#e65100', tab: 0 },
    { label: 'Upcoming',        value: stats.upcoming,       bg: '#e3f2fd', border: '#bbdefb', text: '#1976d2', sub: '#0d47a1', tab: 1 },
    { label: 'Overdue',         value: stats.overdue,        bg: '#ffebee', border: '#ffcdd2', text: '#d32f2f', sub: '#b71c1c', tab: 2 },
    { label: 'Completed Today', value: stats.completedToday, bg: '#f0fdf4', border: '#bbf7d0', text: '#10b981', sub: '#065f46', tab: 3 },
    { label: 'Total Tracked',   value: stats.all,            bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280', sub: '#374151', tab: 4 },
  ];

  return (
    <Box sx={{ px: 3, py: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-h)', mb: 0.5 }}>
            Treatment Patient List
          </Typography>
          <Typography variant="body2" sx={{ color: '#77877d' }}>
            Track vaccination schedules, online appointments, doses, and follow-ups
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => loadPatients(TABS[activeTab].key, search)} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
        {STAT_CARDS.map(c => (
          <Paper
            key={c.label}
            onClick={() => setActiveTab(c.tab)}
            sx={{
              p: 2, textAlign: 'center', cursor: 'pointer',
              bgcolor: c.bg, border: `1px solid ${c.border}`,
              transition: 'transform .15s',
              outline: activeTab === c.tab ? `2px solid ${c.text}` : 'none',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: c.text }}>{c.value}</Typography>
            <Typography variant="caption" sx={{ color: c.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {c.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Tabs + Search row */}
      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', px: 1 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ flex: 1 }}>
            {TABS.map((t, i) => (
              <Tab
                key={t.key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    {t.label}
                    <Box sx={{
                      minWidth: 20, height: 18, px: '5px', borderRadius: 9,
                      bgcolor: activeTab === i ? t.color : '#e5e7eb',
                      color: activeTab === i ? '#fff' : '#6b7280',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i === 0 ? stats.dueToday
                        : i === 1 ? stats.upcoming
                        : i === 2 ? stats.overdue
                        : i === 3 ? stats.completedToday
                        : stats.all}
                    </Box>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ p: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search by name, patient number, or contact phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af', fontSize: 18 }} /></InputAdornment>,
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>
      </Paper>

      {/* Patient Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : patients.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box sx={{ fontSize: 48, mb: 1 }}>🔍</Box>
            <Typography variant="body1" sx={{ color: '#6b7280', fontWeight: 600 }}>No patients found</Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
              {TABS[activeTab].key === 'due_today'
                ? 'No patients scheduled for dose administration today'
                : TABS[activeTab].key === 'completed_today'
                ? 'No treatment records saved today yet'
                : 'No matching patients'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PATIENT #</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PATIENT NAME</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>LAST DOSE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>NEXT APPOINTMENT</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map(patient => (
                  <TableRow key={patient.patient_id} hover>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                        {patient.patient_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                        {patient.last_name}, {patient.first_name}
                        {patient.middle_name ? ` ${patient.middle_name}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>
                        {doseLabel(patient.latest_treatment_record?.dose_number)}
                      </Typography>
                    </TableCell>
                    <TableCell><StatusBadge patient={patient} /></TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>
                        <NextDose patient={patient} />
                      </Typography>
                    </TableCell>
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

      {/* Error toast */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
