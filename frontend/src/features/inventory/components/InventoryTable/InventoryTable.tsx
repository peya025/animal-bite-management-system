import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccessTime as OpenVialIcon,
  AcUnit as ColdChainIcon,
  Archive as ArchiveIcon,
  Cancel as DiscardIcon,
  CheckCircleOutlined as ActiveIcon,
  DateRange as DateRangeIcon,
  Edit as EditIcon,
  ErrorOutlined as ExpiredIcon,
  History as HistoryIcon,
  InfoOutlined as InfoIcon,
  Inventory2 as InventoryIcon,
  MoreVert as MoreIcon,
  PendingActions as PendingIcon,
  RemoveCircleOutlined as DepletedIcon,
  Search as SearchIcon,
  Tune as AdjustIcon,
  Visibility as ViewIcon,
  HourglassBottom as ExpiringIcon,
} from '@mui/icons-material';
import { DataTable, TablePaginator } from '../../../../components/data-display';
import type { ColumnDef } from '../../../../components/data-display';
import { formatDate } from '../../../../shared/utils';
import type { InventoryItem, VaccineTypePreset } from '../../types';
import {
  deriveInventoryStatus,
  describeOpenVialCountdown,
  getExpiryVisual,
  getStatusVisual,
} from '../../utils/inventoryStatus';

