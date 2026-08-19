import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Checkbox,
  FormGroup,
  MenuItem,
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import AppButton from '../../../components/button';
import { formatPhilHealthNumber } from '../../../shared/utils';

interface IndividualTreatmentFormProps {
  open: boolean;
  entry: any; // Queue entry with patient data
  onClose: () => void;
  onSave: () => void;
}

/**
 * Form 2: Individual Treatment Record (Tagoloan Treatment Card - Part 1)
 * Used by: Doctor (triage role)
 * Purpose: Record bite incident details and exposure assessment
 */
export default function IndividualTreatmentForm({
  open,
  entry,
  onClose,
  onSave,
}: IndividualTreatmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Section 1: Patient & Registration Info (pre-filled)
    date: new Date().toISOString().split('T')[0],
    registry_no: '',
    hospital_no: '',
    referred_by: '',
    philhealth_pin: '',
    philhealth_type: '',

    // Section 2: Exposure Details
    exposure_category: '',
    date_of_exposure: '',
    date_treatment_started: new Date().toISOString().split('T')[0],
    place_of_exposure: '',

    // Section 3: Exposure Details (Detailed)
    mode_of_exposure: [] as string[],
    body_part_affected: '',
    animal_type: 'dog',
    animal_type_other: '',
    past_history_bite: '',
    past_pep_completed: '',
  });

  useEffect(() => {
    if (open && entry) {
      // Pre-fill patient data from queue entry
      setFormData((prev) => ({
        ...prev,
        registry_no: entry.patient?.patient_number || '',
        date: new Date().toISOString().split('T')[0],
        date_treatment_started: new Date().toISOString().split('T')[0],
      }));

      // Load existing treatment record if available
      const loadExistingData = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const res = await fetch(
            `http://localhost:8000/api/treatment-records/patient/${entry.patient?.patient_id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            }
          );

          if (res.ok) {
            const data = await res.json();
            if (data.latest_bite) {
              // Pre-fill with existing bite incident data
              setFormData((prev) => ({
                ...prev,
                exposure_category: data.latest_bite.exposure_category || '',
                date_of_exposure: data.latest_bite.bite_date || '',
                place_of_exposure: data.latest_bite.bite_place || '',
                animal_type: data.latest_bite.animal_type?.toLowerCase() === 'dog' ? 'dog' : 'other',
                animal_type_other: data.latest_bite.animal_type?.toLowerCase() !== 'dog' ? data.latest_bite.animal_type : '',
                body_part_affected: data.latest_bite.body_part || '',
              }));
            }
          }
        } catch (error) {
          console.error('Failed to load existing treatment data:', error);
        }
      };

      loadExistingData();
    }
  }, [open, entry]);

  const handleChange = (field: string, value: any) => {
    if (field === 'philhealth_pin') {
      value = formatPhilHealthNumber(value);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModeToggle = (mode: string) => {
    setFormData((prev) => ({
      ...prev,
      mode_of_exposure: prev.mode_of_exposure.includes(mode)
        ? prev.mode_of_exposure.filter((m) => m !== mode)
        : [...prev.mode_of_exposure, mode],
    }));
  };

  const handleSave = async () => {
    if (formData.philhealth_pin && formData.philhealth_pin.replace(/\D/g, '').length !== 12) {
      alert('PhilHealth PIN must be exactly 12 digits.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const payload = {
        patient_id: entry.patient?.patient_id,
        queue_id: entry.queue_id,
        ...formData,
      };

      const res = await fetch('http://localhost:8000/api/treatment-records', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save treatment record');
      }

      const data = await res.json();
      console.log('Treatment record saved:', data);
      
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save treatment record:', error);
      alert('Error: ' + (error.message || 'Failed to save treatment record'));
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, bgcolor: '#f0fdf4', color: '#15803d' }}>
        Form 2: Individual Treatment Record
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Patient Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Patient:</strong> {entry.patient?.name} · Queue #{entry.queue_number}
        </Alert>

        {/* ─── SECTION 1: Patient & Registration Information ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#15803d' }}>
            Patient & Registration Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Registry No."
                value={formData.registry_no}
                onChange={(e) => handleChange('registry_no', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Hospital No. (optional)"
                value={formData.hospital_no}
                onChange={(e) => handleChange('hospital_no', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Referred by (optional)"
                value={formData.referred_by}
                onChange={(e) => handleChange('referred_by', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="PhilHealth PIN (optional)"
                value={formData.philhealth_pin}
                onChange={(e) => handleChange('philhealth_pin', e.target.value)}
                slotProps={{ htmlInput: { maxLength: 14 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="PhilHealth Type"
                value={formData.philhealth_type}
                onChange={(e) => handleChange('philhealth_type', e.target.value)}
              >
                <MenuItem value="">— Select —</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="dependent">Dependent</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>

        {/* ─── SECTION 2: Exposure Details ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#15803d' }}>
            Exposure Details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControl component="fieldset" required>
                <FormLabel sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
                  Exposure Category *
                </FormLabel>
                <RadioGroup
                  row
                  value={formData.exposure_category}
                  onChange={(e) => handleChange('exposure_category', e.target.value)}
                >
                  <FormControlLabel value="I" control={<Radio />} label="Category I" />
                  <FormControlLabel value="II" control={<Radio />} label="Category II" />
                  <FormControlLabel value="III" control={<Radio />} label="Category III" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Date of Exposure *"
                type="date"
                value={formData.date_of_exposure}
                onChange={(e) => handleChange('date_of_exposure', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Date Treatment Started *"
                type="date"
                value={formData.date_treatment_started}
                onChange={(e) => handleChange('date_treatment_started', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Place of Exposure *"
                value={formData.place_of_exposure}
                onChange={(e) => handleChange('place_of_exposure', e.target.value)}
                placeholder="e.g., Home, Street, Farm"
                required
              />
            </Grid>
          </Grid>
        </Box>

        {/* ─── SECTION 3: Exposure Details (Detailed) ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#15803d' }}>
            Exposure Details (Detailed)
          </Typography>

          {/* 1. Mode of Animal Exposure */}
          <Box sx={{ mb: 2 }}>
            <FormLabel sx={{ fontWeight: 600, fontSize: 14, mb: 1, display: 'block' }}>
              1. Mode of Animal Exposure *
            </FormLabel>
            <FormGroup>
              {[
                'Nibbling/Licking of uncovered skin',
                'Nibbling/Licking of wounded/broken skin',
                'Scratch / Abrasion',
                'Transdermal Bite',
                'Handling / Ingestion of raw infected meat',
              ].map((mode) => (
                <FormControlLabel
                  key={mode}
                  control={
                    <Checkbox
                      checked={formData.mode_of_exposure.includes(mode)}
                      onChange={() => handleModeToggle(mode)}
                    />
                  }
                  label={mode}
                />
              ))}
            </FormGroup>
          </Box>

          {/* 2. Body Part Affected */}
          <Box sx={{ mb: 2 }}>
            <FormControl component="fieldset" required>
              <FormLabel sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
                2. Body Part Affected/Exposed *
              </FormLabel>
              <RadioGroup
                value={formData.body_part_affected}
                onChange={(e) => handleChange('body_part_affected', e.target.value)}
              >
                <FormControlLabel value="head_neck" control={<Radio />} label="Head and/or neck" />
                <FormControlLabel
                  value="other_parts"
                  control={<Radio />}
                  label="Other parts of the body"
                />
                <FormControlLabel
                  value="na_ingestion"
                  control={<Radio />}
                  label="N/A if Ingestion mode"
                />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* 3. Type of Animal */}
          <Box sx={{ mb: 2 }}>
            <FormControl component="fieldset" required>
              <FormLabel sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
                3. Type of Animal *
              </FormLabel>
              <RadioGroup
                value={formData.animal_type}
                onChange={(e) => handleChange('animal_type', e.target.value)}
              >
                <FormControlLabel value="dog" control={<Radio />} label="Dog" />
                <FormControlLabel
                  value="other"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Others:
                      <TextField
                        size="small"
                        value={formData.animal_type_other}
                        onChange={(e) => handleChange('animal_type_other', e.target.value)}
                        disabled={formData.animal_type !== 'other'}
                        placeholder="Specify"
                        sx={{ width: 200 }}
                      />
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* 4. Past History */}
          <Box>
            <FormControl component="fieldset" required>
              <FormLabel sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
                4. Past History of Animal Bite *
              </FormLabel>
              <RadioGroup
                value={formData.past_history_bite}
                onChange={(e) => handleChange('past_history_bite', e.target.value)}
              >
                <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="no" control={<Radio />} label="No" />
              </RadioGroup>
            </FormControl>

            {formData.past_history_bite === 'yes' && (
              <Box sx={{ ml: 4, mt: 1 }}>
                <FormControl component="fieldset">
                  <FormLabel sx={{ fontSize: 13, mb: 0.5 }}>
                    Was PEP Immunization completed?
                  </FormLabel>
                  <RadioGroup
                    value={formData.past_pep_completed}
                    onChange={(e) => handleChange('past_pep_completed', e.target.value)}
                    row
                  >
                    <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                    <FormControlLabel value="no" control={<Radio />} label="No" />
                  </RadioGroup>
                </FormControl>
              </Box>
            )}
          </Box>
        </Box>
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
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
        >
          Save Form 2
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
