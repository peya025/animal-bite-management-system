import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, CircularProgress, IconButton,
  Paper, Snackbar, Stack, Tooltip, Typography,
  MenuItem, Select, FormControl,
} from '@mui/material';
import {
  AccessTime as WaitIcon,
  Refresh as RefreshIcon,
  Warning as UrgentIcon,
  Error as EmergencyIcon,
  Restore as TrashBinIcon,
} from '@mui/icons-material';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Call02Icon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  ArrowUpRight01Icon,
  UserBlock01Icon,
  RotateLeft01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';

import type { QueueEntry } from '../types';
import { VISIT_LABEL, STATUS_CFG, PRIORITY_CFG, waitTime } from '../types';
import { useQueueData } from '../hooks';
import {
  callQueuePatient, cancelQueueEntry, markNoResponse,
  giveSecondChance, updateQueuePriority, trashQueueEntry,
} from '../services';
import {
  CompleteDialog,
  NextPatientBanner,
  QueueFilterBar,
  QueueStatsGrid,
  TrashBinModal,
} from '../components';
import { buildRoute, ROUTES } from '../../../shared/config/routes';

export default function QueueDashboard() {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const { queue, stats, loading, nextEntry, reload } = useQueueData(msg => toast(msg, 'error'));

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(15);

  // Action targets
  const [callTarget, setCallTarget]             = useState<QueueEntry | null>(null);
  const [cancelTarget, setCancelTarget]         = useState<QueueEntry | null>(null);
  const [completeTarget, setCompleteTarget]     = useState<QueueEntry | null>(null);
  const [noResponseTarget, setNoResponseTarget] = useState<QueueEntry | null>(null);
  const [secondChanceTarget, setSecondChanceTarget] = useState<QueueEntry | null>(null);
  const [trashTarget, setTrashTarget]           = useState<QueueEntry | null>(null);
  const [showTrashBin, setShowTrashBin]         = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  const handleNoResponse = async (entry: QueueEntry) => {
    try {
      await markNoResponse(entry.queue_id);
      toast(`#${entry.queue_number} marked as No Response`);
      reload();
    } catch {
      toast('Failed to mark no response', 'error');
    }
  };

  const handleSecondChance = async (entry: QueueEntry) => {
    try {
      await giveSecondChance(entry.queue_id);
      toast(`#${entry.queue_number} re-queued — Second Chance granted`);
      reload();
    } catch {
      toast('Failed to give second chance', 'error');
    }
  };

  const handlePriorityChange = async (entry: QueueEntry, priority: 'normal' | 'urgent' | 'emergency') => {
    try {
      await updateQueuePriority(entry.queue_id, priority);
      toast(`Priority updated to ${priority} for #${entry.queue_number}`);
      reload();
    } catch {
      toast('Failed to update priority', 'error');
    }
  };

  const handleTrash = async (entry: QueueEntry) => {
    try {
      await trashQueueEntry(entry.queue_id);
      toast(`#${entry.queue_number} moved to trash`);
      reload();
    } catch {
      toast('Failed to trash queue entry', 'error');
    }
  };

  // ── Filter + Pagination ───────────────────────────────────────────────────

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

  // ── Table Columns ─────────────────────────────────────────────────────────

  const columns: ColumnDef<QueueEntry>[] = [
    {
      key: 'queue_id', header: 'QUEUE ID', width: '90px',
      render: entry => (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.25, bgcolor: 'var(--bg-secondary)', borderRadius: 1, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
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
      render: entry => {
        const queueDateStr = entry.queue_date ? new Date(entry.queue_date).toISOString().split('T')[0] : '';
        const todayStr = new Date().toISOString().split('T')[0];
        const isCarryOver = entry.is_carry_over || (queueDateStr && queueDateStr < todayStr);
        const isActive = entry.status === 'waiting' || entry.status === 'in_consultation';
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)', lineHeight: 1.3 }}>{entry.patient.name}</Typography>
              {isCarryOver && isActive && (
                <Box sx={{ px: 1, py: 0.2, bgcolor: '#fef3c7', color: '#92400e', borderRadius: 1, fontSize: 10, fontWeight: 700 }}>
                  Carried Over ({queueDateStr ? new Date(queueDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Past Date'})
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mt: 0.25 }}>
              {entry.patient.age}y · {entry.patient.gender}
              {entry.biteIncident && ` · ${entry.biteIncident.case_number}`}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'visit_type', header: 'VISIT TYPE',
      render: entry => (
        <Box sx={{ display: 'inline-flex', px: 2, py: 0.5, bgcolor: 'var(--bg-secondary)', borderRadius: 1.5, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
        </Box>
      ),
    },
    {
      // ── SEGREGATE: inline priority dropdown ──
      key: 'priority', header: 'PRIORITY',
      render: entry => {
        const cfg = PRIORITY_CFG[entry.priority] ?? PRIORITY_CFG.normal;
        const isActive = entry.status === 'waiting' || entry.status === 'in_consultation';
        if (!isActive) {
          return (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600 }}>
              {entry.priority === 'emergency' && <EmergencyIcon sx={{ fontSize: 13 }} />}
              {entry.priority === 'urgent'    && <UrgentIcon    sx={{ fontSize: 13 }} />}
              {cfg.label}
            </Box>
          );
        }
        return (
          <FormControl size="small" variant="outlined">
            <Select
              value={entry.priority}
              onChange={e => handlePriorityChange(entry, e.target.value as 'normal' | 'urgent' | 'emergency')}
              renderValue={val => {
                const c = PRIORITY_CFG[val] ?? PRIORITY_CFG.normal;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: c.color, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                    {val === 'emergency' && <EmergencyIcon sx={{ fontSize: 13 }} />}
                    {val === 'urgent'    && <UrgentIcon    sx={{ fontSize: 13 }} />}
                    {c.label}
                  </Box>
                );
              }}
              sx={{
                fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
                bgcolor: cfg.bg, color: cfg.color,
                borderRadius: 1.5, minWidth: 110,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: cfg.color },
                '& .MuiSelect-select': { py: 0.5, px: 1.5, fontFamily: 'inherit' },
              }}
              MenuProps={{ slotProps: { paper: { sx: { '& .MuiMenuItem-root': { fontFamily: 'inherit', fontSize: 13 } } } } }}
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
            </Select>
          </FormControl>
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
            <WaitIcon sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>{waitTime(entry.checked_in_at)}</Typography>
          </Box>
        ) : <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>—</Typography>;
      },
    },
    {
      key: 'view', header: 'VIEW', align: 'right' as const, width: '90px',
      render: entry => (
        <Tooltip title="View Patient Details & Forms">
          <button
            onClick={() => navigate(buildRoute(ROUTES.QUEUE.PATIENT_DETAIL, { queueId: entry.queue_id }))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 13px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              color: '#059669',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(16, 185, 129, 0.05)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.background = '#d1fae5';
              el.style.borderColor = '#6ee7b7';
              el.style.color = '#047857';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.background = '#ecfdf5';
              el.style.borderColor = '#a7f3d0';
              el.style.color = '#059669';
            }}
          >
            View
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} strokeWidth={2.2} />
          </button>
        </Tooltip>
      ),
    },
    {
      key: 'queue_actions', header: 'QUEUE ACTIONS', align: 'right',
      render: entry => {
        const isWaiting    = entry.status === 'waiting';
        const isConsult    = entry.status === 'in_consultation';
        const isNoResponse = entry.status === 'no_response';
        const isActive     = isWaiting || isConsult;

        return (
          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', alignItems: 'center' }}>
            {/* Call */}
            {isWaiting && (
              <Tooltip title="Call Patient to Station">
                <IconButton
                  size="small"
                  onClick={() => setCallTarget(entry)}
                  sx={{
                    color: '#2563eb',
                    bgcolor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#dbeafe',
                      borderColor: '#93c5fd',
                      color: '#1d4ed8',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 5px rgba(37, 99, 235, 0.15)',
                    },
                  }}
                >
                  <HugeiconsIcon icon={Call02Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}
            {/* Complete */}
            {isConsult && (
              <Tooltip title="Complete Consultation">
                <IconButton
                  size="small"
                  onClick={() => setCompleteTarget(entry)}
                  sx={{
                    color: '#059669',
                    bgcolor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#d1fae5',
                      borderColor: '#6ee7b7',
                      color: '#047857',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 5px rgba(16, 185, 129, 0.15)',
                    },
                  }}
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}
            {/* No Response */}
            {isActive && (
              <Tooltip title="Mark No Response">
                <IconButton
                  size="small"
                  onClick={() => setNoResponseTarget(entry)}
                  sx={{
                    color: '#9333ea',
                    bgcolor: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#f3e8ff',
                      borderColor: '#d8b4fe',
                      color: '#7e22ce',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 5px rgba(147, 51, 234, 0.15)',
                    },
                  }}
                >
                  <HugeiconsIcon icon={UserBlock01Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}
            {/* Second Chance */}
            {isNoResponse && (
              <Tooltip title="Give Second Chance (re-queue)">
                <IconButton
                  size="small"
                  onClick={() => setSecondChanceTarget(entry)}
                  sx={{
                    color: '#7c3aed',
                    bgcolor: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#ede9fe',
                      borderColor: '#c4b5fd',
                      color: '#6d28d9',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 5px rgba(124, 58, 237, 0.15)',
                    },
                  }}
                >
                  <HugeiconsIcon icon={RotateLeft01Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}
            {/* Cancel */}
            {isActive && (
              <Tooltip title="Cancel Queue Entry">
                <IconButton
                  size="small"
                  onClick={() => setCancelTarget(entry)}
                  sx={{
                    color: '#dc2626',
                    bgcolor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#fee2e2',
                      borderColor: '#fca5a5',
                      color: '#b91c1c',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 5px rgba(220, 38, 38, 0.15)',
                    },
                  }}
                >
                  <HugeiconsIcon icon={CancelCircleIcon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}
            {/* Trash */}
            {!isConsult && (
              <Tooltip title="Move to Trash">
                <IconButton
                  size="small"
                  onClick={() => setTrashTarget(entry)}
                  sx={{
                    color: '#64748b',
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#fee2e2',
                      borderColor: '#fca5a5',
                      color: '#dc2626',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 5px rgba(220, 38, 38, 0.15)',
                    },
                  }}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}
            {/* Completed / cancelled — no actions */}
            {entry.status === 'completed' && (
              <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '32px', px: 0.5 }}>—</Typography>
            )}
          </Box>
        );
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ px: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 600, fontSize: '25px', lineHeight: 1.2, letterSpacing: '-0.5px', color: 'var(--text-h)', margin: '0 0 7px 0' }}>
            Queue Dashboard
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
            {today} · Auto-refreshes every 30 seconds
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}>
              Dashboard
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>›</span>
            <span style={{ color: 'var(--text-secondary)' }}>Queue</span>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}

          {/* Queue Display button */}
          <Tooltip title="Open Queue Display (Full Screen)">
            <button
              onClick={() => window.open('/queue/display', '_blank', 'width=1280,height=720')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              Queue Display
            </button>
          </Tooltip>

          {/* Trash Bin button */}
          <Tooltip title="Trash Bin — View removed entries">
            <IconButton onClick={() => setShowTrashBin(true)} sx={{ color: '#dc2626', bgcolor: '#fee2e2', borderRadius: 1.5, '&:hover': { bgcolor: '#fecaca' } }}>
              <TrashBinIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={reload} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Next Patient Banner */}
      {nextEntry && <NextPatientBanner entry={nextEntry} onCall={handleCall} />}

      {/* Stats */}
      <QueueStatsGrid stats={stats} />

      {/* Queue Table */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', background: 'background.paper', p: 3 }}>
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
          emptyIcon={<WaitIcon sx={{ fontSize: 36, color: 'var(--text-secondary)' }} />}
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

      {/* ── Confirmation Dialogs ── */}

      {/* Call */}
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

      {/* Cancel */}
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

      {/* No Response */}
      {noResponseTarget && (
        <ConfirmationDialog
          variant="confirm"
          title="Mark as No Response"
          message={<><strong>#{noResponseTarget.queue_number} · {noResponseTarget.patient.name}</strong> did not respond when called. Mark as No Response?</>}
          confirmLabel="Mark No Response"
          cancelLabel="Go Back"
          onConfirm={() => { handleNoResponse(noResponseTarget); setNoResponseTarget(null); }}
          onCancel={() => setNoResponseTarget(null)}
        />
      )}

      {/* Second Chance */}
      {secondChanceTarget && (
        <ConfirmationDialog
          variant="confirm"
          title="Give Second Chance"
          message={<>Re-queue <strong>#{secondChanceTarget.queue_number} · {secondChanceTarget.patient.name}</strong> at the end of today's queue?</>}
          confirmLabel="Yes, Re-queue"
          cancelLabel="Go Back"
          onConfirm={() => { handleSecondChance(secondChanceTarget); setSecondChanceTarget(null); }}
          onCancel={() => setSecondChanceTarget(null)}
        />
      )}

      {/* Trash */}
      {trashTarget && (
        <ConfirmationDialog
          variant="danger"
          title="Move to Trash"
          message={<>Move <strong>#{trashTarget.queue_number} · {trashTarget.patient.name}</strong> to trash? You can restore it from the Trash Bin.</>}
          confirmLabel="Move to Trash"
          cancelLabel="Go Back"
          onConfirm={() => { handleTrash(trashTarget); setTrashTarget(null); }}
          onCancel={() => setTrashTarget(null)}
        />
      )}

      {/* Complete */}
      <CompleteDialog
        open={!!completeTarget}
        entry={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onDone={() => { reload(); toast('Consultation completed'); }}
      />

      {/* Trash Bin Modal */}
      <TrashBinModal
        open={showTrashBin}
        onClose={() => setShowTrashBin(false)}
        onRestored={() => { reload(); toast('Entry restored to queue'); }}
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
