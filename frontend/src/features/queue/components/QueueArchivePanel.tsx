import { Box, Typography, Chip, Paper, Tooltip, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import type { QueueEntry } from '../types';
import { STATUS_CFG, VISIT_LABEL, CATEGORY_LABEL } from '../types';
import { buildRoute, ROUTES } from '../../../shared/config/routes';

interface QueueArchivePanelProps {
  entries: QueueEntry[];
  loading?: boolean;
}

function timeLabel(entry: QueueEntry): string {
  const ts =
    entry.completed_at ??
    entry.cancelled_at ??
    entry.absent_at ??
    entry.no_response_at;
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function QueueArchivePanel({ entries, loading }: QueueArchivePanelProps) {
  const navigate = useNavigate();

  // Group by status
  const grouped: Record<string, QueueEntry[]> = {
    completed:   entries.filter(e => e.status === 'completed'),
    cancelled:   entries.filter(e => e.status === 'cancelled'),
    absent:      entries.filter(e => e.status === 'absent'),
    no_response: entries.filter(e => e.status === 'no_response'),
  };

  const totalArchived = entries.length;

  if (!loading && totalArchived === 0) return null;

  const groupConfig = [
    { key: 'completed',   label: 'Completed',    bg: '#ecfdf5', border: '#a7f3d0', color: '#059669', dot: '#10b981' },
    { key: 'cancelled',   label: 'Cancelled',    bg: '#f3f4f6', border: '#e5e7eb', color: '#374151', dot: '#6b7280' },
    { key: 'absent',      label: 'No-Show',      bg: '#f1f5f9', border: '#e2e8f0', color: '#475569', dot: '#94a3b8' },
    { key: 'no_response', label: 'No Response',  bg: '#fdf4ff', border: '#e9d5ff', color: '#7e22ce', dot: '#9333ea' },
  ];

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, overflow: 'hidden', mb: 3 }}>

      {/* ── Header ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 3, py: 2,
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 15 }}>📋</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1e293b', lineHeight: 1.2 }}>
              Queue Archive
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
              Completed, cancelled, and no-show entries for today
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {groupConfig.map(g => grouped[g.key].length > 0 && (
            <Box key={g.key} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.4,
              bgcolor: g.bg, color: g.color,
              border: `1px solid ${g.border}`,
              borderRadius: 1.5, fontSize: 11, fontWeight: 700,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: g.dot }} />
              {grouped[g.key].length} {g.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Groups ── */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groupConfig.map(g => {
          const groupEntries = grouped[g.key];
          if (groupEntries.length === 0) return null;
          return (
            <Box key={g.key}>
              {/* Group label */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: g.dot }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {g.label} ({groupEntries.length})
                </Typography>
              </Box>

              {/* Entries */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {groupEntries.map(entry => {
                  const statusCfg = STATUS_CFG[entry.status];
                  const categoryLabel = CATEGORY_LABEL[entry.queue_category] ?? entry.queue_category;
                  return (
                    <Box key={entry.queue_id} sx={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      px: 2, py: 1.25,
                      borderRadius: 2,
                      bgcolor: g.bg,
                      border: `1px solid ${g.border}`,
                      opacity: 0.9,
                    }}>
                      {/* Queue number */}
                      <Box sx={{
                        width: 34, height: 34, borderRadius: 1.5,
                        bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#475569' }}>
                          {entry.queue_number}
                        </Typography>
                      </Box>

                      {/* Patient info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1e293b', lineHeight: 1.2 }}>
                          {entry.patient.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.2 }}>
                          {entry.patient.age}y · {entry.patient.gender}
                          &nbsp;·&nbsp;{VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
                          &nbsp;·&nbsp;{categoryLabel}
                        </Typography>
                      </Box>

                      {/* Status + time */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Chip
                          size="small"
                          label={statusCfg.label}
                          sx={{ bgcolor: statusCfg.bg, color: statusCfg.color, fontWeight: 700, fontSize: 10, height: 20 }}
                        />
                        <Typography sx={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {timeLabel(entry)}
                        </Typography>
                      </Box>

                      {/* View */}
                      <Tooltip title="View patient details">
                        <IconButton
                          size="small"
                          onClick={() => navigate(buildRoute(ROUTES.QUEUE.PATIENT_DETAIL, { queueId: entry.queue_id }))}
                          sx={{
                            color: '#64748b', bgcolor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '7px', width: 28, height: 28,
                            flexShrink: 0,
                            '&:hover': { bgcolor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' },
                          }}
                        >
                          <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} strokeWidth={2.2} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
