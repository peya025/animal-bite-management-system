import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Skeleton,
  Snackbar, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
  alpha, useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Inventory2 as InventoryIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Tune as AdjustIcon,
  Vaccines as VaccineIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import ConfirmationModal from '../../components/ConfirmationModal/ConfirmationModal';

// ─── Types ────────────────────────────────────────────────────
interface InventoryItem {
  inventory_id: number;
  clinic_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'deleted';
  created_at: string;
  updated_at: string;
  transactions_count?: number;
}
interface InventoryStats {
  total_batches: number;
  active_batches: number;
  depleted_batches: number;
  expired_batches: number;
  total_stock: number;
  expiring_soon: number;
  low_stock: number;
}
interface Transaction {
  transaction_id: number;
  inventory_id: number;
  staff_id: number;
  transaction_type: string;
  quantity: number;
  transaction_date: string;
  remarks: string | null;
  staff?: { name: string };
}
interface PaginatedResponse {
  data: InventoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const VACCINE_TYPES = [
  'Anti-Rabies Vaccine (ARV)', 'Verorab', 'Rabipur',
  'Speeda', 'Rabivax', 'Other',
];
const STATUS_COLOR: Record<string, 'success' | 'error' | 'default'> = {
  active: 'success', expired: 'error', depleted: 'default',
};
const TX_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  received: 'success', adjusted: 'info', used: 'info',
  expired: 'warning', disposed: 'error',
};

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, icon, color, loading: isLoading }: {
  label: string; value: number | string;
  icon: React.ReactNode; color: string; loading?: boolean;
}) {
  const theme = useTheme();
  const palette = theme.palette[color as keyof typeof theme.palette] as { main?: string } | undefined;
  const colorMain  = palette?.main ?? theme.palette.primary.main;
  const colorLight = alpha(colorMain, 0.08);

  return (
    <Paper elevation={0} sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2,
      p: 2.5, height: '100%',
      display: 'flex', flexDirection: 'column', gap: 1.5,
      transition: 'all 0.2s',
      '&:hover': { borderColor: colorMain, boxShadow: `0 4px 12px ${alpha(colorMain, 0.2)}`, bgcolor: alpha(colorMain, 0.04) },
    }}>
      {/* Icon — fixed size, always top-left */}
      <Box sx={{
        width: 40, height: 40, borderRadius: 1.5,
        bgcolor: colorLight, color: colorMain,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        '& svg': { fontSize: 20 },
      }}>
        {icon}
      </Box>

      {/* Text — always at the bottom, left-aligned */}
      <Box sx={{ mt: 'auto' }}>
        {isLoading
          ? <Skeleton width={52} height={28} sx={{ mb: 0.5 }} />
          : <Typography sx={{ fontWeight: 700, fontSize: 22, lineHeight: 1.2, color: 'text.primary' }}>
              {value}
            </Typography>
        }
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, lineHeight: 1.3 }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

// ─── Add / Edit Dialog ────────────────────────────────────────
interface AddDialogProps {
  open: boolean; editItem: InventoryItem | null;
  onClose: () => void; onSaved: () => void;
}

