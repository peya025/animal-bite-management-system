import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { DownloadOutlined, Refresh, PeopleAltOutlined, LocalHospitalOutlined } from '@mui/icons-material';
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
  status: 'active' | 'expired' | 'depleted' | 'deleted';
  received_from?: string;
  initial_quantity?: number;
  total_dispensed?: number;
  doses_per_vial?: number;
  open_vial_status?: string;
  open_vial_doses_used?: number;
  open_vial_doses_remaining?: number;
  open_vial_discard_at?: string;
  discarded_vials?: number;
  created_at?: string;
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

export interface AdministrationRecord {
  id?: number;
  treatment_id?: number;
  patient_id?: number;
  patient?: {
    id?: number;
    patient_id?: number;
    patient_number?: string;
    first_name?: string;
    last_name?: string;
  };
  dose_number?: number;
  treatment_date?: string;
  administered_at?: string;
  created_at?: string;
  vaccine_brand?: string;
  vaccine_generic?: string;
  batch_no?: string;
  inventory_units_used?: number;
  inventory?: {
    inventory_id?: number;
    batch_number?: string;
    vaccine_type?: string;
    doses_per_vial?: number;
  };
}

export interface VaccinePatientUsage {
  vaccineType: string;
  uniquePatients: number;
  dosesAdministered: number;
  vialsUsed: number;
  vialsWasted: number;
  batchCount: number;
  activeBatches: number;
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
    depleted: { bg: '#fee2e2', color: '#991b1b' },
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
        textTransform: 'capitalize',
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
  const [administrations, setAdministrations] = useState<AdministrationRecord[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [presetTypes, setPresetTypes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const isControlled = initialInvItems !== undefined;
  const invItems = isControlled ? initialInvItems : internalInvItems;
  const invLoading = isControlled ? (externalLoading ?? false) : internalLoading;

  // ─── Status & Entity Filters ─────────────────────────────────
  const [usageStatusFilter, setUsageStatusFilter] = useState<'ALL' | 'used' | 'not_used' | 'wasted'>('ALL');
  const [selectedVaccineType, setSelectedVaccineType] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL');
  const [expiryDateFrom, setExpiryDateFrom] = useState<string>('');
  const [expiryDateTo, setExpiryDateTo] = useState<string>('');

  // ─── Activity Date Period Filters ────────────────────────────
  const [activityPeriod, setActivityPeriod] = useState<'ALL' | 'today' | 'this_week' | 'this_month' | 'custom'>('ALL');
  const [activityDateFrom, setActivityDateFrom] = useState<string>('');
  const [activityDateTo, setActivityDateTo] = useState<string>('');

  // ─── Data Loaders ────────────────────────────────────────────
  const loadData = async () => {
    if (isControlled && externalOnRefresh) {
      externalOnRefresh();
    }
    setInternalLoading(true);
    setError('');
    try {
      const [itemsRes, presetsRes, adminRes] = await Promise.allSettled([
        api.get('/inventory', { params: { per_page: 300 } }),
        api.get('/inventory/presets'),
        api.get('/vaccination-records/administrations', { params: { per_page: 500 } }),
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

      if (adminRes.status === 'fulfilled') {
        const admData = adminRes.value.data?.data ?? adminRes.value.data ?? [];
        setAdministrations(Array.isArray(admData) ? admData : []);
      }
    } catch (err) {
      console.error('Failed to load inventory report data:', err);
      setError('Unable to load vaccine inventory and usage records.');
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Quick Date Range Helper ─────────────────────────────────
  const getActivityDateBounds = (period: string, customFrom: string, customTo: string) => {
    const now = new Date();
    const todayYmd = dateString(now);

    if (period === 'today') {
      return { from: todayYmd, to: todayYmd };
    }
    if (period === 'this_week') {
      const dayOfWeek = now.getDay();
      const diff = (dayOfWeek + 6) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diff);
      return { from: dateString(startOfWeek), to: todayYmd };
    }
    if (period === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return { from: `${year}-${month}-01`, to: todayYmd };
    }
    if (period === 'custom') {
      return { from: customFrom, to: customTo };
    }
    return { from: '', to: '' };
  };

  const activeDateBounds = useMemo(() => {
    return getActivityDateBounds(activityPeriod, activityDateFrom, activityDateTo);
  }, [activityPeriod, activityDateFrom, activityDateTo]);

  // ─── Available Options ───────────────────────────────────────
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
        ...administrations.map(a => a.inventory?.vaccine_type || a.vaccine_brand || a.vaccine_generic).filter(Boolean) as string[],
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [invItems, presetTypes, administrations]);

  // ─── Filtered Administrations ────────────────────────────────
  const filteredAdministrations = useMemo(() => {
    return administrations.filter(adm => {
      // Date filter
      if (activeDateBounds.from || activeDateBounds.to) {
        const d = adm.treatment_date
          ? adm.treatment_date
          : adm.administered_at
          ? dateString(new Date(adm.administered_at))
          : adm.created_at
          ? dateString(new Date(adm.created_at))
          : '';
        if (activeDateBounds.from && d && d < activeDateBounds.from) return false;
        if (activeDateBounds.to && d && d > activeDateBounds.to) return false;
      }

      // Vaccine Type filter
      if (selectedVaccineType !== 'ALL') {
        const vType = (adm.inventory?.vaccine_type || adm.vaccine_brand || adm.vaccine_generic || '').trim().toLowerCase();
        if (vType !== selectedVaccineType.trim().toLowerCase()) return false;
      }

      return true;
    });
  }, [administrations, activeDateBounds, selectedVaccineType]);

  // ─── Filtered Inventory Items ────────────────────────────────
  const filteredInvItems = useMemo(() => {
    return invItems.filter(item => {
      const usedQty = item.total_dispensed ?? 0;
      const openDosesUsed = item.open_vial_doses_used ?? 0;
      const wasteQty = item.status === 'expired' ? item.current_quantity : item.discarded_vials ?? 0;
      const isUsed = usedQty > 0 || openDosesUsed > 0 || Boolean(item.open_vial_status);
      const isWasted = item.status === 'expired' || wasteQty > 0;
      const isNotUsed = !isUsed && !isWasted && item.current_quantity > 0;

      // 1. Usage Status Filter
      if (usageStatusFilter === 'used' && !isUsed) return false;
      if (usageStatusFilter === 'not_used' && !isNotUsed) return false;
      if (usageStatusFilter === 'wasted' && !isWasted) return false;

      // 2. Vaccine Type Filter
      if (selectedVaccineType !== 'ALL') {
        if ((item.vaccine_type || '').trim().toLowerCase() !== selectedVaccineType.trim().toLowerCase()) return false;
      }

      // 3. Supplier Filter
      if (supplierFilter !== 'ALL') {
        if (!(item.received_from || 'DOH Central Supply').toLowerCase().includes(supplierFilter.toLowerCase())) return false;
      }

      // 4. Expiration Date Filter
      if (expiryFilter !== 'ALL') {
        if (!item.expiration_date) {
          if (expiryFilter !== 'expired') return false;
        } else {
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
        }
      }

      return true;
    });
  }, [invItems, usageStatusFilter, selectedVaccineType, supplierFilter, expiryFilter, expiryDateFrom, expiryDateTo]);

  const isInvFiltered =
    usageStatusFilter !== 'ALL' ||
    selectedVaccineType !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    expiryFilter !== 'ALL' ||
    Boolean(expiryDateFrom) ||
    Boolean(expiryDateTo) ||
    activityPeriod !== 'ALL' ||
    Boolean(activityDateFrom) ||
    Boolean(activityDateTo);

  // ─── Stock Summary Stats ─────────────────────────────────────
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

  // ─── Vaccine Usage by Patient Analytics (Unique Patient Count) ─
  const vaccineUsageByPatient = useMemo<VaccinePatientUsage[]>(() => {
    const map = new Map<string, {
      uniquePatientIds: Set<number | string>;
      dosesCount: number;
      vialsUsed: number;
      vialsWasted: number;
      batchCount: number;
      activeBatches: number;
    }>();

    const allTypes = new Set<string>();
    availableVaccineTypes.forEach(t => allTypes.add(t));
    filteredAdministrations.forEach(adm => {
      const t = adm.inventory?.vaccine_type || adm.vaccine_brand || adm.vaccine_generic;
      if (t) allTypes.add(t.trim());
    });

    allTypes.forEach(type => {
      map.set(type.toLowerCase(), {
        uniquePatientIds: new Set(),
        dosesCount: 0,
        vialsUsed: 0,
        vialsWasted: 0,
        batchCount: 0,
        activeBatches: 0,
      });
    });

    // 1. Process administrations
    filteredAdministrations.forEach(adm => {
      const rawType = adm.inventory?.vaccine_type || adm.vaccine_brand || adm.vaccine_generic || 'Standard Rabies Vaccine';
      const key = rawType.trim().toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          uniquePatientIds: new Set(),
          dosesCount: 0,
          vialsUsed: 0,
          vialsWasted: 0,
          batchCount: 0,
          activeBatches: 0,
        };
        map.set(key, entry);
      }

      // Unique Patient key
      const patId = adm.patient_id ?? adm.patient?.id ?? adm.patient?.patient_number ?? `adm-${adm.id || adm.treatment_id}`;
      if (patId) entry.uniquePatientIds.add(patId);
      entry.dosesCount += 1;

      const units = Number(adm.inventory_units_used) || 0;
      if (units > 0) {
        entry.vialsUsed += units;
      }
    });

    // 2. Process inventory items for batch counts and wastage
    filteredInvItems.forEach(item => {
      const key = (item.vaccine_type || 'Standard Rabies Vaccine').trim().toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          uniquePatientIds: new Set(),
          dosesCount: 0,
          vialsUsed: 0,
          vialsWasted: 0,
          batchCount: 0,
          activeBatches: 0,
        };
        map.set(key, entry);
      }
      entry.batchCount += 1;
      if (item.status === 'active' && item.current_quantity > 0) {
        entry.activeBatches += 1;
      }
      const waste = item.status === 'expired' ? item.current_quantity : (item.discarded_vials ?? 0);
      entry.vialsWasted += waste;

      // If no unit deductions from treatment records were registered, fall back to batch dispensed count
      if (entry.vialsUsed === 0 && (item.total_dispensed ?? 0) > 0) {
        entry.vialsUsed += (item.total_dispensed ?? 0);
      }
    });

    const result: VaccinePatientUsage[] = [];
    map.forEach((entry, key) => {
      const originalName = Array.from(allTypes).find(t => t.toLowerCase() === key) || key;
      if (selectedVaccineType !== 'ALL' && originalName.toLowerCase() !== selectedVaccineType.toLowerCase()) {
        return;
      }
      // Include all types that have either administrations or inventory batches
      if (entry.batchCount > 0 || entry.dosesCount > 0 || entry.uniquePatientIds.size > 0) {
        result.push({
          vaccineType: originalName,
          uniquePatients: entry.uniquePatientIds.size,
          dosesAdministered: entry.dosesCount,
          vialsUsed: entry.vialsUsed,
          vialsWasted: entry.vialsWasted,
          batchCount: entry.batchCount,
          activeBatches: entry.activeBatches,
        });
      }
    });

    return result.sort((a, b) => b.dosesAdministered - a.dosesAdministered || b.uniquePatients - a.uniquePatients);
  }, [availableVaccineTypes, filteredAdministrations, filteredInvItems, selectedVaccineType]);

