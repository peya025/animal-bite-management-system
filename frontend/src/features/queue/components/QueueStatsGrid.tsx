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

import { useTheme } from '@mui/material/styles';

export function QueueKPIStrip({ stats, onWaitingClick }: QueueKPIStripProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isCalledActive = (stats?.called ?? 0) > 0;
  const total = stats?.total || 1;

  const cards = [
    {
      id: 'waiting',
      label: 'Waiting',
      value: stats?.waiting ?? 0,
      icon: <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={2} />,
      isWaiting: true,
      isCalled: false,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      percent: Math.min(100, Math.round(((stats?.waiting ?? 0) / total) * 100)),
    },
    {
      id: 'called',
      label: 'Called',
      value: stats?.called ?? 0,
      icon: <HugeiconsIcon icon={CallIcon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: isCalledActive,
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      percent: Math.min(100, Math.round(((stats?.called ?? 0) / total) * 100)),
    },
    {
      id: 'serving',
      label: 'Serving',
      value: (stats?.serving ?? 0) + (stats?.in_consultation ?? 0),
      subtitle: stats?.active_servers && stats.active_servers.length > 0
        ? stats.active_servers.slice(0, 2).join(', ')
        : undefined,
      icon: <HugeiconsIcon icon={Stethoscope02Icon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: false,
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.4)',
      percent: Math.min(100, Math.round((((stats?.serving ?? 0) + (stats?.in_consultation ?? 0)) / total) * 100)),
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats?.completed ?? 0,
      icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: false,
      color: '#34d399',
      glow: 'rgba(52, 211, 153, 0.4)',
      percent: Math.min(100, Math.round(((stats?.completed ?? 0) / total) * 100)),
    },
    {
      id: 'total',
      label: 'Total Today',
      value: stats?.total ?? 0,
      icon: <HugeiconsIcon icon={UserMultiple02Icon} size={18} strokeWidth={2} />,
      isWaiting: false,
      isCalled: false,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      percent: 100,
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
        mb: 2,
      }}
    >
      {cards.map((card) => {
        return (
          <Box
            key={card.id}
            onClick={card.isWaiting ? onWaitingClick : undefined}
            sx={{
              p: '16px 16px 14px',
              borderRadius: '20px',
              position: 'relative',
              overflow: 'hidden',
              cursor: card.isWaiting && onWaitingClick ? 'pointer' : 'default',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 116,
              ...(isDark
                ? {
                    background: 'radial-gradient(ellipse at 30% 0%, #1e2e22 0%, #121c15 55%, #0a110d 100%)',
                    border: '1px solid rgba(163, 230, 53, 0.3)',
                    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 25px -4px rgba(163, 230, 53, 0.2), inset 0 1px 2px 0 rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(163, 230, 53, 0.12)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      borderColor: 'rgba(163, 230, 53, 0.55)',
                      boxShadow: `0 14px 34px -4px rgba(0, 0, 0, 0.7), 0 0 35px -2px rgba(163, 230, 53, 0.35), inset 0 1px 3px 0 rgba(255, 255, 255, 0.3)`,
                    },
                  }
                : {
                    background: 'radial-gradient(ellipse at 30% 0%, #ecfdf5 0%, #f4fbf7 45%, #ffffff 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.32)',
                    boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.15), 0 0 18px -3px rgba(132, 204, 22, 0.15), inset 0 1px 2px 0 rgba(255, 255, 255, 0.95), inset 0 0 0 1px rgba(16, 185, 129, 0.12)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      borderColor: 'rgba(16, 185, 129, 0.55)',
                      boxShadow: `0 12px 28px -4px rgba(16, 185, 129, 0.25), 0 0 25px -2px rgba(132, 204, 22, 0.22), inset 0 1px 2px 0 rgba(255, 255, 255, 1)`,
                    },
                  }),
            }}
          >
            {/* Top row: Label & Icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a7f3d0' : '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {card.label}
                </Typography>
                {card.isCalled && (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: '#f59e0b',
                      boxShadow: '0 0 8px #f59e0b',
                      animation: 'pulse 1.5s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(0.95)', opacity: 0.8 },
                        '70%': { transform: 'scale(1.2)', opacity: 1 },
                        '100%': { transform: 'scale(0.95)', opacity: 0.8 },
                      },
                    }}
                  />
                )}
              </Box>
              <Box
                sx={{
                  color: card.color,
                  p: 0.75,
                  bgcolor: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.1)',
                  border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </Box>
            </Box>

            {/* Metric Value */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 38, fontWeight: 800, color: isDark ? '#ffffff' : '#064e3b', lineHeight: 1, letterSpacing: '-1px' }}>
                {card.value}
              </Typography>
              {card.subtitle && (
                <Typography sx={{ fontSize: 11, color: '#0f766e', fontWeight: 500, mt: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {card.subtitle}
                </Typography>
              )}
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
        gap: { xs: 1.5, sm: 2 },
        py: 1,
        px: 1.5,
        mb: 2,
        borderRadius: '16px',
        fontSize: 12,
        ...(isDark
          ? {
              background: 'radial-gradient(ellipse at 30% 0%, #16241b 0%, #0d1612 100%)',
              border: '1px solid rgba(163, 230, 53, 0.2)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
            }
          : {
              background: 'radial-gradient(ellipse at 30% 0%, #f0fdf4 0%, #ffffff 100%)',
              border: '1px solid rgba(16, 185, 129, 0.22)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)',
            }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: '10px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)', border: isDark ? '1px solid rgba(163, 230, 53, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)' }}>
        <HugeiconsIcon icon={UserCheck01Icon} size={15} strokeWidth={1.8} style={{ color: '#34d399' }} />
        <span style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>Second Chance: <strong style={{ color: secondChance > 0 ? '#fb923c' : (isDark ? '#ffffff' : '#111827') }}>{secondChance}</strong></span>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: '10px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)', border: isDark ? '1px solid rgba(163, 230, 53, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)' }}>
        <HugeiconsIcon icon={UserBlock01Icon} size={15} strokeWidth={1.8} style={{ color: '#f87171' }} />
        <span style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>Final Recall: <strong style={{ color: finalRecall > 0 ? '#f87171' : (isDark ? '#ffffff' : '#111827') }}>{finalRecall}</strong></span>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: '10px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)', border: isDark ? '1px solid rgba(163, 230, 53, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)' }}>
        <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={1.8} style={{ color: '#94a3b8' }} />
        <span style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>Cancelled / Absent: <strong style={{ color: isDark ? '#ffffff' : '#111827' }}>{absentCancelled}</strong></span>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: '10px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)', border: isDark ? '1px solid rgba(163, 230, 53, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)' }}>
        <HugeiconsIcon icon={UserBlock01Icon} size={15} strokeWidth={1.8} style={{ color: '#c084fc' }} />
        <span style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>No Response: <strong style={{ color: noResponse > 0 ? '#c084fc' : (isDark ? '#ffffff' : '#111827') }}>{noResponse}</strong></span>
      </Box>
    </Box>
  );
}

