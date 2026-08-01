import { Box, Button } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

interface QueueActionsProps {
  entry: {
    queue_id: number;
    queue_number: number;
    status: string;
    patient: {
      patient_id: number;
      name: string;
    };
  };
  userRole: string;
  onEditForm2: (entry: any) => void;
  onEditForm3: (entry: any) => void;
}

/**
 * Role-based action buttons for queue entries
 * - Doctor (triage): Edit Form 2 (Individual Treatment)
 * - Nurse (treatment): Edit Form 3 (Vaccination Record)
 * - Admin: Both options
 */
export default function QueueActions({ entry, userRole, onEditForm2, onEditForm3 }: QueueActionsProps) {
  const { status } = entry;

  // Only show actions for active patients (not completed/cancelled)
  const isActive = status === 'waiting' || status === 'in_consultation';

  if (!isActive) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>
      </Box>
    );
  }

  // ─── DOCTOR (TRIAGE) ────────────────────────────────────────
  if (userRole === 'triage') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => onEditForm2(entry)}
          sx={{
            bgcolor: '#10b981',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            px: 2,
            py: 0.75,
            textTransform: 'none',
            borderRadius: 1.5,
            minWidth: 'auto',
            '&:hover': { bgcolor: '#059669' },
          }}
          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
        >
          Form 2
        </Button>
      </Box>
    );
  }

  // ─── NURSE (TREATMENT) ──────────────────────────────────────
  if (userRole === 'treatment') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => onEditForm3(entry)}
          sx={{
            bgcolor: '#3b82f6',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            px: 2,
            py: 0.75,
            textTransform: 'none',
            borderRadius: 1.5,
            minWidth: 'auto',
            '&:hover': { bgcolor: '#2563eb' },
          }}
          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
        >
          Form 3
        </Button>
      </Box>
    );
  }

  // ─── ADMIN ──────────────────────────────────────────────────
  if (userRole === 'admin') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => onEditForm2(entry)}
          sx={{
            bgcolor: '#10b981',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            px: 2,
            py: 0.75,
            textTransform: 'none',
            borderRadius: 1.5,
            minWidth: 'auto',
            '&:hover': { bgcolor: '#059669' },
          }}
          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
        >
          Form 2
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => onEditForm3(entry)}
          sx={{
            bgcolor: '#3b82f6',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            px: 2,
            py: 0.75,
            textTransform: 'none',
            borderRadius: 1.5,
            minWidth: 'auto',
            '&:hover': { bgcolor: '#2563eb' },
          }}
          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
        >
          Form 3
        </Button>
      </Box>
    );
  }

  // ─── REGISTRATION / OTHER ───────────────────────────────────
  // Registration staff don't edit clinical forms from queue
  return (
    <Box sx={{ textAlign: 'center' }}>
      <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>
    </Box>
  );
}
