import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton,
  Paper, Snackbar, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  AccessTime as WaitIcon,
  Cancel as CancelIcon,
  Done as CompleteIcon,
  Phone as CallIcon,
  Refresh as RefreshIcon,
  Warning as UrgentIcon,
  Error as EmergencyIcon,
} from '@mui/icons-material';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';

// Clean queue module imports
import type { QueueEntry } from '../types';
import { VISIT_LABEL, STATUS_CFG, PRIORITY_CFG, waitTime } from '../types';
import { useQueueData } from '../hooks';
import { callQueuePatient, cancelQueueEntry } from '../services';
import {
  AddToQueueModal,
  CompleteDialog,
  NextPatientBanner,
  QueueActions,
  QueueFilterBar,
  QueueStatsGrid,
} from '../components';

export default function QueueDashboard() {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const { queue, stats, loading, nextEntry, reload } = useQueueData(msg => toast(msg, 'error'));

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(10);

  const [callTarget, setCallTarget]         = useState<QueueEntry | null>(null);
  const [cancelTarget, setCancelTarget]     = useState<QueueEntry | null>(null);
  const [completeTarget, setCompleteTarget] = useState<QueueEntry | null>(null);

  // Form modals
  const [form2Target, setForm2Target]       = useState<QueueEntry | null>(null);
  const [form3Target, setForm3Target]       = useState<QueueEntry | null>(null);
  const [addToQueueOpen, setAddToQueueOpen] = useState(false);

  // User role
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || '');
    }
  }, []);

  const handleCall = async (entry: QueueEntry) => {
    try {
      await callQueuePatient(entry.queue_id);
      toast(`Called #${entry.queue_number} · ${entry.patient.name}`);
      reload();
    } catch {
      toast('Failed to call patient', 'error');
    }
  };

  const handleCancel = async (entry: QueueEntry) => {
    try {
      await cancelQueueEntry(entry.queue_id);
      toast(`Cancelled #${entry.queue_number}`);
      reload();
    } catch {
      toast('Failed to cancel queue entry', 'error');
    }
  };

  // Client-side filter + pagination
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

  // Table column definitions
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
      key: 'clinical_actions', header: 'CLINICAL FORMS', align: 'right',
      render: entry => (
        <QueueActions
          entry={entry}
          userRole={userRole}
          onEditForm2={e => setForm2Target(e)}
          onEditForm3={e => setForm3Target(e)}
        />
      ),
    },
    {
      key: 'queue_actions', header: 'QUEUE ACTIONS', align: 'right',
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
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 700, fontSize: '20px', color: '#111827', margin: '0 0 8px 0' }}>
            Queue Dashboard
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            {today} · Auto-refreshes every 30 seconds
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Queue</span>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}
          <Button
            variant="contained"
            onClick={() => setAddToQueueOpen(true)}
            sx={{
              bgcolor: '#065f46',
              '&:hover': { bgcolor: '#047857' },
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
            }}
            startIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            Add to Queue
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={reload} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Next Patient Banner */}
      {nextEntry && <NextPatientBanner entry={nextEntry} onCall={handleCall} />}

      {/* Stats Cards & Progress */}
      <QueueStatsGrid stats={stats} />

      {/* Queue Table */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', background: '#ffffff', p: 3 }}>
        <QueueFilterBar
          search={search}
          onSearchChange={v => { setSearch(v); setPage(0); }}
          statusFilter={statusFilter}
          onStatusChange={v => { setStatusFilter(v); setPage(0); }}
          onClear={() => { setSearch(''); setStatusFilter(''); setPage(0); }}
        />

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

      {/* Modals */}
      {callTarget && (
        <ConfirmationDialog
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
        <ConfirmationDialog
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
        onDone={() => { reload(); toast('Consultation completed'); }}
      />

      <GeneralTreatmentForm
        open={!!form2Target}
        entry={form2Target}
        onClose={() => setForm2Target(null)}
        onSave={() => { toast('Treatment record saved successfully'); reload(); }}
      />

      <VaccinationRecordForm
        open={!!form3Target}
        entry={form3Target}
        onClose={() => setForm3Target(null)}
        onSave={() => { toast('Vaccination record saved successfully'); reload(); }}
      />

      <AddToQueueModal
        open={addToQueueOpen}
        onClose={() => setAddToQueueOpen(false)}
        onSuccess={() => {
          setAddToQueueOpen(false);
          toast('Patient added to queue successfully');
          reload();
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
