import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Vaccines as VaccineIcon,
  LocalHospital as ClinicIcon,
  Check as CheckIcon,
  Numbers as NumbersIcon,
  PostAdd as NewTypeIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  AcUnit as ColdChainIcon,
  Layers as LayersIcon,
  Medication as RegimenIcon,
} from '@mui/icons-material';
import api from '../../../../services/api';
import ConfirmationDialog from '../../../../components/feedback/ConfirmationDialog';
import VaccineTypeDialog from '../VaccineTypeDialog/VaccineTypeDialog';
import { getVaccinePresets } from '../../services/vaccineInventoryService';
import type { InventoryItem, VaccineTypePreset } from '../../types';

interface AddEditInventoryDialogProps {
  open: boolean;
  editItem?: InventoryItem | null;
  initialVaccineType?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Default Fallback Presets ─────────────────────────────────
const DEFAULT_PRESETS: VaccineTypePreset[] = [
  {
    vaccine_name: 'Verorab (Purified Rabies Vaccine 0.5ml)',
    category: 'Anti-Rabies Vaccines (ARV)',
    default_shelf_life_months: 36,
    default_open_vial_hours: 6,
    administration_route: 'Intradermal (ID) / Intramuscular (IM)',
    dosing_regimen_notes: 'PEP: 0.1 mL ID (2 sites on Day 0, 3, 7, 28) or 0.5 mL IM (Day 0, 3, 7, 14, 28).',
    storage_temperature_notes: 'Store at +2°C to +8°C. Do not freeze. Reconstituted multi-dose vial usable within 6 hours.',
    is_multidose: true,
    doses_per_vial: 1,
  },
  {
    vaccine_name: 'Speeda (Purified Vero Cell Rabies Vaccine 0.5ml)',
    category: 'Anti-Rabies Vaccines (ARV)',
    default_shelf_life_months: 24,
    default_open_vial_hours: 6,
    administration_route: 'Intradermal (ID) / Intramuscular (IM)',
    dosing_regimen_notes: 'PEP: Updated Thai Red Cross 2-site ID regimen (0.1 mL at 2 sites on Day 0, 3, 7, 28).',
    storage_temperature_notes: 'Store at +2°C to +8°C. Protect from direct light.',
    is_multidose: true,
    doses_per_vial: 1,
  },
  {
    vaccine_name: 'Rabipur (PCECV Rabies Vaccine 1IU)',
    category: 'Anti-Rabies Vaccines (ARV)',
    default_shelf_life_months: 36,
    default_open_vial_hours: 8,
    administration_route: 'Intramuscular (IM) / Intradermal (ID)',
    dosing_regimen_notes: 'PEP: 1 dose IM in deltoid area on Day 0, 3, 7, 14, 28.',
    storage_temperature_notes: 'Store at +2°C to +8°C. Reconstituted vial discard within 8 hours.',
    is_multidose: true,
    doses_per_vial: 1,
  },
  {
    vaccine_name: 'Equirab (Equine Rabies Immunoglobulin 1000IU)',
    category: 'Rabies Immunoglobulins (RIG)',
    default_shelf_life_months: 24,
    default_open_vial_hours: 6,
    administration_route: 'Local Wound Infiltration',
    dosing_regimen_notes: '40 IU/kg body weight. Infiltrate as much as anatomically feasible around wound sites.',
    storage_temperature_notes: 'Strict cold-chain +2°C to +8°C. Discard un-infiltrated remainder within 6 hours.',
    is_multidose: true,
    doses_per_vial: 1,
  },
  {
    vaccine_name: 'Favirab (Equine Rabies Immunoglobulin 5ml)',
    category: 'Rabies Immunoglobulins (RIG)',
    default_shelf_life_months: 24,
    default_open_vial_hours: 6,
    administration_route: 'Local Wound Infiltration',
    dosing_regimen_notes: '40 IU/kg body weight administered locally around bite wounds on Day 0.',
    storage_temperature_notes: 'Store at +2°C to +8°C. Protect from freezing.',
    is_multidose: true,
    doses_per_vial: 1,
  },
  {
    vaccine_name: 'Tetanus Toxoid (TT 0.5ml)',
    category: 'Tetanus & Toxoids',
    default_shelf_life_months: 36,
    default_open_vial_hours: 6,
    administration_route: 'Intramuscular (IM)',
    dosing_regimen_notes: '0.5 mL IM deep in deltoid. Repeat booster dose as indicated by immunization history.',
    storage_temperature_notes: 'Store at +2°C to +8°C. Shake well before use.',
    is_multidose: true,
    doses_per_vial: 1,
  },
  {
    vaccine_name: 'Anti-Tetanus Serum (ATS 1500 IU)',
    category: 'Tetanus & Toxoids',
    default_shelf_life_months: 24,
    default_open_vial_hours: 4,
    administration_route: 'Intramuscular (IM)',
    dosing_regimen_notes: '1500 IU to 3000 IU IM for high-risk animal bite wounds (Category III).',
    storage_temperature_notes: 'Store at +2°C to +8°C.',
    is_multidose: true,
    doses_per_vial: 1,
  },
];

const COMMON_SUPPLIERS = [
  'DOH Central Supply',
  'Regional Health Office X',
  'Provincial Medical Depot',
  'City Health Office',
  'Direct Procurement / Hospital Pharmacy',
];

const UNIT_OPTIONS = [
  { value: 'vials', label: 'Vials (Multi-dose / Single)' },
  { value: 'ampoules', label: 'Ampoules' },
  { value: 'doses', label: 'Doses' },
  { value: 'boxes', label: 'Boxes' },
];

export default function AddEditInventoryDialog({
  open,
  editItem,
  initialVaccineType,
  onClose,
  onSaved,
}: AddEditInventoryDialogProps) {
  const theme = useTheme();
  const isEdit = Boolean(editItem);

  // Form fields ordered to match table column flow (left-to-right)
  const [form, setForm] = useState({
    clinic_id: 1,
    vaccine_type: '',
    batch_number: '',
    received_from: 'DOH Central Supply',
    quantity: '',
    unit: 'vials',
    manufactured_date: '',
    shelf_life_months: 24,
    open_vial_hours: 6,
    cold_chain_notes: '',
    expiration_date: '',
    remarks: '',
  });

  const [presets, setPresets] = useState<VaccineTypePreset[]>(DEFAULT_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<VaccineTypePreset | null>(null);

  // Unified VaccineTypeDialog state
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Load presets on open
  const fetchPresets = () => {
    getVaccinePresets()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPresets(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (open) {
      fetchPresets();
    }
  }, [open]);

  // Sync form state when dialog opens or editItem changes
  useEffect(() => {
    if (editItem) {
      setForm({
        clinic_id: editItem.clinic_id || 1,
        vaccine_type: editItem.vaccine_type,
        batch_number: editItem.batch_number,
        received_from: editItem.received_from || 'DOH Central Supply',
        quantity: String(editItem.current_quantity),
        unit: 'vials',
        manufactured_date: editItem.manufactured_date ? editItem.manufactured_date.split('T')[0] : '',
        shelf_life_months: editItem.shelf_life_months || 24,
        open_vial_hours: editItem.open_vial_hours || 6,
        cold_chain_notes: editItem.cold_chain_notes || '',
        expiration_date: editItem.expiration_date ? editItem.expiration_date.split('T')[0] : '',
        remarks: '',
      });
      const match = presets.find((p) => p.vaccine_name.toLowerCase() === editItem.vaccine_type.toLowerCase());
      setSelectedPreset(match || null);
    } else {
      const defaultType = initialVaccineType || '';
      setForm({
        clinic_id: 1,
        vaccine_type: defaultType,
        batch_number: '',
        received_from: 'DOH Central Supply',
        quantity: '',
        unit: 'vials',
        manufactured_date: '',
        shelf_life_months: 24,
        open_vial_hours: 6,
        cold_chain_notes: '',
        expiration_date: '',
        remarks: '',
      });
      if (defaultType) {
        const match = presets.find((p) => p.vaccine_name.toLowerCase() === defaultType.toLowerCase());
        setSelectedPreset(match || null);
      } else {
        setSelectedPreset(null);
      }
    }
    setErrors({});
    setShowConfirm(false);
    setShowCancelConfirm(false);
  }, [editItem, open, presets, initialVaccineType]);

  // Handle Vaccine Type selection and apply preset logic
  const handleVaccineTypeSelect = (typeName: string) => {
    const matchedPreset = presets.find((p) => p.vaccine_name === typeName);
    setSelectedPreset(matchedPreset || null);

    const shelfLife = matchedPreset?.default_shelf_life_months ?? 24;
    const openVial = matchedPreset?.default_open_vial_hours ?? 6;
    const coldNotes = matchedPreset?.storage_temperature_notes ?? 'Store at +2°C to +8°C';

    setForm((prev) => {
      let nextExp = prev.expiration_date;
      if (prev.manufactured_date) {
        const mDate = new Date(prev.manufactured_date);
        if (!isNaN(mDate.getTime())) {
          mDate.setMonth(mDate.getMonth() + shelfLife);
          nextExp = mDate.toISOString().split('T')[0];
        }
      }
      return {
        ...prev,
        vaccine_type: typeName,
        shelf_life_months: shelfLife,
        open_vial_hours: openVial,
        cold_chain_notes: coldNotes,
        expiration_date: nextExp,
      };
    });

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.vaccine_type;
      return copy;
    });
  };

