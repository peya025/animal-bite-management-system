import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Select,
  Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  AccessTime as WaitIcon,
  Cancel as CancelIcon,
  CheckCircle as DoneIcon,
  Done as CompleteIcon,
  PeopleAlt as TotalIcon,
  Phone as CallIcon,
  LocalHospital as ConsultIcon,
  ArrowForward as NextIcon,
  Warning as UrgentIcon,
  Refresh as RefreshIcon,
  Error as EmergencyIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import ConfirmationModal from '../../components/ConfirmationModal/ConfirmationModal';
import { DataTable, TablePager } from '../../components/data-display';
import type { ColumnDef } from '../../components/data-display';

// ─── Types ────────────────────────────────────────────────────
interface QueueEntry {
  queue_id: number;
  queue_number: number;
  queue_date: string;
  visit_type: string;
  priority: 'normal' | 'urgent' | 'emergency';
  status: 'waiting' | 'in_consultation' | 'completed' | 'cancelled';
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
  check_in_notes: string | null;
  consultation_notes: string | null;
  patient: {
    patient_id: number;
    name: string;
    age: number;
    gender: string;
    contact_number: string;
  };
  biteIncident?: { bite_id: number; case_number: string; severity: string };
}

interface QueueStats {
  total: number;
  waiting: number;
  in_consultation: number;
  completed: number;
  cancelled: number;
  by_visit_type?: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────
const VISIT_LABEL: Record<string, string> = {
  new_case:    'New Case',
  follow_up:   'Follow-up',
  vaccination: 'Vaccination',
  observation: 'Observation',
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  waiting:         { bg: '#eff6ff', color: '#2563eb', label: 'Waiting'         },
  in_consultation: { bg: '#fff7ed', color: '#c2410c', label: 'In Consultation' },
  completed:       { bg: '#ecfdf5', color: '#059669', label: 'Completed'       },
  cancelled:       { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled'       },
};

const PRIORITY_CFG: Record<string, { bg: string; color: string; label: string }> = {
  normal:    { bg: '#f3f4f6', color: '#6b7280', label: 'Normal'    },
  urgent:    { bg: '#fff7ed', color: '#c2410c', label: 'Urgent'    },
  emergency: { bg: '#fee2e2', color: '#dc2626', label: 'Emergency' },
};

function waitTime(checkedIn: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedIn).getTime()) / 60000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

// ─── Complete Dialog ──────────────────────────────────────────
function CompleteDialog({ open, entry, onClose, onDone }: {
  open: boolean; entry: QueueEntry | null;
  onClose: () => void; onDone: () => void;
}) {
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setNotes(''); setShowConfirm(false); }, [open]);

  const doComplete = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      await api.post(`/queue/${entry.queue_id}/complete`, {
        consultation_notes: notes || undefined,
      });
      onDone();
      onClose();
    } catch { /* snackbar in parent */ }
    finally { setSaving(false); }
  };

  return (
    <>
      <Dialog open={open && !showConfirm} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Complete Consultation</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {entry && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>#{entry.queue_number} · {entry.patient.name}</strong><br />
              {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
              {entry.called_at && <> · Called {new Date(entry.called_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>}
            </Alert>
          )}
          <TextField fullWidth multiline rows={3}
            label="Consultation Notes (optional)"
            placeholder="Summary of consultation, recommendations…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="contained" color="success" disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CompleteIcon />}
            onClick={() => setShowConfirm(true)}>
            Mark Complete
          </Button>
        </DialogActions>
      </Dialog>

      {showConfirm && entry && (
        <ConfirmationModal
          variant="success"
          title="Complete Consultation"
          message={<>Mark consultation for <strong>{entry.patient.name}</strong> as complete?</>}
          confirmLabel="Yes, Complete"
          cancelLabel="Go Back"
          onConfirm={() => { setShowConfirm(false); doComplete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function QueueDashboard() {
  const [queue, setQueue]               = useState<QueueEntry[]>([]);
  const [stats, setStats]               = useState<QueueStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(10);
  const [nextEntry, setNextEntry]       = useState<QueueEntry | null>(null);

  const [callTarget,     setCallTarget]     = useState<QueueEntry | null>(null);
  const [cancelTarget,   setCancelTarget]   = useState<QueueEntry | null>(null);
  const [completeTarget, setCompleteTarget] = useState<QueueEntry | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean; message: string; severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes, nextRes] = await Promise.all([
        api.get('/queue'),
        api.get('/queue/statistics'),
        api.get('/queue/next'),
      ]);
      setQueue(queueRes.data.queue ?? []);
      setStats(statsRes.data);
      setNextEntry(nextRes.data.next_patient ?? null);
    } catch {
      toast('Failed to load queue data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  const handleCall = async (entry: QueueEntry) => {
    try {
      await api.post(`/queue/${entry.queue_id}/call`);
      toast(`Called #${entry.queue_number} · ${entry.patient.name}`);
      loadData();
    } catch { toast('Failed to call patient', 'error'); }
  };

  const handleCancel = async (entry: QueueEntry) => {
    try {
      await api.post(`/queue/${entry.queue_id}/cancel`);
      toast(`Cancelled #${entry.queue_number}`);
      loadData();
    } catch { toast('Failed to cancel queue entry', 'error'); }
  };

  // client-side filter + pagination
  const filtered = queue.filter(q => {
    const matchSearch = !search ||
      q.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      String(q.queue_number).includes(search);
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // ── Column definitions ────────────────────────────────────
  const columns: ColumnDef<QueueEntry>[] = [
    {
      key: 'queue_id', header: 'QUEUE ID', width: '90px',
      render: entry => (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.25, bgcolor: '#f3f4f6', borderRadius: 1, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#6b7280' }}>
          #{entry.queue_id}
        </Box>
      ),
    },
    {
      key: 'queue_number', header: 'QUEUE #', width: '80px',
      render: entry => (
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#3b82f6' }}>{entry.queue_number}</Typography>
        </Box>
      ),
    },
    {
      key: 'patient', header: 'PATIENT',
      render: entry => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#111827', lineHeight: 1.3 }}>{entry.patient.name}</Typography>
          <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
            {entry.patient.age}y · {entry.patient.gender}
            {entry.biteIncident && ` · ${entry.biteIncident.case_number}`}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'appointment_id', header: 'APPT. ID', width: '100px',
      render: entry => (entry as any).appointment_id ? (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, bgcolor: '#f0fdf4', borderRadius: 1.5, fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#15803d' }}>
          #{(entry as any).appointment_id}
        </Box>
      ) : <Typography sx={{ fontSize: 12, color: '#d1d5db' }}>—</Typography>,
    },
    {
      key: 'visit_type', header: 'VISIT TYPE',
      render: entry => (
        <Box sx={{ display: 'inline-flex', px: 2, py: 0.5, bgcolor: '#f9fafb', borderRadius: 1.5, fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
        </Box>
      ),
    },
    {
      key: 'priority', header: 'PRIORITY',
      render: entry => {
        const cfg = PRIORITY_CFG[entry.priority] ?? PRIORITY_CFG.normal;
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600 }}>
            {entry.priority === 'emergency' && <EmergencyIcon sx={{ fontSize: 13 }} />}
            {entry.priority === 'urgent'    && <UrgentIcon    sx={{ fontSize: 13 }} />}
            {cfg.label}
          </Box>
        );
      },
    },
    {
      key: 'status', header: 'STATUS',
      render: entry => {
        const cfg = STATUS_CFG[entry.status] ?? STATUS_CFG.cancelled;
        return (
          <Box sx={{ display: 'inline-flex', px: 2, py: 0.5, bgcolor: cfg.bg, color: cfg.color, borderRadius: 1.5, fontSize: 12, fontWeight: 600 }}>
            {cfg.label}
          </Box>
        );
      },
    },
    {
      key: 'wait_time', header: 'WAIT TIME',
      render: entry => {
        const active = entry.status === 'waiting' || entry.status === 'in_consultation';
        return active ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <WaitIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
            <Typography sx={{ fontSize: 13, color: '#6b7280' }}>{waitTime(entry.checked_in_at)}</Typography>
          </Box>
        ) : <Typography sx={{ fontSize: 13, color: '#d1d5db' }}>—</Typography>;
      },
    },
    {
      key: 'actions', header: 'ACTIONS', align: 'right',
      render: entry => {
        const isWaiting = entry.status === 'waiting';
        const isConsult = entry.status === 'in_consultation';
        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {isWaiting && (
              <Tooltip title="Call Patient">
                <IconButton size="small" onClick={() => setCallTarget(entry)}
                  sx={{ color: '#6b7280', bgcolor: '#f9fafb', borderRadius: 1.5, width: 32, height: 32, '&:hover': { bgcolor: '#eff6ff', color: '#3b82f6' } }}>
                  <CallIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            {isConsult && (
              <Tooltip title="Complete Consultation">
                <IconButton size="small" onClick={() => setCompleteTarget(entry)}
                  sx={{ color: '#6b7280', bgcolor: '#f9fafb', borderRadius: 1.5, width: 32, height: 32, '&:hover': { bgcolor: '#ecfdf5', color: '#059669' } }}>
                  <CompleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            {(isWaiting || isConsult) && (
              <Tooltip title="Cancel">
                <IconButton size="small" onClick={() => setCancelTarget(entry)}
                  sx={{ color: '#6b7280', bgcolor: '#f9fafb', borderRadius: 1.5, width: 32, height: 32, '&:hover': { bgcolor: '#fee2e2', color: '#dc2626' } }}>
                  <CancelIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            {!isWaiting && !isConsult && (
              <Typography sx={{ fontSize: 12, color: '#d1d5db', lineHeight: '32px' }}>—</Typography>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ px: 3 }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 700, fontSize: '20px', color: '#111827', margin: '0 0 8px 0' }}>
            Queue Dashboard
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            {today} · Auto-refreshes every 30 seconds
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Next Patient Banner ── */}
      {nextEntry && (
        <Box sx={{
          mb: 3, borderRadius: 2, overflow: 'hidden',
          border: '1px solid #10b981',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          p: 2.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 50, height: 50, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <NextIcon sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.25 }}>
                Next in Queue
              </Typography>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
                #{nextEntry.queue_number} · {nextEntry.patient.name}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                {VISIT_LABEL[nextEntry.visit_type] ?? nextEntry.visit_type} · Waiting {waitTime(nextEntry.checked_in_at)}
              </Typography>
            </Box>
          </Box>
          <button
            onClick={() => setCallTarget(nextEntry)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', background: '#fff', color: '#059669',
              border: 'none', borderRadius: '8px', fontSize: '13px',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}
          >
            <CallIcon style={{ fontSize: 16 }} />
            Call Patient
          </button>
        </Box>
      )}

      {/* ── Stats Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        {[
          { label: 'Total Today',      value: stats?.total           ?? '-', icon: <TotalIcon />,   color: 'primary' },
          { label: 'Waiting',          value: stats?.waiting         ?? '-', icon: <WaitIcon />,    color: 'info'    },
          { label: 'In Consultation',  value: stats?.in_consultation ?? '-', icon: <ConsultIcon />, color: 'warning' },
          { label: 'Completed',        value: stats?.completed       ?? '-', icon: <DoneIcon />,    color: 'success' },
          { label: 'Cancelled',        value: stats?.cancelled       ?? '-', icon: <CancelIcon />,  color: 'error'   },
        ].map(s => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label={s.label} value={s.value} icon={s.icon} color={s.color} loading={!stats} />
          </Grid>
        ))}
      </Grid>

      {/* ── Progress bar ── */}
      {stats && stats.total > 0 && (
        <Paper elevation={0} sx={{
          border: '1px solid', borderColor: '#f3f4f6', borderRadius: 3,
          background: '#ffffff', p: 3, mb: 3,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Today's Progress</Typography>
            <Typography sx={{ fontSize: 13, color: '#6b7280' }}>
              {stats.completed} of {stats.total} done ({Math.round((stats.completed / stats.total) * 100)}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.round((stats.completed / stats.total) * 100)}
            sx={{
              height: 8, borderRadius: 4,
              bgcolor: '#f3f4f6',
              '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 },
            }}
          />
          {stats.by_visit_type && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mt: 1.5 }}>
              {Object.entries(stats.by_visit_type).map(([type, count]) => (
                <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                  <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                    {VISIT_LABEL[type] ?? type}: <strong>{String(count)}</strong>
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* ── Table ── */}
      <Paper elevation={0} sx={{
        border: '1px solid', borderColor: '#f3f4f6',
        borderRadius: 3, overflow: 'hidden',
        background: '#ffffff', p: 3,
      }}>
        {/* Filter bar */}
        <Box sx={{ pb: 3, borderBottom: '1px solid #f3f4f6' }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 6, md: 5 }}>
              <TextField
                fullWidth size="small"
                placeholder="Search patient name or queue #…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
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
                    bgcolor: '#fafafa', borderRadius: 2,
                    '& fieldset': { borderColor: '#f3f4f6' },
                    '&:hover fieldset': { borderColor: '#e5e7eb' },
                    '&.Mui-focused fieldset': { borderColor: '#10b981' },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status" value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                  sx={{
                    bgcolor: '#fafafa', borderRadius: 2,
                    '& fieldset': { borderColor: '#f3f4f6' },
                    '&:hover fieldset': { borderColor: '#e5e7eb' },
                    '&.Mui-focused fieldset': { borderColor: '#10b981' },
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="waiting">Waiting</MenuItem>
                  <MenuItem value="in_consultation">In Consultation</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 2, md: 2 }}>
              <Button fullWidth variant="outlined" size="small"
                onClick={() => { setSearch(''); setStatusFilter(''); setPage(0); }}
                sx={{
                  borderRadius: 2, borderColor: '#e5e7eb', color: '#6b7280',
                  textTransform: 'none', fontWeight: 500,
                  '&:hover': { borderColor: '#d1d5db', bgcolor: '#fafafa' },
                }}>
                Clear
              </Button>
            </Grid>
          </Grid>
        </Box>

        <DataTable
          columns={columns}
          rows={paginated}
          loading={loading}
          skeletonRows={rowsPerPage}
          rowKey={e => e.queue_id}
          emptyIcon={<WaitIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
          emptyTitle={statusFilter ? `No ${STATUS_CFG[statusFilter]?.label ?? statusFilter} patients` : 'Queue is empty'}
          emptySubtitle="Patients added by registration will appear here"
        />

        <TablePager
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={n => { setRowsPerPage(n); setPage(0); }}
        />
      </Paper>

      {/* ── Confirmation Modals ── */}
      {callTarget && (
        <ConfirmationModal
          variant="confirm"
          title="Call Patient"
          message={<>Call <strong>#{callTarget.queue_number} · {callTarget.patient.name}</strong> for consultation?</>}
          confirmLabel="Yes, Call Now"
          cancelLabel="Cancel"
          onConfirm={() => { handleCall(callTarget); setCallTarget(null); }}
          onCancel={() => setCallTarget(null)}
        />
      )}

      {cancelTarget && (
        <ConfirmationModal
          variant="danger"
          title="Cancel Queue Entry"
          message={<>Remove <strong>#{cancelTarget.queue_number} · {cancelTarget.patient.name}</strong> from the queue?</>}
          confirmLabel="Yes, Cancel"
          cancelLabel="Go Back"
          onConfirm={() => { handleCancel(cancelTarget); setCancelTarget(null); }}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      <CompleteDialog
        open={!!completeTarget}
        entry={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onDone={() => { loadData(); toast('Consultation completed'); }}
      />

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
