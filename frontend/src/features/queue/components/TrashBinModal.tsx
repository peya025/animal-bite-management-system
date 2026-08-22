import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Tooltip, IconButton,
} from '@mui/material';
import { Restore as RestoreIcon } from '@mui/icons-material';
import type { QueueEntry } from '../types';
import { VISIT_LABEL, STATUS_CFG } from '../types';
import { fetchTrashedEntries, restoreQueueEntry } from '../services';

interface TrashBinModalProps {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export default function TrashBinModal({ open, onClose, onRestored }: TrashBinModalProps) {
  const [entries,   setEntries]   = useState<QueueEntry[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [error,     setError]     = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTrashedEntries();
      setEntries(data);
    } catch {
      setError('Failed to load trash bin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleRestore = async (entry: QueueEntry) => {
    setRestoring(entry.queue_id);
    try {
      await restoreQueueEntry(entry.queue_id);
      await load();
      onRestored();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to restore entry. Please try again.');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        borderBottom: '1px solid #e5e7eb', bgcolor: '#fafafa', pb: 1.5,
      }}>
        <RestoreIcon sx={{ color: '#dc2626' }} />
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#173d29', fontFamily: 'inherit' }}>
          Trash Bin
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#9ca3af', fontFamily: 'inherit' }}>
          — Today's removed queue entries
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 1, minHeight: 180 }}>
        {error && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2, color: '#dc2626', fontSize: 13 }}>
            {error}
          </Box>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: '#10b981' }} />
          </Box>
        ) : entries.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography sx={{ fontSize: 14, color: '#9ca3af' }}>No trashed entries for today</Typography>
          </Box>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['Queue #', 'Patient', 'Visit Type', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const statusCfg = STATUS_CFG[entry.status] ?? STATUS_CFG.cancelled;
                return (
                  <tr key={entry.queue_id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '10px 10px' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 1.5, bgcolor: '#eff6ff' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#3b82f6' }}>{entry.queue_number}</Typography>
                      </Box>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{entry.patient.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>{entry.patient.age}y · {entry.patient.gender}</Typography>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, bgcolor: '#f3f4f6', borderRadius: 1, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
                      </Box>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, bgcolor: statusCfg.bg, color: statusCfg.color, borderRadius: 1, fontSize: 12, fontWeight: 600 }}>
                        {statusCfg.label}
                      </Box>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <Tooltip title="Restore to queue">
                        <IconButton
                          size="small"
                          disabled={restoring === entry.queue_id}
                          onClick={() => handleRestore(entry)}
                          sx={{ color: '#059669', bgcolor: '#ecfdf5', borderRadius: 1.5, '&:hover': { bgcolor: '#d1fae5' } }}
                        >
                          {restoring === entry.queue_id
                            ? <CircularProgress size={16} sx={{ color: '#059669' }} />
                            : <RestoreIcon sx={{ fontSize: 18 }} />
                          }
                        </IconButton>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb', bgcolor: '#fafafa' }}>
        <Button onClick={onClose} sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600, fontFamily: 'inherit' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
