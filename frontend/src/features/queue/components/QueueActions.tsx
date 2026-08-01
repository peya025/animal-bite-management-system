import { Box, IconButton, Tooltip } from '@mui/material';
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
        <Tooltip title="Edit Form 2 (Individual Treatment)">
          <IconButton
            size="small"
            onClick={() => onEditForm2(entry)}
            sx={{
              color: '#6b7280',
              bgcolor: '#f0fdf4',
              borderRadius: 1.5,
              width: 32,
              height: 32,
              '&:hover': { bgcolor: '#dcfce7', color: '#15803d' },
            }}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // ─── NURSE (TREATMENT) ──────────────────────────────────────
  if (userRole === 'treatment') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Edit Form 3 (Vaccination Record)">
          <IconButton
            size="small"
            onClick={() => onEditForm3(entry)}
            sx={{
              color: '#6b7280',
              bgcolor: '#eff6ff',
              borderRadius: 1.5,
              width: 32,
              height: 32,
              '&:hover': { bgcolor: '#dbeafe', color: '#1e40af' },
            }}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // ─── ADMIN ──────────────────────────────────────────────────
  if (userRole === 'admin') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Edit Form 2 (Individual Treatment)">
          <IconButton
            size="small"
            onClick={() => onEditForm2(entry)}
            sx={{
              color: '#6b7280',
              bgcolor: '#f0fdf4',
              borderRadius: 1.5,
              width: 32,
              height: 32,
              '&:hover': { bgcolor: '#dcfce7', color: '#15803d' },
            }}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit Form 3 (Vaccination Record)">
          <IconButton
            size="small"
            onClick={() => onEditForm3(entry)}
            sx={{
              color: '#6b7280',
              bgcolor: '#eff6ff',
              borderRadius: 1.5,
              width: 32,
              height: 32,
              '&:hover': { bgcolor: '#dbeafe', color: '#1e40af' },
            }}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
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
