import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, CircularProgress, Paper, Typography, Menu, MenuItem, Stack, Chip, Tooltip,
} from '@mui/material';
import {
  Print as PrintIcon,
  InsertDriveFile as FileIcon,
  CalendarMonth as CalendarIcon,
  KeyboardArrowDown as ArrowDownIcon,
  FolderOpen as FolderOpenIcon,
  LocalHospital as ClinicIcon,
} from '@mui/icons-material';
import type { InventoryItem } from '../../types';
import { formatDate } from '../../../../shared/utils';
import { DEMO_TRANSACTIONS_MAP, DEMO_CLINICS } from '../../data/inventoryDemoData';
import StockCardFileManager from './StockCardFileManager';

// ─── Constants ────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

export function SingleStockCardTable({ item, isDemo = false }: { item: InventoryItem; isDemo?: boolean }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default to July (index 6)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const clinic = DEMO_CLINICS.find(c => c.clinic_id === item.clinic_id) || DEMO_CLINICS[0];

  useEffect(() => {
    setLoading(true);
    setTransactions(DEMO_TRANSACTIONS_MAP[item.inventory_id] ?? []);
    setLoading(false);
  }, [item.inventory_id]);

  const monthName = MONTH_NAMES[selectedMonth];
  const monthYear = `${monthName} ${selectedYear}`;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Filter or generate transactions for the selected month
  const activeTxList = (transactions.length > 0 ? transactions : DEMO_TRANSACTIONS_MAP[item.inventory_id] ?? []);

  let monthlyTx = activeTxList.filter(tx => {
    const d = new Date(tx.transaction_date);
    return d.getMonth() === selectedMonth;
  });

  if (isDemo && monthlyTx.length === 0) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const mStr = pad(selectedMonth + 1);
    monthlyTx = [
      {
        transaction_id: item.inventory_id * 1000 + selectedMonth * 10 + 1,
        transaction_type: 'received',
        quantity: 50 + ((selectedMonth * 7) % 30),
        transaction_date: `${selectedYear}-${mStr}-02T08:30:00Z`,
        remarks: 'Central Supply Delivery',
        staff: { name: 'Admin Staff' },
      },
      {
        transaction_id: item.inventory_id * 1000 + selectedMonth * 10 + 2,
        transaction_type: 'used',
        quantity: 5 + (selectedMonth % 4),
        transaction_date: `${selectedYear}-${mStr}-09T10:15:00Z`,
        remarks: 'Routine Vaccination',
      },
      {
        transaction_id: item.inventory_id * 1000 + selectedMonth * 10 + 3,
        transaction_type: 'used',
        quantity: 8 + (selectedMonth % 3),
        transaction_date: `${selectedYear}-${mStr}-17T14:00:00Z`,
        remarks: 'Outbreak Response',
      },
      {
        transaction_id: item.inventory_id * 1000 + selectedMonth * 10 + 4,
        transaction_type: 'used',
        quantity: 6,
        transaction_date: `${selectedYear}-${mStr}-24T11:45:00Z`,
        remarks: 'Clinic Dispensation',
      },
    ];
  }

  // Build day rows for daysInMonth with running balance
  const dayRows: Array<{
    dayNum: number;
    qtyReceived: number;
    receivedFrom: string;
    dispensed: number;
    transferred: number;
    expired: number;
    balance: number | null;
  }> = [];

  const sortedTx = [...monthlyTx].sort(
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
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const printDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const printTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const trackingCode = `ABTC-SC-${clinic.clinic_id}-${item.batch_number.replace(/[^a-zA-Z0-9]/g, '')}-${selectedYear}${pad(selectedMonth + 1)}`;

    const printWin = window.open('', '_blank', 'width=1000,height=850');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OFFICIAL STOCK CARD - ${item.vaccine_type} (${item.batch_number}) - ${monthYear}</title>
          <style>
            /* Universal Multi-Paper Size & Orientation Responsive Print Styles */
            @page {
              size: auto; /* Automatically adapts to Letter, A4, Legal, Executive, A5, Folio, Portrait & Landscape */
              margin: 6mm 8mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              width: 100%;
              height: 100%;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
              font-size: 8.5pt;
              line-height: 1.25;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-page-wrapper {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header-title { text-align: center; margin-bottom: 8px; }
            .header-title .republic { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #222; }
            .header-title .office { font-size: 12pt; font-weight: 800; text-transform: uppercase; margin: 2px 0; color: #000; }
            .header-title .contact { font-size: 8pt; color: #333; }
            .header-title .doc-name {
              font-size: 15pt;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #000;
              margin-top: 4px;
              text-decoration: underline;
            }
            .meta-box {
              border: 1.2px solid #000;
              padding: 6px 10px;
              margin-bottom: 8px;
              background: #fafafa !important;
            }
            .meta-row { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 3px; }
            .meta-row:last-child { margin-bottom: 0; }
            .meta-cell { font-size: 8.5pt; flex: 1; min-width: 45%; }
            .meta-label { font-weight: bold; color: #111; }
            .meta-val { font-weight: bold; color: #000; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 2px;
              page-break-inside: auto;
            }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th, td {
              border: 1px solid #000;
              padding: 2px 4px;
              font-size: 8pt;
              text-align: center;
            }
            th {
              font-weight: bold;
              background-color: #f1f5f9 !important;
              text-transform: uppercase;
              font-size: 7.5pt;
            }
            tr.activity-row { background-color: #f0fdf4 !important; }
            tr.activity-row td { font-weight: 600; }
            
            .sig-container {
              margin-top: 14px;
              display: flex;
              justify-content: space-between;
              font-size: 8.5pt;
              page-break-inside: avoid;
            }
            .sig-box { width: 42%; text-align: center; }
            .sig-line { border-top: 1px solid #000; margin-top: 24px; padding-top: 3px; font-weight: bold; }
            
            .footer-info {
              margin-top: 10px;
              padding-top: 4px;
              border-top: 1px solid #555;
              display: flex;
              justify-content: space-between;
              font-size: 7pt;
              color: #333;
              page-break-inside: avoid;
            }

            /* Responsive Scaling for Small Paper Sizes (e.g. A5, Half-Letter) */
            @media print and (max-height: 210mm) {
              th, td { padding: 1px 3px; font-size: 7.5pt; }
              .header-title .office { font-size: 10.5pt; }
              .header-title .doc-name { font-size: 13pt; margin-top: 2px; }
              .sig-line { margin-top: 16px; }
              .meta-box { padding: 4px 8px; margin-bottom: 6px; }
            }
          </style>
        </head>
        <body>
          <div class="print-page-wrapper">
            <div>
              <!-- Official Letterhead -->
              <div class="header-title">
                <div class="republic">Republic of the Philippines &bull; ${clinic.province} &bull; ${clinic.municipality}</div>
                <div class="office">${clinic.office_name}</div>
                <div class="contact">Tel. No. : ${clinic.phone} &bull; ${clinic.address}</div>
                <div class="doc-name">STOCK CARD</div>
              </div>

              <!-- Formal Metadata Block -->
              <div class="meta-box">
                <div class="meta-row">
                  <div class="meta-cell"><span class="meta-label">Name of vaccine/medicine:</span> <span class="meta-val" style="color: #059669">${item.vaccine_type}</span></div>
                  <div class="meta-cell"><span class="meta-label">Month & Year:</span> <span class="meta-val">${monthYear}</span></div>
                </div>
                <div class="meta-row">
                  <div class="meta-cell"><span class="meta-label">Lot / Batch Number:</span> <span class="meta-val" style="font-family: monospace">${item.batch_number}</span></div>
                  <div class="meta-cell"><span class="meta-label">Expiry Date:</span> <span class="meta-val">${formatDate(item.expiration_date)}</span></div>
                </div>
                <div class="meta-row">
                  <div class="meta-cell"><span class="meta-label">Facility Clinic:</span> <span class="meta-val">${clinic.name}</span></div>
                  <div class="meta-cell"><span class="meta-label">Storage Spec:</span> <span class="meta-val">2°C to 8°C Cold Chain</span></div>
                </div>
              </div>

              <!-- 31-Day Stock Card Table -->
              <table>
                <thead>
                  <tr>
                    <th rowSpan="2" style="width: 45px">DATE</th>
                    <th colSpan="2" style="border-left: 2px solid #000">DELIVERY</th>
                    <th colSpan="3" style="border-left: 2px solid #000">OUT FROM FACILITY</th>
                    <th rowSpan="2" style="border-left: 2px solid #000; width: 75px">BALANCE</th>
                  </tr>
                  <tr>
                    <th style="border-left: 2px solid #000; width: 100px">Qty Received</th>
                    <th>Received From</th>
                    <th style="border-left: 2px solid #000; width: 75px">Dispensed</th>
                    <th style="width: 75px">Transferred</th>
                    <th style="width: 75px">Expired</th>
                  </tr>
                </thead>
                <tbody>
                  ${dayRows.map(r => `
                    <tr class="${r.qtyReceived || r.dispensed || r.transferred || r.expired ? 'activity-row' : ''}">
                      <td style="font-weight: bold">${r.dayNum}</td>
                      <td style="border-left: 2px solid #000; color: ${r.qtyReceived ? '#047857' : 'inherit'}">${r.qtyReceived || ''}</td>
                      <td style="text-align: left; font-size: 8pt">${r.receivedFrom}</td>
                      <td style="border-left: 2px solid #000; color: ${r.dispensed ? '#b91c1c' : 'inherit'}">${r.dispensed || ''}</td>
                      <td style="color: ${r.transferred ? '#d97706' : 'inherit'}">${r.transferred || ''}</td>
                      <td style="color: ${r.expired ? '#dc2626' : 'inherit'}">${r.expired || ''}</td>
                      <td style="border-left: 2px solid #000; font-weight: bold; color: ${r.balance !== null && r.balance <= 10 ? '#d97706' : '#047857'}">
                        ${r.balance !== null ? r.balance : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="margin-top: 6px; font-size: 8.5pt; font-weight: bold; text-align: right; color: #047857">
                Current Ending Balance: ${item.current_quantity} vials (≈ ${item.current_quantity * 3} coverable doses)
              </div>
            </div>

            <div>
              <!-- Official Signatures -->
              <div class="sig-container">
                <div class="sig-box">
                  <div class="sig-line">Prepared & Issued By:</div>
                  <div style="font-size: 7.5pt; color: #555; margin-top: 2px">Inventory Nurse / Pharmacist In-Charge</div>
                </div>
                <div class="sig-box">
                  <div class="sig-line">Approved & Verified By:</div>
                  <div style="font-size: 7.5pt; color: #555; margin-top: 2px">Municipal Health Officer / MHO Head</div>
                </div>
              </div>

              <!-- Footer Verification -->
              <div class="footer-info">
                <span>Official Form MHO-SC-2026 &bull; ${clinic.name}</span>
                <span>Tracking Code: ${trackingCode}</span>
                <span>Printed on: ${printDate} ${printTime}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 350);
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
      {/* ── Top Toolbar with File Manager, Month Menu & Print Button ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }} className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<CalendarIcon sx={{ fontSize: 16 }} />}
            label={`Month: ${monthYear}`}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, borderColor: '#10b981', color: '#047857', bgcolor: '#f0fdf4' }}
          />
          <Chip
            icon={<ClinicIcon sx={{ fontSize: 14 }} />}
            label={clinic.name}
            size="small"
            sx={{ fontWeight: 600, bgcolor: '#f1f5f9', color: '#334155' }}
          />
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {/* File Manager Button */}
          <Tooltip title="Open Stock Card File Manager">
            <Button
              variant="contained"
              size="small"
              startIcon={<FolderOpenIcon />}
              onClick={() => setFileManagerOpen(true)}
              sx={{
                bgcolor: '#059669',
                color: '#ffffff',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                '&:hover': { bgcolor: '#047857' },
              }}
            >
              File Manager
            </Button>
          </Tooltip>

          {/* Quick Month Dropdown Button */}
          <Tooltip title="Select month of the year">
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileIcon sx={{ color: '#059669' }} />}
              endIcon={<ArrowDownIcon sx={{ fontSize: 18 }} />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                borderColor: '#10b981',
                color: '#059669',
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: '#ecfdf5',
                '&:hover': { borderColor: '#059669', bgcolor: '#d1fae5' },
              }}
            >
              Monthly Files
            </Button>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              paper: {
                elevation: 4,
                sx: {
                  maxHeight: 380,
                  width: 250,
                  borderRadius: 2,
                  mt: 1,
                  border: '1px solid #e2e8f0',
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                Stock Card Files ({selectedYear})
              </Typography>
            </Box>
            {MONTH_NAMES.map((mName, idx) => {
              const isSelected = selectedMonth === idx;
              return (
                <MenuItem
                  key={mName}
                  selected={isSelected}
                  onClick={() => {
                    setSelectedMonth(idx);
                    setAnchorEl(null);
                  }}
                  sx={{
                    py: 0.85,
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: isSelected ? '#ecfdf5 !important' : 'transparent',
                    '&:hover': { bgcolor: isSelected ? '#d1fae5 !important' : '#f8fafc' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <FileIcon sx={{ fontSize: 18, color: isSelected ? '#059669' : '#94a3b8' }} />
                    <Typography sx={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#047857' : '#334155' }}>
                      {mName} {selectedYear}
                    </Typography>
                  </Box>
                  {isSelected && (
                    <Chip label="Active" size="small" sx={{ height: 18, fontSize: 9, bgcolor: '#10b981', color: '#fff', fontWeight: 700 }} />
                  )}
                </MenuItem>
              );
            })}
          </Menu>

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
        </Stack>
      </Box>

      {/* Stock Card File Manager Dialog */}
      <StockCardFileManager
        open={fileManagerOpen}
        onClose={() => setFileManagerOpen(false)}
        item={item}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onSelectMonthYear={(mIndex, y) => {
          setSelectedMonth(mIndex);
          setSelectedYear(y);
        }}
        onPrintMonth={(mIndex, y) => {
          setSelectedMonth(mIndex);
          setSelectedYear(y);
          setTimeout(() => handlePrint(), 200);
        }}
      />

      <div ref={cardRef}>
        {/* Dynamic Clinic Header Title with Official Logos */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, pb: 2, borderBottom: '2px solid #0f172a' }}>
          {/* Left Tagoloan Seal Flag Logo */}
          <Box sx={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/assets/Flag_of_Tagoloan,_Misamis_Oriental.png" alt="Tagoloan Municipal Seal Flag" style={{ width: 90, height: 90, objectFit: 'contain' }} />
          </Box>

          {/* Center Text */}
          <Box sx={{ textAlign: 'center', px: 1 }}>
            <Typography sx={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px' }}>
              Republic of the Philippines &bull; {clinic.province} &bull; {clinic.municipality}
            </Typography>
            <Typography sx={{ fontSize: '14.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mt: 0.25 }}>
              {clinic.office_name}
            </Typography>
            <Typography sx={{ fontSize: '10.5px', color: '#64748b' }}>
              Tel. No. : {clinic.phone} &bull; {clinic.address}
            </Typography>
          </Box>

          {/* Right RHU Health Office Logo */}
          <Box sx={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/assets/rhu-logo.png" alt="RHU Health Office Seal" style={{ width: 90, height: 90, objectFit: 'contain' }} />
          </Box>
        </Box>

        {/* Title */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '19px',
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
              <Box sx={{ flex: 1, borderBottom: '1px solid #334155', pb: 0.25, pl: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                  {item.batch_number}
                </Typography>
                {item.status === 'active' && item.current_quantity > 0 && (
                  <Chip
                    label="🟢 FIFO: Use First"
                    size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
                  />
                )}
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
                {/* Ending Balance Row matching official paper document */}
                <tr style={{ background: '#f1f5f9', borderTop: `2px solid ${borderCol}` }}>
                  <td style={{ ...tdStyle, fontWeight: 800, fontSize: '11px' }}>
                    Ending Balance
                  </td>
                  <td style={{ ...tdStyle, borderLeft: `2px solid ${borderCol}`, fontWeight: 700, color: '#047857' }}>
                    +{dayRows.reduce((sum, r) => sum + r.qtyReceived, 0)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontSize: '11px', fontStyle: 'italic', color: '#64748b' }}>
                    Monthly Ending Stock Balance Summary
                  </td>
                  <td style={{ ...tdStyle, borderLeft: `2px solid ${borderCol}`, fontWeight: 700, color: '#b91c1c' }}>
                    {dayRows.reduce((sum, r) => sum + r.dispensed, 0)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#d97706' }}>
                    {dayRows.reduce((sum, r) => sum + r.transferred, 0)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#dc2626' }}>
                    {dayRows.reduce((sum, r) => sum + r.expired, 0)}
                  </td>
                  <td style={{ ...tdStyle, borderLeft: `2px solid ${borderCol}`, fontWeight: 800, color: '#047857', background: '#dcfce7' }}>
                    {runningBalance}
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
            {clinic.office_name} &bull; {clinic.address}
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

export default function StockCardView({ items, loading, isDemo: _isDemo = false }: StockCardViewProps) {
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
        No inventory records found for the selected clinic. Select another clinic or click "Add Stock" to add inventory.
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <StockCardFileManager
        isModal={false}
        item={items[0]}
        items={items}
        selectedMonth={6}
        selectedYear={2026}
      />
    </Box>
  );
}


