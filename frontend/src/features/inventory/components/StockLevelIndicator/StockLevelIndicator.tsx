import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';
import api from '../../../../services/api';
import { daysUntil, formatDate } from '../../../../shared/utils';

export interface VaccineStockSummary {
  vaccine_type: string;
  total_stock: number;
  doses_per_vial: number;
  patient_capacity: number; // total_stock × doses_per_vial + remaining open vial doses
  sealed_capacity: number;
  earliest_expiration: string | null;
  days_to_expiry: number | null;
  status_tier: 'green' | 'yellow' | 'red';
  status_label: string;
  open_vials_count: number;
  open_doses_used: number;
  open_doses_remaining: number;
  open_fraction_used?: string; // e.g. "1/3"
  open_fraction_remaining?: string; // e.g. "2/3"
}

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

  // 🔴 Red — Critical / empty stock or expired
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

  // 🟡 Yellow — Low stock (<= 10 units) or approaching expiration (<= 30 days)
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

  // 🟢 Green — Full stock / sufficient stock / no expiration concern
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

interface StockLevelIndicatorProps {
  compact?: boolean;
  showLegend?: boolean;
  variant?: 'cards' | 'strip';
}

export default function StockLevelIndicator({ compact = false, showLegend = true, variant = 'cards' }: StockLevelIndicatorProps) {
  const [stockList, setStockList] = useState<VaccineStockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    try {
      const res = await api.get('/inventory', { params: { per_page: 200 } });
      const items: any[] = res.data?.data || res.data || [];

      const groups: Record<
        string,
        {
          total: number;
          earliestExp: string | null;
          openCount: number;
          dosesPerVial: number;
          openDosesUsed: number;
          openDosesTotal: number;
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
          };
        }

        if (item.status === 'active') {
          groups[vType].total += Number(item.current_quantity || 0);
          // Use the highest doses_per_vial value encountered (multidose vials)
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
        };
      });

      setStockList(summaries);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStock();
    const interval = setInterval(fetchStock, 60000);
    return () => clearInterval(interval);
  }, [fetchStock]);

  if (loading && stockList.length === 0) {
    return null;
  }

  // ── Condensed Single/Stacked Strip (for Queue Dashboard) ──
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
              {/* Left: Indicator dot + Name + Count */}
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
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: '#ecfeff',
                      color: '#0e7490',
                      border: '1px solid #a5f3fc',
                    }}
                  />
                )}
              </Box>

              {/* Right: Badge + Earliest Expiry */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={visual.badgeLabel}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10.5,
                    fontWeight: 600,
                    bgcolor: visual.badgeBg,
                    color: visual.badgeColor,
                    border: `1px solid ${visual.border}`,
                    borderRadius: 1,
                  }}
                />
                <Typography sx={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                  Earliest exp: <span style={{ fontWeight: 600, color: visual.color }}>{item.earliest_expiration ? formatDate(item.earliest_expiration) : 'N/A'}</span>
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
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
      {/* ── Professional Header Bar ── */}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '8px',
              bgcolor: '#ecfdf5',
              border: '1px solid #a7f3d0',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#10b981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
              }}
            />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.2,
              }}
            >
              Vaccine Stock Status
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.2 }}>
              Real-time inventory levels & batch expiry monitor
            </Typography>
          </Box>
        </Box>

        {/* ── Refined Legend ── */}
        {showLegend && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                fontSize: 11,
                fontWeight: 600,
                color: '#166534',
                bgcolor: '#f0fdf4',
                px: 1.2,
                py: 0.4,
                borderRadius: '6px',
                border: '1px solid #bbf7d0',
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16a34a' }} />
              Sufficient (&gt;10 vials)
            </Box>

            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                fontSize: 11,
                fontWeight: 600,
                color: '#92400e',
                bgcolor: '#fffbeb',
                px: 1.2,
                py: 0.4,
                borderRadius: '6px',
                border: '1px solid #fde68a',
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#d97706' }} />
              Low / Expiring (≤10)
            </Box>

            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                fontSize: 11,
                fontWeight: 600,
                color: '#991b1b',
                bgcolor: '#fef2f2',
                px: 1.2,
                py: 0.4,
                borderRadius: '6px',
                border: '1px solid #fecaca',
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#dc2626' }} />
              Critical / Empty (0)
            </Box>
          </Stack>
        )}
      </Box>

      {/* ── Vaccine Cards Grid ── */}
      {stockList.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', py: 1 }}>
          No active vaccine batches registered in clinic inventory.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(240px, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {stockList.map((item) => {
            const visual = evaluateStockLevelTier(item.total_stock, item.earliest_expiration);
            return (
              <Box
                key={item.vaccine_type}
                sx={{
                  p: 1.75,
                  borderRadius: '10px',
                  bgcolor: visual.bg,
                  border: `1px solid ${visual.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1.25,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: visual.accent,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                {/* Header: Name + Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: '#0f172a',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {item.vaccine_type}
                  </Typography>
                  <Chip
                    label={visual.badgeLabel}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: visual.badgeBg,
                      color: visual.badgeColor,
                      border: `1px solid ${visual.border}`,
                      borderRadius: '5px',
                    }}
                  />
                </Box>

                {/* Body: Big Stock Number + Patient Capacity */}
                <Box sx={{ my: 0.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography
                      sx={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: visual.color,
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.total_stock}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      sealed vial{item.total_stock === 1 ? '' : 's'}
                    </Typography>
                    {item.open_vials_count > 0 && item.open_fraction_remaining && (
                      <Chip
                        label={`+ ${item.open_fraction_remaining} open vial left`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          fontWeight: 700,
                          bgcolor: '#ecfeff',
                          color: '#0e7490',
                          border: '1px solid #a5f3fc',
                        }}
                      />
                    )}
                  </Box>
                  {item.doses_per_vial > 1 && (
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#0284c7', mt: 0.4 }}>
                      ≈ {item.patient_capacity} patients capacity
                      <span style={{ fontWeight: 400, color: '#64748b' }}>
                        {' '}({item.sealed_capacity} sealed{item.open_vials_count > 0 ? ` + ${item.open_doses_remaining} in open` : ''})
                      </span>
                    </Typography>
                  )}
                </Box>

                {/* Footer: Expiration & Open-Vial indicator */}
                <Box
                  sx={{
                    pt: 1,
                    borderTop: `1px solid ${visual.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.4,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                    <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                      Earliest Expiry
                    </Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: visual.color }}>
                      {item.earliest_expiration ? formatDate(item.earliest_expiration) : 'N/A'}
                    </Typography>
                  </Box>

                  {item.open_vials_count > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mt: 0.5,
                        px: 1,
                        py: 0.6,
                        borderRadius: '6px',
                        bgcolor: '#ecfeff',
                        border: '1px solid #a5f3fc',
                      }}
                    >
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#0891b2', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0e7490' }}>
                          {item.open_vials_count} open vial active:{' '}
                          {item.open_fraction_used ? (
                            <>
                              <span style={{ color: '#0369a1' }}>{item.open_fraction_used} used</span> ({item.open_fraction_remaining} left)
                            </>
                          ) : (
                            'Auto-Shared'
                          )}
                        </Typography>
                      </Box>
                      {item.open_doses_remaining !== undefined && (
                        <Chip
                          label={`${item.open_doses_remaining} dose${item.open_doses_remaining === 1 ? '' : 's'} remaining`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 9.5,
                            fontWeight: 700,
                            bgcolor: '#cffafe',
                            color: '#0891b2',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
