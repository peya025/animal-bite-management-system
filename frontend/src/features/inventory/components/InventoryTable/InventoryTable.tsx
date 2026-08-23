import { useState, useEffect } from 'react';
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
  Vaccines as VaccineIcon,
  AccessTime as OpenVialIcon,
  Cancel as DiscardIcon,
  AcUnit as ColdChainIcon,
} from '@mui/icons-material';
import { DataTable, TablePaginator } from '../../../../components/data-display';
import type { ColumnDef } from '../../../../components/data-display';
import type { InventoryItem } from '../../types';
import { formatDate, daysUntil } from '../../../../shared/utils';

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
  onOpenVial?: (item: InventoryItem) => void;
  onDiscardVial?: (item: InventoryItem) => void;
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

// ─── Helper: Format Vial Countdown ────────────────────────────
function getOpenVialCountdown(discardAtStr?: string) {
  if (!discardAtStr) return null;
  const target = new Date(discardAtStr).getTime();
  const now = Date.now();
  const diffMs = target - now;

  const discardTime = new Date(discardAtStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffMs <= 0) {
    const expiredMins = Math.abs(Math.floor(diffMs / 60000));
    return {
      isExpired: true,
      text: `⚠️ Discard Overdue (${expiredMins}m ago)`,
      timeStr: discardTime,
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#fca5a5',
    };
  }

  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const remainingStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const isUrgent = hours < 2;

  return {
    isExpired: false,
    text: `⚡ Discard by ${discardTime} (in ${remainingStr})`,
    timeStr: discardTime,
    color: isUrgent ? '#d97706' : '#059669',
    bg: isUrgent ? '#fef3c7' : '#ecfdf5',
    border: isUrgent ? '#fcd34d' : '#86efac',
  };
}

// ─── Component ────────────────────────────────────────────────

