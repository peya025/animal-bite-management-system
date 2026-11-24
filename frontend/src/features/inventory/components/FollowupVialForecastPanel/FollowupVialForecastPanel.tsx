import { useCallback, useEffect, useId, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined,
  ErrorOutlineOutlined,
  EventAvailableOutlined,
  HealthAndSafetyOutlined,
  Inventory2Outlined,
  ScheduleOutlined,
  VaccinesOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import {
  getSupplyForecast,
  type DailyVialForecastRow,
  type FollowupVialForecastResponse,
} from '../../services/vaccineInventoryService';
import './FollowupVialForecastPanel.css';

function formatDoseBreakdown(row: DailyVialForecastRow): string {
  const parts: string[] = [];
  if (row.dose_breakdown.d0 > 0) parts.push(`D0: ${row.dose_breakdown.d0}`);
  if (row.dose_breakdown.d3 > 0) parts.push(`D3: ${row.dose_breakdown.d3}`);
  if (row.dose_breakdown.d7 > 0) parts.push(`D7: ${row.dose_breakdown.d7}`);
  if (row.dose_breakdown.d14 > 0) parts.push(`D14: ${row.dose_breakdown.d14}`);
  if (row.dose_breakdown.d28 > 0) parts.push(`D28: ${row.dose_breakdown.d28}`);
  if (row.dose_breakdown.other > 0) parts.push(`Other: ${row.dose_breakdown.other}`);
  return parts.join(' · ');
}

function ForecastStatCard({
  label,
  value,
  subtitle,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  tone: 'green' | 'teal' | 'amber' | 'red';
  icon: React.ReactNode;
}) {
  const palette = {
    green: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    teal: { color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
    amber: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    red: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  }[tone];

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        p: '15px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        minHeight: 96,
        bgcolor: 'var(--card-bg-solid, #ffffff)',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: palette.bg,
          color: palette.color,
          border: `1px solid ${palette.border}`,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            mb: 0.35,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: 22, lineHeight: 1.1, fontWeight: 800, color: 'var(--text-h, #0f172a)' }}>
          {value}
        </Typography>
        <Typography sx={{ mt: 0.4, fontSize: 11.5, color: '#64748b', lineHeight: 1.35 }}>
          {subtitle}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function FollowupVialForecastPanel() {
  const captionId = useId();
  const [horizon, setHorizon] = useState<7 | 14 | 30>(14);
  const [data, setData] = useState<FollowupVialForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadForecast = useCallback(async (days: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getSupplyForecast(days);
      setData(res);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message || 'Unable to load follow-up vial forecast.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForecast(horizon);
  }, [horizon, loadForecast]);

  useEffect(() => {
    const handleUpdated = () => {
      void loadForecast(horizon);
    };
    window.addEventListener('inventory-updated', handleUpdated);
    return () => window.removeEventListener('inventory-updated', handleUpdated);
  }, [horizon, loadForecast]);

  if (loading && !data) {
    return (
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
          {[0, 1, 2, 3].map((k) => (
            <Skeleton key={k} variant="rounded" height={96} sx={{ borderRadius: '14px' }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={340} sx={{ borderRadius: '12px' }} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data) return null;

  const vr = data.vial_readiness;
  const rig = data.rig_readiness;
  const waiting = data.same_day_waiting_demand;

  const statusTone =
    vr.status === 'shortfall'
      ? 'error'
      : vr.status === 'tight' || vr.status === 'expiring'
        ? 'warning'
        : 'success';

  const fifoWatchTone: 'red' | 'amber' | 'green' = vr.projected_stockout_date
    ? 'red'
    : vr.expiring_unused_vials > 0
      ? 'amber'
      : 'green';

  return (
    <Stack spacing={2.25}>
      {/* Top readiness alert bar */}
      <Alert
        severity={statusTone}
        icon={
          vr.status === 'shortfall' ? (
            <ErrorOutlineOutlined />
          ) : vr.status === 'ok' ? (
            <CheckCircleOutlined />
          ) : (
            <WarningAmberOutlined />
          )
        }
        sx={{
          borderRadius: '12px',
          alignItems: 'center',
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{vr.headline}</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.9, mt: 0.25 }}>
              Today&apos;s waiting D0 queue: {waiting.form2_prescribed_unstarted} prescribed unstarted +{' '}
              {waiting.form1_awaiting_today} Form 1 awaiting ({waiting.estimated_waiting_d0_doses} est. D0 doses) ·
              Walk-in baseline: {data.walkin_baseline.daily_walkin_d0_rate} D0/open day ({data.walkin_baseline.d0_last_30d} in last 30d).
            </Typography>
          </Box>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={horizon}
            onChange={(_, val) => {
              if (val) setHorizon(val);
            }}
            aria-label="Forecast horizon"
            sx={{ bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '8px' }}
          >
            <ToggleButton value={7} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, px: 1.5 }}>
              7 Days
            </ToggleButton>
            <ToggleButton value={14} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, px: 1.5 }}>
              14 Days
            </ToggleButton>
            <ToggleButton value={30} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, px: 1.5 }}>
              30 Days
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Alert>

      {/* 4 Uniform Summary KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <ForecastStatCard
          label="Usable ARV Stock"
          value={`${vr.usable_arv_vials} vials`}
          subtitle={`Avg ${data.effective_doses_per_vial} doses/vial · ${vr.projected_stock_after_7d} est. after 7d`}
          tone={vr.status === 'shortfall' ? 'red' : vr.status === 'tight' ? 'amber' : 'green'}
          icon={<VaccinesOutlined />}
        />
        <ForecastStatCard
          label="Next 7d Follow-Ups"
          value={`${vr.next_7d_committed_followups} visits`}
          subtitle={`~${vr.next_7d_vials_realistic} vials needed (${vr.next_7d_vials_committed_only} follow-up floor)`}
          tone="teal"
          icon={<EventAvailableOutlined />}
        />
        <ForecastStatCard
          label="RIG Readiness"
          value={`${rig.usable_rig_vials} vials`}
          subtitle={`${rig.immediate_pending_cases} pending Cat III now · ~${rig.projected_7d_rig_vials} 7d need`}
          tone={rig.status === 'shortfall' ? 'red' : rig.status === 'tight' ? 'amber' : 'green'}
          icon={<HealthAndSafetyOutlined />}
        />
        <ForecastStatCard
          label="FIFO Stockout / Expiry"
          value={
            vr.projected_stockout_date
              ? vr.projected_stockout_date
              : vr.expiring_unused_vials > 0
                ? `${vr.expiring_unused_vials} unused`
                : 'Covered'
          }
          subtitle={
            vr.projected_stockout_date
              ? 'Projected ARV stockout date (FIFO expiry applied)'
              : vr.expiring_unused_vials > 0
                ? 'Vials expiring within 30d before projected use'
                : `${vr.high_wastage_days_next_7d} low-volume open-vial day(s) next 7d`
          }
          tone={fifoWatchTone}
          icon={vr.projected_stockout_date ? <ErrorOutlineOutlined /> : <ScheduleOutlined />}
        />
      </Box>

      {/* Main Daily Follow-Up Vial Forecast Table */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', p: { xs: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Box>
            <Typography component="h2" sx={{ fontSize: 15, fontWeight: 800, color: 'var(--text-h, #0f172a)' }}>
              Daily Follow-Up Demand &amp; Open-Vial Forecast ({data.horizon_days} Days)
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.25 }}>
              Uses per-day <code>ceil(doses / doses_per_vial)</code> without carrying opened vials across clinic days,
              splitting active ARV brands, and excluding expired batches on their expiry cutoff date.
            </Typography>
          </Box>
          {vr.high_wastage_days_next_7d > 0 && (
            <Chip
              size="small"
              icon={<WarningAmberOutlined sx={{ fontSize: 15 }} />}
              label={`${vr.high_wastage_days_next_7d} high-wastage day(s) in next 7d`}
              sx={{
                bgcolor: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                fontWeight: 700,
                fontSize: 11.5,
              }}
            />
          )}
        </Box>

        <div
          className="vf-table-wrapper"
          tabIndex={0}
          role="region"
          aria-labelledby={captionId}
        >
          <table className="vf-table">
            <caption id={captionId}>
              Daily follow-up vaccination schedule, expected walk-in Day 0 doses, open-vial requirements, leftover doses, and projected FIFO stock balance.
            </caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Scheduled Follow-Ups</th>
                <th scope="col" className="vf-num">Est. Walk-In / Waiting D0</th>
                <th scope="col" className="vf-num">Vials Needed (Open-Vial)</th>
                <th scope="col" className="vf-num">IM Conservative</th>
                <th scope="col" className="vf-num">Open-Vial Leftover</th>
                <th scope="col" className="vf-num">Projected Stock After Day</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.daily_schedule.map((row) => {
                const doseText = formatDoseBreakdown(row);
                const rowClass =
                  row.status === 'shortfall'
                    ? 'vf-row-shortfall'
                    : row.status === 'closed'
                      ? 'vf-row-closed'
                      : '';
                return (
                  <tr key={row.date} className={rowClass}>
                    <th scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <span>{row.day_label}</span>
                        {row.is_today && (
                          <Chip
                            size="small"
                            label="Today"
                            sx={{ height: 19, fontSize: 10.5, fontWeight: 700, bgcolor: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}
                          />
                        )}
                        {!row.is_open && (
                          <Chip
                            size="small"
                            label="Closed"
                            sx={{ height: 19, fontSize: 10.5, fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }}
                          />
                        )}
                      </Box>
                    </th>

                    <td>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                          {row.committed_followups} {row.committed_followups === 1 ? 'visit' : 'visits'}
                        </Typography>
                        {doseText && (
                          <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                            {doseText}
                          </Typography>
                        )}
                      </Box>
                    </td>

                    <td className="vf-num">
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {row.expected_walkin_d0}
                      </Typography>
                      {row.is_today && row.waiting_room_d0 > 0 && (
                        <Typography sx={{ fontSize: 11, color: '#0f766e' }}>
                          incl. {row.waiting_room_d0} waiting queue
                        </Typography>
                      )}
                    </td>

                    <td className="vf-num">
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: row.shortfall_vials > 0 ? '#dc2626' : '#0f172a' }}>
                        {row.vials_realistic} {row.vials_realistic === 1 ? 'vial' : 'vials'}
                      </Typography>
                      {row.vials_committed_only !== row.vials_realistic && (
                        <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                          {row.vials_committed_only} follow-up floor
                        </Typography>
                      )}
                    </td>

                    <td className="vf-num">
                      <Typography sx={{ fontSize: 12.5, color: '#475569' }}>
                        {row.vials_conservative_im}
                      </Typography>
                    </td>

                    <td className="vf-num">
                      {row.high_wastage_risk ? (
                        <Tooltip title="Low daily patient volume opens a multidose vial with unused doses at end of day. Consider grouping follow-ups or scheduling overdue recall patients on this day.">
                          <Chip
                            size="small"
                            label={`${row.open_vial_leftover_doses} unused · Wastage risk`}
                            sx={{
                              height: 22,
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
                          {row.open_vial_leftover_doses > 0 ? `${row.open_vial_leftover_doses} dose(s)` : '—'}
                        </Typography>
                      )}
                    </td>

                    <td className="vf-num">
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: row.shortfall_vials > 0 ? '#dc2626' : row.status === 'tight' ? '#d97706' : '#059669',
                        }}
                      >
                        {row.projected_stock_after} vials
                      </Typography>
                      {row.expired_before_day_vials > 0 && (
                        <Typography sx={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                          −{row.expired_before_day_vials} expired
                        </Typography>
                      )}
                      {row.shortfall_vials > 0 && (
                        <Typography sx={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
                          Short {row.shortfall_vials} vial(s)
                        </Typography>
                      )}
                    </td>

                    <td>
                      {row.status === 'shortfall' && (
                        <Chip
                          size="small"
                          label="Shortfall"
                          sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        />
                      )}
                      {row.status === 'tight' && (
                        <Chip
                          size="small"
                          label="Tight"
                          sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}
                        />
                      )}
                      {row.status === 'ok' && (
                        <Chip
                          size="small"
                          label="Covered"
                          sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                        />
                      )}
                      {row.status === 'closed' && (
                        <Chip
                          size="small"
                          label="Clinic Closed"
                          sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Paper>

      {/* Bottom 2-Column Breakdown: Active Brand Pool & Expiring-Before-Use Batches */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <Inventory2Outlined sx={{ fontSize: 18, color: '#0f766e' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--text-h, #0f172a)' }}>
              Active ARV Brand Supply &amp; Scheduled Demand
            </Typography>
          </Box>
          {data.brand_summary.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
              No active unexpired ARV batches or upcoming scheduled appointments found.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {data.brand_summary.map((item) => (
                <Box
                  key={item.brand}
                  sx={{
                    p: 1.25,
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9',
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      {item.brand}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
                      {item.usable_vials !== null
                        ? `${item.usable_vials} usable vial(s) · ${item.doses_per_vial} dose(s)/vial${item.earliest_expiry ? ` · earliest exp ${item.earliest_expiry}` : ''}`
                        : 'Follow-ups without a recorded brand (pooled against any active ARV)'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75}>
                    <Chip
                      size="small"
                      label={`7d: ${item.scheduled_doses_7d} doses`}
                      sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#f0fdfa', color: '#0f766e' }}
                    />
                    <Chip
                      size="small"
                      label={`14d: ${item.scheduled_doses_14d} doses`}
                      sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <WarningAmberOutlined sx={{ fontSize: 18, color: data.expiring_before_use_batches.length > 0 ? '#d97706' : '#059669' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--text-h, #0f172a)' }}>
              FIFO Expiring-Before-Use Watch (Next 30 Days)
            </Typography>
          </Box>
          {data.expiring_before_use_batches.length === 0 ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: '10px',
                border: '1px solid #a7f3d0',
                bgcolor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CheckCircleOutlined sx={{ fontSize: 18, color: '#059669' }} />
              <Typography sx={{ fontSize: 12.5, color: '#065f46', fontWeight: 600 }}>
                No ARV batches are projected to expire unused within the next 30 days under current FIFO demand.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {data.expiring_before_use_batches.map((b) => (
                <Box
                  key={b.inventory_id}
                  sx={{
                    p: 1.25,
                    borderRadius: '10px',
                    border: '1px solid #fde68a',
                    bgcolor: '#fffbeb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                      {b.vaccine_type} · Batch {b.batch_number}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: '#b45309' }}>
                      Expires {b.expiration_date} ({b.days_until_expiry}d) · Current stock: {b.current_quantity} vials
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={`${b.projected_unused_vials} est. unused`}
                    sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Stack>
  );
}