interface QueueProgressBarProps {
  stats: QueueStats | null;
}

export function QueueProgressBar({ stats }: QueueProgressBarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (!stats || stats.total <= 0) return null;

  const percentage = Math.min(100, Math.round((stats.completed / stats.total) * 100));
  const secondChanceTotal = (stats.second_chance ?? 0) + (stats.final_recall ?? 0);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '20px',
        p: 2.5,
        mt: 3,
        mb: 2,
        ...(isDark
          ? {
              background: 'radial-gradient(ellipse at 30% 0%, #1e2e22 0%, #121c15 55%, #0a110d 100%)',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 25px -4px rgba(163, 230, 53, 0.2), inset 0 1px 2px 0 rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(163, 230, 53, 0.12)',
            }
          : {
              background: 'radial-gradient(ellipse at 30% 0%, #ecfdf5 0%, #f4fbf7 45%, #ffffff 100%)',
              border: '1px solid rgba(16, 185, 129, 0.32)',
              boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.15), 0 0 18px -3px rgba(132, 204, 22, 0.15), inset 0 1px 2px 0 rgba(255, 255, 255, 0.95), inset 0 0 0 1px rgba(16, 185, 129, 0.12)',
            }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, color: isDark ? '#ffffff' : '#064e3b', letterSpacing: '-0.2px' }}>
          Today's Queue Progress
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {secondChanceTotal > 0 && (
            <Typography sx={{ fontSize: 11.5, color: '#fb923c', fontWeight: 600 }}>
              ↩ {secondChanceTotal} in recall queue
            </Typography>
          )}
          <Typography sx={{ fontSize: 12.5, color: isDark ? '#a7f3d0' : '#047857', fontWeight: 700 }}>
            {stats.completed} of {stats.total} completed ({percentage}%)
          </Typography>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box sx={{ position: 'relative', height: 8, borderRadius: 999, bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(16, 185, 129, 0.12)', overflow: 'hidden' }}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: 'transparent',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
              borderRadius: 999,
              boxShadow: isDark ? '0 0 10px rgba(52, 211, 153, 0.5)' : 'none',
            },
          }}
        />
      </Box>

      {stats.by_visit_type && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.75 }}>
          {Object.entries(stats.by_visit_type).map(([type, count]) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981', boxShadow: isDark ? '0 0 6px #34d399' : 'none' }} />
              <Typography sx={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#4b5563' }}>
                {VISIT_LABEL[type] ?? type}: <strong style={{ color: isDark ? '#ffffff' : '#111827' }}>{String(count)}</strong>
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
