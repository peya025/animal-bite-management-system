import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Stack, Chip, Tooltip,
  Dialog, DialogContent, DialogTitle, IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Inventory2 as BatchIcon,
  AccessTime as TimeIcon,
  LocalShipping as SupplierIcon,
  Vaccines as VialIcon,
  OpenInNew as DetailsIcon,
} from '@mui/icons-material';
import api from '../../../../services/api';
import { daysUntil, formatDate } from '../../../../shared/utils';
import { describeExpiry, describeOpenVialCountdown } from '../../utils/inventoryStatus';

// ── Raw batch item shape from /inventory ─────────────────────────────────────
interface RawBatch {
  inventory_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: string;
  received_from?: string;
  doses_per_vial?: number;
  open_vial_status?: string;
  open_vial_doses_used?: number;
  open_vial_discard_at?: string;
  is_fifo_priority?: boolean;
  fifo_rank?: number | null;
  total_dispensed?: number;
  manufactured_date?: string;
}

// ── Per-type merged summary ───────────────────────────────────────────────────
export interface VaccineStockSummary {
  vaccine_type: string;
  total_stock: number;
  doses_per_vial: number;
  patient_capacity: number;
  sealed_capacity: number;
  earliest_expiration: string | null;
  days_to_expiry: number | null;
  status_tier: 'green' | 'yellow' | 'red';
  status_label: string;
  open_vials_count: number;
  open_doses_used: number;
  open_doses_remaining: number;
  open_fraction_used?: string;
  open_fraction_remaining?: string;
  /** All raw batches for this vaccine type (used in accordion) */
  batches: RawBatch[];
  /** Total number of batches (active + expired + depleted) */
  batch_count: number;
}

// ── Status tier evaluator ─────────────────────────────────────────────────────
export function evaluateStockLevelTier(
  totalStock: number,
  earliestExpiration?: string | null
): {
  tier: 'green' | 'yellow' | 'red';
  badgeLabel: string;
  bg: string;
  color: string;
  accent: string;
  border: string;
  badgeBg: string;
  badgeColor: string;
} {
  const days = earliestExpiration ? daysUntil(earliestExpiration) : null;

  if (totalStock <= 0 || (days !== null && days < 0)) {
    const isExpired = days !== null && days < 0;
    return {
      tier: 'red',
      badgeLabel: isExpired ? 'Expired' : 'Critical / Empty',
      bg: '#fff5f5',
      color: '#991b1b',
      accent: '#ef4444',
      border: '#fecaca',
      badgeBg: '#fee2e2',
      badgeColor: '#b91c1c',
    };
  }

  if (totalStock <= 10 || (days !== null && days <= 30)) {
    const isExpiring = days !== null && days <= 30;
    return {
      tier: 'yellow',
      badgeLabel: isExpiring ? 'Expiring Soon' : 'Low Stock',
      bg: '#fffdf5',
      color: '#92400e',
      accent: '#f59e0b',
      border: '#fef08a',
      badgeBg: '#fef3c7',
      badgeColor: '#b45309',
    };
  }

  return {
    tier: 'green',
    badgeLabel: 'Sufficient',
    bg: '#f8fdfa',
    color: '#166534',
    accent: '#10b981',
    border: '#bbf7d0',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
  };
}

