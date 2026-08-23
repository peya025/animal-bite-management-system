import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { getFifoRecommendations, type FifoRecommendation } from '../../services/vaccineInventoryService';

// ─── Main Component ───────────────────────────────────────────
export default function FifoComplianceReport() {
  const [recommendations, setRecommendations] = useState<Record<string, FifoRecommendation>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFifoRecommendations();
  }, []);

  const loadFifoRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getFifoRecommendations();
      setRecommendations(response.fifo_recommendations || {});
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load FIFO recommendations');
    } finally {
      setLoading(false);
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

  const getDaysUntilExpiry = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    return Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (dateString: string) => {
    const days = getDaysUntilExpiry(dateString);
    if (days < 0) return { label: 'Expired', color: '#dc2626', bgColor: '#fef2f2', icon: <ErrorIcon style={{ fontSize: 14 }} /> };
    if (days <= 30) return { label: 'Expires Soon', color: '#ea580c', bgColor: '#fff7ed', icon: <Warning style={{ fontSize: 14 }} /> };
    return { label: 'Good', color: '#059669', bgColor: '#f0fdf4', icon: <CheckCircle style={{ fontSize: 14 }} /> };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, fontSize: 14, color: '#6b7280' }}>
          Loading FIFO compliance report...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ fontSize: 13 }}>
        {error}
      </Alert>
    );
  }

  if (Object.keys(recommendations).length === 0) {
    return (
      <Alert severity="info" sx={{ fontSize: 13 }}>
        No active vaccine inventory found. Please add vaccine stock to begin tracking FIFO compliance.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', mb: 0.5 }}>
          FIFO Compliance Report
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#6b7280' }}>
          First In, First Out (FIFO) / First Expire, First Out (FEFO) monitoring for all vaccine types
        </Typography>
      </Box>

      {/* FIFO Protocol Banner */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          mb: 3,
          bgcolor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 2,
        }}
      >
        <CheckCircle sx={{ color: '#059669', fontSize: 24 }} />
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
            FIFO Protocol Active
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#047857' }}>
            System automatically prioritizes batches with earliest expiration dates for clinical use
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#6b7280', mb: 0.5 }}>
            Vaccine Types
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
            {Object.keys(recommendations).length}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            bgcolor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#6b7280', mb: 0.5 }}>
            Total Active Batches
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
            {Object.values(recommendations).reduce(
              (sum, rec) => sum + rec.all_batches_fifo.length,
              0
            )}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            bgcolor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#6b7280', mb: 0.5 }}>
            Total Stock
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
            {Object.values(recommendations).reduce((sum, rec) => sum + rec.total_stock, 0)} vials
          </Typography>
        </Box>
      </Box>

      {/* Detailed FIFO Tables per Vaccine Type */}
      {Object.entries(recommendations).map(([vaccineType, recommendation]) => {
        const { recommended_batch, all_batches_fifo } = recommendation;
        const expiryStatus = getExpiryStatus(recommended_batch.expiration_date);

        return (
          <Box key={vaccineType} sx={{ mb: 4 }}>
            {/* Vaccine Type Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {vaccineType}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${all_batches_fifo.length} ${all_batches_fifo.length === 1 ? 'Batch' : 'Batches'}`}
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 600 }}
                />
                <Chip
                  label={`${recommendation.total_stock} Vials`}
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 600, bgcolor: '#dcfce7', color: '#166534' }}
                />
              </Box>
            </Box>

            {/* FIFO Table */}
            <TableContainer component={Paper} sx={{ border: '1px solid #e5e7eb' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>FIFO Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Batch Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Expiration Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {all_batches_fifo.map((batch, index) => {
                    const batchExpiryStatus = getExpiryStatus(batch.expiration_date);
                    const isFifoPriority = index === 0;

                    return (
                      <TableRow
                        key={batch.inventory_id}
                        sx={{
                          bgcolor: isFifoPriority ? '#f0fdf4' : '#ffffff',
                          '&:hover': { bgcolor: isFifoPriority ? '#dcfce7' : '#f9fafb' },
                        }}
                      >
                        <TableCell>
                          {isFifoPriority ? (
                            <Chip
                              icon={<CheckCircle style={{ fontSize: 14 }} />}
                              label="🟢 USE FIRST"
                              size="small"
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                bgcolor: '#dcfce7',
                                color: '#166534',
                              }}
                            />
                          ) : (
                            <Chip
                              label={`Rank #${index + 1}`}
                              size="small"
                              sx={{ fontSize: 11, fontWeight: 600, bgcolor: '#f3f4f6', color: '#6b7280' }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                          {batch.batch_number}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>
                          {batch.current_quantity}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                              {formatDate(batch.expiration_date)}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: '#6b7280',
                                fontStyle: 'italic',
                              }}
                            >
                              ({getDaysUntilExpiry(batch.expiration_date)}d)
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={batchExpiryStatus.icon}
                            label={batchExpiryStatus.label}
                            size="small"
                            sx={{
                              fontSize: 11,
                              fontWeight: 600,
                              bgcolor: batchExpiryStatus.bgColor,
                              color: batchExpiryStatus.color,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      })}
    </Box>
  );
}
