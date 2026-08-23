import { useState, useEffect } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import api from '../../../../services/api';
import type { InventoryItem } from '../../types';

interface Transaction {
  transaction_id: number;
  inventory_id: number;
  staff_id: number;
  transaction_type: string;
  quantity: number;
  transaction_date: string;
  remarks: string | null;
  staff?: { name: string };
}

interface TransactionHistoryDialogProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

const TX_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  received: 'success',
  adjusted: 'info',
  used: 'info',
  expired: 'warning',
  disposed: 'error',
};

export default function TransactionHistoryDialog({
  open,
  item,
  onClose,
}: TransactionHistoryDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;

    const timer = window.setTimeout(() => {
      setLoading(true);
      api
        .get(`/inventory/${item.inventory_id}/transactions`)
        .then((res) => setTransactions(res.data.transactions ?? []))
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, item]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
        Transaction History
        {item && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {item.vaccine_type} — Batch {item.batch_number}
          </Typography>
        )}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : transactions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
            <Typography>No transactions recorded yet</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Date', 'Type', 'Quantity', 'Staff', 'Remarks'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{ fontWeight: 700 }}
                      align={h === 'Quantity' ? 'right' : 'left'}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.transaction_id} hover>
                    <TableCell>
                      {new Date(tx.transaction_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          tx.transaction_type.charAt(0).toUpperCase() +
                          tx.transaction_type.slice(1)
                        }
                        color={TX_COLOR[tx.transaction_type] ?? 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: ['expired', 'disposed', 'used'].includes(tx.transaction_type)
                            ? 'error.main'
                            : 'success.main',
                        }}
                      >
                        {['expired', 'disposed', 'used'].includes(tx.transaction_type) ? '−' : '+'}
                        {tx.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell>{tx.staff?.name ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap title={tx.remarks ?? ''}>
                        {tx.remarks || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
