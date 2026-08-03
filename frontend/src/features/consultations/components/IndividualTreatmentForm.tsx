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
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import api from '../../../shared/services/api';
import AppButton from '../../../components/button';

interface IndividualTreatmentFormProps {
  open: boolean;
  entry: any; // Queue entry with patient data
  onClose: () => void;
  onSave: () => void;
}

/**
 * Form 2: Individual Treatment (General Consultation Form)
 * Used by: Doctor/Triage
 * Purpose: Record consultation details for any type of visit
 */
export default function IndividualTreatmentForm({
  open,
  entry,
  onClose,
  onSave,
}: IndividualTreatmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Patient Information (pre-filled, read-only)
    last_name: '',
    first_name: '',
    middle_name: '',
    suffix: '',
    age: '',
    address: '',

    // For CHU/RHU Personnel Only
    mode_of_transaction: 'walk_in', // walk_in, visited, referral
    referred_from: '',
    referred_to: '',

    // Consultation Details
    date_of_consultation: new Date().toISOString().split('T')[0],
    consultation_time: new Date().toTimeString().slice(0, 5),
    
    // Vital Signs
    blood_pressure: '',
    temperature: '',
    height: '',
    weight: '',

    // Name of Attending Provider & Referred by
    attending_provider: '',
    referred_by: '',

    // Nature of Visit
    nature_of_visit: '', // new_consultation, new_admission, follow_up

    // Type of Consultation / Purpose of Visit
    consultation_types: {
      general: false,
      prenatal: false,
      dental_care: false,
      child_care: false,
      child_nutrition: false,
      injury: false,
      adult_immunization: false,
      family_planning: false,
      postpartum: false,
      tuberculosis: false,
      child_immunization: false,
      sick_children: false,
      firecracker_injury: false,
    },

    // Clinical Notes
    chief_complaints: '',
    diagnosis: '',
    medication_treatment: '',
    laboratory_findings: '',
    performed_lab_test: '',
    healthcare_provider_name: '',
  });

  useEffect(() => {
    if (open && entry) {
      // Pre-fill patient data from queue entry
      const patient = entry.patient;
      setFormData((prev) => ({
        ...prev,
        last_name: patient?.last_name || '',
        first_name: patient?.first_name || '',
        middle_name: patient?.middle_name || '',
        suffix: patient?.suffix || '',
        age: patient?.age?.toString() || '',
        address: patient?.address || '',
      }));

      // Load existing consultation record if available
      loadExistingData();
    }
  }, [open, entry]);

  const loadExistingData = async () => {
    if (!entry?.patient?.patient_id) return;

    try {
      const response = await api.get(`/consultations/patient/${entry.patient.patient_id}/latest`);
      if (response.data.consultation) {
        const consultation = response.data.consultation;
        setFormData((prev) => ({
          ...prev,
          mode_of_transaction: consultation.mode_of_transaction || 'walk_in',
          referred_from: consultation.referred_from || '',
          referred_to: consultation.referred_to || '',
          date_of_consultation: consultation.consultation_date || prev.date_of_consultation,
          consultation_time: consultation.consultation_time || prev.consultation_time,
          blood_pressure: consultation.blood_pressure || '',
          temperature: consultation.temperature || '',
          height: consultation.height || '',
          weight: consultation.weight || '',
          attending_provider: consultation.attending_provider || '',
          referred_by: consultation.referred_by || '',
          nature_of_visit: consultation.nature_of_visit || '',
          consultation_types: consultation.consultation_types ? JSON.parse(consultation.consultation_types) : prev.consultation_types,
          chief_complaints: consultation.chief_complaints || '',
          diagnosis: consultation.diagnosis || '',
          medication_treatment: consultation.medication_treatment || '',
          laboratory_findings: consultation.laboratory_findings || '',
          performed_lab_test: consultation.performed_lab_test || '',
          healthcare_provider_name: consultation.healthcare_provider_name || '',
        }));
      }
    } catch (error) {
      console.error('Failed to load existing consultation:', error);
    }
  };

  const handleChange = (field: string) => (event: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleCheckboxChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      consultation_types: {
        ...prev.consultation_types,
        [field]: event.target.checked,
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/consultations', {
        patient_id: entry.patient?.patient_id,
        queue_id: entry.queue_id,
        mode_of_transaction: formData.mode_of_transaction,
        referred_from: formData.referred_from || null,
        referred_to: formData.referred_to || null,
        consultation_date: formData.date_of_consultation,
        consultation_time: formData.consultation_time,
        blood_pressure: formData.blood_pressure || null,
        temperature: formData.temperature || null,
        height: formData.height || null,
        weight: formData.weight || null,
        attending_provider: formData.attending_provider || null,
        referred_by: formData.referred_by || null,
        nature_of_visit: formData.nature_of_visit,
        consultation_types: JSON.stringify(formData.consultation_types),
        chief_complaints: formData.chief_complaints || null,
        diagnosis: formData.diagnosis || null,
        medication_treatment: formData.medication_treatment || null,
        laboratory_findings: formData.laboratory_findings || null,
        performed_lab_test: formData.performed_lab_test || null,
        healthcare_provider_name: formData.healthcare_provider_name || null,
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save consultation:', error);
      alert('Failed to save consultation record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, bgcolor: '#f0fdf4', color: '#065f46' }}>
        Form 2 — Individual Treatment
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Patient Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Patient:</strong> {entry.patient?.name} · Queue #{entry.queue_number}
        </Alert>

        {/* ─── SECTION 1: PATIENT INFORMATION ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#065f46' }}>
            I. PATIENT INFORMATION (IMPORMASYON NG PASYENTE)
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Last Name (Apelyido)"
                value={formData.last_name}
                disabled
                sx={{ bgcolor: '#f9fafb' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="First Name (Pangalan)"
                value={formData.first_name}
                disabled
                sx={{ bgcolor: '#f9fafb' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Middle Name (Gitnang Pangalan)"
                value={formData.middle_name}
                disabled
                sx={{ bgcolor: '#f9fafb' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Suffix (e.g. Jr., Sr., II, III)"
                value={formData.suffix}
                disabled
                sx={{ bgcolor: '#f9fafb' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Age (Edad)"
                value={formData.age}
                disabled
                sx={{ bgcolor: '#f9fafb' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Residential Address (Tirahan)"
                value={formData.address}
                disabled
                sx={{ bgcolor: '#f9fafb' }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* ─── SECTION 2: FOR CHU/RHU PERSONNEL ONLY ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#065f46' }}>
            II. FOR CHU / RHU PERSONNEL ONLY (PARA SA KINATAWAN NG CHU / RHU LAMANG)
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                  Mode of Transaction
                </FormLabel>
                <RadioGroup
                  value={formData.mode_of_transaction}
                  onChange={handleChange('mode_of_transaction')}
                >
                  <FormControlLabel value="walk_in" control={<Radio />} label="Walk-in" />
                  <FormControlLabel value="visited" control={<Radio />} label="Visited" />
                  <FormControlLabel value="referral" control={<Radio />} label="Referral" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.mode_of_transaction === 'referral' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: '#6b7280' }}>
                  For REFERRAL Transaction only.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Referred From"
                  value={formData.referred_from}
                  onChange={handleChange('referred_from')}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Referred To"
                  value={formData.referred_to}
                  onChange={handleChange('referred_to')}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date of Consultation"
                value={formData.date_of_consultation}
                onChange={handleChange('date_of_consultation')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Consultation Time (AM/PM)"
                value={formData.consultation_time}
                onChange={handleChange('consultation_time')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Vital Signs */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Blood Pressure"
                placeholder="120/80"
                value={formData.blood_pressure}
                onChange={handleChange('blood_pressure')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Temperature (°C)"
                placeholder="36.5"
                value={formData.temperature}
                onChange={handleChange('temperature')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Height (cm)"
                placeholder="170"
                value={formData.height}
                onChange={handleChange('height')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Weight (kg)"
                placeholder="70"
                value={formData.weight}
                onChange={handleChange('weight')}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Name of Attending Provider"
                value={formData.attending_provider}
                onChange={handleChange('attending_provider')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Referred by"
                value={formData.referred_by}
                onChange={handleChange('referred_by')}
              />
            </Grid>
          </Grid>
        </Box>

        {/* ─── SECTION 3: NATURE OF VISIT ─── */}
        <Box sx={{ mb: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
              Nature of Visit
            </FormLabel>
            <RadioGroup
              value={formData.nature_of_visit}
              onChange={handleChange('nature_of_visit')}
              row
            >
              <FormControlLabel
                value="new_consultation"
                control={<Radio />}
                label="New Consultation/Case"
              />
              <FormControlLabel
                value="new_admission"
                control={<Radio />}
                label="New Admission"
              />
              <FormControlLabel
                value="follow_up"
                control={<Radio />}
                label="Follow-up visit"
              />
            </RadioGroup>
          </FormControl>
        </Box>

        {/* ─── SECTION 4: TYPE OF CONSULTATION ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14, mb: 2, color: '#059669' }}>
            TYPE OF CONSULTATION / PURPOSE OF VISIT
          </Typography>

          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.general}
                      onChange={handleCheckboxChange('general')}
                    />
                  }
                  label="General"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.prenatal}
                      onChange={handleCheckboxChange('prenatal')}
                    />
                  }
                  label="Prenatal"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.dental_care}
                      onChange={handleCheckboxChange('dental_care')}
                    />
                  }
                  label="Dental Care"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.child_care}
                      onChange={handleCheckboxChange('child_care')}
                    />
                  }
                  label="Child Care"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.child_nutrition}
                      onChange={handleCheckboxChange('child_nutrition')}
                    />
                  }
                  label="Child Nutrition"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.injury}
                      onChange={handleCheckboxChange('injury')}
                    />
                  }
                  label="Injury"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.adult_immunization}
                      onChange={handleCheckboxChange('adult_immunization')}
                    />
                  }
                  label="Adult Immunization"
                />
              </FormGroup>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.family_planning}
                      onChange={handleCheckboxChange('family_planning')}
                    />
                  }
                  label="Family Planning"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.postpartum}
                      onChange={handleCheckboxChange('postpartum')}
                    />
                  }
                  label="Postpartum"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.tuberculosis}
                      onChange={handleCheckboxChange('tuberculosis')}
                    />
                  }
                  label="Tuberculosis"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.child_immunization}
                      onChange={handleCheckboxChange('child_immunization')}
                    />
                  }
                  label="Child Immunization"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.sick_children}
                      onChange={handleCheckboxChange('sick_children')}
                    />
                  }
                  label="Sick Children"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.consultation_types.firecracker_injury}
                      onChange={handleCheckboxChange('firecracker_injury')}
                    />
                  }
                  label="Firecracker Injury"
                />
              </FormGroup>
            </Grid>
          </Grid>
        </Box>

        {/* ─── SECTION 5: CLINICAL NOTES ─── */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14, mb: 2, color: '#059669' }}>
            CLINICAL NOTES
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Chief Complaints"
                value={formData.chief_complaints}
                onChange={handleChange('chief_complaints')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Diagnosis"
                value={formData.diagnosis}
                onChange={handleChange('diagnosis')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Medication / Treatment"
                value={formData.medication_treatment}
                onChange={handleChange('medication_treatment')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Name of Health Care Provider"
                value={formData.healthcare_provider_name}
                onChange={handleChange('healthcare_provider_name')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Laboratory Findings / Impression"
                value={formData.laboratory_findings}
                onChange={handleChange('laboratory_findings')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Performed Laboratory Test"
                value={formData.performed_lab_test}
                onChange={handleChange('performed_lab_test')}
              />
            </Grid>
          </Grid>
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
          Save Patient Record
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
