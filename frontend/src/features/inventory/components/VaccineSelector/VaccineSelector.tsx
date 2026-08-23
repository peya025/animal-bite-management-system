import { useState, useEffect } from 'react';
import { Alert, Box, Chip, CircularProgress, Typography } from '@mui/material';
import { CheckCircle as FifoIcon, Warning as WarningIcon } from '@mui/icons-material';
import {
  getVaccineNames,
  getNextFifoBatch,
  type VaccineBatch,
} from '../../services/vaccineInventoryService';

// ─── Props ────────────────────────────────────────────────────
interface VaccineSelectorProps {
  selectedVaccineType: string;
  selectedBatch: VaccineBatch | null;
  onVaccineTypeChange: (vaccineType: string) => void;
  onBatchSelected: (batch: VaccineBatch | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

// ─── Main Component ───────────────────────────────────────────
export default function VaccineSelector({
  selectedVaccineType,
  selectedBatch,
  onVaccineTypeChange,
  onBatchSelected,
  disabled = false,
  required = false,
  error,
}: VaccineSelectorProps) {
  const [vaccineNames, setVaccineNames] = useState<string[]>([]);
  const [fifoBatch, setFifoBatch] = useState<VaccineBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFifo, setLoadingFifo] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Load available vaccine names on mount
  useEffect(() => {
    loadVaccineNames();
  }, []);

  // Load FIFO batch when vaccine type changes
  useEffect(() => {
    if (selectedVaccineType) {
      loadFifoBatch(selectedVaccineType);
    } else {
      setFifoBatch(null);
      onBatchSelected(null);
    }
  }, [selectedVaccineType]);

  const loadVaccineNames = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const names = await getVaccineNames();
      setVaccineNames(names);
    } catch (err: any) {
      setFetchError(err.response?.data?.message || 'Failed to load vaccine names');
    } finally {
      setLoading(false);
    }
  };

  const loadFifoBatch = async (vaccineType: string) => {
    setLoadingFifo(true);
    setFetchError('');
    try {
      const response = await getNextFifoBatch(vaccineType);
      setFifoBatch(response.fifo_batch);
      onBatchSelected(response.fifo_batch);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load FIFO batch';
      setFetchError(errorMsg);
      setFifoBatch(null);
      onBatchSelected(null);
    } finally {
      setLoadingFifo(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const isExpiringSoon = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  return (
    <Box>
      {/* Vaccine Type Dropdown */}
      <Box sx={{ mb: 2 }}>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: error ? '#dc2626' : '#374151',
            marginBottom: 6,
          }}
        >
          Vaccine Type {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <select
          value={selectedVaccineType}
          onChange={(e) => onVaccineTypeChange(e.target.value)}
          disabled={disabled || loading}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            backgroundColor: disabled ? '#f9fafb' : '#ffffff',
            color: '#111827',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">— Select Vaccine Type —</option>
          {vaccineNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {error && (
          <Typography sx={{ color: '#dc2626', fontSize: 12, fontWeight: 600, mt: 0.5 }}>
            ⚠ {error}
          </Typography>
        )}
      </Box>

      {/* FIFO Batch Display */}
      {loadingFifo && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            bgcolor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <CircularProgress size={20} />
          <Typography sx={{ fontSize: 13, color: '#6b7280' }}>
            Loading FIFO batch...
          </Typography>
        </Box>
      )}

      {!loadingFifo && fetchError && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {fetchError}
        </Alert>
      )}

      {!loadingFifo && !fetchError && fifoBatch && (
        <Box
          sx={{
            p: 2,
            bgcolor: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(16, 185, 129, 0.1)',
          }}
        >
          {/* FIFO Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <FifoIcon sx={{ color: '#059669', fontSize: 20 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
              🟢 FIFO: USE THIS BATCH FIRST
            </Typography>
            <Chip
              label="Auto-Selected"
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: '#dcfce7',
                color: '#166534',
              }}
            />
          </Box>

          {/* Batch Details */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.5,
              p: 1.5,
              bgcolor: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: 1.5,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6b7280', mb: 0.5 }}>
                Batch Number
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                {fifoBatch.batch_number}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6b7280', mb: 0.5 }}>
                Available Quantity
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                {fifoBatch.current_quantity} {fifoBatch.current_quantity === 1 ? 'vial' : 'vials'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6b7280', mb: 0.5 }}>
                Expiration Date
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isExpiringSoon(fifoBatch.expiration_date) ? '#dc2626' : '#111827',
                  }}
                >
                  {formatDate(fifoBatch.expiration_date)}
                </Typography>
                {isExpiringSoon(fifoBatch.expiration_date) && (
                  <Chip
                    icon={<WarningIcon style={{ fontSize: 12 }} />}
                    label="Expires Soon"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: '#fef2f2',
                      color: '#991b1b',
                    }}
                  />
                )}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6b7280', mb: 0.5 }}>
                Status
              </Typography>
              <Chip
                label={fifoBatch.status.toUpperCase()}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: '#dcfce7',
                  color: '#166534',
                }}
              />
            </Box>
          </Box>

          {/* FIFO Protocol Notice */}
          <Box
            sx={{
              mt: 1.5,
              p: 1.25,
              bgcolor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 1.5,
            }}
          >
            <Typography sx={{ fontSize: 11.5, color: '#047857', lineHeight: 1.5 }}>
              <strong>FIFO Protocol:</strong> This batch has the earliest expiration date and must
              be used first. Using another batch is not permitted unless this batch is depleted.
            </Typography>
          </Box>
        </Box>
      )}

      {!loadingFifo && !fetchError && !fifoBatch && selectedVaccineType && (
        <Alert severity="warning" sx={{ fontSize: 13 }}>
          No available stock for the selected vaccine type. Please add stock to inventory first.
        </Alert>
      )}
    </Box>
  );
}
