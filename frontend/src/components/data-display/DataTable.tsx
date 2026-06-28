import {
  Box, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';

// ─── Types ────────────────────────────────────────────────────
export interface ColumnDef<T> {
  /** Column header label (uppercase) */
  header: string;
  /** Unique key for React reconciliation */
  key: string;
  /** Width hint, e.g. '80px', '1fr' */
  width?: string;
  /** Align content — defaults to 'left' */
  align?: 'left' | 'center' | 'right';
  /** Render function for the cell */
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  /** Column definitions in display order */
  columns: ColumnDef<T>[];
  /** Row data */
  rows: T[];
  /** Show skeleton rows while loading */
  loading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  /** Unique key extractor for each row */
  rowKey: (row: T) => string | number;
  /** Optional row-level background color */
  rowBg?: (row: T) => string | undefined;
  /** Empty state icon node */
  emptyIcon?: React.ReactNode;
  /** Empty state primary message */
  emptyTitle?: string;
  /** Empty state secondary message */
  emptySubtitle?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  loading = false,
  skeletonRows = 5,
  rowKey,
  rowBg,
  emptyIcon,
  emptyTitle = 'No records found',
  emptySubtitle = '',
}: DataTableProps<T>) {
  return (
    <TableContainer>
      <Table sx={{ minWidth: 600 }}>
        {/* ── Header ── */}
        <TableHead>
          <TableRow sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
            {columns.map(col => (
              <TableCell
                key={col.key}
                align={col.align ?? 'left'}
                width={col.width}
                sx={{
                  fontWeight: 600, color: '#6b7280',
                  fontSize: 12, py: 2.5, border: 'none',
                  letterSpacing: 0.5,
                }}
              >
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        {/* ── Body ── */}
        <TableBody>
          {loading ? (
            /* Skeleton rows */
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i}>
                {columns.map(col => (
                  <TableCell
                    key={col.key}
                    sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}
                  >
                    <Skeleton height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            /* Empty state */
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 12, border: 0 }}>
                {emptyIcon && (
                  <Box sx={{
                    width: 80, height: 80, borderRadius: 3, bgcolor: '#f9fafb',
                    mx: 'auto', mb: 2.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {emptyIcon}
                  </Box>
                )}
                <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#6b7280', mb: 0.5 }}>
                  {emptyTitle}
                </Typography>
                {emptySubtitle && (
                  <Typography sx={{ fontSize: 13, color: '#9ca3af' }}>
                    {emptySubtitle}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ) : (
            /* Data rows */
            rows.map((row, idx) => (
              <TableRow
                key={rowKey(row)}
                sx={{
                  bgcolor: rowBg ? (rowBg(row) ?? 'inherit') : 'inherit',
                  '&:hover': { bgcolor: '#fafafa' },
                  transition: 'background 0.15s',
                }}
              >
                {columns.map(col => (
                  <TableCell
                    key={col.key}
                    align={col.align ?? 'left'}
                    sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}
                  >
                    {col.render(row, idx)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
