import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  MoreHoriz as MoreIcon,
  Phone as CallIcon,
  Done as CompleteIcon,
  Cancel as CancelIcon,
  LockOutlined as LockIcon,
  CheckCircle as ServeIcon,
  PersonOff as NoRespIcon,
  Replay as RecallIcon,
  PersonOff as AbsentIcon,
} from '@mui/icons-material';
import { useQueueEntry } from '../hooks';
import { ROUTES } from '../../../shared/config/routes';
import { STATUS_CFG, PRIORITY_CFG, VISIT_LABEL, getPriorityDisplayLabel, waitTime, type QueueEntry } from '../types';
import { callQueuePatient, cancelQueueEntry, serveQueuePatient, markNoResponse, recallQueuePatient, markAbsent } from '../services';
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { CompleteDialog } from '../components/CompleteDialog';
import { getMembershipByType, getPatientMemberships } from '../../patients/utils/memberships';
import StockLevelIndicator from '../../inventory/components/StockLevelIndicator/StockLevelIndicator';

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

function getDefaultTabForRole(userRole: string): string {
  if (userRole === 'registration') return 'form1';
  if (userRole === 'triage') return 'form2';
  if (userRole === 'treatment') return 'form3';
  return 'form1';
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

// ─── Patient Hero Card ──────────────────────────────────────────────────────
function PatientHero({ entry, userRole, onMenuOpen }: {
  entry: QueueEntry;
  userRole: string;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>) => void;
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
      px: 3, py: 3,
      borderBottom: '1px solid #f3f4f6',
      bgcolor: '#fff',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        {/* Avatar */}
        <Box sx={{
          width: 52, height: 52,
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
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>
              {entry.patient?.name}
            </Typography>
            <Box sx={{ px: 1.5, py: 0.25, bgcolor: '#eff6ff', borderRadius: 1.5, fontSize: 12, fontWeight: 600, color: '#2563eb' }}>
              {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
            </Box>
            <Box sx={{ px: 1.5, py: 0.25, bgcolor: priorityCfg.bg, borderRadius: 1.5, fontSize: 12, fontWeight: 600, color: priorityCfg.color }}>
              {getPriorityDisplayLabel(entry.priority, entry.queue_category)}
            </Box>
          </Box>

          {/* Meta row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6b7280', fontSize: 13 }}>
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

      {/* Right side: wait time + actions menu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isActive && (
          <Box sx={{ textAlign: 'right', mr: 1 }}>
            <Typography sx={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Wait time
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#374151' }}>
              {waitTime(entry.checked_in_at)}
            </Typography>
          </Box>
        )}
        {(isActive || ['admin', 'developer'].includes(userRole)) && (
          <Tooltip title="Actions">
            <IconButton onClick={onMenuOpen} sx={{ color: '#6b7280' }}>
              <MoreIcon />
            </IconButton>
          </Tooltip>
        )}
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
    <Box sx={{ display: 'flex', borderBottom: '2px solid #f3f4f6', px: 3, bgcolor: '#fff' }}>
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
              padding: '14px 20px',
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
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#10b981' : '#6b7280',
            }}>
              {tab.label}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
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

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function QueuePatientDetailPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();

  const { entry, loading, error, reload } = useQueueEntry(queueId);

  const [userRole] = useState<string>(() => getStoredUserRole());
  const [activeTab, setActiveTab] = useState(() => getDefaultTabForRole(getStoredUserRole()));
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  // Queue action states
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [callDialog,     setCallDialog]     = useState(false);
  const [cancelDialog,   setCancelDialog]   = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [serveDialog,    setServeDialog]    = useState(false);
  const [noRespDialog,   setNoRespDialog]   = useState(false);
  const [recallDialog,   setRecallDialog]   = useState(false);
  const [absentDialog,   setAbsentDialog]   = useState(false);

  // No longer need modal states - forms are rendered inline

  const handleCall = async () => {
    try { await callQueuePatient(Number(queueId)); toast(`Called Queue #${entry?.queue_number}`); reload(); }
    catch { toast('Failed to call patient', 'error'); }
  };

  const handleServe = async () => {
    try { await serveQueuePatient(Number(queueId)); toast('Patient is now being served'); reload(); }
    catch { toast('Failed to start serving', 'error'); }
  };

  const handleNoResponse = async () => {
    try { await markNoResponse(Number(queueId)); toast('Patient moved to Second Chance Queue'); reload(); }
    catch { toast('Failed to mark no response', 'error'); }
  };

  const handleRecall = async () => {
    try { await recallQueuePatient(Number(queueId)); toast('Patient recalled'); reload(); }
    catch { toast('Failed to recall patient', 'error'); }
  };

  const handleAbsent = async () => {
    try { await markAbsent(Number(queueId)); toast('Patient marked as No-Show'); reload(); }
    catch { toast('Failed to mark absent', 'error'); }
  };

  const handleCancel = async () => {
    try {
      await cancelQueueEntry(Number(queueId));
      toast('Queue entry cancelled');
      navigate(ROUTES.QUEUE.DASHBOARD);
    } catch { toast('Failed to cancel queue entry', 'error'); }
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: '#10b981' }} />
        <Typography sx={{ color: '#9ca3af', fontSize: 14 }}>Loading patient details…</Typography>
      </Box>
    );
  }

  if (error || !entry) {
    return (
      <Box sx={{ px: 3, py: 4 }}>
        <Alert severity="error">{error ?? 'Queue entry not found'}</Alert>
        <button
          onClick={() => navigate(ROUTES.QUEUE.DASHBOARD)}
          style={{ marginTop: 16, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 14 }}
        >
          ← Back to Queue
        </button>
      </Box>
    );
  }

  const isActive = ['waiting','called','in_consultation','serving','second_chance','final_recall'].includes(entry.status);

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'form1': {
        const editable = canEdit(userRole, 'registration');
        return (
          <Box sx={{ p: 3 }}>
            {!editable && <ReadOnlyBanner />}
            {/* Form 1 rendered inline with full field sections */}
            <Form1InlineView entry={entry} readOnly={!editable} />
          </Box>
        );
      }
      case 'form2': {
        const editable = canEdit(userRole, 'triage');
        return (
          <Box sx={{ p: 3 }}>
            {/* Form 2 rendered inline with smart edit/read-only flow */}
            <GeneralTreatmentForm
              open={true}
              entry={entry}
              onClose={() => {}}
              onSave={() => {
                if (userRole === 'triage') {
                  navigate(ROUTES.QUEUE.DASHBOARD, {
                    state: { queueToast: { message: 'Form 2 saved successfully', severity: 'success' } },
                  });
                  return;
                }
                toast('Form 2 saved');
                reload();
              }}
              readOnly={!editable}
              inline={true}
            />
          </Box>
        );
      }
      case 'form3': {
        const editable = canEdit(userRole, 'treatment');
        return (
          <Box sx={{ p: 3 }}>
            {!editable && <ReadOnlyBanner />}
            {/* Form 3 rendered inline with read-only mode */}
            <VaccinationRecordForm
              open={true}
              entry={entry}
              onClose={() => {}}
              onSave={() => {
                if (userRole === 'treatment') {
                  navigate(ROUTES.QUEUE.DASHBOARD, {
                    state: { queueToast: { message: 'Form 3 saved successfully', severity: 'success' } },
                  });
                  return;
                }
                toast('Form 3 saved');
                reload();
              }}
              readOnly={!editable}
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
    <Box sx={{ bgcolor: '#f9fafb', minHeight: '100vh' }}>
      {/* ── Hero Card ── */}
      <PatientHero
        entry={entry}
        userRole={userRole}
        onMenuOpen={(e) => setMenuAnchor(e.currentTarget)}
      />

      {/* ── Tab Bar ── */}
      <TabBar active={activeTab} onSelect={setActiveTab} userRole={userRole} />

      {/* ── Tab Content ── */}
      <Box sx={{ maxWidth: 960, mx: 'auto', py: 3, px: 2 }}>
        {/* Priority 14: Live Clinic Stock-Level Color Coding */}
        <StockLevelIndicator compact={true} showLegend={true} />
        {renderTabContent()}
      </Box>

      {/* ── Actions Menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } } }}
      >
        {/* Call — waiting only */}
        {entry.status === 'waiting' && (
          <MenuItem onClick={() => { setMenuAnchor(null); setCallDialog(true); }} sx={{ gap: 1.5, fontSize: 14 }}>
            <CallIcon sx={{ fontSize: 18, color: '#2563eb' }} /> Call Patient
          </MenuItem>
        )}
        {/* Serve — called/second_chance/final_recall */}
        {['called','second_chance','final_recall'].includes(entry.status) && (
          <MenuItem onClick={() => { setMenuAnchor(null); setServeDialog(true); }} sx={{ gap: 1.5, fontSize: 14 }}>
            <ServeIcon sx={{ fontSize: 18, color: '#059669' }} /> Start Serving
          </MenuItem>
        )}
        {/* No Response — waiting or called */}
        {['waiting','called','in_consultation'].includes(entry.status) && (
          <MenuItem onClick={() => { setMenuAnchor(null); setNoRespDialog(true); }} sx={{ gap: 1.5, fontSize: 14 }}>
            <NoRespIcon sx={{ fontSize: 18, color: '#9333ea' }} /> No Response
          </MenuItem>
        )}
        {/* Recall — second_chance or final_recall */}
        {['second_chance','final_recall'].includes(entry.status) && (
          <MenuItem onClick={() => { setMenuAnchor(null); setRecallDialog(true); }} sx={{ gap: 1.5, fontSize: 14 }}>
            <RecallIcon sx={{ fontSize: 18, color: '#ea580c' }} /> Recall
          </MenuItem>
        )}
        {/* Absent — final_recall only */}
        {entry.status === 'final_recall' && (
          <MenuItem onClick={() => { setMenuAnchor(null); setAbsentDialog(true); }} sx={{ gap: 1.5, fontSize: 14, color: '#dc2626' }}>
            <AbsentIcon sx={{ fontSize: 18 }} /> Mark No-Show
          </MenuItem>
        )}
        {/* Complete — serving or in_consultation */}
        {['serving','in_consultation','called'].includes(entry.status) && (
          <MenuItem onClick={() => { setMenuAnchor(null); setCompleteDialog(true); }} sx={{ gap: 1.5, fontSize: 14 }}>
            <CompleteIcon sx={{ fontSize: 18, color: '#10b981' }} /> {userRole === 'triage' ? 'Transfer to Treatment' : userRole === 'treatment' ? 'Complete Treatment' : 'Complete'}
          </MenuItem>
        )}
        {/* Cancel — any active */}
        {isActive && userRole !== 'triage' && (
          <MenuItem onClick={() => { setMenuAnchor(null); setCancelDialog(true); }} sx={{ gap: 1.5, fontSize: 14, color: '#dc2626' }}>
            <CancelIcon sx={{ fontSize: 18 }} /> Cancel Queue Entry
          </MenuItem>
        )}
      </Menu>

      {/* ── Confirmation Dialogs ── */}
      {callDialog && (
        <ConfirmationDialog variant="confirm" title="Call Patient"
          message={<>Call <strong>#{entry.queue_number} · {entry.patient.name}</strong> to the station?</>}
          confirmLabel="Call Now" cancelLabel="Cancel"
          onConfirm={() => { setCallDialog(false); handleCall(); }}
          onCancel={() => setCallDialog(false)} />
      )}
      {serveDialog && (
        <ConfirmationDialog variant="confirm" title="Start Serving"
          message={<><strong>#{entry.queue_number} · {entry.patient.name}</strong> has responded. Start serving?</>}
          confirmLabel="Yes, Start Serving" cancelLabel="Cancel"
          onConfirm={() => { setServeDialog(false); handleServe(); }}
          onCancel={() => setServeDialog(false)} />
      )}
      {noRespDialog && (
        <ConfirmationDialog variant="confirm" title="No Response"
          message={<><strong>#{entry.queue_number} · {entry.patient.name}</strong> did not respond. Move to Second Chance Queue?</>}
          confirmLabel="Move to Second Chance" cancelLabel="Go Back"
          onConfirm={() => { setNoRespDialog(false); handleNoResponse(); }}
          onCancel={() => setNoRespDialog(false)} />
      )}
      {recallDialog && (
        <ConfirmationDialog variant="confirm"
          title={entry.status === 'final_recall' ? 'Final Recall' : 'Recall Patient'}
          message={<>Recall <strong>#{entry.queue_number} · {entry.patient.name}</strong>{entry.status === 'final_recall' ? ' — this is their FINAL opportunity' : ' from the Second Chance Queue'}?</>}
          confirmLabel="Recall Now" cancelLabel="Go Back"
          onConfirm={() => { setRecallDialog(false); handleRecall(); }}
          onCancel={() => setRecallDialog(false)} />
      )}
      {absentDialog && (
        <ConfirmationDialog variant="danger" title="Mark as No-Show"
          message={<>Mark <strong>#{entry.queue_number} · {entry.patient.name}</strong> as No-Show? They will be removed from active queues.</>}
          confirmLabel="Mark No-Show" cancelLabel="Go Back"
          onConfirm={() => { setAbsentDialog(false); handleAbsent(); }}
          onCancel={() => setAbsentDialog(false)} />
      )}
      {cancelDialog && (
        <ConfirmationDialog variant="danger" title="Cancel Queue Entry"
          message={<>Remove <strong>#{entry.queue_number} · {entry.patient.name}</strong> from the queue?</>}
          confirmLabel="Yes, Cancel" cancelLabel="Go Back"
          onConfirm={() => { setCancelDialog(false); handleCancel(); }}
          onCancel={() => setCancelDialog(false)} />
      )}
      <CompleteDialog
        open={completeDialog}
        entry={entry}
        onClose={() => setCompleteDialog(false)}
        onDone={() => {
          toast(userRole === 'triage' ? 'Patient transferred to treatment queue' : userRole === 'treatment' ? 'Treatment completed' : 'Consultation completed');
          navigate(ROUTES.QUEUE.DASHBOARD);
        }}
        mode={userRole === 'triage' ? 'transfer' : userRole === 'treatment' ? 'treatment' : 'complete'}
      />

      {/* ── Toast ── */}
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

// ─── Form 1 Inline View (full patient registration fields) ─────────────────
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
    <Box sx={{ borderBottom: '1px solid #f3f4f6', p: 3, '&:last-of-type': { borderBottom: 'none' } }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.45px', mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Form1Field({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.45px', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, color: '#111827', fontWeight: 500, textTransform: capitalize ? 'capitalize' : 'none', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

type Form1Entry = QueueEntry & {
  patient_details?: unknown;
};

function Form1InlineView({ entry, readOnly }: { entry: Form1Entry; readOnly: boolean }) {
  const patient = toRecord(entry?.patient);
  const details = toRecord(firstNonEmpty(patient.details, entry.patient_details));
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

  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 2, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Patient Registration — Form 1
        </Typography>
        {readOnly && (
          <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
            Read-only view of Form 1 data
          </Typography>
        )}
      </Box>

      <Form1Section title="I. Patient Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 2.5 }}>
          <Form1Field label="Last Name" value={asDisplayValue(firstNonEmpty(patient.last_name))} />
          <Form1Field label="First Name" value={asDisplayValue(firstNonEmpty(patient.first_name))} />
          <Form1Field label="Middle Name" value={asDisplayValue(firstNonEmpty(patient.middle_name))} />
          <Form1Field label="Suffix" value={asDisplayValue(firstNonEmpty(patient.suffix))} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2.5, mb: 2.5 }}>
          <Form1Field
            label="Sex (Kasarian)"
            value={asOption(firstNonEmpty(patient.sex, patient.gender), { male: 'Male', female: 'Female', other: 'Other' })}
          />
          <Form1Field label="Date of Birth" value={asDate(firstNonEmpty(patient.date_of_birth))} />
          <Form1Field label="Blood Type" value={asDisplayValue(firstNonEmpty(details.blood_type, patient.blood_type))} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
          <Form1Field
            label="Mother's Maiden Name"
            value={asDisplayValue(firstNonEmpty(details.mother_maiden_name, patient.mother_maiden_name))}
          />
          <Form1Field label="Civil Status" value={asOption(civilStatusRaw, CIVIL_STATUS_LABELS)} />
          {(String(civilStatusRaw ?? '').toLowerCase() === 'married' || asDisplayValue(spouseRaw) !== '—') && (
            <Form1Field label="Spouse's Name" value={asDisplayValue(spouseRaw)} />
          )}
        </Box>
      </Form1Section>

      <Form1Section title="Residential Address — Misamis Oriental (Tirahan)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          <Form1Field label="Province" value={asDisplayValue(firstNonEmpty(details.province))} />
          <Form1Field label="City / Municipality" value={asDisplayValue(firstNonEmpty(details.address_municipality))} />
          <Form1Field label="Barangay" value={asDisplayValue(firstNonEmpty(details.address_barangay))} />
          <Form1Field label="Purok / Zone / Street" value={asDisplayValue(firstNonEmpty(details.address_purok))} />
          <Form1Field label="Full Address" value={asDisplayValue(firstNonEmpty(patient.address))} />
        </Box>
      </Form1Section>

      <Form1Section title="Contact Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
          <Form1Field label="Contact Number (Mobile)" value={asDisplayValue(firstNonEmpty(patient.contact_number))} />
          <Form1Field label="Email Address (Optional)" value={asDisplayValue(firstNonEmpty(patient.email))} />
          <Form1Field
            label="Emergency Contact Name"
            value={asDisplayValue(firstNonEmpty(patient.emergency_contact_name, details.emergency_contact_name))}
          />
          <Form1Field
            label="Emergency Contact Phone"
            value={asDisplayValue(firstNonEmpty(patient.emergency_contact_number, patient.emergency_contact_phone, details.emergency_contact_phone))}
          />
        </Box>
      </Form1Section>

      <Form1Section title="Socioeconomic Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          <Form1Field
            label="Educational Attainment"
            value={asOption(firstNonEmpty(details.educational_attainment, patient.educational_attainment), EDUCATIONAL_ATTAINMENT_LABELS)}
          />
          <Form1Field
            label="Employment Status"
            value={asOption(firstNonEmpty(details.employment_status, patient.employment_status), EMPLOYMENT_STATUS_LABELS)}
          />
          <Form1Field
            label="Family Member Position"
            value={asOption(firstNonEmpty(details.family_member, patient.family_member), FAMILY_MEMBER_LABELS)}
          />
        </Box>
      </Form1Section>

      <Form1Section title="II. Government Program Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
          <Form1Field label="Any Membership?" value={asYesNo(memberships.length > 0 ? 'yes' : firstNonEmpty(details.has_membership, patient.has_membership))} />
          <Form1Field label="PhilHealth Member?" value={asYesNo(philhealth ? 'yes' : firstNonEmpty(details.philhealth_member, patient.philhealth_member))} />
          <Form1Field label="Status Type" value={asOption(firstNonEmpty(philhealth?.status_value, details.philhealth_status, patient.philhealth_status), PHILHEALTH_STATUS_LABELS)} />
          <Form1Field label="PhilHealth No." value={asDisplayValue(firstNonEmpty(philhealth?.membership_id_no, details.philhealth_no, patient.philhealth_no))} />
          <Form1Field label="Category" value={asOption(firstNonEmpty(philhealth?.category, details.philhealth_category, patient.philhealth_category), PHILHEALTH_CATEGORY_LABELS)} />
          <Form1Field label="4Ps Member?" value={asYesNo(fourps ? 'yes' : firstNonEmpty(details.fourps_member, patient.fourps_member))} />
          <Form1Field label="4Ps Category" value={asDisplayValue(firstNonEmpty(fourps?.category, details.fourps_category))} />
          <Form1Field label="4Ps Relationship" value={asDisplayValue(firstNonEmpty(fourps?.relationship_value, details.fourps_relationship))} />
          <Form1Field label="Registered 4Ps Beneficiary" value={asDisplayValue(firstNonEmpty(fourps?.registered_beneficiary, details.registered_fourps_beneficiary))} />
          <Form1Field label="DSWD NHTS?" value={asYesNo(dswd ? 'yes' : firstNonEmpty(details.dswd_nhts, patient.dswd_nhts))} />
          <Form1Field label="Senior Citizen ID" value={asDisplayValue(firstNonEmpty(senior?.membership_id_no))} />
          <Form1Field label="PWD ID" value={asDisplayValue(firstNonEmpty(pwd?.membership_id_no))} />
          <Form1Field label="Indigenous Tribe" value={asDisplayValue(firstNonEmpty(indigenous?.extra_value))} />
          <Form1Field label="Other Membership" value={asDisplayValue(firstNonEmpty(other?.membership_label))} />
          <Form1Field label="Other Membership ID" value={asDisplayValue(firstNonEmpty(other?.membership_id_no))} />
        </Box>
      </Form1Section>
    </Box>
  );
}
