import {
  Box, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
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
  return (
    <Paper elevation={0} sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden', bgcolor: 'var(--card-bg)' }}>
      <TableContainer sx={{ '& .MuiTableCell-root': { p: 1 } }}>
        <Table sx={{ minWidth: 500 }}>

          {/* ── Head ── */}
          <TableHead>
            <TableRow sx={{ bgcolor: 'var(--table-header-bg)' }}>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sx={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, borderBottom: '1px solid var(--table-border)' }}
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
                  <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)', mb: 0.5 }}>
                    {emptyTitle}
                  </Typography>
                  {emptySubtitle && (
                    <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', mb: 1.5 }}>
                      {emptySubtitle}
                    </Typography>
                  )}
                  {emptyAction && (
                    <Button
                      onClick={emptyAction.onClick}
                      variant="contained"
                      disableElevation
                      sx={{
                        bgcolor: '#10b981', textTransform: 'none', fontWeight: 600,
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
              rows.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  sx={{ '&:hover': { bgcolor: 'var(--bg-hover)' }, transition: 'background 0.15s' }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align ?? 'left'}
                      sx={{ borderBottom: '1px solid var(--table-row-border)' }}
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
