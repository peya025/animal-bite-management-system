import {
  Box, Button, Paper, Skeleton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Column, DataTableProps } from './types';

export default function DataTable<T>({
  columns,
  rows,
  loading = false,
  rowsPerPage = 10,
  getRowKey,
  emptyIcon,
  emptyTitle = 'No records found',
  emptySubtitle,
  emptyAction,
}: DataTableProps<T>) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
      <TableContainer sx={{ '& .MuiTableCell-root': { p: 1 } }}>
        <Table sx={{ minWidth: 500 }}>

          {/* ── Head ── */}
          <TableHead>
            <TableRow sx={{ bgcolor: '#f9fafb' }}>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sx={{ fontWeight: 200, color: '#374151', fontSize: 12, borderBottom: '1px solid #e5e7eb' }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* ── Body ── */}
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} sx={{ borderBottom: '1px solid #f3f4f6' }}>
                      <Skeleton height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 10, borderBottom: 'none' }}>
                  {emptyIcon && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      {emptyIcon}
                    </Box>
                  )}
                  <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#374151', mb: 0.5 }}>
                    {emptyTitle}
                  </Typography>
                  {emptySubtitle && (
                    <Typography sx={{ fontSize: 13, color: '#6b7280', mb: 1.5 }}>
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
                  sx={{ '&:hover': { bgcolor: '#f9fafb' }, transition: 'background 0.15s' }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align ?? 'left'}
                      sx={{ borderBottom: '1px solid #f3f4f6' }}
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