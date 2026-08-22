import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
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
  alpha,
  useTheme,
  ListSubheader,
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Vaccines as VaccineIcon,
  LocalHospital as ClinicIcon,
  Check as CheckIcon,
  Numbers as NumbersIcon,
  PostAdd as NewTypeIcon,
} from '@mui/icons-material';
import api from '../../../../services/api';
import ConfirmationDialog from '../../../../components/feedback/ConfirmationDialog';
import { DEMO_CLINICS } from '../../data/inventoryDemoData';

interface InventoryItem {
  inventory_id: number;
  clinic_id?: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
}

interface AddEditInventoryDialogProps {
  open: boolean;
  editItem: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

// Standard ABTC Vaccine Groups
const STANDARD_VACCINE_GROUPS = [
  {
    category: 'Anti-Rabies Vaccines (ARV)',
    icon: '💉',
    items: [
      'Verorab (Purified Rabies Vaccine 0.5ml)',
      'Rabipur (PCECV Rabies Vaccine 1IU)',
      'Speeda (Purified Vero Cell Rabies Vaccine 0.5ml)',
      'Rabivax-S (Purified Rabies Vaccine 0.5ml)',
      'Abhayrab (Purified Rabies Vaccine 0.5ml)',
      'Anti-Rabies Vaccine (ARV) — Generic',
    ],
  },
  {
    category: 'Rabies Immunoglobulins (RIG)',
    icon: '🛡️',
    items: [
      'Equirab (Equine Rabies Immunoglobulin 1000IU)',
      'Favirab (Equine Rabies Immunoglobulin 5ml)',
      'Berirab (Human Rabies Immunoglobulin — HRIG)',
      'Rabies Immunoglobulin (RIG) — Generic',
    ],
  },
  {
    category: 'Tetanus & Toxoids',
    icon: '🩹',
    items: [
      'Tetanus Toxoid (TT 0.5ml)',
      'Anti-Tetanus Serum (ATS 1500 IU)',
      'Tetanus & Diphtheria (Td)',
    ],
  },
];

export default function AddEditInventoryDialog({
  open,
  editItem,
  onClose,
  onSaved,
}: AddEditInventoryDialogProps) {
  const isEdit = !!editItem;
  const theme = useTheme();

  const [form, setForm] = useState({
    clinic_id: 1,
    vaccine_type: '',
    batch_number: '',
    quantity: '',
    unit: 'vials',
    expiration_date: '',
    remarks: '',
  });

  // Custom vaccine type creation state
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [customVaccineTypes, setCustomVaccineTypes] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch registered vaccine types from backend to ensure all existing names are available
  useEffect(() => {
    if (open) {
      api.get('/inventory/vaccine-names')
        .then((res) => {
          const names: string[] = res.data?.vaccine_names || [];
          // Filter out standard ones to find newly added custom ones
          const standardFlat = STANDARD_VACCINE_GROUPS.flatMap((g) => g.items);
          const custom = names.filter((n) => !standardFlat.includes(n));
          if (custom.length > 0) {
            setCustomVaccineTypes((prev) => Array.from(new Set([...prev, ...custom])));
          }
        })
        .catch(() => {
          // ignore error
        });
    }
  }, [open]);

  useEffect(() => {
    if (editItem) {
      setForm({
        clinic_id: editItem.clinic_id || 1,
        vaccine_type: editItem.vaccine_type,
        batch_number: editItem.batch_number,
        quantity: String(editItem.current_quantity),
        unit: 'vials',
        expiration_date: editItem.expiration_date?.split('T')[0] ?? '',
        remarks: '',
      });
      setIsAddingNewType(false);
      setNewTypeName('');
    } else {
      setForm({
        clinic_id: 1,
        vaccine_type: '',
        batch_number: '',
        quantity: '',
        unit: 'vials',
        expiration_date: '',
        remarks: '',
      });
      setIsAddingNewType(false);
      setNewTypeName('');
    }
    setErrors({});
  }, [editItem, open]);

  // Handle adding a new vaccine type on the fly
  const handleAddNewType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, new_type: 'Please enter a vaccine type name' }));
      return;
    }

    // Add to custom list if not exists
    if (!customVaccineTypes.includes(trimmed)) {
      setCustomVaccineTypes((prev) => [...prev, trimmed]);
    }

    // Select the new vaccine type in the form
    setForm((prev) => ({ ...prev, vaccine_type: trimmed }));
    setIsAddingNewType(false);
    setNewTypeName('');
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.vaccine_type;
      delete copy.new_type;
      return copy;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vaccine_type.trim()) e.vaccine_type = 'Please select or enter a vaccine type';
    if (!form.batch_number.trim()) e.batch_number = 'Vaccine / Batch number is required';
    if (!isEdit && (!form.quantity || Number(form.quantity) < 1))
      e.quantity = 'Enter a valid stock quantity (at least 1)';
    if (!form.expiration_date) e.expiration_date = 'Expiration date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/inventory/${editItem!.inventory_id}`, {
          vaccine_type: form.vaccine_type,
          batch_number: form.batch_number,
          expiration_date: form.expiration_date,
        });
      } else {
        await api.post('/inventory', {
          vaccine_type: form.vaccine_type,
          batch_number: form.batch_number,
          quantity: Number(form.quantity),
          expiration_date: form.expiration_date,
          remarks: form.remarks ? `${form.remarks} (${form.unit})` : undefined,
        });
      }
      onSaved();
      onClose();
    } catch {
      setErrors({ submit: 'Something went wrong while saving to inventory. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const daysUntilExpiry = form.expiration_date
    ? Math.ceil(
        (new Date(form.expiration_date).getTime() - Date.now()) / 86400000
      )
    : null;

  const expiryHint =
    daysUntilExpiry === null
      ? null
      : daysUntilExpiry < 0
      ? {
          text: 'Date is in the past (Expired)',
          color: theme.palette.error.main,
        }
      : daysUntilExpiry <= 30
      ? {
          text: `Expires in ${daysUntilExpiry} days — Very Soon`,
          color: theme.palette.warning.main,
        }
      : daysUntilExpiry <= 90
      ? {
          text: `Expires in ${daysUntilExpiry} days`,
          color: theme.palette.warning.main,
        }
      : {
          text: `Expires in ${daysUntilExpiry} days (Good Stock)`,
          color: theme.palette.success.main,
        };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      {/* Gradient header */}
      <Box
        sx={{
          background: isEdit
            ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
            : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          px: 3,
          pt: 3,
          pb: 2.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <VaccineIcon sx={{ color: '#fff', fontSize: 26 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}
          >
            {isEdit ? 'Edit Vaccine Item' : 'Add New Vaccine Stock'}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.25 }}
          >
            {isEdit
              ? 'Update batch details and clinic inventory records'
              : 'Register and stock a new vaccine batch to clinic inventory'}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            '&:hover': {
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.15)',
            },
          }}
        >
          <CancelIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stack spacing={3}>
          {/* Section 1 — Vaccine Information */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                letterSpacing: 1.1,
                display: 'block',
                mb: 1.5,
                color: '#059669',
              }}
            >
              1. Vaccine &amp; Facility Information
            </Typography>
            <Stack spacing={2.5}>
              {/* Facility Clinic context dropdown */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Receiving Facility / Clinic{' '}
                  <Box component="span" sx={{ color: 'error.main' }}>
                    *
                  </Box>
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={form.clinic_id}
                    onChange={(e) => setForm((f) => ({ ...f, clinic_id: Number(e.target.value) }))}
                    sx={{ borderRadius: 2, bgcolor: '#f9fafb' }}
                  >
                    {DEMO_CLINICS.map((c) => (
                      <MenuItem key={c.clinic_id} value={c.clinic_id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ClinicIcon sx={{ fontSize: 18, color: c.color }} />
                          <Typography sx={{ fontWeight: 500 }}>{c.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Vaccine Type Dropdown-style Selection */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                    Vaccine Type / Brand Name{' '}
                    <Box component="span" sx={{ color: 'error.main' }}>
                      *
                    </Box>
                  </Typography>
                  {!isAddingNewType && (
                    <Button
                      size="small"
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setIsAddingNewType(true)}
                      sx={{
                        fontSize: 12,
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#059669',
                        p: 0,
                        minWidth: 0,
                        '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                      }}
                    >
                      + Add New Type
                    </Button>
                  )}
                </Box>

                {!isAddingNewType ? (
                  <FormControl fullWidth size="small" error={!!errors.vaccine_type}>
                    <Select
                      value={form.vaccine_type}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW_TYPE__') {
                          setIsAddingNewType(true);
                        } else {
                          setForm((f) => ({ ...f, vaccine_type: val }));
                          if (errors.vaccine_type) {
                            setErrors((errs) => {
                              const copy = { ...errs };
                              delete copy.vaccine_type;
                              return copy;
                            });
                          }
                        }
                      }}
                      displayEmpty
                      sx={{
                        borderRadius: 2,
                        bgcolor: form.vaccine_type ? '#f0fdf4' : '#fff',
                        fontWeight: form.vaccine_type ? 600 : 400,
                        borderColor: form.vaccine_type ? '#a7f3d0' : undefined,
                      }}
                    >
                      <MenuItem value="" disabled>
                        <em>— Select Vaccine Type (Pumili ng Bakuna) —</em>
                      </MenuItem>

                      {/* Standard Category Groups */}
                      {STANDARD_VACCINE_GROUPS.map((group) => [
                        <ListSubheader
                          key={group.category}
                          sx={{
                            bgcolor: '#f8fafc',
                            fontWeight: 700,
                            fontSize: 12,
                            lineHeight: '32px',
                            color: '#0f766e',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          {group.icon} {group.category}
                        </ListSubheader>,
                        ...group.items.map((item) => (
                          <MenuItem key={item} value={item} sx={{ fontSize: 13, pl: 3 }}>
                            {item}
                          </MenuItem>
                        )),
                      ])}

                      {/* Custom / Added Types Group if any */}
                      {customVaccineTypes.length > 0 && [
                        <ListSubheader
                          key="custom-types"
                          sx={{
                            bgcolor: '#f8fafc',
                            fontWeight: 700,
                            fontSize: 12,
                            lineHeight: '32px',
                            color: '#3b82f6',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          ✨ Custom / Added Vaccine Types
                        </ListSubheader>,
                        ...customVaccineTypes.map((item) => (
                          <MenuItem key={item} value={item} sx={{ fontSize: 13, pl: 3 }}>
                            {item}
                          </MenuItem>
                        )),
                      ]}

                      {/* Add New Type Option */}
                      <Divider sx={{ my: 1 }} />
                      <MenuItem
                        value="__ADD_NEW_TYPE__"
                        sx={{
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: 13,
                          bgcolor: '#ecfdf5',
                          '&:hover': { bgcolor: '#d1fae5' },
                        }}
                      >
                        <AddIcon sx={{ fontSize: 18, mr: 1 }} />
                        + Add New Vaccine Type (Hindi Kasama sa Listahan)...
                      </MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  /* Inline New Vaccine Type Entry */
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#f0fdf4',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: 2,
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#065f46', mb: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NewTypeIcon sx={{ fontSize: 18, color: '#059669' }} />
                      Add New Vaccine Type to System
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        size="small"
                        autoFocus
                        placeholder="e.g. Vaxirab-N (0.5ml), Equirab 5ml, etc."
                        value={newTypeName}
                        onChange={(e) => {
                          setNewTypeName(e.target.value);
                          if (errors.new_type) {
                            setErrors((errs) => {
                              const copy = { ...errs };
                              delete copy.new_type;
                              return copy;
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewType();
                          }
                        }}
                        error={!!errors.new_type}
                        helperText={errors.new_type}
                        sx={{
                          flex: 1,
                          bgcolor: '#fff',
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            height: 40,
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleAddNewType}
                        sx={{
                          bgcolor: '#059669',
                          fontWeight: 700,
                          fontSize: 13,
                          textTransform: 'none',
                          height: 40,
                          px: 2.5,
                          borderRadius: 1.5,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          boxShadow: 'none',
                          '&:hover': { bgcolor: '#047857', boxShadow: 'none' },
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 18 }} />
                        Add &amp; Select
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setIsAddingNewType(false);
                          setNewTypeName('');
                        }}
                        sx={{
                          borderColor: '#cbd5e1',
                          color: '#64748b',
                          fontWeight: 600,
                          fontSize: 13,
                          textTransform: 'none',
                          height: 40,
                          px: 2,
                          borderRadius: 1.5,
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          bgcolor: '#fff',
                          '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}

                {errors.vaccine_type && !isAddingNewType && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'error.main', mt: 0.5, display: 'block', fontWeight: 500 }}
                  >
                    {errors.vaccine_type}
                  </Typography>
                )}
              </Box>

              {/* Vaccine Number / Batch Number */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Vaccine / Batch Number (Numero ng Bakuna / Lot No.){' '}
                  <Box component="span" sx={{ color: 'error.main' }}>
                    *
                  </Box>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. VR-2026-089A, SP-2026-118C, LOT-9941"
                  value={form.batch_number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, batch_number: e.target.value.toUpperCase() }))
                  }
                  error={!!errors.batch_number}
                  helperText={
                    errors.batch_number ||
                    'Unique batch, lot, or serial identifier printed on the vaccine vial/box'
                  }
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
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Section 2 — Stock Quantity & Expiration */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                letterSpacing: 1.1,
                display: 'block',
                mb: 1.5,
                color: '#059669',
              }}
            >
              2. Stock Quantity &amp; Expiration
            </Typography>
            <Stack spacing={2.5}>
              <Grid container spacing={2}>
                {!isEdit && (
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Initial Stock Quantity{' '}
                      <Box component="span" sx={{ color: 'error.main' }}>
                        *
                      </Box>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0"
                        value={form.quantity}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, quantity: e.target.value }))
                        }
                        error={!!errors.quantity}
                        helperText={
                          errors.quantity ||
                          '1 vial ≈ 3–4 ID doses (0.1 mL each) or 1 IM dose'
                        }
                        slotProps={{
                          htmlInput: { min: 1 },
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <FormControl size="small" sx={{ width: 120 }}>
                        <Select
                          value={form.unit}
                          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                          sx={{ borderRadius: 2, bgcolor: '#f9fafb' }}
                        >
                          <MenuItem value="vials">Vials</MenuItem>
                          <MenuItem value="ampoules">Ampoules</MenuItem>
                          <MenuItem value="doses">Doses</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: isEdit ? 12 : 5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                    Expiration Date{' '}
                    <Box component="span" sx={{ color: 'error.main' }}>
                      *
                    </Box>
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={form.expiration_date}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        expiration_date: e.target.value,
                      }))
                    }
                    error={
                      !!errors.expiration_date ||
                      (daysUntilExpiry !== null && daysUntilExpiry < 0)
                    }
                    helperText={errors.expiration_date}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  {expiryHint && !errors.expiration_date && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.75,
                      }}
                    >
                      <InfoIcon
                        sx={{ fontSize: 14, color: expiryHint.color }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: expiryHint.color, fontWeight: 600 }}
                      >
                        {expiryHint.text}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {!isEdit && (
                <TextField
                  fullWidth
                  size="small"
                  label="Remarks & Batch Origin"
                  multiline
                  rows={2}
                  placeholder="e.g. Received from DOH Batch Allocation, LGU Procurement, stored at 2–8 °C in main vaccine cold-storage refrigerator"
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  helperText="Optional — delivery notes, supplier info, or storage condition"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
            </Stack>
          </Box>

          {/* Live Summary Preview */}
          {!isEdit &&
            form.vaccine_type &&
            form.batch_number &&
            form.quantity &&
            form.expiration_date && (
              <Box
                sx={{
                  bgcolor: '#f0fdf4',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <VaccineIcon
                  sx={{ color: '#059669', fontSize: 28, flexShrink: 0 }}
                />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: '#065f46' }}
                  >
                    Ready to Stock: {form.quantity} {form.unit} of {form.vaccine_type}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#047857' }}>
                    Vaccine No: <strong>{form.batch_number}</strong> · Approx.{' '}
                    <strong>{Number(form.quantity) * 3} patients</strong> covered · Expires{' '}
                    <strong>
                      {new Date(form.expiration_date).toLocaleDateString(
                        'en-US',
                        { month: 'long', day: 'numeric', year: 'numeric' }
                      )}
                    </strong>
                  </Typography>
                </Box>
              </Box>
            )}

          {errors.submit && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {errors.submit}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (!validate()) return;
            setShowConfirm(true);
          }}
          variant="contained"
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <AddIcon />
            )
          }
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
            },
            '&.Mui-disabled': {
              background: theme.palette.action.disabledBackground,
            },
          }}
        >
          {saving
            ? 'Saving…'
            : isEdit
            ? 'Save Changes'
            : 'Add to Inventory'}
        </Button>
      </Box>

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmationDialog
          variant={isEdit ? 'warning' : 'confirm'}
          title={isEdit ? 'Confirm Save Changes' : 'Confirm Add Stock'}
          message={
            isEdit ? (
              <>
                Save changes to <strong>{form.vaccine_type}</strong> (Batch No.{' '}
                <strong>{form.batch_number}</strong>)?
                <br />
                Expiration date will be updated to{' '}
                <strong>{form.expiration_date}</strong>.
              </>
            ) : (
              <>
                Add <strong>{form.quantity} {form.unit}</strong> of{' '}
                <strong>{form.vaccine_type}</strong> (Vaccine / Batch No.{' '}
                <strong>{form.batch_number}</strong>) to clinic inventory?
                <br />
                This covers approximately{' '}
                <strong>{Number(form.quantity) * 3} patients</strong>.
              </>
            )
          }
          confirmLabel={isEdit ? 'Yes, Save Changes' : 'Yes, Add Stock'}
          cancelLabel="Go Back"
          onConfirm={() => {
            setShowConfirm(false);
            handleSubmit();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </Dialog>
  );
}
