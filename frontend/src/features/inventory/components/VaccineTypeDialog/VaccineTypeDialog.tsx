import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SetupIcon,
  Vaccines as VaccineIcon,
  AccessTime as TimeIcon,
  CalendarMonth as CalendarIcon,
  Inventory2 as RegimenIcon,
  AcUnit as ColdChainIcon,
  Save as SaveIcon,
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
    default_shelf_life_months: 24,
    is_multidose: true,
    default_open_vial_hours: 6 as number | null,
    doses_per_vial: 3,
    regimen_units_per_patient: 1,
    dosing_regimen_notes: '',
    storage_temperature_notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (preset) {
      setForm({
        vaccine_name: preset.vaccine_name || '',
        category: preset.category || 'Anti-Rabies Vaccines (ARV)',
        default_shelf_life_months: preset.default_shelf_life_months || 24,
        is_multidose: preset.is_multidose ?? true,
        default_open_vial_hours: preset.is_multidose === false ? null : (preset.default_open_vial_hours ?? 6),
        doses_per_vial: Math.max(1, Number(preset.doses_per_vial ?? (preset.is_multidose ? 3 : 1))),
        regimen_units_per_patient: Number(preset.regimen_units_per_patient ?? 1),
        dosing_regimen_notes: preset.dosing_regimen_notes || '',
        storage_temperature_notes: preset.storage_temperature_notes || '',
      });
    } else {
      setForm({
        vaccine_name: '',
        category: 'Anti-Rabies Vaccines (ARV)',
        default_shelf_life_months: 24,
        is_multidose: true,
        default_open_vial_hours: 6,
        doses_per_vial: 3,
        regimen_units_per_patient: 1,
        dosing_regimen_notes: '',
        storage_temperature_notes: '',
      });
    }

    setErrors({});
  }, [preset, open]);

  const regimenCoverageText = useMemo(() => {
    const units = Number(form.regimen_units_per_patient || 0);
    if (!units || units <= 0) return 'Enter a regimen coverage value.';
    return `1 patient regimen uses ${units} stock unit${units === 1 ? '' : 's'}. This will be used later for coverage estimates, not auto-deduction on this screen.`;
  }, [form.regimen_units_per_patient]);

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.vaccine_name.trim()) {
      next.vaccine_name = 'Vaccine name / brand is required.';
    }
    if (!form.default_shelf_life_months || form.default_shelf_life_months < 1) {
      next.default_shelf_life_months = 'Shelf-life must be at least 1 month.';
    }
    if (form.is_multidose && (!form.default_open_vial_hours || form.default_open_vial_hours < 1)) {
      next.default_open_vial_hours = 'Enter the discard-by duration for an opened vial.';
    }
    if (form.is_multidose && (!form.doses_per_vial || form.doses_per_vial < 1)) {
      next.doses_per_vial = 'Enter how many persons/doses can share 1 vial (at least 1).';
    }
    if (!form.regimen_units_per_patient || form.regimen_units_per_patient < 0.1) {
      next.regimen_units_per_patient = 'Enter how many stock units are needed per patient regimen.';
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
      default_shelf_life_months: Number(form.default_shelf_life_months),
      is_multidose: form.is_multidose,
      default_open_vial_hours: form.is_multidose ? Number(form.default_open_vial_hours) : null,
      doses_per_vial: form.is_multidose ? Number(form.doses_per_vial || 1) : 1,
      regimen_units_per_patient: Number(form.regimen_units_per_patient),
      dosing_regimen_notes: form.dosing_regimen_notes.trim() || null,
      storage_temperature_notes: form.storage_temperature_notes.trim() || null,
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
      maxWidth="md"
      fullWidth
      aria-labelledby="vaccine-type-dialog-title"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.25,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <SetupIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id="vaccine-type-dialog-title" sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
            {isEdit ? 'Edit vaccine type rule' : 'Add vaccine type rule'}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, mt: 0.25 }}>
            Setup-only form used by both the Vaccine Type Setup screen and the “Add New Type” shortcut inside Add Stock.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

          <Alert severity="info" icon={<VaccineIcon fontSize="inherit" />}>
            Use real clinic language here: shelf-life for batch expiry, discard-by for opened vials, and units per patient regimen for coverage planning.
          </Alert>

          <Grid container spacing={2.25}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Vaccine name / brand
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={form.vaccine_name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, vaccine_name: e.target.value }));
                  setErrors((prev) => ({ ...prev, vaccine_name: '' }));
                }}
                placeholder="e.g. Verorab 0.5 mL"
                error={!!errors.vaccine_name}
                helperText={errors.vaccine_name || 'Shown in the Add Stock dropdown and inventory table.'}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Catalog tag
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

            <Grid size={{ xs: 12, md: 4 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Manufactured Date shelf-life
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={form.default_shelf_life_months}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, default_shelf_life_months: Number(e.target.value) }));
                  setErrors((prev) => ({ ...prev, default_shelf_life_months: '' }));
                }}
                error={!!errors.default_shelf_life_months}
                helperText={errors.default_shelf_life_months || 'Months added to Manufactured Date.'}
                slotProps={{ htmlInput: { min: 1 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                  Open-vial discard timer
                </Typography>
                <FormControlLabel
                  sx={{ mr: 0 }}
                  control={
                    <Switch
                      size="small"
                      checked={form.is_multidose}
                      onChange={(e) => {
                        const isMultidose = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          is_multidose: isMultidose,
                          default_open_vial_hours: isMultidose ? (prev.default_open_vial_hours || 6) : null,
                          doses_per_vial: isMultidose ? (prev.doses_per_vial > 1 ? prev.doses_per_vial : 3) : 1,
                        }));
                      }}
                    />
                  }
                  label={<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Multi-dose</Typography>}
                />
              </Box>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={form.default_open_vial_hours ?? ''}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    default_open_vial_hours: e.target.value ? Number(e.target.value) : null,
                  }));
                  setErrors((prev) => ({ ...prev, default_open_vial_hours: '' }));
                }}
                disabled={!form.is_multidose}
                error={!!errors.default_open_vial_hours}
                helperText={
                  !form.is_multidose
                    ? 'Single-dose: discard-by timer is not used.'
                    : errors.default_open_vial_hours || 'Hours valid after first reconstitution.'
                }
                slotProps={{ htmlInput: { min: 1, max: 168 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Persons / Doses per Vial
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
                disabled={!form.is_multidose}
                error={!!errors.doses_per_vial}
                helperText={
                  !form.is_multidose
                    ? '1 person per single-use vial.'
                    : errors.doses_per_vial || 'e.g. 3 persons/vial (automated 0-deduction for 2nd & 3rd patient).'
                }
                slotProps={{ htmlInput: { min: 1, max: 20 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Units per patient regimen
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={form.regimen_units_per_patient}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, regimen_units_per_patient: Number(e.target.value) }));
                  setErrors((prev) => ({ ...prev, regimen_units_per_patient: '' }));
                }}
                error={!!errors.regimen_units_per_patient}
                helperText={errors.regimen_units_per_patient || regimenCoverageText}
                slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Dosing / regimen notes
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={3}
                value={form.dosing_regimen_notes}
                onChange={(e) => setForm((prev) => ({ ...prev, dosing_regimen_notes: e.target.value }))}
                placeholder="Optional reference for staff, e.g. common dosing schedule or clinic reminder."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Storage / cold-chain notes
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={3}
                value={form.storage_temperature_notes}
                onChange={(e) => setForm((prev) => ({ ...prev, storage_temperature_notes: e.target.value }))}
                placeholder="Optional, e.g. Store at +2°C to +8°C. Do not freeze."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>
          </Grid>

          <Box sx={{ p: 2, border: '1px solid #dbeafe', borderRadius: 2.5, bgcolor: '#f8fbff' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', mb: 1 }}>
              Saved rule summary
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip icon={<CalendarIcon sx={{ fontSize: 16 }} />} label={`${form.default_shelf_life_months || 0} month shelf-life`} sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
              <Chip icon={<TimeIcon sx={{ fontSize: 16 }} />} label={form.is_multidose ? `${form.default_open_vial_hours || 0}h discard-by after opening` : 'Single-dose, no open-vial timer'} sx={{ fontWeight: 700, bgcolor: '#fff7ed', color: '#c2410c' }} />
              <Chip icon={<RegimenIcon sx={{ fontSize: 16 }} />} label={`${form.regimen_units_per_patient || 0} units per patient regimen`} sx={{ fontWeight: 700, bgcolor: '#ecfdf5', color: '#047857' }} />
              {!!form.storage_temperature_notes && <Chip icon={<ColdChainIcon sx={{ fontSize: 16 }} />} label="Cold-chain note saved" sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }} />}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={<SaveIcon />}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save rule changes' : 'Save vaccine type'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
