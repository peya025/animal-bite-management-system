import { useEffect, useMemo, useState } from 'react';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Vaccines as VaccineIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,

  Inventory2 as BalanceIcon,
  TrendingDown as DispensedIcon,
  Rule as StatusIcon,
  PostAdd as NewTypeIcon,
  Preview as PreviewIcon,
  AcUnit as ColdChainIcon,
  Medication as RegimenIcon,
  AutoFixHigh as AutoIcon,
} from '@mui/icons-material';
import api from '../../../../services/api';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { formatDate } from '../../../../shared/utils';
import VaccineTypeDialog from '../VaccineTypeDialog/VaccineTypeDialog';
import { getVaccinePresets } from '../../services/vaccineInventoryService';
import type { InventoryItem, VaccineTypePreset } from '../../types';
import {
  addMonthsToDate,
  deriveInventoryStatus,
  describeExpiry,
  formatDateInput,
  getStatusVisual,
} from '../../utils/inventoryStatus';

interface AddEditInventoryDialogProps {
  open: boolean;
  editItem?: InventoryItem | null;
  initialVaccineType?: string;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_SUPPLIERS = [
  'DOH Central Supply',
  'Regional Health Office X',
  'Provincial Medical Depot',
  'City Health Office',
  'Direct Procurement / Hospital Pharmacy',
];

export default function AddEditInventoryDialog({
  open,
  editItem,
  initialVaccineType,
  onClose,
  onSaved,
}: AddEditInventoryDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isEdit = Boolean(editItem);

  const [form, setForm] = useState({
    clinic_id: 1,
    vaccine_type: '',
    batch_number: '',
    received_from: 'DOH Central Supply',
    quantity: '',
    manufactured_date: '',
    expiration_date: '',
    shelf_life_months: 24,
    open_vial_hours: null as number | null,
    cold_chain_notes: '',
    remarks: '',
  });
  const [presets, setPresets] = useState<VaccineTypePreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<VaccineTypePreset | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [expirationMode, setExpirationMode] = useState<'auto' | 'manual'>('auto');
  const [presetLoadError, setPresetLoadError] = useState('');

  const fetchPresets = async () => {
    try {
      const data = await getVaccinePresets();
      setPresets(Array.isArray(data) ? data : []);
      setPresetLoadError('');
    } catch {
      setPresets([]);
      setPresetLoadError('Could not load Vaccine Types. Make sure the backend is running, or add a type from the separate Vaccine Type Setup screen.');
    }
  };

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      void fetchPresets();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      const baseType = editItem?.vaccine_type || initialVaccineType || '';
      const matchedPreset = presets.find((preset) => preset.vaccine_name.toLowerCase() === baseType.toLowerCase()) || null;
      const shelfLife = matchedPreset?.default_shelf_life_months ?? editItem?.shelf_life_months ?? 24;
      const manufacturedDate = formatDateInput(editItem?.manufactured_date) || '';
      const expirationDate = formatDateInput(editItem?.expiration_date) || '';
      const autoExpiration = manufacturedDate ? addMonthsToDate(manufacturedDate, shelfLife) : '';
      const nextMode = manufacturedDate && expirationDate && autoExpiration && autoExpiration !== expirationDate ? 'manual' : 'auto';

      setSelectedPreset(matchedPreset);
      setExpirationMode(nextMode);
      setForm({
        clinic_id: editItem?.clinic_id || 1,
        vaccine_type: baseType,
        batch_number: editItem?.batch_number || '',
        received_from: editItem?.received_from || 'DOH Central Supply',
        quantity: editItem ? String(editItem.current_quantity) : '',
        manufactured_date: manufacturedDate,
        expiration_date: expirationDate,
        shelf_life_months: shelfLife,
        open_vial_hours: matchedPreset?.default_open_vial_hours ?? editItem?.open_vial_hours ?? null,
        cold_chain_notes: matchedPreset?.storage_temperature_notes || editItem?.cold_chain_notes || '',
        remarks: '',
      });
      setErrors({});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [editItem, initialVaccineType, open, presets]);

