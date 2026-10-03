import { useState, useEffect } from 'react';
import { Box, Typography, Tooltip, IconButton, Chip, Paper, Collapse, Button } from '@mui/material';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserRemove01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from '@hugeicons/core-free-icons';
import type { QueueEntry } from '../types';
import { VISIT_LABEL, timeSince } from '../types';

interface SecondChanceQueuePanelProps {
  entries: QueueEntry[];
  loading?: boolean;
  onRecall?: (entry: QueueEntry) => void;
  onReturnToQueue?: (entry: QueueEntry) => void | Promise<void>;
  onAbsent?: (entry: QueueEntry) => void;
  canManage?: boolean;
}

function StageTag({ status }: { status: string }) {
  const isFinal = status === 'final_recall';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1.25, py: 0.3,
      bgcolor: isFinal ? '#fef2f2' : '#fff7ed',
      color: isFinal ? '#dc2626' : '#ea580c',
      border: `1px solid ${isFinal ? '#fecaca' : '#fed7aa'}`,
      borderRadius: 1.5, fontSize: 10.5, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {isFinal ? '⚠ Final Recall' : '↩ Second Chance'}
    </Box>
  );
}

export function SecondChanceQueuePanel({
  entries, loading, onRecall, onReturnToQueue, onAbsent, canManage = true,
}: SecondChanceQueuePanelProps) {
  const [expanded, setExpanded] = useState(() => entries.length > 0);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const handleBringBack = async (entry: QueueEntry) => {
    if (submittingId !== null || loading) return;
    setSubmittingId(entry.queue_id);
    try {
      await onReturnToQueue?.(entry);
    } finally {
      setSubmittingId(null);
    }
  };

  // Auto-expand when a patient is moved to second chance
  useEffect(() => {
    if (entries.length > 0) {
      setExpanded(true);
    }
  }, [entries.length]);

  return (
    <Paper
      id="second-chance-panel"
      elevation={0}
      sx={{
        border: '1.5px solid #fed7aa',
        borderRadius: 3,
        bgcolor: '#fffbf7',
        overflow: 'hidden',
        mb: 3,
      }}
    >
      {/* ── Header ── */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 3, py: 2,
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          borderBottom: expanded ? '1px solid #fed7aa' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 0.15s ease',
          '&:hover': { background: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: 2,
            bgcolor: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>↩</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#9a3412', lineHeight: 1.2 }}>
              Second Chance Queue
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#c2410c' }}>
              Patients who missed their call — awaiting recall or return to queue
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${entries.length} patient${entries.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{
              bgcolor: entries.length > 0 ? '#ea580c' : '#fdba74',
              color: '#fff',
              fontWeight: 700,
              fontSize: 11,
            }}
          />
          <IconButton size="small" sx={{ color: '#ea580c' }}>
            <HugeiconsIcon icon={expanded ? ArrowUp01Icon : ArrowDown01Icon} size={18} strokeWidth={2.2} />
          </IconButton>
        </Box>
      </Box>

      {/* ── Collapsible Content ── */}
      <Collapse in={expanded}>
        {/* ── Empty state ── */}
        {!loading && entries.length === 0 && (
          <Box sx={{ py: 3.5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
              No patients currently in second chance queue
            </Typography>
          </Box>
        )}

        {/* ── Entries ── */}
        {entries.length > 0 && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {entries.map(entry => {
              const isFinalRecall = entry.status === 'final_recall';
              const missedTime = timeSince(entry.no_response_at);

              return (
                <Box
                  key={entry.queue_id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isFinalRecall ? '#fef2f2' : '#fff',
                    border: `1px solid ${isFinalRecall ? '#fecaca' : '#e5e7eb'}`,
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                  }}
                >
                  {/* Queue number */}
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2,
                    bgcolor: isFinalRecall ? '#fee2e2' : '#fff7ed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Typography sx={{
                      fontWeight: 800, fontSize: 15,
                      color: isFinalRecall ? '#dc2626' : '#ea580c',
                    }}>
                      {entry.queue_number}
                    </Typography>
                  </Box>

                  {/* Patient info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827', lineHeight: 1.2 }}>
                        {entry.patient.name}
                      </Typography>
                      <StageTag status={entry.status} />
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: '#6b7280', mt: 0.3 }}>
                      {entry.patient.age}y · {entry.patient.gender}
                      &nbsp;·&nbsp;
                      <Box component="span" sx={{ color: '#ea580c' }}>
                        {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
                      </Box>
                      &nbsp;·&nbsp;missed {missedTime}
                      {entry.call_count > 0 && (
                        <Box component="span" sx={{ ml: 0.5, color: '#9ca3af' }}>
                          · called {entry.call_count}×
                        </Box>
                      )}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {/* Bring Back */}
                    {canManage && onReturnToQueue && (
                      <Button
                        size="small"
                        disabled={submittingId !== null || loading}
                        onClick={() => handleBringBack(entry)}
                        sx={{
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          px: 1.75,
                          py: 0.5,
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                          bgcolor: '#eff6ff',
                          color: '#1d4ed8',
                          lineHeight: 1.4,
                          whiteSpace: 'nowrap',
                          boxShadow: 'none',
                          '&:hover': {
                            bgcolor: '#dbeafe',
                            borderColor: '#93c5fd',
                            boxShadow: 'none',
                          },
                          '&:disabled': {
                            bgcolor: '#f3f4f6',
                            color: '#9ca3af',
                            borderColor: '#e5e7eb',
                            cursor: 'not-allowed',
                            pointerEvents: 'auto',
                          },
                        }}
                      >
                        Bring Back
                      </Button>
                    )}

                    {/* Absent — only on final recall */}
                    {canManage && isFinalRecall && onAbsent && (
                      <Tooltip title="Mark as Absent (no more recalls)">
                        <IconButton
                          size="small"
                          onClick={() => onAbsent(entry)}
                          sx={{
                            color: '#64748b', bgcolor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px', width: 32, height: 32,
                            transition: 'all 0.15s',
                            '&:hover': {
                              bgcolor: '#fee2e2', color: '#dc2626',
                              borderColor: '#fca5a5', transform: 'translateY(-1px)',
                            },
                          }}
                        >
                          <HugeiconsIcon icon={UserRemove01Icon} size={15} strokeWidth={2.2} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Collapse>
    </Paper>
  );
}
