import { Box, IconButton, MenuItem, Select, Typography, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight, FirstPage, LastPage } from '@mui/icons-material';

interface TablePaginatorProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
}

export default function TablePaginator({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 15, 25, 50],
}: TablePaginatorProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const totalPages = Math.ceil(count / rowsPerPage) || 1;
  const from = count === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(count, (page + 1) * rowsPerPage);

  const btnSx = (disabled: boolean) => ({
    width: 32,
    height: 32,
    borderRadius: '8px',
    border: isDark
      ? (disabled ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.12)')
      : (disabled ? '1px solid #f1f5f9' : '1px solid #e2e8f0'),
    bgcolor: disabled ? 'transparent' : (isDark ? '#111827' : '#ffffff'),
    color: disabled
      ? (isDark ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1')
      : (isDark ? '#f8fafc' : '#334155'),
    '&:hover': {
      bgcolor: disabled ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc'),
      borderColor: disabled ? undefined : '#10b981',
    },
    transition: 'all 0.18s ease',
  });

  return (
    <Box
      sx={{
        position: 'relative',
        borderTop: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #e2e8f0',
        bgcolor: isDark ? '#111827' : '#ffffff',
        px: { xs: 1.5, sm: 2.5 },
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Left — rows per page */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          sx={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '13px',
            fontWeight: 500,
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          Rows
        </Typography>
        <Select
          value={rowsPerPage}
          onChange={(e) => {
            onRowsPerPageChange(Number(e.target.value));
            onPageChange(0);
          }}
          size="small"
          variant="outlined"
          sx={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            color: isDark ? '#ffffff' : '#111827',
            height: 32,
            minWidth: 64,
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'var(--input-border, #d1d5db)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
              borderWidth: '1.5px',
            },
            '.MuiSelect-select': {
              py: 0,
              px: 1.25,
              fontFamily: "'Poppins', sans-serif",
            },
            bgcolor: isDark ? '#111827' : 'var(--input-bg, #ffffff)',
            borderRadius: '8px',
          }}
        >
          {rowsPerPageOptions.map((opt) => (
            <MenuItem
              key={opt}
              value={opt}
              sx={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {opt}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Center — item count display */}
      <Box
        sx={{
          position: { xs: 'static', md: 'absolute' },
          left: { md: '50%' },
          transform: { md: 'translateX(-50%)' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '13px',
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          <Box component="span" sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800 }}>
            {from}–{to}
          </Box>
          <Box component="span" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 400, mx: 0.6 }}>
            of
          </Box>
          <Box component="span" sx={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800 }}>
            {count}
          </Box>
        </Typography>
      </Box>

      {/* Right — pagination buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <IconButton size="small" onClick={() => onPageChange(0)} disabled={page === 0} sx={btnSx(page === 0)} title="First Page">
          <FirstPage sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton size="small" onClick={() => onPageChange(page - 1)} disabled={page === 0} sx={btnSx(page === 0)} title="Previous Page">
          <ChevronLeft sx={{ fontSize: 16 }} />
        </IconButton>

        {/* Page pills */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
            .reduce<(number | '...')[]>((acc, i, idx, arr) => {
              if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(i);
              return acc;
            }, [])
            .map((item, idx) =>
              item === '...' ? (
                <Typography
                  key={`ellipsis-${idx}`}
                  sx={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '13px',
                    color: isDark ? '#94a3b8' : '#64748b',
                    px: 0.5,
                    lineHeight: '32px',
                  }}
                >
                  …
                </Typography>
              ) : (
                <Box
                  key={item}
                  onClick={() => onPageChange(item as number)}
                  sx={{
                    fontFamily: "'Poppins', sans-serif",
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: page === item ? 700 : 600,
                    cursor: 'pointer',
                    bgcolor: page === item ? '#10b981' : (isDark ? '#111827' : '#ffffff'),
                    color: page === item ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155'),
                    border: '1px solid',
                    borderColor: page === item ? '#10b981' : (isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'),
                    boxShadow: page === item ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                    '&:hover': {
                      bgcolor: page === item ? '#059669' : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc'),
                      borderColor: page === item ? '#059669' : '#10b981',
                    },
                    transition: 'all 0.18s ease',
                  }}
                >
                  {(item as number) + 1}
                </Box>
              )
            )}
        </Box>

        <IconButton size="small" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} sx={btnSx(page >= totalPages - 1)} title="Next Page">
          <ChevronRight sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton size="small" onClick={() => onPageChange(totalPages - 1)} disabled={page >= totalPages - 1} sx={btnSx(page >= totalPages - 1)} title="Last Page">
          <LastPage sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
}