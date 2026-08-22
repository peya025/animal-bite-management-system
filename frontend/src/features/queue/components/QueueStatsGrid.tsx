import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserMultiple02Icon,
  Clock01Icon,
  CallIcon,
  UserCheck01Icon,
  Stethoscope02Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserBlock01Icon,
} from '@hugeicons/core-free-icons';
import StatCard from '../../../components/common/StatCard';
import type { QueueStats } from '../types';
import { VISIT_LABEL } from '../types';

interface QueueStatsGridProps {
  stats: QueueStats | null;
}

export function QueueStatsGrid({ stats }: QueueStatsGridProps) {
  const mainCards = [
    { label: 'Total Today',     value: stats?.total            ?? '-', icon: <HugeiconsIcon icon={UserMultiple02Icon}    size={18} />, color: 'primary' as const  },
    { label: 'Waiting',         value: stats?.waiting          ?? '-', icon: <HugeiconsIcon icon={Clock01Icon}           size={18} />, color: 'info' as const     },
    { label: 'Called',          value: stats?.called           ?? '-', icon: <HugeiconsIcon icon={CallIcon}              size={18} />, color: 'warning' as const  },
    { label: 'Serving',         value: (stats?.serving ?? 0) + (stats?.in_consultation ?? 0), icon: <HugeiconsIcon icon={Stethoscope02Icon} size={18} />, color: 'warning' as const },
    { label: 'Completed',       value: stats?.completed        ?? '-', icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />, color: 'success' as const  },
  ] as const;

  const secondChanceTotal = (stats?.second_chance ?? 0) + (stats?.final_recall ?? 0);
  const absentCancelled   = (stats?.absent        ?? 0) + (stats?.cancelled    ?? 0);

  return (
    <>
      {/* ── Main stat cards ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2, mb: 2,
      }}>
        {mainCards.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} total={stats?.total} loading={!stats} />
        ))}
      </Box>

      {/* ── Second chance + absent row ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        gap: 2, mb: 3,
      }}>
        {/* Second Chance */}
        <Box sx={{
          p: 2, borderRadius: 2.5,
          bgcolor: secondChanceTotal > 0 ? '#fff7ed' : 'var(--card-bg)',
          border: `1px solid ${secondChanceTotal > 0 ? '#fed7aa' : 'var(--table-row-border)'}`,
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{ color: '#ea580c' }}>
            <HugeiconsIcon icon={UserCheck01Icon} size={20} strokeWidth={1.8} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#ea580c', lineHeight: 1 }}>
              {stats?.second_chance ?? 0}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#c2410c', fontWeight: 600 }}>Second Chance</Typography>
          </Box>
        </Box>

        {/* Final Recall */}
        <Box sx={{
          p: 2, borderRadius: 2.5,
          bgcolor: (stats?.final_recall ?? 0) > 0 ? '#fef2f2' : 'var(--card-bg)',
          border: `1px solid ${(stats?.final_recall ?? 0) > 0 ? '#fecaca' : 'var(--table-row-border)'}`,
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{ color: '#dc2626' }}>
            <HugeiconsIcon icon={UserBlock01Icon} size={20} strokeWidth={1.8} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#dc2626', lineHeight: 1 }}>
              {stats?.final_recall ?? 0}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Final Recall</Typography>
          </Box>
        </Box>

        {/* Cancelled */}
        <Box sx={{
          p: 2, borderRadius: 2.5,
          bgcolor: 'var(--card-bg)',
          border: '1px solid var(--table-row-border)',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{ color: '#6b7280' }}>
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#374151', lineHeight: 1 }}>
              {absentCancelled}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Cancelled / Absent</Typography>
          </Box>
        </Box>

        {/* No Response */}
        <Box sx={{
          p: 2, borderRadius: 2.5,
          bgcolor: 'var(--card-bg)',
          border: '1px solid var(--table-row-border)',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{ color: '#9333ea' }}>
            <HugeiconsIcon icon={UserBlock01Icon} size={20} strokeWidth={1.8} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#9333ea', lineHeight: 1 }}>
              {stats?.no_response ?? 0}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#7e22ce', fontWeight: 600 }}>No Response</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Progress bar ── */}
      {stats && stats.total > 0 && (
        <Paper elevation={0} sx={{
          border: '1px solid', borderColor: 'var(--table-row-border)',
          borderRadius: 3, background: 'var(--card-bg)', p: 3, mb: 3,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>
              Today's Progress
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {secondChanceTotal > 0 && (
                <Typography sx={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>
                  ↩ {secondChanceTotal} in recall queue
                </Typography>
              )}
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {stats.completed} of {stats.total} done ({Math.round((stats.completed / stats.total) * 100)}%)
              </Typography>
            </Box>
          </Box>

          {/* Segmented progress bar */}
          <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: 'var(--table-row-border)', overflow: 'hidden' }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.round((stats.completed / stats.total) * 100))}
              sx={{
                height: 8, borderRadius: 4, bgcolor: 'transparent',
                '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 },
              }}
            />
          </Box>

          {stats.by_visit_type && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mt: 1.5 }}>
              {Object.entries(stats.by_visit_type).map(([type, count]) => (
                <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                  <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {VISIT_LABEL[type] ?? type}: <strong>{String(count)}</strong>
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}