  // Overall unique patient count across all vaccines in selected period
  const totalPeriodUniquePatients = useMemo(() => {
    const allPatSet = new Set<number | string>();
    filteredAdministrations.forEach(adm => {
      const patId = adm.patient_id ?? adm.patient?.id ?? adm.patient?.patient_number ?? `adm-${adm.id || adm.treatment_id}`;
      if (patId) allPatSet.add(patId);
    });
    return allPatSet.size;
  }, [filteredAdministrations]);

  const totalDosesAdministered = useMemo(() => {
    return filteredAdministrations.length;
  }, [filteredAdministrations]);

  // ─── Export CSV Handler ──────────────────────────────────────
  const exportCsv = () => {
    setExporting(true);
    try {
      // 1. Batch utilization section
      const batchHeaders = ['#', 'Vaccine Type', 'Batch No', 'Supplier / Source', 'Received', 'Used', 'Sealed Vials', 'Open Vial Status', 'Wastage', 'Expiration', 'Status'];
      const batchRows = filteredInvItems.map((item, i) => {
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

      // 2. Patient Usage section
      const usageHeaders = ['\n\n--- VACCINE USAGE BY PATIENT SUMMARY ---', '', '', '', ''];
      const usageSubHeaders = ['Vaccine Type', 'Unique Patients', 'Doses Administered', 'Quantity Used (Vials)', 'Wasted Quantity'];
      const usageRows = vaccineUsageByPatient.map(v => [
        `"${v.vaccineType.replace(/"/g, '""')}"`,
        v.uniquePatients,
        v.dosesAdministered,
        v.vialsUsed,
        v.vialsWasted,
      ].join(','));

      const csvContent = 'data:text/csv;charset=utf-8,' + [
        '--- BATCH UTILIZATION & WASTAGE AUDIT LOG ---',
        batchHeaders.join(','),
        ...batchRows,
        ...usageHeaders,
        usageSubHeaders.join(','),
        ...usageRows,
      ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${rolePrefix}-vaccine-inventory-analytics-${dateString(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setExporting(false);
    }
  };

  const periodLabelText =
    activityPeriod === 'today'
      ? 'Today'
      : activityPeriod === 'this_week'
      ? 'This Week'
      : activityPeriod === 'this_month'
      ? 'This Month'
      : activityPeriod === 'custom' && activeDateBounds.from
      ? `${activeDateBounds.from} to ${activeDateBounds.to || 'Present'}`
      : 'All Time';

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
          {/* Usage Status Filter */}
          <TextField
            select
            size="small"
            label="Usage Status"
            value={usageStatusFilter}
            onChange={e => setUsageStatusFilter(e.target.value as any)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="ALL">All Usage Statuses</MenuItem>
            <MenuItem value="used">Used (With Administrations)</MenuItem>
            <MenuItem value="not_used">Not Used (Unopened)</MenuItem>
            <MenuItem value="wasted">Wasted / Expired</MenuItem>
          </TextField>

          {/* Vaccine Type Filter */}
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

          {/* Supplier / Source Filter */}
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

          {/* Expiration Date Filter */}
          <TextField
            select
            size="small"
            label="Expiration Date"
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value)}
            sx={{ minWidth: 180 }}
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

          {/* Activity Date Period Filter */}
          <TextField
            select
            size="small"
            label="Date Range"
            value={activityPeriod}
            onChange={e => {
              const val = e.target.value as any;
              setActivityPeriod(val);
              if (val !== 'custom') {
                setActivityDateFrom('');
                setActivityDateTo('');
              }
            }}
            sx={{ minWidth: 145 }}
          >
            <MenuItem value="ALL">All Time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="this_week">This Week</MenuItem>
            <MenuItem value="this_month">This Month</MenuItem>
            <MenuItem value="custom">Custom Range…</MenuItem>
          </TextField>

          {activityPeriod === 'custom' && (
            <>
              <TextField
                size="small"
                type="date"
                label="Activity From"
                value={activityDateFrom}
                onChange={e => setActivityDateFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                type="date"
                label="Activity To"
                value={activityDateTo}
                onChange={e => setActivityDateTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </>
          )}

          {isInvFiltered && (
            <Button
              onClick={() => {
                setUsageStatusFilter('ALL');
                setSelectedVaccineType('ALL');
                setSupplierFilter('ALL');
                setExpiryFilter('ALL');
                setExpiryDateFrom('');
                setExpiryDateTo('');
                setActivityPeriod('ALL');
                setActivityDateFrom('');
                setActivityDateTo('');
              }}
              sx={{ color: 'error.main', fontFamily: POPPINS }}
            >
              Reset
            </Button>
          )}

          <Button
            type="button"
            onClick={loadData}
            disabled={invLoading}
            sx={{ ml: { sm: 'auto' }, fontFamily: POPPINS }}
            startIcon={<Refresh />}
          >
            Refresh Inventory
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5, fontFamily: POPPINS }}>
          Showing {filteredInvItems.length} of {invItems.length} vaccine inventory batches · Activity Period:{' '}
          <b>{periodLabelText}</b> ({totalPeriodUniquePatients} unique patients, {totalDosesAdministered} doses administered).
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

      {/* ── NEW ANALYTICS SECTION: Vaccine Usage by Patient ───────── */}
      <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 }, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, fontFamily: POPPINS }}>
                Vaccine Usage by Patient
              </Typography>
              <Chip
                size="small"
                icon={<PeopleAltOutlined sx={{ fontSize: '14px !important' }} />}
                label={`${totalPeriodUniquePatients} Unique Patient${totalPeriodUniquePatients === 1 ? '' : 's'}`}
                color="primary"
                variant="outlined"
                sx={{ fontFamily: POPPINS, fontWeight: 600, height: 24 }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: POPPINS }}>
              Distinct patients and doses administered per vaccine type during <b>{periodLabelText}</b>
            </Typography>
          </Box>
        </Box>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Vaccine usage by patient table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS }}>Vaccine Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Unique Patients</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Doses Administered</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Quantity Used (Vials)</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Wasted Quantity</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: POPPINS, textAlign: 'center' }}>Stock Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invLoading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontFamily: POPPINS }}>
                    <CircularProgress size={24} sx={{ mb: 1, display: 'block', mx: 'auto', color: '#10b981' }} />
                    Loading patient usage analytics…
                  </TableCell>
                </TableRow>
              ) : vaccineUsageByPatient.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontFamily: POPPINS }}>
                    No vaccine administrations or inventory recorded for this selection.
                  </TableCell>
                </TableRow>
              ) : (
                vaccineUsageByPatient.map((item, idx) => (
                  <TableRow key={item.vaccineType || idx} hover>
                    <TableCell sx={{ fontFamily: POPPINS }}>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontFamily: POPPINS }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <LocalHospitalOutlined sx={{ fontSize: 16, color: '#10b981' }} />
                        <span>{item.vaccineType}</span>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: item.uniquePatients > 0 ? '#3b82f6' : 'text.secondary', fontFamily: POPPINS }}>
                      {item.uniquePatients}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: item.dosesAdministered > 0 ? '#10b981' : 'text.secondary', fontFamily: POPPINS }}>
                      {item.dosesAdministered}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontFamily: POPPINS }}>
                      {item.vialsUsed}
                    </TableCell>
                    <TableCell
                      sx={{
                        textAlign: 'center',
                        fontFamily: POPPINS,
                        color: item.vialsWasted > 0 ? 'error.main' : 'text.secondary',
                        fontWeight: item.vialsWasted > 0 ? 600 : 400,
                      }}
                    >
                      {item.vialsWasted}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontFamily: POPPINS }}>
                      <Chip
                        size="small"
                        label={item.activeBatches > 0 ? `${item.activeBatches} Active Batch(es)` : 'Out of Stock'}
                        color={item.activeBatches > 0 ? 'success' : 'default'}
                        variant={item.activeBatches > 0 ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.72rem', height: 22, fontFamily: POPPINS }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Detailed Batch Utilization & Wastage Audit Log ──────── */}
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