  // Auto-calculate Expiration Date when Manufactured Date changes
  const handleManufacturedDateChange = (mDateStr: string) => {
    setForm((prev) => {
      let calcExp = prev.expiration_date;
      if (mDateStr) {
        const mDate = new Date(mDateStr);
        if (!isNaN(mDate.getTime())) {
          const months = prev.shelf_life_months || 24;
          mDate.setMonth(mDate.getMonth() + months);
          calcExp = mDate.toISOString().split('T')[0];
        }
      }
      return {
        ...prev,
        manufactured_date: mDateStr,
        expiration_date: calcExp,
      };
    });
  };

  // Derived Calculations
  const daysUntilExpiry = form.expiration_date
    ? Math.ceil((new Date(form.expiration_date).getTime() - Date.now()) / 86400000)
    : null;

  const expiryBadge = useMemo(() => {
    if (daysUntilExpiry === null) return null;
    if (daysUntilExpiry < 0) {
      return { text: `🔴 Expired (${Math.abs(daysUntilExpiry)}d ago)`, color: '#dc2626', bg: '#fee2e2', status: 'expired' };
    }
    if (daysUntilExpiry <= 30) {
      return { text: `🟠 Expires in ${daysUntilExpiry} days (Soon)`, color: '#d97706', bg: '#fef3c7', status: 'expiring' };
    }
    if (daysUntilExpiry <= 90) {
      return { text: `🟡 ${Math.round(daysUntilExpiry / 30)} months left`, color: '#b45309', bg: '#fffbeb', status: 'active' };
    }
    return { text: `🟢 ${Math.round(daysUntilExpiry / 30)} months (Good)`, color: '#059669', bg: '#ecfdf5', status: 'active' };
  }, [daysUntilExpiry]);

