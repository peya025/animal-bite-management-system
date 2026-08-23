import { useState } from 'react';
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
  mode?: 'complete' | 'transfer' | 'treatment';
}

export function CompleteDialog({ open, entry, onClose, onDone, mode = 'complete' }: CompleteDialogProps) {
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');

  const resetState = () => {
    setNotes('');
    setShowConfirm(false);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const doComplete = async () => {
    if (!entry) return;
    setSaving(true);
    setError('');
    try {
      await completeQueueConsultation(entry.queue_id, notes);
      onDone();
      onClose();
    } catch (err: unknown) {
      const response = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response
        : undefined;
      const msg = response?.data?.message ?? 'Failed to complete the queue action. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const isTransferMode = mode === 'transfer';
  const isTreatmentMode = mode === 'treatment';
  const dialogTitle = isTransferMode
    ? 'Transfer to Treatment'
    : isTreatmentMode
      ? 'Complete Treatment'
      : 'Complete Consultation';
  const notesLabel = isTransferMode
    ? 'Transfer Notes (optional)'
    : isTreatmentMode
      ? 'Treatment Notes (optional)'
      : 'Consultation Notes (optional)';
  const notesPlaceholder = isTransferMode
    ? 'Notes for the treatment nurse, reminders, endorsements…'
    : isTreatmentMode
      ? 'Summary of treatment given, vaccination details, recommendations…'
      : 'Summary of consultation, recommendations…';
  const actionLabel = isTransferMode
    ? 'Transfer to Treatment'
    : isTreatmentMode
      ? 'Complete Treatment'
      : 'Mark Complete';
  const confirmLabel = isTransferMode
    ? 'Yes, Transfer'
    : isTreatmentMode
      ? 'Yes, Complete Treatment'
      : 'Yes, Complete';
  const confirmMessage = isTransferMode
    ? <>Transfer <strong>{entry?.patient.name}</strong> to the treatment nurse queue?</>
    : isTreatmentMode
      ? <>Mark treatment for <strong>{entry?.patient.name}</strong> as complete?</>
      : <>Mark consultation for <strong>{entry?.patient.name}</strong> as complete?</>;

  return (
    <>
      <Dialog open={open && !showConfirm} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialogTitle}</DialogTitle>
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
            label={notesLabel}
            placeholder={notesPlaceholder}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CompleteIcon />}
            onClick={() => setShowConfirm(true)}
          >
            {actionLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {showConfirm && entry && (
        <ConfirmationDialog
          variant="success"
          title={dialogTitle}
          message={confirmMessage}
          confirmLabel={confirmLabel}
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