interface InventoryTableProps {
  items: InventoryItem[];
  allItems: InventoryItem[];
  presets?: VaccineTypePreset[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  total: number;
  search: string;
  statusFilter: string;
  batchFilter: string;
  sourceFilter: string;
  expiryFrom: string;
  expiryTo: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onBatchFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
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

function StatusIcon({ status }: { status: ReturnType<typeof deriveInventoryStatus> }) {
  if (status === 'Discard-Pending') return <PendingIcon sx={{ fontSize: 14 }} />;
  if (status === 'Expired') return <ExpiredIcon sx={{ fontSize: 14 }} />;
  if (status === 'Depleted') return <DepletedIcon sx={{ fontSize: 14 }} />;
  if (status === 'Expiring') return <ExpiringIcon sx={{ fontSize: 14 }} />;
  return <ActiveIcon sx={{ fontSize: 14 }} />;
}

function statusLabel(status: ReturnType<typeof deriveInventoryStatus>) {
  if (status === 'Discard-Pending') return 'Opened vial';
  if (status === 'Depleted') return 'Out of stock';
  if (status === 'Expiring') return 'Expiring soon';
  return status;
}

export default function InventoryTable({
  items,
  allItems,
  presets,
  loading,
  page,
  rowsPerPage,
  total,
  search,
  statusFilter,
  batchFilter,
  sourceFilter,
  expiryFrom,
  expiryTo,
  onSearchChange,
  onStatusFilterChange,
  onBatchFilterChange,
  onSourceFilterChange,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [, setTick] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [expiryAnchor, setExpiryAnchor] = useState<HTMLElement | null>(null);
  const [actionAnchor, setActionAnchor] = useState<HTMLElement | null>(null);
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const sourceOptions = useMemo(() => Array.from(new Set(
    allItems.map((item) => (item.received_from || '').trim()).filter(Boolean),
  )).sort(), [allItems]);

  const hasFilters = Boolean(search || statusFilter || batchFilter || sourceFilter || expiryFrom || expiryTo);
  const primaryText = isDark ? '#f8fafc' : '#111827';
  const secondaryText = isDark ? '#94a3b8' : '#64748b';
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
      borderRadius: 2,
      '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
      '&:hover fieldset': { borderColor: '#10b981' },
      '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: 1 },
    },
    '& .MuiOutlinedInput-input, & .MuiSelect-select': { fontSize: 12.5, color: primaryText },
    '& .MuiInputLabel-root': { fontSize: 12.5, color: secondaryText },
  };

  const closeActionMenu = () => {
    setActionAnchor(null);
    setActionItem(null);
  };

  const runAction = (action: (item: InventoryItem) => void) => {
    if (actionItem) action(actionItem);
    closeActionMenu();
  };

  const columns: ColumnDef<InventoryItem>[] = useMemo(() => [
    {
      key: 'vaccine_type',
      header: 'Vaccine',
      render: (item) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: primaryText }}>{item.vaccine_type}</Typography>
          {item.cold_chain_notes && (
            <Tooltip title={item.cold_chain_notes} arrow>
              <ColdChainIcon sx={{ fontSize: 14, color: '#0284c7' }} />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      key: 'batch_number',
      header: 'Batch / Lot',
      render: (item) => {
        const eligible = item.current_quantity > 0 && deriveInventoryStatus(item) !== 'Expired';
        return (
          <Box>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: primaryText }}>{item.batch_number}</Typography>
            {eligible && item.is_fifo_priority && <Typography component="span" sx={{ display: 'inline-block', mt: 0.45, px: 0.65, py: 0.15, borderRadius: 20, bgcolor: '#ecfdf5', color: '#047857', fontSize: 9.5, fontWeight: 700 }}>Use first</Typography>}
            {eligible && !item.is_fifo_priority && item.fifo_rank && <Typography sx={{ mt: 0.35, color: secondaryText, fontSize: 10 }}>FIFO #{item.fifo_rank}</Typography>}
          </Box>
        );
      },
    },
    {
      key: 'received_from',
      header: 'Supplier',
      render: (item) => {
        const supplier = item.received_from || '—';
        return <Tooltip title={supplier} arrow><Typography sx={{ maxWidth: 185, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: primaryText }}>{supplier}</Typography></Tooltip>;
      },
    },
    {
      key: 'current_quantity',
      header: 'Available / Capacity',
      align: 'center',
      render: (item) => {
        const empty = item.current_quantity <= 0;
        const low = !empty && item.current_quantity <= 10;
        const color = empty ? '#dc2626' : low ? '#d97706' : '#047857';
        const matchedPreset = presets?.find(
          (p) => p.vaccine_name.toLowerCase() === item.vaccine_type.toLowerCase()
        );
        const dpv = Number(
          (matchedPreset ? (matchedPreset.is_multidose ? (matchedPreset.doses_per_vial ?? 1) : 1) : null) ??
          item.doses_per_vial ??
          1
        );
        const openDosesRemaining = item.open_vial_status === 'opened'
          ? Math.max(0, dpv - Number(item.open_vial_doses_used || 0))
          : 0;
        const patientCapacity = (item.current_quantity * dpv) + openDosesRemaining;
        return (
          <Tooltip title={`${item.current_quantity} sealed vial${item.current_quantity === 1 ? '' : 's'} × ${dpv} dose${dpv === 1 ? '' : 's'} per vial${openDosesRemaining ? ` + ${openDosesRemaining} remaining dose${openDosesRemaining === 1 ? '' : 's'} from the opened vial` : ''}`} arrow>
            <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', px: empty || low ? 0.9 : 0, py: empty || low ? 0.4 : 0, borderRadius: 1.5, bgcolor: empty ? '#fef2f2' : low ? '#fffbeb' : 'transparent' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.45 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color }}>{item.current_quantity}</Typography>
                <Typography sx={{ fontSize: 10, color: secondaryText }}>vial{item.current_quantity === 1 ? '' : 's'}</Typography>
              </Box>
              <Typography sx={{ mt: 0.15, fontSize: 10, fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap' }}>
                ≈ {patientCapacity} patient{patientCapacity === 1 ? '' : 's'}
              </Typography>
              {openDosesRemaining > 0 && <Typography sx={{ mt: 0.1, fontSize: 9, color: '#0e7490' }}>includes {openDosesRemaining} open dose{openDosesRemaining === 1 ? '' : 's'}</Typography>}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      key: 'expiration',
      header: 'Expiration',
      render: (item) => {
        const derivedStatus = deriveInventoryStatus(item);
        const expiry = getExpiryVisual(item.expiration_date);
        const emphasized = derivedStatus === 'Expiring' || derivedStatus === 'Expired';
        const openVial = item.open_vial_status === 'opened' ? describeOpenVialCountdown(item.open_vial_discard_at) : null;
        return (
          <Box sx={{ minWidth: 150 }}>
            <Box sx={{ display: 'inline-block', px: emphasized ? 0.8 : 0, py: emphasized ? 0.45 : 0, borderRadius: 1.5, bgcolor: emphasized ? expiry.bg : 'transparent', border: emphasized ? `1px solid ${expiry.border}` : 'none' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: emphasized ? expiry.color : primaryText }}>{formatDate(item.expiration_date)}</Typography>
              <Typography sx={{ fontSize: 10, color: emphasized ? expiry.color : secondaryText }}>{expiry.detail}</Typography>
            </Box>
            {openVial && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.6, color: openVial.color }}>
                <OpenVialIcon sx={{ fontSize: 12 }} />
                <Typography sx={{ fontSize: 10, fontWeight: 600 }}>{openVial.label} · {openVial.secondary}</Typography>
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (item) => {
        const status = deriveInventoryStatus(item);
        const visual = getStatusVisual(status);
        return <Chip icon={<StatusIcon status={status} />} label={statusLabel(status)} size="small" sx={{ height: 24, fontSize: 10.5, fontWeight: 700, bgcolor: visual.bg, color: visual.color, border: `1px solid ${visual.border}`, '& .MuiChip-icon': { color: visual.color } }} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '150px',
      render: (item) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
          {onViewStockCard && <Button size="small" variant="outlined" startIcon={<ViewIcon sx={{ fontSize: '15px !important' }} />} onClick={() => onViewStockCard(item)} sx={{ minWidth: 70, px: 1, py: 0.35, borderRadius: 1.5, borderColor: '#a7f3d0', color: '#047857', textTransform: 'none', fontSize: 11, '&:hover': { bgcolor: '#ecfdf5', borderColor: '#6ee7b7' } }}>View</Button>}
          <Tooltip title="More actions">
            <IconButton size="small" aria-label={`More actions for ${item.vaccine_type} ${item.batch_number}`} onClick={(event) => { setActionAnchor(event.currentTarget); setActionItem(item); }} sx={{ width: 30, height: 30, color: secondaryText, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: 1.5 }}><MoreIcon sx={{ fontSize: 17 }} /></IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [isDark, onViewStockCard, primaryText, secondaryText]);

  return (
    <Box>
      <Paper elevation={0} sx={{ mb: 1.5, p: 1.25, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: 2.5, bgcolor: isDark ? '#111827' : '#fff' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(220px, 1.4fr) minmax(150px, .8fr) minmax(160px, .8fr) minmax(170px, 1fr) auto auto' }, gap: 1, alignItems: 'center' }}>
          <TextField fullWidth size="small" placeholder="Search vaccine" value={search} onChange={(event) => onSearchChange(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: secondaryText }} /></InputAdornment> } }} sx={fieldSx} />
          <TextField fullWidth size="small" placeholder="Batch / Lot" value={batchFilter} onChange={(event) => onBatchFilterChange(event.target.value)} sx={fieldSx} />
          <FormControl fullWidth size="small" sx={fieldSx}><InputLabel>Status</InputLabel><Select value={statusFilter} label="Status" onChange={(event) => onStatusFilterChange(event.target.value)}><MenuItem value="">All statuses</MenuItem><MenuItem value="active">Available / Active</MenuItem><MenuItem value="low-stock">Low stock (≤10)</MenuItem><MenuItem value="expiring-soon">Expiring soon</MenuItem><MenuItem value="expired">Expired</MenuItem><MenuItem value="depleted">Depleted</MenuItem><MenuItem value="discard-pending">Opened vial</MenuItem></Select></FormControl>
          <FormControl fullWidth size="small" sx={fieldSx}><InputLabel>Supplier</InputLabel><Select value={sourceFilter} label="Supplier" onChange={(event) => onSourceFilterChange(event.target.value)} renderValue={(value) => value || 'All suppliers'}><MenuItem value="">All suppliers</MenuItem>{sourceOptions.map((source) => <MenuItem key={source} value={source} sx={{ maxWidth: 380, whiteSpace: 'normal', fontSize: 12 }}>{source}</MenuItem>)}</Select></FormControl>
          <Button variant="outlined" startIcon={<DateRangeIcon sx={{ fontSize: '16px !important' }} />} onClick={(event) => setExpiryAnchor(event.currentTarget)} sx={{ height: 40, borderRadius: 2, borderColor: expiryFrom || expiryTo ? '#10b981' : isDark ? '#334155' : '#e2e8f0', color: expiryFrom || expiryTo ? '#047857' : secondaryText, textTransform: 'none', whiteSpace: 'nowrap', fontSize: 11.5 }}>{expiryFrom || expiryTo ? 'Expiry applied' : 'Expiry date'}</Button>
          <Button disabled={!hasFilters} onClick={() => { onSearchChange(''); onStatusFilterChange(''); onBatchFilterChange(''); onSourceFilterChange(''); onExpiryFromChange(''); onExpiryToChange(''); onPageChange(0); }} sx={{ minWidth: 0, color: secondaryText, textTransform: 'none', fontSize: 11.5, whiteSpace: 'nowrap' }}>Clear filters</Button>
        </Box>
      </Paper>

      <Popover open={Boolean(expiryAnchor)} anchorEl={expiryAnchor} onClose={() => setExpiryAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 0.75, p: 1.5, borderRadius: 2.5, width: 290 } } }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: primaryText, mb: 1 }}>Expiration range</Typography>
        <Stack spacing={1}><TextField fullWidth size="small" type="date" label="Expiry after" value={expiryFrom} onChange={(event) => onExpiryFromChange(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} /><TextField fullWidth size="small" type="date" label="Expiry before" value={expiryTo} onChange={(event) => onExpiryToChange(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} /></Stack>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}><Button size="small" onClick={() => { onExpiryFromChange(''); onExpiryToChange(''); }} sx={{ color: secondaryText, textTransform: 'none', fontSize: 11 }}>Clear</Button><Button size="small" onClick={() => setExpiryAnchor(null)} sx={{ color: '#047857', textTransform: 'none', fontSize: 11, fontWeight: 700 }}>Done</Button></Box>
      </Popover>

      <Paper elevation={0} sx={{ border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, borderRadius: 2.5, overflow: 'hidden', bgcolor: isDark ? '#111827' : '#fff' }}>
        <Box sx={{ px: 1.75, py: 1.25, display: 'flex', alignItems: 'center', gap: 0.75, borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}` }}>
          <InventoryIcon sx={{ fontSize: 18, color: '#059669' }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: primaryText }}>Inventory Batches</Typography>
          <Typography sx={{ fontSize: 10.5, color: secondaryText }}>{total} record{total === 1 ? '' : 's'}</Typography>
          <Button size="small" startIcon={<InfoIcon sx={{ fontSize: '15px !important' }} />} onClick={() => setGuideOpen(true)} sx={{ ml: 'auto', color: secondaryText, textTransform: 'none', fontSize: 11 }}>Inventory guide</Button>
        </Box>
        <DataTable columns={columns} rows={items} rowKey={(item) => item.inventory_id} loading={loading} emptyState={<Box sx={{ textAlign: 'center', py: 8, px: 2 }}><InventoryIcon sx={{ fontSize: 42, color: '#cbd5e1', mb: 1 }} /><Typography sx={{ fontWeight: 700, fontSize: 15, color: primaryText }}>No vaccine batches found</Typography><Typography sx={{ fontSize: 12, color: secondaryText, mt: 0.5, mb: 2 }}>{hasFilters ? 'No inventory batches match the current filters.' : 'Add the clinic’s first stock batch to begin tracking inventory.'}</Typography>{!hasFilters && <Button variant="contained" onClick={onAddFirst} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700 }}>Add first stock batch</Button>}</Box>} />
        <TablePaginator count={total} page={page} rowsPerPage={rowsPerPage} onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange} rowsPerPageOptions={[10, 15, 25, 50]} />
      </Paper>

      <Menu anchorEl={actionAnchor} open={Boolean(actionAnchor && actionItem)} onClose={closeActionMenu} slotProps={{ paper: { sx: { mt: 0.5, minWidth: 205, borderRadius: 2 } } }}>
        {actionItem?.current_quantity && actionItem.open_vial_hours && actionItem.open_vial_status !== 'opened' && onOpenVial ? <MenuItem onClick={() => runAction(onOpenVial)} sx={{ fontSize: 12 }}><OpenVialIcon sx={{ fontSize: 16, mr: 1, color: '#2563eb' }} />Mark vial opened</MenuItem> : null}
        {actionItem?.open_vial_status === 'opened' && onDiscardVial ? <MenuItem onClick={() => runAction(onDiscardVial)} sx={{ fontSize: 12 }}><DiscardIcon sx={{ fontSize: 16, mr: 1, color: '#c2410c' }} />Discard opened vial</MenuItem> : null}
        {Boolean(actionItem?.open_vial_status === 'opened' || (actionItem?.current_quantity && actionItem?.open_vial_hours)) && <Divider />}
        <MenuItem onClick={() => runAction(onAdjust)} sx={{ fontSize: 12 }}><AdjustIcon sx={{ fontSize: 16, mr: 1, color: '#64748b' }} />Adjust stock</MenuItem>
        <MenuItem onClick={() => runAction(onHistory)} sx={{ fontSize: 12 }}><HistoryIcon sx={{ fontSize: 16, mr: 1, color: '#64748b' }} />Transaction history</MenuItem>
        <MenuItem onClick={() => runAction(onEdit)} sx={{ fontSize: 12 }}><EditIcon sx={{ fontSize: 16, mr: 1, color: '#64748b' }} />Edit batch</MenuItem>
        <MenuItem onClick={() => runAction(onDelete)} sx={{ fontSize: 12, color: '#b45309' }}><ArchiveIcon sx={{ fontSize: 16, mr: 1 }} />Archive batch</MenuItem>
      </Menu>

      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Inventory guide</DialogTitle>
        <DialogContent dividers><Stack spacing={2}><Box><Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Batch expiration</Typography><Typography sx={{ mt: 0.25, fontSize: 12, color: secondaryText }}>The manufacturer’s expiration date for sealed stock. Normal dates remain neutral; approaching or elapsed dates are highlighted.</Typography></Box><Box><Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Opened-vial discard time</Typography><Typography sx={{ mt: 0.25, fontSize: 12, color: secondaryText }}>A separate safety clock begins only after a multidose vial is marked opened. It does not replace the sealed batch expiration date.</Typography></Box><Box><Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Vials and doses</Typography><Typography sx={{ mt: 0.25, fontSize: 12, color: secondaryText }}>One vial is one vaccine bottle and may contain multiple patient doses. Hover over an available-vial count to see estimated capacity.</Typography></Box><Box><Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>FIFO / FEFO</Typography><Typography sx={{ mt: 0.25, fontSize: 12, color: secondaryText }}>Use the batch marked “Use first” before later-expiring stock whenever clinically appropriate.</Typography></Box></Stack></DialogContent>
        <DialogActions><Button onClick={() => setGuideOpen(false)} sx={{ color: '#047857', textTransform: 'none', fontWeight: 700 }}>Got it</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
