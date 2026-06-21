import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Grid, IconButton, Snackbar, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  Vaccines as VaccineIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import AddEditInventoryDialog from '../../components/Inventory/AddEditInventoryDialog';
import AdjustStockDialog from '../../components/Inventory/AdjustStockDialog';
import TransactionHistoryDialog from '../../components/Inventory/TransactionHistoryDialog';
import DeleteDialog from '../../components/Inventory/DeleteDialog';
import InventoryTable from '../../components/Inventory/InventoryTable';

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
interface PaginatedResponse {
  data: InventoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ─── Main Component ───────────────────────────────────────────
export default function VaccineInventory() {
  const [items, setItems]               = useState<InventoryItem[]>([]);
  const [stats, setStats]               = useState<InventoryStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(10);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [snackbar, setSnackbar]         = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [addOpen,     setAddOpen]     = useState(false);
  const [editItem,    setEditItem]    = useState<InventoryItem | null>(null);
  const [adjustItem,  setAdjustItem]  = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [deleteItem,  setDeleteItem]  = useState<InventoryItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: page + 1, per_page: rowsPerPage };
      if (search)       params.vaccine_type = search;
      if (statusFilter) params.status       = statusFilter;
      const [inventoryRes, statsRes] = await Promise.all([
        api.get('/inventory', { params }),
        api.get('/inventory/statistics'),
      ]);
      const data: PaginatedResponse = inventoryRes.data;
      setItems(data.data);
      setTotal(data.total);
      setStats(statsRes.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load inventory data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (msg: string) => setSnackbar({ open: true, message: msg, severity: 'success' });

  return (
    <Box sx={{ px: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ 
            fontWeight: 700, 
            fontSize: '20px',
            color: '#111827', 
            margin: '0 0 8px 0'
          }}>
            Vaccine Inventory
          </Typography>
          <Typography sx={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            Manage stock levels and track transactions
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <button 
            className="pm-add-btn" 
            onClick={() => setAddOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.25)';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Stock
          </button>
        </Stack>
      </Box>

      {/* ── Stats Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        {[
          { label: 'Active Batches',      value: stats?.active_batches,                         icon: <CheckIcon />,     color: 'success' },
          { label: 'Total Vials',         value: stats ? `${stats.total_stock}` : '-',          icon: <VaccineIcon />,   color: 'info'    },
          { label: 'Patients Coverable',  value: stats ? `${stats.total_stock * 3}` : '-',      icon: <PeopleIcon />,    color: 'success' },
          { label: 'Expiring Soon',       value: stats?.expiring_soon,                          icon: <WarningIcon />,   color: 'warning' },
          { label: 'Depleted',            value: stats?.depleted_batches,                       icon: <CancelIcon />,    color: 'error'   },
        ].map(s => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 12/5 }}>
            <StatCard label={s.label} value={s.value ?? '-'} icon={s.icon} color={s.color} loading={!stats} />
          </Grid>
        ))}
      </Grid>

      {/* ── Table ── */}
      <InventoryTable
        items={items}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onEdit={setEditItem}
        onAdjust={setAdjustItem}
        onHistory={setHistoryItem}
        onDelete={setDeleteItem}
        onAddFirst={() => setAddOpen(true)}
      />

      {/* ── Dialogs ── */}
      <AddEditInventoryDialog
        open={addOpen || !!editItem}
        editItem={editItem}
        onClose={() => {
          setAddOpen(false);
          setEditItem(null);
        }}
        onSaved={() => {
          loadData();
          showSuccess(editItem ? 'Inventory updated successfully' : 'Stock added successfully');
        }}
      />
      <AdjustStockDialog
        open={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSaved={() => {
          loadData();
          showSuccess('Stock adjusted successfully');
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
          showSuccess('Inventory record deleted');
        }}
      />

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
