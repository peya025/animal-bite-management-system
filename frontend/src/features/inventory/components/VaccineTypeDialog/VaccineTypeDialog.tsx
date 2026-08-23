import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Vaccines as VaccineIcon,
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

const COMMON_ROUTES = [
  'Intradermal (ID) / Intramuscular (IM)',
  'Intradermal (ID) Only (0.1 mL 2-site)',
  'Intramuscular (IM) Only (0.5 mL / 1.0 mL)',
  'Local Wound Infiltration',
  'Subcutaneous (SC)',
];

export default function VaccineTypeDialog({
  open,
  preset,
  onClose,
  onSaved,
}: VaccineTypeDialogProps) {
  const isEdit = Boolean(preset && preset.id);

  const [form, setForm] = useState({
    vaccine_name: '',
    category: 'Anti-Rabies Vaccines (ARV)',
    default_shelf_life_months: 24,
    default_open_vial_hours: 6 as number | null,
    administration_route: 'Intradermal (ID) / Intramuscular (IM)',
    dosing_regimen_notes: '',
    storage_temperature_notes: 'Store at +2°C to +8°C. Do not freeze. Protect from light.',
    is_multidose: true,
    doses_per_vial: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preset) {
      setForm({
        vaccine_name: preset.vaccine_name || '',
        category: preset.category || 'Anti-Rabies Vaccines (ARV)',
        default_shelf_life_months: preset.default_shelf_life_months || 24,
        default_open_vial_hours: preset.default_open_vial_hours ?? 6,
        administration_route: preset.administration_route || 'Intradermal (ID) / Intramuscular (IM)',
        dosing_regimen_notes: preset.dosing_regimen_notes || '',
        storage_temperature_notes: preset.storage_temperature_notes || 'Store at +2°C to +8°C. Do not freeze. Protect from light.',
        is_multidose: preset.is_multidose ?? true,
        doses_per_vial: preset.doses_per_vial || 1,
      });
    } else {
      setForm({
        vaccine_name: '',
        category: 'Anti-Rabies Vaccines (ARV)',
        default_shelf_life_months: 24,
        default_open_vial_hours: 6,
        administration_route: 'Intradermal (ID) / Intramuscular (IM)',
        dosing_regimen_notes: '',
        storage_temperature_notes: 'Store at +2°C to +8°C. Do not freeze. Protect from light.',
        is_multidose: true,
        doses_per_vial: 1,
      });
    }
    setErrors({});
  }, [preset, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vaccine_name.trim()) e.vaccine_name = 'Vaccine brand / product name is required';
    if (!form.default_shelf_life_months || form.default_shelf_life_months < 1) {
      e.default_shelf_life_months = 'Shelf-life must be at least 1 month';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let saved: VaccineTypePreset;
      if (isEdit && preset?.id) {
        const res = await updateVaccinePreset(preset.id, form);
        saved = res.preset || { ...form, id: preset.id };
      } else {
        const res = await storeVaccinePreset(form);
        saved = res.preset || form;
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.message || 'Failed to save vaccine profile' });
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
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
      aria-labelledby="vaccine-type-dialog-title"
    >
      {/* ── Dialog Header ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          px: 3,
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VaccineIcon sx={{ color: '#fff', fontSize: 24 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            id="vaccine-type-dialog-title"
            variant="h6"
            sx={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem', lineHeight: 1.25 }}
          >
            {isEdit ? 'Edit Vaccine Type Profile' : 'Register New Vaccine Type Profile'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8125rem', mt: 0.35 }}>
            Define reusable shelf-life, open-vial discard countdowns, and clinical dosing protocols
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.85)', '&:hover': { color: '#fff' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3.5 }}>
        <Stack spacing={3}>
          {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

          {/* 1. Basic Identification */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5, fontSize: '0.9rem' }}>
              1. Vaccine Identification &amp; Classification
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#374151', fontSize: '0.85rem' }}>
                  Vaccine Name / Brand <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Verorab (Purified Rabies Vaccine 0.5ml)"
                  value={form.vaccine_name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, vaccine_name: e.target.value }));
                    setErrors((err) => ({ ...err, vaccine_name: '' }));
                  }}
                  error={!!errors.vaccine_name}
                  helperText={errors.vaccine_name}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#374151', fontSize: '0.85rem' }}>
                  Category <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  sx={{ borderRadius: 2, bgcolor: '#f9fafb' }}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </Grid>
            </Grid>
          </Box>

          {/* 2. Shelf-Life & Open-Vial Rules */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5, fontSize: '0.9rem' }}>
              2. Shelf-Life &amp; Open-Vial Discard Parameters
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#374151', fontSize: '0.85rem' }}>
                  Default Shelf-Life Duration (Months) <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  placeholder="e.g. 24 or 36"
                  value={form.default_shelf_life_months}
                  onChange={(e) => setForm((f) => ({ ...f, default_shelf_life_months: Number(e.target.value) }))}
                  helperText="Auto-added to Manufactured Date when receiving new batches."
                  slotProps={{ htmlInput: { min: 1 } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#374151', fontSize: '0.85rem' }}>
                  Open-Vial Discard Duration (Hours)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  placeholder="e.g. 6 or 8 (leave blank if single-dose)"
                  value={form.default_open_vial_hours ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, default_open_vial_hours: e.target.value ? Number(e.target.value) : null }))}
                  helperText="Countdown starts upon staff marking a vial opened in the clinic."
                  slotProps={{ htmlInput: { min: 1, max: 168 } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* 3. Clinical Regimen & Dosing Details */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5, fontSize: '0.9rem' }}>
              3. Clinical Regimen, Administration &amp; Cold-Chain
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#374151', fontSize: '0.85rem' }}>
                  Administration Route
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Intradermal (ID) / Intramuscular (IM)"
                  value={form.administration_route}
                  onChange={(e) => setForm((f) => ({ ...f, administration_route: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                />
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                  {COMMON_ROUTES.map((r) => (
                    <Typography
                      key={r}
                      onClick={() => setForm((f) => ({ ...f, administration_route: r }))}
                      sx={{
                        fontSize: 10.5,
                        color: form.administration_route === r ? '#0284c7' : '#64748b',
                        fontWeight: form.administration_route === r ? 700 : 500,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      {r.split(' ')[0]}
                    </Typography>
                  ))}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                    Multi-dose Configuration
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={form.is_multidose}
                        onChange={(e) => setForm((f) => ({ ...f, is_multidose: e.target.checked }))}
                      />
                    }
                    label={<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Multi-dose Vial</Typography>}
                  />
                </Box>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Doses / Patient Units Per Vial"
                  value={form.doses_per_vial}
                  onChange={(e) => setForm((f) => ({ ...f, doses_per_vial: Number(e.target.value) }))}
                  slotProps={{ htmlInput: { min: 1 } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#374151', fontSize: '0.85rem' }}>
                  Standard Patient Dosing Schedule &amp; Regimen Protocol
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  placeholder="e.g. Post-Exposure (PEP): 0.1 mL ID (2 sites on Day 0, 3, 7, 28) or 0.5 mL IM (Day 0, 3, 7, 14, 28)."
                  value={form.dosing_regimen_notes}
                  onChange={(e) => setForm((f) => ({ ...f, dosing_regimen_notes: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#374151', fontSize: '0.85rem' }}>
                  Storage Temperature &amp; Cold-Chain Guidelines
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  placeholder="e.g. Store at +2°C to +8°C. Do not freeze. Reconstituted multi-dose vial usable within 6 hours."
                  value={form.storage_temperature_notes}
                  onChange={(e) => setForm((f) => ({ ...f, storage_temperature_notes: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3.5, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !form.vaccine_name.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          sx={{
            bgcolor: '#0284c7',
            '&:hover': { bgcolor: '#0369a1' },
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            px: 3,
          }}
        >
          {saving ? 'Saving Profile…' : isEdit ? 'Update Vaccine Profile' : 'Save Vaccine Profile'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
