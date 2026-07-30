import {
  Box, Button, FormControl, Grid, IconButton, InputAdornment, InputLabel,
  MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography, Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Inventory2 as InventoryIcon,
  Search as SearchIcon,
  Tune as AdjustIcon,
  Assignment as StockCardIcon,
} from '@mui/icons-material';
import { DataTable, TablePaginator } from '../../../../components/data-display';
import type { ColumnDef } from '../../../../components/data-display';
import type { InventoryItem } from '../../types';
import { formatDate, daysUntil } from '../../../../shared/utils';
import { DEMO_CLINICS } from '../../data/inventoryDemoData';

// ─── Props ────────────────────────────────────────────────────

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
  onViewStockCard?: (item: InventoryItem) => void;
  onAddFirst: () => void;
}

// ─── Constants ────────────────────────────────────────────────

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: '#ecfdf5', color: '#059669', label: 'Active'   },
  expired:  { bg: '#fee2e2', color: '#dc2626', label: 'Expired'  },
  depleted: { bg: '#f3f4f6', color: '#6b7280', label: 'Depleted' },
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#f9fafb',
    '& fieldset': { borderColor: '#e5e7eb' },
    '&:hover fieldset': { borderColor: '#9ca3af' },
    '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' },
  },
  '& .MuiOutlinedInput-input': { fontSize: '13px', padding: '9px 12px' },
  '& .MuiInputLabel-root': { fontSize: '13px' },
} as const;

// ─── Component ────────────────────────────────────────────────

