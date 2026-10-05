import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Vaccines as VaccineIcon,
} from '@mui/icons-material';
import api from '../../../../services/api';
import ButtonSpinner from '../../../../components/common/ButtonSpinner';
import { getVaccinePresets } from '../../services/vaccineInventoryService';
import type { InventoryItem, VaccineTypePreset } from '../../types';
import {
  addMonthsToDate,
  formatDateInput,
} from '../../utils/inventoryStatus';
import { useFormDraft } from '../../../../shared/hooks/useFormDraft';
import DraftStatusBadge from '../../../../shared/components/DraftStatusBadge';

interface AddEditInventoryDialogProps {
  open: boolean;
  editItem?: InventoryItem | null;
  initialVaccineType?: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Official Source of Supply options per DOH/LGU audit standards */
const SOURCE_OF_SUPPLY_OPTIONS = [
  'DOH Central Supply (National Rabies Prevention Program)',
  'PHO - Provincial Health Office',
  'CHO / MHO - City/Municipal Health Office',
  'LGU Local Procurement',
  'Hospital Pharmacy / Direct Purchase',
  'Donation / NGO',
  'Other (Specify)',
] as const;

type SourceOfSupply = (typeof SOURCE_OF_SUPPLY_OPTIONS)[number];
const OTHER_SPECIFY = 'Other (Specify)' satisfies SourceOfSupply;

/** Standard vaccine categories from Vaccine Setup */
export const VACCINE_CATEGORIES = [
  'Anti-Rabies Vaccines (ARV)',
  'Tetanus & Toxoids',
  'Anti-Tetanus Serum (ATS)',
  'Other Biologicals',
] as const;

/**
 * Curated supplier catalog for consistent DOH audit records.
 * Used as Autocomplete suggestions when "Other (Specify)" is selected.
 */
const SUPPLIER_CATALOG = [
  // DOH / National
  'DOH - National Rabies Prevention and Control Program (NRPCP)',
  'DOH Central Office - Vaccine Depot',
  'DOH Region X - Regional Vaccine Depot',
  'DOH Region VII - Vaccine Depot',
  'DOH Region XI - Vaccine Depot',
  // PHO
  'Misamis Oriental Provincial Health Office',
  'Bukidnon Provincial Health Office',
  'Lanao del Norte Provincial Health Office',
  'Davao del Norte Provincial Health Office',
  // CHO / MHO
  'Cagayan de Oro City Health Office',
  'Iligan City Health Office',
  'Davao City Health Office',
  'Cebu City Health Department',
  'Tagoloan Municipal Health Office',
  'Villanueva Municipal Health Office',
  'Jasaan Municipal Health Office',
  // LGU Procurement
  'LGU Cagayan de Oro - Bids and Awards Committee',
  'LGU Tagoloan - Municipal Bids and Awards',
  // Hospital / Pharmacy
  'Northern Mindanao Medical Center (NMMC) Pharmacy',
  'Cagayan de Oro Medical Center (COMC)',
  'Polymedic General Hospital',
  'Metro Tagoloan Community Hospital',
  'Mercury Drug - Direct Account',
  'Rose Pharmacy - Institutional',
  'Generika Pharmacy',
  // NGO / Donations
  'World Health Organization (WHO) - Philippines',
  'UNICEF Philippines',
  'Philippine Red Cross',
  'Gawad Kalinga Health Program',
  'Rotary Club Health Donation',
];

export default function AddEditInventoryDialog({
  open,
  editItem,
  initialVaccineType,
  onClose,
  onSaved,
}: AddEditInventoryDialogProps) {
  const isEdit = Boolean(editItem);

  // Draft only makes sense for new stock entries (edits are already persisted server-side)
  const draftKey = open && !isEdit ? 'new-inventory' : null;
  const draft = useFormDraft(draftKey);

  const [form, setForm] = useState({
    clinic_id: 1,
    vaccine_type: '',
    batch_number: '',
    received_from: 'DOH Central Supply (National Rabies Prevention Program)',
    quantity: '',
    manufactured_date: '',
    expiration_date: '',
    shelf_life_months: 24,
    open_vial_hours: null as number | null,
    doses_per_vial: 1,
    cold_chain_notes: '',
    remarks: '',
  });

  const [sourceOfSupply, setSourceOfSupply] = useState<SourceOfSupply>(
    'DOH Central Supply (National Rabies Prevention Program)'
  );
  const [supplierOther, setSupplierOther] = useState('');
  const [presets, setPresets] = useState<VaccineTypePreset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<VaccineTypePreset | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expirationMode, setExpirationMode] = useState<'auto' | 'manual'>('auto');
  const [presetLoadError, setPresetLoadError] = useState('');

