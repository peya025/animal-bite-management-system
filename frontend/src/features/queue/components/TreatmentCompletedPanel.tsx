import { useState } from 'react';
import { Box, Chip, Paper, Tooltip, IconButton, Typography, Collapse } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import type { QueueEntry } from '../types';
import { CATEGORY_LABEL, STATUS_CFG, VISIT_LABEL } from '../types';
import { buildRoute, ROUTES } from '../../../shared/config/routes';

interface TreatmentCompletedPanelProps {
  entries: QueueEntry[];
  loading?: boolean;
}

function completionTime(entry: QueueEntry): string {
  if (!entry.completed_at) return '—';
  return new Date(entry.completed_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TreatmentCompletedPanel({ entries, loading }: TreatmentCompletedPanelProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (!loading && entries.length === 0) return null;

  const sortedEntries = [...entries].sort((a, b) => {
    const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', mt: 3, mb: 3 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          bgcolor: '#f8fafc',
          borderBottom: expanded ? '1px solid #e2e8f0' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 0.15s ease',
          '&:hover': { bgcolor: '#f1f5f9' },
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#334155' }}>
            Completed ({sortedEntries.length})
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#64748b' }}>
            • Patients with completed visits today
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
            {expanded ? 'Hide list' : 'Show list'}
          </Typography>
          <IconButton size="small" sx={{ p: 0.5, color: '#64748b' }}>
            <HugeiconsIcon icon={expanded ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#ffffff' }}>
        {sortedEntries.map(entry => {
          const statusCfg = STATUS_CFG[entry.status] ?? STATUS_CFG.completed;
          const categoryLabel = CATEGORY_LABEL[entry.queue_category] ?? entry.queue_category;
          return (
            <Box
              key={entry.queue_id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.25,
                borderRadius: 2,
                bgcolor: '#f7fff9',
                border: '1px solid #d1fae5',
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  bgcolor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#16a34a' }}>
                  {entry.queue_number}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1f2937', lineHeight: 1.2 }}>
                  {entry.patient.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.25 }}>
                  {entry.patient.age}y · {entry.patient.gender}
                  &nbsp;·&nbsp;{VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
                  &nbsp;·&nbsp;{categoryLabel}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Chip
                  size="small"
                  label={statusCfg.label}
                  sx={{ bgcolor: statusCfg.bg, color: statusCfg.color, fontWeight: 700, fontSize: 10, height: 20 }}
                />
                <Typography sx={{ fontSize: 11, color: '#16a34a', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {completionTime(entry)}
                </Typography>
              </Box>

              <Tooltip title="View patient details">
                <IconButton
                  size="small"
                  onClick={() => navigate(buildRoute(ROUTES.QUEUE.PATIENT_DETAIL, { queueId: entry.queue_id }))}
                  sx={{
                    color: '#16a34a',
                    bgcolor: '#fff',
                    border: '1px solid #bbf7d0',
                    borderRadius: '7px',
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    '&:hover': { bgcolor: '#ecfdf5', color: '#15803d', borderColor: '#86efac' },
                  }}
                >
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} strokeWidth={2.2} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
        </Box>
      </Collapse>
    </Paper>
  );
}
