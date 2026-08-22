import { useState, useEffect } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, TextField,
} from '@mui/material';
import { Done as CompleteIcon } from '@mui/icons-material';
import type { QueueEntry } from '../types';
import { VISIT_LABEL } from '../types';
import { completeQueueConsultation } from '../services';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

interface CompleteDialogProps {
  open: boolean;
  entry: QueueEntry | null;
  onClose: () => void;
  onDone: () => void;
}

export function CompleteDialog({ open, entry, onClose, onDone }: CompleteDialogProps) {
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    setNotes('');
    setShowConfirm(false);
    setError('');
  }, [open]);

  const doComplete = async () => {
    if (!entry) return;
    setSaving(true);
    setError('');
    try {
      await completeQueueConsultation(entry.queue_id, notes);
      onDone();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to complete consultation. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showConfirm} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Complete Consultation</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {entry && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>#{entry.queue_number} · {entry.patient.name}</strong><br />
              {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
              {entry.called_at && (
                <> · Called {new Date(entry.called_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Consultation Notes (optional)"
            placeholder="Summary of consultation, recommendations…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CompleteIcon />}
            onClick={() => setShowConfirm(true)}
          >
            Mark Complete
          </Button>
        </DialogActions>
      </Dialog>

      {showConfirm && entry && (
        <ConfirmationDialog
          variant="success"
          title="Complete Consultation"
          message={<>Mark consultation for <strong>{entry.patient.name}</strong> as complete?</>}
          confirmLabel="Yes, Complete"
          cancelLabel="Go Back"
          onConfirm={() => {
            setShowConfirm(false);
            doComplete();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
