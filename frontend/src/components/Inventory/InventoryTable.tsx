import {
  Box, Button, FormControl, Grid, IconButton, InputAdornment, InputLabel,
  MenuItem, Paper, Select, Skeleton, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Inventory2 as InventoryIcon,
  Search as SearchIcon,
  Tune as AdjustIcon,
  Vaccines as VaccineIcon,
} from '@mui/icons-material';

interface InventoryItem {
  inventory_id: number;
  clinic_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'deleted';
  created_at: string;
  updated_at: string;
  transactions_count?: number;
}

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  total: number;
  search: string;
  statusFilter: string;
  batchFilter: string;
  expiryFrom: string;
  expiryTo: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onBatchFilterChange: (value: string) => void;
  onExpiryFromChange: (value: string) => void;
  onExpiryToChange: (value: string) => void;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  onEdit: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onHistory: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onAddFirst: () => void;
}

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#ecfdf5', color: '#059669', label: 'Active' },
  expired: { bg: '#fee2e2', color: '#dc2626', label: 'Expired' },
  depleted: { bg: '#f3f4f6', color: '#6b7280', label: 'Depleted' },
};

export default function InventoryTable({
  items,
  loading,
  page,
  rowsPerPage,
  total,
  search,
  statusFilter,
  batchFilter,
  expiryFrom,
  expiryTo,
  onSearchChange,
  onStatusFilterChange,
  onBatchFilterChange,
  onExpiryFromChange,
  onExpiryToChange,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
  onAddFirst,
}: InventoryTableProps) {
  const isExpiringSoon = (d: string) => {
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
  };

  const isLowStock = (q: number) => q > 0 && q <= 10;

  return (
   <Box>
  {/* ── Search & Filters Bar ── */}
  <Box
    sx={{
      mb: 3,
      p: 2,
      bgcolor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 2,
    }}
  >
    <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>

      {/* Search */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search vaccine type…"
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); onPageChange(0); }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f9fafb',
              '& fieldset': { borderColor: '#e5e7eb' },
              '&:hover fieldset': { borderColor: '#9ca3af' },
              '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' },
            },
            '& .MuiOutlinedInput-input': { fontSize: '13px', padding: '9px 12px' },
          }}
        />
      </Grid>

      {/* Batch Number */}
      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Batch number…"
          value={batchFilter}
          onChange={(e) => { onBatchFilterChange(e.target.value); onPageChange(0); }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f9fafb',
              '& fieldset': { borderColor: '#e5e7eb' },
              '&:hover fieldset': { borderColor: '#9ca3af' },
              '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' },
            },
            '& .MuiOutlinedInput-input': { fontSize: '13px', padding: '9px 12px' },
          }}
        />
      </Grid>

      {/* Status */}
      <Grid size={{ xs: 12, sm: 4, md: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: '13px' }}>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => { onStatusFilterChange(e.target.value); onPageChange(0); }}
            sx={{
              bgcolor: '#f9fafb',
              fontSize: '13px',
              '& fieldset': { borderColor: '#e5e7eb' },
              '&:hover fieldset': { borderColor: '#9ca3af' },
              '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' },
            }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="depleted">Depleted</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Expiry Date From */}
      <Grid size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Expiry from"
          type="date"
          value={expiryFrom}
          onChange={(e) => { onExpiryFromChange(e.target.value); onPageChange(0); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f9fafb',
              '& fieldset': { borderColor: '#e5e7eb' },
              '&:hover fieldset': { borderColor: '#9ca3af' },
              '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' },
            },
            '& .MuiOutlinedInput-input': { fontSize: '13px', padding: '9px 12px' },
            '& .MuiInputLabel-root': { fontSize: '13px' },
          }}
        />
      </Grid>

      {/* Expiry Date To */}
      <Grid size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Expiry to"
          type="date"
          value={expiryTo}
          onChange={(e) => { onExpiryToChange(e.target.value); onPageChange(0); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f9fafb',
              '& fieldset': { borderColor: '#e5e7eb' },
              '&:hover fieldset': { borderColor: '#9ca3af' },
              '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' },
            },
            '& .MuiOutlinedInput-input': { fontSize: '13px', padding: '9px 12px' },
            '& .MuiInputLabel-root': { fontSize: '13px' },
          }}
        />
      </Grid>

      {/* Clear */}
      <Grid size={{ xs: 12, sm: 12, md: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          onClick={() => {
            onSearchChange('');
            onStatusFilterChange('');
            onBatchFilterChange('');
            onExpiryFromChange('');
            onExpiryToChange('');
            onPageChange(0);
          }}
          sx={{
            borderColor: '#e5e7eb',
            color: '#6b7280',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '13px',
            py: '9px',
            bgcolor: '#f9fafb',
            '&:hover': { borderColor: '#9ca3af', bgcolor: '#f3f4f6' },
          }}
        >
          Clear
        </Button>
      </Grid>

    </Grid>
  </Box>

      {/* ── Table ── */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >

      <TableContainer sx={{ '& .MuiTableCell-root': { p: 1 } }}>

        <Table sx={{ minWidth: 500 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f9fafb' }}>
              <TableCell sx={{ 
                fontWeight: 200, 
                color: '#374151', 
                fontSize: 12, 
                borderBottom: '1px solid #e5e7eb'
              }}>
                Vaccine Type
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 200, 
                color: '#374151', 
                fontSize: 12, 
                borderBottom: '1px solid #e5e7eb'
              }}>
                Batch Number
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 200, 
                color: '#374151', 
                fontSize: 12, 
                borderBottom: '1px solid #e5e7eb'
              }}>
                Stock Quantity
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 200, 
                color: '#374151', 
                fontSize: 12, 
                borderBottom: '1px solid #e5e7eb'
              }}>
                Expiration Date
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 200, 
                color: '#374151', 
                fontSize: 12, 
                borderBottom: '1px solid #e5e7eb'
              }}>
                Status
              </TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 200, 
                color: '#374151', 
                fontSize: 12, 
                borderBottom: '1px solid #e5e7eb'
              }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j} sx={{ 
                      py: 2.5, 
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <Skeleton height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 10, borderBottom: 'none' }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 2,
                      strokeColor: '#374151',
                      mx: 'auto',
                      fontWeight: 600,
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <InventoryIcon sx={{ fontSize: 18, strokeColor: '#9298a2ff' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#374151', mb: 0.5 }}>
                    No inventory records found
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#6b7280', mb: 1.5 }}>
                    Add your first vaccine batch to get started
                  </Typography>
                  <Button
                    onClick={onAddFirst}
                    variant="contained"
                    disableElevation
                    sx={{
                      bgcolor: '#10b981',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      py: 1,
                      borderRadius: 1.5,
                      '&:hover': {
                        bgcolor: '#059669',
                      },
                    }}
                  >
                    Add Stock
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const low = isLowStock(item.current_quantity);
                const zero = item.current_quantity === 0;
                const expiryDate = item.expiration_date ? new Date(item.expiration_date) : null;
                const daysLeft = expiryDate
                  ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000)
                  : null;

                const statusInfo = STATUS_COLOR[item.status] || STATUS_COLOR.depleted;

                return (
                  <TableRow
                    key={item.inventory_id}
                    sx={{
                      '&:hover': { bgcolor: '#f9fafb' },
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* ── Vaccine Type ── */}
                    <TableCell sx={{ py: 2.5, borderBottom: '1px solid #f3f4f6' }}>
                      <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#111827' }}>
                        {item.vaccine_type}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
                        ID: {item.inventory_id}
                      </Typography>
                    </TableCell>

                    {/* ── Batch Number ── */}
                    <TableCell sx={{ py: 2.5, borderBottom: '1px solid #f3f4f6' }}>
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#374151',
                        }}
                      >
                        {item.batch_number}
                      </Typography>
                    </TableCell>

                    {/* ── Stock Quantity ── */}
                    <TableCell sx={{ py: 2.5, borderBottom: '1px solid #f3f4f6' }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: 16,
                          color: zero ? '#dc2626' : low ? '#f59e0b' : '#111827',
                          mb: 0.25,
                        }}
                      >
                        {item.current_quantity} <Box component="span" sx={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>vials</Box>
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                        ≈ {item.current_quantity * 3} patients
                      </Typography>
                    </TableCell>

                    {/* ── Expiration Date ── */}
                    <TableCell sx={{ py: 2.5, borderBottom: '1px solid #f3f4f6' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#374151', mb: 0.25 }}>
                        {expiryDate
                          ? expiryDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </Typography>
                      {daysLeft !== null && (
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 500,
                            color:
                              daysLeft < 0
                                ? '#dc2626'
                                : daysLeft <= 30
                                  ? '#f59e0b'
                                  : '#6b7280',
                          }}
                        >
                          {daysLeft < 0
                            ? `Expired ${Math.abs(daysLeft)}d ago`
                            : daysLeft === 0
                              ? 'Expires today'
                              : `${daysLeft}d remaining`}
                        </Typography>
                      )}
                    </TableCell>

                    {/* ── Status ── */}
                    <TableCell sx={{ py: 2.5, borderBottom: '1px solid #f3f4f6' }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 2,
                          py: 0.5,
                          bgcolor: statusInfo.bg,
                          color: statusInfo.color,
                          borderRadius: 1,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {statusInfo.label}
                      </Box>
                    </TableCell>

                    {/* ── Actions ── */}
                    <TableCell align="right" sx={{ py: 2.5, borderBottom: '1px solid #f3f4f6' }}>
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Tooltip title="Adjust Stock">
                          <IconButton
                            size="small"
                            onClick={() => onAdjust(item)}
                            sx={{
                              color: '#6b7280',
                              width: 32,
                              height: 32,
                              '&:hover': { bgcolor: '#f3f4f6', color: '#059669' },
                            }}
                          >
                            <AdjustIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="History">
                          <IconButton
                            size="small"
                            onClick={() => onHistory(item)}
                            sx={{
                              color: '#6b7280',
                              width: 32,
                              height: 32,
                              '&:hover': { bgcolor: '#f3f4f6', color: '#3b82f6' },
                            }}
                          >
                            <HistoryIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onEdit(item)}
                            sx={{
                              color: '#6b7280',
                              width: 32,
                              height: 32,
                              '&:hover': { bgcolor: '#f3f4f6', color: '#f59e0b' },
                            }}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => onDelete(item)}
                            sx={{
                              color: '#6b7280',
                              width: 32,
                              height: 32,
                              '&:hover': { bgcolor: '#fee2e2', color: '#dc2626' },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pagination ── */}
      <Box sx={{ borderTop: '1px solid #e5e7eb', bgcolor: '#f9fafb', px: 2 }}>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => onPageChange(p)}
          onRowsPerPageChange={(e) => {
            onRowsPerPageChange(Number(e.target.value));
            onPageChange(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Rows:"
          sx={{
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: 13,
              color: '#6b7280',
            },
            '& .MuiTablePagination-select': {
              fontSize: 13,
            },
          }}
        />
      </Box>
    </Paper>
    </Box>
  );
}
