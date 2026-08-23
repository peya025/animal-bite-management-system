import { useState } from 'react';
import { Box, Chip, Paper, Tooltip, IconButton, Typography, Collapse } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import type { QueueEntry } from '../types';
import { CATEGORY_LABEL, STATUS_CFG, VISIT_LABEL } from '../types';
import { buildRoute, ROUTES } from '../../../shared/config/routes';

interface TreatmentTransferArchivePanelProps {
  entries: QueueEntry[];
  loading?: boolean;
}

function statusRank(status: QueueEntry['status']): number {
  switch (status) {
    case 'waiting':
      return 0;
    case 'called':
      return 1;
    case 'serving':
      return 2;
    case 'in_consultation':
      return 2;
    case 'completed':
      return 3;
    case 'cancelled':
    case 'absent':
    case 'no_response':
      return 4;
    default:
      return 5;
  }
}

export function TreatmentTransferArchivePanel({ entries, loading }: TreatmentTransferArchivePanelProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (!loading && entries.length === 0) return null;

  const sortedEntries = [...entries].sort((a, b) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return a.queue_number - b.queue_number;
  });

  const activeCount = sortedEntries.filter(entry => ['waiting', 'called', 'serving', 'in_consultation'].includes(entry.status)).length;
  const completedCount = sortedEntries.filter(entry => entry.status === 'completed').length;

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
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
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#334155' }}>
            Transferred to Treatment ({sortedEntries.length})
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#64748b' }}>
            • Endorsed to treatment nurse queue ({activeCount} active, {completedCount} completed)
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
            const statusCfg = STATUS_CFG[entry.status] ?? STATUS_CFG.cancelled;
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
                  bgcolor: '#f8fbff',
                  border: '1px solid #dbeafe',
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#2563eb' }}>
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

                <Chip
                  size="small"
                  label={statusCfg.label}
                  sx={{ bgcolor: statusCfg.bg, color: statusCfg.color, fontWeight: 700, fontSize: 10, height: 20 }}
                />

                <Tooltip title="View patient details">
                  <IconButton
                    size="small"
                    onClick={() => navigate(buildRoute(ROUTES.QUEUE.PATIENT_DETAIL, { queueId: entry.queue_id }))}
                    sx={{
                      color: '#2563eb',
                      bgcolor: '#fff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '7px',
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                      '&:hover': { bgcolor: '#eff6ff', color: '#1d4ed8', borderColor: '#93c5fd' },
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
