import { useCallback, useEffect, useMemo, useState } from 'react';

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
  Chip,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  LocalHospital as ClinicIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import StatCard from '../../../components/common/StatCard';
import AddEditInventoryDialog from '../components/AddEditInventoryDialog/AddEditInventoryDialog';
import AdjustStockDialog from '../components/AdjustStockDialog/AdjustStockDialog';
import TransactionHistoryDialog from '../components/TransactionHistoryDialog/TransactionHistoryDialog';
import DeleteDialog from '../components/DeleteDialog/DeleteDialog';
import InventoryTable from '../components/InventoryTable/InventoryTable';
import StockCardView from '../components/StockCardView/StockCardView';
import FifoComplianceReport from '../components/FifoComplianceReport/FifoComplianceReport';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import StockLevelIndicator from '../components/StockLevelIndicator/StockLevelIndicator';
import type { InventoryItem } from '../types';
import { deriveInventoryStatus } from '../utils/inventoryStatus';

export default function VaccineInventory() {
  const { clinic, user } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [view, setView] = useState<'table' | 'stockcard' | 'fifo'>('table');

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', { params: { per_page: 200 } });
      const liveItems: InventoryItem[] = res.data?.data || res.data || [];
      setItems(Array.isArray(liveItems) ? liveItems : []);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setItems([]);
      setSnackbar({
        open: true,
        message: apiError.response?.data?.message || 'Failed to load vaccine inventory from server.',
        severity: 'error',
      });
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
      const matchesStatus = !statusFilter || derivedStatus.toLowerCase() === statusFilter.toLowerCase();
      const expiryDate = item.expiration_date ? item.expiration_date.split('T')[0] : '';
      const matchesFrom = !expiryFrom || !expiryDate || expiryDate >= expiryFrom;
      const matchesTo = !expiryTo || !expiryDate || expiryDate <= expiryTo;

      return matchesSearch && matchesBatch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [items, search, batchFilter, statusFilter, expiryFrom, expiryTo]);

  const pagedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const stats = useMemo(() => {
    const statusCounts = items.reduce(
      (acc, item) => {
        const status = deriveInventoryStatus(item);
        acc.totalStock += item.current_quantity || 0;
        if (item.current_quantity > 0 && item.current_quantity <= 10) acc.lowStock += 1;
        if (status === 'Active') acc.active += 1;
        if (status === 'Expiring') acc.expiring += 1;
        if (status === 'Expired') acc.expired += 1;
        if (status === 'Depleted') acc.depleted += 1;
        if (status === 'Discard-Pending') acc.discardPending += 1;
        return acc;
      },
      {
        totalStock: 0,
        lowStock: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        depleted: 0,
        discardPending: 0,
      },
    );

    return {
      total_batches: items.length,
      total_stock: statusCounts.totalStock,
      active_batches: statusCounts.active,
      expiring_soon: statusCounts.expiring,
      expired_batches: statusCounts.expired,
      depleted_batches: statusCounts.depleted,
      discard_pending: statusCounts.discardPending,
      low_stock: statusCounts.lowStock,
    };
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography component="h1" sx={{ fontWeight: 700, fontSize: '25px', lineHeight: 1.2, letterSpacing: '-0.5px', color: 'var(--text-h)', m: 0 }}>
              Vaccine Inventory
            </Typography>
            <Chip
              icon={<VerifiedIcon style={{ fontSize: 16 }} />}
              label="Daily operations"
              color="success"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700, fontSize: '11px' }}
            />
          </Box>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#64748b', mt: 0.5 }}>
            Add stock, monitor expiry, and manage opened-vial discard timers from one operational view.
          </Typography>

          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, mt: 1.25, px: 1.5, py: 0.75, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2, flexWrap: 'wrap' }}>
            <ClinicIcon sx={{ color: '#059669', fontSize: 18 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#166534' }}>
              Facility: {clinic?.name || 'Tagoloan Animal Bite Treatment Center'}
            </Typography>
            <Chip label="FIFO / FEFO view" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d' }} />
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs
            value={view}
            onChange={(_, newValue) => setView(newValue)}
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
            <Tab label="Stock Card" value="stockcard" />
            <Tab label="FIFO Report" value="fifo" />
          </Tabs>

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

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        </Stack>
      </Box>

      {/* Priority 14: Stock-Level Color Coding & Live Clinic Stock Summary */}
      <StockLevelIndicator showLegend={true} />

      {view === 'table' && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2,
              mb: 3,
              width: '100%',
            }}
          >
            <StatCard label="Active Batches" value={stats.active_batches} color="success" loading={loading} />
            <StatCard label="Total Balance" value={stats.total_stock} color="info" loading={loading} />
            <StatCard label="Expiring Soon" value={stats.expiring_soon} color="warning" loading={loading} />
            <StatCard label="Discard-Pending" value={stats.discard_pending} color="info" loading={loading} />
            <StatCard label="Depleted" value={stats.depleted_batches} color="error" loading={loading} />
          </Box>
        </>
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
          expiryFrom={expiryFrom}
          expiryTo={expiryTo}
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
          onViewStockCard={() => setView('stockcard')}
          onAddFirst={() => {
            setInitialVaccineType('');
            setAddOpen(true);
          }}
        />
      ) : view === 'stockcard' ? (
        <StockCardView items={items} loading={loading} />
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
          showSuccess('Inventory batch deleted.');
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

