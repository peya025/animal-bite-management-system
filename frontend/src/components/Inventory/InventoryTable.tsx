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
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
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
  onSearchChange,
  onStatusFilterChange,
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
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: '#f3f4f6',
        borderRadius: 3,
        overflow: 'hidden',
        background: '#ffffff',
        p: 3,
      }}
    >
      {/* ── Search & Filters Bar ── */}
      <Box sx={{ pb: 3, borderBottom: '1px solid #f3f4f6' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by vaccine type…"
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(0);
              }}
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
                  bgcolor: '#fafafa',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#f3f4f6' },
                  '&:hover fieldset': { borderColor: '#e5e7eb' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981' },
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  onStatusFilterChange(e.target.value);
                  onPageChange(0);
                }}
                sx={{
                  bgcolor: '#fafafa',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#f3f4f6' },
                  '&:hover fieldset': { borderColor: '#e5e7eb' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981' },
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="depleted">Depleted</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 2, md: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('');
                onPageChange(0);
              }}
              sx={{
                borderRadius: 2,
                borderColor: '#e5e7eb',
                color: '#6b7280',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  borderColor: '#d1d5db',
                  bgcolor: '#fafafa',
                },
              }}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Box>

      <TableContainer>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#6b7280', 
                fontSize: 12, 
                py: 2.5, 
                border: 'none'
              }}>
                VACCINE
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#6b7280', 
                fontSize: 12, 
                py: 2.5, 
                border: 'none'
              }}>
                BATCH
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#6b7280', 
                fontSize: 12, 
                py: 2.5, 
                border: 'none'
              }}>
                STOCK
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#6b7280', 
                fontSize: 12, 
                py: 2.5, 
                border: 'none'
              }}>
                EXPIRY
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#6b7280', 
                fontSize: 12, 
                py: 2.5, 
                border: 'none'
              }}>
                STATUS
              </TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 600, 
                color: '#6b7280', 
                fontSize: 12, 
                py: 2.5, 
                border: 'none'
              }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, i) => (
                <TableRow key={i} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j} sx={{ 
                      py: 3, 
                      border: 'none',
                      borderBottom: i === rowsPerPage - 1 ? 'none' : '1px solid #f9fafb'
                    }}>
                      <Skeleton height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 12, border: 0 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 3,
                      bgcolor: '#f9fafb',
                      mx: 'auto',
                      mb: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <InventoryIcon sx={{ fontSize: 36, color: '#d1d5db' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#6b7280', mb: 0.5 }}>
                    No inventory records found
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#9ca3af', mb: 3 }}>
                    Add your first vaccine batch to get started
                  </Typography>
                  <button
                    onClick={onAddFirst}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '9px 18px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.25)';
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add First Stock
                  </button>
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
                      '&:hover': { bgcolor: '#fafafa' },
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* ── Vaccine Type ── */}
                    <TableCell sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            flexShrink: 0,
                            bgcolor: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <VaccineIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: '#111827' }}>
                            {item.vaccine_type}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
                            ID: {item.inventory_id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* ── Batch Number ── */}
                    <TableCell sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 2,
                          py: 0.75,
                          bgcolor: '#f9fafb',
                          borderRadius: 1.5,
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#374151',
                        }}
                      >
                        {item.batch_number}
                      </Box>
                    </TableCell>

                    {/* ── Stock Quantity ── */}
                    <TableCell sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}>
                      <Box>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', mb: 0.5 }}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: 18,
                              color: zero ? '#dc2626' : low ? '#f59e0b' : '#111827',
                              lineHeight: 1,
                            }}
                          >
                            {item.current_quantity}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#9ca3af' }}>
                            vials
                          </Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                          ≈ {item.current_quantity * 3} patients
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* ── Expiration Date ── */}
                    <TableCell sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}>
                      <Box>
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
                      </Box>
                    </TableCell>

                    {/* ── Status ── */}
                    <TableCell sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 2,
                          py: 0.5,
                          bgcolor: statusInfo.bg,
                          color: statusInfo.color,
                          borderRadius: 1.5,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {statusInfo.label}
                      </Box>
                    </TableCell>

                    {/* ── Actions ── */}
                    <TableCell align="right" sx={{ py: 3, border: 'none', borderBottom: '1px solid #f9fafb' }}>
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Tooltip title="Adjust Stock">
                          <IconButton
                            size="small"
                            onClick={() => onAdjust(item)}
                            sx={{
                              color: '#6b7280',
                              bgcolor: '#f9fafb',
                              borderRadius: 1.5,
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
                              bgcolor: '#f9fafb',
                              borderRadius: 1.5,
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
                              bgcolor: '#f9fafb',
                              borderRadius: 1.5,
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
                              bgcolor: '#f9fafb',
                              borderRadius: 1.5,
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
      <Box sx={{ pt: 2, borderTop: '1px solid #f3f4f6', bgcolor: '#fafafa', mt: 3, mx: -3, px: 3 }}>
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
  );
}
