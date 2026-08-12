import { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { useQueueEntry } from '../hooks';
import { ROUTES } from '../../../shared/config/routes';
import { STATUS_CFG, PRIORITY_CFG, VISIT_LABEL, waitTime } from '../types';
import { callQueuePatient, cancelQueueEntry } from '../services';
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { CompleteDialog } from '../components/CompleteDialog';

// ─── Role helpers ──────────────────────────────────────────────────────────
function canEdit(userRole: string, formOwner: 'registration' | 'triage' | 'treatment'): boolean {
  if (userRole === 'admin' || userRole === 'developer') return true;
  return userRole === formOwner;
}

// ─── Read-only Notice Banner ────────────────────────────────────────────────
function ReadOnlyBanner({ ownerLabel }: { ownerLabel: string }) {
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
        Only <strong>{ownerLabel}</strong> staff can edit this section.
      </Typography>
    </Box>
  );
}

// ─── Patient Hero Card ──────────────────────────────────────────────────────
function PatientHero({ entry, userRole, onMenuOpen }: {
  entry: any;
  userRole: string;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const statusCfg  = STATUS_CFG[entry.status]  ?? STATUS_CFG.cancelled;
  const priorityCfg = PRIORITY_CFG[entry.priority] ?? PRIORITY_CFG.normal;
  const isActive   = entry.status === 'waiting' || entry.status === 'in_consultation';

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
              {priorityCfg.label}
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

  const { entry, loading, error } = useQueueEntry(queueId);

  const [activeTab, setActiveTab] = useState('form1');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  // Queue action states
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [callDialog, setCallDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);

  // No longer need modal states - forms are rendered inline

  const [userRole, setUserRole] = useState('');
  useEffect(() => {
    const raw = localStorage.getItem('userData');
    if (raw) setUserRole(JSON.parse(raw).role ?? '');
  }, []);

  // Smart default tab: pick the tab that matches the user's role
  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'registration') setActiveTab('form1');
    else if (userRole === 'triage') setActiveTab('form2');
    else if (userRole === 'treatment') setActiveTab('form3');
    else setActiveTab('form1');
  }, [userRole]);

  const handleCall = async () => {
    try {
      await callQueuePatient(Number(queueId));
      toast(`Called Queue #${entry?.queue_number}`);
      window.location.reload();
    } catch { toast('Failed to call patient', 'error'); }
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

  const isActive = entry.status === 'waiting' || entry.status === 'in_consultation';

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'form1': {
        const editable = canEdit(userRole, 'registration');
        return (
          <Box sx={{ p: 3 }}>
            {!editable && <ReadOnlyBanner ownerLabel="Registration" />}
            {/* Form 1 patient data - displayed inline, not as modal */}
            <PatientInfoCard entry={entry} readOnly={!editable} />
          </Box>
        );
      }
      case 'form2': {
        const editable = canEdit(userRole, 'triage');
        return (
          <Box sx={{ p: 3 }}>
            {!editable && <ReadOnlyBanner ownerLabel="Doctor" />}
            {/* Form 2 rendered inline with read-only mode */}
            <GeneralTreatmentForm
              open={true}
              entry={entry}
              onClose={() => {}}
              onSave={() => { toast('Form 2 saved'); window.location.reload(); }}
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
            {!editable && <ReadOnlyBanner ownerLabel="Nurse" />}
            {/* Form 3 rendered inline with read-only mode */}
            <VaccinationRecordForm
              open={true}
              entry={entry}
              onClose={() => {}}
              onSave={() => { toast('Form 3 saved'); window.location.reload(); }}
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
        {renderTabContent()}
      </Box>

      {/* ── Actions Menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } } }}
      >
        {entry.status === 'waiting' && (
          <MenuItem onClick={() => { setMenuAnchor(null); setCallDialog(true); }}
            sx={{ gap: 1.5, fontSize: 14, color: '#374151' }}>
            <CallIcon sx={{ fontSize: 18, color: '#3b82f6' }} /> Call Patient
          </MenuItem>
        )}
        {entry.status === 'in_consultation' && (
          <MenuItem onClick={() => { setMenuAnchor(null); setCompleteDialog(true); }}
            sx={{ gap: 1.5, fontSize: 14, color: '#374151' }}>
            <CompleteIcon sx={{ fontSize: 18, color: '#10b981' }} /> Complete Consultation
          </MenuItem>
        )}
        {isActive && (
          <MenuItem onClick={() => { setMenuAnchor(null); setCancelDialog(true); }}
            sx={{ gap: 1.5, fontSize: 14, color: '#dc2626' }}>
            <CancelIcon sx={{ fontSize: 18 }} /> Cancel Queue Entry
          </MenuItem>
        )}
      </Menu>

      {/* ── Dialogs ── */}
      {callDialog && (
        <ConfirmationDialog
          variant="confirm"
          title="Call Patient"
          message={<>Call <strong>#{entry.queue_number} · {entry.patient.name}</strong> for consultation?</>}
          confirmLabel="Yes, Call Now"
          cancelLabel="Cancel"
          onConfirm={() => { setCallDialog(false); handleCall(); }}
          onCancel={() => setCallDialog(false)}
        />
      )}
      {cancelDialog && (
        <ConfirmationDialog
          variant="danger"
          title="Cancel Queue Entry"
          message={<>Remove <strong>#{entry.queue_number} · {entry.patient.name}</strong> from the queue?</>}
          confirmLabel="Yes, Cancel"
          cancelLabel="Go Back"
          onConfirm={() => { setCancelDialog(false); handleCancel(); }}
          onCancel={() => setCancelDialog(false)}
        />
      )}
      <CompleteDialog
        open={completeDialog}
        entry={entry}
        onClose={() => setCompleteDialog(false)}
        onDone={() => {
          toast('Consultation completed');
          navigate(ROUTES.QUEUE.DASHBOARD);
        }}
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

// ─── Summary Cards (shown in tab without opening modal) ───────────────────
function PatientInfoCard({ entry, readOnly }: { entry: any; readOnly: boolean }) {
  const p = entry.patient;
  const rows = [
    { label: 'Full Name', value: p?.name },
    { label: 'Age', value: p?.age ? `${p.age} years old` : '—' },
    { label: 'Gender', value: p?.gender },
    { label: 'Contact Number', value: p?.contact_number || '—' },
    { label: 'Queue Date', value: entry.queue_date },
    { label: 'Check-in Notes', value: entry.check_in_notes || '—' },
  ];
  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 2, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Patient Information — Form 1
        </Typography>
        {readOnly && (
          <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
            Managed by Registration staff
          </Typography>
        )}
      </Box>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
          {rows.map(row => (
            <Box key={row.label}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                {row.label}
              </Typography>
              <Typography sx={{ fontSize: 14, color: '#111827', fontWeight: 500, textTransform: row.label === 'Gender' ? 'capitalize' : 'none' }}>
                {row.value || '—'}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
