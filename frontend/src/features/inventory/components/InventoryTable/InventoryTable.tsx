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
  HourglassBottom as ExpiringIcon,
  WarningAmber as WarningAmberIcon,
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
  getCategoryBadgeStyle,
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
  categoryFilter: string;
  statusFilter: string;
  batchFilter: string;
  sourceFilter: string;
  expiryFrom: string;
  expiryTo: string;
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
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
  categoryFilter,
  statusFilter,
  batchFilter,
  sourceFilter,
  expiryFrom,
  expiryTo,
  onSearchChange,
  onCategoryFilterChange,
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

  const outOfStockItems = useMemo(() => {
    return allItems.filter((item) => (item.current_quantity ?? 0) <= 0 || deriveInventoryStatus(item) === 'Depleted');
  }, [allItems]);

  const outOfStockCount = outOfStockItems.length;
  const isOutOfStockFiltered = statusFilter === 'depleted';

  const handleToggleOutOfStockFilter = () => {
    if (isOutOfStockFiltered) {
      onStatusFilterChange('');
    } else {
      onStatusFilterChange('depleted');
    }
  };

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const sourceOptions = useMemo(() => Array.from(new Set(
    allItems.map((item) => (item.received_from || '').trim()).filter(Boolean),
  )).sort(), [allItems]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    [
      'Anti-Rabies Vaccines (ARV)',
      'Anti-Tetanus Serum (ATS)',
      'Tetanus & Toxoids',
      'Rabies Immunoglobulins (RIG)',
      'Other Biologicals',
    ].forEach((c) => set.add(c));

    presets?.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });

    allItems.forEach((i) => {
      if (i.vaccine_category?.trim()) set.add(i.vaccine_category.trim());
    });

    const hasUnspecified = allItems.some(
      (item) => !item.vaccine_category && !presets?.some((p) => p.vaccine_name.toLowerCase() === item.vaccine_type.toLowerCase() && p.category)
    );
    if (hasUnspecified) {
      set.add('Not specified');
    }

    return Array.from(set);
  }, [presets, allItems]);

  const hasFilters = Boolean(search || categoryFilter || statusFilter || batchFilter || sourceFilter || expiryFrom || expiryTo);
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
      width: '120px',
      render: (item) => (
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: primaryText }}>{item.vaccine_type}</Typography>
      ),
    },
    {
      key: 'vaccine_category',
      header: 'Vaccine Category',
      width: '190px',
      render: (item) => {
        const matchedPreset = presets?.find(
          (p) => p.vaccine_name.toLowerCase() === item.vaccine_type.toLowerCase()
        );
        const category = item.vaccine_category || matchedPreset?.category || null;
        const style = getCategoryBadgeStyle(category, isDark);
        return (
          <Chip
            label={category || 'Not specified'}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: 11,
              height: 24,
              bgcolor: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
              whiteSpace: 'nowrap',
            }}
          />
        );
      },
    },
    {
      key: 'batch_number',
      header: 'Batch / Lot',
      width: '120px',
      render: (item) => {
        const isDepleted = item.current_quantity <= 0;
        const eligible = !isDepleted && deriveInventoryStatus(item) !== 'Expired';
        return (
          <Box>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: 12.5,
                fontWeight: 700,
                color: isDepleted ? (isDark ? '#f87171' : '#dc2626') : primaryText,
              }}
            >
              {item.batch_number}
            </Typography>
            {eligible && item.is_fifo_priority && <Typography component="span" sx={{ display: 'inline-block', mt: 0.45, px: 0.65, py: 0.15, borderRadius: 20, bgcolor: '#ecfdf5', color: '#047857', fontSize: 9.5, fontWeight: 700 }}>Use first</Typography>}
            {eligible && !item.is_fifo_priority && item.fifo_rank && <Typography sx={{ mt: 0.35, color: secondaryText, fontSize: 10 }}>FIFO #{item.fifo_rank}</Typography>}
          </Box>
        );
      },
    },
    {
      key: 'received_from',
      header: 'Supplier',
      width: '180px',
      render: (item) => {
        const supplier = item.received_from || '—';
        return <Tooltip title={supplier} arrow><Typography sx={{ maxWidth: 175, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: primaryText }}>{supplier}</Typography></Tooltip>;
      },
    },
    {
      key: 'current_quantity',
      header: 'Available / Capacity',
      align: 'center',
      width: '145px',
      render: (item) => {
        const empty = item.current_quantity <= 0;
        const low = !empty && item.current_quantity <= 10;
        const color = empty
          ? (isDark ? '#f87171' : '#dc2626')
          : low
            ? (isDark ? '#fbbf24' : '#d97706')
            : (isDark ? '#34d399' : '#047857');
        const unitColor = empty
          ? (isDark ? '#fca5a5' : '#dc2626')
          : secondaryText;
        const capacityColor = empty
          ? (isDark ? '#f87171' : '#dc2626')
          : '#2563eb';
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
            <Box
              sx={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: empty || low ? 1.1 : 0,
                py: empty || low ? 0.45 : 0,
                borderRadius: 1.5,
                bgcolor: empty
                  ? (isDark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2')
                  : low
                    ? (isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb')
                    : 'transparent',
                border: empty
                  ? `1px solid ${isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca'}`
                  : low
                    ? `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7'}`
                    : '1px solid transparent',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.45 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color }}>{item.current_quantity}</Typography>
                <Typography sx={{ fontSize: 10, fontWeight: empty ? 600 : 400, color: unitColor }}>
                  vial{item.current_quantity === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Typography sx={{ mt: 0.15, fontSize: 10, fontWeight: 600, color: capacityColor, whiteSpace: 'nowrap' }}>
                ≈ {patientCapacity} patient{patientCapacity === 1 ? '' : 's'}
              </Typography>
              {openDosesRemaining > 0 && (
                <Typography sx={{ mt: 0.1, fontSize: 9, color: empty ? (isDark ? '#fca5a5' : '#dc2626') : '#0e7490' }}>
                  includes {openDosesRemaining} open dose{openDosesRemaining === 1 ? '' : 's'}
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      key: 'expiration',
      header: 'Expiration',
      width: '155px',
      render: (item) => {
        const derivedStatus = deriveInventoryStatus(item);
        const expiry = getExpiryVisual(item.expiration_date);
        const emphasized = derivedStatus === 'Expiring' || derivedStatus === 'Expired';
        const openVial = item.open_vial_status === 'opened' ? describeOpenVialCountdown(item.open_vial_discard_at) : null;
        return (
          <Box sx={{ minWidth: 140 }}>
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
      width: '125px',
      render: (item) => {
        const status = deriveInventoryStatus(item);
        const visual = getStatusVisual(status, isDark);
        return <Chip icon={<StatusIcon status={status} />} label={statusLabel(status)} size="small" sx={{ height: 24, fontSize: 10.5, fontWeight: 700, bgcolor: visual.bg, color: visual.color, border: `1px solid ${visual.border}`, '& .MuiChip-icon': { color: visual.color } }} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '135px',
      render: (item) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
          {onViewStockCard && <Button size="small" variant="outlined" onClick={() => onViewStockCard(item)} sx={{ minWidth: 70, px: 1.25, py: 0.35, borderRadius: 1.5, borderColor: '#a7f3d0', color: '#047857', textTransform: 'none', fontSize: 11, '&:hover': { bgcolor: '#ecfdf5', borderColor: '#6ee7b7' } }}>View</Button>}
          <Tooltip title="More actions">
            <IconButton size="small" aria-label={`More actions for ${item.vaccine_type} ${item.batch_number}`} onClick={(event) => { setActionAnchor(event.currentTarget); setActionItem(item); }} sx={{ width: 30, height: 30, color: secondaryText, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: 1.5 }}><MoreIcon sx={{ fontSize: 17 }} /></IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [isDark, onViewStockCard, primaryText, secondaryText, presets]);

  return (
    <Box>
      <Paper
        data-walkthrough="vax-inv-filter-bar"
        data-tour="vax-inv-filter-bar"
        elevation={0}
        sx={{ mb: 1.5, p: 1.25, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: 2.5, bgcolor: isDark ? '#111827' : '#fff' }}
      >
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'minmax(180px, 1.3fr) minmax(180px, 1.1fr) minmax(120px, .75fr) minmax(130px, .8fr) minmax(150px, .9fr) auto auto',
          },
          gap: 1,
          alignItems: 'center',
        }}>
          <TextField fullWidth size="small" placeholder="Search vaccine" value={search} onChange={(event) => onSearchChange(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: secondaryText }} /></InputAdornment> } }} sx={fieldSx} />
          <FormControl fullWidth size="small" sx={fieldSx}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(event) => onCategoryFilterChange(event.target.value)}
              renderValue={(value) => value || 'All categories'}
            >
              <MenuItem value="">All categories</MenuItem>
              {categoryOptions.map((cat) => {
                const badgeStyle = getCategoryBadgeStyle(cat === 'Not specified' ? null : cat, isDark);
                return (
                  <MenuItem key={cat} value={cat} sx={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: badgeStyle.color,
                        flexShrink: 0,
                      }}
                    />
                    <span>{cat}</span>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" placeholder="Batch / Lot" value={batchFilter} onChange={(event) => onBatchFilterChange(event.target.value)} sx={fieldSx} />
          <FormControl fullWidth size="small" sx={fieldSx}><InputLabel>Status</InputLabel><Select value={statusFilter} label="Status" onChange={(event) => onStatusFilterChange(event.target.value)}><MenuItem value="">All statuses</MenuItem><MenuItem value="active">Available / Active</MenuItem><MenuItem value="low-stock">Low stock (≤10)</MenuItem><MenuItem value="expiring-soon">Expiring soon</MenuItem><MenuItem value="expired">Expired</MenuItem><MenuItem value="depleted">Out of stock</MenuItem><MenuItem value="discard-pending">Opened vial</MenuItem></Select></FormControl>
          <FormControl fullWidth size="small" sx={fieldSx}><InputLabel>Supplier</InputLabel><Select value={sourceFilter} label="Supplier" onChange={(event) => onSourceFilterChange(event.target.value)} renderValue={(value) => value || 'All suppliers'}><MenuItem value="">All suppliers</MenuItem>{sourceOptions.map((source) => <MenuItem key={source} value={source} sx={{ maxWidth: 380, whiteSpace: 'normal', fontSize: 12 }}>{source}</MenuItem>)}</Select></FormControl>
          <Button variant="outlined" startIcon={<DateRangeIcon sx={{ fontSize: '16px !important' }} />} onClick={(event) => setExpiryAnchor(event.currentTarget)} sx={{ height: 40, borderRadius: 2, borderColor: expiryFrom || expiryTo ? '#10b981' : isDark ? '#334155' : '#e2e8f0', color: expiryFrom || expiryTo ? '#047857' : secondaryText, textTransform: 'none', whiteSpace: 'nowrap', fontSize: 11.5 }}>{expiryFrom || expiryTo ? 'Expiry applied' : 'Expiry date'}</Button>
          <Button disabled={!hasFilters} onClick={() => { onSearchChange(''); onCategoryFilterChange(''); onStatusFilterChange(''); onBatchFilterChange(''); onSourceFilterChange(''); onExpiryFromChange(''); onExpiryToChange(''); onPageChange(0); }} sx={{ minWidth: 0, color: secondaryText, textTransform: 'none', fontSize: 11.5, whiteSpace: 'nowrap' }}>Clear filters</Button>
        </Box>
      </Paper>

      <Popover open={Boolean(expiryAnchor)} anchorEl={expiryAnchor} onClose={() => setExpiryAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 0.75, p: 1.5, borderRadius: 2.5, width: 290 } } }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: primaryText, mb: 1 }}>Expiration range</Typography>
        <Stack spacing={1}><TextField fullWidth size="small" type="date" label="Expiry after" value={expiryFrom} onChange={(event) => onExpiryFromChange(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} /><TextField fullWidth size="small" type="date" label="Expiry before" value={expiryTo} onChange={(event) => onExpiryToChange(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} /></Stack>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}><Button size="small" onClick={() => { onExpiryFromChange(''); onExpiryToChange(''); }} sx={{ color: secondaryText, textTransform: 'none', fontSize: 11 }}>Clear</Button><Button size="small" onClick={() => setExpiryAnchor(null)} sx={{ color: '#047857', textTransform: 'none', fontSize: 11, fontWeight: 700 }}>Done</Button></Box>
      </Popover>

      <Paper
        data-walkthrough="vax-inv-batches-table"
        data-tour="vax-inv-batches-table"
        elevation={0}
        sx={{ border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, borderRadius: 2.5, overflow: 'hidden', bgcolor: isDark ? '#111827' : '#fff' }}
      >
        <Box sx={{ px: 1.75, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <InventoryIcon sx={{ fontSize: 18, color: '#059669' }} />
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: primaryText }}>Inventory Batches</Typography>
            <Typography sx={{ fontSize: 10.5, color: secondaryText }}>{total} record{total === 1 ? '' : 's'}</Typography>
            {outOfStockCount > 0 && (
              <Tooltip
                title={
                  isOutOfStockFiltered
                    ? 'Active filter: showing out-of-stock batches only. Click to show all batches.'
                    : `Click to filter table and show only ${outOfStockCount} out-of-stock batch${outOfStockCount === 1 ? '' : 'es'}.`
                }
                arrow
              >
                <Chip
                  icon={<WarningAmberIcon sx={{ fontSize: '13px !important', color: 'inherit !important' }} />}
                  label={`${outOfStockCount} Out of stock`}
                  size="small"
                  onClick={handleToggleOutOfStockFilter}
                  clickable
                  sx={{
                    ml: 0.5,
                    height: 22,
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    bgcolor: isDark
                      ? isOutOfStockFiltered
                        ? 'rgba(239, 68, 68, 0.35)'
                        : 'rgba(239, 68, 68, 0.18)'
                      : isOutOfStockFiltered
                        ? '#fecaca'
                        : '#fee2e2',
                    color: isDark ? '#fca5a5' : '#b91c1c',
                    border: `1px solid ${
                      isDark
                        ? isOutOfStockFiltered
                          ? '#f87171'
                          : 'rgba(239, 68, 68, 0.45)'
                        : isOutOfStockFiltered
                          ? '#dc2626'
                          : '#fca5a5'
                    }`,
                    boxShadow: isOutOfStockFiltered ? '0 0 0 1.5px rgba(239, 68, 68, 0.35)' : 'none',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
                      borderColor: isDark ? '#f87171' : '#dc2626',
                    },
                  }}
                />
              </Tooltip>
            )}
          </Box>
          <Button size="small" startIcon={<InfoIcon sx={{ fontSize: '15px !important' }} />} onClick={() => setGuideOpen(true)} sx={{ ml: 'auto', color: secondaryText, textTransform: 'none', fontSize: 11 }}>Inventory guide</Button>
        </Box>

        {outOfStockCount > 0 && (
          <Box
            sx={{
              px: 2,
              py: 0.85,
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fff5f5',
              borderBottom: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : '#fed7d7'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.25,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
              <WarningAmberIcon
                sx={{
                  fontSize: 18,
                  color: isDark ? '#f87171' : '#dc2626',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isDark ? '#fca5a5' : '#991b1b',
                  }}
                >
                  {outOfStockCount === 1 ? 'Out-of-Stock Alert:' : `${outOfStockCount} Batches Out of Stock:`}
                </Typography>

                <Typography
                  component="span"
                  sx={{
                    fontSize: 12,
                    color: isDark ? '#fecaca' : '#7f1d1d',
                  }}
                >
                  {outOfStockCount === 1 ? (
                    <>
                      Vaccine <strong style={{ fontWeight: 700 }}>{outOfStockItems[0].vaccine_type}</strong> (Batch{' '}
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: 12.5,
                          color: isDark ? '#f87171' : '#dc2626',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {outOfStockItems[0].batch_number}
                      </Box>
                      ) is out of stock (0 available vials).
                    </>
                  ) : (
                    <>The following vaccine batches have 0 available vials: </>
                  )}
                </Typography>

                {outOfStockCount > 1 && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    {outOfStockItems.map((item) => (
                      <Chip
                        key={item.inventory_id}
                        size="small"
                        label={
                          <span>
                            <strong>{item.vaccine_type}</strong> (Batch{' '}
                            <Box
                              component="span"
                              sx={{
                                color: isDark ? '#f87171' : '#dc2626',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                              }}
                            >
                              {item.batch_number}
                            </Box>
                            )
                          </span>
                        }
                        sx={{
                          height: 22,
                          fontSize: 11,
                          bgcolor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2',
                          color: isDark ? '#fca5a5' : '#991b1b',
                          border: `1.5px solid ${isDark ? '#ef4444' : '#f87171'}`,
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 0, sm: 'auto' } }}>
              <Button
                size="small"
                onClick={handleToggleOutOfStockFilter}
                sx={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  py: 0.35,
                  px: 1.25,
                  borderRadius: 1.5,
                  bgcolor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2',
                  color: isDark ? '#fca5a5' : '#b91c1c',
                  border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5'}`,
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
                  },
                }}
              >
                {isOutOfStockFiltered ? 'Show all batches' : 'Filter out-of-stock batches'}
              </Button>
            </Box>
          </Box>
        )}
        <DataTable minWidth={1060} columns={columns} rows={items} rowKey={(item) => item.inventory_id} rowId={(item) => `inventory-batch-${item.inventory_id}`} loading={loading} emptyState={<Box sx={{ textAlign: 'center', py: 8, px: 2 }}><InventoryIcon sx={{ fontSize: 42, color: '#cbd5e1', mb: 1 }} /><Typography sx={{ fontWeight: 700, fontSize: 15, color: primaryText }}>No vaccine batches found</Typography><Typography sx={{ fontSize: 12, color: secondaryText, mt: 0.5, mb: 2 }}>{hasFilters ? 'No inventory batches match the current filters.' : 'Add the clinic’s first stock batch to begin tracking inventory.'}</Typography>{!hasFilters && <Button variant="contained" onClick={onAddFirst} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700 }}>Add first stock batch</Button>}</Box>} />
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
