import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { DownloadOutlined, Refresh } from '@mui/icons-material';
import api from '../../../services/api';

const POPPINS = "'Poppins', sans-serif";

const panelSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: 'none',
  bgcolor: 'background.paper',
  fontFamily: POPPINS,
};

export interface InventoryItem {
  inventory_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'deleted';
  received_from?: string;
  initial_quantity?: number;
  total_dispensed?: number;
  doses_per_vial?: number;
  open_vial_status?: string;
  open_vial_doses_used?: number;
  open_vial_doses_remaining?: number;
  open_vial_discard_at?: string;
  discarded_vials?: number;
}

export interface InventoryStats {
  total_batches: number;
  active_batches: number;
  depleted_batches: number;
  expired_batches: number;
  total_stock: number;
  expiring_soon: number;
  low_stock: number;
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const dateString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function InvStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: '#d1fae5', color: '#065f46' },
    expired: { bg: '#fee2e2', color: '#991b1b' },
    deleted: { bg: '#f3f4f6', color: '#374151' },
  };
  const cfg = map[status] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <Box
      component="span"
      sx={{
        background: cfg.bg,
        color: cfg.color,
        px: 1.1,
        py: 0.3,
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: POPPINS,
        display: 'inline-block',
      }}
    >
      {status}
    </Box>
  );
}