  const calculatedExpiration = useMemo(() => {
    if (!form.manufactured_date) return '';
    return addMonthsToDate(form.manufactured_date, Number(form.shelf_life_months) || 0);
  }, [form.manufactured_date, form.shelf_life_months]);


  const handleVaccineTypeSelect = (vaccineType: string) => {
    const matchedPreset = presets.find((preset) => preset.vaccine_name === vaccineType) || null;
    setSelectedPreset(matchedPreset);
    setExpirationMode('auto');
    setForm((prev) => {
      const nextShelfLife = matchedPreset?.default_shelf_life_months ?? prev.shelf_life_months;
      return {
        ...prev,
        vaccine_type: vaccineType,
        shelf_life_months: nextShelfLife,
        open_vial_hours: matchedPreset?.default_open_vial_hours ?? null,
        cold_chain_notes: matchedPreset?.storage_temperature_notes ?? prev.cold_chain_notes,
        expiration_date: prev.manufactured_date ? addMonthsToDate(prev.manufactured_date, nextShelfLife) : prev.expiration_date,
      };
    });
    setErrors((prev) => ({ ...prev, vaccine_type: '' }));
  };

  const [todayMs] = useState(() => Date.now());

  const dispensed = isEdit ? Number(editItem?.total_dispensed || 0) : 0;
  const quantity = Number(form.quantity || 0);
  const balance = quantity;
  const expiryDays = form.expiration_date
    ? Math.ceil((new Date(form.expiration_date).getTime() - todayMs) / 86_400_000)
    : null;

  const previewStatus = deriveInventoryStatus({
    current_quantity: balance,
    expiration_date: form.expiration_date,
    open_vial_status: editItem?.open_vial_status,
  });
  const previewStatusVisual = getStatusVisual(previewStatus);

  const regimenUnits = Number(selectedPreset?.regimen_units_per_patient || 0);
  const coverageEstimate = regimenUnits > 0 && quantity > 0 ? quantity / regimenUnits : 0;

