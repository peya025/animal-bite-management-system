import { useState, useEffect, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  LocalHospital as LocalHospitalIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import WorkingHoursModal, { DAYS, DAY_LABELS, formatTimeLabel } from './WorkingHoursModal';

// Soft "filled" field style: subtle gray fill at rest, white with a green
// focus ring when active — replaces the boxed outline + floating label look.
const filledFieldSx = {
  '& .MuiFilledInput-root': {
    borderRadius: 2.5,
    bgcolor: '#f8fafc',
    border: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
    '&:before, &:after': { display: 'none' },
    '&:hover': { bgcolor: '#f1f5f9' },
    '&.Mui-focused': {
      bgcolor: '#fff',
      borderColor: '#10b981',
      boxShadow: '0 0 0 3px rgba(16,185,129,0.12)',
    },
  },
  '& .MuiFilledInput-input': { fontSize: 14, color: '#0f172a', py: '12px' },
};

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Typography component="label" sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75, display: 'block' }}>
      {children}
      {required && <Box component="span" sx={{ color: '#ef4444', ml: 0.4 }}>*</Box>}
    </Typography>
  );
}

interface ClinicData {
  name: string;
  address: string;
  contact_number: string;
  email: string;
  license_number: string;
  opening_hours: {
    [key: string]: { open: string; close: string; is_open: boolean };
  };
}

