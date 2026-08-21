import {
  Box, Button, FormControl, Grid, InputAdornment, InputLabel,
  MenuItem, Select, TextField,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface QueueFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  onClear: () => void;
}

export function QueueFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onClear,
}: QueueFilterBarProps) {
  return (
    <Box sx={{ pb: 3, borderBottom: '1px solid var(--table-row-border)' }}>
      <Grid container spacing={2} sx={{ alignItems: 'center' }}>
        <Grid size={{ xs: 12, sm: 6, md: 5 }}>
          <TextField
            fullWidth
            size="small"
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
                bgcolor: 'var(--input-bg)',
                borderRadius: 2,
                color: 'var(--input-text)',
                '& fieldset': { borderColor: 'var(--input-border)' },
                '&:hover fieldset': { borderColor: 'var(--text-secondary)' },
                '&.Mui-focused fieldset': { borderColor: '#10b981' },
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={e => onStatusChange(e.target.value)}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      mt: 0.5,
                      borderRadius: 2,
                      minWidth: 220,
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                    },
                  },
                },
              }}
              sx={{
                bgcolor: 'var(--input-bg)',
                borderRadius: 2,
                color: 'var(--input-text)',
                '& fieldset': { borderColor: 'var(--input-border)' },
                '&:hover fieldset': { borderColor: 'var(--text-secondary)' },
                '&.Mui-focused fieldset': { borderColor: '#10b981' },
              }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="waiting">Waiting</MenuItem>
              <MenuItem value="in_consultation">In Consultation</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 2, md: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={onClear}
            sx={{
              borderRadius: 2,
              borderColor: 'var(--input-border)',
              color: 'var(--text-secondary)',
              textTransform: 'none',
              fontWeight: 500,
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
