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
  useTheme,
} from '@mui/material';
import { CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { getFifoRecommendations, type FifoRecommendation } from '../../services/vaccineInventoryService';

// ─── Main Component ───────────────────────────────────────────
export default function FifoComplianceReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h, #111827)', mb: 0.5 }}>
          FIFO Compliance Report
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>
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
          bgcolor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4',
          border: isDark ? '1px solid rgba(163, 230, 53, 0.3)' : '1px solid #bbf7d0',
          borderRadius: 2,
        }}
      >
        <CheckCircle sx={{ color: isDark ? '#34d399' : '#059669', fontSize: 24 }} />
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#a7f3d0' : '#065f46' }}>
            FIFO Protocol Active
          </Typography>
          <Typography sx={{ fontSize: 12, color: isDark ? '#6ee7b7' : '#047857' }}>
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
            bgcolor: isDark ? 'var(--card-bg-solid, #0e1812)' : '#ffffff',
            border: isDark ? '1px solid var(--border-glow, rgba(163, 230, 53, 0.25))' : '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280', mb: 0.5 }}>
            Vaccine Types
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
            {Object.keys(recommendations).length}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            bgcolor: isDark ? 'var(--card-bg-solid, #0e1812)' : '#ffffff',
            border: isDark ? '1px solid var(--border-glow, rgba(163, 230, 53, 0.25))' : '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280', mb: 0.5 }}>
            Total Active Batches
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
            {Object.values(recommendations).reduce(
              (sum, rec) => sum + rec.all_batches_fifo.length,
              0
            )}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            bgcolor: isDark ? 'var(--card-bg-solid, #0e1812)' : '#ffffff',
            border: isDark ? '1px solid var(--border-glow, rgba(163, 230, 53, 0.25))' : '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280', mb: 0.5 }}>
            Total Stock
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: isDark ? '#34d399' : '#059669' }}>
            {Object.values(recommendations).reduce((sum, rec) => sum + rec.total_stock, 0)} vials
          </Typography>
        </Box>
      </Box>

      {/* Detailed FIFO Tables per Vaccine Type */}
      {Object.entries(recommendations).map(([vaccineType, recommendation]) => {
        const { recommended_batch: _recommended_batch, all_batches_fifo } = recommendation;

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
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
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
                  sx={{ fontSize: 11, fontWeight: 600, bgcolor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7', color: isDark ? '#34d399' : '#166534' }}
                />
              </Box>
            </Box>

            {/* FIFO Table */}
            <TableContainer component={Paper} sx={{ border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : '1px solid #e5e7eb', bgcolor: isDark ? 'var(--card-bg-solid, #0e1812)' : '#ffffff' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? '#121c15' : '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: isDark ? '#a7f3d0' : undefined }}>FIFO Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: isDark ? '#a7f3d0' : undefined }}>Batch Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: isDark ? '#a7f3d0' : undefined }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: isDark ? '#a7f3d0' : undefined }}>Expiration Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: isDark ? '#a7f3d0' : undefined }}>Status</TableCell>
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
                          bgcolor: isFifoPriority
                            ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4')
                            : (isDark ? (index % 2 === 0 ? '#0e1812' : 'rgba(34, 197, 94, 0.03)') : '#ffffff'),
                          '&:hover': { bgcolor: isFifoPriority ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (isDark ? 'rgba(34, 197, 94, 0.08)' : '#f9fafb') },
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
                                bgcolor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#dcfce7',
                                color: isDark ? '#34d399' : '#166534',
                              }}
                            />
                          ) : (
                            <Chip
                              label={`Rank #${index + 1}`}
                              size="small"
                              sx={{ fontSize: 11, fontWeight: 600, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: isDark ? '#94a3b8' : '#6b7280' }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#ffffff' : undefined }}>
                          {batch.batch_number}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#34d399' : '#059669' }}>
                          {batch.current_quantity}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 500, color: isDark ? '#f8fafc' : undefined }}>
                              {formatDate(batch.expiration_date)}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: isDark ? '#94a3b8' : '#6b7280',
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
                              bgcolor: isDark ? 'rgba(255,255,255,0.08)' : batchExpiryStatus.bgColor,
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
