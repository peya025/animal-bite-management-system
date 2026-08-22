import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, IconButton, Snackbar, Stack, Tooltip, Typography, Chip,
} from '@mui/material';
import { Refresh as RefreshIcon, Science as DemoIcon, LocalHospital as ClinicIcon } from '@mui/icons-material';
import api from '../../../services/api';
import StatCard from '../../../components/common/StatCard';
import AddEditInventoryDialog from '../components/AddEditInventoryDialog/AddEditInventoryDialog';
import AdjustStockDialog from '../components/AdjustStockDialog/AdjustStockDialog';
import TransactionHistoryDialog from '../components/TransactionHistoryDialog/TransactionHistoryDialog';
import DeleteDialog from '../components/DeleteDialog/DeleteDialog';
import InventoryTable from '../components/InventoryTable/InventoryTable';
import StockCardView from '../components/StockCardView/StockCardView';
import { DEMO_INVENTORY_ITEMS, DEMO_CLINICS } from '../data/inventoryDemoData';

// ─── Types ────────────────────────────────────────────────────
interface InventoryItem {
  inventory_id: number;
  clinic_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'deleted';
  created_at: string;
  updated_at: string;
  transactions_count?: number;
}
interface InventoryStats {
  total_batches: number;
  active_batches: number;
  depleted_batches: number;
  expired_batches: number;
  total_stock: number;
  expiring_soon: number;
  low_stock: number;
}

