import {
  Box, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';
import Loader from '../Loader';

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
  /** Row data (supports rows or data alias) */
  rows?: T[];
  data?: T[];
  /** Show skeleton rows while data is loading */
  loading?: boolean;
  /** Number of skeleton rows to show (default 5) */
  skeletonRows?: number;
  /** Unique key extractor for each row (function or string property name) */
  rowKey: ((row: T) => string | number) | string;
  /** Optional per-row background colour override */
  rowBg?: (row: T) => string | undefined;
  /** Click handler for an entire row */
  onRowClick?: (row: T) => void;
  /** Empty state configuration */
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: { label: string; onClick: () => void };
  /** Custom empty state node override */
  emptyState?: ReactNode;
  /** Minimum table width (default 600) */
  minWidth?: number;
}

// ─── Component ────────────────────────────────────────────────

export default function DataTable<T>({
  columns,
  rows: rowsProp,
  data: dataProp,
  loading = false,
  rowKey,
  rowBg,
  onRowClick,
  emptyIcon,
  emptyTitle = 'No records found',
  emptySubtitle,
  emptyAction,
  emptyState,
  minWidth = 600,
}: DataTableProps<T>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const rows = rowsProp ?? dataProp ?? [];

  const getKey = (row: T, index: number) => {
    if (typeof rowKey === 'function') return rowKey(row);
    if (typeof rowKey === 'string' && row && (row as any)[rowKey] !== undefined) {
      return (row as any)[rowKey];
    }
    return index;
  };

  return (
    <TableContainer sx={{ bgcolor: 'transparent', borderRadius: 0 }}>
      <Table sx={{ minWidth }}>

        {/* ── Header ── */}
        <TableHead>
          <TableRow
            sx={{
              bgcolor: isDark ? 'transparent' : 'var(--table-header-bg, #f8fafc)',
              borderBottom: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--table-border, #e2e8f0)',
            }}
          >
            {columns.map(col => (
              <TableCell
                key={col.key}
                align={col.align ?? 'left'}
                width={col.width}
                sx={{
                  fontFamily: "'Poppins', sans-serif !important",
                  fontWeight: 700,
                  color: isDark ? '#a7f3d0' : '#475569',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  py: 1.75,
                  px: 2,
                  border: 'none',
                  borderBottom: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--table-border, #e2e8f0)',
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
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 8, border: 'none' }}>
                <Loader />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            /* Empty state */
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 6, border: 0 }}>
                {emptyState ? (
                  emptyState
                ) : (
                  <>
                    {emptyIcon && (
                      <Box sx={{
                        width: 80, height: 80, borderRadius: 3, bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'var(--bg-secondary)',
                        mx: 'auto', mb: 2.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {emptyIcon}
                      </Box>
                    )}
                    <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15, color: 'var(--text-h)', mb: 0.5 }}>
                      {emptyTitle}
                    </Typography>
                    {emptySubtitle && (
                      <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: 'var(--text-secondary)', mb: emptyAction ? 2 : 0 }}>
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
                          fontFamily: "'Poppins', sans-serif",
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
                  </>
                )}
              </TableCell>
            </TableRow>
          ) : (
            /* Data rows */
            rows.map((row, idx) => (
              <TableRow
                key={getKey(row, idx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{
                  bgcolor: rowBg
                    ? (rowBg(row) ?? (isDark ? 'transparent' : (idx % 2 === 1 ? 'var(--bg-secondary)' : 'var(--card-bg)')))
                    : (isDark ? 'transparent' : (idx % 2 === 1 ? 'var(--bg-secondary)' : 'var(--card-bg)')),
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.035) !important' : 'var(--bg-hover)' },
                  transition: 'background 0.15s ease',
                }}
              >
                {columns.map(col => (
                  <TableCell
                    key={col.key}
                    align={col.align ?? 'left'}
                    width={col.width}
                    sx={{
                      fontFamily: "'Poppins', sans-serif !important",
                      py: 1.75,
                      px: 2,
                      fontSize: 13,
                      fontWeight: 500,
                      border: 'none',
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid var(--table-row-border, #f1f5f9)',
                      width: col.width,
                      color: isDark ? '#f8fafc' : 'var(--text)',
                    }}
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
