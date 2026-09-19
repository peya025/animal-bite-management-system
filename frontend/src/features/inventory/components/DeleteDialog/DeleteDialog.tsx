import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Archive as ArchiveIcon, WarningAmber as WarningIcon } from '@mui/icons-material';
import api from '../../../../services/api';
import type { InventoryItem } from '../../types';

interface DeleteDialogProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteDialog({ open, item, onClose, onDeleted }: DeleteDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const handleArchive = async () => {
    if (!item) return;

    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError('Please provide a mandatory reason for archival (minimum 5 characters).');
      return;
    }

    setArchiving(true);
    setError('');

    try {
      await api.delete(`/inventory/${item.inventory_id}`, {
        data: { reason: trimmed },
      });
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const serverMsg =
        axiosErr.response?.data?.message ||
        (axiosErr.response?.data?.errors?.reason ? axiosErr.response.data.errors.reason[0] : null) ||
        'Failed to archive inventory record. Only administrators can perform this action.';
      setError(serverMsg);
    } finally {
      setArchiving(false);
    }
  };

  if (!open || !item) return null;

  return (
    <Dialog open={open} onClose={archiving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5, color: '#b45309' }}>
        <ArchiveIcon sx={{ color: '#d97706', fontSize: 26 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 18, fontFamily: "'Poppins', sans-serif" }}>
          Archive Vaccine Batch
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, fontSize: 12.5, fontFamily: "'Poppins', sans-serif" }}>
          <strong>Clinical Audit Safeguard:</strong> Hard deletion is permanently disabled. Archiving will deactivate this batch and record the transaction in the immutable audit log. Historical patient records and dispensing ledgers remain fully intact.
        </Alert>

        <Box sx={{ p: 1.5, mb: 2.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontSize: 13, color: '#334155', fontFamily: "'Poppins', sans-serif" }}>
            Vaccine Type: <strong>{item.vaccine_type}</strong>
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#334155', mt: 0.5, fontFamily: "'Poppins', sans-serif" }}>
            Batch / Lot No.: <strong>{item.batch_number}</strong>
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#334155', mt: 0.5, fontFamily: "'Poppins', sans-serif" }}>
            Current Stock: <strong>{item.current_quantity} vial(s)</strong>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 12.5, fontFamily: "'Poppins', sans-serif" }}>
            {error}
          </Alert>
        )}

        <Stack spacing={1}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', fontFamily: "'Poppins', sans-serif" }}>
            Mandatory Reason for Archival <span style={{ color: '#dc2626' }}>*</span>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="e.g., Cold chain temperature excursion during transit, batch recalled by DOH, expired stock disposal"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            disabled={archiving}
            error={!!error && reason.trim().length < 5}
            helperText={`${reason.trim().length}/500 characters (min 5 required)`}
            sx={{
              fontFamily: "'Poppins', sans-serif",
              '& .MuiOutlinedInput-root': {
                fontSize: 13,
                fontFamily: "'Poppins', sans-serif",
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={archiving}
          sx={{ textTransform: 'none', color: '#64748b', fontFamily: "'Poppins', sans-serif" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleArchive}
          disabled={archiving || reason.trim().length < 5}
          startIcon={archiving ? <CircularProgress size={16} color="inherit" /> : <ArchiveIcon />}
          sx={{
            bgcolor: '#d97706',
            '&:hover': { bgcolor: '#b45309' },
            textTransform: 'none',
            fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {archiving ? 'Archiving...' : 'Archive Batch'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
