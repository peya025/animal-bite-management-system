import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import api from '../../../shared/services/api';
import AppButton from '../../../components/button';

interface Patient {
  patient_id: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

interface AddToQueueModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddToQueueModal({ open, onClose, onSuccess }: AddToQueueModalProps) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitType, setVisitType] = useState<'new_case' | 'follow_up' | 'vaccination' | 'observation'>('new_case');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [category, setCategory] = useState<'regular' | 'appointment' | 'senior_citizen' | 'pwd' | 'pregnant' | 'priority'>('regular');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedPatient(null);
      setVisitType('new_case');
      setPriority('normal');
      setCategory('regular');
      setPatientSearch('');
      setNotes('');
      setError('');
      loadPatients('');
    }
  }, [open]);

  // Server-side patient search — only fires when user types (not on open reset)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => loadPatients(patientSearch), 350);
    return () => clearTimeout(timer);
  }, [patientSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPatients = async (search: string) => {
    setLoadingPatients(true);
    try {
      const response = await api.get('/patients', {
        params: { per_page: 50, search: search || undefined },
      });
      const patientData = Array.isArray(response.data) ? response.data : response.data.data || [];
      setPatients(patientData);
    } catch {
      setError('Failed to load patient list');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/queue', {
        patient_id: selectedPatient.patient_id,
        visit_type: visitType,
        priority: priority,
        queue_category: category,
        check_in_notes: notes || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add to queue:', err);
      setError(err.response?.data?.message || 'Failed to add patient to queue');
    } finally {
      setLoading(false);
    }
  };

  const getPatientLabel = (patient: Patient) => {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name]
      .filter(Boolean)
      .join(' ');
    return `${patient.patient_number} - ${fullName}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, bgcolor: '#f0fdf4', color: '#065f46' }}>
        Add Patient to Queue
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Patient Selection — server-side search */}
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            options={patients}
            getOptionLabel={getPatientLabel}
            value={selectedPatient}
            onChange={(_, newValue) => setSelectedPatient(newValue)}
            onInputChange={(_, val, reason) => {
              // Only trigger search on actual user input, not on selection/reset
              if (reason === 'input') setPatientSearch(val);
            }}
            loading={loadingPatients}
            filterOptions={x => x}
            noOptionsText={loadingPatients ? 'Searching…' : 'No patients found — type to search'}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Patient"
                required
                helperText="Type to search by name or patient number"
                slotProps={{
                  input: {
                    ...(params as any).InputProps,
                    endAdornment: (
                      <>
                        {loadingPatients ? <CircularProgress size={20} /> : null}
                        {(params as any).InputProps?.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.patient_id}>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{getPatientLabel(option)}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                    {option.gender} · DOB: {new Date(option.date_of_birth).toLocaleDateString()}
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Box>

        {/* Queue Category */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth required>
            <InputLabel>Queue Category</InputLabel>
            <Select value={category} label="Queue Category" onChange={e => setCategory(e.target.value as any)}>
              <MenuItem value="regular">👤 Regular / Walk-in</MenuItem>
              <MenuItem value="appointment">📅 Appointment</MenuItem>
              <MenuItem value="senior_citizen">👴 Senior Citizen</MenuItem>
              <MenuItem value="pwd">♿ PWD</MenuItem>
              <MenuItem value="pregnant">🤰 Pregnant</MenuItem>
              <MenuItem value="priority">🚨 Priority / Urgent</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Visit Type */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth required>
            <InputLabel>Visit Type</InputLabel>
            <Select
              value={visitType}
              label="Visit Type"
              onChange={(e) => setVisitType(e.target.value as any)}
            >
              <MenuItem value="new_case">New Case (First Visit)</MenuItem>
              <MenuItem value="follow_up">Follow-up Visit</MenuItem>
              <MenuItem value="vaccination">Vaccination Only</MenuItem>
              <MenuItem value="observation">Observation</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Priority */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth required>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Check-in Notes */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Check-in Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special notes or observations..."
          />
        </Box>

        {selectedPatient && (
          <Alert severity="info" icon={false} sx={{ fontSize: 13 }}>
            <strong>Patient:</strong> {getPatientLabel(selectedPatient)}<br />
            <strong>Visit:</strong> {visitType.replace('_', ' ')} · <strong>Priority:</strong> {priority} · <strong>Category:</strong> {category.replace('_', ' ')}
          </Alert>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppButton
          variant="secondary"
          onClick={onClose}
          disabled={loading}
          startIcon={<CloseIcon />}
        >
          Cancel
        </AppButton>
        <AppButton
          onClick={handleSubmit}
          disabled={loading || !selectedPatient}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AddIcon />}
        >
          Add to Queue
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
