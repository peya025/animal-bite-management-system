import { Box, IconButton, MenuItem, Select, Typography } from '@mui/material';
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
  rowsPerPageOptions = [5, 10, 25],
}: TablePaginatorProps) {
  const totalPages = Math.ceil(count / rowsPerPage);
  const from = count === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(count, (page + 1) * rowsPerPage);

  const btnSx = (disabled: boolean) => ({
    width: 28,
    height: 28,
    borderRadius: 1.5,
    border: '0.5px solid #e5e7eb',
    bgcolor: disabled ? 'transparent' : '#fff',
    color: disabled ? '#d1d5db' : '#374151',
    '&:hover': { bgcolor: disabled ? 'transparent' : '#f3f4f6' },
    transition: 'all 0.15s',
  });

  return (
    <Box sx={{
      borderTop: '1px solid #e5e7eb',
      bgcolor: '#f9fafb',
      px: 2,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>

      {/* Left — rows per page */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: 12, color: '#9ca3af' }}>Rows</Typography>
        <Select
          value={rowsPerPage}
          onChange={(e) => { onRowsPerPageChange(Number(e.target.value)); onPageChange(0); }}
          size="small"
          variant="outlined"
          sx={{
            fontSize: 12,
            color: '#374151',
            height: 28,
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9ca3af' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10b981', borderWidth: '1px' },
            '.MuiSelect-select': { py: 0, px: 1 },
            bgcolor: '#fff',
            borderRadius: 1.5,
          }}
        >
          {rowsPerPageOptions.map((opt) => (
            <MenuItem key={opt} value={opt} sx={{ fontSize: 12 }}>{opt}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* Center — count */}
      <Typography sx={{ fontSize: 12, color: '#9ca3af' }}>
        <Box component="span" sx={{ color: '#374151', fontWeight: 500 }}>{from}–{to}</Box>
        {' of '}
        <Box component="span" sx={{ color: '#374151', fontWeight: 500 }}>{count}</Box>
      </Typography>

      {/* Right — navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton size="small" onClick={() => onPageChange(0)} disabled={page === 0} sx={btnSx(page === 0)}>
          <FirstPage sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton size="small" onClick={() => onPageChange(page - 1)} disabled={page === 0} sx={btnSx(page === 0)}>
          <ChevronLeft sx={{ fontSize: 14 }} />
        </IconButton>

        {/* Page pills */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
            .reduce<(number | '...')[]>((acc, i, idx, arr) => {
              if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(i);
              return acc;
            }, [])
            .map((item, idx) =>
              item === '...' ? (
                <Typography key={`ellipsis-${idx}`} sx={{ fontSize: 12, color: '#9ca3af', px: 0.5, lineHeight: '28px' }}>…</Typography>
              ) : (
                <Box
                  key={item}
                  onClick={() => onPageChange(item as number)}
                  sx={{
                    width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 1.5,
                    fontSize: 12, fontWeight: page === item ? 600 : 400,
                    cursor: 'pointer',
                    bgcolor: page === item ? '#10b981' : '#fff',
                    color: page === item ? '#fff' : '#374151',
                    border: '0.5px solid',
                    borderColor: page === item ? '#10b981' : '#e5e7eb',
                    '&:hover': { bgcolor: page === item ? '#059669' : '#f3f4f6' },
                    transition: 'all 0.15s',
                  }}
                >
                  {(item as number) + 1}
                </Box>
              )
            )
          }
        </Box>

        <IconButton size="small" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} sx={btnSx(page >= totalPages - 1)}>
          <ChevronRight sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton size="small" onClick={() => onPageChange(totalPages - 1)} disabled={page >= totalPages - 1} sx={btnSx(page >= totalPages - 1)}>
          <LastPage sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

    </Box>
  );
}