  const derivedBalance = Number(form.quantity) || 0;
  const derivedDispensed = isEdit ? (editItem?.total_dispensed ?? 0) : 0;
  const derivedStatus = derivedBalance === 0 ? 'Depleted' : expiryBadge?.status === 'expired' ? 'Expired' : expiryBadge?.status === 'expiring' ? 'Expiring Soon' : 'Active';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vaccine_type.trim()) e.vaccine_type = 'Select or register a vaccine type';
    if (!form.batch_number.trim()) e.batch_number = 'Batch / Lot number is required';
    if (!isEdit && (!form.quantity || Number(form.quantity) < 1)) {
      e.quantity = 'Initial stock quantity must be at least 1 vial';
    }
    if (!form.expiration_date) {
      e.expiration_date = 'Expiration date is required';
    } else if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
      e.expiration_date = 'Expiration date must be in the future for new stock';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isFormValid = Boolean(
    form.vaccine_type.trim() &&
    form.batch_number.trim() &&
    (isEdit || (form.quantity && Number(form.quantity) >= 1)) &&
    form.expiration_date &&
    (daysUntilExpiry === null || daysUntilExpiry > 0)
  );

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
          cold_chain_notes: form.cold_chain_notes,
          expiration_date: form.expiration_date,
        });
      } else {
        await api.post('/inventory', {
          vaccine_type: form.vaccine_type,
          batch_number: form.batch_number,
          received_from: form.received_from || 'DOH Central Supply',
          quantity: Number(form.quantity),
          manufactured_date: form.manufactured_date || undefined,
          shelf_life_months: form.shelf_life_months,
          open_vial_hours: form.open_vial_hours,
          cold_chain_notes: form.cold_chain_notes,
          expiration_date: form.expiration_date,
          remarks: form.remarks ? `${form.remarks} (${form.unit})` : undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.message || 'Something went wrong while saving to inventory. Please try again.' });
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
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
        aria-labelledby="vaccine-stock-dialog-title"
      >
        {/* ── Gradient Header ── */}
        <Box
          sx={{
            background: isEdit
              ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
              : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
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
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <VaccineIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              id="vaccine-stock-dialog-title"
              variant="h6"
              sx={{ fontWeight: 700, color: '#fff', fontSize: '1.075rem', lineHeight: 1.25, letterSpacing: '-0.2px' }}
            >
              {isEdit ? 'Edit Vaccine Stock Details' : 'Add New Vaccine Stock'}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.8125rem', mt: 0.35, lineHeight: 1.35 }}
            >
              {isEdit
                ? 'Update batch parameters, shelf-life, and storage logs'
                : 'Register and stock a new vaccine batch to clinic inventory'}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close dialog"
            sx={{
              color: 'rgba(255,255,255,0.85)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.18)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: 3.5, pt: 3, pb: 2 }}>
          <Stack spacing={3}>

            {errors.submit && (
              <Alert severity="error" onClose={() => setErrors((e) => ({ ...e, submit: '' }))}>
                {errors.submit}
              </Alert>
            )}

            {/* ── SECTION 1: Vaccine & Facility Information ── */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 16, bgcolor: '#059669', borderRadius: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>
                    1. Vaccine &amp; Facility Information
                  </Typography>
                </Box>
                {/* Facility Context Badge */}
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.4, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1.5 }}>
                  <ClinicIcon sx={{ fontSize: 15, color: '#16a34a' }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#15803d' }}>
                    Facility: Tagoloan ABTC
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2.5}>
                {/* Column 1 in Table: Vaccine Type */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                      Vaccine Type / Brand Profile <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<NewTypeIcon sx={{ fontSize: 15 }} />}
                      onClick={() => setTypeDialogOpen(true)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#059669',
                        p: 0,
                        minWidth: 0,
                        '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                      }}
                    >
                      + Add New Vaccine Type Profile
                    </Button>
                  </Box>

                  <FormControl fullWidth size="small" error={!!errors.vaccine_type}>
                    <Select
                      value={form.vaccine_type}
                      displayEmpty
                      onChange={(e) => handleVaccineTypeSelect(e.target.value)}
                      sx={{ borderRadius: 2, bgcolor: '#f9fafb' }}
                      renderValue={(selected) => {
                        if (!selected) {
                          return <Typography sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>Select defined vaccine profile…</Typography>;
                        }
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <VaccineIcon sx={{ fontSize: 18, color: '#059669' }} />
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
                              {selected}
                            </Typography>
                          </Box>
                        );
                      }}
                    >
                      {presets.map((preset) => (
                        <MenuItem key={preset.vaccine_name} value={preset.vaccine_name}>
                          <Box sx={{ py: 0.25, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{preset.vaccine_name}</Typography>
                              {preset.category && (
                                <Chip label={preset.category} size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#f3f4f6' }} />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
                              ⏱️ Shelf-life: {preset.default_shelf_life_months}m | ⚡ Discard: {preset.default_open_vial_hours ? `${preset.default_open_vial_hours}h` : 'Single-dose'} | 💉 {preset.administration_route || 'ID/IM'}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Affordance Cue */}
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.5 }}>
                    💡 Dosing and expiration rules are pulled from this vaccine's saved profile — manage them under <strong>Vaccine Types</strong>.
                  </Typography>
                  {errors.vaccine_type && (
                    <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.25 }}>
                      {errors.vaccine_type}
                    </Typography>
                  )}
                </Grid>

                {/* Column 2 in Table: Batch No. / FIFO Priority */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: '#374151', fontSize: '0.85rem' }}>
                    Batch / Lot Number <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. VR-2026-089"
                    value={form.batch_number}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setForm((f) => ({ ...f, batch_number: val }));
                      setErrors((err) => {
                        const copy = { ...err };
                        delete copy.batch_number;
                        return copy;
                      });
                    }}
                    error={!!errors.batch_number}
                    helperText={errors.batch_number || 'Earliest expiry is prioritized as FIFO #1 (🟢 USE FIRST).'}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <NumbersIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' },
                      '& input': { fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' },
                    }}
                  />
                </Grid>

                {/* Column 3 in Table: Received From (Source/Supplier) */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: '#374151', fontSize: '0.85rem' }}>
                    Received From (Source / Issuing Depot) <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. DOH Central Supply, Regional Health Office X"
                    value={form.received_from}
                    onChange={(e) => setForm((f) => ({ ...f, received_from: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                  />
                  {/* Quick supplier chips */}
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', alignSelf: 'center', fontSize: 11 }}>
                      Quick Fill:
                    </Typography>
                    {COMMON_SUPPLIERS.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        size="small"
                        clickable
                        onClick={() => setForm((f) => ({ ...f, received_from: s }))}
                        sx={{
                          height: 22,
                          fontSize: 10.5,
                          bgcolor: form.received_from === s ? '#dcfce7' : '#f3f4f6',
                          color: form.received_from === s ? '#166534' : '#4b5563',
                          fontWeight: form.received_from === s ? 700 : 500,
                          border: form.received_from === s ? '1px solid #86efac' : '1px solid #e5e7eb',
                        }}
                      />
                    ))}
                  </Stack>
                </Grid>

                {/* Read-Only Profile Parameters Banner */}
                {selectedPreset && (
                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        p: 1.75,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 2.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                          PULLED PROFILE RULES (READ-ONLY REFERENCE)
                        </Typography>
                        <Chip
                          label={selectedPreset.category || 'Standard'}
                          size="small"
                          sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1' }}
                        />
                      </Box>

                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <CalendarIcon sx={{ fontSize: 16, color: '#0284c7' }} />
                            <Typography sx={{ fontSize: 12, color: '#334155' }}>
                              Shelf-Life: <strong>{selectedPreset.default_shelf_life_months} months</strong>
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <TimeIcon sx={{ fontSize: 16, color: '#d97706' }} />
                            <Typography sx={{ fontSize: 12, color: '#334155' }}>
                              Open-Vial Discard: <strong>{selectedPreset.default_open_vial_hours ? `${selectedPreset.default_open_vial_hours} hours` : 'Single Dose'}</strong>
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <ColdChainIcon sx={{ fontSize: 16, color: '#059669' }} />
                            <Typography sx={{ fontSize: 12, color: '#334155' }}>
                              Cold Chain: <strong>+2°C to +8°C</strong>
                            </Typography>
                          </Box>
                        </Grid>

                        {selectedPreset.dosing_regimen_notes && (
                          <Grid size={{ xs: 12 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 0.5 }}>
                              <RegimenIcon sx={{ fontSize: 15, color: '#64748b', mt: 0.25 }} />
                              <Typography sx={{ fontSize: 11.5, color: '#475569', lineHeight: 1.35 }}>
                                Regimen: <em>{selectedPreset.dosing_regimen_notes}</em>
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>

            <Divider />

            {/* ── SECTION 2: Stock Quantity, Manufacturing & Expiration ── */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75 }}>
                <Box sx={{ width: 6, height: 16, bgcolor: '#059669', borderRadius: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>
                  2. Stock Quantity, Manufacturing &amp; Expiration
                </Typography>
              </Box>

              <Grid container spacing={2.5}>
                {/* Column 4 & 5 in Table: Initial Quantity & Derived Balance */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: '#374151', fontSize: '0.85rem' }}>
                    {isEdit ? 'Current Stock Quantity' : 'Initial Stock Received'}{' '}
                    <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      placeholder="e.g. 100"
                      value={form.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({ ...f, quantity: val }));
                        setErrors((err) => {
                          const copy = { ...err };
                          delete copy.quantity;
                          return copy;
                        });
                      }}
                      error={!!errors.quantity}
                      slotProps={{ htmlInput: { min: 1 } }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' },
                        '& input': { fontWeight: 700, fontSize: '1rem', color: '#111827' },
                      }}
                    />
                    <FormControl size="small" sx={{ width: 140 }}>
                      <Select
                        value={form.unit}
                        onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                        sx={{ borderRadius: 2, bgcolor: '#f9fafb' }}
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <MenuItem key={u.value} value={u.value}>
                            {u.label.split(' ')[0]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Derived Balance Card */}
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        DERIVED BALANCE PREVIEW
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: derivedBalance > 0 ? '#059669' : '#94a3b8' }}>
                        {derivedBalance} {form.unit}
                      </Typography>
                    </Box>
                    <Chip
                      label={`≈ ${derivedBalance * (selectedPreset?.doses_per_vial || 3)} doses`}
                      size="small"
                      sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: 11 }}
                    />
                  </Box>
                  {errors.quantity && (
                    <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.25 }}>
                      {errors.quantity}
                    </Typography>
                  )}
                </Grid>

                {/* Column 6 in Table: Manufacturing Date & Auto-Computed Expiration */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: '#374151', fontSize: '0.85rem' }}>
                    Manufactured Date (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    value={form.manufactured_date}
                    onChange={(e) => handleManufacturedDateChange(e.target.value)}
                    helperText="Used to auto-calculate Expiration Date."
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                  />

                  {/* Expiration Date Field */}
                  <Box sx={{ mt: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                        Expiration Date <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                      </Typography>
                      {expiryBadge && (
                        <Chip
                          label={expiryBadge.text}
                          size="small"
                          sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: expiryBadge.bg, color: expiryBadge.color }}
                        />
                      )}
                    </Box>
                    <TextField
                      fullWidth
                      type="date"
                      size="small"
                      value={form.expiration_date}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({ ...f, expiration_date: val }));
                        setErrors((err) => {
                          const copy = { ...err };
                          delete copy.expiration_date;
                          return copy;
                        });
                      }}
                      error={!!errors.expiration_date}
                      helperText={errors.expiration_date || 'Auto-calculated from profile shelf-life (editable for exceptions).'}
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                    />
                  </Box>
                </Grid>

                {/* Remarks Field */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: '#374151', fontSize: '0.85rem' }}>
                    Remarks &amp; Cold-Chain Verification Notes (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. Received in good cold-chain condition at +4.2°C (Invoice #PO-2026-904)"
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* ── LIVE PREVIEW ROW (Linking Modal Inputs to Inventory Table Output) ── */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f1f5f9',
                border: '1px solid #cbd5e1',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIcon sx={{ fontSize: 18, color: '#059669' }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                    Live Inventory Table Row Preview
                  </Typography>
                </Box>
                <Chip
                  label="Matches Table Columns"
                  size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#e2e8f0', color: '#475569' }}
                />
              </Box>

              {/* Table Row Miniature */}
              <Box
                sx={{
                  bgcolor: '#fff',
                  borderRadius: 2,
                  p: 1.5,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(7, 1fr)' },
                  gap: 1.5,
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                {/* 1. Vaccine Type */}
                <Box>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>VACCINE TYPE</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#0f172a', noWrap: true }}>
                    {form.vaccine_type || '—'}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#64748b' }}>Preview ID: #NEW</Typography>
                </Box>

                {/* 2. Batch + FIFO */}
                <Box>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>BATCH / FIFO</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#1e293b' }}>
                    {form.batch_number || '—'}
                  </Typography>
                  <Chip label="🟢 USE FIRST" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d', mt: 0.25 }} />
                </Box>

                {/* 3. Received From */}
                <Box>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>RECEIVED FROM</Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#334155', fontWeight: 500 }}>
                    {form.received_from || '—'}
                  </Typography>
                </Box>

                {/* 4. Dispensed */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>DISPENSED</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                    {derivedDispensed}
                  </Typography>
                  <Typography sx={{ fontSize: 9.5, color: '#94a3b8' }}>vials</Typography>
                </Box>

                {/* 5. Balance */}
                <Box sx={{ textAlign: 'center', p: 0.75, bgcolor: '#ecfdf5', borderRadius: 1.5, border: '1px solid #86efac' }}>
                  <Typography sx={{ fontSize: 9.5, color: '#047857', fontWeight: 700 }}>BALANCE</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>
                    {derivedBalance}
                  </Typography>
                  <Typography sx={{ fontSize: 9, color: '#64748b' }}>vials</Typography>
                </Box>

                {/* 6. Expiration */}
                <Box>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>EXPIRATION</Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
                    {form.expiration_date || '—'}
                  </Typography>
                  {expiryBadge && (
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: expiryBadge.color }}>
                      {expiryBadge.text.split('(')[0]}
                    </Typography>
                  )}
                </Box>

                {/* 7. Status */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>STATUS</Typography>
                  <Chip
                    label={derivedStatus}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: derivedStatus === 'Active' ? '#ecfdf5' : '#fef3c7',
                      color: derivedStatus === 'Active' ? '#059669' : '#b45309',
                      mt: 0.25,
                    }}
                  />
                </Box>
              </Box>
            </Box>

          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3.5, py: 2, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            Cancel
          </Button>

          <Tooltip
            title={!isFormValid ? 'Please fill in Vaccine Type, Batch Number, Quantity, and valid Expiration Date' : ''}
          >
            <span>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={!isFormValid || saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : isEdit ? <CheckIcon /> : <AddIcon />}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                }}
              >
                {saving ? 'Saving…' : isEdit ? 'Update Vaccine Record' : 'Add to Inventory'}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* ── Sub-Modal: Unified Vaccine Type Profile Dialog ── */}
      {typeDialogOpen && (
        <VaccineTypeDialog
          open={typeDialogOpen}
          onClose={() => setTypeDialogOpen(false)}
          onSaved={(created) => {
            fetchPresets();
            handleVaccineTypeSelect(created.vaccine_name);
            setTypeDialogOpen(false);
          }}
        />
      )}

      {/* Confirmation Dialogs */}
      {showConfirm && (
        <ConfirmationDialog
          variant="confirm"
          colorVariant="success"
          title={isEdit ? 'Update Vaccine Inventory Record?' : 'Add New Vaccine Stock?'}
          message={`Are you sure you want to ${isEdit ? 'update' : 'add'} ${form.vaccine_type || 'this vaccine'} (Batch: ${form.batch_number}) with ${form.quantity} ${form.unit} to clinic inventory?`}
          confirmLabel={isEdit ? 'Yes, Update' : 'Yes, Add Stock'}
          onConfirm={() => {
            setShowConfirm(false);
            handleSubmit();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showCancelConfirm && (
        <ConfirmationDialog
          variant="warning"
          colorVariant="warning"
          title="Discard Unsaved Changes?"
          message="You have unsaved stock details. Are you sure you want to close without saving?"
          confirmLabel="Discard & Close"
          onConfirm={() => {
            setShowCancelConfirm(false);
            onClose();
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </>
  );
}
