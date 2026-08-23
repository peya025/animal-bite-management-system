import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';
import api from '../../../../services/api';
import { daysUntil, formatDate } from '../../../../shared/utils';

export interface VaccineStockSummary {
  vaccine_type: string;
  total_stock: number;
  earliest_expiration: string | null;
  days_to_expiry: number | null;
  status_tier: 'green' | 'yellow' | 'red';
  status_label: string;
  open_vials_count: number;
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
}

export default function StockLevelIndicator({ compact = false, showLegend = true }: StockLevelIndicatorProps) {
  const [stockList, setStockList] = useState<VaccineStockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    try {
      const res = await api.get('/inventory', { params: { per_page: 200 } });
      const items: any[] = res.data?.data || res.data || [];

      const groups: Record<string, { total: number; earliestExp: string | null; openCount: number }> = {};

      items.forEach((item) => {
        const vType = item.vaccine_type;
        if (!vType) return;
        if (!groups[vType]) {
          groups[vType] = { total: 0, earliestExp: null, openCount: 0 };
        }

        if (item.status === 'active') {
          groups[vType].total += Number(item.current_quantity || 0);
          if (item.open_vial_status === 'opened') {
            groups[vType].openCount += 1;
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
        return {
          vaccine_type: type,
          total_stock: data.total,
          earliest_expiration: data.earliestExp,
          days_to_expiry: days,
          status_tier: evaluation.tier,
          status_label: evaluation.badgeLabel,
          open_vials_count: data.openCount,
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

                {/* Body: Big Stock Number */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, my: 0.25 }}>
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
                    vial{item.total_stock === 1 ? '' : 's'} available
                  </Typography>
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.2,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#0e7490',
                      }}
                    >
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#0891b2' }} />
                      {item.open_vials_count} open vial active (Auto-Shared)
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
