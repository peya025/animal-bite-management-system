import { useState, useEffect, type ReactNode } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  MoreHoriz as MoreIcon,
  Cancel as CancelIcon,
  LockOutlined as LockIcon,
  PersonOff as NoRespIcon,
  Replay as RecallIcon,
  PersonOff as AbsentIcon,
} from '@mui/icons-material';
import { useQueueEntry } from '../hooks';
import { STATUS_CFG, PRIORITY_CFG, VISIT_LABEL, getPriorityDisplayLabel, waitTime, type QueueEntry } from '../types';
import { cancelQueueEntry, markNoResponse, recallQueuePatient, markAbsent } from '../services';
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { CompleteDialog } from './CompleteDialog';
import { getMembershipByType, getPatientMemberships } from '../../patients/utils/memberships';
import StockLevelIndicator from '../../inventory/components/StockLevelIndicator/StockLevelIndicator';

export interface QueuePatientDetailModalProps {
  open: boolean;
  queueId: number | string | null;
  onClose: () => void;
  onSaved?: () => void;
}

// ─── Role helpers ──────────────────────────────────────────────────────────
function canEdit(userRole: string, formOwner: 'registration' | 'triage' | 'treatment'): boolean {
  if (userRole === 'admin' || userRole === 'developer') return true;
  return userRole === formOwner;
}

function getStoredUserRole(): string {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return '';
    return JSON.parse(raw).role ?? '';
  } catch {
    return '';
  }
}

function getDefaultTabForRole(userRole: string, visitType?: string): string {
  if (visitType === 'vaccination' || visitType === 'follow_up') return 'form3';
  if (userRole === 'registration') return 'form1';
  if (userRole === 'triage') return 'form2';
  if (userRole === 'treatment') return 'form3';
  return 'form1';
}

function AwaitingTriageBanner() {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 2.5, py: 2,
      mb: 3,
      bgcolor: '#fffbeb',
      border: '1px solid #fcd34d',
      borderRadius: 2,
    }}>
      <LockIcon sx={{ fontSize: 18, color: '#d97706', flexShrink: 0 }} />
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400e', mb: 0.25 }}>
          Awaiting Doctor Triage (Form 2 Required)
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#b45309' }}>
          This is a new bite case. The physician must complete the Form 2 clinical assessment and exposure grading before initial Dose 1 (Day 0) can be recorded.
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Read-only Notice Banner ────────────────────────────────────────────────
function ReadOnlyBanner() {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 2.5, py: 1.5,
      mb: 3,
      bgcolor: '#fffbeb',
      border: '1px solid #fcd34d',
      borderRadius: 2,
    }}>
      <LockIcon sx={{ fontSize: 16, color: '#d97706', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13, color: '#92400e' }}>
        You are viewing this form in <strong>read-only mode</strong>.
      </Typography>
    </Box>
  );
}