export interface VaccineInventoryReportSectionProps {
  rolePrefix?: string;
  initialInvItems?: InventoryItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function VaccineInventoryReportSection({
  rolePrefix = 'admin',
  initialInvItems,
  loading: externalLoading,
  onRefresh: externalOnRefresh,
}: VaccineInventoryReportSectionProps) {
  const [internalInvItems, setInternalInvItems] = useState<InventoryItem[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [presetTypes, setPresetTypes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const isControlled = initialInvItems !== undefined;
  const invItems = isControlled ? initialInvItems : internalInvItems;
  const invLoading = isControlled ? (externalLoading ?? false) : internalLoading;

  // Filters
  const [selectedVaccineType, setSelectedVaccineType] = useState<string>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [expiryDateFrom, setExpiryDateFrom] = useState<string>('');
  const [expiryDateTo, setExpiryDateTo] = useState<string>('');

  const loadInventory = async () => {
    if (isControlled && externalOnRefresh) {
      externalOnRefresh();
      return;
    }
    setInternalLoading(true);
    setError('');
    try {
      const [itemsRes, _statsRes, presetsRes] = await Promise.allSettled([
        api.get('/inventory', { params: { per_page: 200 } }),
        api.get('/inventory/statistics'),
        api.get('/inventory/presets'),
      ]);
      if (itemsRes.status === 'fulfilled') {
        const data = itemsRes.value.data?.data ?? itemsRes.value.data ?? [];
        setInternalInvItems(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load inventory batches.');
      }
      if (presetsRes.status === 'fulfilled') {
        const presets = presetsRes.value.data?.data ?? presetsRes.value.data ?? [];
        if (Array.isArray(presets)) {
          setPresetTypes(presets.map((p: any) => p.name || p.vaccine_name || p.vaccine_type).filter(Boolean));
        }
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError('Unable to load vaccine inventory data.');
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (!isControlled) {
      loadInventory();
    }
  }, [isControlled]);

  const availableSuppliers = useMemo(() => {
    return Array.from(
      new Set([
        'DOH Central Supply',
        'PHO - Provincial Health Office',
        'CHO / MHO - City/Municipal Health Office',
        'LGU Local Procurement',
        'Hospital Pharmacy / Direct Purchase',
        'Donation / NGO',
        ...(invItems.map(i => i.received_from?.trim()).filter(Boolean) as string[]),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [invItems]);

  const availableVaccineTypes = useMemo(() => {
    return Array.from(
      new Set([
        ...invItems.map(i => i.vaccine_type?.trim()).filter(Boolean),
        ...presetTypes.map(p => p?.trim()).filter(Boolean),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [invItems, presetTypes]);

  const filteredInvItems = useMemo(() => {
    return invItems.filter(item => {
      if (selectedVaccineType !== 'ALL') {
        if ((item.vaccine_type || '').trim().toLowerCase() !== selectedVaccineType.trim().toLowerCase()) return false;
      }
      if (supplierFilter !== 'ALL') {
        if (!(item.received_from || 'DOH Central Supply').toLowerCase().includes(supplierFilter.toLowerCase())) return false;
      }
      if (expiryFilter === 'ALL') return true;
      if (!item.expiration_date) return expiryFilter === 'expired';
      const expTime = new Date(item.expiration_date).getTime();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffDays = Math.ceil((expTime - startOfToday) / (1000 * 60 * 60 * 24));
      if (expiryFilter === 'valid') {
        if (item.status === 'expired' || diffDays < 0) return false;
      } else if (expiryFilter === 'expiring_30') {
        if (item.status === 'expired' || diffDays < 0 || diffDays > 30) return false;
      } else if (expiryFilter === 'expiring_60') {
        if (item.status === 'expired' || diffDays < 0 || diffDays > 60) return false;
      } else if (expiryFilter === 'expiring_90') {
        if (item.status === 'expired' || diffDays < 0 || diffDays > 90) return false;
      } else if (expiryFilter === 'expired') {
        if (item.status !== 'expired' && diffDays >= 0) return false;
      } else if (expiryFilter === 'custom') {
        if (expiryDateFrom && expTime < new Date(expiryDateFrom).getTime()) return false;
        if (expiryDateTo && expTime > new Date(expiryDateTo).getTime()) return false;
      }
      return true;
    });
  }, [invItems, selectedVaccineType, supplierFilter, expiryFilter, expiryDateFrom, expiryDateTo]);

  const isInvFiltered =
    selectedVaccineType !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    expiryFilter !== 'ALL' ||
    Boolean(expiryDateFrom) ||
    Boolean(expiryDateTo);

  const invDisplayStats = useMemo(() => {
    return {
      active_batches: filteredInvItems.filter(i => i.status === 'active' && i.current_quantity > 0).length,
      total_stock: filteredInvItems.reduce((s, i) => s + (Number(i.current_quantity) || 0), 0),
      expiring_soon: filteredInvItems.filter(i => {
        if (!i.expiration_date || i.status === 'expired' || i.current_quantity === 0) return false;
        const d = Math.ceil((new Date(i.expiration_date).getTime() - Date.now()) / 86400000);
        return d >= 0 && d <= 60;
      }).length,
      depleted_batches: filteredInvItems.filter(i => i.current_quantity === 0).length,
      expired_batches: filteredInvItems.filter(
        i => i.status === 'expired' || (!i.expiration_date ? false : new Date(i.expiration_date).getTime() < Date.now())
      ).length,
    };
  }, [filteredInvItems]);

  const exportCsv = () => {
    setExporting(true);
    try {
      const headers = ['#', 'Vaccine Type', 'Batch No', 'Supplier', 'Received', 'Used', 'Sealed Vials', 'Open Vial Status', 'Wastage', 'Expiration', 'Status'];
      const csvRows = filteredInvItems.map((item, i) => {
        const recQty = item.initial_quantity ?? item.current_quantity + (item.total_dispensed ?? 0);
        const usedQty = item.total_dispensed ?? 0;
        const openStatus = item.open_vial_status ? `${item.open_vial_doses_remaining ?? 0} doses left` : 'Sealed';
        const wasteQty = item.status === 'expired' ? item.current_quantity : item.discarded_vials ?? 0;
        return [
          i + 1,
          `"${(item.vaccine_type || '').replace(/"/g, '""')}"`,
          `"${item.batch_number || ''}"`,
          `"${(item.received_from || 'DOH Central Supply').replace(/"/g, '""')}"`,
          recQty,
          usedQty,
          item.current_quantity,
          `"${openStatus}"`,
          wasteQty,
          `"${item.expiration_date || ''}"`,
          `"${item.status || ''}"`,
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${rolePrefix}-vaccine-inventory-${dateString(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ fontFamily: POPPINS }}>
      {/* ── Filter Bar ────────────────────────────────────────── */}
      <Paper
        component="div"
        elevation={0}
        sx={{
          ...panelSx,
          p: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Supplier / Source"
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">All Suppliers / Sources</MenuItem>
            {availableSuppliers.map(s => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Vaccine Type"
            value={selectedVaccineType}
            onChange={e => setSelectedVaccineType(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="ALL">All Vaccine Types</MenuItem>
            {availableVaccineTypes.map(t => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Expiration Date"
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value)}
            sx={{ minWidth: 185 }}
          >
            <MenuItem value="ALL">All Expiration Dates</MenuItem>
            <MenuItem value="valid">Valid / Active (Not Expired)</MenuItem>
            <MenuItem value="expiring_30">Expiring in ≤ 30 Days</MenuItem>
            <MenuItem value="expiring_60">Expiring in ≤ 60 Days</MenuItem>
            <MenuItem value="expiring_90">Expiring in ≤ 90 Days</MenuItem>
            <MenuItem value="expired">Expired Batches</MenuItem>
            <MenuItem value="custom">Custom Range…</MenuItem>
          </TextField>

          {expiryFilter === 'custom' && (
            <>
              <TextField
                size="small"
                type="date"
                label="Exp. From"
                value={expiryDateFrom}
                onChange={e => setExpiryDateFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                type="date"
                label="Exp. To"
                value={expiryDateTo}
                onChange={e => setExpiryDateTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </>
          )}

          {isInvFiltered && (
            <Button
              onClick={() => {
                setSelectedVaccineType('ALL');
                setSupplierFilter('ALL');
                setExpiryFilter('ALL');
                setExpiryDateFrom('');
                setExpiryDateTo('');
              }}
              sx={{ color: 'error.main', fontFamily: POPPINS }}
            >
              Reset
            </Button>
          )}

          <Button
            type="button"
            onClick={loadInventory}
            disabled={invLoading}
            sx={{ ml: { sm: 'auto' }, fontFamily: POPPINS }}
            startIcon={<Refresh />}
          >
            Refresh Inventory
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5, fontFamily: POPPINS }}>
          {`Showing ${filteredInvItems.length} of ${invItems.length} vaccine inventory batches.`}
        </Typography>
      </Paper>

      {/* ── Error Notification ──────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, fontFamily: POPPINS }}>
          {error}
        </Alert>
      )}

      {/* ── Stock Metrics Overview Cards ────────────────────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#10b981', fontFamily: POPPINS, lineHeight: 1 }}>
            {invDisplayStats.active_batches}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: POPPINS,
              display: 'block',
              mt: 0.5,
            }}
          >
            Active Batches
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#3b82f6', fontFamily: POPPINS, lineHeight: 1 }}>
            {invDisplayStats.total_stock}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: POPPINS,
              display: 'block',
              mt: 0.5,
            }}
          >
            Total Sealed Vials
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#f59e0b', fontFamily: POPPINS, lineHeight: 1 }}>
            {invDisplayStats.expiring_soon}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: POPPINS,
              display: 'block',
              mt: 0.5,
            }}
          >
            Expiring (≤ 60d)
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#ef4444', fontFamily: POPPINS, lineHeight: 1 }}>
            {invDisplayStats.depleted_batches}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: POPPINS,
              display: 'block',
              mt: 0.5,
            }}
          >
            Depleted Batches
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, p: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#6b7280', fontFamily: POPPINS, lineHeight: 1 }}>
            {invDisplayStats.expired_batches}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: POPPINS,
              display: 'block',
              mt: 0.5,
            }}
          >
            Expired Batches
          </Typography>
        </Paper>
      </Box>

      {/* ── Detailed Batch Utilization Table ────────────────────── */}
      <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
          <Box>
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
              Comprehensive Batch Utilization &amp; Wastage Audit Log
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
              Showing {filteredInvItems.length} of {invItems.length} inventory items
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadOutlined />}
              onClick={exportCsv}
              disabled={filteredInvItems.length === 0 || exporting}
              sx={{ fontFamily: POPPINS }}
            >
              Export CSV
            </Button>
          </Stack>
        </Box>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Inventory audit table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Vaccine Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Batch No.</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Supplier / Source</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Received</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Used</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Sealed Vials</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Open Vial Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Wastage</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Expiration</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invLoading ? (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                    <CircularProgress size={24} sx={{ mb: 1, display: 'block', mx: 'auto', color: '#10b981' }} />
                    Loading inventory audit data…
                  </TableCell>
                </TableRow>
              ) : filteredInvItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                    No inventory records match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvItems.map((item, i) => {
                  const recQty = item.initial_quantity ?? item.current_quantity + (item.total_dispensed ?? 0);
                  const usedQty = item.total_dispensed ?? 0;
                  const supplier = item.received_from || 'DOH Central Supply';
                  const openStatus = item.open_vial_status
                    ? `${item.open_vial_doses_remaining ?? 0} doses remaining`
                    : 'Sealed';
                  const wasteQty = item.status === 'expired' ? item.current_quantity : item.discarded_vials ?? 0;

                  return (
                    <TableRow key={item.inventory_id || i} hover>
                      <TableCell sx={{ fontFamily: POPPINS }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>{item.vaccine_type}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{item.batch_number}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{supplier}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontFamily: POPPINS }}>{recQty}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontFamily: POPPINS }}>{usedQty}</TableCell>
                      <TableCell
                        sx={{
                          textAlign: 'center',
                          fontWeight: 700,
                          fontFamily: POPPINS,
                          color: item.current_quantity === 0 ? 'error.main' : 'text.primary',
                        }}
                      >
                        {item.current_quantity}
                      </TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{openStatus}</TableCell>
                      <TableCell
                        sx={{
                          textAlign: 'center',
                          fontFamily: POPPINS,
                          color: wasteQty > 0 ? 'error.main' : 'text.secondary',
                          fontWeight: wasteQty > 0 ? 600 : 400,
                        }}
                      >
                        {wasteQty}
                      </TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>{fmtDate(item.expiration_date)}</TableCell>
                      <TableCell sx={{ fontFamily: POPPINS }}>
                        <InvStatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
