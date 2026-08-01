import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import api from '../../../shared/services/api';

interface VaccinationRecordFormProps {
  open: boolean;
  entry: any; // Queue entry with patient data
  onClose: () => void;
  onSave: () => void;
}

interface VaccinationDose {
  period: string;
  route: 'ID' | 'IM' | '';
  date: string;
  given_by: string;
  signature: string;
}

/**
 * Form 3: Vaccination Record (Tagoloan Treatment Card - Part 2)
 * Used by: Nurse (treatment role)
 * Purpose: Record vaccination doses and schedule
 */
export default function VaccinationRecordForm({
  open,
  entry,
  onClose,
  onSave,
}: VaccinationRecordFormProps) {
  const [loading, setLoading] = useState(false);
  const [doses, setDoses] = useState<VaccinationDose[]>([
    { period: 'Day 0', route: '', date: '', given_by: '', signature: '' },
    { period: 'Day 3', route: '', date: '', given_by: '', signature: '' },
    { period: 'Day 7', route: '', date: '', given_by: '', signature: '' },
    { period: 'Day 28', route: '', date: '', given_by: '', signature: '' },
    { period: 'Booster 1', route: '', date: '', given_by: '', signature: '' },
    { period: 'Booster 2', route: '', date: '', given_by: '', signature: '' },
  ]);

  const [additionalMeds, setAdditionalMeds] = useState({
    erig: false,
    tt: false,
    ats: false,
  });

  const [icdCode, setIcdCode] = useState('');

  useEffect(() => {
    if (open && entry) {
      // Load existing vaccination records if available
      loadVaccinationRecords();
    }
  }, [open, entry]);

  const loadVaccinationRecords = async () => {
    if (!entry?.patient_id) return;

    try {
      const response = await api.get(`/vaccination-records/patient/${entry.patient_id}`);
      const { vaccination_records, tagoloan_card } = response.data;

      // Map period names to dose numbers for lookup
      const periodToDoseNumber: Record<string, number> = {
        'Day 0': 0,
        'Day 3': 3,
        'Day 7': 7,
        'Day 28': 28,
        'Booster 1': 90,
        'Booster 2': 365,
      };

      // Update doses with existing data
      if (vaccination_records && vaccination_records.length > 0) {
        setDoses((prev) =>
          prev.map((dose) => {
            const doseNumber = periodToDoseNumber[dose.period];
            const record = vaccination_records.find((r: any) => r.dose_number === doseNumber);
            if (record) {
              return {
                ...dose,
                route: record.route || '',
                date: record.treatment_date ? record.treatment_date.split('T')[0] : '',
                given_by: record.remarks?.replace('Given by: ', '') || '',
                signature: record.signature || '',
              };
            }
            return dose;
          })
        );
      }

      // Load ICD code
      if (tagoloan_card?.icd10_code) {
        setIcdCode(tagoloan_card.icd10_code);
      }

      // Load additional medications (check for records with medication_given field)
      const meds = vaccination_records.filter((r: any) => r.medication_given);
      setAdditionalMeds({
        erig: meds.some((m: any) => m.medication_given === 'ERIG'),
        tt: meds.some((m: any) => m.medication_given === 'TT'),
        ats: meds.some((m: any) => m.medication_given === 'ATS'),
      });
    } catch (error) {
      console.error('Failed to load vaccination records:', error);
    }
  };

  const handleDoseChange = (index: number, field: keyof VaccinationDose, value: any) => {
    setDoses((prev) =>
      prev.map((dose, i) => (i === index ? { ...dose, [field]: value } : dose))
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/vaccination-records', {
        patient_id: entry.patient_id,
        bite_id: entry.bite_id || null,
        queue_id: entry.queue_id || null,
        doses: doses.map((dose) => ({
          period: dose.period,
          route: dose.route || null,
          date: dose.date || null,
          given_by: dose.given_by || null,
          signature: dose.signature || null,
        })),
        additional_meds: additionalMeds,
        icd_code: icdCode || null,
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save vaccination record:', error);
      alert('Failed to save vaccination record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#1e40af' }}>
        Form 3: Vaccination Record
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Patient Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Patient:</strong> {entry.patient?.name} · Queue #{entry.queue_number}
        </Alert>

        {/* ─── SECTION: Vaccination Record Table ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#1e40af' }}>
            Vaccination Record
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Route</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Given by</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Signature</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doses.map((dose, index) => (
                  <TableRow key={dose.period}>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{dose.period}</TableCell>
                    <TableCell>
                      <RadioGroup
                        row
                        value={dose.route}
                        onChange={(e) =>
                          handleDoseChange(index, 'route', e.target.value as 'ID' | 'IM')
                        }
                      >
                        <FormControlLabel
                          value="ID"
                          control={<Radio size="small" />}
                          label="ID"
                          sx={{ mr: 1 }}
                        />
                        <FormControlLabel
                          value="IM"
                          control={<Radio size="small" />}
                          label="IM"
                        />
                      </RadioGroup>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        value={dose.date}
                        onChange={(e) => handleDoseChange(index, 'date', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={dose.given_by}
                        onChange={(e) => handleDoseChange(index, 'given_by', e.target.value)}
                        placeholder="Name"
                        sx={{ width: 180 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={dose.signature}
                        onChange={(e) => handleDoseChange(index, 'signature', e.target.value)}
                        placeholder="Signature"
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" icon={false} sx={{ mt: 2, fontSize: 12 }}>
            <strong>Route:</strong> ID = Intradermal, IM = Intramuscular
            <br />
            <strong>Note:</strong> Fill only the doses that have been administered. Leave future doses
            blank.
          </Alert>
        </Box>

        {/* ─── SECTION: Additional Medications ─── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#1e40af' }}>
            Additional Medications
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={additionalMeds.erig}
                    onChange={(e) =>
                      setAdditionalMeds((prev) => ({ ...prev, erig: e.target.checked }))
                    }
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>ERIG</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                      Equine Rabies Immunoglobulin
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={additionalMeds.tt}
                    onChange={(e) =>
                      setAdditionalMeds((prev) => ({ ...prev, tt: e.target.checked }))
                    }
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>TT</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                      Tetanus Toxoid
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={additionalMeds.ats}
                    onChange={(e) =>
                      setAdditionalMeds((prev) => ({ ...prev, ats: e.target.checked }))
                    }
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>ATS</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                      Anti-Tetanus Serum
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </Box>

        {/* ─── SECTION: Diagnosis ─── */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15, mb: 2, color: '#1e40af' }}>
            Diagnosis
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="ICD 10 Code"
            value={icdCode}
            onChange={(e) => setIcdCode(e.target.value)}
            placeholder="e.g., W54.0"
            helperText="International Classification of Diseases code for the diagnosis"
          />
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading} startIcon={<CloseIcon />}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
          sx={{ bgcolor: '#1e40af', '&:hover': { bgcolor: '#1e3a8a' } }}
        >
          Save Form 3
        </Button>
      </DialogActions>
    </Dialog>
  );
}
