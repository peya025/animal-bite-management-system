import React from 'react';
import { Icon } from '../../../shared/components/ui/Icon';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  IconButton,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Badge as BadgeIcon,
  Event as CalendarIcon,
} from '@mui/icons-material';
import type { Patient } from '../types';

interface PatientDetailsModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
}

export default function PatientDetailsModal({
  open,
  patient,
  onClose,
  onEdit,
}: PatientDetailsModalProps) {
  if (!patient) return null;

  const patientFullName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(' ');

  const formattedDob = patient.date_of_birth
    ? new Date(patient.date_of_birth).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const formattedReg = patient.created_at
    ? new Date(patient.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          pb: 1.5,
          borderBottom: '1px solid #e5e7eb',
          bgcolor: '#fafafa',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BadgeIcon sx={{ color: '#3b82f6' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#173d29', fontSize: 16 }}>
            Patient Information
          </Typography>
        </Box>
        <Chip
          label={`#${patient.patient_number || patient.patient_id}`}
          size="small"
          sx={{ bgcolor: '#f3f4f6', color: '#374151', fontWeight: 700, fontFamily: 'monospace' }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        <Stack spacing={2.5}>
          {/* Header Profile Info */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>
              {patientFullName}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#15803d', mt: 0.25 }}>
              Sex: <strong style={{ textTransform: 'capitalize' }}>{patient.gender}</strong> · Date of Birth: <strong>{formattedDob}</strong>
            </Typography>
          </Paper>

          {/* Contact Details */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', mb: 1.5 }}>
              Contact & Portal Details
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Mobile Phone</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {patient.contact_number || patient.phone ? (
                    <>
                      <Icon name="phone" size={14} color="#059669" /> {patient.contact_number || patient.phone}
                    </>
                  ) : (
                    '—'
                  )}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Email Address</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {patient.email ? (
                    <>
                      <Icon name="email" size={14} color="#2563eb" /> {patient.email}
                    </>
                  ) : (
                    '—'
                  )}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Emergency Contact Name</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {(patient as any).emergency_contact_name || '—'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Emergency Contact Phone</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {(patient as any).emergency_contact_number || (patient as any).emergency_contact_phone || '—'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Address & Registration info */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', mb: 1.5 }}>
              Address & System Registration
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Residential Address</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {patient.address ? (
                    <>
                      <Icon name="location" size={14} color="#7c3aed" /> {patient.address}
                    </>
                  ) : (
                    '—'
                  )}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Registered On</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {formattedReg}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Status</Typography>
                <Chip
                  size="small"
                  label={(patient.status || 'Active').toUpperCase()}
                  sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: 11 }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb', bgcolor: '#fafafa' }}>
        <Button onClick={onClose} sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onClose();
            onEdit(patient);
          }}
          startIcon={<EditIcon fontSize="small" />}
          sx={{
            bgcolor: '#10b981',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: '#059669' },
          }}
        >
          Edit Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
}
