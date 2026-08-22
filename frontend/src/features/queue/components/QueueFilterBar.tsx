import {
  Box, Button, FormControl, Grid, InputAdornment, InputLabel,
  MenuItem, Select, TextField, Divider,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface QueueFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  categoryFilter?: string;
  onCategoryChange?: (val: string) => void;
  onClear: () => void;
}

export function QueueFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter = '',
  onCategoryChange,
  onClear,
}: QueueFilterBarProps) {
  const selectSx = {
    bgcolor: 'var(--input-bg)',
    borderRadius: 2,
    color: 'var(--input-text)',
    '& fieldset': { borderColor: 'var(--input-border)' },
    '&:hover fieldset': { borderColor: 'var(--text-secondary)' },
    '&.Mui-focused fieldset': { borderColor: '#10b981' },
  };

  const menuPaperSx = {
    slotProps: {
      paper: {
        sx: { mt: 0.5, borderRadius: 2, minWidth: 220, boxShadow: '0 8px 24px rgba(15,23,42,0.14)' },
      },
    },
  };

  return (
    <Box sx={{ pb: 3, borderBottom: '1px solid var(--table-row-border)' }}>
      <Grid container spacing={2} sx={{ alignItems: 'center' }}>

        {/* Search */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth size="small"
            placeholder="Search patient name or queue #…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'var(--input-bg)', borderRadius: 2, color: 'var(--input-text)',
                '& fieldset': { borderColor: 'var(--input-border)' },
                '&:hover fieldset': { borderColor: 'var(--text-secondary)' },
                '&.Mui-focused fieldset': { borderColor: '#10b981' },
              },
            }}
          />
        </Grid>

        {/* Status filter — ALL statuses */}
        <Grid size={{ xs: 12, sm: 3, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter} onChange={e => onStatusChange(e.target.value)} MenuProps={menuPaperSx} sx={selectSx}>
              <MenuItem value="">All Statuses</MenuItem>
              <Divider sx={{ my: 0.5 }} />
              {/* Active */}
              <MenuItem value="waiting">⏳ Waiting</MenuItem>
              <MenuItem value="called">📢 Called</MenuItem>
              <MenuItem value="serving">🩺 Serving</MenuItem>
              <MenuItem value="in_consultation">🩺 In Consultation</MenuItem>
              <Divider sx={{ my: 0.5 }} />
              {/* Recall */}
              <MenuItem value="second_chance">↩ Second Chance</MenuItem>
              <MenuItem value="final_recall">⚠ Final Recall</MenuItem>
              <Divider sx={{ my: 0.5 }} />
              {/* Terminal */}
              <MenuItem value="completed">✅ Completed</MenuItem>
              <MenuItem value="cancelled">❌ Cancelled</MenuItem>
              <MenuItem value="absent">🚫 No-Show / Absent</MenuItem>
              <MenuItem value="no_response">🔕 No Response</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Category filter */}
        {onCategoryChange && (
          <Grid size={{ xs: 12, sm: 3, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={categoryFilter} onChange={e => onCategoryChange(e.target.value)} MenuProps={menuPaperSx} sx={selectSx}>
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="regular">Regular / Walk-in</MenuItem>
                <MenuItem value="appointment">Appointment</MenuItem>
                <MenuItem value="senior_citizen">Senior Citizen</MenuItem>
                <MenuItem value="pwd">PWD</MenuItem>
                <MenuItem value="pregnant">Pregnant</MenuItem>
                <MenuItem value="priority">Priority / Urgent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Clear */}
        <Grid size={{ xs: 12, sm: 2, md: 2 }}>
          <Button fullWidth variant="outlined" size="small" onClick={onClear}
            sx={{
              borderRadius: 2, borderColor: 'var(--input-border)',
              color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 500,
              '&:hover': { borderColor: 'var(--text-secondary)', bgcolor: 'var(--bg-hover)' },
            }}
          >
            Clear
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
