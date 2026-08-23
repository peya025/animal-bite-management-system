import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import VaccineSelector from '../VaccineSelector/VaccineSelector';
import { useVaccine, type VaccineBatch } from '../../services/vaccineInventoryService';

// ─── Props ────────────────────────────────────────────────────
interface VaccineManagementDialogProps {
  open: boolean;
  patientId: number;
  treatmentId: number | null; // null when creating new treatment
  onClose: () => void;
  onVaccineUsed: (batch: VaccineBatch, quantity: number) => void;
}

// ─── Main Component ───────────────────────────────────────────
export default function VaccineManagementDialog({
  open,
  patientId,
  treatmentId,
  onClose,
  onVaccineUsed,
}: VaccineManagementDialogProps) {
  const [selectedVaccineType, setSelectedVaccineType] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<VaccineBatch | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleVaccineTypeChange = (vaccineType: string) => {
    setSelectedVaccineType(vaccineType);
    setValidationError('');
    setError('');
  };

  const handleBatchSelected = (batch: VaccineBatch | null) => {
    setSelectedBatch(batch);
    setValidationError('');
    setError('');
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      if (selectedBatch && numValue > selectedBatch.current_quantity) {
        setValidationError(
          `Quantity cannot exceed available stock (${selectedBatch.current_quantity} vials)`
        );
      } else {
        setValidationError('');
      }
      setQuantity(numValue);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedVaccineType) {
      setValidationError('Please select a vaccine type');
      return;
    }

    if (!selectedBatch) {
      setValidationError('No batch available for the selected vaccine type');
      return;
    }

    if (quantity < 1) {
      setValidationError('Quantity must be at least 1');
      return;
    }

    if (quantity > selectedBatch.current_quantity) {
      setValidationError(
        `Quantity cannot exceed available stock (${selectedBatch.current_quantity} vials)`
      );
      return;
    }

    if (!treatmentId) {
      setValidationError('Treatment ID is required. Please save the treatment record first.');
      return;
    }

    setValidationError('');
    setError('');
    setSaving(true);

    try {
      const response = await useVaccine({
        vaccine_type: selectedVaccineType,
        quantity,
        treatment_id: treatmentId,
      });

      onVaccineUsed(response.batch_used, response.quantity_used);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to use vaccine');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedVaccineType('');
    setSelectedBatch(null);
    setQuantity(1);
    setError('');
    setValidationError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
          Use Vaccine from Inventory
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#6b7280', mt: 0.5 }}>
          FIFO protocol automatically selects the oldest batch
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ py: 1 }}>
          {/* Vaccine Selector with FIFO Display */}
          <VaccineSelector
            selectedVaccineType={selectedVaccineType}
            selectedBatch={selectedBatch}
            onVaccineTypeChange={handleVaccineTypeChange}
            onBatchSelected={handleBatchSelected}
            disabled={saving}
            required
            error={validationError && !selectedVaccineType ? validationError : ''}
          />

          {/* Quantity Input */}
          {selectedBatch && (
            <Box sx={{ mt: 3 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Quantity (Vials) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                max={selectedBatch.current_quantity}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  backgroundColor: saving ? '#f9fafb' : '#ffffff',
                }}
              />
              <Typography sx={{ fontSize: 12, color: '#6b7280', mt: 0.5 }}>
                Maximum: {selectedBatch.current_quantity} vials available
              </Typography>
            </Box>
          )}

          {/* Error Messages */}
          {validationError && selectedVaccineType && (
            <Alert severity="warning" sx={{ mt: 2, fontSize: 13 }}>
              {validationError}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, fontSize: 13 }}>
              {error}
            </Alert>
          )}

          {/* FIFO Protocol Notice */}
          <Box
            sx={{
              mt: 3,
              p: 1.5,
              bgcolor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
              <strong>⚡ FIFO Enforcement:</strong> The system automatically selects the batch
              with the earliest expiration date. This ensures optimal vaccine usage and prevents
              waste due to expiration.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving} sx={{ color: '#6b7280' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !selectedBatch || validationError !== ''}
          variant="contained"
          sx={{
            bgcolor: '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            '&:hover': { bgcolor: '#059669' },
            '&:disabled': { bgcolor: '#d1d5db', color: '#9ca3af' },
          }}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Processing...' : 'Use Vaccine'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
