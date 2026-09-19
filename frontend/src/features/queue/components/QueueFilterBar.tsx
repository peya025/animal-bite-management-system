// @ts-nocheck
import {
  Box, Button, FormControl, Grid, InputAdornment, InputLabel,
  MenuItem, Select, TextField, Divider, useTheme,
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
  visitTypeFilter?: string;
  onVisitTypeChange?: (val: string) => void;
  /** Individual station views are already clinically scoped, so their visit type must not be changed. */
  lockedVisitTypeLabel?: string;
  onClear: () => void;
}

export function QueueFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter = '',
  onCategoryChange,
  visitTypeFilter = '',
  onVisitTypeChange,
  lockedVisitTypeLabel,
  onClear,
}: QueueFilterBarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const selectSx = {
    fontFamily: "'Poppins', sans-serif",
    bgcolor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'var(--input-bg)',
    borderRadius: 2,
    color: isDark ? '#ffffff' : 'var(--input-text)',
    fontSize: 13,
    '& fieldset': { borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'var(--input-border)' },
    '&:hover fieldset': { borderColor: '#10b981' },
    '&.Mui-focused fieldset': { borderColor: '#10b981' },
    '& .MuiSelect-select': { fontFamily: "'Poppins', sans-serif", fontSize: 13, py: 1 },
    '& .MuiInputLabel-root': { fontFamily: "'Poppins', sans-serif", fontSize: 13 },
  };

  const menuPaperSx = {
    slotProps: {
      paper: {
        sx: {
          bgcolor: isDark ? '#111827' : 'var(--card-bg)',
          borderRadius: 2,
          border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-glow, #e2e8f0)',
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.1)',
          '& .MuiMenuItem-root': {
            fontSize: 13,
            color: isDark ? '#cbd5e1' : 'var(--text)',
            fontFamily: "'Poppins', sans-serif",
            '&:hover': { bgcolor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'var(--sidebar-hover-bg)' },
            '&.Mui-selected': { bgcolor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'var(--nav-active-bg)', color: '#10b981', fontWeight: 600 },
          },
        },
      },
    },
  };

  return (
    <Box sx={{
      bgcolor: isDark ? 'transparent' : 'var(--card-bg)',
      p: 2,
      borderRadius: 2.5,
      border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border, #e2e8f0)',
      mb: 2,
    }}>
      <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>

        {/* Search */}
        <Grid size={{ xs: 12, sm: onVisitTypeChange ? 3.5 : (onCategoryChange ? 5 : 8), md: onVisitTypeChange ? 3.5 : (onCategoryChange ? 5 : 8) }}>
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
                    <SearchIcon sx={{ color: isDark ? '#94a3b8' : 'var(--text-secondary)', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 13,
                  bgcolor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'var(--input-bg)',
                  borderRadius: 2,
                  color: isDark ? '#ffffff' : 'var(--input-text)',
                  '& fieldset': { borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'var(--input-border)' },
                  '&:hover fieldset': { borderColor: '#10b981' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981' },
                  '& input::placeholder': { color: isDark ? '#64748b' : '#94a3b8', opacity: 1, fontFamily: "'Poppins', sans-serif", fontSize: 13 },
                },
              },
            }}
          />
        </Grid>

        {/* Status filter — ALL statuses */}
        <Grid size={{ xs: 12, sm: onVisitTypeChange ? 2 : 3, md: onVisitTypeChange ? 2 : 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: isDark ? '#94a3b8' : undefined, '&.Mui-focused': { color: '#10b981' } }}>Status</InputLabel>
            <Select label="Status" value={statusFilter} onChange={e => onStatusChange(e.target.value)} MenuProps={menuPaperSx} sx={selectSx}>
              <MenuItem value="">All Statuses</MenuItem>
              <Divider sx={{ my: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : undefined }} />
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
              <Divider sx={{ my: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : undefined }} />
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
              <Divider sx={{ my: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : undefined }} />
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

        {/* A station owns one clinical stream. Do not offer a control that can mix streams. */}
        {lockedVisitTypeLabel ? (
          <Grid size={{ xs: 12, sm: 2.5, md: 2.5 }}>
            <TextField
              fullWidth
              size="small"
              label="Queue view"
              value={lockedVisitTypeLabel}
              disabled
              slotProps={{
                input: {
                  sx: {
                    fontFamily: "'Poppins', sans-serif",
                    bgcolor: isDark ? 'rgba(0, 0, 0, 0.25)' : '#f8fafc',
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: 13,
                    color: isDark ? '#ffffff !important' : undefined,
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: isDark ? '#cbd5e1' : undefined,
                    },
                    '& fieldset': { borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'var(--input-border)' },
                  },
                },
                inputLabel: {
                  sx: {
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 13,
                    color: isDark ? '#94a3b8 !important' : undefined,
                  },
                },
              }}
            />
          </Grid>
        ) : onVisitTypeChange && (
          /* Combined view only: staff can intentionally change the visible stream. */
          <Grid size={{ xs: 12, sm: 2.5, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: isDark ? '#94a3b8' : undefined, '&.Mui-focused': { color: '#10b981' } }}>Visit / Duty</InputLabel>
              <Select label="Visit / Duty" value={visitTypeFilter} onChange={e => onVisitTypeChange(e.target.value)} MenuProps={menuPaperSx} sx={selectSx}>
                <MenuItem value="">All Visit Types</MenuItem>
                <MenuItem value="intake">Station 1 · Day 0 / New Episode</MenuItem>
                <MenuItem value="follow_up_station">Station 2 · Follow-up Doses</MenuItem>
                <Divider sx={{ my: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : undefined }} />
                <MenuItem value="new_case">New Case</MenuItem>
                <MenuItem value="consultation">Consultation</MenuItem>
                <MenuItem value="vaccination">Vaccination</MenuItem>
                <MenuItem value="follow_up">Follow-up</MenuItem>
                <MenuItem value="booster">Booster</MenuItem>
                <MenuItem value="observation">Observation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Category filter */}
        {onCategoryChange && (
          <Grid size={{ xs: 12, sm: onVisitTypeChange ? 2.5 : 3, md: onVisitTypeChange ? 2.5 : 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: isDark ? '#94a3b8' : undefined, '&.Mui-focused': { color: '#10b981' } }}>Category</InputLabel>
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
        <Grid size={{ xs: 12, sm: onVisitTypeChange ? 1.5 : 2, md: onVisitTypeChange ? 1.5 : 2 }}>
          <Button fullWidth variant="outlined" size="small" onClick={onClear}
            sx={{
              fontFamily: "'Poppins', sans-serif",
              borderRadius: 2,
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'var(--input-border, #e2e8f0)',
              color: isDark ? '#cbd5e1' : 'var(--text-secondary, #64748b)',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              py: 0.85,
              '&:hover': { borderColor: '#10b981', color: '#10b981', bgcolor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-hover)' },
            }}
          >
            Clear
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
