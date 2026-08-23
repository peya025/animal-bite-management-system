import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, IconButton, Snackbar, Stack, Tooltip, Typography, Chip, Tabs, Tab,
} from '@mui/material';
import { Refresh as RefreshIcon, LocalHospital as ClinicIcon, VerifiedUser as VerifiedIcon } from '@mui/icons-material';
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
import VaccineTypesCatalog from '../components/VaccineTypesCatalog/VaccineTypesCatalog';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import type { InventoryItem } from '../types';

// ─── Component ────────────────────────────────────────────────

export default function VaccineInventory() {
  const { clinic } = useAuth();

  const [items, setItems]               = useState<InventoryItem[]>([]);
  const [stats, setStats]               = useState<{
    total_batches: number;
    active_batches: number;
    depleted_batches: number;
    expired_batches: number;
    total_stock: number;
    expiring_soon: number;
    low_stock: number;
  } | null>(null);

  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(15);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter]   = useState('');
  const [expiryFrom, setExpiryFrom]     = useState('');
  const [expiryTo, setExpiryTo]         = useState('');

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [addOpen,     setAddOpen]     = useState(false);
  const [editItem,    setEditItem]    = useState<InventoryItem | null>(null);
  const [initialVaccineType, setInitialVaccineType] = useState<string>('');
  const [adjustItem,  setAdjustItem]  = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [deleteItem,  setDeleteItem]  = useState<InventoryItem | null>(null);
  const [openVialTarget, setOpenVialTarget] = useState<InventoryItem | null>(null);
  const [discardVialTarget, setDiscardVialTarget] = useState<InventoryItem | null>(null);
  const [view, setView]               = useState<'table' | 'catalog' | 'stockcard' | 'fifo'>('table');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', {
        params: {
          status: statusFilter || undefined,
          vaccine_type: search || undefined,
          per_page: 100,
        },
      });
      const liveItems: InventoryItem[] = res.data?.data || res.data || [];
      let filtered = Array.isArray(liveItems) ? [...liveItems] : [];
      if (batchFilter) {
        filtered = filtered.filter(i => (i.batch_number || '').toLowerCase().includes(batchFilter.toLowerCase()));
      }
      setItems(filtered);
      setTotal(res.data?.total || filtered.length);
    } catch (err: any) {
      setItems([]);
      setTotal(0);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to load vaccine inventory from server',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, batchFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/inventory/statistics');
      if (res.data && res.data.total_batches !== undefined) {
        setStats(res.data);
      }
    } catch (err: any) {
      if (items.length > 0) {
        setStats({
          total_batches: items.length,
          active_batches: items.filter(i => i.status === 'active').length,
          depleted_batches: items.filter(i => i.current_quantity === 0).length,
          expired_batches: items.filter(i => i.status === 'expired').length,
          total_stock: items.reduce((sum, i) => sum + i.current_quantity, 0),
          expiring_soon: 0,
          low_stock: 0,
        });
      } else {
        setStats({
          total_batches: 0,
          active_batches: 0,
          depleted_batches: 0,
          expired_batches: 0,
          total_stock: 0,
          expiring_soon: 0,
          low_stock: 0,
        });
      }
    }
  }, [items]);

  const handleConfirmOpenVial = async () => {
    if (!openVialTarget) return;
    try {
      await api.post(`/inventory/${openVialTarget.inventory_id}/open-vial`, {
        open_vial_hours: openVialTarget.open_vial_hours || 6,
      });
      showSuccess(`Vial marked OPENED. Discard countdown started.`);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to mark vial as opened', severity: 'error' });
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
      showSuccess(`Open vial cleared and discarded.`);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to discard open vial', severity: 'error' });
    } finally {
      setDiscardVialTarget(null);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const showSuccess = (msg: string) => {
    setSnackbar({ open: true, message: msg, severity: 'success' });
    loadData();
    loadStats();
  };

  return (
    <Box sx={{ px: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography component="h1" sx={{ fontWeight: 600, fontSize: '25px', lineHeight: 1.2, letterSpacing: '-0.5px', color: 'var(--text-h)', margin: '0 0 4px 0' }}>
              Vaccine Inventory
            </Typography>
            <Chip
              icon={<VerifiedIcon style={{ fontSize: 16 }} />}
              label="Standardized ABTC System"
              color="success"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600, fontSize: '11px' }}
            />
          </Box>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d', margin: 0 }}>
            Standardized Vaccine Inventory &amp; Official Stock Card Management System
          </Typography>

          {/* ── Breadcrumb ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: 0.75, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Inventory</span>
          </Box>

          {/* Independent Clinic Facility Badge */}
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, mt: 1.25, px: 1.5, py: 0.65, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
            <ClinicIcon sx={{ color: '#059669', fontSize: 18 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#166534' }}>
              Facility: {clinic?.name || 'Tagoloan Animal Bite Treatment Center'}
            </Typography>
            <Chip label="Independent ABTC Facility" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d' }} />
            <Chip label="⚡ FIFO / FEFO Enforced" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }} />
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle with Tabs */}
          <Tabs
            value={view}
            onChange={(_, newValue) => setView(newValue)}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'none',
                px: 2,
              },
            }}
          >
            <Tab label="📋 Inventory Batches" value="table" />
            <Tab label="💉 Vaccine Types Catalog" value="catalog" />
            <Tab label="📄 Stock Card" value="stockcard" />
            <Tab label="✓ FIFO Compliance" value="fifo" />
          </Tabs>

          <Tooltip title="Refresh">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <button
            onClick={() => { setInitialVaccineType(''); setEditItem(null); setAddOpen(true); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.25)'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Stock Batch
          </button>
        </Stack>
      </Box>

      {/* ── FIFO Protocol Notice Banner ── */}
      {view === 'table' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            p: 1.5,
            mb: 2.5,
            bgcolor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                bgcolor: '#059669',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              ✓
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                First In, First Out (FIFO / FEFO) Protocol Active
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#047857' }}>
                Oldest and earliest-expiring vaccine batches are automatically prioritized for clinical use (marked with 🟢 <strong>FIFO: USE FIRST</strong>).
              </Typography>
            </Box>
          </Box>
          <Chip
            label="Auto-Sorted by Earliest Expiry"
            size="small"
            sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#dcfce7', color: '#166534' }}
          />
        </Box>
      )}

      {/* ── Stats Cards (Fills space evenly across both sides) ── */}
      {view === 'table' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 3,
            width: '100%',
          }}
        >
          {([
            { label: 'Active Batches',     value: stats?.active_batches,              color: 'success' as const },
            { label: 'Total Vials',        value: stats ? `${stats.total_stock}` : '-', color: 'info' as const },
            { label: 'Patients Coverable', value: stats ? `${stats.total_stock * 3}` : '-', color: 'success' as const },
            { label: 'Expiring Soon',      value: stats?.expiring_soon,               color: 'warning' as const },
            { label: 'Depleted',           value: stats?.depleted_batches,            color: 'error' as const },
          ] as const).map(s => (
            <StatCard key={s.label} label={s.label} value={s.value ?? '-'} color={s.color} loading={!stats} />
          ))}
        </Box>
      )}

      {/* ── Main Views: Batches Table | Vaccine Type Catalog | Stock Card | FIFO Report ── */}
      {view === 'table' ? (
        <InventoryTable
          items={items} loading={loading} page={page} rowsPerPage={rowsPerPage} total={total}
          search={search} statusFilter={statusFilter} batchFilter={batchFilter}
          expiryFrom={expiryFrom} expiryTo={expiryTo}
          onSearchChange={setSearch} onStatusFilterChange={setStatusFilter}
          onBatchFilterChange={setBatchFilter} onExpiryFromChange={setExpiryFrom}
          onExpiryToChange={setExpiryTo} onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage} onEdit={setEditItem}
          onAdjust={setAdjustItem} onHistory={setHistoryItem}
          onDelete={setDeleteItem}
          onOpenVial={setOpenVialTarget}
          onDiscardVial={setDiscardVialTarget}
          onViewStockCard={() => setView('stockcard')}
          onAddFirst={() => { setInitialVaccineType(''); setAddOpen(true); }}
        />
      ) : view === 'catalog' ? (
        <VaccineTypesCatalog
          onStockBatch={(vaccineType) => {
            setInitialVaccineType(vaccineType);
            setEditItem(null);
            setAddOpen(true);
          }}
        />
      ) : view === 'stockcard' ? (
        <StockCardView items={items} loading={loading} />
      ) : (
        <FifoComplianceReport />
      )}

      {/* ── Dialogs ── */}
      <AddEditInventoryDialog
        open={addOpen || !!editItem}
        editItem={editItem}
        initialVaccineType={initialVaccineType}
        onClose={() => { setAddOpen(false); setEditItem(null); setInitialVaccineType(''); }}
        onSaved={() => { loadData(); showSuccess(editItem ? 'Inventory updated successfully' : 'Stock added successfully'); }}
      />
      <AdjustStockDialog
        open={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSaved={() => { loadData(); showSuccess('Stock adjusted successfully'); }}
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
        onDeleted={() => { loadData(); showSuccess('Inventory record deleted'); }}
      />

      {/* Mark Vial Opened Confirmation Dialog */}
      {openVialTarget && (
        <ConfirmationDialog
          variant="warning"
          colorVariant="warning"
          title="Mark Vial OPENED?"
          message={`Are you opening a vial of ${openVialTarget.vaccine_type} (Batch: ${openVialTarget.batch_number})? This will start a ${openVialTarget.open_vial_hours || 6}-hour discard countdown.`}
          confirmLabel="Yes, Start Countdown"
          onConfirm={handleConfirmOpenVial}
          onCancel={() => setOpenVialTarget(null)}
        />
      )}

      {/* Clear / Discard Open Vial Confirmation Dialog */}
      {discardVialTarget && (
        <ConfirmationDialog
          variant="danger"
          colorVariant="danger"
          title="Discard / Close Open Vial?"
          message={`Mark the opened vial of ${discardVialTarget.vaccine_type} (Batch: ${discardVialTarget.batch_number}) as empty or discarded?`}
          confirmLabel="Yes, Mark Discarded"
          onConfirm={handleConfirmDiscardVial}
          onCancel={() => setDiscardVialTarget(null)}
        />
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
