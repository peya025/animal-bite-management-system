import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

export interface DayHours {
  open: string;
  close: string;
  is_open: boolean;
}

export type OpeningHours = Record<string, DayHours>;

interface WorkingHoursModalProps {
  open: boolean;
  onClose: () => void;
  openingHours: OpeningHours;
  onHoursChange: (day: string, field: 'open' | 'close' | 'is_open', value: string | boolean) => void;
  onCopyToAll?: (sourceDay: string) => void;
}

export const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const DAY_LABELS: Record<string, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

// Every half-hour from 12:00 AM to 11:30 PM, stored as 24h "HH:mm" values.
export const TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
})();

// Formats a 24h "HH:mm" value as a 12h label, e.g. "09:00" -> "9:00 AM".
export function formatTimeLabel(time: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${period}`;
}

export default function WorkingHoursModal({
  open,
  onClose,
  openingHours,
  onHoursChange,
  onCopyToAll,
}: WorkingHoursModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>
            Working Hours
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#6b7280', mt: 0.5 }}>
            Set availability and hours for each day of the week
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#fafafa', p: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2.5,
          }}
        >
          {DAYS.map(day => {
            const hours = openingHours[day] || { open: '09:00', close: '17:00', is_open: false };
            const isOpen = hours.is_open;

            return (
              <Box
                key={day}
                sx={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 3,
                  p: 2.5,
                  bgcolor: '#fff',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { borderColor: '#d1d5db' },
                }}
              >
                {/* Card header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 2,
                    mb: 2,
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                    <Typography sx={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
                      Date and Time
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 13, color: '#6b7280' }}>Available</Typography>
                    <Switch
                      size="small"
                      color="success"
                      checked={isOpen}
                      onChange={(e) => onHoursChange(day, 'is_open', e.target.checked)}
                    />
                  </Box>
                </Box>

                {/* Day */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.75 }}>
                  <Typography sx={{ width: 46, fontSize: 13, color: '#6b7280', flexShrink: 0 }}>
                    Day
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      border: '1px solid #e5e7eb',
                      borderRadius: 2,
                      px: 1.75,
                      py: '9px',
                      fontSize: 14,
                      color: '#111827',
                      bgcolor: '#f9fafb',
                    }}
                  >
                    {DAY_LABELS[day]}
                  </Box>
                </Box>

                {/* From */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.75 }}>
                  <Typography sx={{ width: 46, fontSize: 13, color: '#6b7280', flexShrink: 0 }}>
                    From
                  </Typography>
                  <FormControl size="small" fullWidth disabled={!isOpen}>
                    <Select
                      value={hours.open}
                      onChange={(e) => onHoursChange(day, 'open', e.target.value)}
                      sx={{ borderRadius: 2, fontSize: 14, bgcolor: isOpen ? '#fff' : '#f9fafb' }}
                    >
                      {TIME_OPTIONS.map(t => (
                        <MenuItem key={t} value={t} sx={{ fontSize: 14 }}>
                          {formatTimeLabel(t)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* To */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ width: 46, fontSize: 13, color: '#6b7280', flexShrink: 0 }}>
                    To
                  </Typography>
                  <FormControl size="small" fullWidth disabled={!isOpen}>
                    <Select
                      value={hours.close}
                      onChange={(e) => onHoursChange(day, 'close', e.target.value)}
                      sx={{ borderRadius: 2, fontSize: 14, bgcolor: isOpen ? '#fff' : '#f9fafb' }}
                    >
                      {TIME_OPTIONS.map(t => (
                        <MenuItem key={t} value={t} sx={{ fontSize: 14 }}>
                          {formatTimeLabel(t)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {isOpen && onCopyToAll && (
                  <Button
                    size="small"
                    onClick={() => onCopyToAll(day)}
                    startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      mt: 1.75,
                      textTransform: 'none',
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: '#10b981',
                      p: 0,
                      minWidth: 0,
                      '&:hover': { bgcolor: 'transparent', color: '#059669' },
                    }}
                  >
                    Apply to all open days
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <button
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 18px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.25)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Done
        </button>
      </DialogActions>
    </Dialog>
  );
}