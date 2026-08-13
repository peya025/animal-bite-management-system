import React, { useState, useEffect, Component } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [invitation, setInvitation] = useState<any>(null);

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
    setLoading(true);
    try {
      const response = await api.get(`/patients/${patient.patient_id}`);
      if (response.data?.invitations && Array.isArray(response.data.invitations) && response.data.invitations.length > 0) {
        setInvitation(response.data.invitations[0]);
      }
    } catch (e) {
      console.log('No existing invitation found', e);
    } finally {
      setLoading(false);
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
      setSuccessMsg('SMS invitation code sent successfully!');
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
      setSuccessMsg('Invitation activation code resent successfully!');
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
          justify: 'space-between',
          pb: 1.5,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon sx={{ color: '#059669' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#173d29', fontSize: 16 }}>
            Patient Portal Invitation
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        <Stack spacing={2.5}>
          {/* Patient Card Summary */}
          <Paper
            elevation={0}
            sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1,
              }}
            >
              Patient Profile
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '7fr 5fr' }, gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Full Name</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  {patientFullName}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Patient Number</Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#059669',
                    fontFamily: 'monospace',
                  }}
                >
                  #{patient.patient_number || patient.patient_id}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Mobile Contact Phone</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: hasPhone ? '#111827' : '#dc2626', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {hasPhone ? (
                    <>
                      <Icon name="phone" size={14} color="#059669" /> {contactPhone}
                    </>
                  ) : (
                    <>
                      <Icon name="warning" size={14} color="#dc2626" /> No contact number on record
                    </>
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Email Address</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: patient.email ? '#111827' : '#9ca3af', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {patient.email ? (
                    <>
                      <Icon name="email" size={14} color="#2563eb" /> {patient.email}
                    </>
                  ) : (
                    '— (No email)'
                  )}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Warning if missing phone number */}
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
              sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #d1fae5' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                  Active Invitation Status
                </Typography>
                <Chip
                  size="small"
                  label={statusLabel}
                  icon={invitation.status === 'accepted' ? <VerifiedIcon /> : <PendingIcon />}
                  sx={{
                    bgcolor: invitation.status === 'accepted' ? '#d1fae5' : '#fef3c7',
                    color: invitation.status === 'accepted' ? '#047857' : '#b45309',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                />
              </Box>

              {/* Code Token Display */}
              {invitation.token && (
                <>
                  <Typography sx={{ fontSize: 12, color: '#6b7280', mb: 0.5 }}>
                    Activation Token Code (Expires in 7 days):
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: '#f3f4f6',
                      p: 1.25,
                      borderRadius: 1.5,
                      border: '1px solid #e5e7eb',
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#374151',
                        wordBreak: 'break-all',
                        flex: 1,
                      }}
                    >
                      {invitation.token}
                    </Typography>
                    <Tooltip title={copied ? 'Copied!' : 'Copy activation code'}>
                      <Button
                        size="small"
                        onClick={handleCopyCode}
                        startIcon={copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                        sx={{ textTransform: 'none', fontWeight: 600, minWidth: 80 }}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </Tooltip>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                Dispatch Channels: <strong>SMS ({invitation.phone || contactPhone})</strong> {patient.email ? `& Email (${patient.email})` : ''} · Expires: {formatDateSafe(invitation.expires_at)}
              </Typography>
            </Paper>
          )}

          {/* Instructions box */}
          <Box sx={{ bgcolor: '#eff6ff', p: 1.75, borderRadius: 2, border: '1px solid #bfdbfe' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1e40af', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Icon name="phone" size={15} color="#1e40af" /> Mobile App Portal Activation Instructions
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.4 }}>
              The patient can download the Animal Bite Center mobile app and tap <strong>"Activate Account"</strong> using the 64-character activation token sent to their mobile phone {patient.email ? 'or email' : ''}.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb', bgcolor: '#fafafa' }}>
        <Button onClick={onClose} sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>

        {invitation && invitation.status === 'pending' ? (
          <Button
            variant="outlined"
            onClick={handleResendInvite}
            disabled={sending || !hasPhone}
            startIcon={sending ? <CircularProgress size={16} /> : <ResendIcon fontSize="small" />}
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
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
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
    </>
  );
}