export default function InventoryTable({
  items, loading,
  page, rowsPerPage, total,
  search, statusFilter, batchFilter, expiryFrom, expiryTo,
  onSearchChange, onStatusFilterChange, onBatchFilterChange,
  onExpiryFromChange, onExpiryToChange,
  onPageChange, onRowsPerPageChange,
  onEdit, onAdjust, onHistory, onDelete, onViewStockCard, onAddFirst,
}: InventoryTableProps) {

  const isLowStock = (q: number) => q > 0 && q <= 10;

  // ── Column definitions ────────────────────────────────────
  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'vaccine_type', header: 'Vaccine Type',
      render: item => (
        <Box>
          <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#111827' }}>
            {item.vaccine_type}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
            ID: {item.inventory_id}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'clinic_id', header: 'Facility Clinic',
      render: item => {
        const c = DEMO_CLINICS.find(cl => cl.clinic_id === item.clinic_id) || DEMO_CLINICS[0];
        return (
          <Chip
            label={c.name}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: 11,
              bgcolor: '#f1f5f9',
              color: '#334155',
              borderLeft: `4px solid ${c.color}`,
              borderRadius: 1,
            }}
          />
        );
      },
    },
    {
      key: 'batch_number', header: 'Batch Number',
      render: item => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 500, color: '#374151' }}>
          {item.batch_number}
        </Typography>
      ),
    },
    {
      key: 'current_quantity', header: 'Stock Quantity',
      render: item => {
        const low  = isLowStock(item.current_quantity);
        const zero = item.current_quantity === 0;
        return (
          <Box>
            <Typography sx={{
              fontWeight: 600, fontSize: 16, mb: 0.25,
              color: zero ? '#dc2626' : low ? '#f59e0b' : '#111827',
            }}>
              {item.current_quantity}{' '}
              <Box component="span" sx={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>vials</Box>
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
              ≈ {item.current_quantity * 3} patients
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'expiration_date', header: 'Expiration Date',
      render: item => {
        const days = daysUntil(item.expiration_date);
        return (
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#374151', mb: 0.25 }}>
              {formatDate(item.expiration_date)}
            </Typography>
            <Typography sx={{
              fontSize: 11, fontWeight: 500,
              color: days < 0 ? '#dc2626' : days <= 30 ? '#f59e0b' : '#6b7280',
            }}>
              {days < 0
                ? `Expired ${Math.abs(days)}d ago`
                : days === 0 ? 'Expires today'
                : `${days}d remaining`}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'status', header: 'Status',
      render: item => {
        const s = STATUS_COLOR[item.status] ?? STATUS_COLOR.depleted;
        return (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center',
            px: 2, py: 0.5,
            bgcolor: s.bg, color: s.color,
            borderRadius: 1, fontSize: 12, fontWeight: 600,
          }}>
            {s.label}
          </Box>
        );
      },
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: item => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          {onViewStockCard && (
            <Tooltip title="View Official Stock Card">
              <IconButton size="small" onClick={() => onViewStockCard(item)}
                sx={{ color: '#059669', width: 32, height: 32, '&:hover': { bgcolor: '#ecfdf5', color: '#047857' } }}>
                <StockCardIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Adjust Stock">
            <IconButton size="small" onClick={() => onAdjust(item)}
              sx={{ color: '#6b7280', width: 32, height: 32, '&:hover': { bgcolor: '#f3f4f6', color: '#059669' } }}>
              <AdjustIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="History">
            <IconButton size="small" onClick={() => onHistory(item)}
              sx={{ color: '#6b7280', width: 32, height: 32, '&:hover': { bgcolor: '#f3f4f6', color: '#3b82f6' } }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(item)}
              sx={{ color: '#6b7280', width: 32, height: 32, '&:hover': { bgcolor: '#f3f4f6', color: '#f59e0b' } }}>
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(item)}
              sx={{ color: '#6b7280', width: 32, height: 32, '&:hover': { bgcolor: '#fee2e2', color: '#dc2626' } }}>
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────
  return (
    <Box>

      {/* ── Filter bar ── */}
      <Box sx={{ mb: 3, p: 2, bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField fullWidth size="small" placeholder="Search vaccine type…"
              value={search} onChange={e => { onSearchChange(e.target.value); onPageChange(0); }}
              slotProps={{ input: { startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              ) } }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField fullWidth size="small" placeholder="Batch number…"
              value={batchFilter} onChange={e => { onBatchFilterChange(e.target.value); onPageChange(0); }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '13px' }}>Status</InputLabel>
              <Select label="Status" value={statusFilter}
                onChange={e => { onStatusFilterChange(e.target.value); onPageChange(0); }}
                sx={{ bgcolor: '#f9fafb', fontSize: '13px', '& fieldset': { borderColor: '#e5e7eb' }, '&:hover fieldset': { borderColor: '#9ca3af' }, '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' } }}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="depleted">Depleted</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField fullWidth size="small" label="Expiry from" type="date"
              value={expiryFrom} onChange={e => { onExpiryFromChange(e.target.value); onPageChange(0); }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField fullWidth size="small" label="Expiry to" type="date"
              value={expiryTo} onChange={e => { onExpiryToChange(e.target.value); onPageChange(0); }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 12, md: 1 }}>
            <Button fullWidth variant="outlined" size="small"
              onClick={() => {
                onSearchChange(''); onStatusFilterChange(''); onBatchFilterChange('');
                onExpiryFromChange(''); onExpiryToChange(''); onPageChange(0);
              }}
              sx={{ borderColor: '#e5e7eb', color: '#6b7280', textTransform: 'none', fontWeight: 500, fontSize: '13px', py: '9px', bgcolor: '#f9fafb', '&:hover': { borderColor: '#9ca3af', bgcolor: '#f3f4f6' } }}>
              Clear
            </Button>
          </Grid>

        </Grid>
      </Box>

      {/* ── Table ── */}
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden', background: '#ffffff' }}>
        <DataTable<InventoryItem>
          columns={columns}
          rows={items}
          loading={loading}
          skeletonRows={rowsPerPage}
          rowKey={item => item.inventory_id}
          emptyIcon={<InventoryIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
          emptyTitle="No inventory records found"
          emptySubtitle="Add your first vaccine batch to get started"
          emptyAction={{ label: 'Add Stock', onClick: onAddFirst }}
          minWidth={700}
        />

        <TablePaginator
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      </Paper>

    </Box>
  );
}
