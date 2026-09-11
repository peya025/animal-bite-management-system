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
  overdue: number;
  dueToday: number;
  newCases: number;
  followUps: number;
  upcoming: number;
  completedToday: number;
  online: number;
  all: number;
}

// ─── Tab config ───────────────────────────────────────────────

const MAIN_TABS: Array<{ 
  key: string; 
  label: string; 
  color: string; 
  bg: string; 
  border: string; 
  icon: string;
  hasSub?: boolean;
}> = [
  { key: 'overdue',         label: 'Overdue',        color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '⚠️' },
  { key: 'due_today',       label: 'Due Today',      color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '📅', hasSub: true },
  { key: 'upcoming',        label: 'Upcoming',       color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '📆' },
  { key: 'completed_today', label: 'Treated Today',  color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
  { key: 'online',          label: 'Mobile App',     color: '#8b5cf6', bg: '#faf5ff', border: '#e9d5ff', icon: '📱' },
  { key: 'all',             label: 'All Patients',   color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: '📋' },
];

// Sub-tabs for "Due Today"
const TODAY_SUB_TABS: Array<{ key: string; label: string; icon: string; color: string }> = [
  { key: 'due_today',  label: 'All Today',             icon: '📅', color: '#f59e0b' },
  { key: 'new_case',   label: 'New Cases (Day 0)',     icon: '🆕', color: '#10b981' },
  { key: 'follow_up',  label: 'Follow-up Visits',      icon: '🔄', color: '#3b82f6' },
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
  const [activeMainTab, setActiveMainTab] = useState(1); // Default: "Due Today"
  const [activeSubTab, setActiveSubTab]   = useState(0); // Default: "All Today"
  const [patients, setPatients]           = useState<PatientRow[]>([]);
  const [loading, setLoading]             = useState(false);
  const [search, setSearch]               = useState('');
  const [error, setError]                 = useState<string | null>(null);
  const [stats, setStats]                 = useState<Stats>({
    overdue: 0,
    dueToday: 0,
    newCases: 0,
    followUps: 0,
    upcoming: 0,
    completedToday: 0,
    online: 0,
    all: 0,
  });

  // Determine which backend filter to use
  const getActiveFilter = useCallback(() => {
    const mainTab = MAIN_TABS[activeMainTab];
    
    if (mainTab.key === 'due_today' && mainTab.hasSub) {
      // Use sub-tab filter
      return TODAY_SUB_TABS[activeSubTab].key;
    }
    
    return mainTab.key;
  }, [activeMainTab, activeSubTab]);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = getActiveFilter();
      const params = new URLSearchParams({ tab: filter });
      if (search.trim()) params.set('search', search.trim());

      const res = await api.get(`/nurse/patients?${params}`);
      setPatients(res.data.data ?? []);

      // Update badge counts from the extra count fields the backend returns
      setStats(prev => ({
        ...prev,
        overdue:        res.data.overdue_count         ?? prev.overdue,
        dueToday:       res.data.due_today_count       ?? prev.dueToday,
        newCases:       res.data.new_case_count        ?? prev.newCases,
        followUps:      res.data.follow_up_count       ?? prev.followUps,
        upcoming:       res.data.upcoming_count        ?? prev.upcoming,
        completedToday: res.data.completed_today_count ?? prev.completedToday,
        online:         res.data.online_count          ?? prev.online,
        all:            res.data.total                 ?? prev.all,
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to load patient list';
      setError(msg);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [getActiveFilter, search]);

  // Reload whenever filter or search changes
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // ── Stat cards ────────────────────────────────────────────

  const STAT_CARDS = MAIN_TABS.map((tab, idx) => ({
    label: tab.label,
    value: idx === 0 ? stats.overdue
         : idx === 1 ? stats.dueToday
         : idx === 2 ? stats.upcoming
         : idx === 3 ? stats.completedToday
         : idx === 4 ? stats.online
         : stats.all,
    bg: tab.bg,
    border: tab.border,
    text: tab.color,
    icon: tab.icon,
    tab: idx,
  }));

  const showSubTabs = MAIN_TABS[activeMainTab]?.hasSub;

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
          <IconButton onClick={loadPatients} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, mb: 3 }}>
        {STAT_CARDS.map(c => (
          <Paper
            key={c.label}
            onClick={() => {
              setActiveMainTab(c.tab);
              if (c.tab === 1) setActiveSubTab(0); // Reset sub-tab when selecting "Due Today"
            }}
            sx={{
              p: 2, textAlign: 'center', cursor: 'pointer',
              bgcolor: c.bg, border: `1px solid ${c.border}`,
              transition: 'transform .15s, box-shadow .15s',
              outline: activeMainTab === c.tab ? `2px solid ${c.text}` : 'none',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
            }}
          >
            <Box sx={{ fontSize: 28, mb: 0.5 }}>{c.icon}</Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: c.text }}>{c.value}</Typography>
            <Typography variant="caption" sx={{ color: c.text, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              {c.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Sub-tabs for "Due Today" */}
      {showSubTabs && (
        <Box sx={{ mb: 2 }}>
          <Paper sx={{ p: 1.5, display: 'flex', gap: 1, bgcolor: '#f9fafb', alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#6b7280', mr: 1 }}>
              TODAY'S BREAKDOWN:
            </Typography>
            {TODAY_SUB_TABS.map((subTab, idx) => {
              const count = idx === 0 ? stats.dueToday : idx === 1 ? stats.newCases : stats.followUps;
              return (
                <Chip
                  key={subTab.key}
                  label={`${subTab.icon} ${subTab.label} (${count})`}
                  onClick={() => setActiveSubTab(idx)}
                  sx={{
                    bgcolor: activeSubTab === idx ? '#fff' : 'transparent',
                    border: activeSubTab === idx ? `2px solid ${subTab.color}` : '1px solid #e5e7eb',
                    fontWeight: activeSubTab === idx ? 700 : 500,
                    fontSize: 12,
                    transition: 'all .15s',
                    '&:hover': {
                      bgcolor: '#fff',
                      borderColor: subTab.color,
                    },
                  }}
                />
              );
            })}
          </Paper>
        </Box>
      )}

      {/* Search */}
      <Paper sx={{ mb: 2, p: 1.5, borderRadius: 2 }}>
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
              {getActiveFilter() === 'new_case'
                ? 'No new patients (Day 0) scheduled today'
                : getActiveFilter() === 'follow_up'
                ? 'No follow-up patients scheduled today'
                : getActiveFilter() === 'due_today'
                ? 'No patients scheduled for dose administration today'
                : getActiveFilter() === 'completed_today'
                ? 'No treatment records saved today yet'
                : getActiveFilter() === 'online'
                ? 'No patients registered via mobile app'
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
