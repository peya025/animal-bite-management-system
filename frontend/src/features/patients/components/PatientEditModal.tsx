import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { LockOutlined as LockIcon, CheckCircleOutlined as CheckIcon } from '@mui/icons-material';
import api from '../../../shared/services/api';
import type { Patient } from '../types';

interface PatientEditModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSave: (updatedPatient: any) => void;
}

function getStoredUserRole(): string {
  try {
    const raw = localStorage.getItem('userData') || localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed.role ?? parsed.user?.role ?? '';
  } catch {
    return '';
  }
}

export default function PatientEditModal({
  open,
  patient,
  onClose,
  onSave,
}: PatientEditModalProps) {
  const [userRole] = useState<string>(() => getStoredUserRole());
  const isAdminOrReg = ['admin', 'registration', 'developer'].includes(userRole);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    // Legal Identity (Admin/Reg only)
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    date_of_birth: '',
    gender: 'male',
    philhealth_no: '',

    // Contact Information (All staff)
    contact_number: '',
    email: '',
    emergency_contact_name: '',
    emergency_contact_number: '',

    // Address Details (All staff)
    address_purok: '',
    address_barangay: '',
    address_municipality: '',
    address: '',
  });

  useEffect(() => {
    if (!open || !patient) return;

    const populate = (data: any) => {
      const details = (data.details as any) || {};
      setFormData({
        first_name: data.first_name || '',
        middle_name: data.middle_name || '',
        last_name: data.last_name || '',
        suffix: (details.suffix as string) || (data.suffix as string) || '',
        date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
        gender: (data.gender as string) || (data.sex as string) || 'male',
        philhealth_no: (details.philhealth_no as string) || data.philhealth_no || '',

        contact_number: data.contact_number || data.phone || '',
        email: data.email || '',
        emergency_contact_name: (details.emergency_contact_name as string) || data.emergency_contact_name || '',
        emergency_contact_number: (details.emergency_contact_number as string) || data.emergency_contact_number || data.emergency_contact_phone || '',

        address_purok: (details.address_purok as string) || '',
        address_barangay: (details.address_barangay as string) || '',
        address_municipality: (details.address_municipality as string) || 'Tagoloan',
        address: data.address || '',
      });
    };

    populate(patient);
    setError('');
    setSuccessMsg('');

    const patientId = (patient as any).patient_id || (patient as any).id;
    if (patientId) {
      api.get(`/patients/${patientId}`)
        .then(({ data }) => {
          if (data) populate(data);
        })
        .catch(() => {});
    }
  }, [open, patient]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!patient) return;
    const patientId = patient.patient_id || patient.id;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload: any = {
        contact_number: formData.contact_number || null,
        email: formData.email || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_number: formData.emergency_contact_number || null,
        address: formData.address || null,
        address_purok: formData.address_purok || null,
        address_barangay: formData.address_barangay || null,
        address_municipality: formData.address_municipality || null,
      };

      // Only include legal identity fields if user has permission
      if (isAdminOrReg) {
        payload.first_name = formData.first_name.trim();
        payload.middle_name = formData.middle_name.trim() || null;
        payload.last_name = formData.last_name.trim();
        payload.suffix = formData.suffix.trim() || null;
        payload.gender = formData.gender;
        if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
        if (formData.philhealth_no) payload.philhealth_no = formData.philhealth_no.trim();
      }

      const res = await api.put(`/patients/${patientId}`, payload);
      setSuccessMsg('Patient details updated successfully!');
      setTimeout(() => {
        onSave(res.data?.patient || { ...patient, ...payload });
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update patient information.');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !patient) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>
              Update Patient Demographics — Form 1
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#6b7280', mt: 0.25 }}>
              Patient #{patient.patient_number} · {patient.first_name} {patient.last_name}
            </Typography>
          </Box>
          <Box sx={{
            px: 1.5, py: 0.5, borderRadius: 1.5, fontSize: 11, fontWeight: 700,
            bgcolor: isAdminOrReg ? '#dcfce7' : '#eff6ff',
            color: isAdminOrReg ? '#15803d' : '#1e40af',
            border: `1px solid ${isAdminOrReg ? '#86efac' : '#bfdbfe'}`,
          }}>
            {isAdminOrReg ? 'Admin / Registration Mode' : 'Clinical Staff Mode'}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Role permission info banner */}
        {!isAdminOrReg ? (
          <Alert severity="info" sx={{ mb: 2.5, fontSize: 12.5, py: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LockIcon sx={{ fontSize: 16 }} />
              <span>
                <strong>Clinical Staff Access:</strong> You can update contact numbers and address details. Legal identity fields (Name, Birthdate) are locked for administrative data integrity.
              </span>
            </Box>
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 2.5, fontSize: 12.5, py: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckIcon sx={{ fontSize: 16 }} />
              <span>
                <strong>Full Edit Access:</strong> You can update both official legal identity and contact/address records.
              </span>
            </Box>
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2, fontSize: 13 }}>{successMsg}</Alert>}

        {/* ── SECTION 1: LEGAL IDENTITY ── */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              I. Official Legal Identity
            </Typography>
            {!isAdminOrReg && (
              <Tooltip title="Requires Admin or Registration Role to edit">
                <LockIcon sx={{ fontSize: 15, color: '#9ca3af' }} />
              </Tooltip>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="First Name"
                value={formData.first_name}
                onChange={handleChange('first_name')}
                disabled={!isAdminOrReg}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Middle Name"
                value={formData.middle_name}
                onChange={handleChange('middle_name')}
                disabled={!isAdminOrReg}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Last Name"
                value={formData.last_name}
                onChange={handleChange('last_name')}
                disabled={!isAdminOrReg}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Suffix (Jr, Sr, III)"
                value={formData.suffix}
                onChange={handleChange('suffix')}
                disabled={!isAdminOrReg}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date of Birth"
                InputLabelProps={{ shrink: true }}
                value={formData.date_of_birth}
                onChange={handleChange('date_of_birth')}
                disabled={!isAdminOrReg}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                size="small"
                label="Sex / Gender"
                value={formData.gender}
                onChange={handleChange('gender')}
                disabled={!isAdminOrReg}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="PhilHealth Number"
                value={formData.philhealth_no}
                onChange={handleChange('philhealth_no')}
                disabled={!isAdminOrReg}
                placeholder="12-digit PIN"
              />
            </Grid>
          </Grid>
        </Box>

        {/* ── SECTION 2: CONTACT INFORMATION ── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
            II. Contact Information (Editable by all staff)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Mobile Phone Number"
                value={formData.contact_number}
                onChange={handleChange('contact_number')}
                placeholder="0917-xxx-xxxx"
                helperText="Used for automatic appointment SMS reminders"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="patient@example.com"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Emergency Contact Name"
                value={formData.emergency_contact_name}
                onChange={handleChange('emergency_contact_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Emergency Contact Phone"
                value={formData.emergency_contact_number}
                onChange={handleChange('emergency_contact_number')}
              />
            </Grid>
          </Grid>
        </Box>

        {/* ── SECTION 3: RESIDENTIAL ADDRESS ── */}
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
            III. Residential Address (Editable by all staff)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Municipality"
                value={formData.address_municipality}
                onChange={handleChange('address_municipality')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Barangay"
                value={formData.address_barangay}
                onChange={handleChange('address_barangay')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Purok / Zone / Street"
                value={formData.address_purok}
                onChange={handleChange('address_purok')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Complete Residential Address"
                value={formData.address}
                onChange={handleChange('address')}
                placeholder="Purok, Barangay, Municipality, Province"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: 'none', color: '#6b7280' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          sx={{
            textTransform: 'none',
            bgcolor: '#10b981',
            color: '#fff',
            fontWeight: 600,
            px: 2.5,
            '&:hover': { bgcolor: '#059669' },
          }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save Demographic Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
