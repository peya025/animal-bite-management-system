// @ts-nocheck
import {
  Box, Button, FormControl, Grid, InputAdornment, InputLabel,
  MenuItem, Select, TextField, Divider,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  Clock01Icon,
  CallIcon,
  Stethoscope02Icon,
  ArrowTurnBackwardIcon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserBlock01Icon,
  VolumeMute01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

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
        sx: {
          bgcolor: 'var(--card-bg)',
          borderRadius: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          '& .MuiMenuItem-root': {
            fontSize: 13,
            color: 'var(--text)',
            fontFamily: 'inherit',
            '&:hover': { bgcolor: 'var(--sidebar-hover-bg)' },
            '&.Mui-selected': { bgcolor: 'var(--nav-active-bg)', color: 'var(--primary)', fontWeight: 600 },
          },
        },
      },
    },
  };

  return (
    <Box sx={{ bgcolor: 'var(--card-bg)', p: 2, borderRadius: 2.5, border: '1px solid var(--border)', mb: 2 }}>
      <Grid container spacing={1.5} alignItems="center">

        {/* Search */}
        <Grid size={{ xs: 12, sm: onCategoryChange ? 5 : 8, md: onCategoryChange ? 5 : 8 }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search patient name or queue #…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--text-secondary)', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: 'var(--input-bg)',
                  borderRadius: 2,
                  color: 'var(--input-text)',
                  '& fieldset': { borderColor: 'var(--input-border)' },
                  '&:hover fieldset': { borderColor: 'var(--text-secondary)' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981' },
                },
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
              <MenuItem value="waiting">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={Clock01Icon} size={14} /> Waiting
                </Box>
              </MenuItem>
              <MenuItem value="called">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={CallIcon} size={14} /> Called
                </Box>
              </MenuItem>
              <MenuItem value="serving">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={Stethoscope02Icon} size={14} /> Serving
                </Box>
              </MenuItem>
              <MenuItem value="in_consultation">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={Stethoscope02Icon} size={14} /> In Consultation
                </Box>
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              {/* Recall */}
              <MenuItem value="second_chance">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={14} /> Second Chance
                </Box>
              </MenuItem>
              <MenuItem value="final_recall">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={AlertCircleIcon} size={14} /> Final Recall
                </Box>
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              {/* Terminal */}
              <MenuItem value="completed">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} /> Completed
                </Box>
              </MenuItem>
              <MenuItem value="cancelled">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={Cancel01Icon} size={14} /> Cancelled
                </Box>
              </MenuItem>
              <MenuItem value="absent">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={UserBlock01Icon} size={14} /> No-Show / Absent
                </Box>
              </MenuItem>
              <MenuItem value="no_response">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <HugeiconsIcon icon={VolumeMute01Icon} size={14} /> No Response
                </Box>
              </MenuItem>
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