// ─── Main Component ───────────────────────────────────────────
export default function VaccineInventory() {
  const [items, setItems]               = useState<InventoryItem[]>(DEMO_INVENTORY_ITEMS);
  const [stats, setStats]               = useState<InventoryStats | null>(null);
  const [loading, setLoading]           = useState(false);
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(15);
  const [total, setTotal]               = useState(DEMO_INVENTORY_ITEMS.length);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter]   = useState('');
  const [expiryFrom, setExpiryFrom]     = useState('');
  const [expiryTo, setExpiryTo]         = useState('');
  const [selectedClinicId] = useState<number>(0); // 0 = All Clinics

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [addOpen,     setAddOpen]     = useState(false);
  const [editItem,    setEditItem]    = useState<InventoryItem | null>(null);
  const [adjustItem,  setAdjustItem]  = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [deleteItem,  setDeleteItem]  = useState<InventoryItem | null>(null);
  const [view, setView]               = useState<'table' | 'stockcard'>('table');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', {
        params: {
          status: statusFilter || undefined,
          vaccine_type: search || undefined,
        },
      });
      const liveItems = res.data?.data || res.data || [];
      if (Array.isArray(liveItems) && liveItems.length > 0) {
        let filtered = [...liveItems];
        if (batchFilter) {
          filtered = filtered.filter(i => (i.batch_number || '').toLowerCase().includes(batchFilter.toLowerCase()));
        }
        setItems(filtered);
        setTotal(res.data?.total || filtered.length);
      } else {
        // Fallback to sample items if live table has not been populated yet
        let filtered = [...DEMO_INVENTORY_ITEMS];
        if (selectedClinicId > 0) {
          filtered = filtered.filter(i => i.clinic_id === selectedClinicId);
        }
        if (search) {
          filtered = filtered.filter(i => i.vaccine_type.toLowerCase().includes(search.toLowerCase()));
        }
        if (statusFilter) {
          filtered = filtered.filter(i => i.status === statusFilter);
        }
        if (batchFilter) {
          filtered = filtered.filter(i => i.batch_number.toLowerCase().includes(batchFilter.toLowerCase()));
        }
        setItems(filtered);
        setTotal(filtered.length);
      }
    } catch {
      let filtered = [...DEMO_INVENTORY_ITEMS];
      if (selectedClinicId > 0) {
        filtered = filtered.filter(i => i.clinic_id === selectedClinicId);
      }
      if (search) {
        filtered = filtered.filter(i => i.vaccine_type.toLowerCase().includes(search.toLowerCase()));
      }
      if (statusFilter) {
        filtered = filtered.filter(i => i.status === statusFilter);
      }
      if (batchFilter) {
        filtered = filtered.filter(i => i.batch_number.toLowerCase().includes(batchFilter.toLowerCase()));
      }
      setItems(filtered);
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, batchFilter, selectedClinicId]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/inventory/statistics');
      if (res.data && res.data.total_batches !== undefined) {
        setStats(res.data);
        return;
      }
    } catch {
      // Fallback
    }

    const activePool = selectedClinicId > 0
      ? DEMO_INVENTORY_ITEMS.filter(i => i.clinic_id === selectedClinicId)
      : DEMO_INVENTORY_ITEMS;

    setStats({
      total_batches: activePool.length,
      active_batches: activePool.filter(i => i.status === 'active').length,
      depleted_batches: activePool.filter(i => i.current_quantity === 0).length,
      expired_batches: activePool.filter(i => i.status === 'expired').length,
      total_stock: activePool.reduce((sum, i) => sum + i.current_quantity, 0),
      expiring_soon: 0,
      low_stock: 0,
    });
  }, [selectedClinicId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const showSuccess = (msg: string) => {
    setSnackbar({ open: true, message: msg, severity: 'success' });
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
              icon={<DemoIcon style={{ fontSize: 16 }} />}
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
              Facility: {selectedClinicId === 0 ? DEMO_CLINICS[0].name : (DEMO_CLINICS.find(c => c.clinic_id === selectedClinicId)?.name || DEMO_CLINICS[0].name)}
            </Typography>
            <Chip label="Independent ABTC Facility" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d' }} />
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <Box sx={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
            <Tooltip title="Inventory List View">
              <IconButton
                size="small"
                onClick={() => setView('table')}
                sx={{
                  borderRadius: 0, px: 1.5,
                  background: view === 'table' ? '#10b981' : '#fff',
                  color: view === 'table' ? '#fff' : '#6b7280',
                  '&:hover': { background: view === 'table' ? '#059669' : '#f3f4f6' },
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M3 15h18M9 3v18"/>
                </svg>
              </IconButton>
            </Tooltip>

            <Tooltip title="Official Stock Card Table View">
              <IconButton
                size="small"
                onClick={() => setView('stockcard')}
                sx={{
                  borderRadius: 0, px: 1.5,
                  borderLeft: '1px solid #e5e7eb',
                  background: view === 'stockcard' ? '#10b981' : '#fff',
                  color: view === 'stockcard' ? '#fff' : '#6b7280',
                  '&:hover': { background: view === 'stockcard' ? '#059669' : '#f3f4f6' },
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </IconButton>
            </Tooltip>
          </Box>

          <Tooltip title="Refresh">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <button
            onClick={() => setAddOpen(true)}
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
            Add Stock
          </button>
        </Stack>
      </Box>

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

      {/* ── Table or Official Stock Card View ── */}
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
          onViewStockCard={() => setView('stockcard')}
          onAddFirst={() => setAddOpen(true)}
        />
      ) : (
        <StockCardView items={items} loading={loading} isDemo={true} />
      )}

      {/* ── Dialogs ── */}
      <AddEditInventoryDialog
        open={addOpen || !!editItem} editItem={editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); }}
        onSaved={() => { loadData(); showSuccess(editItem ? 'Inventory updated successfully' : 'Stock added successfully'); }}
      />
      <AdjustStockDialog open={!!adjustItem} item={adjustItem} onClose={() => setAdjustItem(null)}
        onSaved={() => { loadData(); showSuccess('Stock adjusted successfully'); }} />
      <TransactionHistoryDialog open={!!historyItem} item={historyItem} onClose={() => setHistoryItem(null)} />
      <DeleteDialog open={!!deleteItem} item={deleteItem} onClose={() => setDeleteItem(null)}
        onDeleted={() => { loadData(); showSuccess('Inventory record deleted'); }} />

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