export default function InventoryTable({
  items, loading,
  page, rowsPerPage, total,
  search, statusFilter, batchFilter, expiryFrom, expiryTo,
  onSearchChange, onStatusFilterChange, onBatchFilterChange,
  onExpiryFromChange, onExpiryToChange,
  onPageChange, onRowsPerPageChange,
  onEdit, onAdjust, onHistory, onDelete, onViewStockCard,
  onOpenVial, onDiscardVial, onAddFirst,
}: InventoryTableProps) {

  // Live timer tick to keep open vial countdowns updated every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const isLowStock = (q: number) => q > 0 && q <= 10;

  // ── Dynamically compute FIFO rankings for active stock (Earliest expiry first) ──
  const fifoMap: Record<string, number[]> = {};
  const activeSorted = [...items]
    .filter(i => i.status === 'active' && i.current_quantity > 0)
    .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());

  activeSorted.forEach(item => {
    if (!fifoMap[item.vaccine_type]) {
      fifoMap[item.vaccine_type] = [];
    }
    fifoMap[item.vaccine_type].push(item.inventory_id);
  });

  // ── Column definitions matching Left-to-Right field mapping ──
  const columns: ColumnDef<InventoryItem>[] = [
    // 1. Vaccine Type
    {
      key: 'vaccine_type', header: 'Vaccine Type',
      render: item => (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#111827', lineHeight: 1.3 }}>
            {item.vaccine_type}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>
              ID: #{item.inventory_id}
            </Typography>
            {item.cold_chain_notes && (
              <Tooltip title={item.cold_chain_notes}>
                <Chip
                  icon={<ColdChainIcon style={{ fontSize: 11, color: '#0284c7' }} />}
                  label="+2°C to +8°C"
                  size="small"
                  sx={{ height: 17, fontSize: 9.5, bgcolor: '#f0f9ff', color: '#0369a1', px: 0.2 }}
                />
              </Tooltip>
            )}
          </Stack>
        </Box>
      ),
    },

    // 2. Batch Number + FIFO Priority
    {
      key: 'batch_number', header: 'Batch No. / FIFO',
      render: item => {
        const ranks = fifoMap[item.vaccine_type] || [];
        const rankIdx = ranks.indexOf(item.inventory_id);
        const isFifoFirst = (item.is_fifo_priority ?? (rankIdx === 0)) && item.status === 'active' && item.current_quantity > 0;
        const isFifoNext = rankIdx > 0 && item.status === 'active' && item.current_quantity > 0;

        return (
          <Box>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              {item.batch_number}
            </Typography>
            {isFifoFirst && (
              <Chip
                label="🟢 USE FIRST"
                size="small"
                sx={{
                  mt: 0.5,
                  height: 20,
                  fontSize: 10,
                  fontWeight: 800,
                  bgcolor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  letterSpacing: '0.2px',
                }}
              />
            )}
            {isFifoNext && (
              <Chip
                label={`⏳ FIFO #${rankIdx + 1}`}
                size="small"
                sx={{
                  mt: 0.5,
                  height: 19,
                  fontSize: 9.5,
                  fontWeight: 600,
                  bgcolor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                }}
              />
            )}
          </Box>
        );
      },
    },

    // 3. Received From (Source/Supplier)
    {
      key: 'received_from', header: 'Received From',
      render: item => (
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {item.received_from || 'DOH Central Supply'}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: '#9ca3af', mt: 0.25 }}>
            Source / Depot
          </Typography>
        </Box>
      ),
    },

    // 4. Dispensed (Usage)
    {
      key: 'dispensed', header: 'Dispensed',
      render: item => (
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#dc2626', mb: 0.25 }}>
            {item.total_dispensed || 0}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: '#9ca3af' }}>
            vials used
          </Typography>
        </Box>
      ),
    },

    // 5. Balance (Emphasized Current Stock)
    {
      key: 'current_quantity', header: 'Balance',
      render: item => {
        const low  = isLowStock(item.current_quantity);
        const zero = item.current_quantity === 0;
        return (
          <Box sx={{ 
            textAlign: 'center',
            p: 1,
            bgcolor: zero ? '#fee2e2' : low ? '#fef3c7' : '#ecfdf5',
            borderRadius: 1.5,
            border: `2px solid ${zero ? '#dc2626' : low ? '#f59e0b' : '#10b981'}`,
          }}>
            <Typography sx={{
              fontWeight: 800, 
              fontSize: 17,
              color: zero ? '#dc2626' : low ? '#d97706' : '#059669',
              mb: 0.25,
            }}>
              {item.current_quantity}
            </Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>
              vials
            </Typography>
            <Typography sx={{ fontSize: 9.5, color: '#9ca3af', mt: 0.25 }}>
              ≈ {item.current_quantity * 3} patients
            </Typography>
          </Box>
        );
      },
    },

    // 6. Expiration (Dual Display: Batch-level + Vial-level countdown)
    {
      key: 'expiration_date', header: 'Expiration & Open-Vial',
      render: item => {
        const days = daysUntil(item.expiration_date);
        const isExpired = days < 0;
        const isExpiringSoon = days >= 0 && days <= 30;
        const openVialCountdown = item.open_vial_status === 'opened' ? getOpenVialCountdown(item.open_vial_discard_at) : null;

        return (
          <Box sx={{ minWidth: 160 }}>
            {/* Batch-level unopened expiration */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                {formatDate(item.expiration_date)}
              </Typography>
              <Chip
                label={
                  isExpired 
                    ? `🔴 Expired`
                    : isExpiringSoon
                    ? `🟠 ${days}d left`
                    : `🟢 ${days}d`
                }
                size="small"
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: isExpired ? '#fee2e2' : isExpiringSoon ? '#fef3c7' : '#ecfdf5',
                  color: isExpired ? '#991b1b' : isExpiringSoon ? '#92400e' : '#065f46',
                  border: `1px solid ${isExpired ? '#fca5a5' : isExpiringSoon ? '#fcd34d' : '#86efac'}`,
                }}
              />
            </Box>

            {/* Vial-level (opened) discard countdown */}
            {openVialCountdown ? (
              <Box
                sx={{
                  p: 0.75,
                  borderRadius: 1.5,
                  bgcolor: openVialCountdown.bg,
                  border: `1px solid ${openVialCountdown.border}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <OpenVialIcon sx={{ fontSize: 14, color: openVialCountdown.color }} />
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: openVialCountdown.color }}>
                  {openVialCountdown.text}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 10.5, color: '#9ca3af' }}>
                Unopened (Cold-chain sealed)
              </Typography>
            )}
          </Box>
        );
      },
    },

    // 7. Status
    {
      key: 'status', header: 'Status',
      render: item => {
        const s = STATUS_COLOR[item.status] ?? STATUS_COLOR.depleted;
        return (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center',
            px: 1.5, py: 0.5,
            bgcolor: s.bg, color: s.color,
            borderRadius: 1, fontSize: 11.5, fontWeight: 700,
          }}>
            {s.label}
          </Box>
        );
      },
    },

    // 8. Actions (Operations + Open/Discard Vial)
    {
      key: 'actions', header: 'Actions', align: 'center', width: '230px',
      render: item => {
        const isVialOpened = item.open_vial_status === 'opened';
        const hasStock = item.current_quantity > 0;

        return (
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', pr: 1 }}>
            {/* Open / Discard Vial Action */}
            {hasStock && !isVialOpened && onOpenVial && (
              <Tooltip title="Mark 1 Vial OPENED (Start Discard Countdown)">
                <IconButton
                  size="small"
                  onClick={() => onOpenVial(item)}
                  sx={{
                    color: '#d97706',
                    width: 30,
                    height: 30,
                    bgcolor: '#fffbeb',
                    border: '1px solid #fde68a',
                    '&:hover': { bgcolor: '#fef3c7', color: '#b45309' },
                  }}
                >
                  <OpenVialIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}

            {isVialOpened && onDiscardVial && (
              <Tooltip title="Clear / Mark Open Vial Discarded">
                <IconButton
                  size="small"
                  onClick={() => onDiscardVial(item)}
                  sx={{
                    color: '#dc2626',
                    width: 30,
                    height: 30,
                    bgcolor: '#fef2f2',
                    border: '1px solid #fecaca',
                    '&:hover': { bgcolor: '#fee2e2', color: '#b91c1c' },
                  }}
                >
                  <DiscardIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}

            {onViewStockCard && (
              <Tooltip title="View Official Stock Card">
                <IconButton size="small" onClick={() => onViewStockCard(item)}
                  sx={{ color: '#059669', width: 30, height: 30, '&:hover': { bgcolor: '#ecfdf5', color: '#047857' } }}>
                  <StockCardIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Adjust Stock">
              <IconButton size="small" onClick={() => onAdjust(item)}
                sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#f3f4f6', color: '#059669' } }}>
                <AdjustIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Transaction History">
              <IconButton size="small" onClick={() => onHistory(item)}
                sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#f3f4f6', color: '#3b82f6' } }}>
                <HistoryIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Edit Batch Details">
              <IconButton size="small" onClick={() => onEdit(item)}
                sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#f3f4f6', color: '#f59e0b' } }}>
                <EditIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => onDelete(item)}
                sx={{ color: '#6b7280', width: 30, height: 30, '&:hover': { bgcolor: '#fee2e2', color: '#dc2626' } }}>
                <DeleteIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
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
                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#9ca3af' }} /></InputAdornment>
              ) } }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <TextField fullWidth size="small" placeholder="Filter by batch number…"
              value={batchFilter} onChange={e => { onBatchFilterChange(e.target.value); onPageChange(0); }}
              sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status"
                onChange={e => { onStatusFilterChange(e.target.value); onPageChange(0); }}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="depleted">Depleted</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth size="small" type="date" label="Expiry After"
              value={expiryFrom} onChange={e => onExpiryFromChange(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth size="small" type="date" label="Expiry Before"
              value={expiryTo} onChange={e => onExpiryToChange(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 0.5 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => {
              onSearchChange(''); onStatusFilterChange(''); onBatchFilterChange('');
              onExpiryFromChange(''); onExpiryToChange(''); onPageChange(0);
            }} sx={{ color: '#6b7280', fontSize: 12, textTransform: 'none', minWidth: 0, p: 0.5 }}>
              Clear
            </Button>
          </Grid>

        </Grid>
      </Box>

      {/* ── Table Card ── */}
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(item) => item.inventory_id}
          loading={loading}
          emptyState={
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <InventoryIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1.5, opacity: 0.6 }} />
              <Typography sx={{ fontWeight: 600, fontSize: 16, color: '#374151', mb: 0.5 }}>
                No Vaccine Batches Found
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#6b7280', mb: 2.5 }}>
                {search || statusFilter || batchFilter
                  ? 'No inventory items match your current filter settings.'
                  : 'Get started by adding your clinic\'s first vaccine stock batch.'}
              </Typography>
              {!search && !statusFilter && !batchFilter && (
                <Button variant="contained" onClick={onAddFirst}
                  sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 600 }}>
                  Add First Vaccine Stock
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
