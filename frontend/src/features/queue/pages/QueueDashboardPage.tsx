import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  SkipNext as CallNextIcon,
} from '@mui/icons-material';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Call02Icon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  ArrowUpRight01Icon,
  UserBlock01Icon,
  Delete02Icon,
  CheckmarkBadge04Icon,
} from '@hugeicons/core-free-icons';

import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import type { QueueEntry } from '../types';
import { VISIT_LABEL, STATUS_CFG, PRIORITY_CFG, CATEGORY_CFG, CATEGORY_LABEL, getPriorityDisplayLabel, waitTime, MAIN_STATUSES } from '../types';
import { useQueueData } from '../hooks';
import {
  callNext, callQueuePatient, serveQueuePatient, markNoResponse,
  recallQueuePatient, markAbsent, cancelQueueEntry,
  updateQueuePriority, trashQueueEntry,
} from '../services';
import {
  CompleteDialog,
  NextPatientBanner,
  QueueFilterBar,
  QueueStatsGrid,
  TrashBinModal,
  SecondChanceQueuePanel,
  TreatmentTransferArchivePanel,
  TreatmentCompletedPanel,
} from '../components';
import { buildRoute, ROUTES } from '../../../shared/config/routes';
import { useAuth } from '../../../contexts/AuthContext';
import StockLevelIndicator from '../../inventory/components/StockLevelIndicator/StockLevelIndicator';

const TRIAGE_VISIT_TYPES = ['new_case', 'follow_up', 'observation', 'consultation'];
const TREATMENT_VISIT_TYPES = ['vaccination'];

function isPriorityQueueEntry(entry: QueueEntry): boolean {
  return ['priority', 'pregnant', 'senior_citizen', 'pwd'].includes(entry.queue_category)
    || entry.priority === 'urgent'
    || entry.priority === 'emergency';
}

function priorityCategoryRank(entry: QueueEntry): number {
  switch (entry.queue_category) {
    case 'priority':
      return 0;
    case 'pregnant':
    case 'senior_citizen':
    case 'pwd':
      return 1;
    case 'appointment':
      return 2;
    default:
      return 3;
  }
}

function priorityLevelRank(entry: QueueEntry): number {
  switch (entry.priority) {
    case 'emergency':
      return 0;
    case 'urgent':
      return 1;
    default:
      return 2;
  }
}

function displayRank(entry: QueueEntry): number {
  if (['called', 'serving', 'in_consultation'].includes(entry.status)) return 0;
  if (entry.status === 'waiting' && isPriorityQueueEntry(entry)) return 1;
  if (entry.status === 'waiting') return 2;
  if (['second_chance', 'final_recall'].includes(entry.status)) return 3;
  return 4;
}

function sortQueueForDisplay(a: QueueEntry, b: QueueEntry): number {
  const rankDiff = displayRank(a) - displayRank(b);
  if (rankDiff !== 0) return rankDiff;

  const categoryDiff = priorityCategoryRank(a) - priorityCategoryRank(b);
  if (categoryDiff !== 0) return categoryDiff;

  const priorityDiff = priorityLevelRank(a) - priorityLevelRank(b);
  if (priorityDiff !== 0) return priorityDiff;

  return a.queue_number - b.queue_number;
}

function getScopedNextEntry(entries: QueueEntry[]): QueueEntry | null {
  const waitingEntries = entries.filter(entry => entry.status === 'waiting');
  if (waitingEntries.length === 0) return null;
  return [...waitingEntries].sort(sortQueueForDisplay)[0] ?? null;
}

function getRegistrationStatusDisplay(entry: QueueEntry): { label: string; bg: string; color: string } {
  if (entry.status === 'completed') {
    return { label: 'Completed', bg: '#ecfdf5', color: '#059669' };
  }

  if (entry.status === 'cancelled') {
    return { label: 'Cancelled', bg: '#f3f4f6', color: '#6b7280' };
  }

  if (entry.status === 'absent') {
    return { label: 'Absent', bg: '#f1f5f9', color: '#475569' };
  }

  if (entry.status === 'no_response') {
    return { label: 'No Response', bg: '#fdf4ff', color: '#9333ea' };
  }

  if (TREATMENT_VISIT_TYPES.includes(entry.visit_type)) {
    return { label: 'Treatment', bg: '#ecfeff', color: '#0f766e' };
  }

  if (TRIAGE_VISIT_TYPES.includes(entry.visit_type)) {
    return { label: 'Triage', bg: '#eff6ff', color: '#2563eb' };
  }

  return { label: 'Queue', bg: '#f3f4f6', color: '#6b7280' };
}

