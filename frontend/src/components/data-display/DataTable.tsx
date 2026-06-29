import {
  Box, Button, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import type { ReactNode } from 'react';

// ─── Column Definition ────────────────────────────────────────

export interface ColumnDef<T> {
  /** Unique key for React reconciliation */
  key: string;
  /** Column header label */
  header: string;
  /** Width hint, e.g. '80px' */
  width?: string;
  /** Cell alignment — defaults to 'left' */
  align?: 'left' | 'center' | 'right';
  /** Render function for the cell */
  render: (row: T, index: number) => ReactNode;
}

// ─── Empty State ─────────────────────────────────────────────

export interface EmptyStateConfig {
  /** Icon element to display */
  icon?: ReactNode;
  /** Primary message */
  title?: string;
  /** Secondary message */
  subtitle?: string;
  /** Optional call-to-action button */
  action?: { label: string; onClick: () => void };
}

// ─── DataTable Props ─────────────────────────────────────────

export interface DataTableProps<T> {
  /** Column definitions in display order */
  columns: ColumnDef<T>[];
  /** Row data */
  rows: T[];
  /** Show skeleton rows while data is loading */
  loading?: boolean;
  /** Number of skeleton rows to show (default 5) */
  skeletonRows?: number;
  /** Unique key extractor for each row */
  rowKey: (row: T) => string | number;
  /** Optional per-row background colour override */
  rowBg?: (row: T) => string | undefined;
  /** Click handler for an entire row */
  onRowClick?: (row: T) => void;
  /** Empty state configuration */
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: { label: string; onClick: () => void };
  /** Minimum table width (default 600) */
  minWidth?: number;
}

// ─── Component ────────────────────────────────────────────────

export default function DataTable<T>({
  columns,
  rows,
  loading = false,
  skeletonRows = 5,
  rowKey,
  rowBg,
  onRowClick,
  emptyIcon,
  emptyTitle = 'No records found',
  emptySubtitle,
  emptyAction,
  minWidth = 600,
}: DataTableProps<T>) {
  return (
    <TableContainer>
      <Table sx={{ minWidth }}>

        {/* ── Header ── */}
        <TableHead>
          <TableRow sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
            {columns.map(col => (
              <TableCell
                key={col.key}
                align={col.align ?? 'left'}
                width={col.width}
                sx={{
                  fontWeight: 600,
                  color: '#6b7280',
                  fontSize: 12,
                  py: 2.5,
                  border: 'none',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
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
            /* Skeleton loading rows */
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
                  <Typography sx={{ fontSize: 13, color: '#9ca3af', mb: emptyAction ? 2 : 0 }}>
                    {emptySubtitle}
                  </Typography>
                )}
                {emptyAction && (
                  <Button
                    onClick={emptyAction.onClick}
                    variant="contained"
                    disableElevation
                    sx={{
                      mt: emptySubtitle ? 0 : 2,
                      bgcolor: '#10b981',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      py: 1,
                      borderRadius: 1.5,
                      '&:hover': { bgcolor: '#059669' },
                    }}
                  >
                    {emptyAction.label}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ) : (
            /* Data rows */
            rows.map((row, idx) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{
                  bgcolor: rowBg ? (rowBg(row) ?? 'inherit') : 'inherit',
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': { bgcolor: '#fafafa' },
                  transition: 'background 0.15s',
                }}
              >
                {columns.map(col => (
                  <TableCell
                    key={col.key}
                    align={col.align ?? 'left'}
                    sx={{ py: 2.5, border: 'none', borderBottom: '1px solid #f9fafb' }}
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
