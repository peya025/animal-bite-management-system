import { useState, useEffect, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Icon } from '../../../shared/components/ui/Icon';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  PhoneIphone as PhoneIcon,
  Close as CloseIcon,
  Refresh as ResendIcon,
  CheckCircle as VerifiedIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import api from '../../../shared/services/api';
import type { Patient } from '../types';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import ButtonSpinner from '../../../components/common/ButtonSpinner';

// ─── Local Error Boundary Component ───────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('InvitePatientModal error boundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            An unexpected error occurred in the Portal Invitation dialog.
          </Alert>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {this.state.error?.message || 'Unknown error'}
          </Typography>
          <Button variant="outlined" onClick={this.props.onClose}>
            Close Dialog
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

interface InvitePatientModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InvitePatientModal({
  open,
  patient,
  onClose,
  onSuccess,
}: InvitePatientModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <ModalErrorBoundary onClose={onClose}>
        <InvitePatientModalContent
          patient={patient}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </ModalErrorBoundary>
    </Dialog>
  );
}

function InvitePatientModalContent({
  patient,
  onClose,
  onSuccess,
}: {
  patient: Patient | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (patient) {
      setError('');
      setSuccessMsg('');
      setInvitation(null);
      checkExistingInvitation();
    }
  }, [patient]);

  const checkExistingInvitation = async () => {
    if (!patient?.patient_id) return;
    try {
      const response = await api.get(`/patients/${patient.patient_id}`);
      if (response.data?.invitations && Array.isArray(response.data.invitations) && response.data.invitations.length > 0) {
        setInvitation(response.data.invitations[0]);
      }
    } catch (e) {
      console.log('No existing invitation found', e);
    }
  };

  const handleSendInvite = async () => {
    if (!patient?.patient_id) return;
    setSending(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await api.post('/patient-invitations', {
        patient_id: patient.patient_id,
      });

      const invData = response.data?.invitation;
      setInvitation(invData);
      setShowSuccessModal(true);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send portal invitation.');
    } finally {
      setSending(false);
    }
  };

  const handleResendInvite = async () => {
    if (!invitation?.id) return;
    setSending(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await api.post(`/patient-invitations/${invitation.id}/resend`);
      setInvitation(response.data?.invitation);
      setShowSuccessModal(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to resend activation code.');
    } finally {
      setSending(false);
    }
  };


  const handleCopyCode = () => {
    if (invitation?.token) {
      navigator.clipboard.writeText(invitation.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!patient) return null;

  const patientFullName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(' ') || 'Unknown Patient';

  const contactPhone = patient.contact_number || (patient as any).phone || '';
  const hasPhone = Boolean(contactPhone && contactPhone.trim().length >= 10);

  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const statusLabel = (invitation?.status || 'PENDING').toString().toUpperCase();

  return (
    <>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          borderBottom: '1px solid var(--border-glow, #e5e7eb)',
          bgcolor: 'var(--card-bg-solid, #ffffff)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon sx={{ color: '#10b981' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h, #173d29)', fontSize: 16 }}>
            Patient Portal Invitation
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text-m, #9ca3af)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 2, bgcolor: 'var(--bg-secondary, #f9fafb)' }}>
        <Stack spacing={2.5}>
          {/* Patient Card Summary */}
          <Paper
            elevation={0}
            sx={{ p: 2, bgcolor: 'var(--card-bg-solid, #ffffff)', borderRadius: 2, border: '1px solid var(--border-glow, #e5e7eb)' }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-m, #6b7280)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1,
              }}
            >
              Patient Profile
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '7fr 5fr' }, gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)' }}>Full Name</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
                  {patientFullName}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)' }}>Patient Number</Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#10b981',
                    fontFamily: 'monospace',
                  }}
                >
                  #{patient.patient_number || patient.patient_id}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)' }}>Mobile Contact Phone</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: hasPhone ? 'var(--text-h, #111827)' : '#ef4444', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {hasPhone ? (
                    <>
                      <Icon name="phone" size={14} color="#10b981" /> {contactPhone}
                    </>
                  ) : (
                    <>
                      <Icon name="warning" size={14} color="#ef4444" /> No contact number on record
                    </>
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)' }}>Email Address</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: patient.email ? 'var(--text-h, #111827)' : 'var(--text-m, #9ca3af)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {patient.email ? (
                    <>
                      <Icon name="email" size={14} color="#3b82f6" /> {patient.email}
                    </>
                  ) : (
                    '— (No email)'
                  )}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Invitation Notice */}
          {!hasPhone && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Patient has no valid mobile phone number recorded. Please update the patient profile before sending a portal invitation.
            </Alert>
          )}

          {/* Error / Success Feedback */}
          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ borderRadius: 2 }}>{successMsg}</Alert>}

          {/* Invitation Status Card */}
          {invitation && (
            <Paper
              elevation={0}
              sx={{ p: 2, bgcolor: 'var(--card-bg-solid, #ffffff)', borderRadius: 2, border: '1px solid var(--border-glow, #d1fae5)' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                  Active Invitation Status
                </Typography>
                <Chip
                  size="small"
                  label={statusLabel}
                  icon={invitation.status === 'accepted' ? <VerifiedIcon /> : <PendingIcon />}
                  sx={{
                    bgcolor: invitation.status === 'accepted' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: invitation.status === 'accepted' ? '#10b981' : '#f59e0b',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                />
              </Box>

              {/* Code Token Display */}
              {invitation.token && (
                <>
                  <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)', mb: 0.5 }}>
                    Activation Token Code (Expires in 7 days):
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: 'var(--input-bg, #f3f4f6)',
                      p: 1.25,
                      borderRadius: 1.5,
                      border: '1px solid var(--input-border, #e5e7eb)',
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--input-text, #374151)',
                        wordBreak: 'break-all',
                        flex: 1,
                      }}
                    >
                      {invitation.token}
                    </Typography>
                    <Tooltip title={copied ? 'Copied!' : 'Copy activation code'}>
                      <IconButton size="small" onClick={handleCopyToken} sx={{ color: 'var(--text-m, #6b7280)' }}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </>
              )}
            </Paper>
          )}

          {/* Quick Help Guide */}
          <Box sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.08)', borderRadius: 2, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h, #1e40af)', mb: 0.5 }}>
              How Patient Portal Works:
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'var(--text-b, #1d4ed8)', lineHeight: 1.6 }}>
              1. The patient receives an SMS link with a 6-digit PIN token.<br />
              2. They open the web app to view their upcoming rabies vaccine doses, schedule, and treatment record card.<br />
              3. No complex username or password needed — quick and secure OTP verification.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--border-glow, #e5e7eb)', bgcolor: 'var(--card-bg-solid, #fafafa)' }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-m, #6b7280)', textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>

        {invitation && invitation.status === 'pending' ? (
          <Button
            variant="outlined"
            onClick={handleResendInvite}
            disabled={sending || !hasPhone}
            startIcon={sending ? <ButtonSpinner size={16} /> : <ResendIcon fontSize="small" />}
            sx={{
              borderColor: '#059669',
              color: '#059669',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: '#f0fdf4', borderColor: '#047857' },
            }}
          >
            {sending ? 'Resending Code…' : 'Resend Invite Code'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSendInvite}
            disabled={sending || !hasPhone || invitation?.status === 'accepted'}
            startIcon={sending ? <ButtonSpinner size={16} /> : <SendIcon fontSize="small" />}
            sx={{
              bgcolor: '#059669',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            {sending ? 'Sending Invite…' : patient.email ? 'Send Portal Invite (SMS & Email)' : 'Send Portal Invite SMS'}
          </Button>
        )}
      </DialogActions>

      {/* Success Modal */}
      {showSuccessModal && (
        <ConfirmationDialog
          variant="success"
          title="Invitation Sent"
          message={<>Mobile Portal invitation token has been dispatched to <strong>{patientFullName}</strong> ({contactPhone}).</>}
          confirmLabel="OK"
          hideCancel
          onConfirm={() => setShowSuccessModal(false)}
        />
      )}
    </>
  );
}

