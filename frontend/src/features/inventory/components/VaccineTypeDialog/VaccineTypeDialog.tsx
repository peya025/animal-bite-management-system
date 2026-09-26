import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Vaccines as VaccineIcon,
} from '@mui/icons-material';
import { storeVaccinePreset, updateVaccinePreset } from '../../services/vaccineInventoryService';
import type { VaccineTypePreset } from '../../types';

interface VaccineTypeDialogProps {
  open: boolean;
  preset?: VaccineTypePreset | null;
  onClose: () => void;
  onSaved: (savedPreset: VaccineTypePreset) => void;
}

const CATEGORIES = [
  'Anti-Rabies Vaccines (ARV)',
  'Rabies Immunoglobulins (RIG)',
  'Tetanus & Toxoids',
  'Other Biologicals',
];

export default function VaccineTypeDialog({ open, preset, onClose, onSaved }: VaccineTypeDialogProps) {
  const isEdit = Boolean(preset?.id);

  const [form, setForm] = useState({
    vaccine_name: '',
    category: 'Anti-Rabies Vaccines (ARV)',
    is_multidose: false,
    doses_per_vial: 3,
    default_open_vial_hours: 6 as number | null,
    storage_temperature_notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (preset) {
      const isMulti = Boolean(preset.is_multidose);
      setForm({
        vaccine_name: preset.vaccine_name || '',
        category: preset.category || 'Anti-Rabies Vaccines (ARV)',
        is_multidose: isMulti,
        doses_per_vial: isMulti ? Math.max(1, Number(preset.doses_per_vial ?? 3)) : 1,
        default_open_vial_hours: isMulti ? (preset.default_open_vial_hours ?? 6) : null,
        storage_temperature_notes: preset.storage_temperature_notes || '',
      });
    } else {
      setForm({
        vaccine_name: '',
        category: 'Anti-Rabies Vaccines (ARV)',
        is_multidose: false,
        doses_per_vial: 3,
        default_open_vial_hours: 6,
        storage_temperature_notes: '',
      });
    }

    setErrors({});
  }, [preset, open]);

  const handleToggleMultidose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isMulti = e.target.checked;
    setForm((prev) => ({
      ...prev,
      is_multidose: isMulti,
      doses_per_vial: isMulti ? (prev.doses_per_vial > 1 ? prev.doses_per_vial : 3) : 1,
      default_open_vial_hours: isMulti ? (prev.default_open_vial_hours || 6) : null,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.doses_per_vial;
      delete next.default_open_vial_hours;
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.vaccine_name.trim()) {
      next.vaccine_name = 'Vaccine name / brand is required.';
    }

    if (form.is_multidose) {
      if (!form.doses_per_vial || form.doses_per_vial < 1) {
        next.doses_per_vial = 'Enter patients per vial (at least 1).';
      }
      const hours = Number(form.default_open_vial_hours);
      if (!form.default_open_vial_hours || isNaN(hours) || hours < 1 || hours > 8) {
        next.default_open_vial_hours = 'Enter valid hours after opening (1–8 hours).';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      vaccine_name: form.vaccine_name.trim(),
      category: form.category,
      is_multidose: form.is_multidose,
      doses_per_vial: form.is_multidose ? Math.max(1, Number(form.doses_per_vial || 1)) : 1,
      default_open_vial_hours: form.is_multidose ? Number(form.default_open_vial_hours) : null,
      storage_temperature_notes: form.storage_temperature_notes.trim() || null,
      default_shelf_life_months: preset?.default_shelf_life_months ?? 24,
      regimen_units_per_patient: preset?.regimen_units_per_patient ?? 1,
      administration_route: preset?.administration_route ?? 'Intradermal (ID) / Intramuscular (IM)',
      dosing_regimen_notes: preset?.dosing_regimen_notes ?? null,
    };

    try {
      const response = isEdit && preset?.id
        ? await updateVaccinePreset(preset.id, payload)
        : await storeVaccinePreset(payload);

      onSaved(response.preset || { ...preset, ...payload });
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.message || 'Failed to save vaccine type.' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="vaccine-type-dialog-title"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      {/* ── Dialog Header ── */}
      <DialogTitle
        id="vaccine-type-dialog-title"
        sx={{
          px: 3,
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VaccineIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {isEdit ? 'Edit Vaccine Type' : 'Add Vaccine Type'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

          {/* ── Section 1: Vaccine Information ── */}
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5,
              }}
            >
              Vaccine Information
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                  Vaccine Name / Brand
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={form.vaccine_name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, vaccine_name: e.target.value }));
                    setErrors((prev) => ({ ...prev, vaccine_name: '' }));
                  }}
                  placeholder="e.g. Verorab, Speeda"
                  error={!!errors.vaccine_name}
                  helperText={errors.vaccine_name}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                  Category
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
                  >
                    {CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ borderColor: '#f1f5f9' }} />

          {/* ── Section 2: Vial Configuration ── */}
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5,
              }}
            >
              Vial Configuration
            </Typography>

            <Box sx={{ mb: form.is_multidose ? 2 : 0 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_multidose}
                    onChange={handleToggleMultidose}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                      Multi-dose
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                      {form.is_multidose ? 'Vial is shared across multiple patients once opened.' : 'Single-dose: one vial per patient treatment.'}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {form.is_multidose && (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                    Patients per Vial
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={form.doses_per_vial}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, doses_per_vial: Math.max(1, Number(e.target.value)) }));
                      setErrors((prev) => ({ ...prev, doses_per_vial: '' }));
                    }}
                    placeholder="e.g. 3"
                    error={!!errors.doses_per_vial}
                    helperText={errors.doses_per_vial}
                    slotProps={{ htmlInput: { min: 1, max: 50 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                    Valid After Opening
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="e.g. 6"
                    value={form.default_open_vial_hours ?? ''}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        default_open_vial_hours: e.target.value ? Number(e.target.value) : null,
                      }));
                      setErrors((prev) => ({ ...prev, default_open_vial_hours: '' }));
                    }}
                    error={!!errors.default_open_vial_hours}
                    helperText={errors.default_open_vial_hours}
                    slotProps={{
                      htmlInput: { min: 1, max: 8 },
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>hours</Typography>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                  />
                </Grid>
              </Grid>
            )}
          </Box>

          <Divider sx={{ borderColor: '#f1f5f9' }} />

          {/* ── Section 3: Optional Information ── */}
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5,
              }}
            >
              Optional Information
            </Typography>

            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
              Storage / Cold-chain Notes
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={4}
              value={form.storage_temperature_notes}
              onChange={(e) => setForm((prev) => ({ ...prev, storage_temperature_notes: e.target.value }))}
              placeholder="e.g. Store at +2°C to +8°C. Monitored Cold-Chain."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
            />
          </Box>
        </Stack>
      </DialogContent>

      {/* ── Dialog Actions ── */}
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Vaccine'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