  const submitDisabledReason = useMemo(() => {
    if (presets.length === 0) return 'Add a Vaccine Type first in the separate Vaccine Type Setup screen.';
    if (!form.vaccine_type.trim()) return 'Select a vaccine type first.';
    if (!form.batch_number.trim()) return 'Enter the batch / lot number.';
    if (!form.received_from.trim()) return 'Enter who the stock was received from.';
    if (!form.quantity || Number(form.quantity) < 1) {
      return isEdit ? 'Balance must be at least 1.' : 'Initial quantity must be at least 1.';
    }
    if (!form.expiration_date) return 'Provide an expiration date or a manufactured date to auto-calculate it.';
    if (!isEdit && expiryDays !== null && expiryDays <= 0) return 'New stock must have a future expiration date.';
    return '';
  }, [expiryDays, form.batch_number, form.expiration_date, form.quantity, form.received_from, form.vaccine_type, isEdit, presets.length]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.vaccine_type.trim()) next.vaccine_type = 'Select a vaccine type.';
    if (!form.batch_number.trim()) next.batch_number = 'Batch / lot number is required.';
    if (!form.received_from.trim()) next.received_from = 'Received From is required.';
    if (!form.quantity || Number(form.quantity) < 1) next.quantity = isEdit ? 'Balance must be at least 1.' : 'Initial quantity must be at least 1.';
    if (!form.expiration_date) next.expiration_date = 'Expiration date is required.';
    if (!isEdit && expiryDays !== null && expiryDays <= 0) next.expiration_date = 'New stock must have a future expiration date.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/inventory/${editItem!.inventory_id}`, {
          vaccine_type: form.vaccine_type,
          batch_number: form.batch_number,
          received_from: form.received_from,
          manufactured_date: form.manufactured_date || undefined,
          shelf_life_months: form.shelf_life_months,
          open_vial_hours: form.open_vial_hours,
          cold_chain_notes: form.cold_chain_notes || undefined,
          expiration_date: form.expiration_date,
        });
      } else {
        await api.post('/inventory', {
          vaccine_type: form.vaccine_type,
          batch_number: form.batch_number,
          received_from: form.received_from,
          quantity: Number(form.quantity),
          manufactured_date: form.manufactured_date || undefined,
          shelf_life_months: form.shelf_life_months,
          open_vial_hours: form.open_vial_hours,
          cold_chain_notes: form.cold_chain_notes || undefined,
          expiration_date: form.expiration_date,
          remarks: form.remarks.trim() || undefined,
        });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setErrors({ submit: apiError.response?.data?.message || 'Something went wrong while saving inventory.' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        aria-labelledby="vaccine-stock-dialog-title"
        slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            px: 3,
            py: 2.25,
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
              bgcolor: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <VaccineIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="vaccine-stock-dialog-title" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
              {isEdit ? 'Edit stock batch' : 'Add stock batch'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, mt: 0.25 }}>
              Daily-use stock entry form. Vaccine rules stay read-only here so staff always see which setup rule is being applied.
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog" sx={{ color: '#fff' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

            <Alert severity="info" icon={<AutoIcon fontSize="inherit" />} sx={{ border: '1px solid #dbeafe', bgcolor: '#f8fbff' }}>
              The form starts with the same left-to-right concepts used in the inventory table: vaccine type, batch, source, dispensed, balance, expiration, and status.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                    Vaccine Type
                  </Typography>
                  <Tooltip title={isAdmin ? 'Create a new vaccine type in the separate setup form' : 'Admin only: vaccine types are configured separately from stock'}>
                    <span>
                      <Button
                        size="small"
                        startIcon={<NewTypeIcon sx={{ fontSize: 15 }} />}
                        onClick={() => isAdmin && setTypeDialogOpen(true)}
                        disabled={!isAdmin}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, color: '#059669', p: 0, minWidth: 0 }}
                      >
                        Add New Type
                      </Button>
                    </span>
                  </Tooltip>
                </Box>

                <FormControl fullWidth size="small" error={!!errors.vaccine_type || !!presetLoadError}>
                  <InputLabel id="inventory-vaccine-type-label">Vaccine Type</InputLabel>
                  <Select
                    labelId="inventory-vaccine-type-label"
                    value={form.vaccine_type}
                    label="Vaccine Type"
                    onChange={(e) => handleVaccineTypeSelect(e.target.value)}
                    disabled={presets.length === 0}
                    sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
                  >
                    {presets.map((preset) => (
                      <MenuItem key={preset.vaccine_name} value={preset.vaccine_name}>
                        <Box>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{preset.vaccine_name}</Typography>
                          <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                            {preset.default_shelf_life_months} month shelf-life • {preset.default_open_vial_hours ? `${preset.default_open_vial_hours}h discard-by` : 'single-dose'}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography sx={{ fontSize: 11.5, color: errors.vaccine_type || presetLoadError ? '#dc2626' : '#64748b', mt: 0.75 }}>
                  {errors.vaccine_type || presetLoadError || 'Pick a saved vaccine rule so expiry and discard settings are applied consistently.'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 2.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Batch No. / Lot"
                  value={form.batch_number}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, batch_number: e.target.value.toUpperCase() }));
                    setErrors((prev) => ({ ...prev, batch_number: '' }));
                  }}
                  error={!!errors.batch_number}
                  helperText={errors.batch_number || 'Shown in FIFO / FEFO order.'}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' }, '& input': { fontFamily: 'monospace', fontWeight: 700 } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Received From"
                  value={form.received_from}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, received_from: e.target.value }));
                    setErrors((prev) => ({ ...prev, received_from: '' }));
                  }}
                  error={!!errors.received_from}
                  helperText={errors.received_from || 'Use the same wording staff use for the source or depot.'}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                />
              </Grid>

              <Grid size={{ xs: 6, md: 1 }}>
                <Box sx={{ p: 1.25, borderRadius: 2, border: '1px solid #fee2e2', bgcolor: '#fff7f7', minHeight: 86 }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <DispensedIcon sx={{ fontSize: 15, color: '#dc2626' }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#b91c1c' }}>Dispensed</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{dispensed}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#64748b' }}>Read-only</Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, md: 1 }}>
                <Box sx={{ p: 1.25, borderRadius: 2, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4', minHeight: 86 }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <BalanceIcon sx={{ fontSize: 15, color: '#047857' }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#047857' }}>Balance</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{balance || 0}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#64748b' }}>Derived</Typography>
                </Box>
              </Grid>
            </Grid>

            {selectedPreset && (
              <Box sx={{ p: 1.75, border: '1px solid #dbeafe', borderRadius: 2.5, bgcolor: '#f8fbff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8' }}>
                    Applied vaccine rule (read-only reference)
                  </Typography>
                  <Chip label={selectedPreset.category || 'General'} size="small" sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                </Box>
                <Grid container spacing={1.25}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                      <CalendarIcon sx={{ fontSize: 16, color: '#2563eb', mt: 0.15 }} />
                      <Box>
                        <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Shelf-life</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#1f2937', fontWeight: 700 }}>{selectedPreset.default_shelf_life_months} months from Manufactured Date</Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                      <TimeIcon sx={{ fontSize: 16, color: '#c2410c', mt: 0.15 }} />
                      <Box>
                        <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Discard by</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#1f2937', fontWeight: 700 }}>
                          {selectedPreset.default_open_vial_hours ? `${selectedPreset.default_open_vial_hours} hours after opening` : 'Not used for single-dose stock'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                      <RegimenIcon sx={{ fontSize: 16, color: '#047857', mt: 0.15 }} />
                      <Box>
                        <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Units per patient regimen</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#1f2937', fontWeight: 700 }}>
                          {selectedPreset.regimen_units_per_patient || 1}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                      <ColdChainIcon sx={{ fontSize: 16, color: '#0369a1', mt: 0.15 }} />
                      <Box>
                        <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Storage note</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#1f2937' }}>
                          {selectedPreset.storage_temperature_notes || 'No extra storage note saved.'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={isEdit ? 'Balance' : 'Initial Quantity'}
                  value={form.quantity}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, quantity: e.target.value }));
                    setErrors((prev) => ({ ...prev, quantity: '' }));
                  }}
                  error={!!errors.quantity}
                  helperText={errors.quantity || 'Used to compute the read-only Balance value.'}
                  slotProps={{ htmlInput: { min: 1 } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Manufactured Date"
                  value={form.manufactured_date}
                  onChange={(e) => {
                    const manufacturedDate = e.target.value;
                    setExpirationMode('auto');
                    setForm((prev) => ({
                      ...prev,
                      manufactured_date: manufacturedDate,
                      expiration_date: manufacturedDate ? addMonthsToDate(manufacturedDate, Number(prev.shelf_life_months) || 0) : '',
                    }));
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={selectedPreset ? `Auto-adds ${form.shelf_life_months} month(s) from the selected vaccine rule.` : 'Set this to auto-calculate Expiration Date.'}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Expiration Date"
                  value={form.expiration_date}
                  onChange={(e) => {
                    setExpirationMode('manual');
                    setForm((prev) => ({ ...prev, expiration_date: e.target.value }));
                    setErrors((prev) => ({ ...prev, expiration_date: '' }));
                  }}
                  error={!!errors.expiration_date}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={errors.expiration_date || 'Auto-filled by default. You can override it for exceptions.'}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 1.5 }}>
                <Box sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${previewStatusVisual.border}`, bgcolor: previewStatusVisual.bg, minHeight: 86 }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <StatusIcon sx={{ fontSize: 15, color: previewStatusVisual.color }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: previewStatusVisual.color }}>Status</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: previewStatusVisual.color }}>
                    {previewStatus}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#64748b' }}>Derived</Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: -0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {calculatedExpiration && (
                <Chip
                  icon={<CalendarIcon sx={{ fontSize: 16 }} />}
                  label={`${formatDate(calculatedExpiration)} (${describeExpiry(calculatedExpiration).replace('Expires ', '')})`}
                  sx={{ fontWeight: 700, bgcolor: '#ecfdf5', color: '#047857' }}
                />
              )}
              <Chip
                icon={<AutoIcon sx={{ fontSize: 16 }} />}
                label={expirationMode === 'auto' ? 'Auto-calculated expiration is active' : 'Manual expiration override is active'}
                sx={{ fontWeight: 700, bgcolor: expirationMode === 'auto' ? '#eff6ff' : '#fff7ed', color: expirationMode === 'auto' ? '#1d4ed8' : '#c2410c' }}
              />
              {expirationMode === 'manual' && calculatedExpiration && (
                <Button
                  size="small"
                  onClick={() => {
                    setExpirationMode('auto');
                    setForm((prev) => ({ ...prev, expiration_date: calculatedExpiration }));
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Use calculated date
                </Button>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Remarks"
                  value={form.remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Optional receiving note, invoice, or exception"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#334155', mb: 0.75 }}>
                    Coverage estimate
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#1f2937', lineHeight: 1.5 }}>
                    {selectedPreset
                      ? `At ${selectedPreset.regimen_units_per_patient || 1} unit(s) per patient regimen, this batch covers approximately ${coverageEstimate.toFixed(1)} patient regimen(s).`
                      : 'Select a vaccine type to show the saved regimen-unit rule.'}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.5 }}>
                    This is for planning only. Actual automatic deduction should happen later in the patient vaccination / administration flow.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', mb: 1.25 }}>
                Quick source shortcuts
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {COMMON_SUPPLIERS.map((supplier) => (
                  <Chip
                    key={supplier}
                    label={supplier}
                    clickable
                    onClick={() => setForm((prev) => ({ ...prev, received_from: supplier }))}
                    sx={{
                      fontWeight: form.received_from === supplier ? 700 : 500,
                      bgcolor: form.received_from === supplier ? '#dcfce7' : '#f8fafc',
                      color: form.received_from === supplier ? '#166534' : '#475569',
                      border: form.received_from === supplier ? '1px solid #86efac' : '1px solid #e2e8f0',
                    }}
                  />
                ))}
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #dbe3ec' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PreviewIcon sx={{ fontSize: 18, color: '#059669' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                  Live table-row preview
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr 1fr .7fr .7fr 1.2fr .8fr' },
                  gap: 1.25,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>VACCINE TYPE</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{form.vaccine_type || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>BATCH NO. / FIFO</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>{form.batch_number || '—'}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#166534' }}>New active batch joins FIFO order</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>RECEIVED FROM</Typography>
                  <Typography sx={{ fontSize: 12, color: '#334155' }}>{form.received_from || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>DISPENSED</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#dc2626' }}>{dispensed}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>BALANCE</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#059669' }}>{balance || 0}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>EXPIRATION</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{form.expiration_date ? formatDate(form.expiration_date) : '—'}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#64748b' }}>{form.expiration_date ? describeExpiry(form.expiration_date) : 'Pending expiration'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>STATUS</Typography>
                  <Chip
                    label={previewStatus}
                    size="small"
                    sx={{
                      mt: 0.25,
                      fontWeight: 800,
                      bgcolor: previewStatusVisual.bg,
                      color: previewStatusVisual.color,
                      border: `1px solid ${previewStatusVisual.border}`,
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Cancel
          </Button>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            {!!submitDisabledReason && (
              <Typography sx={{ fontSize: 12, color: '#b45309', maxWidth: 420, textAlign: 'right' }}>
                Add to Inventory is disabled: {submitDisabledReason}
              </Typography>
            )}
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!!submitDisabledReason || saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, px: 3, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save batch changes' : 'Add to Inventory'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {typeDialogOpen && (
        <VaccineTypeDialog
          open={typeDialogOpen}
          onClose={() => setTypeDialogOpen(false)}
          onSaved={(created) => {
            const nextPreset = created as VaccineTypePreset;
            setPresets((prev) => {
              const withoutOld = prev.filter((preset) => preset.vaccine_name !== nextPreset.vaccine_name);
              return [...withoutOld, nextPreset].sort((a, b) => a.vaccine_name.localeCompare(b.vaccine_name));
            });
            handleVaccineTypeSelect(nextPreset.vaccine_name);
            setTypeDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