  const categoryOptions = useMemo(() => {
    const list = [...VACCINE_CATEGORIES] as string[];
    presets.forEach((preset) => {
      if (
        preset.category &&
        preset.category !== 'Rabies Immunoglobulins (RIG)' &&
        !list.includes(preset.category)
      ) {
        list.push(preset.category);
      }
    });
    return list;
  }, [presets]);

  const availableVaccines = useMemo(() => {
    if (!selectedCategory) return [];
    return presets.filter(
      (preset) => (preset.category || '').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [presets, selectedCategory]);

  const fetchPresets = async () => {
    try {
      const data = await getVaccinePresets();
      setPresets(Array.isArray(data) ? data : []);
      setPresetLoadError('');
    } catch {
      setPresets([]);
      setPresetLoadError('Could not load Vaccine Types. Make sure the backend is running.');
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
    if (!open) {
      setSelectedCategory('');
      setSelectedPreset(null);
      setErrors({});
      return;
    }

    const timer = window.setTimeout(() => {
      const baseType = editItem?.vaccine_type || initialVaccineType || '';
      const matchedPreset =
        presets.find((preset) => preset.vaccine_name.toLowerCase() === baseType.toLowerCase()) || null;
      const shelfLife = matchedPreset?.default_shelf_life_months ?? editItem?.shelf_life_months ?? 24;
      const manufacturedDate = formatDateInput(editItem?.manufactured_date) || '';
      const expirationDate = formatDateInput(editItem?.expiration_date) || '';
      const autoExpiration = manufacturedDate ? addMonthsToDate(manufacturedDate, shelfLife) : '';
      const nextMode =
        manufacturedDate && expirationDate && autoExpiration && autoExpiration !== expirationDate
          ? 'manual'
          : 'auto';

      const incomingSource =
        editItem?.received_from || 'DOH Central Supply (National Rabies Prevention Program)';
      const matchedSource = SOURCE_OF_SUPPLY_OPTIONS.find(
        (opt) => opt !== OTHER_SPECIFY && opt === incomingSource
      );
      const restoredSource: SourceOfSupply = matchedSource ?? OTHER_SPECIFY;
      const restoredOther = restoredSource === OTHER_SPECIFY ? incomingSource : '';
      const effectiveDpv = matchedPreset?.is_multidose
        ? Math.max(1, Number(matchedPreset.doses_per_vial || 1))
        : (editItem?.doses_per_vial ? Math.max(1, Number(editItem.doses_per_vial)) : 1);

      setSourceOfSupply(restoredSource);
      setSupplierOther(restoredOther);
      setSelectedPreset(matchedPreset);
      if (matchedPreset?.category) {
        setSelectedCategory(matchedPreset.category);
      }
      setExpirationMode(nextMode);
      setForm({
        clinic_id: editItem?.clinic_id || 1,
        vaccine_type: baseType,
        batch_number: editItem?.batch_number || '',
        received_from: incomingSource,
        quantity: editItem ? String(editItem.current_quantity) : '',
        manufactured_date: manufacturedDate,
        expiration_date: expirationDate,
        shelf_life_months: shelfLife,
        open_vial_hours: matchedPreset?.default_open_vial_hours ?? (editItem?.open_vial_hours ?? null),
        doses_per_vial: effectiveDpv,
        cold_chain_notes: matchedPreset?.storage_temperature_notes || editItem?.cold_chain_notes || '',
        remarks: '',
      });
      setErrors({});

      // Restore draft for new entries
      if (!editItem && !initialVaccineType) {
        const savedDraft = draft.readDraft<{
          form: typeof form;
          sourceOfSupply: SourceOfSupply;
          supplierOther: string;
          selectedCategory?: string;
        }>();
        if (savedDraft?.form) {
          setForm(savedDraft.form);
          if (savedDraft.sourceOfSupply) setSourceOfSupply(savedDraft.sourceOfSupply);
          if (savedDraft.supplierOther !== undefined) setSupplierOther(savedDraft.supplierOther);
          if (savedDraft.selectedCategory) {
            setSelectedCategory(savedDraft.selectedCategory);
          } else if (savedDraft.form.vaccine_type) {
            const draftPreset = presets.find(
              (p) => p.vaccine_name.toLowerCase() === savedDraft.form.vaccine_type.toLowerCase()
            );
            if (draftPreset?.category) setSelectedCategory(draftPreset.category);
          }
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [editItem, initialVaccineType, open, presets]);

  // Auto-save draft for new entries
  useEffect(() => {
    if (!open || isEdit) return;
    draft.saveDraft({ form, sourceOfSupply, supplierOther, selectedCategory });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, sourceOfSupply, supplierOther, selectedCategory]);

  const [todayMs] = useState(() => Date.now());
  const expiryDays = form.expiration_date
    ? Math.ceil((new Date(form.expiration_date).getTime() - todayMs) / 86_400_000)
    : null;

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedPreset(null);
    setForm((prev) => ({
      ...prev,
      vaccine_type: '',
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.category;
      delete next.vaccine_type;
      return next;
    });
  };

  const handleBlurField = (field: string) => () => {
    setErrors((prev) => {
      const next = { ...prev };
      switch (field) {
        case 'category':
          if (!selectedCategory.trim()) next.category = 'Vaccine category is required.';
          else delete next.category;
          break;
        case 'vaccine_type':
          if (!form.vaccine_type.trim()) next.vaccine_type = 'Vaccine name / type is required.';
          else delete next.vaccine_type;
          break;
        case 'batch_number':
          if (!form.batch_number.trim()) next.batch_number = 'Batch / lot number is required.';
          else delete next.batch_number;
          break;
        case 'quantity':
          if (!form.quantity || Number(form.quantity) < 1) {
            next.quantity = isEdit ? 'Balance must be at least 1.' : 'Initial quantity must be at least 1.';
          } else {
            delete next.quantity;
          }
          break;
        case 'expiration_date':
          if (!form.expiration_date) {
            next.expiration_date = 'Expiration date is required.';
          } else if (!isEdit && expiryDays !== null && expiryDays <= 0) {
            next.expiration_date = 'New stock must have a future expiration date.';
          } else {
            delete next.expiration_date;
          }
          break;
        case 'supplier_other':
          if (sourceOfSupply === OTHER_SPECIFY && !supplierOther.trim()) {
            next.supplier_other = 'Please specify the supplier name.';
          } else {
            delete next.supplier_other;
          }
          break;
        default:
          break;
      }
      return next;
    });
  };

  const handleVaccineTypeSelect = (vaccineType: string) => {
    const matchedPreset = presets.find((preset) => preset.vaccine_name === vaccineType) || null;
    setSelectedPreset(matchedPreset);
    setExpirationMode('auto');
    setForm((prev) => {
      const nextShelfLife = matchedPreset?.default_shelf_life_months ?? prev.shelf_life_months;
      const nextDpv = matchedPreset?.is_multidose
        ? Math.max(1, Number(matchedPreset.doses_per_vial || 1))
        : 1;
      return {
        ...prev,
        vaccine_type: vaccineType,
        shelf_life_months: nextShelfLife,
        open_vial_hours: matchedPreset?.default_open_vial_hours ?? null,
        doses_per_vial: nextDpv,
        cold_chain_notes: matchedPreset?.storage_temperature_notes ?? prev.cold_chain_notes,
        expiration_date: prev.manufactured_date
          ? addMonthsToDate(prev.manufactured_date, nextShelfLife)
          : prev.expiration_date,
      };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.vaccine_type;
      return next;
    });
  };

  const isSubmitDisabled = useMemo(() => {
    if (presets.length === 0) return true;
    if (!selectedCategory.trim()) return true;
    if (!form.vaccine_type.trim()) return true;
    if (!form.batch_number.trim()) return true;
    if (!form.received_from.trim()) return true;
    if (sourceOfSupply === OTHER_SPECIFY && !supplierOther.trim()) return true;
    if (!form.quantity || Number(form.quantity) < 1) return true;
    if (!form.expiration_date) return true;
    if (!isEdit && expiryDays !== null && expiryDays <= 0) return true;
    return false;
  }, [
    expiryDays,
    form.batch_number,
    form.expiration_date,
    form.quantity,
    form.received_from,
    form.vaccine_type,
    isEdit,
    presets.length,
    selectedCategory,
    sourceOfSupply,
    supplierOther,
  ]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!selectedCategory.trim()) next.category = 'Vaccine category is required.';
    if (!form.vaccine_type.trim()) next.vaccine_type = 'Vaccine name / type is required.';
    if (!form.batch_number.trim()) next.batch_number = 'Batch / lot number is required.';
    if (!form.received_from.trim()) next.received_from = 'Source / Supplier is required.';
    if (sourceOfSupply === OTHER_SPECIFY && !supplierOther.trim()) {
      next.supplier_other = 'Please specify the supplier name.';
    }
    if (!form.quantity || Number(form.quantity) < 1) {
      next.quantity = isEdit ? 'Balance must be at least 1.' : 'Initial quantity must be at least 1.';
    }
    if (!form.expiration_date) {
      next.expiration_date = 'Expiration date is required.';
    } else if (!isEdit && expiryDays !== null && expiryDays <= 0) {
      next.expiration_date = 'New stock must have a future expiration date.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (saving) return;
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
          doses_per_vial: form.doses_per_vial,
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
          doses_per_vial: form.doses_per_vial,
          cold_chain_notes: form.cold_chain_notes || undefined,
          expiration_date: form.expiration_date,
          remarks: form.remarks.trim() || undefined,
        });
      }

      onSaved();
      draft.clearDraft();
      onClose();
    } catch (err: unknown) {
      const apiError = err as {
        response?: {
          data?: {
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
      };
      const backendErrors = apiError.response?.data?.errors;
      if (backendErrors && typeof backendErrors === 'object') {
        const next: Record<string, string> = {};
        Object.entries(backendErrors).forEach(([field, msgs]) => {
          next[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        });
        if (apiError.response?.data?.message) {
          next.submit = apiError.response.data.message;
        }
        setErrors(next);
      } else {
        setErrors({ submit: apiError.response?.data?.message || 'Something went wrong while saving inventory.' });
      }
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
      aria-labelledby="vaccine-stock-dialog-title"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      {/* Header */}
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
          <Typography id="vaccine-stock-dialog-title" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.15rem' }}>
            {isEdit ? 'Edit Stock Batch' : 'Add Stock Batch'}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, mt: 0.25 }}>
            {isEdit ? 'Update this vaccine batch in inventory.' : 'Add a new vaccine batch to inventory.'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog" sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 3 }}>
        <Stack spacing={2.5}>
          {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

          <Grid container spacing={2.5}>
            {/* Row 1: Vaccine Category * & Vaccine Name / Type * */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small" error={!!errors.category}>
                <InputLabel id="inventory-vaccine-category-label" shrink>
                  Vaccine Category *
                </InputLabel>
                <Select
                  labelId="inventory-vaccine-category-label"
                  value={selectedCategory}
                  label="Vaccine Category *"
                  notched
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  onBlur={handleBlurField('category')}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) {
                      return <span style={{ color: '#94a3b8' }}>Select vaccine category</span>;
                    }
                    return selected;
                  }}
                  sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
                >
                  {categoryOptions.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && <FormHelperText error>{errors.category}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small" error={!!errors.vaccine_type || !!presetLoadError}>
                <InputLabel id="inventory-vaccine-type-label" shrink>
                  Vaccine Name / Type *
                </InputLabel>
                <Select
                  labelId="inventory-vaccine-type-label"
                  value={form.vaccine_type}
                  label="Vaccine Name / Type *"
                  notched
                  onChange={(e) => handleVaccineTypeSelect(e.target.value)}
                  onBlur={handleBlurField('vaccine_type')}
                  disabled={!selectedCategory || availableVaccines.length === 0 || presets.length === 0}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) {
                      if (!selectedCategory) {
                        return <span style={{ color: '#94a3b8' }}>Select vaccine category first</span>;
                      }
                      if (availableVaccines.length === 0) {
                        return <span style={{ color: '#94a3b8' }}>No vaccines available for this category.</span>;
                      }
                      return <span style={{ color: '#94a3b8' }}>Select vaccine name / type</span>;
                    }
                    return selected;
                  }}
                  sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
                >
                  {availableVaccines.map((preset) => (
                    <MenuItem key={preset.vaccine_name} value={preset.vaccine_name}>
                      {preset.vaccine_name}
                    </MenuItem>
                  ))}
                </Select>
                {Boolean(errors.vaccine_type || presetLoadError || (selectedCategory && availableVaccines.length === 0)) && (
                  <FormHelperText error={Boolean(errors.vaccine_type || presetLoadError || (selectedCategory && availableVaccines.length === 0))}>
                    {errors.vaccine_type ||
                      presetLoadError ||
                      (selectedCategory && availableVaccines.length === 0 ? 'No vaccines available for this category.' : '')}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Row 2: Batch / Lot No. * & Initial Quantity * */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Batch / Lot No. *"
                value={form.batch_number}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, batch_number: e.target.value.toUpperCase() }));
                  setErrors((prev) => ({ ...prev, batch_number: '' }));
                }}
                onBlur={handleBlurField('batch_number')}
                error={!!errors.batch_number}
                helperText={errors.batch_number}
                placeholder="e.g. BATCH-2026-001"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' },
                  '& input': { fontFamily: 'monospace', fontWeight: 700 },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={isEdit ? 'Balance (vials) *' : 'Initial Quantity (vials) *'}
                value={form.quantity}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, quantity: e.target.value }));
                  setErrors((prev) => ({ ...prev, quantity: '' }));
                }}
                onBlur={handleBlurField('quantity')}
                error={!!errors.quantity}
                helperText={errors.quantity}
                placeholder="e.g. 100"
                slotProps={{
                  htmlInput: { min: 1, step: 1 },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            {/* Row 3: Source / Supplier * & Manufactured Date */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small" error={!!errors.received_from}>
                <InputLabel id="source-of-supply-label">Source / Supplier *</InputLabel>
                <Select
                  labelId="source-of-supply-label"
                  label="Source / Supplier *"
                  value={sourceOfSupply}
                  onChange={(e) => {
                    const val = e.target.value as SourceOfSupply;
                    setSourceOfSupply(val);
                    setSupplierOther('');
                    setErrors((prev) => ({ ...prev, received_from: '', supplier_other: '' }));
                    if (val !== OTHER_SPECIFY) {
                      setForm((prev) => ({ ...prev, received_from: val }));
                    } else {
                      setForm((prev) => ({ ...prev, received_from: '' }));
                    }
                  }}
                  sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
                >
                  {SOURCE_OF_SUPPLY_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
                {errors.received_from && <FormHelperText error>{errors.received_from}</FormHelperText>}
              </FormControl>

              {/* Autocomplete for "Other (Specify)" */}
              {sourceOfSupply === OTHER_SPECIFY && (
                <Box sx={{ mt: 1.5 }}>
                  <Autocomplete
                    freeSolo
                    options={SUPPLIER_CATALOG}
                    value={supplierOther}
                    onInputChange={(_e, val) => {
                      setSupplierOther(val);
                      setForm((prev) => ({ ...prev, received_from: val }));
                      setErrors((prev) => ({ ...prev, supplier_other: '' }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Specify Supplier *"
                        placeholder="Type or select from catalog…"
                        error={!!errors.supplier_other}
                        onBlur={handleBlurField('supplier_other')}
                        helperText={errors.supplier_other || 'Select from catalog or enter supplier name'}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fffbeb' } }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option}>
                        <Typography sx={{ fontSize: 13 }}>{option}</Typography>
                      </li>
                    )}
                    slotProps={{ listbox: { style: { maxHeight: 220 } } }}
                  />
                </Box>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
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
                    expiration_date: manufacturedDate
                      ? addMonthsToDate(manufacturedDate, Number(prev.shelf_life_months) || 0)
                      : prev.expiration_date,
                  }));
                  if (errors.expiration_date) {
                    setErrors((prev) => ({ ...prev, expiration_date: '' }));
                  }
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Optional. Auto-calculates expiration date when set."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            {/* Row 4: Expiration Date * & Vaccine Specifications Preview */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Expiration Date *"
                value={form.expiration_date}
                onChange={(e) => {
                  setExpirationMode('manual');
                  setForm((prev) => ({ ...prev, expiration_date: e.target.value }));
                  setErrors((prev) => ({ ...prev, expiration_date: '' }));
                }}
                onBlur={handleBlurField('expiration_date')}
                error={!!errors.expiration_date}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={
                  errors.expiration_date ||
                  (expirationMode === 'auto' && form.manufactured_date
                    ? 'Auto-calculated from vaccine setup. You may edit this date if necessary.'
                    : 'Required. Must be a future date.')
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: selectedPreset ? '#cbd5e1' : '#e2e8f0',
                  bgcolor: selectedPreset ? '#f8fafc' : '#f8fafc',
                  minHeight: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                {selectedPreset ? (
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                        Specifications
                      </Typography>
                      <Chip
                        size="small"
                        label={selectedPreset.is_multidose ? `Multi-dose (${selectedPreset.doses_per_vial || 1} doses)` : 'Single-dose'}
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          height: 20,
                          bgcolor: selectedPreset.is_multidose ? '#eff6ff' : '#f1f5f9',
                          color: selectedPreset.is_multidose ? '#1d4ed8' : '#475569',
                          border: '1px solid',
                          borderColor: selectedPreset.is_multidose ? '#bfdbfe' : '#e2e8f0',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                      <Typography sx={{ fontSize: 12, color: '#334155' }}>
                        Shelf Life: <strong>{selectedPreset.default_shelf_life_months || form.shelf_life_months || 24} mos</strong>
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#334155' }}>
                        Discard: <strong>{selectedPreset.default_open_vial_hours ? `${selectedPreset.default_open_vial_hours} hrs` : 'Immediate'}</strong>
                      </Typography>
                    </Box>
                    {selectedPreset.storage_temperature_notes && (
                      <Typography sx={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ❄️ {selectedPreset.storage_temperature_notes}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                      Vaccine specs (shelf life, doses/vial) will show here once selected.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Row 5: Remarks */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Remarks"
                value={form.remarks}
                onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Optional notes about this batch (e.g. invoice no., delivery receipt)"
                multiline
                rows={2}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Cancel
          </Button>
          {!isEdit && <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} />}
        </Box>

        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitDisabled || saving}
          startIcon={saving ? <ButtonSpinner size={16} /> : <AddIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2,
            px: 3,
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
          }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save batch changes' : 'Add to Inventory'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
