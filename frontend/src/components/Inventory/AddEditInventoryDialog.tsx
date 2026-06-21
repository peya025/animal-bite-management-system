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
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Vaccines as VaccineIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';

interface InventoryItem {
  inventory_id: number;
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

const VACCINE_TYPES = [
  'Anti-Rabies Vaccine (ARV)',
  'Verorab',
  'Rabipur',
  'Speeda',
  'Rabivax',
  'Other',
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
    vaccine_type: '',
    batch_number: '',
    quantity: '',
    expiration_date: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        vaccine_type: editItem.vaccine_type,
        batch_number: editItem.batch_number,
        quantity: String(editItem.current_quantity),
        expiration_date: editItem.expiration_date?.split('T')[0] ?? '',
        remarks: '',
      });
    } else {
      setForm({
        vaccine_type: '',
        batch_number: '',
        quantity: '',
        expiration_date: '',
        remarks: '',
      });
    }
    setErrors({});
  }, [editItem, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vaccine_type) e.vaccine_type = 'Please select a vaccine type';
    if (!form.batch_number.trim()) e.batch_number = 'Batch number is required';
    if (!isEdit && (!form.quantity || Number(form.quantity) < 1))
      e.quantity = 'Enter a quantity of at least 1';
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
          remarks: form.remarks || undefined,
        });
      }
      onSaved();
      onClose();
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again.' });
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
          text: 'Date is in the past',
          color: theme.palette.error.main,
        }
      : daysUntilExpiry <= 30
      ? {
          text: `Expires in ${daysUntilExpiry} days — very soon`,
          color: theme.palette.warning.main,
        }
      : daysUntilExpiry <= 90
      ? {
          text: `Expires in ${daysUntilExpiry} days`,
          color: theme.palette.warning.main,
        }
      : {
          text: `Expires in ${daysUntilExpiry} days`,
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
            {isEdit ? 'Edit Inventory Item' : 'Add Vaccine Stock'}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.25 }}
          >
            {isEdit
              ? 'Update batch details below'
              : 'Register a new vaccine batch to your inventory'}
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
          {/* Section 1 — Vaccine info */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                letterSpacing: 1.1,
                display: 'block',
                mb: 1.5,
              }}
              color="text.secondary"
            >
              Vaccine Information
            </Typography>
            <Stack spacing={2}>
              {/* Visual pill selector */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Vaccine Type{' '}
                  <Box component="span" sx={{ color: 'error.main' }}>
                    *
                  </Box>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {VACCINE_TYPES.map((v) => {
                    const sel = form.vaccine_type === v;
                    return (
                      <Box
                        key={v}
                        onClick={() =>
                          setForm((f) => ({ ...f, vaccine_type: v }))
                        }
                        sx={{
                          px: 1.75,
                          py: 0.75,
                          borderRadius: 2,
                          border: '1.5px solid',
                          borderColor: sel
                            ? 'primary.main'
                            : errors.vaccine_type
                            ? 'error.main'
                            : 'divider',
                          bgcolor: sel
                            ? alpha(theme.palette.primary.main, 0.08)
                            : 'transparent',
                          color: sel ? 'primary.main' : 'text.secondary',
                          fontWeight: sel ? 700 : 400,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        {sel && (
                          <Box
                            sx={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        {v}
                      </Box>
                    );
                  })}
                </Box>
                {errors.vaccine_type && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'error.main', mt: 0.5, display: 'block' }}
                  >
                    {errors.vaccine_type}
                  </Typography>
                )}
              </Box>

              {/* Batch number */}
              <TextField
                fullWidth
                label="Batch Number"
                placeholder="e.g. VAC-2024-001"
                value={form.batch_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, batch_number: e.target.value }))
                }
                error={!!errors.batch_number}
                helperText={
                  errors.batch_number ||
                  'Unique identifier printed on the vial box'
                }
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.disabled',
                            fontFamily: 'monospace',
                          }}
                        >
                          #
                        </Typography>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Section 2 — Stock details */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                letterSpacing: 1.1,
                display: 'block',
                mb: 1.5,
              }}
              color="text.secondary"
            >
              Stock Details
            </Typography>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                {!isEdit && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Initial Quantity"
                      type="number"
                      placeholder="0"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, quantity: e.target.value }))
                      }
                      error={!!errors.quantity}
                      helperText={
                        errors.quantity ||
                        'Number of vials in this batch (1 vial = 3 patients)'
                      }
                      slotProps={{
                        htmlInput: { min: 1 },
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.disabled' }}
                              >
                                vials
                              </Typography>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: isEdit ? 12 : 6 }}>
                  <TextField
                    fullWidth
                    label="Expiration Date"
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
                        sx={{ color: expiryHint.color, fontWeight: 500 }}
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
                  label="Remarks"
                  multiline
                  rows={2}
                  placeholder="e.g. Received from DOH batch delivery, stored at 2–8 °C"
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  helperText="Optional — delivery notes, storage conditions, supplier info"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
            </Stack>
          </Box>

          {/* Live summary preview */}
          {!isEdit &&
            form.vaccine_type &&
            form.quantity &&
            form.expiration_date && (
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(
                    theme.palette.primary.main,
                    0.2
                  )}`,
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <VaccineIcon
                  sx={{ color: 'primary.main', flexShrink: 0 }}
                />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: 'primary.main' }}
                  >
                    Ready to add {form.quantity} vial
                    {Number(form.quantity) !== 1 ? 's' : ''} of{' '}
                    {form.vaccine_type}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Covers ≈ {Number(form.quantity) * 3} patients · Batch{' '}
                    {form.batch_number || '—'} · Expires{' '}
                    {new Date(form.expiration_date).toLocaleDateString(
                      'en-US',
                      { month: 'long', day: 'numeric', year: 'numeric' }
                    )}
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
        <ConfirmationModal
          variant={isEdit ? 'warning' : 'confirm'}
          title={isEdit ? 'Confirm Save Changes' : 'Confirm Add Stock'}
          message={
            isEdit ? (
              <>
                Save changes to <strong>{form.vaccine_type}</strong> (batch{' '}
                <strong>{form.batch_number}</strong>)?
                <br />
                Expiration date will be updated to{' '}
                <strong>{form.expiration_date}</strong>.
              </>
            ) : (
              <>
                Add <strong>{form.quantity} vial{Number(form.quantity) !== 1 ? 's' : ''}</strong> of{' '}
                <strong>{form.vaccine_type}</strong> (batch{' '}
                <strong>{form.batch_number}</strong>) to inventory?
                <br />
                This covers ≈{' '}
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
