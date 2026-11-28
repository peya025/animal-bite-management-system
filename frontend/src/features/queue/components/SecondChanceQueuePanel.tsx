import { useState, useEffect } from 'react';
import { Box, Typography, Tooltip, IconButton, Chip, Paper, Collapse, Button, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isFinal = status === 'final_recall';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1.25, py: 0.3,
      bgcolor: isFinal ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2') : (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5'),
      color: isFinal ? '#dc2626' : (isDark ? '#34d399' : '#059669'),
      border: `1px solid ${isFinal ? (isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca') : (isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0')}`,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(() => entries.length > 0);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const handleBringBack = async (entry: QueueEntry) => {
    if (submittingId !== null || loading || entry.call_count >= 3) return;
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
        border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #a7f3d0',
        borderRadius: 3,
        bgcolor: isDark ? '#111827' : '#f0fdf4',
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
          background: isDark
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)'
            : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderBottom: expanded ? (isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #a7f3d0') : 'none',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 0.15s ease',
          '&:hover': {
            background: isDark
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.22) 100%)'
              : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: 2,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
          }}>
            <Typography sx={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>↩</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: isDark ? '#ffffff' : '#064e3b', lineHeight: 1.2 }}>
              Second Chance Queue
            </Typography>
            <Typography sx={{ fontSize: 12, color: isDark ? '#a7f3d0' : '#047857' }}>
              Patients who missed their call — awaiting recall or return to queue
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${entries.length} patient${entries.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{
              bgcolor: entries.length > 0 ? '#059669' : (isDark ? 'rgba(255,255,255,0.1)' : '#9ca3af'),
              color: '#fff',
              fontWeight: 700,
              fontSize: 11,
            }}
          />
          <IconButton size="small" sx={{ color: isDark ? '#a7f3d0' : '#059669' }}>
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
                  id={`queue-second-chance-${entry.queue_id}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isFinalRecall ? (isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2') : (isDark ? '#1f2937' : '#ffffff'),
                    border: `1px solid ${isFinalRecall ? (isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca') : (isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb')}`,
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                  }}
                >
                  {/* Queue number */}
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2,
                    bgcolor: isFinalRecall ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2') : (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Typography sx={{
                      fontWeight: 800, fontSize: 15,
                      color: isFinalRecall ? '#dc2626' : (isDark ? '#34d399' : '#059669'),
                    }}>
                      {entry.queue_number}
                    </Typography>
                  </Box>

                  {/* Patient info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: isDark ? '#ffffff' : '#111827', lineHeight: 1.2 }}>
                        {entry.patient.name}
                      </Typography>
                      <StageTag status={entry.status} />
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#6b7280', mt: 0.3 }}>
                      {entry.patient.age}y · {entry.patient.gender}
                      &nbsp;·&nbsp;
                      <Box component="span" sx={{ color: isDark ? '#34d399' : '#059669', fontWeight: 600 }}>
                        {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
                      </Box>
                      &nbsp;·&nbsp;missed {missedTime}
                      {entry.call_count > 0 && (
                        <Box component="span" sx={{
                          ml: 0.5,
                          color: entry.call_count >= 3 ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#a78bfa' : '#7e22ce'),
                          fontWeight: 600,
                        }}>
                          · No Response {Math.min(entry.call_count, 3)}/3
                        </Box>
                      )}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {/* Bring Back */}
                    {canManage && onReturnToQueue && (
                      <Tooltip title={entry.call_count >= 3 ? "Patient did not respond 3 times. Please return to Registration for check-in." : ""}>
                        <span>
                          <Button
                            size="small"
                            disabled={submittingId !== null || loading || entry.call_count >= 3}
                            onClick={() => handleBringBack(entry)}
                            sx={{
                              textTransform: 'none',
                              fontSize: 12,
                              fontWeight: 600,
                              px: 1.75,
                              py: 0.5,
                              borderRadius: '6px',
                              border: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #a7f3d0',
                              bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                              color: isDark ? '#34d399' : '#047857',
                              lineHeight: 1.4,
                              whiteSpace: 'nowrap',
                              boxShadow: 'none',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                bgcolor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#d1fae5',
                                borderColor: isDark ? '#10b981' : '#6ee7b7',
                                color: isDark ? '#a7f3d0' : '#065f46',
                                boxShadow: 'none',
                              },
                              '&:disabled': {
                                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f3f4f6',
                                color: isDark ? '#6b7280' : '#9ca3af',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb',
                                cursor: 'not-allowed',
                                pointerEvents: 'auto',
                              },
                            }}
                          >
                            Bring Back
                          </Button>
                        </span>
                      </Tooltip>
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