// ── Batch-level status badge helper ──────────────────────────────────────────
function batchStatusVisual(batch: RawBatch) {
  if (batch.status === 'expired' || (batch.expiration_date && daysUntil(batch.expiration_date) < 0)) {
    return { label: 'Expired', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
  }
  if (batch.status === 'depleted' || batch.current_quantity <= 0) {
    return { label: 'Depleted', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
  if (batch.open_vial_status === 'opened') {
    return { label: 'Open Vial', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' };
  }
  if (batch.expiration_date && daysUntil(batch.expiration_date) <= 30) {
    return { label: 'Expiring Soon', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
  }
  return { label: 'Active', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface StockLevelIndicatorProps {
  compact?: boolean;
  showLegend?: boolean;
  variant?: 'cards' | 'strip';
}

// ── Batch Details Modal ───────────────────────────────────────────────────────
function BatchDetailsModal({
  item,
  onClose,
}: {
  item: VaccineStockSummary;
  onClose: () => void;
}) {
  const mv = evaluateStockLevelTier(item.total_stock, item.earliest_expiration);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="batch-details-dialog-title"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      {/* Header */}
      <DialogTitle
        id="batch-details-dialog-title"
        sx={{
          background: `linear-gradient(135deg, ${mv.accent} 0%, ${mv.color} 100%)`,
          px: 2.5, py: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
            {item.vaccine_type}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              label={mv.badgeLabel}
              size="small"
              sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
            />
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
              {item.total_stock} Vial{item.total_stock === 1 ? '' : 's'} total
              {item.open_vials_count > 0 && ` · ${item.open_vials_count} open`}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
              · {item.batch_count} batch{item.batch_count === 1 ? '' : 'es'}
            </Typography>
          </Stack>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        {/* Patient capacity summary (multidose) */}
        {item.doses_per_vial > 1 && (
          <Box sx={{ mb: 2, px: 1.5, py: 1, borderRadius: '8px', bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
              Combined patient capacity: ≈ {item.patient_capacity} patients
              <span style={{ fontWeight: 400, color: '#3b82f6' }}>
                {' '}({item.sealed_capacity} sealed{item.open_vials_count > 0 ? ` + ${item.open_doses_remaining} from open vial` : ''})
              </span>
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#475569', mb: 1.25, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Batch Breakdown — {item.batch_count} batch{item.batch_count === 1 ? '' : 'es'}
        </Typography>

        <Stack spacing={1}>
          {item.batches.map((batch, bIdx) => {
            const bv = batchStatusVisual(batch);
            const discardInfo = batch.open_vial_status === 'opened'
              ? describeOpenVialCountdown(batch.open_vial_discard_at)
              : null;

            return (
              <Box
                key={batch.inventory_id}
                sx={{
                  p: 1.5, borderRadius: '10px',
                  border: `1px solid ${bv.border}`,
                  bgcolor: bIdx === 0 && batch.is_fifo_priority ? '#f0fdf4' : '#fafbfc',
                  position: 'relative',
                }}
              >
                {batch.is_fifo_priority && (
                  <Box
                    sx={{
                      position: 'absolute', top: 8, right: 8,
                      px: 0.75, py: 0.2, borderRadius: '4px',
                      bgcolor: '#dcfce7', border: '1px solid #86efac',
                      fontSize: 9, fontWeight: 800, color: '#15803d', letterSpacing: '0.3px',
                    }}
                  >
                    FIFO NEXT
                  </Box>
                )}

                {/* Batch number + status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: batch.is_fifo_priority ? 8 : 0 }}>
                  <BatchIcon sx={{ fontSize: 14, color: '#64748b', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {batch.batch_number || '—'}
                  </Typography>
                  <Chip
                    label={bv.label}
                    size="small"
                    sx={{ height: 19, fontSize: 10, fontWeight: 700, bgcolor: bv.bg, color: bv.color, border: `1px solid ${bv.border}` }}
                  />
                </Box>

                {/* Detail grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <VialIcon sx={{ fontSize: 13, color: '#64748b', mt: 0.15, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Available Sealed Vials
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: bv.color }}>
                        {batch.current_quantity}
                        {batch.doses_per_vial && batch.doses_per_vial > 1 && (
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#0284c7' }}>
                            {' '}(≈{batch.current_quantity * batch.doses_per_vial} pts)
                          </span>
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  {batch.total_dispensed !== undefined && (
                    <Box>
                      <Typography sx={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Dispensed
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                        {batch.total_dispensed}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <TimeIcon sx={{ fontSize: 13, color: '#64748b', mt: 0.15, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Expiration
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: bv.color }}>
                        {batch.expiration_date ? formatDate(batch.expiration_date) : '—'}
                      </Typography>
                      {batch.expiration_date && (
                        <Typography sx={{ fontSize: 10.5, color: '#64748b' }}>
                          {describeExpiry(batch.expiration_date)}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {batch.received_from && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <SupplierIcon sx={{ fontSize: 13, color: '#64748b', mt: 0.15, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          Source / Supplier
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
                          {batch.received_from}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Open vial discard timer */}
                {discardInfo && (
                  <Box
                    sx={{
                      mt: 1, px: 1.25, py: 0.75, borderRadius: '7px',
                      bgcolor: discardInfo.bg, border: `1px solid ${discardInfo.border}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: discardInfo.color }}>
                      ⏱ {discardInfo.label}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: discardInfo.color, opacity: 0.8 }}>
                      {discardInfo.secondary}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function StockLevelIndicator({
  compact = false,
  showLegend = true,
  variant = 'cards',
}: StockLevelIndicatorProps) {
  const [stockList, setStockList] = useState<VaccineStockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // Which card's batch details are shown in the modal (null = closed)
  const [modalItem, setModalItem] = useState<VaccineStockSummary | null>(null);

  const fetchStock = useCallback(async () => {
    try {
      const res = await api.get('/inventory', { params: { per_page: 200 } });
      const items: RawBatch[] = res.data?.data || res.data || [];

      // 5.2 — Group by vaccine_type, accumulate per-type totals AND raw batch list
      const groups: Record<
        string,
        {
          total: number;
          earliestExp: string | null;
          openCount: number;
          dosesPerVial: number;
          openDosesUsed: number;
          openDosesTotal: number;
          batches: RawBatch[];
        }
      > = {};

      items.forEach((item) => {
        const vType = item.vaccine_type;
        if (!vType) return;
        if (!groups[vType]) {
          groups[vType] = {
            total: 0,
            earliestExp: null,
            openCount: 0,
            dosesPerVial: 1,
            openDosesUsed: 0,
            openDosesTotal: 0,
            batches: [],
          };
        }

        // Accumulate ALL batches for accordion display (not just active)
        groups[vType].batches.push(item);

        if (item.status === 'active') {
          groups[vType].total += Number(item.current_quantity || 0);
          const dpv = Number(item.doses_per_vial || 1);
          if (dpv > groups[vType].dosesPerVial) groups[vType].dosesPerVial = dpv;

          if (item.open_vial_status === 'opened') {
            groups[vType].openCount += 1;
            groups[vType].openDosesUsed += Number(item.open_vial_doses_used || 0);
            groups[vType].openDosesTotal += dpv;
          }

          if (item.expiration_date) {
            const expDate = item.expiration_date.split('T')[0];
            if (!groups[vType].earliestExp || expDate < groups[vType].earliestExp!) {
              groups[vType].earliestExp = expDate;
            }
          }
        }
      });

      const summaries: VaccineStockSummary[] = Object.entries(groups).map(([type, data]) => {
        const evaluation = evaluateStockLevelTier(data.total, data.earliestExp);
        const days = data.earliestExp ? daysUntil(data.earliestExp) : null;
        const openRemaining = Math.max(0, data.openDosesTotal - data.openDosesUsed);
        const sealedCap = data.total * data.dosesPerVial;
        const totalCap = sealedCap + openRemaining;
        const usedFraction = data.openCount > 0 ? `${data.openDosesUsed}/${data.dosesPerVial}` : undefined;
        const remainingFraction = data.openCount > 0 ? `${openRemaining}/${data.dosesPerVial}` : undefined;

        // Sort batches: FIFO priority first, then by expiration date asc
        const sortedBatches = [...data.batches].sort((a, b) => {
          if (a.fifo_rank != null && b.fifo_rank != null) return a.fifo_rank - b.fifo_rank;
          if (a.fifo_rank != null) return -1;
          if (b.fifo_rank != null) return 1;
          return (a.expiration_date || '').localeCompare(b.expiration_date || '');
        });

        return {
          vaccine_type: type,
          total_stock: data.total,
          doses_per_vial: data.dosesPerVial,
          patient_capacity: totalCap,
          sealed_capacity: sealedCap,
          earliest_expiration: data.earliestExp,
          days_to_expiry: days,
          status_tier: evaluation.tier,
          status_label: evaluation.badgeLabel,
          open_vials_count: data.openCount,
          open_doses_used: data.openDosesUsed,
          open_doses_remaining: openRemaining,
          open_fraction_used: usedFraction,
          open_fraction_remaining: remainingFraction,
          batches: sortedBatches,
          batch_count: data.batches.length,
        };
      });

      setStockList(summaries);
    } catch {
      // Graceful fallback — keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStock();
    const interval = setInterval(fetchStock, 60000);
    return () => clearInterval(interval);
  }, [fetchStock]);

  if (loading && stockList.length === 0) return null;

  // ── Strip variant (Queue Dashboard) — unchanged behaviour ────────────────
  if (variant === 'strip') {
    if (stockList.length === 0) return null;

    return (
      <Box
        sx={{
          mb: 1.5,
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          bgcolor: '#ffffff',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {stockList.map((item, idx) => {
          const visual = evaluateStockLevelTier(item.total_stock, item.earliest_expiration);
          return (
            <Box
              key={item.vaccine_type}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 0.75,
                minHeight: 38,
                borderBottom: idx < stockList.length - 1 ? '1px solid #f1f5f9' : 'none',
                bgcolor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                fontSize: 12.5,
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 200, flexWrap: 'wrap' }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: visual.accent, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {item.vaccine_type}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                  ({item.total_stock} sealed vial{item.total_stock === 1 ? '' : 's'}
                  {item.doses_per_vial > 1 && (
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>
                      {' '}· ≈{item.patient_capacity} patient{item.patient_capacity === 1 ? '' : 's'}
                    </span>
                  )})
                </Typography>
                {item.open_vials_count > 0 && (
                  <Chip
                    label={
                      item.open_fraction_used
                        ? `${item.open_vials_count} open: ${item.open_fraction_used} used (${item.open_fraction_remaining} left)`
                        : `${item.open_vials_count} open`
                    }
                    size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#ecfeff', color: '#0e7490', border: '1px solid #a5f3fc' }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={visual.badgeLabel}
                  size="small"
                  sx={{ height: 20, fontSize: 10.5, fontWeight: 600, bgcolor: visual.badgeBg, color: visual.badgeColor, border: `1px solid ${visual.border}`, borderRadius: 1 }}
                />
                <Typography sx={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                  Earliest exp:{' '}
                  <span style={{ fontWeight: 600, color: visual.color }}>
                    {item.earliest_expiration ? formatDate(item.earliest_expiration) : 'N/A'}
                  </span>
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  // ── Cards variant (main Inventory page) ──────────────────────────────────
  return (
    <>
      <Box
        sx={{
          p: compact ? 2 : 2.5,
          mb: compact ? 2.5 : 3,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          pb: 1.5,
          mb: 2,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: '8px',
              bgcolor: '#ecfdf5', border: '1px solid #a7f3d0',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 0 2px rgba(16,185,129,0.25)' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              Vaccine Stock Status
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.2 }}>
              Real-time inventory levels · click <strong>View Details</strong> on any card to see batch breakdown
            </Typography>
          </Box>
        </Box>

        {showLegend && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { dot: '#16a34a', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Sufficient (>10 vials)' },
              { dot: '#d97706', bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'Low / Expiring (≤10)' },
              { dot: '#dc2626', bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: 'Critical / Empty (0)' },
            ].map((l) => (
              <Box
                key={l.label}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                  fontSize: 11, fontWeight: 600, color: l.color,
                  bgcolor: l.bg, px: 1.2, py: 0.4, borderRadius: '6px', border: `1px solid ${l.border}`,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: l.dot }} />
                {l.label}
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* ── Cards Grid ── */}
      {stockList.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', py: 1 }}>
          No active vaccine batches registered in clinic inventory.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(220px, 1fr))' },
            gap: 1.5,
          }}
        >
          {stockList.map((item) => {
            const visual = evaluateStockLevelTier(item.total_stock, item.earliest_expiration);

            return (
              <Box
                key={item.vaccine_type}
                sx={{
                  borderRadius: '10px',
                  bgcolor: visual.bg,
                  border: `1px solid ${visual.border}`,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  '&:hover': {
                    borderColor: visual.accent,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  },
                }}
              >
                {/* ── Front Card Face (Compact) ── */}
                <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 160 }}>

                  {/* Row 1: Vaccine name + Status badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', flex: 1, minWidth: 0 }}>
                      {item.vaccine_type}
                    </Typography>
                    <Chip
                      label={visual.badgeLabel}
                      size="small"
                      sx={{
                        height: 24, fontSize: 11, fontWeight: 700,
                        bgcolor: visual.badgeBg, color: visual.badgeColor,
                        border: `1px solid ${visual.border}`, borderRadius: '6px',
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  {/* Row 2: Big vial count + open vial chip */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', py: 1 }}>
                    <Typography
                      sx={{ fontSize: 52, fontWeight: 900, color: visual.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {item.total_stock}
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#64748b' }}>
                      Vial{item.total_stock === 1 ? '' : 's'}
                    </Typography>
                    {item.open_vials_count > 0 && item.open_fraction_remaining && (
                      <Chip
                        label={`+ ${item.open_fraction_remaining} open`}
                        size="small"
                        sx={{ height: 24, fontSize: 12, fontWeight: 700, bgcolor: '#ecfeff', color: '#0e7490', border: '1px solid #a5f3fc' }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mt: 'auto', pt: 1, borderTop: `1px dashed ${visual.border}`,
                      cursor: 'pointer', gap: 0.75,
                      '&:hover .vd-label': { color: visual.accent },
                    }}
                    onClick={() => setModalItem(item)}
                    role="button"
                    aria-label={`View batch details for ${item.vaccine_type}`}
                  >
                    <DetailsIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
                    <Typography
                      className="vd-label"
                      sx={{
                        fontSize: 13, fontWeight: 700, color: '#64748b',
                        transition: 'color 0.15s', userSelect: 'none',
                      }}
                    >
                      View Details
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      </Box>

    {/* ── Batch Details Modal ── */}
    {modalItem && <BatchDetailsModal item={modalItem} onClose={() => setModalItem(null)} />}
    </>
  );
}
