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
import type { QueueStats } from '../types';
import { VISIT_LABEL } from '../types';

interface QueueKPIStripProps {
  stats: QueueStats | null;
  onWaitingClick?: () => void;
}

export function QueueKPIStrip({ stats, onWaitingClick }: QueueKPIStripProps) {
  const isCalledActive = (stats?.called ?? 0) > 0;

  const cards = [
    {
      id: 'waiting',
      label: 'Waiting',
      value: stats?.waiting ?? 0,
      icon: <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={2} />,
      isWaiting: true,
      isCalled: false,
    },
    {
      id: 'called',
      label: 'Called',
      value: stats?.called ?? 0,
      icon: <HugeiconsIcon icon={CallIcon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: isCalledActive,
    },
    {
      id: 'serving',
      label: 'Serving',
      value: (stats?.serving ?? 0) + (stats?.in_consultation ?? 0),
      icon: <HugeiconsIcon icon={Stethoscope02Icon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: false,
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats?.completed ?? 0,
      icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: false,
    },
    {
      id: 'total',
      label: 'Total Today',
      value: stats?.total ?? 0,
      icon: <HugeiconsIcon icon={UserMultiple02Icon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: false,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(5, 1fr)',
        },
        gap: 1.5,
        mb: 1.5,
      }}
    >
      {cards.map((card) => {
        if (card.isWaiting) {
          return (
            <Box
              key={card.id}
              onClick={onWaitingClick}
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: '#eff6ff',
                border: '2px solid #2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: onWaitingClick ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(37,99,235,0.1)',
                '&:hover': onWaitingClick
                  ? {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
                    }
                  : undefined,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
                  {card.label}
                </Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#1e40af', lineHeight: 1.1, mt: 0.25 }}>
                  {card.value}
                </Typography>
              </Box>
              <Box sx={{ color: '#2563eb', p: 1, bgcolor: '#dbeafe', borderRadius: '8px', display: 'flex' }}>
                {card.icon}
              </Box>
            </Box>
          );
        }

        return (
          <Box
            key={card.id}
            sx={{
              p: 2,
              borderRadius: '12px',
              bgcolor: 'background.paper',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                  {card.label}
                </Typography>
                {card.isCalled && (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: '#f59e0b',
                      animation: 'pulse 1.5s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.7)' },
                        '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 5px rgba(245, 158, 11, 0)' },
                        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' },
                      },
                    }}
                  />
                )}
              </Box>
              <Typography sx={{ fontSize: 22, fontWeight: 600, color: '#1e293b', lineHeight: 1.1, mt: 0.25 }}>
                {card.value}
              </Typography>
            </Box>
            <Box sx={{ color: '#94a3b8', p: 1, bgcolor: '#f8fafc', borderRadius: '8px', display: 'flex' }}>
              {card.icon}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

interface SecondaryCountersRowProps {
  stats: QueueStats | null;
}

export function SecondaryCountersRow({ stats }: SecondaryCountersRowProps) {
  const secondChance = stats?.second_chance ?? 0;
  const finalRecall = stats?.final_recall ?? 0;
  const absentCancelled = (stats?.absent ?? 0) + (stats?.cancelled ?? 0);
  const noResponse = stats?.no_response ?? 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: { xs: 1.5, sm: 3 },
        py: 0.75,
        px: 1,
        mb: 2,
        color: '#64748b',
        fontSize: 12,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <HugeiconsIcon icon={UserCheck01Icon} size={15} strokeWidth={1.8} style={{ color: '#94a3b8' }} />
        <span>Second Chance: <strong style={{ color: secondChance > 0 ? '#ea580c' : '#475569' }}>{secondChance}</strong></span>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <HugeiconsIcon icon={UserBlock01Icon} size={15} strokeWidth={1.8} style={{ color: '#94a3b8' }} />
        <span>Final Recall: <strong style={{ color: finalRecall > 0 ? '#dc2626' : '#475569' }}>{finalRecall}</strong></span>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={1.8} style={{ color: '#94a3b8' }} />
        <span>Cancelled / Absent: <strong style={{ color: '#475569' }}>{absentCancelled}</strong></span>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <HugeiconsIcon icon={UserBlock01Icon} size={15} strokeWidth={1.8} style={{ color: '#94a3b8' }} />
        <span>No Response: <strong style={{ color: noResponse > 0 ? '#9333ea' : '#475569' }}>{noResponse}</strong></span>
      </Box>
    </Box>
  );
}

interface QueueProgressBarProps {
  stats: QueueStats | null;
}

export function QueueProgressBar({ stats }: QueueProgressBarProps) {
  if (!stats || stats.total <= 0) return null;

  const percentage = Math.min(100, Math.round((stats.completed / stats.total) * 100));
  const secondChanceTotal = (stats.second_chance ?? 0) + (stats.final_recall ?? 0);

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 3,
        bgcolor: 'background.paper',
        p: 2.5,
        mt: 3,
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>
          Today's Progress
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {secondChanceTotal > 0 && (
            <Typography sx={{ fontSize: 11.5, color: '#ea580c', fontWeight: 600 }}>
              ↩ {secondChanceTotal} in recall queue
            </Typography>
          )}
          <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
            {stats.completed} of {stats.total} completed ({percentage}%)
          </Typography>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box sx={{ position: 'relative', height: 7, borderRadius: 4, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: 7,
            borderRadius: 4,
            bgcolor: 'transparent',
            '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 },
          }}
        />
      </Box>

      {stats.by_visit_type && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
          {Object.entries(stats.by_visit_type).map(([type, count]) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} />
              <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
                {VISIT_LABEL[type] ?? type}: <strong style={{ color: '#1e293b' }}>{String(count)}</strong>
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}

// Backward compatibility default export
export function QueueStatsGrid({ stats }: { stats: QueueStats | null }) {
  return (
    <>
      <QueueKPIStrip stats={stats} />
      <SecondaryCountersRow stats={stats} />
    </>
  );
}
