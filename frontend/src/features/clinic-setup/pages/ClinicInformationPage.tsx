import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
  Switch,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import { DAYS, DAY_LABELS } from '../components/WorkingHoursModal/WorkingHoursModal';

// Clean, minimal field style matching the reference design
const cleanFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
    fontSize: '14px',
    '& fieldset': {
      borderColor: '#d7e3da',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#9fc5ad',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#277a4b',
      borderWidth: '1.5px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '10px 14px',
    fontSize: '14px',
    color: '#374151',
  },
};

const timeFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
    fontSize: '13px',
    '& fieldset': {
      borderColor: '#d7e3da',
    },
    '&:hover fieldset': {
      borderColor: '#9fc5ad',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#277a4b',
      borderWidth: '1.5px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '8px 10px',
    fontSize: '13px',
  },
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

      // Parse opening hours if it's a string, or initialize as empty object if null/undefined
      let parsedHours: ClinicData['opening_hours'] = {};
      
      if (data.opening_hours) {
        if (typeof data.opening_hours === 'string') {
          try {
            parsedHours = JSON.parse(data.opening_hours);
          } catch (e) {
            console.error('Failed to parse opening hours:', e);
            parsedHours = {};
          }
        } else if (typeof data.opening_hours === 'object') {
          parsedHours = data.opening_hours;
        }
      }

      // Merge with default hours to ensure all days are present
      const defaultHours: ClinicData['opening_hours'] = {};
      DAYS.forEach(day => {
        defaultHours[day] = (parsedHours && parsedHours[day]) ? parsedHours[day] : {
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
      console.error('Error loading clinic data:', error);
      const errorMessage = error.response?.status === 404 
        ? 'No clinic found. Please contact support to set up your clinic.'
        : error.response?.data?.message || 'Failed to load clinic information. Please try again.';
      
      setSnackbar({
        open: true,
        message: errorMessage,
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

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...clinic,
        opening_hours: JSON.stringify(clinic.opening_hours),
      };

      await api.put('/setup/clinic', payload);

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

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 4 }}>
        <Skeleton variant="text" width={250} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          <Skeleton variant="rounded" height={500} />
          <Skeleton variant="rounded" height={500} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 600, fontSize: '25px', lineHeight: 1.2, color: '#173d29', mb: '7px', letterSpacing: '-0.5px' }}>
            Clinic Information
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d' }}>
            Manage your clinic details and operating hours
          </Typography>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: 0.75, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Information</span>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <IconButton
            onClick={loadClinicData}
            disabled={loading}
            sx={{ 
              border: '1px solid #e0eae3',
              borderRadius: 1.5,
              width: 40,
              height: 40,
              '&:hover': { bgcolor: '#f9fafb' }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saving}
            disableElevation
            sx={{
              bgcolor: '#10b981',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '14px',
              px: 3,
              py: 1.25,
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: '#059669',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Two Column Layout */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Left Column - Clinic Information */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #e0eae3',
            borderRadius: 2,
            p: 3,
            bgcolor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            I. CLINIC INFORMATION
          </Typography>
          <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Clinic Name */}
            <Box>
              <FieldLabel required>Clinic Name</FieldLabel>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter clinic name"
                value={clinic.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* License Number */}
            <Box>
              <FieldLabel>License Number</FieldLabel>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter license number"
                value={clinic.license_number}
                onChange={(e) => handleInputChange('license_number', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Address */}
            <Box>
              <FieldLabel>Address</FieldLabel>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Street, barangay, city"
                value={clinic.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <LocationOnIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Contact Number */}
            <Box>
              <FieldLabel>Contact Number</FieldLabel>
              <TextField
                fullWidth
                size="small"
                placeholder="+63 XXX XXX XXXX"
                value={clinic.contact_number}
                onChange={(e) => handleInputChange('contact_number', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Email Address */}
            <Box>
              <FieldLabel>Email Address</FieldLabel>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder="clinic@example.com"
                value={clinic.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Right Column - Working Hours */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #e0eae3',
            borderRadius: 2,
            p: 3,
            bgcolor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            II. WORKING HOURS
          </Typography>
          <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {DAYS.map(day => {
              const hours = clinic.opening_hours[day];
              const isOpen = hours?.is_open;
              return (
                <Box 
                  key={day}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap: 2,
                    alignItems: 'center',
                    pb: 2,
                    borderBottom: day !== 'saturday' ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch
                      size="small"
                      checked={isOpen}
                      onChange={(e) => handleHoursChange(day, 'is_open', e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#10b981',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#10b981',
                        },
                      }}
                    />
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: isOpen ? '#374151' : '#9ca3af' }}>
                      {DAY_LABELS[day]}
                    </Typography>
                  </Box>

                  {isOpen ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        type="time"
                        size="small"
                        value={hours.open}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                        sx={{ ...timeFieldSx, flex: 1 }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccessTimeIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <Typography sx={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>to</Typography>
                      <TextField
                        type="time"
                        size="small"
                        value={hours.close}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                        sx={{ ...timeFieldSx, flex: 1 }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccessTimeIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                      Closed
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>

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
