import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, CircularProgress, Paper, Typography,
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import api from '../../../../services/api';
import type { InventoryItem } from '../../types';
import { formatDate } from '../../../../shared/utils';
import { DEMO_TRANSACTIONS_MAP, type DemoTransaction } from '../../data/inventoryDemoData';

// ─── Types ────────────────────────────────────────────────────

interface Transaction {
  transaction_id: number;
  transaction_type: string;
  quantity: number;
  transaction_date: string;
  remarks: string | null;
  staff?: { name: string };
}

function mapTx(tx: Transaction) {
  const t = tx.transaction_type;
  return {
    received:     t === 'received' ? tx.quantity : 0,
    receivedFrom: t === 'received' ? (tx.remarks ?? tx.staff?.name ?? 'Central Supply') : '',
    dispensed:    t === 'used' || t === 'adjusted' ? tx.quantity : 0,
    transferred:  t === 'transferred' || t === 'disposed' ? tx.quantity : 0,
    expired:      t === 'expired' ? tx.quantity : 0,
  };
}

// ─── Single Stock Card Table Component ────────────────────────

function SingleStockCardTable({ item, isDemo = false }: { item: InventoryItem; isDemo?: boolean }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* 
     * BACKEND TRANSACTIONS API CALL COMMENTED OUT TO USE SAMPLE DATA DIRECTLY
     *
    api.get(`/inventory/${item.inventory_id}/transactions`)
      .then(r => setTransactions(r.data.transactions ?? []))
      .catch(() => setTransactions(DEMO_TRANSACTIONS_MAP[item.inventory_id] ?? []));
    */
    setLoading(true);
    setTransactions(DEMO_TRANSACTIONS_MAP[item.inventory_id] ?? []);
    setLoading(false);
  }, [item.inventory_id]);

  const createdDate = item.created_at ? new Date(item.created_at) : new Date();
  const monthYear = createdDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build 1..31 day rows with running balance
  const daysInMonth = 31;
  const dayRows: Array<{
    dayNum: number;
    qtyReceived: number;
    receivedFrom: string;
    dispensed: number;
    transferred: number;
    expired: number;
    balance: number | null;
  }> = [];

  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );

  const txByDay: Record<number, Transaction[]> = {};
  sortedTx.forEach(tx => {
    const d = new Date(tx.transaction_date);
    const dayNum = d.getDate();
    if (!txByDay[dayNum]) txByDay[dayNum] = [];
    txByDay[dayNum].push(tx);
  });

  let runningBalance = 0;
  let hasStarted = false;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayTxs = txByDay[d] || [];
    let dayReceived = 0;
    let dayFrom = '';
    let dayDispensed = 0;
    let dayTransferred = 0;
    let dayExpired = 0;

    if (dayTxs.length > 0) {
      hasStarted = true;
      dayTxs.forEach(tx => {
        const m = mapTx(tx);
        dayReceived += m.received;
        if (m.receivedFrom) dayFrom = dayFrom ? `${dayFrom}, ${m.receivedFrom}` : m.receivedFrom;
        dayDispensed += m.dispensed;
        dayTransferred += m.transferred;
        dayExpired += m.expired;
      });

      runningBalance = runningBalance + dayReceived - (dayDispensed + dayTransferred + dayExpired);
      dayRows.push({
        dayNum: d,
        qtyReceived: dayReceived,
        receivedFrom: dayFrom,
        dispensed: dayDispensed,
        transferred: dayTransferred,
        expired: dayExpired,
        balance: runningBalance,
      });
    } else {
      dayRows.push({
        dayNum: d,
        qtyReceived: 0,
        receivedFrom: '',
        dispensed: 0,
        transferred: 0,
        expired: 0,
        balance: hasStarted ? runningBalance : null,
      });
    }
  }

  const handlePrint = () => {
    const content = cardRef.current?.innerHTML;
    if (!content) return;

    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>STOCK CARD - ${item.vaccine_type} (${item.batch_number})</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 0; font-size: 11pt; }
            .no-print { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 4px 6px; font-size: 9pt; text-align: center; }
            th { font-weight: bold; background-color: #f2f2f2; text-transform: uppercase; }
            .header-title { text-align: center; margin-bottom: 12px; }
            .header-title h4 { margin: 0; font-size: 9.5pt; font-weight: normal; text-transform: uppercase; }
            .header-title h3 { margin: 2px 0; font-size: 11pt; font-weight: bold; }
            .header-title h2 { margin: 10px 0 6px; font-size: 16pt; font-weight: bold; letter-spacing: 2px; text-decoration: underline; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 300);
  };

  const borderCol = '#cbd5e1';
  const thStyle: React.CSSProperties = {
    border: `1px solid ${borderCol}`,
    padding: '8px 6px',
    fontSize: '12px',
    fontWeight: 700,
    textAlign: 'center',
    background: '#f8fafc',
    color: '#0f172a',
  };
  const tdStyle: React.CSSProperties = {
    border: `1px solid ${borderCol}`,
    padding: '5px 8px',
    fontSize: '13px',
    textAlign: 'center',
    color: '#1e293b',
    height: '28px',
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        mb: 4,
        p: 3,
        bgcolor: '#ffffff',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }} className="no-print">
        <Button
          variant="outlined"
          size="small"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{
            borderColor: '#10b981',
            color: '#059669',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' },
          }}
        >
          Print Stock Card
        </Button>
      </Box>

      <div ref={cardRef}>
        {/* Header Title */}
        <Box sx={{ textAlign: 'center', mb: 2.5 }}>
          <Typography sx={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
            Republic of the Philippines &bull; PROVINCE OF MISAMIS ORIENTAL &bull; Municipality of Tagoloan
          </Typography>
          <Typography sx={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mt: 0.5 }}>
            MUNICIPAL HEALTH OFFICE
          </Typography>
          <Typography sx={{ fontSize: '11px', color: '#64748b', mb: 1 }}>
            Tel. No. : (088) 590-4775
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '20px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#0f172a',
              textDecoration: 'underline',
            }}
          >
            STOCK CARD
          </Typography>
        </Box>

        {/* Metadata Fields */}
        <Box sx={{ borderBottom: '2px solid #0f172a', pb: 2, mb: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 0.8fr' }, gap: 2, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#334155', mr: 1, whiteSpace: 'nowrap' }}>
                Name of vaccine/medicine:
              </Typography>
              <Box sx={{ flex: 1, borderBottom: '1px solid #334155', pb: 0.25, pl: 1 }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                  {item.vaccine_type}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#334155', mr: 1, whiteSpace: 'nowrap' }}>
                Month &amp; Year:
              </Typography>
              <Box sx={{ flex: 1, borderBottom: '1px solid #334155', pb: 0.25, pl: 1 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {monthYear}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 0.8fr' }, gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#334155', mr: 1, whiteSpace: 'nowrap' }}>
                Lot number:
              </Typography>
              <Box sx={{ flex: 1, borderBottom: '1px solid #334155', pb: 0.25, pl: 1 }}>
                <Typography sx={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                  {item.batch_number}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#334155', mr: 1, whiteSpace: 'nowrap' }}>
                Expiry Date:
              </Typography>
              <Box sx={{ flex: 1, borderBottom: '1px solid #334155', pb: 0.25, pl: 1 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {formatDate(item.expiration_date)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Data Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={30} sx={{ color: '#10b981' }} />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '60px' }} rowSpan={2}>
                    DATE
                  </th>
                  <th style={{ ...thStyle, borderLeft: `2px solid ${borderCol}` }} colSpan={2}>
                    DELIVERY
                  </th>
                  <th style={{ ...thStyle, borderLeft: `2px solid ${borderCol}` }} colSpan={3}>
                    OUT FROM FACILITY
                  </th>
                  <th style={{ ...thStyle, borderLeft: `2px solid ${borderCol}`, width: '100px' }} rowSpan={2}>
                    BALANCE
                  </th>
                </tr>
                <tr>
                  <th style={{ ...thStyle, borderLeft: `2px solid ${borderCol}`, width: '120px' }}>
                    Quantity received
                  </th>
                  <th style={{ ...thStyle, minWidth: '180px' }}>
                    Received from
                  </th>
                  <th style={{ ...thStyle, borderLeft: `2px solid ${borderCol}`, width: '90px' }}>
                    Dispensed
                  </th>
                  <th style={{ ...thStyle, width: '90px' }}>
                    Transferred
                  </th>
                  <th style={{ ...thStyle, width: '90px' }}>
                    Expired
                  </th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map(row => {
                  const hasActivity = row.qtyReceived > 0 || row.dispensed > 0 || row.transferred > 0 || row.expired > 0;
                  return (
                    <tr key={row.dayNum} style={{ background: hasActivity ? '#f0fdf4' : '#ffffff' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#475569' }}>
                        {row.dayNum}
                      </td>
                      <td style={{ ...tdStyle, borderLeft: `2px solid ${borderCol}`, color: row.qtyReceived ? '#047857' : 'inherit', fontWeight: row.qtyReceived ? 700 : 400 }}>
                        {row.qtyReceived || ''}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'left', fontSize: '12px' }}>
                        {row.receivedFrom}
                      </td>
                      <td style={{ ...tdStyle, borderLeft: `2px solid ${borderCol}`, color: row.dispensed ? '#b91c1c' : 'inherit', fontWeight: row.dispensed ? 600 : 400 }}>
                        {row.dispensed || ''}
                      </td>
                      <td style={{ ...tdStyle, color: row.transferred ? '#d97706' : 'inherit', fontWeight: row.transferred ? 600 : 400 }}>
                        {row.transferred || ''}
                      </td>
                      <td style={{ ...tdStyle, color: row.expired ? '#dc2626' : 'inherit', fontWeight: row.expired ? 600 : 400 }}>
                        {row.expired || ''}
                      </td>
                      <td style={{ ...tdStyle, borderLeft: `2px solid ${borderCol}`, fontWeight: 700, color: row.balance !== null && row.balance <= 10 ? '#d97706' : '#047857' }}>
                        {row.balance !== null ? row.balance : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            Municipal Health Office &bull; Tagoloan, Misamis Oriental
          </Typography>
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: item.current_quantity <= 10 ? '#d97706' : '#047857' }}>
            Current Balance: {item.current_quantity} vials
          </Typography>
        </Box>
      </div>
    </Paper>
  );
}

// ─── Main Export ──────────────────────────────────────────────

interface StockCardViewProps {
  items: InventoryItem[];
  loading: boolean;
  isDemo?: boolean;
}

export default function StockCardView({ items, loading, isDemo = false }: StockCardViewProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#10b981' }} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 10, color: '#9ca3af', fontSize: 14 }}>
        No inventory records found. Click "Add Stock" or enable "Demo Mode" to view stock card table data.
      </Box>
    );
  }

  return (
    <Box>
      {items.map(item => (
        <SingleStockCardTable key={item.inventory_id} item={item} isDemo={isDemo} />
      ))}
    </Box>
  );
}
