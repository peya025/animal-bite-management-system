import { Box, Button, Typography } from '@mui/material';
import { LockOutlined as LockIcon } from '@mui/icons-material';

interface ConsultationBannersProps {
  isReturningNewBite: boolean;
  hasAdministeredVaccine: boolean;
  hasExistingRecord: boolean;
  isEditing: boolean;
  readOnly: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export default function ConsultationBanners({
  isReturningNewBite,
  hasAdministeredVaccine,
  hasExistingRecord,
  isEditing,
  readOnly,
  onStartEdit,
  onCancelEdit,
}: ConsultationBannersProps) {
  return (
    <>
      {/* 🛡️ Returning Patient Banner */}
      {isReturningNewBite && !hasAdministeredVaccine && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 1.75,
            mb: 3,
            bgcolor: '#ecfdf5',
            border: '1.5px solid #a7f3d0',
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: 20 }}>🛡️</Typography>
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#065f46' }}>
              Prior Immunization History Verified — New Bite Assessment
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#047857', mt: 0.25 }}>
              Patient has documented rabies vaccination on file and returned with a new animal bite exposure. Record clinical assessment and exposure details below.
            </Typography>
          </Box>
        </Box>
      )}

      {/* 🔒 Medical-Legal Post-Treatment Lock Banner */}
      {hasAdministeredVaccine ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.75,
            mb: 3,
            bgcolor: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LockIcon sx={{ fontSize: 20, color: '#d97706', flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#92400e' }}>
                🔒 Clinical Assessment Locked (Post-Treatment)
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#b45309', mt: 0.25 }}>
                Exposure diagnosis and clinical orders cannot be modified after vaccination has started. Use the Addendum section below to append clinical notes.
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              bgcolor: '#fef3c7',
              borderRadius: 1.5,
              fontSize: 11,
              fontWeight: 700,
              color: '#92400e',
              border: '1px solid #fde68a',
              whiteSpace: 'nowrap',
            }}
          >
            Vaccinated · Read Only
          </Box>
        </Box>
      ) : hasExistingRecord && !isEditing ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            mb: 3,
            bgcolor: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LockIcon sx={{ fontSize: 16, color: '#d97706', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, color: '#92400e' }}>
              You are viewing this form in <strong>read-only mode</strong>.
            </Typography>
          </Box>
          {!readOnly && (
            <Button
              size="small"
              variant="outlined"
              onClick={onStartEdit}
              sx={{
                borderColor: '#d97706',
                color: '#b45309',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'none',
                py: 0.25,
                px: 1.5,
                '&:hover': { bgcolor: '#fef3c7', borderColor: '#b45309' },
              }}
            >
              ✏️ Edit Form 2
            </Button>
          )}
        </Box>
      ) : null}

      {/* Edit Mode Notification Banner */}
      {hasExistingRecord && isEditing && !readOnly && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.25,
            mb: 3,
            bgcolor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <span style={{ fontSize: 14 }}>✏️</span>
            <Typography sx={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
              Editing Consultation Record — make your adjustments below and save.
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={onCancelEdit}
            sx={{
              color: '#6b7280',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { color: '#111827', bgcolor: 'transparent' },
            }}
          >
            Cancel Edit
          </Button>
        </Box>
      )}
    </>
  );
}