export default function ClinicInformation() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [clinic, setClinic] = useState<ClinicData>({
    name: '',
    address: '',
    contact_number: '',
    email: '',
    license_number: '',
    opening_hours: {},
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Initialize opening hours with default values
  useEffect(() => {
    const defaultHours: ClinicData['opening_hours'] = {};
    DAYS.forEach(day => {
      defaultHours[day] = { open: '08:00', close: '17:00', is_open: day !== 'sunday' };
    });
    setClinic(prev => ({ ...prev, opening_hours: defaultHours }));
  }, []);

  // Load clinic data
  const loadClinicData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/setup/clinic');
      const data = response.data;

      // Parse opening hours if it's a string
      let parsedHours = data.opening_hours;
      if (typeof data.opening_hours === 'string') {
        try {
          parsedHours = JSON.parse(data.opening_hours);
        } catch (e) {
          console.error('Failed to parse opening hours:', e);
          parsedHours = {};
        }
      }

      // Merge with default hours to ensure all days are present
      const defaultHours: ClinicData['opening_hours'] = {};
      DAYS.forEach(day => {
        defaultHours[day] = parsedHours[day] || {
          open: '08:00',
          close: '17:00',
          is_open: day !== 'sunday',
        };
      });

      setClinic({
        name: data.name || '',
        address: data.address || '',
        contact_number: data.contact_number || '',
        email: data.email || '',
        license_number: data.license_number || '',
        opening_hours: defaultHours,
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to load clinic information',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
  }, []);

  const handleInputChange = (field: keyof Omit<ClinicData, 'opening_hours'>, value: string) => {
    setClinic(prev => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'is_open', value: string | boolean) => {
    setClinic(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours[day],
          [field]: value,
        },
      },
    }));
  };

  // Copies one day's open/close times to every other day that is currently open,
  // so the admin doesn't have to retype the same hours seven times.
  const applyHoursToAllDays = (sourceDay: string) => {
    const source = clinic.opening_hours[sourceDay];
    if (!source) return;
    setClinic(prev => {
      const updated = { ...prev.opening_hours };
      DAYS.forEach(d => {
        if (updated[d]?.is_open) {
          updated[d] = { ...updated[d], open: source.open, close: source.close };
        }
      });
      return { ...prev, opening_hours: updated };
    });
    setSnackbar({
      open: true,
      message: `Applied ${DAY_LABELS[sourceDay]}'s hours to all open days`,
      severity: 'success',
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...clinic,
        opening_hours: JSON.stringify(clinic.opening_hours),
      };

      await api.put('/setup/clinic', payload);

      // Update localStorage
      const clinicData = JSON.stringify({
        ...clinic,
        opening_hours: clinic.opening_hours,
      });
      localStorage.setItem('clinicData', clinicData);

      setSnackbar({
        open: true,
        message: 'Clinic information updated successfully',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to update clinic information',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const openDaysCount = Object.values(clinic.opening_hours).filter(d => d?.is_open).length;

  if (loading) {
    return (
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 2.5 }} />
          <Box>
            <Skeleton variant="text" width={200} height={28} />
            <Skeleton variant="text" width={280} height={18} />
          </Box>
        </Box>
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3, mb: 3 }}>
          <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          </Box>
          <Skeleton variant="rounded" height={72} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          </Box>
        </Paper>
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3 }}>
          <Skeleton variant="text" width={150} height={28} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} variant="rounded" width={120} height={28} sx={{ borderRadius: 5 }} />
            ))}
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          
          <Box>
            <Typography component="h1" sx={{ fontWeight: 700, fontSize: '20px', color: '#111827', margin: '0 0 4px 0' }}>
              Clinic Information
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              Manage your clinic details and operating hours
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Reload from server">
            <span>
              <IconButton
                onClick={loadClinicData}
                disabled={loading}
                sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saving}
            disableElevation
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Basic Information */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #f1f5f9',
          borderRadius: 4,
          p: { xs: 2.5, sm: 4 },
          mb: 3,
          boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        }}
      >
        {/* Profile-style header: avatar initial + section label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
            }}
          >
            {clinic.name?.trim() ? (
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 24 }}>
                {clinic.name.trim().charAt(0).toUpperCase()}
              </Typography>
            ) : (
              <LocalHospitalIcon sx={{ color: '#fff', fontSize: 28 }} />
            )}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#10b981', textTransform: 'uppercase', mb: 0.5 }}>
              General
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>
              Basic Information
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
              Shown on receipts, appointment confirmations, and the patient portal
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
          <Box>
            <FieldLabel required>Clinic Name</FieldLabel>
            <TextField
              fullWidth
              variant="filled"
              hiddenLabel
              placeholder="e.g., Wellness Family Clinic"
              value={clinic.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              sx={filledFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <Box>
            <FieldLabel>License Number</FieldLabel>
            <TextField
              fullWidth
              variant="filled"
              hiddenLabel
              placeholder="e.g., DOH-12345"
              value={clinic.license_number}
              onChange={(e) => handleInputChange('license_number', e.target.value)}
              sx={filledFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 2.5 }}>
          <FieldLabel>Address</FieldLabel>
          <TextField
            fullWidth
            variant="filled"
            hiddenLabel
            multiline
            rows={2}
            placeholder="Street, barangay, city"
            value={clinic.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            sx={filledFieldSx}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: '14px' }}>
                    <LocationOnIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mt: 2.5 }}>
          <Box>
            <FieldLabel>Contact Number</FieldLabel>
            <TextField
              fullWidth
              variant="filled"
              hiddenLabel
              placeholder="+63 912 345 6789"
              value={clinic.contact_number}
              onChange={(e) => handleInputChange('contact_number', e.target.value)}
              sx={filledFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <Box>
            <FieldLabel>Email Address</FieldLabel>
            <TextField
              fullWidth
              variant="filled"
              hiddenLabel
              type="email"
              placeholder="clinic@example.com"
              value={clinic.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              sx={filledFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Opening Hours summary + trigger for the modal */}
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
              Opening Hours
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#6b7280', mt: 0.5 }}>
              Open {openDaysCount} of 7 days a week
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ScheduleIcon />}
            onClick={() => setHoursModalOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              borderColor: '#d1d5db',
              color: '#374151',
              '&:hover': { borderColor: '#10b981', color: '#059669', bgcolor: '#ecfdf5' },
            }}
          >
            Edit Working Hours
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {DAYS.map(day => {
            const hours = clinic.opening_hours[day];
            const isOpen = hours?.is_open;
            return (
              <Chip
                key={day}
                size="small"
                label={
                  isOpen
                    ? `${DAY_LABELS[day].slice(0, 3)} ${formatTimeLabel(hours.open)} – ${formatTimeLabel(hours.close)}`
                    : `${DAY_LABELS[day].slice(0, 3)} Closed`
                }
                sx={{
                  bgcolor: isOpen ? '#ecfdf5' : '#f9fafb',
                  color: isOpen ? '#059669' : '#9ca3af',
                  border: '1px solid',
                  borderColor: isOpen ? '#a7f3d0' : '#e5e7eb',
                  fontWeight: 500,
                  fontSize: 12,
                }}
              />
            );
          })}
        </Box>
      </Paper>

      <WorkingHoursModal
        open={hoursModalOpen}
        onClose={() => setHoursModalOpen(false)}
        openingHours={clinic.opening_hours}
        onHoursChange={handleHoursChange}
        onCopyToAll={applyHoursToAllDays}
      />

      {/* Snackbar */}
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