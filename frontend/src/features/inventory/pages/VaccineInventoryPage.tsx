import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};
import {
  Box,
  Button,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
  Alert,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Inventory2 as InventoryIcon,
  CheckCircleOutlined as ActiveIcon,
  WarningAmberOutlined as ExpiringIcon,
  AccessTime as OpenedIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/config/routes';
import AddEditInventoryDialog from '../components/AddEditInventoryDialog/AddEditInventoryDialog';
import AdjustStockDialog from '../components/AdjustStockDialog/AdjustStockDialog';
import TransactionHistoryDialog from '../components/TransactionHistoryDialog/TransactionHistoryDialog';
import DeleteDialog from '../components/DeleteDialog/DeleteDialog';
import InventoryTable from '../components/InventoryTable/InventoryTable';
import StockCardView from '../components/StockCardView/StockCardView';
import FifoComplianceReport from '../components/FifoComplianceReport/FifoComplianceReport';
import NurseVaccineList from '../components/NurseVaccineList/NurseVaccineList';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import type { InventoryItem, VaccineTypePreset } from '../types';
import { getVaccinePresets } from '../services/vaccineInventoryService';
import { deriveInventoryStatus } from '../utils/inventoryStatus';
import { daysUntil } from '../../../shared/utils';

interface VaccineInventoryProps {
  initialTab?: 'table' | 'stockcard' | 'fifo' | 'administrations';
}

function InventorySummaryCard({ label, value, subtitle, tone, icon, loading }: { label: string; value: number; subtitle: string; tone: 'green' | 'blue' | 'amber' | 'cyan'; icon: React.ReactNode; loading: boolean }) {
  const colors = {
    green: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    blue: { color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
    amber: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    cyan: { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  }[tone];

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', p: '16px 20px', display: 'flex', alignItems: 'center', gap: 2, minHeight: 102, bgcolor: 'var(--card-bg-solid, #fff)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', transition: 'box-shadow 0.25s ease', '&:hover': { boxShadow: '0 8px 22px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.16)' } }}>
      <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: colors.bg, color: colors.color, border: `1px solid ${colors.border}`, display: 'grid', placeItems: 'center', flexShrink: 0, '& svg': { fontSize: 22 } }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ mb: 0.35, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{label}</Typography>
        {loading ? <Skeleton width={46} height={30} /> : <Typography sx={{ fontSize: 27, lineHeight: 1, fontWeight: 800, color: 'var(--text-h, #111827)' }}>{value}</Typography>}
        <Typography sx={{ mt: 0.45, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{subtitle}</Typography>
      </Box>
    </Paper>
  );
}

export default function VaccineInventory({ initialTab }: VaccineInventoryProps = {}) {
  const { user } = useAuth();
  const isNurseRole = user?.role === 'treatment';
  const isAdminRole = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  const defaultTab = initialTab
    || (location.pathname.includes('/administrations') ? 'administrations' : undefined)
    || (tabParam && ['table', 'stockcard', 'fifo', 'administrations'].includes(tabParam) ? (tabParam as any) : undefined)
    || 'table';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [view, setView] = useState<'table' | 'stockcard' | 'fifo' | 'administrations'>(defaultTab);
  const [selectedStockCardId, setSelectedStockCardId] = useState<number | null>(null);

  useEffect(() => {
    const batchParam = searchParams.get('batchId') || searchParams.get('initialItemId');
    if (batchParam) {
      setSelectedStockCardId(parseInt(batchParam, 10));
    }
    if (tabParam === 'stockcard') {
      setView('stockcard');
    } else if (location.pathname.includes('/administrations') || initialTab === 'administrations') {
      setView('administrations');
    } else if (tabParam && ['table', 'fifo', 'administrations'].includes(tabParam)) {
      setView((isNurseRole || isAdminRole) && tabParam === 'fifo' ? 'table' : tabParam as any);
    } else {
      setView('table');
    }
  }, [initialTab, isAdminRole, isNurseRole, location.pathname, tabParam, searchParams]);

  useEffect(() => {
    const handleReset = () => {
      setView('table');
    };
    window.addEventListener('nav-inventory-reset', handleReset);
    return () => window.removeEventListener('nav-inventory-reset', handleReset);
  }, []);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [initialVaccineType, setInitialVaccineType] = useState('');
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [openVialTarget, setOpenVialTarget] = useState<InventoryItem | null>(null);
  const [discardVialTarget, setDiscardVialTarget] = useState<InventoryItem | null>(null);
  const [presets, setPresets] = useState<VaccineTypePreset[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, presetsRes] = await Promise.allSettled([
        api.get('/inventory', { params: { per_page: 200 } }),
        getVaccinePresets(),
      ]);

      if (invRes.status === 'fulfilled') {
        const liveItems: InventoryItem[] = invRes.value.data?.data || invRes.value.data || [];
        setItems(Array.isArray(liveItems) ? liveItems : []);
      } else {
        const apiError = invRes.reason as ApiError;
        setItems([]);
        setSnackbar({
          open: true,
          message: apiError?.response?.data?.message || 'Failed to load vaccine inventory from server.',
          severity: 'error',
        });
      }

      if (presetsRes.status === 'fulfilled') {
        setPresets(Array.isArray(presetsRes.value) ? presetsRes.value : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const derivedStatus = deriveInventoryStatus(item);
      const matchesSearch = !search || item.vaccine_type.toLowerCase().includes(search.toLowerCase());
      const matchesBatch = !batchFilter || (item.batch_number || '').toLowerCase().includes(batchFilter.toLowerCase());
      const matchesSource = !sourceFilter || (item.received_from || '').toLowerCase().includes(sourceFilter.toLowerCase());

      let matchesStatus = true;
      if (statusFilter) {
        switch (statusFilter) {
          case 'active':
            matchesStatus = derivedStatus === 'Active';
            break;
          case 'low-stock':
            matchesStatus = item.current_quantity > 0 && item.current_quantity <= 10;
            break;
          case 'expiring-soon':
            matchesStatus = derivedStatus === 'Expiring';
            break;
          case 'expired':
            matchesStatus = derivedStatus === 'Expired';
            break;
          case 'depleted':
            matchesStatus = derivedStatus === 'Depleted';
            break;
          case 'discard-pending':
            matchesStatus = derivedStatus === 'Discard-Pending';
            break;
          default:
            matchesStatus = true;
        }
      }

      const expiryDate = item.expiration_date ? item.expiration_date.split('T')[0] : '';
      const matchesFrom = !expiryFrom || !expiryDate || expiryDate >= expiryFrom;
      const matchesTo = !expiryTo || !expiryDate || expiryDate <= expiryTo;

      return matchesSearch && matchesBatch && matchesSource && matchesStatus && matchesFrom && matchesTo;
    });
  }, [items, search, batchFilter, sourceFilter, statusFilter, expiryFrom, expiryTo]);

  const pagedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const stats = useMemo(() => {
    return items.reduce((summary, item) => {
      const daysToExpiry = item.expiration_date ? daysUntil(item.expiration_date) : Number.POSITIVE_INFINITY;
      const operational = item.status === 'active' && item.current_quantity > 0 && daysToExpiry >= 0;
      if (operational) {
        summary.available_vials += item.current_quantity;
        summary.active_batches += 1;
      }
      if (operational && daysToExpiry <= 30) summary.expiring_soon += 1;
      if (item.status === 'active' && item.open_vial_status === 'opened') summary.opened_vials += 1;
      return summary;
    }, { available_vials: 0, active_batches: 0, expiring_soon: 0, opened_vials: 0 });
  }, [items]);

  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: string } | null>(null);

  const showSuccess = (message: string, title: string = 'Success') => {
    setSuccessModal({ open: true, title, message });
    loadData();
  };


  const handleConfirmOpenVial = async () => {
    if (!openVialTarget) return;

    try {
      await api.post(`/inventory/${openVialTarget.inventory_id}/open-vial`, {
        open_vial_hours: openVialTarget.open_vial_hours || 6,
      });
      showSuccess('Vial marked opened. Open-vial discard timer started.');
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setSnackbar({
        open: true,
        message: apiError.response?.data?.message || 'Failed to mark vial as opened.',
        severity: 'error',
      });
    } finally {
      setOpenVialTarget(null);
    }
  };

  const handleConfirmDiscardVial = async () => {
    if (!discardVialTarget) return;

    try {
      await api.post(`/inventory/${discardVialTarget.inventory_id}/discard-vial`, {
        reason: 'Marked empty / discard timer elapsed',
      });
      showSuccess('Opened vial cleared and marked discarded.');
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setSnackbar({
        open: true,
        message: apiError.response?.data?.message || 'Failed to discard opened vial.',
        severity: 'error',
      });
    } finally {
      setDiscardVialTarget(null);
    }
  };

  return (
    <Box sx={{ px: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          {isNurseRole ? (
            <>
              <Typography
                component="h1"
                sx={{
                  fontFamily: 'Poppins',
                  fontSize: '24px',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-h, #111827)',
                  mb: 0.5,
                }}
              >
                {view === 'stockcard' ? 'Stock Card' : view === 'administrations' ? 'Inventory Transaction' : 'Vaccine Inventory'}
              </Typography>
              {/* Breadcrumb */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  fontFamily: 'Poppins',
                  fontSize: '13px',
                }}
              >
                <button
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#3b82f6',
                    fontFamily: 'Poppins',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Dashboard
                </button>
                <span style={{ color: '#9ca3af' }}>›</span>
                <span style={{ color: '#6b7280' }}>Vaccine Stock Management</span>
                <span style={{ color: '#9ca3af' }}>›</span>
                {view === 'stockcard' ? (
                  <>
                    <button
                      onClick={() => {
                        setView('table');
                        setSelectedStockCardId(null);
                        navigate('/inventory');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#059669',
                        fontFamily: 'Poppins',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Vaccine Inventory
                    </button>
                    <span style={{ color: '#9ca3af' }}>›</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>Stock Card</span>
                  </>
                ) : (
                  <span style={{ color: '#6b7280' }}>
                    {view === 'administrations' ? 'Inventory Transaction' : 'Vaccine Inventory'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography component="h1" sx={{ fontWeight: 700, fontSize: '25px', lineHeight: 1.2, letterSpacing: '-0.5px', color: 'var(--text-h)', m: 0 }}>
                  {view === 'stockcard' ? 'Stock Card' : view === 'administrations' ? 'Inventory Transaction' : 'Vaccine Inventory'}
                </Typography>
              </Box>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
                <button
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Dashboard
                </button>
                <span style={{ color: '#9ca3af' }}>›</span>
                <span style={{ color: '#6b7280' }}>Vaccine Stock Management</span>
                <span style={{ color: '#9ca3af' }}>›</span>
                {view === 'stockcard' ? (
                  <>
                    <button
                      onClick={() => {
                        setView('table');
                        setSelectedStockCardId(null);
                        navigate('/inventory');
                      }}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#059669', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Vaccine Inventory
                    </button>
                    <span style={{ color: '#9ca3af' }}>›</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>Stock Card</span>
                  </>
                ) : (
                  <span style={{ color: '#6b7280' }}>
                    {view === 'administrations' ? 'Inventory Transaction' : 'Vaccine Inventory'}
                  </span>
                )}
              </div>
            </>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {view === 'stockcard' ? (
            <>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setView('table');
                  setSelectedStockCardId(null);
                  navigate('/inventory');
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#334155',
                  bgcolor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 2,
                  px: 2,
                  py: 0.75,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  '&:hover': {
                    bgcolor: '#f1f5f9',
                    borderColor: '#94a3b8',
                    color: '#0f172a',
                  },
                }}
              >
                Back to Inventory Batches
              </Button>

              <Button
                variant="outlined"
                onClick={loadData}
                disabled={loading}
                startIcon={<RefreshIcon sx={{ fontSize: 16, transition: 'transform 0.4s', ...(loading && { animation: 'spin 0.8s linear infinite' }) }} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: 2,
                  px: 2,
                  borderColor: '#d1d5db',
                  color: '#374151',
                  '&:hover': { borderColor: '#10b981', color: '#10b981', bgcolor: '#f0fdf4' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </Button>
            </>
          ) : (
            <>
              {!isAdminRole && (
                <Tabs
                  value={isNurseRole && view === 'administrations' ? false : view}
                  onChange={(_, newValue) => {
                    setView(newValue);
                    if (newValue === 'administrations') {
                      navigate('/inventory/administrations');
                    } else if (newValue === 'table') {
                      navigate('/inventory');
                    } else {
                      navigate(`/inventory?tab=${newValue}`);
                    }
                  }}
                  sx={{
                    minHeight: 36,
                    '& .MuiTab-root': {
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 2,
                    },
                  }}
                >
                  <Tab label="Inventory Batches" value="table" />
                  {!isNurseRole && <Tab label="Nurse Vaccine List" value="administrations" />}
                  {!isNurseRole && <Tab label="FIFO Report" value="fifo" />}
                </Tabs>
              )}

              {/* Stock Card Button: only with stroke, turns green on hover */}
              <Button
                variant="outlined"
                onClick={() => {
                  setView('stockcard');
                  navigate('/inventory?tab=stockcard');
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: 2,
                  px: 2,
                  minHeight: 36,
                  border: '1.5px solid #10b981',
                  borderColor: '#10b981',
                  color: '#059669',
                  bgcolor: 'transparent',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: '#059669',
                    color: '#ffffff',
                    borderColor: '#059669',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                  },
                }}
              >
                Stock Card
              </Button>

              <Button
                variant="outlined"
                onClick={loadData}
                disabled={loading}
                startIcon={<RefreshIcon sx={{ fontSize: 16, transition: 'transform 0.4s', ...(loading && { animation: 'spin 0.8s linear infinite' }) }} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: 2,
                  px: 2,
                  borderColor: '#d1d5db',
                  color: '#374151',
                  '&:hover': { borderColor: '#10b981', color: '#10b981', bgcolor: '#f0fdf4' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </Button>

              {user?.role === 'admin' && view !== 'administrations' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setInitialVaccineType('');
                    setEditItem(null);
                    setAddOpen(true);
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    borderRadius: 2,
                    px: 2.25,
                    bgcolor: '#059669',
                    '&:hover': { bgcolor: '#047857' },
                    boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
                  }}
                >
                  Add Stock Batch
                </Button>
              )}
            </>
          )}

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        </Stack>
      </Box>

      {view === 'table' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 2.5 }}>
          <InventorySummaryCard label="Available Vials" value={stats.available_vials} subtitle="Usable sealed stock" tone="green" icon={<InventoryIcon />} loading={loading} />
          <InventorySummaryCard label="Active Batches" value={stats.active_batches} subtitle="In current inventory" tone="blue" icon={<ActiveIcon />} loading={loading} />
          <InventorySummaryCard label="Expiring Soon" value={stats.expiring_soon} subtitle="Within 30 days" tone="amber" icon={<ExpiringIcon />} loading={loading} />
          <InventorySummaryCard label="Opened Vials" value={stats.opened_vials} subtitle="Discard timer active" tone="cyan" icon={<OpenedIcon />} loading={loading} />
        </Box>
      )}

      {view === 'table' ? (
        <InventoryTable
          items={pagedItems}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          total={filteredItems.length}
          search={search}
          statusFilter={statusFilter}
          batchFilter={batchFilter}
          sourceFilter={sourceFilter}
          expiryFrom={expiryFrom}
          expiryTo={expiryTo}
          allItems={items}
          presets={presets}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          onBatchFilterChange={(value) => {
            setBatchFilter(value);
            setPage(0);
          }}
          onSourceFilterChange={(value) => {
            setSourceFilter(value);
            setPage(0);
          }}
          onExpiryFromChange={(value) => {
            setExpiryFrom(value);
            setPage(0);
          }}
          onExpiryToChange={(value) => {
            setExpiryTo(value);
            setPage(0);
          }}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(0);
          }}
          onEdit={setEditItem}
          onAdjust={setAdjustItem}
          onHistory={setHistoryItem}
          onDelete={setDeleteItem}
          onOpenVial={setOpenVialTarget}
          onDiscardVial={setDiscardVialTarget}
          onViewStockCard={(item) => {
            setSelectedStockCardId(item.inventory_id);
            setView('stockcard');
            navigate(`/inventory?tab=stockcard&batchId=${item.inventory_id}`);
          }}
          onAddFirst={() => {
            setInitialVaccineType('');
            setAddOpen(true);
          }}
        />
      ) : view === 'stockcard' ? (
        <StockCardView items={items} loading={loading} initialItemId={selectedStockCardId} />
      ) : view === 'administrations' ? (
        <NurseVaccineList />
      ) : (
        <FifoComplianceReport />
      )}

      <AddEditInventoryDialog
        open={addOpen || !!editItem}
        editItem={editItem}
        initialVaccineType={initialVaccineType}
        onClose={() => {
          setAddOpen(false);
          setEditItem(null);
          setInitialVaccineType('');
        }}
        onSaved={() => {
          loadData();
          showSuccess(editItem ? 'Inventory batch updated successfully.' : 'Stock batch added successfully.');
        }}
      />

      <AdjustStockDialog
        open={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSaved={() => {
          loadData();
          showSuccess('Stock adjusted successfully.');
        }}
      />

      <TransactionHistoryDialog
        open={!!historyItem}
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />

      <DeleteDialog
        open={!!deleteItem}
        item={deleteItem}
        onClose={() => setDeleteItem(null)}
        onDeleted={() => {
          loadData();
          showSuccess('Inventory batch archived successfully.');
        }}
      />

      {openVialTarget && (
        <ConfirmationDialog
          variant="warning"
          colorVariant="warning"
          title="Mark vial opened"
          message={`Start the discard timer for ${openVialTarget.vaccine_type} batch ${openVialTarget.batch_number}? The vial will be flagged for discard after ${openVialTarget.open_vial_hours || 6} hour(s).`}
          confirmLabel="Start discard timer"
          onConfirm={handleConfirmOpenVial}
          onCancel={() => setOpenVialTarget(null)}
        />
      )}

      {discardVialTarget && (
        <ConfirmationDialog
          variant="danger"
          colorVariant="danger"
          title="Discard opened vial"
          message={`Mark the opened vial for ${discardVialTarget.vaccine_type} batch ${discardVialTarget.batch_number} as discarded?`}
          confirmLabel="Mark discarded"
          onConfirm={handleConfirmDiscardVial}
          onCancel={() => setDiscardVialTarget(null)}
        />
      )}

      {/* Success Modal */}
      {successModal && (
        <ConfirmationDialog
          variant="success"
          title={successModal.title}
          message={successModal.message}
          confirmLabel="OK"
          hideCancel
          onConfirm={() => setSuccessModal(null)}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