function AddEditDialog({ open, editItem, onClose, onSaved }: AddDialogProps) {
  const isEdit = !!editItem;
  const theme  = useTheme();

  const [form, setForm] = useState({
    vaccine_type: '', batch_number: '', quantity: '', expiration_date: '', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        vaccine_type:    editItem.vaccine_type,
        batch_number:    editItem.batch_number,
        quantity:        String(editItem.current_quantity),
        expiration_date: editItem.expiration_date?.split('T')[0] ?? '',
        remarks:         '',
      });
    } else {
      setForm({ vaccine_type: '', batch_number: '', quantity: '', expiration_date: '', remarks: '' });
    }
    setErrors({});
  }, [editItem, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vaccine_type)                                        e.vaccine_type    = 'Please select a vaccine type';
    if (!form.batch_number.trim())                                 e.batch_number    = 'Batch number is required';
    if (!isEdit && (!form.quantity || Number(form.quantity) < 1)) e.quantity        = 'Enter a quantity of at least 1';
    if (!form.expiration_date)                                     e.expiration_date = 'Expiration date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/inventory/${editItem!.inventory_id}`, {
          vaccine_type: form.vaccine_type, batch_number: form.batch_number,
          expiration_date: form.expiration_date,
        });
      } else {
        await api.post('/inventory', {
          vaccine_type: form.vaccine_type, batch_number: form.batch_number,
          quantity: Number(form.quantity), expiration_date: form.expiration_date,
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
    ? Math.ceil((new Date(form.expiration_date).getTime() - Date.now()) / 86400000)
    : null;
  const expiryHint =
    daysUntilExpiry === null  ? null
    : daysUntilExpiry < 0    ? { text: 'Date is in the past',                           color: theme.palette.error.main   }
    : daysUntilExpiry <= 30  ? { text: `Expires in ${daysUntilExpiry} days — very soon`, color: theme.palette.warning.main }
    : daysUntilExpiry <= 90  ? { text: `Expires in ${daysUntilExpiry} days`,             color: theme.palette.warning.main }
    :                          { text: `Expires in ${daysUntilExpiry} days`,             color: theme.palette.success.main };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>

      {/* ── Gradient header ── */}
      <Box sx={{
        background: isEdit
          ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
          : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        px: 3, pt: 3, pb: 2.5,
        display: 'flex', alignItems: 'flex-start', gap: 2,
      }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <VaccineIcon sx={{ color: '#fff', fontSize: 26 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            {isEdit ? 'Edit Inventory Item' : 'Add Vaccine Stock'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.25 }}>
            {isEdit ? 'Update batch details below' : 'Register a new vaccine batch to your inventory'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"
          sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' } }}>
          <CancelIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stack spacing={3}>

          {/* Section 1 — Vaccine info */}
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.1, display: 'block', mb: 1.5 }}
              color="text.secondary">
              Vaccine Information
            </Typography>
            <Stack spacing={2}>
              {/* Visual pill selector */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Vaccine Type <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {VACCINE_TYPES.map(v => {
                    const sel = form.vaccine_type === v;
                    return (
                      <Box key={v} onClick={() => setForm(f => ({ ...f, vaccine_type: v }))}
                        sx={{
                          px: 1.75, py: 0.75, borderRadius: 2,
                          border: '1.5px solid',
                          borderColor: sel ? 'primary.main' : errors.vaccine_type ? 'error.main' : 'divider',
                          bgcolor: sel ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                          color: sel ? 'primary.main' : 'text.secondary',
                          fontWeight: sel ? 700 : 400, fontSize: 13,
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) },
                        }}>
                        {sel && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                        {v}
                      </Box>
                    );
                  })}
                </Box>
                {errors.vaccine_type && (
                  <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>
                    {errors.vaccine_type}
                  </Typography>
                )}
              </Box>

              {/* Batch number */}
              <TextField fullWidth label="Batch Number" placeholder="e.g. VAC-2024-001"
                value={form.batch_number}
                onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))}
                error={!!errors.batch_number}
                helperText={errors.batch_number || 'Unique identifier printed on the vial box'}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="body2" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>#</Typography>
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
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.1, display: 'block', mb: 1.5 }}
              color="text.secondary">
              Stock Details
            </Typography>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                {!isEdit && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label="Initial Quantity" type="number" placeholder="0"
                      value={form.quantity}
                      onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      error={!!errors.quantity}
                      helperText={errors.quantity || 'Number of vials in this batch (1 vial = 3 patients)'}
                      slotProps={{
                        htmlInput: { min: 1 },
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>vials</Typography>
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: isEdit ? 12 : 6 }}>
                  <TextField fullWidth label="Expiration Date" type="date"
                    value={form.expiration_date}
                    onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                    error={!!errors.expiration_date || (daysUntilExpiry !== null && daysUntilExpiry < 0)}
                    helperText={errors.expiration_date}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  {expiryHint && !errors.expiration_date && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                      <InfoIcon sx={{ fontSize: 14, color: expiryHint.color }} />
                      <Typography variant="caption" sx={{ color: expiryHint.color, fontWeight: 500 }}>
                        {expiryHint.text}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {!isEdit && (
                <TextField fullWidth label="Remarks" multiline rows={2}
                  placeholder="e.g. Received from DOH batch delivery, stored at 2–8 °C"
                  value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  helperText="Optional — delivery notes, storage conditions, supplier info"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
            </Stack>
          </Box>

          {/* Live summary preview */}
          {!isEdit && form.vaccine_type && form.quantity && form.expiration_date && (
            <Box sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2, p: 2,
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <VaccineIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Ready to add {form.quantity} vial{Number(form.quantity) !== 1 ? 's' : ''} of {form.vaccine_type}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Covers ≈ {Number(form.quantity) * 3} patients · Batch {form.batch_number || '—'} · Expires{' '}
                  {new Date(form.expiration_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Typography>
              </Box>
            </Box>
          )}

          {errors.submit && <Alert severity="error" sx={{ borderRadius: 2 }}>{errors.submit}</Alert>}
        </Stack>
      </DialogContent>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={saving} variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2.5 }}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (!validate()) return;
            if (!isEdit) { setShowConfirm(true); return; }
            // Edit — show warning confirm before saving
            setShowConfirm(true);
          }}
          variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #047857 0%, #059669 100%)' },
            '&.Mui-disabled': { background: theme.palette.action.disabledBackground },
          }}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Inventory'}
        </Button>
      </Box>

      {/* Confirmation modal — Add & Edit */}
      {showConfirm && (
        <ConfirmationModal
          variant={isEdit ? 'warning' : 'confirm'}
          title={isEdit ? 'Confirm Save Changes' : 'Confirm Add Stock'}
          message={isEdit ? (
            <>
              Save changes to <strong>{form.vaccine_type}</strong> (batch <strong>{form.batch_number}</strong>)?
              <br />
              Expiration date will be updated to <strong>{form.expiration_date}</strong>.
            </>
          ) : (
            <>
              Add <strong>{form.quantity} vial{Number(form.quantity) !== 1 ? 's' : ''}</strong> of{' '}
              <strong>{form.vaccine_type}</strong> (batch <strong>{form.batch_number}</strong>) to inventory?
              <br />
              This covers ≈ <strong>{Number(form.quantity) * 3} patients</strong>.
            </>
          )}
          confirmLabel={isEdit ? 'Yes, Save Changes' : 'Yes, Add Stock'}
          cancelLabel="Go Back"
          onConfirm={() => { setShowConfirm(false); handleSubmit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </Dialog>
  );
}

// ─── Adjust Stock Dialog ──────────────────────────────────────
function AdjustDialog({ open, item, onClose, onSaved }: {
  open: boolean; item: InventoryItem | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ transaction_type: 'received', quantity: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setForm({ transaction_type: 'received', quantity: '', remarks: '' }); setError(''); setShowConfirm(false); }, [open]);

  const handleSubmit = async () => {
    if (!form.quantity || Number(form.quantity) < 1) { setError('Quantity must be at least 1'); return; }
    setSaving(true);
    try {
      await api.post(`/inventory/${item!.inventory_id}/adjust`, {
        transaction_type: form.transaction_type, quantity: Number(form.quantity),
        remarks: form.remarks || undefined,
      });
      onSaved(); onClose();
    } catch { setError('Failed to adjust stock. Please try again.'); }
    finally { setSaving(false); }
  };

  const isDeduction = ['expired', 'disposed'].includes(form.transaction_type);

  const txLabel: Record<string, string> = {
    received: 'Restock (Received)',
    adjusted: 'Manual Adjustment (Add)',
    expired:  'Mark as Expired (Deduct)',
    disposed: 'Dispose / Damaged (Deduct)',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Adjust Stock</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {item && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>{item.vaccine_type}</strong> — Batch {item.batch_number}<br />
            Current stock: <strong>{item.current_quantity} vials</strong> (≈ {item.current_quantity * 3} patients)
          </Alert>
        )}
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Transaction Type *</InputLabel>
            <Select label="Transaction Type *" value={form.transaction_type}
              onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value }))}>
              <MenuItem value="received">Restock (Received)</MenuItem>
              <MenuItem value="adjusted">Manual Adjustment (Add)</MenuItem>
              <MenuItem value="expired">Mark as Expired (Deduct)</MenuItem>
              <MenuItem value="disposed">Dispose / Damaged (Deduct)</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth type="number"
            label={`Quantity to ${isDeduction ? 'Deduct' : 'Add'} *`}
            value={form.quantity}
            onChange={e => { setForm(f => ({ ...f, quantity: e.target.value })); setError(''); }}
            error={!!error} helperText={error}
            slotProps={{ htmlInput: { min: 1 } }}
            color={isDeduction ? 'error' : 'primary'}
          />
          <TextField fullWidth label="Remarks (optional)" multiline rows={2}
            value={form.remarks}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          onClick={() => {
            if (!form.quantity || Number(form.quantity) < 1) { setError('Quantity must be at least 1'); return; }
            setShowConfirm(true);
          }}
          variant="contained" color={isDeduction ? 'error' : 'primary'}
          disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : undefined}>
          Confirm Adjustment
        </Button>
      </DialogActions>

      {showConfirm && item && (
        <ConfirmationModal
          variant={isDeduction ? 'danger' : 'warning'}
          title="Confirm Stock Adjustment"
          message={
            <>
              <strong>{txLabel[form.transaction_type]}</strong> — {form.quantity} vial{Number(form.quantity) !== 1 ? 's' : ''}<br />
              Vaccine: <strong>{item.vaccine_type}</strong> · Batch {item.batch_number}<br />
              {form.remarks && <>Note: {form.remarks}</>}
            </>
          }
          confirmLabel="Yes, Adjust Stock"
          cancelLabel="Go Back"
          onConfirm={() => { setShowConfirm(false); handleSubmit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </Dialog>
  );
}

// ─── Transaction History Dialog ───────────────────────────────
function HistoryDialog({ open, item, onClose }: {
  open: boolean; item: InventoryItem | null; onClose: () => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    api.get(`/inventory/${item.inventory_id}/transactions`)
      .then(res => setTransactions(res.data.transactions ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [open, item]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
        Transaction History
        {item && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.vaccine_type} — Batch {item.batch_number}</Typography>}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : transactions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
            <Typography>No transactions recorded yet</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Date', 'Type', 'Quantity', 'Staff', 'Remarks'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700 }} align={h === 'Quantity' ? 'right' : 'left'}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.transaction_id} hover>
                    <TableCell>{new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <Chip label={tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                        color={TX_COLOR[tx.transaction_type] ?? 'default'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 600, color: ['expired','disposed','used'].includes(tx.transaction_type) ? 'error.main' : 'success.main' }}>
                        {['expired','disposed','used'].includes(tx.transaction_type) ? '−' : '+'}{tx.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell>{tx.staff?.name ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap title={tx.remarks ?? ''}>{tx.remarks || '—'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────
function DeleteDialog({ open, item, onClose, onDeleted }: {
  open: boolean; item: InventoryItem | null; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try { await api.delete(`/inventory/${item.inventory_id}`); onDeleted(); onClose(); }
    catch { /* keep modal open on error */ }
    finally { setDeleting(false); }
  };

  if (!open || !item) return null;

  return (
    <ConfirmationModal
      variant="danger"
      title="Delete Inventory Item"
      message={
        <>
          Permanently delete this record?<br />
          <strong>{item.vaccine_type}</strong> · Batch <strong>{item.batch_number}</strong><br />
          Stock: <strong>{item.current_quantity} vials</strong> (≈ {item.current_quantity * 3} patients)
        </>
      }
      confirmLabel={deleting ? 'Deleting…' : 'Yes, Delete'}
      cancelLabel="Cancel"
      onConfirm={handleDelete}
      onCancel={onClose}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function VaccineInventory() {
  const theme = useTheme();
  const [items, setItems]               = useState<InventoryItem[]>([]);
  const [stats, setStats]               = useState<InventoryStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(10);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [snackbar, setSnackbar]         = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [addOpen,     setAddOpen]     = useState(false);
  const [editItem,    setEditItem]    = useState<InventoryItem | null>(null);
  const [adjustItem,  setAdjustItem]  = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [deleteItem,  setDeleteItem]  = useState<InventoryItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: page + 1, per_page: rowsPerPage };
      if (search)       params.vaccine_type = search;
      if (statusFilter) params.status       = statusFilter;
      const [inventoryRes, statsRes] = await Promise.all([
        api.get('/inventory', { params }),
        api.get('/inventory/statistics'),
      ]);
      const data: PaginatedResponse = inventoryRes.data;
      setItems(data.data); setTotal(data.total); setStats(statsRes.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load inventory data', severity: 'error' });
    } finally { setLoading(false); }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => setSnackbar({ open: true, message: msg, severity: 'success' });
  const isExpiringSoon = (d: string) => { const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 30; };
  const isLowStock     = (q: number) => q > 0 && q <= 10;

  return (
    <Box>
      {/* ── Header ── */}
      <Paper elevation={0} sx={{
        p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
      }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', display: 'flex' }}>
            <InventoryIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Vaccine Inventory</Typography>
            <Typography variant="body2" color="text.secondary">Manage stock levels and track transactions</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}
            sx={{ borderRadius: 2 }}>
            Add Stock
          </Button>
        </Stack>
      </Paper>

      {/* ── Stats Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        {[
          { label: 'Total Batches',       value: stats?.total_batches,                          icon: <InventoryIcon />, color: 'primary' },
          { label: 'Active Batches',      value: stats?.active_batches,                         icon: <CheckIcon />,     color: 'success' },
          { label: 'Total Vials',         value: stats ? `${stats.total_stock}` : '-',          icon: <VaccineIcon />,   color: 'info'    },
          { label: 'Patients Coverable',  value: stats ? `${stats.total_stock * 3}` : '-',      icon: <PeopleIcon />,    color: 'success' },
          { label: 'Low Stock',           value: stats?.low_stock,                              icon: <WarningIcon />,   color: 'warning' },
          { label: 'Expiring Soon',       value: stats?.expiring_soon,                          icon: <WarningIcon />,   color: 'warning' },
          { label: 'Depleted',            value: stats?.depleted_batches,                       icon: <CancelIcon />,    color: 'error'   },
        ].map(s => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 12/7 }}>
            <StatCard label={s.label} value={s.value ?? '-'} icon={s.icon} color={s.color} loading={!stats} />
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 5 }}>
            <TextField fullWidth size="small" placeholder="Search by vaccine type…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="depleted">Depleted</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 2, md: 2 }}>
            <Button fullWidth variant="outlined" size="small"
              onClick={() => { setSearch(''); setStatusFilter(''); setPage(0); }}>
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Table ── */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {/* ID */}
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, width: 72, py: 1.75 }}>ID</TableCell>
                {/* Vaccine Type */}
                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.75 }}>VACCINE TYPE</TableCell>
                {/* Batch Number */}
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, py: 1.75 }}>BATCH NO.</TableCell>
                {/* Current Quantity */}
                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.75, width: 180 }}>VIALS / CAPACITY</TableCell>
                {/* Expiration Date */}
                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.75 }}>EXPIRATION DATE</TableCell>
                {/* Status */}
                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.75, width: 110 }}>STATUS</TableCell>
                {/* Actions */}
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, py: 1.75, width: 140 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: rowsPerPage }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 10, border: 0 }}>
                    <Box sx={{
                      width: 80, height: 80, borderRadius: '50%',
                      bgcolor: 'grey.100', mx: 'auto', mb: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <InventoryIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                    </Box>
                    <Typography sx={{ fontWeight: 600 }} color="text.secondary">No inventory records found</Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                      Add your first vaccine batch to get started
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                      Add First Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ) : items.map((item, idx) => {
                const low  = isLowStock(item.current_quantity);
                const zero = item.current_quantity === 0;
                const soon = item.expiration_date && isExpiringSoon(item.expiration_date);
                const expiryDate = item.expiration_date
                  ? new Date(item.expiration_date)
                  : null;
                const daysLeft = expiryDate
                  ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000)
                  : null;

                // stock bar width capped at 100%
                const stockPct = Math.min(100, (item.current_quantity / 100) * 100);
                const stockColor = zero ? theme.palette.error.main
                  : low ? theme.palette.warning.main
                  : theme.palette.success.main;

                return (
                  <TableRow key={item.inventory_id} hover
                    sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) }, transition: 'background 0.15s' }}>

                    {/* ── ID ── */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 36, px: 1, py: 0.25,
                        bgcolor: 'grey.100', borderRadius: 1,
                        fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
                        color: 'text.secondary',
                      }}>
                        #{item.inventory_id}
                      </Box>
                    </TableCell>

                    {/* ── Vaccine Type ── */}
                    <TableCell sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box sx={{
                          width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <VaccineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>
                            {item.vaccine_type}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            Vaccine · Batch #{idx + 1}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* ── Batch Number ── */}
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        px: 1.25, py: 0.5,
                        bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider',
                        borderRadius: 1.5,
                        fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
                        color: 'text.primary',
                      }}>
                        {item.batch_number}
                      </Box>
                    </TableCell>

                    {/* ── Current Quantity ── */}
                    <TableCell sx={{ py: 2 }}>
                      <Box>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 16, color: stockColor, lineHeight: 1 }}>
                            {item.current_quantity}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">vials</Typography>
                          {(zero || low) && (
                            <Tooltip title={zero ? 'Out of stock' : 'Low stock — consider restocking'}>
                              <WarningIcon sx={{ fontSize: 15, color: stockColor }} />
                            </Tooltip>
                          )}
                        </Stack>
                        {/* Mini stock bar */}
                        <Box sx={{
                          height: 5, borderRadius: 8, bgcolor: 'grey.100', width: 120, overflow: 'hidden',
                        }}>
                          <Box sx={{
                            height: '100%', width: `${stockPct}%`,
                            bgcolor: stockColor, borderRadius: 8,
                            transition: 'width 0.4s ease',
                          }} />
                        </Box>
                        {/* Patients covered */}
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                          ≈ {item.current_quantity * 3} patients
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* ── Expiration Date ── */}
                    <TableCell sx={{ py: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {expiryDate
                            ? expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </Typography>
                        {daysLeft !== null && (
                          <Typography variant="caption" sx={{
                            color: daysLeft < 0 ? 'error.main'
                              : daysLeft <= 30 ? 'warning.main'
                              : 'text.disabled',
                            fontWeight: daysLeft <= 30 ? 600 : 400,
                          }}>
                            {daysLeft < 0
                              ? `Expired ${Math.abs(daysLeft)}d ago`
                              : daysLeft === 0 ? 'Expires today'
                              : `${daysLeft}d remaining`}
                          </Typography>
                        )}
                      </Box>
                      {soon && (
                        <Chip label="Exp. soon" color="warning" size="small"
                          sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
                      )}
                    </TableCell>

                    {/* ── Status ── */}
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        color={STATUS_COLOR[item.status]}
                        size="small"
                        variant={item.status === 'active' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: 12 }}
                      />
                    </TableCell>

                    {/* ── Actions ── */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'center' }}>
                        <Tooltip title="Adjust Stock">
                          <IconButton size="small" onClick={() => setAdjustItem(item)}
                            sx={{ color: 'primary.main', borderRadius: 1.5,
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
                            <AdjustIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Transaction History">
                          <IconButton size="small" onClick={() => setHistoryItem(item)}
                            sx={{ color: 'text.secondary', borderRadius: 1.5,
                              '&:hover': { bgcolor: 'grey.100' } }}>
                            <HistoryIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setEditItem(item)}
                            sx={{ color: 'text.secondary', borderRadius: 1.5,
                              '&:hover': { bgcolor: 'grey.100' } }}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteItem(item)}
                            sx={{ color: 'error.main', borderRadius: 1.5,
                              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) } }}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Pagination ── */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Rows:"
            sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13 } }}
          />
        </Box>
      </Paper>

      {/* ── Dialogs ── */}
      <AddEditDialog open={addOpen || !!editItem} editItem={editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); }}
        onSaved={() => { loadData(); showSuccess(editItem ? 'Inventory updated successfully' : 'Stock added successfully'); }}
      />
      <AdjustDialog open={!!adjustItem} item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSaved={() => { loadData(); showSuccess('Stock adjusted successfully'); }}
      />
      <HistoryDialog open={!!historyItem} item={historyItem} onClose={() => setHistoryItem(null)} />
      <DeleteDialog open={!!deleteItem} item={deleteItem}
        onClose={() => setDeleteItem(null)}
        onDeleted={() => { loadData(); showSuccess('Inventory record deleted'); }}
      />

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
