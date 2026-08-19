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
  Stack,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  CardMembership as CardMembershipIcon,
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

  const details = (patient as any).details || {};

  const patientFullName = [
    patient.first_name,
    patient.middle_name,
    patient.last_name,
    (patient as any).suffix
  ].filter(Boolean).join(' ');

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

  // Helper to get government program details
  const getGovProgramInfo = () => {
    if (details.has_membership !== 'yes') return null;

    if (details.philhealth_member === 'yes') {
      return {
        name: 'PhilHealth',
        fields: [
          { label: 'Status Type', value: details.philhealth_status },
          { label: 'PhilHealth No.', value: details.philhealth_no },
          { label: 'Category', value: details.philhealth_category },
        ],
      };
    }
    if (details.fourps_member === 'yes') {
      const fields = [
        { label: '4Ps Membership Category', value: details.fourps_category },
      ];
      if (details.fourps_category === 'Member of Beneficiary') {
        fields.push({ label: 'Registered 4Ps Beneficiary', value: details.registered_fourps_beneficiary });
        fields.push({ label: 'Relationship to Registered Beneficiary', value: details.fourps_relationship });
      }
      return { name: '4Ps (Pantawid Pamilyang Pilipino Program)', fields };
    }
    if (details.dswd_nhts === 'yes') {
      return { name: 'DSWD NHTS', fields: [] };
    }
    
    // Other memberships
    const otherType = details.other_membership;
    if (otherType && otherType !== 'none') {
      let programName = '';
      let idLabel = 'ID / Certificate No.';
      
      if (otherType === 'senior_citizen') {
        programName = 'Senior Citizen';
        idLabel = 'Senior Citizen ID No.';
      } else if (otherType === 'pwd') {
        programName = 'PWD (Person with Disability)';
        idLabel = 'PWD ID No.';
      } else if (otherType === 'indigenous_member') {
        programName = 'Indigenous Member';
        idLabel = 'Tribe / IP ID No.';
      } else if (otherType === 'others') {
        programName = details.other_membership_name || 'Others';
      }

      return {
        name: programName,
        fields: [
          { label: idLabel, value: details.other_membership_no },
        ],
      };
    }

    return null;
  };

  const govProgram = getGovProgramInfo();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          borderBottom: '1px solid #e5e7eb',
          bgcolor: '#fafafa',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BadgeIcon sx={{ color: '#10b981' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#173d29', fontSize: 16 }}>
            Patient Profile Details
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
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>
              {patientFullName}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#15803d', mt: 0.5 }}>
              Sex: <strong style={{ textTransform: 'capitalize' }}>{patient.gender}</strong> · Date of Birth: <strong>{formattedDob}</strong> · Age: <strong>{(patient as any).age} yrs old</strong>
            </Typography>
          </Paper>

          {/* Section 1: Personal Information */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PersonIcon sx={{ color: '#10b981', fontSize: 18 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                Personal Information
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Blood Type</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                  {details.blood_type || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Civil Status</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                  {details.civil_status || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Spouse Name</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                  {details.spouse_name || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Mother's Maiden Name</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                  {details.mother_maiden_name || '—'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Section 2: Contact & Emergency Details */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PhoneIcon sx={{ color: '#10b981', fontSize: 18 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                Contact & Emergency Details
              </Typography>
            </Box>
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
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
                  {(patient as any).emergency_contact_name || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Emergency Contact Phone</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
                  {(patient as any).emergency_contact_number || (patient as any).emergency_contact_phone || '—'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Section 3: Residential Address */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <HomeIcon sx={{ color: '#10b981', fontSize: 18 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                Residential Address
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Residential Address</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {patient.address ? (
                    <>
                      <Icon name="location" size={14} color="#7c3aed" /> {patient.address}
                    </>
                  ) : (
                    '—'
                  )}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Purok</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
                  {details.address_purok || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Barangay</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
                  {details.address_barangay || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Municipality / City</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
                  {details.address_municipality || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Province</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
                  {details.province || '—'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Section 4: Socioeconomic Status */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <WorkIcon sx={{ color: '#10b981', fontSize: 18 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                Socioeconomic Information
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Family Member Status</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                  {details.family_member || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Educational Attainment</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                  {details.educational_attainment || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Employment Status</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                  {details.employment_status || '—'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Section 5: Government Program / Membership */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CardMembershipIcon sx={{ color: '#10b981', fontSize: 18 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                Government Program / Membership
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Any Government Program / Other Membership?</Typography>
                <Chip
                  size="small"
                  label={details.has_membership === 'yes' ? 'YES' : 'NO'}
                  sx={{
                    bgcolor: details.has_membership === 'yes' ? '#e8f5e9' : '#fafafa',
                    color: details.has_membership === 'yes' ? '#2e7d32' : '#757575',
                    fontWeight: 700,
                    fontSize: 11,
                    mt: 0.5,
                  }}
                />
              </Grid>

              {details.has_membership === 'yes' && govProgram && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 12, color: '#6b7280' }}>Program / Membership Name</Typography>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                      {govProgram.name}
                    </Typography>
                  </Grid>

                  {govProgram.fields.map((f, i) => (
                    <Grid key={`gov-field-${i}`} size={{ xs: 12, sm: 6 }}>
                      <Typography sx={{ fontSize: 12, color: '#6b7280' }}>{f.label}</Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                        {f.value || '—'}
                      </Typography>
                    </Grid>
                  ))}
                </>
              )}
            </Grid>
          </Paper>

          {/* System Audit */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>Registered On</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280' }}>
                  {formattedReg}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>System Status</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280', textTransform: 'capitalize' }}>
                  {patient.status || 'Active'}
                </Typography>
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
