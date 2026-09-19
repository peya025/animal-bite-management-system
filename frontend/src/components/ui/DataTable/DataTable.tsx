import {
  Box, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography, useTheme,
} from '@mui/material';
import type { DataTableProps } from './types';
import Loader from '../../Loader';

export default function DataTable<T>({
  columns,
  rows,
  loading = false,
  getRowKey,
  emptyIcon,
  emptyTitle = 'No records found',
  emptySubtitle,
  emptyAction,
}: DataTableProps<T>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper elevation={0} sx={{ border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--card-border, #e2e8f0)', borderRadius: 3, overflow: 'hidden', bgcolor: isDark ? '#111827' : 'var(--card-bg)' }}>
      <TableContainer sx={{ '& .MuiTableCell-root': { p: 1.75 } }}>
        <Table sx={{ minWidth: 500 }}>

          {/* ── Head ── */}
          <TableHead>
            <TableRow sx={{ bgcolor: isDark ? 'transparent' : 'var(--table-header-bg, #f8fafc)', borderBottom: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--table-border, #e2e8f0)' }}>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sx={{
                    fontFamily: "'Poppins', sans-serif !important",
                    fontWeight: 700,
                    color: isDark ? '#a7f3d0' : '#475569',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--table-border, #e2e8f0)',
                    py: 1.75,
                    px: 2,
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* ── Body ── */}
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                  <Loader />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 10, borderBottom: 'none' }}>
                  {emptyIcon && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      {emptyIcon}
                    </Box>
                  )}
                  <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--text-h)', mb: 0.5 }}>
                    {emptyTitle}
                  </Typography>
                  {emptySubtitle && (
                    <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: 'var(--text-secondary)', mb: 1.5 }}>
                      {emptySubtitle}
                    </Typography>
                  )}
                  {emptyAction && (
                    <Button
                      onClick={emptyAction.onClick}
                      variant="contained"
                      disableElevation
                      sx={{
                        bgcolor: '#10b981', textTransform: 'none', fontFamily: "'Poppins', sans-serif", fontWeight: 600,
                        fontSize: '13px', py: 1, borderRadius: 1.5,
                        '&:hover': { bgcolor: '#059669' },
                      }}
                    >
                      {emptyAction.label}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={getRowKey(row)}
                  sx={{
                    bgcolor: isDark ? 'transparent' : (idx % 2 === 1 ? 'var(--bg-secondary)' : 'var(--card-bg)'),
                    '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.035) !important' : 'var(--bg-hover)' },
                    transition: 'background 0.15s ease',
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align ?? 'left'}
                      sx={{
                        fontFamily: "'Poppins', sans-serif !important",
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid var(--table-row-border, #f1f5f9)',
                        py: 1.75,
                        px: 2,
                        fontSize: 13,
                        fontWeight: 500,
                        color: isDark ? '#f8fafc' : 'var(--text)',
                      }}
                    >
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>

        </Table>
      </TableContainer>
    </Paper>
  );
}
