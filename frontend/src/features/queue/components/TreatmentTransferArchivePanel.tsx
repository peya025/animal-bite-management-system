import { Box, Chip, Paper, Tooltip, IconButton, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
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

  if (!loading && entries.length === 0) return null;

  const sortedEntries = [...entries].sort((a, b) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return a.queue_number - b.queue_number;
  });

  const activeCount = sortedEntries.filter(entry => ['waiting', 'called', 'serving', 'in_consultation'].includes(entry.status)).length;
  const completedCount = sortedEntries.filter(entry => entry.status === 'completed').length;

  return (
    <Paper elevation={0} sx={{ border: '1px solid #dbeafe', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderBottom: '1px solid #bfdbfe',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: 16 }}>↗</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a', lineHeight: 1.2 }}>
              Transferred to Treatment
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#1d4ed8' }}>
              Patients already endorsed by the doctor to the treatment nurse queue
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, bgcolor: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 1.5, fontSize: 11, fontWeight: 700 }}>
            {sortedEntries.length} Total
          </Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 1.5, fontSize: 11, fontWeight: 700 }}>
            {activeCount} In Treatment Queue
          </Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, bgcolor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 1.5, fontSize: 11, fontWeight: 700 }}>
            {completedCount} Completed
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
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
    </Paper>
  );
}