export default function QueueDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const toast = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message: msg, severity });

  const queueToast = (location.state as { queueToast?: { message: string; severity: 'success' | 'error' } } | null)?.queueToast;
  if (queueToast && !snackbar.open && snackbar.message !== queueToast.message) {
    setSnackbar({ open: true, message: queueToast.message, severity: queueToast.severity });
    navigate(location.pathname, { replace: true, state: null });
  }

  const { queue, secondChanceQueue, stats, loading, nextEntry, reload } =
    useQueueData(msg => toast(msg, 'error'));

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page,         setPage]         = useState(0);
  const [rowsPerPage,  setRowsPerPage]  = useState(15);

  // ── Confirmation targets ────────────────────────────────────────────────────
  const [callTarget,       setCallTarget]       = useState<QueueEntry | null>(null);
  const [serveTarget,      setServeTarget]       = useState<QueueEntry | null>(null);
  const [cancelTarget,     setCancelTarget]     = useState<QueueEntry | null>(null);
  const [completeTarget,   setCompleteTarget]   = useState<QueueEntry | null>(null);
  const [noRespTarget,     setNoRespTarget]     = useState<QueueEntry | null>(null);
  const [recallTarget,     setRecallTarget]     = useState<QueueEntry | null>(null);
  const [absentTarget,     setAbsentTarget]     = useState<QueueEntry | null>(null);
  const [trashTarget,      setTrashTarget]      = useState<QueueEntry | null>(null);
  const [showTrashBin,     setShowTrashBin]     = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const run = async (fn: () => Promise<unknown>, successMsg: string, errMsg: string) => {
    try   { await fn(); toast(successMsg); reload(); }
    catch (err: unknown) {
      const response = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response
        : undefined;
      const msg = response?.data?.message ?? errMsg;
      toast(msg, 'error');
    }
  };

  const handleCallNext   = () => run(() => callNext(),                                  'Called next patient',                             'No patients waiting or failed to call next');
  const handleCall       = (e: QueueEntry) => run(() => callQueuePatient(e.queue_id),   `Called #${e.queue_number} · ${e.patient.name}`,   'Failed to call patient');
  const handleServe      = (e: QueueEntry) => run(() => serveQueuePatient(e.queue_id),  `#${e.queue_number} is now being served`,           'Failed to mark as serving');
  const handleNoResponse = (e: QueueEntry) => run(() => markNoResponse(e.queue_id),     `#${e.queue_number} moved to Second Chance Queue`, 'Failed to mark no response');
  const handleRecall     = (e: QueueEntry) => run(() => recallQueuePatient(e.queue_id), `#${e.queue_number} recalled`,                     'Failed to recall patient');
  const handleAbsent     = (e: QueueEntry) => run(() => markAbsent(e.queue_id),         `#${e.queue_number} marked as No-Show`,            'Failed to mark absent');
  const handleCancel     = (e: QueueEntry) => run(() => cancelQueueEntry(e.queue_id),   `Cancelled #${e.queue_number}`,                    'Failed to cancel');
  const handleTrash      = (e: QueueEntry) => run(() => trashQueueEntry(e.queue_id),    `#${e.queue_number} moved to trash`,               'Failed to trash entry');

  const handlePriorityChange = async (entry: QueueEntry, priority: 'normal' | 'urgent' | 'emergency') => {
    try   { await updateQueuePriority(entry.queue_id, priority); toast(`Priority updated to ${priority}`); reload(); }
    catch { toast('Failed to update priority', 'error'); }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const isRegistrationStaff = user?.role === 'registration';
  const isTriageDoctor = user?.role === 'triage';
  const isTreatmentNurse = user?.role === 'treatment';
  const transferredToTreatmentEntries = isTriageDoctor
    ? queue.filter(entry =>
        entry.visit_type === 'vaccination'
        && entry.consultation_notes?.includes('Doctor completed Form 2')
      )
    : [];
  const completedTreatmentEntries = isTreatmentNurse
    ? queue.filter(entry => entry.visit_type === 'vaccination' && entry.status === 'completed')
    : [];
  const visibleSecondChanceQueue = isTreatmentNurse ? [] : secondChanceQueue;
  const roleScopedQueue = isTriageDoctor
    ? queue.filter(entry => TRIAGE_VISIT_TYPES.includes(entry.visit_type))
    : isTreatmentNurse
      ? queue.filter(entry => TREATMENT_VISIT_TYPES.includes(entry.visit_type))
      : queue;
  const roleScopedNextEntry = isTriageDoctor || isTreatmentNurse
    ? getScopedNextEntry(roleScopedQueue)
    : nextEntry;
  const pageTitle = isTriageDoctor
    ? 'Triage Dashboard'
    : isTreatmentNurse
      ? 'Treatment Queue Dashboard'
      : isRegistrationStaff
        ? 'Registration Queue Dashboard'
        : user?.role === 'admin'
          ? 'Admin Queue Dashboard'
          : 'Queue Dashboard';
  const queueSectionTitle = isTriageDoctor
    ? 'Triage Queue'
    : isTreatmentNurse
      ? 'Treatment Queue'
      : isRegistrationStaff
        ? 'Registration Queue'
        : user?.role === 'admin'
          ? 'Admin Queue'
          : 'Main Queue';

  // ── Filter + Pagination ───────────────────────────────────────────────────

  const filtered  = roleScopedQueue.filter(q => {
    const matchSearch = !search ||
      q.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      String(q.queue_number).includes(search);
    const matchStatus   = !statusFilter   || q.status         === statusFilter;
    const matchCategory = !categoryFilter || q.queue_category === categoryFilter;
    // Main table only shows active/second-chance entries unless a specific status filter is set
    const isActiveOrFiltered = statusFilter
      ? true
      : (MAIN_STATUSES as string[]).includes(q.status);
    return matchSearch && matchStatus && matchCategory && isActiveOrFiltered;
  });
  const sortedQueue = isTriageDoctor || isTreatmentNurse
    ? [...filtered].sort(sortQueueForDisplay)
    : filtered;
  const paginated = sortedQueue.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Table Columns ─────────────────────────────────────────────────────────

  const columns: ColumnDef<QueueEntry>[] = [
    {
      key: 'queue_id', header: 'QUEUE ID', width: '90px',
      render: e => (
        <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.25, bgcolor: 'var(--bg-secondary)', borderRadius: 1, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
          #{e.queue_id}
        </Box>
      ),
    },
    {
      key: 'queue_number', header: 'QUEUE #', width: '80px',
      render: e => (
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#3b82f6' }}>{e.queue_number}</Typography>
        </Box>
      ),
    },
    {
      key: 'queue_category', header: 'CATEGORY', width: '120px',
      render: e => {
        const cfg = CATEGORY_CFG[e.queue_category] ?? CATEGORY_CFG.regular;
        const label = CATEGORY_LABEL[e.queue_category] ?? e.queue_category;
        return (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1.25, py: 0.4,
            bgcolor: cfg.bg, color: cfg.color,
            borderRadius: 1.5, fontSize: 11, fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            {cfg.icon} {label}
          </Box>
        );
      },
    },
    {
      key: 'patient', header: 'PATIENT',
      render: e => {
        const qDate   = e.queue_date ? new Date(e.queue_date).toISOString().split('T')[0] : '';
        const todayStr = new Date().toISOString().split('T')[0];
        const isCarry  = e.is_carry_over || (qDate && qDate < todayStr);
        const isActive = MAIN_STATUSES.includes(e.status);
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)', lineHeight: 1.3 }}>{e.patient.name}</Typography>
              {isCarry && isActive && (
                <Box sx={{ px: 1, py: 0.2, bgcolor: '#fef3c7', color: '#92400e', borderRadius: 1, fontSize: 10, fontWeight: 700 }}>
                  Carried Over {qDate ? `(${new Date(qDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''}
                </Box>
              )}
              {e.call_count > 0 && (
                <Box sx={{ px: 1, py: 0.2, bgcolor: '#f3e8ff', color: '#7e22ce', borderRadius: 1, fontSize: 10, fontWeight: 700 }}>
                  Called {e.call_count}×
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mt: 0.25 }}>
              {e.patient.age}y · {e.patient.gender}
              {e.biteIncident && ` · ${e.biteIncident.case_number}`}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'visit_type', header: 'VISIT TYPE',
      render: e => (
        <Box sx={{ display: 'inline-flex', px: 2, py: 0.5, bgcolor: 'var(--bg-secondary)', borderRadius: 1.5, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          {VISIT_LABEL[e.visit_type] ?? e.visit_type}
        </Box>
      ),
    },
    {
      key: 'priority', header: 'PRIORITY',
      render: e => {
        const cfg = PRIORITY_CFG[e.priority] ?? PRIORITY_CFG.normal;
        const isActive = MAIN_STATUSES.includes(e.status);
        const canEditPriority = isActive && !isRegistrationStaff;
        if (!canEditPriority) {
          return (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600 }}>
              {e.priority === 'emergency' && <EmergencyIcon sx={{ fontSize: 13 }} />}
              {e.priority === 'urgent'    && <UrgentIcon    sx={{ fontSize: 13 }} />}
              {getPriorityDisplayLabel(e.priority, e.queue_category)}
            </Box>
          );
        }
        return (
          <FormControl size="small" variant="outlined">
            <Select
              value={e.priority}
              onChange={ev => handlePriorityChange(e, ev.target.value as 'normal' | 'urgent' | 'emergency')}
              renderValue={val => {
                const c = PRIORITY_CFG[val] ?? PRIORITY_CFG.normal;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: c.color, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                    {val === 'emergency' && <EmergencyIcon sx={{ fontSize: 13 }} />}
                    {val === 'urgent'    && <UrgentIcon    sx={{ fontSize: 13 }} />}
                    {getPriorityDisplayLabel(val, e.queue_category)}
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
              <MenuItem value="urgent">{['priority', 'pregnant', 'senior_citizen', 'pwd'].includes(e.queue_category) ? 'Priority' : 'Urgent'}</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
            </Select>
          </FormControl>
        );
      },
    },
    {
      key: 'status', header: 'STATUS',
      render: e => {
        const cfg = isRegistrationStaff
          ? getRegistrationStatusDisplay(e)
          : (STATUS_CFG[e.status] ?? STATUS_CFG.cancelled);
        return (
          <Box sx={{ display: 'inline-flex', px: 2, py: 0.5, bgcolor: cfg.bg, color: cfg.color, borderRadius: 1.5, fontSize: 12, fontWeight: 600 }}>
            {cfg.label}
          </Box>
        );
      },
    },
    {
      key: 'wait_time', header: 'WAIT TIME',
      render: e => {
        const active = MAIN_STATUSES.includes(e.status);
        return active
          ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WaitIcon sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>{waitTime(e.checked_in_at)}</Typography>
            </Box>
          : <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>—</Typography>;
      },
    },
    {
      key: 'view', header: 'VIEW', align: 'right' as const, width: '90px',
      render: e => (
        <Tooltip title="View Patient Details & Forms">
          <button
            onClick={() => navigate(buildRoute(ROUTES.QUEUE.PATIENT_DETAIL, { queueId: e.queue_id }))}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 13px', background: '#ecfdf5', border: '1px solid #a7f3d0',
              borderRadius: 8, color: '#059669', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
            }}
            onMouseEnter={el => { (el.currentTarget as HTMLElement).style.background = '#d1fae5'; }}
            onMouseLeave={el => { (el.currentTarget as HTMLElement).style.background = '#ecfdf5'; }}
          >
            View <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} strokeWidth={2.2} />
          </button>
        </Tooltip>
      ),
    },
    {
      key: 'queue_actions', header: 'QUEUE ACTIONS', align: 'right',
      render: e => {
        const isWaiting = e.status === 'waiting';
        const isCalled  = e.status === 'called';
        const isServing = e.status === 'serving' || e.status === 'in_consultation';
        const isActive  = MAIN_STATUSES.includes(e.status);
        const isDone    = ['completed', 'cancelled', 'absent'].includes(e.status);
        const canCancelOrTrash = !isTriageDoctor;

        return (
          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', alignItems: 'center' }}>

            {/* Call — waiting only */}
            {isWaiting && (
              <Tooltip title="Call Patient to Station">
                <IconButton size="small" onClick={() => setCallTarget(e)}
                  sx={actionBtn('#2563eb', '#eff6ff', '#bfdbfe', '#dbeafe', '#93c5fd', '#1d4ed8')}>
                  <HugeiconsIcon icon={Call02Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}

            {/* Serve (patient responded) — called only */}
            {isCalled && (
              <Tooltip title="Patient Responded — Start Serving">
                <IconButton size="small" onClick={() => setServeTarget(e)}
                  sx={actionBtn('#0d9488', '#f0fdfa', '#99f6e4', '#ccfbf1', '#5eead4', '#0f766e')}>
                  <HugeiconsIcon icon={CheckmarkBadge04Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}

            {/* Complete — serving only */}
            {isServing && (
              <Tooltip title={isTriageDoctor ? 'Transfer to Treatment' : isTreatmentNurse ? 'Complete Treatment' : 'Complete Consultation'}>
                <IconButton size="small" onClick={() => setCompleteTarget(e)}
                  sx={actionBtn('#059669', '#ecfdf5', '#a7f3d0', '#d1fae5', '#6ee7b7', '#047857')}>
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}

            {/* No Response — waiting or called */}
            {(isWaiting || isCalled) && (
              <Tooltip title="No Response — Move to Second Chance">
                <IconButton size="small" onClick={() => setNoRespTarget(e)}
                  sx={actionBtn('#9333ea', '#faf5ff', '#e9d5ff', '#f3e8ff', '#d8b4fe', '#7e22ce')}>
                  <HugeiconsIcon icon={UserBlock01Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}

            {/* Cancel — any active */}
            {canCancelOrTrash && isActive && (
              <Tooltip title="Cancel Queue Entry">
                <IconButton size="small" onClick={() => setCancelTarget(e)}
                  sx={actionBtn('#dc2626', '#fef2f2', '#fecaca', '#fee2e2', '#fca5a5', '#b91c1c')}>
                  <HugeiconsIcon icon={CancelCircleIcon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}

            {/* Trash — not serving/in-consultation */}
            {canCancelOrTrash && !isServing && !isDone && (
              <Tooltip title="Move to Trash">
                <IconButton size="small" onClick={() => setTrashTarget(e)}
                  sx={actionBtn('#64748b', '#f8fafc', '#e2e8f0', '#fee2e2', '#fca5a5', '#dc2626')}>
                  <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />
                </IconButton>
              </Tooltip>
            )}

            {isDone && (
              <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', px: 0.5 }}>—</Typography>
            )}
          </Box>
        );
      },
    },
  ];

  const visibleColumns = isRegistrationStaff
    ? columns.filter(column => column.key !== 'queue_actions')
    : columns;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ px: 3 }}>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 600, fontSize: '25px', lineHeight: 1.2, letterSpacing: '-0.5px', color: 'var(--text-h)', margin: '0 0 7px 0' }}>
            {pageTitle}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            {today} · Auto-refreshes every 30 seconds
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}>
              Dashboard
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>›</span>
            <span style={{ color: 'var(--text-secondary)' }}>Queue</span>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}


          {/* Call Next */}
          {!isRegistrationStaff && user?.role !== 'admin' && !isTriageDoctor && roleScopedNextEntry && (
            <Tooltip title="Auto-call next eligible patient">
              <button
                onClick={() => {
                  if ((isTriageDoctor || isTreatmentNurse) && roleScopedNextEntry) {
                    handleCall(roleScopedNextEntry);
                    return;
                  }
                  handleCallNext();
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)', whiteSpace: 'nowrap',
                }}
              >
                <CallNextIcon style={{ fontSize: 16 }} />
                Call Next
              </button>
            </Tooltip>
          )}

          <Tooltip title="Open Queue Display (Full Screen)">
            <button
              onClick={() => window.open('/queue/display', '_blank', 'width=1280,height=720')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(13,148,136,0.3)', whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
              Queue Display
            </button>
          </Tooltip>

          {!isRegistrationStaff && (
            <Tooltip title="Trash Bin">
              <IconButton onClick={() => setShowTrashBin(true)} sx={{ color: '#dc2626', bgcolor: '#fee2e2', borderRadius: 1.5, '&:hover': { bgcolor: '#fecaca' } }}>
                <TrashBinIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={reload} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Priority 14: Live Clinic Stock-Level Color Coding */}
      <StockLevelIndicator compact={false} showLegend={true} />

      {/* Next Patient Banner */}
      {!isRegistrationStaff && user?.role !== 'admin' && roleScopedNextEntry && (
        <NextPatientBanner
          entry={roleScopedNextEntry}
          onCall={handleCall}
          onCallNext={(isTriageDoctor || isTreatmentNurse)
            ? (() => handleCall(roleScopedNextEntry))
            : handleCallNext}
          showActions={isTriageDoctor || !isRegistrationStaff}
        />
      )}

      {/* Stats */}
      <QueueStatsGrid stats={stats} />

      {/* ── SECOND CHANCE QUEUE PANEL (only when populated) ── */}
      {visibleSecondChanceQueue.length > 0 && (
        <SecondChanceQueuePanel
          entries={visibleSecondChanceQueue}
          loading={loading}
          onRecall={e => setRecallTarget(e)}
          onAbsent={e => setAbsentTarget(e)}
          canManage={!isRegistrationStaff && !isTreatmentNurse}
        />
      )}


      {isTriageDoctor && (
        <TreatmentTransferArchivePanel
          entries={transferredToTreatmentEntries}
          loading={loading}
        />
      )}

      {/* ── MAIN QUEUE TABLE ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', background: 'background.paper', p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--text-h)' }}>
            {queueSectionTitle}
          </Typography>
          {visibleSecondChanceQueue.length > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.4, bgcolor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: 1.5, fontSize: 12, fontWeight: 600 }}>
              ↩ {visibleSecondChanceQueue.length} in Second Chance Queue
            </Box>
          )}
        </Box>

        <QueueFilterBar
          search={search}
          onSearchChange={v => { setSearch(v); setPage(0); }}
          statusFilter={statusFilter}
          onStatusChange={v => { setStatusFilter(v); setPage(0); }}
          categoryFilter={categoryFilter}
          onCategoryChange={v => { setCategoryFilter(v); setPage(0); }}
          onClear={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setPage(0); }}
        />

        <DataTable
          columns={visibleColumns}
          rows={paginated}
          loading={loading}
          skeletonRows={rowsPerPage}
          rowKey={e => e.queue_id}
          emptyIcon={<WaitIcon sx={{ fontSize: 36, color: 'var(--text-secondary)' }} />}
          emptyTitle={statusFilter ? `No ${STATUS_CFG[statusFilter as keyof typeof STATUS_CFG]?.label ?? statusFilter} patients` : 'Queue is empty'}
          emptySubtitle="Patients added by registration will appear here"
        />

        <TablePager
          count={sortedQueue.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={n => { setRowsPerPage(n); setPage(0); }}
        />
      </Paper>

      {isTreatmentNurse && (
        <TreatmentCompletedPanel
          entries={completedTreatmentEntries}
          loading={loading}
        />
      )}

      {/* ── Confirmation Dialogs ── */}

      {callTarget && (
        <ConfirmationDialog variant="confirm" title="Call Patient"
          message={<>Call <strong>#{callTarget.queue_number} · {callTarget.patient.name}</strong> to the station?</>}
          confirmLabel="Call Now" cancelLabel="Cancel"
          onConfirm={() => { handleCall(callTarget); setCallTarget(null); }}
          onCancel={() => setCallTarget(null)} />
      )}

      {serveTarget && (
        <ConfirmationDialog variant="confirm" title="Patient Responded"
          message={<><strong>#{serveTarget.queue_number} · {serveTarget.patient.name}</strong> has responded. Start serving?</>}
          confirmLabel="Yes, Start Serving" cancelLabel="Cancel"
          onConfirm={() => { handleServe(serveTarget); setServeTarget(null); }}
          onCancel={() => setServeTarget(null)} />
      )}

      {noRespTarget && (
        <ConfirmationDialog variant="confirm" title="No Response"
          message={<><strong>#{noRespTarget.queue_number} · {noRespTarget.patient.name}</strong> did not respond. Move to Second Chance Queue and continue with next patient?</>}
          confirmLabel="Move to Second Chance" cancelLabel="Go Back"
          onConfirm={() => { handleNoResponse(noRespTarget); setNoRespTarget(null); }}
          onCancel={() => setNoRespTarget(null)} />
      )}

      {recallTarget && (
        <ConfirmationDialog variant="confirm"
          title={recallTarget.status === 'final_recall' ? 'Final Recall' : 'Recall Patient'}
          message={<>Recall <strong>#{recallTarget.queue_number} · {recallTarget.patient.name}</strong>{recallTarget.status === 'final_recall' ? ' — this is their FINAL opportunity' : ' from the Second Chance Queue'}?</>}
          confirmLabel="Recall Now" cancelLabel="Go Back"
          onConfirm={() => { handleRecall(recallTarget); setRecallTarget(null); }}
          onCancel={() => setRecallTarget(null)} />
      )}

      {absentTarget && (
        <ConfirmationDialog variant="danger" title="Mark as Absent"
          message={<>Mark <strong>#{absentTarget.queue_number} · {absentTarget.patient.name}</strong> as <strong>Absent</strong>? This is their final recall and they will be removed from active queues.</>}
          confirmLabel="Mark Absent" cancelLabel="Go Back"
          onConfirm={() => { handleAbsent(absentTarget); setAbsentTarget(null); }}
          onCancel={() => setAbsentTarget(null)} />
      )}

      {cancelTarget && (
        <ConfirmationDialog variant="danger" title="Cancel Queue Entry"
          message={<>Remove <strong>#{cancelTarget.queue_number} · {cancelTarget.patient.name}</strong> from the queue?</>}
          confirmLabel="Yes, Cancel" cancelLabel="Go Back"
          onConfirm={() => { handleCancel(cancelTarget); setCancelTarget(null); }}
          onCancel={() => setCancelTarget(null)} />
      )}

      {trashTarget && (
        <ConfirmationDialog variant="danger" title="Move to Trash"
          message={<>Move <strong>#{trashTarget.queue_number} · {trashTarget.patient.name}</strong> to trash? You can restore it later.</>}
          confirmLabel="Move to Trash" cancelLabel="Go Back"
          onConfirm={() => { handleTrash(trashTarget); setTrashTarget(null); }}
          onCancel={() => setTrashTarget(null)} />
      )}

      <CompleteDialog
        open={!!completeTarget}
        entry={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onDone={() => { reload(); toast(isTriageDoctor ? 'Patient transferred to treatment queue' : isTreatmentNurse ? 'Treatment completed' : 'Consultation completed'); }}
        mode={isTriageDoctor ? 'transfer' : isTreatmentNurse ? 'treatment' : 'complete'}
      />

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

// ── Action button style helper ─────────────────────────────────────────────
function actionBtn(
  color: string, bg: string, border: string,
  hoverBg: string, hoverBorder: string, hoverColor: string,
) {
  return {
    color, bgcolor: bg,
    border: `1px solid ${border}`,
    borderRadius: '8px', width: 32, height: 32,
    transition: 'all 0.15s ease',
    '&:hover': {
      bgcolor: hoverBg, borderColor: hoverBorder, color: hoverColor,
      transform: 'translateY(-1px)',
      boxShadow: `0 2px 5px ${color}30`,
    },
  } as const;
}
