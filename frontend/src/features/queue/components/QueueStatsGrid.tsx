import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import {
  AccessTime as WaitIcon,
  Cancel as CancelIcon,
  CheckCircle as DoneIcon,
  PeopleAlt as TotalIcon,
  LocalHospital as ConsultIcon,
} from '@mui/icons-material';
import StatCard from '../../../components/common/StatCard';
import type { QueueStats } from '../types';
import { VISIT_LABEL } from '../types';

interface QueueStatsGridProps {
  stats: QueueStats | null;
}

export function QueueStatsGrid({ stats }: QueueStatsGridProps) {
  const statCardsData = [
    { label: 'Total Today',     value: stats?.total           ?? '-', icon: <TotalIcon />,   color: 'primary' as const },
    { label: 'Waiting',         value: stats?.waiting         ?? '-', icon: <WaitIcon />,    color: 'info' as const    },
    { label: 'In Consultation', value: stats?.in_consultation ?? '-', icon: <ConsultIcon />, color: 'warning' as const },
    { label: 'Completed',       value: stats?.completed       ?? '-', icon: <DoneIcon />,    color: 'success' as const },
    { label: 'Cancelled',       value: stats?.cancelled       ?? '-', icon: <CancelIcon />,  color: 'error' as const   },
  ] as const;

  return (
    <>
      {/* Stat Cards Grid (5-column layout matching Vaccine Inventory) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        {statCardsData.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} total={stats?.total} loading={!stats} />
        ))}
      </Box>

      {/* Progress Bar */}
      {stats && stats.total > 0 && (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'var(--table-row-border)',
            borderRadius: 3,
            background: 'var(--card-bg)',
            p: 3,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>Today's Progress</Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {stats.completed} of {stats.total} done ({Math.round((stats.completed / stats.total) * 100)}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.round((stats.completed / stats.total) * 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'var(--table-row-border)',
              '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 },
            }}
          />
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
