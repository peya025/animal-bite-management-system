import { useState, useEffect } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, InputLabel, MenuItem, Select,
  Stack, TextField,
} from '@mui/material';
import api from '../../services/api';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';

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

interface AdjustStockDialogProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdjustStockDialog({ open, item, onClose, onSaved }: AdjustStockDialogProps) {
  const [form, setForm] = useState({ transaction_type: 'received', quantity: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setForm({ transaction_type: 'received', quantity: '', remarks: '' });
    setError('');
    setShowConfirm(false);
  }, [open]);

  const handleSubmit = async () => {
    if (!form.quantity || Number(form.quantity) < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/inventory/${item!.inventory_id}/adjust`, {
        transaction_type: form.transaction_type,
        quantity: Number(form.quantity),
        remarks: form.remarks || undefined,
      });
      onSaved();
      onClose();
    } catch {
      setError('Failed to adjust stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isDeduction = ['expired', 'disposed'].includes(form.transaction_type);

  const txLabel: Record<string, string> = {
    received: 'Restock (Received)',
    adjusted: 'Manual Adjustment (Add)',
    expired: 'Mark as Expired (Deduct)',
    disposed: 'Dispose / Damaged (Deduct)',
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Adjust Stock</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {item && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{item.vaccine_type}</strong> — Batch {item.batch_number}
              <br />
              Current stock: <strong>{item.current_quantity} vials</strong> (≈{' '}
              {item.current_quantity * 3} patients)
            </Alert>
          )}
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Transaction Type *</InputLabel>
              <Select
                label="Transaction Type *"
                value={form.transaction_type}
                onChange={(e) => setForm((f) => ({ ...f, transaction_type: e.target.value }))}
              >
                <MenuItem value="received">Restock (Received)</MenuItem>
                <MenuItem value="adjusted">Manual Adjustment (Add)</MenuItem>
                <MenuItem value="expired">Mark as Expired (Deduct)</MenuItem>
                <MenuItem value="disposed">Dispose / Damaged (Deduct)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label={`Quantity to ${isDeduction ? 'Deduct' : 'Add'} *`}
              value={form.quantity}
              onChange={(e) => {
                setForm((f) => ({ ...f, quantity: e.target.value }));
                setError('');
              }}
              error={!!error}
              helperText={error}
              slotProps={{ htmlInput: { min: 1 } }}
              color={isDeduction ? 'error' : 'primary'}
            />
            <TextField
              fullWidth
              label="Remarks (optional)"
              multiline
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.quantity || Number(form.quantity) < 1) {
                setError('Quantity must be at least 1');
                return;
              }
              setShowConfirm(true);
            }}
            variant="contained"
            color={isDeduction ? 'error' : 'primary'}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            Confirm Adjustment
          </Button>
        </DialogActions>
      </Dialog>

      {showConfirm && item && (
        <ConfirmationModal
          variant={isDeduction ? 'danger' : 'warning'}
          title="Confirm Stock Adjustment"
          message={
            <>
              <strong>{txLabel[form.transaction_type]}</strong> — {form.quantity} vial
              {Number(form.quantity) !== 1 ? 's' : ''}
              <br />
              Vaccine: <strong>{item.vaccine_type}</strong> · Batch {item.batch_number}
              <br />
              {form.remarks && <>Note: {form.remarks}</>}
            </>
          }
          confirmLabel="Yes, Adjust Stock"
          cancelLabel="Go Back"
          onConfirm={() => {
            setShowConfirm(false);
            handleSubmit();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
