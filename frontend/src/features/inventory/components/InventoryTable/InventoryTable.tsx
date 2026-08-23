import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Inventory2 as InventoryIcon,
  Search as SearchIcon,
  Tune as AdjustIcon,
  Assignment as StockCardIcon,
  AccessTime as OpenVialIcon,
  Cancel as DiscardIcon,
  AcUnit as ColdChainIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutlined as ActiveIcon,
  ErrorOutlined as ExpiredIcon,
  RemoveCircleOutlined as DepletedIcon,
  HourglassBottom as ExpiringIcon,
  PendingActions as PendingIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DataTable, TablePaginator } from '../../../../components/data-display';
import type { ColumnDef } from '../../../../components/data-display';
import type { InventoryItem } from '../../types';
import { formatDate } from '../../../../shared/utils';
import {
  deriveInventoryStatus,
  describeOpenVialCountdown,
  getExpiryVisual,
  getStatusVisual,
} from '../../utils/inventoryStatus';

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
  onOpenVial?: (item: InventoryItem) => void;
  onDiscardVial?: (item: InventoryItem) => void;
  onAddFirst: () => void;
}

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

function StatusIcon({ status }: { status: ReturnType<typeof deriveInventoryStatus> }) {
  switch (status) {
    case 'Discard-Pending':
      return <PendingIcon sx={{ fontSize: 15 }} />;
    case 'Expired':
      return <ExpiredIcon sx={{ fontSize: 15 }} />;
    case 'Depleted':
      return <DepletedIcon sx={{ fontSize: 15 }} />;
    case 'Expiring':
      return <ExpiringIcon sx={{ fontSize: 15 }} />;
    case 'Active':
    default:
      return <ActiveIcon sx={{ fontSize: 15 }} />;
  }
}

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
  onViewStockCard,
  onOpenVial,
  onDiscardVial,
  onAddFirst,
}: InventoryTableProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const columns: ColumnDef<InventoryItem>[] = useMemo(() => [
    {
      key: 'vaccine_type',
      header: 'Vaccine Type',
      render: (item) => (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#111827', lineHeight: 1.35 }}>
            {item.vaccine_type}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
              ID #{item.inventory_id}
            </Typography>
            {item.cold_chain_notes && (
              <Tooltip title={item.cold_chain_notes}>
                <Chip
                  icon={<ColdChainIcon style={{ fontSize: 12, color: '#0369a1' }} />}
                  label="Cold-chain"
                  size="small"
                  sx={{ height: 20, fontSize: 10, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
                />
              </Tooltip>
            )}
          </Stack>
        </Box>
      ),
    },
    {
      key: 'batch_number',
      header: 'Batch No. / FIFO',
      render: (item) => {
        const showPriority = item.current_quantity > 0 && deriveInventoryStatus(item) !== 'Expired';
        return (
          <Box>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              {item.batch_number}
            </Typography>
            {showPriority && item.is_fifo_priority && (
              <Chip
                label="Use first"
                size="small"
                sx={{ mt: 0.75, height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}
              />
            )}
            {showPriority && !item.is_fifo_priority && item.fifo_rank && (
              <Chip
                label={`FIFO #${item.fifo_rank}`}
                size="small"
                sx={{ mt: 0.75, height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}
              />
            )}
          </Box>
        );
      },
    },
    {
      key: 'received_from',
      header: 'Received From',
      render: (item) => (
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {item.received_from || '—'}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: '#94a3b8', mt: 0.25 }}>
            Source / supplier
          </Typography>
        </Box>
      ),
    },
    {
      key: 'dispensed',
      header: 'Dispensed',
      align: 'center',
      render: (item) => (
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>
            {item.total_dispensed || 0}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: '#94a3b8' }}>
            read-only
          </Typography>
        </Box>
      ),
    },
    {
      key: 'current_quantity',
      header: 'Balance',
      align: 'center',
      render: (item) => {
        const low = item.current_quantity > 0 && item.current_quantity <= 10;
        const empty = item.current_quantity <= 0;
        return (
          <Box
            sx={{
              textAlign: 'center',
              p: 1,
              minWidth: 92,
              bgcolor: empty ? '#f8fafc' : low ? '#fff7ed' : '#ecfdf5',
              borderRadius: 1.5,
              border: `1px solid ${empty ? '#cbd5e1' : low ? '#fdba74' : '#86efac'}`,
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: empty ? '#475569' : low ? '#c2410c' : '#047857' }}>
              {item.current_quantity}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#64748b' }}>
              units left
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'expiration',
      header: 'Expiration',
      width: '220px',
      render: (item) => {
        const expiryVisual = getExpiryVisual(item.expiration_date);
        const openVial = item.open_vial_status === 'opened'
          ? describeOpenVialCountdown(item.open_vial_discard_at)
          : null;

        return (
          <Box sx={{ minWidth: 190 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: expiryVisual.bg,
                border: `1px solid ${expiryVisual.border}`,
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.35 }}>
                <CalendarIcon sx={{ fontSize: 14, color: expiryVisual.color }} />
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: expiryVisual.color }}>
                  Batch expiration
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1f2937' }}>
                {formatDate(item.expiration_date)}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: expiryVisual.color, fontWeight: 700 }}>
                {expiryVisual.detail}
              </Typography>
            </Box>

            {openVial ? (
              <Box
                sx={{
                  mt: 0.9,
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: openVial.bg,
                  border: `1px solid ${openVial.border}`,
                }}
              >
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.35 }}>
                  <OpenVialIcon sx={{ fontSize: 14, color: openVial.color }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: openVial.color }}>
                    Open-vial discard
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: openVial.color }}>
                  {openVial.label}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: openVial.color }}>
                  {openVial.secondary}
                </Typography>
              </Box>
            ) : item.open_vial_hours ? (
              <Typography sx={{ fontSize: 10.5, color: '#64748b', mt: 0.85 }}>
                Open-vial timer starts only after <strong>Mark Vial Opened</strong>.
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 10.5, color: '#64748b', mt: 0.85 }}>
                Single-dose or no open-vial discard rule.
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const derivedStatus = deriveInventoryStatus(item);
        const visual = getStatusVisual(derivedStatus);

        return (
          <Chip
            icon={<StatusIcon status={derivedStatus} />}
            label={visual.label}
            size="small"
            sx={{
              height: 26,
              fontSize: 11.5,
              fontWeight: 800,
              bgcolor: visual.bg,
              color: visual.color,
              border: `1px solid ${visual.border}`,
              '& .MuiChip-icon': { color: visual.color },
            }}
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '240px',
      render: (item) => {
        const canUseOpenVialTimer = !!item.open_vial_hours && item.open_vial_hours > 0;
        const isOpened = item.open_vial_status === 'opened';
        const hasStock = item.current_quantity > 0;

        return (
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', pr: 1 }}>
            {hasStock && canUseOpenVialTimer && !isOpened && onOpenVial && (
              <Tooltip title="Mark vial opened">
                <IconButton
                  size="small"
                  onClick={() => onOpenVial(item)}
                  sx={{ color: '#1d4ed8', width: 30, height: 30, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', '&:hover': { bgcolor: '#dbeafe' } }}
                >
                  <OpenVialIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}

            {isOpened && onDiscardVial && (
              <Tooltip title="Mark opened vial discarded">
                <IconButton
                  size="small"
                  onClick={() => onDiscardVial(item)}
                  sx={{ color: '#c2410c', width: 30, height: 30, bgcolor: '#fff7ed', border: '1px solid #fdba74', '&:hover': { bgcolor: '#ffedd5' } }}
                >
                  <DiscardIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}

            {onViewStockCard && (
              <Tooltip title="View stock card">
                <IconButton size="small" onClick={() => onViewStockCard(item)} sx={{ color: '#059669', width: 30, height: 30, '&:hover': { bgcolor: '#ecfdf5', color: '#047857' } }}>
                  <StockCardIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Adjust stock">
              <IconButton size="small" onClick={() => onAdjust(item)} sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#f3f4f6', color: '#059669' } }}>
                <AdjustIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Transaction history">
              <IconButton size="small" onClick={() => onHistory(item)} sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#f3f4f6', color: '#2563eb' } }}>
                <HistoryIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Edit batch details">
              <IconButton size="small" onClick={() => onEdit(item)} sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#f3f4f6', color: '#d97706' } }}>
                <EditIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete batch">
              <IconButton size="small" onClick={() => onDelete(item)} sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#fee2e2', color: '#dc2626' } }}>
                <DeleteIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ], [onAdjust, onDelete, onDiscardVial, onEdit, onHistory, onOpenVial, onViewStockCard]);

  return (
    <Box>
      <Box sx={{ mb: 3, p: 2, bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search vaccine type"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Filter by batch number"
              value={batchFilter}
              onChange={(e) => onBatchFilterChange(e.target.value)}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => onStatusFilterChange(e.target.value)}>
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expiring">Expiring</MenuItem>
                <MenuItem value="discard-pending">Discard-Pending</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="depleted">Depleted</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Expiry after"
              value={expiryFrom}
              onChange={(e) => onExpiryFromChange(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Expiry before"
              value={expiryTo}
              onChange={(e) => onExpiryToChange(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 0.5 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('');
                onBatchFilterChange('');
                onExpiryFromChange('');
                onExpiryToChange('');
                onPageChange(0);
              }}
              sx={{ color: '#6b7280', fontSize: 12, textTransform: 'none', minWidth: 0, p: 0.5 }}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
          p: 1.5,
          mb: 2,
          bgcolor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <WarningIcon sx={{ color: '#2563eb', mt: 0.1 }} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              Two separate clocks are shown in each row
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
              <strong>Batch expiration</strong> tracks the sealed stock life. <strong>Open-vial discard</strong> appears only after a vial is opened and uses its own timer style.
            </Typography>
          </Box>
        </Box>
        <Chip label="Daily-use inventory view" size="small" sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(item) => item.inventory_id}
          loading={loading}
          emptyState={
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <InventoryIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1.5, opacity: 0.6 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#374151', mb: 0.5 }}>
                No vaccine batches found
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#6b7280', mb: 2.5 }}>
                {search || statusFilter || batchFilter || expiryFrom || expiryTo
                  ? 'No inventory batches match the current filters.'
                  : 'Get started by adding the clinic’s first stock batch.'}
              </Typography>
              {!search && !statusFilter && !batchFilter && !expiryFrom && !expiryTo && (
                <Button
                  variant="contained"
                  onClick={onAddFirst}
                  sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700 }}
                >
                  Add first stock batch
                </Button>
              )}
            </Box>
          }
        />
        <TablePaginator
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
