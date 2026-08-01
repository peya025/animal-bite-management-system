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
    <Box sx={{ pb: 3, borderBottom: '1px solid #f3f4f6' }}>
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
                    <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fafafa',
                borderRadius: 2,
                '& fieldset': { borderColor: '#f3f4f6' },
                '&:hover fieldset': { borderColor: '#e5e7eb' },
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
              sx={{
                bgcolor: '#fafafa',
                borderRadius: 2,
                '& fieldset': { borderColor: '#f3f4f6' },
                '&:hover fieldset': { borderColor: '#e5e7eb' },
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
              borderColor: '#e5e7eb',
              color: '#6b7280',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { borderColor: '#d1d5db', bgcolor: '#fafafa' },
            }}
          >
            Clear
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