// ─── Patient Hero Header ────────────────────────────────────────────────────
function ModalPatientHero({
  entry,
  userRole,
  onMenuOpen,
  onClose,
}: {
  entry: QueueEntry;
  userRole: string;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}) {
  const statusCfg  = STATUS_CFG[entry.status]  ?? STATUS_CFG.cancelled;
  const priorityCfg = PRIORITY_CFG[entry.priority] ?? PRIORITY_CFG.normal;
  const isActive   = ['waiting','called','in_consultation','serving','second_chance','final_recall'].includes(entry.status);

  const initials = entry.patient?.name
    ? entry.patient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      px: 3, py: 2.5,
      borderBottom: '1px solid #e5e7eb',
      bgcolor: '#ffffff',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Avatar */}
        <Box sx={{
          width: 48, height: 48,
          borderRadius: '50%',
          bgcolor: '#d1fae5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#065f46' }}>{initials}</Typography>
        </Box>

        <Box>
          {/* Name + badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>
              {entry.patient?.name}
            </Typography>
            <Box sx={{ px: 1.5, py: 0.25, bgcolor: '#eff6ff', borderRadius: 1.5, fontSize: 11, fontWeight: 600, color: '#2563eb' }}>
              {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
            </Box>
            <Box sx={{ px: 1.5, py: 0.25, bgcolor: priorityCfg.bg, borderRadius: 1.5, fontSize: 11, fontWeight: 600, color: priorityCfg.color }}>
              {getPriorityDisplayLabel(entry.priority, entry.queue_category)}
            </Box>
          </Box>

          {/* Meta row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6b7280', fontSize: 12 }}>
            <span>{entry.patient?.age}y</span>
            <span>·</span>
            <span style={{ textTransform: 'capitalize' }}>{entry.patient?.gender}</span>
            <span>·</span>
            <span>Queue #{entry.queue_number}</span>
            <span>·</span>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: statusCfg.color,
              }} />
              <span style={{ color: statusCfg.color, fontWeight: 600 }}>{statusCfg.label}</span>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Right side: wait time + actions menu + close button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isActive && (
          <Box sx={{ textAlign: 'right', mr: 1 }}>
            <Typography sx={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Wait time
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
              {waitTime(entry.checked_in_at)}
            </Typography>
          </Box>
        )}
        {(isActive || ['admin', 'developer'].includes(userRole)) && (
          <Tooltip title="Queue Actions">
            <IconButton size="small" onClick={onMenuOpen} sx={{ color: '#6b7280' }}>
              <MoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose} sx={{ color: '#9ca3af', '&:hover': { color: '#374151' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ─── Tab Bar ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'form1', label: 'Form 1', roleLabel: 'Registration', owner: 'registration' as const },
  { key: 'form2', label: 'Form 2', roleLabel: 'Doctor',       owner: 'triage'        as const },
  { key: 'form3', label: 'Form 3', roleLabel: 'Nurse',        owner: 'treatment'     as const },
];

function TabBar({ active, onSelect, userRole }: {
  active: string;
  onSelect: (key: string) => void;
  userRole: string;
}) {
  return (
    <Box sx={{ display: 'flex', borderBottom: '2px solid #f3f4f6', px: 3, bgcolor: '#ffffff' }}>
      {TABS.map(tab => {
        const editable = canEdit(userRole, tab.owner);
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#10b981' : '#6b7280',
            }}>
              {tab.label}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 999,
              backgroundColor: editable
                ? (isActive ? '#d1fae5' : '#f0fdf4')
                : (isActive ? '#f3f4f6' : '#f9fafb'),
              color: editable
                ? (isActive ? '#065f46' : '#059669')
                : '#9ca3af',
              border: `1px solid ${editable ? (isActive ? '#a7f3d0' : '#d1fae5') : '#e5e7eb'}`,
            }}>
              {tab.roleLabel}
              {!editable && (
                <LockIcon sx={{ fontSize: 9, ml: 0.5, verticalAlign: 'middle' }} />
              )}
            </span>
          </button>
        );
      })}
    </Box>
  );
}

// ─── Main Modal Component ──────────────────────────────────────────────────
export default function QueuePatientDetailModal({
  open,
  queueId,
  onClose,
  onSaved,
}: QueuePatientDetailModalProps) {
  const { entry, loading, error, reload } = useQueueEntry(queueId ? String(queueId) : undefined);

  const [userRole] = useState<string>(() => getStoredUserRole());
  const [activeTab, setActiveTab] = useState(() => getDefaultTabForRole(getStoredUserRole()));

  useEffect(() => {
    if (entry?.visit_type) {
      if (entry.visit_type === 'vaccination' || entry.visit_type === 'follow_up') {
        setActiveTab('form3');
      }
    }
  }, [entry?.visit_type]);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);

  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  // Queue action states
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [cancelDialog,   setCancelDialog]   = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [noRespDialog,   setNoRespDialog]   = useState(false);
  const [recallDialog,   setRecallDialog]   = useState(false);
  const [absentDialog,   setAbsentDialog]   = useState(false);

  const handleNoResponse = async () => {
    if (!queueId) return;
    try {
      await markNoResponse(Number(queueId));
      setSuccessModal({
        open: true,
        title: 'No Response Recorded',
        message: `Queue #${entry?.queue_number} moved to the Second Chance Queue.`,
      });
      reload();
      onSaved?.();
    } catch {
      toast('Failed to mark no response', 'error');
    }
  };

  const handleRecall = async () => {
    if (!queueId) return;
    try {
      await recallQueuePatient(Number(queueId));
      setSuccessModal({
        open: true,
        title: 'Patient Recalled',
        message: `Queue #${entry?.queue_number} has been recalled.`,
      });
      reload();
      onSaved?.();
    } catch {
      toast('Failed to recall patient', 'error');
    }
  };

  const handleAbsent = async () => {
    if (!queueId) return;
    try {
      await markAbsent(Number(queueId));
      setSuccessModal({
        open: true,
        title: 'Marked as No-Show',
        message: `Queue #${entry?.queue_number} has been marked as absent.`,
      });
      reload();
      onSaved?.();
    } catch {
      toast('Failed to mark absent', 'error');
    }
  };

  const handleCancel = async () => {
    if (!queueId) return;
    try {
      await cancelQueueEntry(Number(queueId));
      setSuccessModal({
        open: true,
        title: 'Queue Entry Cancelled',
        message: `Queue #${entry?.queue_number} has been cancelled.`,
      });
      reload();
      onSaved?.();
      onClose();
    } catch {
      toast('Failed to cancel queue entry', 'error');
    }
  };

  const renderTabContent = () => {
    if (!entry) return null;

    switch (activeTab) {
      case 'form1': {
        const editable = canEdit(userRole, 'registration');
        return (
          <Box sx={{ p: 2.5 }}>
            {!editable && <ReadOnlyBanner />}
            <Form1InlineView entry={entry} readOnly={!editable} />
          </Box>
        );
      }
      case 'form2': {
        const editable = canEdit(userRole, 'triage');
        return (
          <Box sx={{ p: 2.5 }}>
            <GeneralTreatmentForm
              open={true}
              entry={entry}
              onClose={onClose}
              onSave={() => {
                toast('Form 2 saved successfully · Patient referred to Treatment');
                onSaved?.();
                onClose();
              }}
              readOnly={!editable}
              inline={true}
            />
          </Box>
        );
      }
      case 'form3': {
        const editable = canEdit(userRole, 'treatment');
        const isNewCaseAwaitingTriage = entry.visit_type === 'new_case' && !entry.consultation_notes?.includes('Form 2');
        return (
          <Box sx={{ p: 2.5 }}>
            {isNewCaseAwaitingTriage ? (
              <AwaitingTriageBanner />
            ) : !editable ? (
              <ReadOnlyBanner />
            ) : null}
            <VaccinationRecordForm
              open={true}
              entry={entry}
              onClose={onClose}
              onSave={() => {
                toast('Vaccination record saved successfully · Queue ticket completed');
                onSaved?.();
                onClose();
              }}
              readOnly={!editable || isNewCaseAwaitingTriage}
              inline={true}
            />
          </Box>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f9fafb',
          },
        },
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
          <CircularProgress size={28} sx={{ color: '#10b981' }} />
          <Typography sx={{ color: '#6b7280', fontSize: 14 }}>Loading patient queue details…</Typography>
        </Box>
      ) : error || !entry ? (
        <Box sx={{ p: 4 }}>
          <Alert severity="error">{error ?? 'Queue entry not found'}</Alert>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                backgroundColor: '#e5e7eb',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Close
            </button>
          </Box>
        </Box>
      ) : (
        <>
          {/* Hero Header */}
          <ModalPatientHero
            entry={entry}
            userRole={userRole}
            onMenuOpen={(e) => setMenuAnchor(e.currentTarget)}
            onClose={onClose}
          />

          {/* Tab Navigation */}
          <TabBar active={activeTab} onSelect={setActiveTab} userRole={userRole} />

          {/* Scrollable Content */}
          <DialogContent sx={{ p: 0, overflowY: 'auto', bgcolor: '#f9fafb' }}>
            <Box sx={{ px: 2.5, pt: 2 }}>
              <StockLevelIndicator compact={true} showLegend={true} />
            </Box>
            {renderTabContent()}
          </DialogContent>

          {/* Actions Menu */}
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } } }}
          >
            {['waiting','called','in_consultation'].includes(entry.status) && (
              <MenuItem onClick={() => { setMenuAnchor(null); setNoRespDialog(true); }} sx={{ gap: 1.5, fontSize: 13 }}>
                <NoRespIcon sx={{ fontSize: 17, color: '#9333ea' }} /> No Response
              </MenuItem>
            )}
            {['second_chance','final_recall'].includes(entry.status) && (
              <MenuItem onClick={() => { setMenuAnchor(null); setRecallDialog(true); }} sx={{ gap: 1.5, fontSize: 13 }}>
                <RecallIcon sx={{ fontSize: 17, color: '#ea580c' }} /> Recall
              </MenuItem>
            )}
            {entry.status === 'final_recall' && (
              <MenuItem onClick={() => { setMenuAnchor(null); setAbsentDialog(true); }} sx={{ gap: 1.5, fontSize: 13, color: '#dc2626' }}>
                <AbsentIcon sx={{ fontSize: 17 }} /> Mark No-Show
              </MenuItem>
            )}
            {userRole !== 'triage' && (
              <MenuItem onClick={() => { setMenuAnchor(null); setCancelDialog(true); }} sx={{ gap: 1.5, fontSize: 13, color: '#dc2626' }}>
                <CancelIcon sx={{ fontSize: 17 }} /> Cancel Queue Entry
              </MenuItem>
            )}
          </Menu>

          {/* Confirmation Dialogs */}
          {noRespDialog && (
            <ConfirmationDialog variant="confirm" title="No Response"
              message={<><strong>#{entry.queue_number} · {entry.patient?.name}</strong> did not respond. Move to Second Chance Queue?</>}
              confirmLabel="Move to Second Chance" cancelLabel="Go Back"
              onConfirm={() => { setNoRespDialog(false); handleNoResponse(); }}
              onCancel={() => setNoRespDialog(false)} />
          )}
          {recallDialog && (
            <ConfirmationDialog variant="confirm"
              title={entry.status === 'final_recall' ? 'Final Recall' : 'Recall Patient'}
              message={<>Recall <strong>#{entry.queue_number} · {entry.patient?.name}</strong>{entry.status === 'final_recall' ? ' — this is their FINAL opportunity' : ' from the Second Chance Queue'}?</>}
              confirmLabel="Recall Now" cancelLabel="Go Back"
              onConfirm={() => { setRecallDialog(false); handleRecall(); }}
              onCancel={() => setRecallDialog(false)} />
          )}
          {absentDialog && (
            <ConfirmationDialog variant="danger" title="Mark as No-Show"
              message={<>Mark <strong>#{entry.queue_number} · {entry.patient?.name}</strong> as No-Show? They will be removed from active queues.</>}
              confirmLabel="Mark No-Show" cancelLabel="Go Back"
              onConfirm={() => { setAbsentDialog(false); handleAbsent(); }}
              onCancel={() => setAbsentDialog(false)} />
          )}
          {cancelDialog && (
            <ConfirmationDialog variant="danger" title="Cancel Queue Entry"
              message={<>Remove <strong>#{entry.queue_number} · {entry.patient?.name}</strong> from the queue?</>}
              confirmLabel="Yes, Cancel" cancelLabel="Go Back"
              onConfirm={() => { setCancelDialog(false); handleCancel(); }}
              onCancel={() => setCancelDialog(false)} />
          )}
          <CompleteDialog
            open={completeDialog}
            entry={entry}
            onClose={() => setCompleteDialog(false)}
            onDone={() => {
              onSaved?.();
              onClose();
            }}
            mode={userRole === 'triage' ? 'transfer' : userRole === 'treatment' ? 'treatment' : 'complete'}
          />

          {/* Success Feedback Modal */}
          {successModal && (
            <ConfirmationDialog
              variant="success"
              title={successModal.title}
              message={successModal.message}
              confirmLabel="OK"
              hideCancel
              onConfirm={() => {
                const cb = successModal.onConfirm;
                setSuccessModal(null);
                if (cb) cb();
              }}
            />
          )}

          {/* Toast */}
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
        </>
      )}
    </Dialog>
  );
}

