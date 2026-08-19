import { Box, TablePagination } from '@mui/material';

interface TablePagerProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
}

/**
 * Reusable paginator matching the inventory table footer style.
 * Renders a light-grey full-bleed footer with "Rows:" label.
 */
export default function TablePager({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [15, 25, 50],
}: TablePagerProps) {
  return (
    <Box sx={{
      pt: 2, mt: 3,
      mx: -3, px: 3,               // full-bleed inside parent p: 3 Paper
      borderTop: '1px solid var(--table-row-border)',
      bgcolor: 'var(--bg-secondary)',
    }}>
      <TablePagination
        component="div"
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={e => {
          onRowsPerPageChange(Number(e.target.value));
          onPageChange(0);
        }}
        rowsPerPageOptions={rowsPerPageOptions}
        labelRowsPerPage="Rows:"
        sx={{
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: 13,
            color: 'var(--text-secondary)',
          },
          '& .MuiTablePagination-select': {
            fontSize: 13,
          },
        }}
      />
    </Box>
  );
}