// ─── Form 1 Demographics Inline View ─────────────────────────────────────────
const CIVIL_STATUS_LABELS: Record<string, string> = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
  separated: 'Separated',
  annulled: 'Annulled',
  cohabitation: 'Co-Habitation',
};

const EDUCATIONAL_ATTAINMENT_LABELS: Record<string, string> = {
  no_formal: 'No Formal Education',
  elementary: 'Elementary',
  high_school: 'High School',
  vocational: 'Vocational',
  college: 'College',
  post_graduate: 'Post Graduate',
  student: 'Student',
  unknown: 'Unknown',
};

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  employed: 'Employed',
  unemployed: 'None/Unemployed',
  self_employed: 'Self-Employed',
  retired: 'Retired',
  student: 'Student',
};

const FAMILY_MEMBER_LABELS: Record<string, string> = {
  father: 'Father (Ama)',
  mother: 'Mother (Ina)',
  son: 'Son (Anak na Lalaki)',
  daughter: 'Daughter (Anak na Babae)',
  others: 'Others',
};

const PHILHEALTH_STATUS_LABELS: Record<string, string> = {
  member: 'Member',
  dependent: 'Dependent',
};

const PHILHEALTH_CATEGORY_LABELS: Record<string, string> = {
  fe_private: 'FE – Private',
  fe_government: 'FE – Government',
  ie: 'IE',
  others: 'Others',
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function firstNonEmpty(...values: unknown[]): unknown {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

function asDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '—';
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function asDate(value: unknown): string {
  if (!value) return '—';
  const text = String(value).trim();
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return asDisplayValue(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function asOption(value: unknown, labels: Record<string, string>): string {
  const raw = asDisplayValue(value);
  if (raw === '—') return raw;
  const mapped = labels[raw];
  if (mapped) return mapped;
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function asYesNo(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '—';
  if (raw === 'yes') return 'Yes';
  if (raw === 'no') return 'No';
  return asDisplayValue(value);
}

function Form1Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ borderBottom: '1px solid #f3f4f6', p: 2.5, '&:last-of-type': { borderBottom: 'none' } }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.45px', mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Form1Field({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.45px', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#111827', fontWeight: 500, textTransform: capitalize ? 'capitalize' : 'none', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

type Form1Entry = QueueEntry & {
  patient_details?: unknown;
};

function Form1InlineView({ entry, readOnly: _readOnly }: { entry: Form1Entry; readOnly: boolean }) {
  const patient = toRecord(entry?.patient);
  const details = toRecord(firstNonEmpty(entry?.patient_details, patient.details));
  const memberships = getPatientMemberships(entry?.patient);

  const philhealth = getMembershipByType(memberships, 'philhealth');
  const fourps = getMembershipByType(memberships, 'fourps');
  const dswd = getMembershipByType(memberships, 'dswd_nhts');
  const senior = getMembershipByType(memberships, 'senior_citizen');
  const pwd = getMembershipByType(memberships, 'pwd');
  const indigenous = getMembershipByType(memberships, 'indigenous_member');
  const other = getMembershipByType(memberships, 'other');

  const civilStatusRaw = firstNonEmpty(details.civil_status, patient.civil_status);
  const spouseRaw = firstNonEmpty(details.spouse_name, patient.spouse_name);
  const educationRaw = firstNonEmpty(details.educational_attainment, patient.educational_attainment);
  const employmentRaw = firstNonEmpty(details.employment_status, patient.employment_status);
  const familyRaw = firstNonEmpty(details.family_member, patient.family_member);
  const familyOtherRaw = firstNonEmpty(details.family_member_other, patient.family_member_other);

  const birthPlaceRaw = firstNonEmpty(details.birth_place, patient.birth_place);
  const nationalityRaw = firstNonEmpty(details.nationality, patient.nationality);
  const religionRaw = firstNonEmpty(details.religion, patient.religion);

  const formatPhilhealth = (value: unknown) => {
    const clean = String(value ?? '').replace(/\D/g, '');
    if (clean.length !== 12) return asDisplayValue(value);
    return `${clean.slice(0, 2)}-${clean.slice(2, 11)}-${clean.slice(11)}`;
  };

  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* 1. Basic Information */}
      <Form1Section title="1. Basic Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
          <Form1Field label="Last Name" value={asDisplayValue(patient.last_name)} />
          <Form1Field label="First Name" value={asDisplayValue(patient.first_name)} />
          <Form1Field label="Middle Name" value={asDisplayValue(patient.middle_name)} />
          <Form1Field label="Suffix" value={asDisplayValue(patient.suffix)} />
          <Form1Field label="Date of Birth" value={asDate(patient.date_of_birth)} />
          <Form1Field label="Age" value={asDisplayValue(patient.age ? `${patient.age} y/o` : undefined)} />
          <Form1Field label="Sex" value={asDisplayValue(patient.gender)} capitalize />
          <Form1Field label="Contact Number" value={asDisplayValue(patient.contact_number)} />
          <Form1Field label="Civil Status" value={asOption(civilStatusRaw, CIVIL_STATUS_LABELS)} />
          <Form1Field label="Spouse Name" value={asDisplayValue(spouseRaw)} />
        </Box>
      </Form1Section>

      {/* 2. Address */}
      <Form1Section title="2. Residential Address">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
          <Form1Field label="House / Street / Zone" value={asDisplayValue(firstNonEmpty(details.address_purok, patient.address_purok))} />
          <Form1Field label="Barangay" value={asDisplayValue(firstNonEmpty(details.address_barangay, patient.address_barangay))} />
          <Form1Field label="Municipality / City" value={asDisplayValue(firstNonEmpty(details.address_municipality, patient.address_municipality))} />
          <Form1Field label="Province" value={asDisplayValue(firstNonEmpty(details.address_province, patient.address_province))} />
        </Box>
      </Form1Section>

      {/* 3. Socio-Economic Profile */}
      <Form1Section title="3. Demographic & Socio-Economic Profile">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
          <Form1Field label="Birthplace" value={asDisplayValue(birthPlaceRaw)} />
          <Form1Field label="Nationality" value={asDisplayValue(nationalityRaw)} />
          <Form1Field label="Religion" value={asDisplayValue(religionRaw)} />
          <Form1Field label="Educational Attainment" value={asOption(educationRaw, EDUCATIONAL_ATTAINMENT_LABELS)} />
          <Form1Field label="Employment Status" value={asOption(employmentRaw, EMPLOYMENT_STATUS_LABELS)} />
          <Form1Field
            label="Family Role"
            value={familyRaw === 'others' && familyOtherRaw ? String(familyOtherRaw) : asOption(familyRaw, FAMILY_MEMBER_LABELS)}
          />
        </Box>
      </Form1Section>

      {/* 4. Special Memberships */}
      <Form1Section title="4. Special Program Memberships">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
          <Form1Field label="PhilHealth Member?" value={asYesNo(philhealth ? 'yes' : firstNonEmpty((details as any).philhealth_member))} />
          {philhealth && (
            <>
              <Form1Field label="Status Type" value={asOption(firstNonEmpty(philhealth?.status_value, (details as any).philhealth_status), PHILHEALTH_STATUS_LABELS)} />
              <Form1Field label="PhilHealth No." value={formatPhilhealth(firstNonEmpty(philhealth?.membership_id_no, (details as any).philhealth_no))} />
              <Form1Field label="Category" value={asOption(firstNonEmpty(philhealth?.category, (details as any).philhealth_category), PHILHEALTH_CATEGORY_LABELS)} />
            </>
          )}
          <Form1Field label="4Ps Beneficiary" value={asYesNo(fourps ? 'yes' : firstNonEmpty((details as any).fourps_member))} />
          <Form1Field label="DSWD-NHTS" value={asYesNo(dswd ? 'yes' : firstNonEmpty((details as any).dswd_nhts))} />
          <Form1Field label="Senior Citizen" value={asYesNo(senior ? 'yes' : firstNonEmpty((details as any).senior_citizen_id))} />
          <Form1Field label="Person with Disability (PWD)" value={asYesNo(pwd ? 'yes' : firstNonEmpty((details as any).pwd_id))} />
          <Form1Field label="Indigenous Community" value={asYesNo(indigenous ? 'yes' : 'no')} />
          {other && <Form1Field label="Other Program" value={asDisplayValue(other?.membership_label)} />}
        </Box>
      </Form1Section>
    </Box>
  );
}
