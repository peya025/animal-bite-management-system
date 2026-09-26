import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Vaccines as VaccineIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  TrendingDown as DispensedIcon,
  TrendingUp as ReceivedIcon,
  CalendarMonth as CalendarIcon,
  Description as DescriptionIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import type { InventoryItem } from '../../types';
import { formatDate } from '../../../../shared/utils';
import api from '../../../../services/api';
import { useAuth } from '../../../../shared/contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Types ────────────────────────────────────────────────────

interface Transaction {
  transaction_id: number;
  inventory_id: number;
  transaction_type: 'received' | 'used' | 'adjusted' | 'expired' | 'disposed';
  quantity: number;
  quantity_received?: number;
  received_from?: string | null;
  dispensed?: number;
  transferred?: number;
  expired?: number;
  balanced?: number;
  transaction_date: string;
  remarks?: string | null;
  staff?: { name: string };
}

interface MonthlySummary {
  year: number;
  monthIndex: number;
  monthName: string;
  monthYear: string;
  openingBalance: number;
  hasTrustworthyOpening: boolean;
  received: number;
  dispensed: number;
  transferred: number;
  expired: number;
  disposed: number;
  adjustments: number;
  closingBalance: number;
  activityCount: number;
  daysInMonth: number;
}

interface DayRow {
  dayNum: number;
  qtyReceived: number;
  receivedFrom: string;
  dispensed: number;
  transferred: number;
  expired: number;
  disposed: number;
  adjustments: number;
  balance: number | null;
}

// ─── Date Parsing & Helpers ───────────────────────────────────

function parseTxDate(dateStr: string): { year: number; month: number; day: number; dateObj: Date } {
  if (!dateStr) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), dateObj: d };
  }

  // Extract YYYY-MM-DD directly from the string to prevent timezone offset shifts
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    const d = new Date(dateStr.replace(' ', 'T'));
    return { year, month, day, dateObj: d };
  }

  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), dateObj: d };
}

function classifyTx(tx: Transaction) {
  const t = tx.transaction_type;
  const qty = Number(tx.quantity) || 0;
  const rec = Number(tx.quantity_received) || (t === 'received' ? qty : 0);
  const disp = Number(tx.dispensed) || (t === 'used' ? qty : 0);
  const trans = Number(tx.transferred) || 0;
  const exp = Number(tx.expired) || (t === 'expired' ? qty : 0);
  const disposed = t === 'disposed' ? qty : 0;
  const isAdjustAdd = t === 'adjusted' && qty > 0;
  const adjustments = isAdjustAdd ? qty : 0;

  const netChange = rec + adjustments - disp - trans - exp - disposed;

  let from = '';
  if (rec > 0) {
    from = tx.received_from || tx.remarks || tx.staff?.name || 'Central Supply';
  }

  return {
    received: rec,
    receivedFrom: from,
    dispensed: disp,
    transferred: trans,
    expired: exp,
    disposed,
    adjustments,
    netChange,
  };
}

// ─── Printable HTML Document Generator ─────────────────────────

function buildPrintableStockCardHtml(
  item: InventoryItem,
  clinic: {
    clinic_id: number;
    name: string;
    office_name: string;
    province: string;
    municipality: string;
    phone: string;
    address: string;
    left_logo: string | null;
    right_logo: string | null;
  },
  staffName: string,
  summary: MonthlySummary,
  dayRows: DayRow[]
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const printDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const trackingCode = `ABTC-SC-${clinic.clinic_id}-${item.batch_number.replace(/[^a-zA-Z0-9]/g, '')}-${summary.year}${pad(summary.monthIndex + 1)}`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>OFFICIAL STOCK CARD - ${item.vaccine_type} (${item.batch_number}) - ${summary.monthYear}</title>
    <style>
      @page {
        size: auto;
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
        <div class="header-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          ${clinic.left_logo ? `<img src="${clinic.left_logo}" alt="Left Seal" style="width: 65px; height: 65px; object-fit: contain;" />` : `<div style="width: 65px; height: 65px; flex-shrink: 0;"></div>`}
          <div style="text-align: center; flex: 1; padding: 0 10px;">
            <div class="republic">Republic of the Philippines &bull; ${clinic.province} &bull; ${clinic.municipality}</div>
            <div class="office">${clinic.office_name}</div>
            <div class="contact">Tel. No. : ${clinic.phone} &bull; ${clinic.address}</div>
            <div class="doc-name">STOCK CARD</div>
          </div>
          ${clinic.right_logo ? `<img src="${clinic.right_logo}" alt="Right Seal" style="width: 65px; height: 65px; object-fit: contain;" />` : `<div style="width: 65px; height: 65px; flex-shrink: 0;"></div>`}
        </div>

        <!-- Metadata Block -->
        <div class="meta-box">
          <div class="meta-row">
            <div class="meta-cell"><span class="meta-label">Name of vaccine/medicine:</span> <span class="meta-val" style="color: #059669">${item.vaccine_type}</span></div>
            <div class="meta-cell"><span class="meta-label">Month & Year:</span> <span class="meta-val">${summary.monthYear}</span></div>
          </div>
          <div class="meta-row">
            <div class="meta-cell"><span class="meta-label">Lot / Batch Number:</span> <span class="meta-val" style="font-family: monospace">${item.batch_number}</span></div>
            <div class="meta-cell"><span class="meta-label">Expiry Date:</span> <span class="meta-val">${formatDate(item.expiration_date)}</span></div>
          </div>
          <div class="meta-row">
            <div class="meta-cell"><span class="meta-label">Facility Clinic:</span> <span class="meta-val">${clinic.name}</span></div>
            <div class="meta-cell"><span class="meta-label">Storage Spec:</span> <span class="meta-val">${item.cold_chain_notes || '2°C to 8°C Cold Chain'}</span></div>
          </div>
        </div>

        <!-- Official Stock Card Table -->
        <table>
          <thead>
            <tr>
              <th rowSpan="2" style="width: 45px">DATE</th>
              <th colSpan="2" style="border-left: 2px solid #000">DELIVERY</th>
              <th colSpan="3" style="border-left: 2px solid #000">OUT FROM FACILITY</th>
              <th rowSpan="2" style="border-left: 2px solid #000; width: 75px">BALANCE</th>
            </tr>
            <tr>
              <th style="border-left: 2px solid #000; width: 90px">Qty Received</th>
              <th>Received From</th>
              <th style="border-left: 2px solid #000; width: 70px">Dispensed</th>
              <th style="width: 70px">Transferred</th>
              <th style="width: 70px">Expired</th>
            </tr>
          </thead>
          <tbody>
            ${dayRows.map(r => `
              <tr class="${r.qtyReceived || r.dispensed || r.transferred || r.expired || r.disposed || r.adjustments ? 'activity-row' : ''}">
                <td style="font-weight: bold">${r.dayNum}</td>
                <td style="border-left: 2px solid #000; color: ${r.qtyReceived ? '#047857' : 'inherit'}">${r.qtyReceived ? `+${r.qtyReceived}` : ''}</td>
                <td style="text-align: left; font-size: 8pt">${r.receivedFrom}</td>
                <td style="border-left: 2px solid #000; color: ${r.dispensed ? '#b91c1c' : 'inherit'}">${r.dispensed || ''}</td>
                <td style="color: ${r.transferred ? '#d97706' : 'inherit'}">${r.transferred || ''}</td>
                <td style="color: ${r.expired ? '#dc2626' : 'inherit'}">${r.expired || ''}</td>
                <td style="border-left: 2px solid #000; font-weight: bold; color: ${r.balance !== null && r.balance <= 10 ? '#d97706' : '#047857'}">
                  ${r.balance !== null ? r.balance : ''}
                </td>
              </tr>
            `).join('')}
            <!-- Ending Balance Row -->
            <tr style="background: #f1f5f9; border-top: 2px solid #000; font-weight: bold;">
              <td>Total</td>
              <td style="border-left: 2px solid #000; color: #047857">+${summary.received}</td>
              <td style="text-align: left; font-size: 7.5pt; font-style: italic; color: #475569">Monthly Closing Summary</td>
              <td style="border-left: 2px solid #000; color: #b91c1c">${summary.dispensed}</td>
              <td style="color: #d97706">${summary.transferred}</td>
              <td style="color: #dc2626">${summary.expired}</td>
              <td style="border-left: 2px solid #000; font-size: 9pt; background: #dcfce7; color: #047857">${summary.closingBalance}</td>
            </tr>
          </tbody>
        </table>

        <!-- Signatures Block -->
        <div class="sig-container">
          <div class="sig-box">
            <div>Prepared & Logged by:</div>
            <div class="sig-line">${staffName}</div>
            <div style="font-size: 7pt; color: #555;">Inventory Officer / Clinic Staff</div>
          </div>
          <div class="sig-box">
            <div>Verified & Approved by:</div>
            <div class="sig-line">Clinic Physician / Medical Officer</div>
            <div style="font-size: 7pt; color: #555;">Designated Facility In-Charge</div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="footer-info">
        <div>Doc Ref: ${trackingCode}</div>
        <div>Printed on: ${printDate} at ${printTime}</div>
        <div>ABTC Clinical Inventory Management System</div>
      </div>
    </div>
  </body>
</html>`;
}

// ─── Main StockCardView Component ─────────────────────────────

interface StockCardViewProps {
  items: InventoryItem[];
  loading: boolean;
  initialItemId?: number | null;
}

export default function StockCardView({ items, loading, initialItemId }: StockCardViewProps) {
  const { user, clinic: authClinic } = useAuth();

  // 1. Vaccine & Batch Selection
  const vaccineOptions = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.vaccine_type))).sort();
  }, [items]);

  const initialItem = useMemo(() => {
    if (initialItemId) {
      const found = items.find((i) => i.inventory_id === initialItemId);
      if (found) return found;
    }
    return items[0] || null;
  }, [items, initialItemId]);

  const [selectedVaccine, setSelectedVaccine] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (initialItem) {
      setSelectedVaccine(initialItem.vaccine_type);
      setSelectedBatchId(initialItem.inventory_id);
    } else if (vaccineOptions.length > 0) {
      setSelectedVaccine(vaccineOptions[0]);
    }
  }, [initialItem, vaccineOptions]);

  // Filter batches matching currently selected vaccine
  const batchOptions = useMemo(() => {
    if (!selectedVaccine) return [];
    return items.filter((i) => i.vaccine_type === selectedVaccine);
  }, [items, selectedVaccine]);

  // Keep selectedBatchId valid when selectedVaccine changes
  useEffect(() => {
    if (batchOptions.length > 0) {
      const exists = batchOptions.some((b) => b.inventory_id === selectedBatchId);
      if (!exists) {
        setSelectedBatchId(batchOptions[0].inventory_id);
      }
    } else {
      setSelectedBatchId('');
    }
  }, [batchOptions, selectedBatchId]);

  const currentBatch = useMemo(() => {
    return items.find((i) => i.inventory_id === selectedBatchId) || null;
  }, [items, selectedBatchId]);

  // 2. Fetch Transactions for the Selected Batch
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBatchId) {
      setTransactions([]);
      return;
    }

    let active = true;
    setTxLoading(true);
    setTxError(null);

    api.get(`/inventory/${selectedBatchId}/transactions`)
      .then((res) => {
        if (!active) return;
        const txList: Transaction[] = res.data?.transactions || [];
        setTransactions(Array.isArray(txList) ? txList : []);
      })
      .catch((err) => {
        if (!active) return;
        setTransactions([]);
        setTxError(err.response?.data?.message || 'Could not load batch transaction history.');
      })
      .finally(() => {
        if (active) setTxLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBatchId]);

  // Available Years extracted from transactions & current year
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    if (currentBatch?.created_at) {
      years.add(new Date(currentBatch.created_at).getFullYear());
    }
    transactions.forEach((tx) => {
      const { year } = parseTxDate(tx.transaction_date);
      if (year && !isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, currentBatch]);

  // 3. Sequential Chronological Running Balance and Monthly Aggregation
  const { monthlySummaries, annualTotals, isReconciled, computedLatestBalance } = useMemo(() => {
    // Sort transactions chronologically
    const sorted = [...transactions].sort((a, b) => {
      const dateDiff = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      return dateDiff !== 0 ? dateDiff : a.transaction_id - b.transaction_id;
    });

    // Check if initial receipt exists
    const hasInitialReceipt = sorted.length > 0 && sorted[0].transaction_type === 'received';

    // Map all transactions with classified details and year/month/day
    const classifiedList = sorted.map((tx) => {
      const dateInfo = parseTxDate(tx.transaction_date);
      const metrics = classifyTx(tx);
      return { tx, dateInfo, ...metrics };
    });

    // Group transactions by "YYYY-MM"
    const txByYearMonth = new Map<string, typeof classifiedList>();
    classifiedList.forEach((entry) => {
      const key = `${entry.dateInfo.year}-${entry.dateInfo.month}`;
      if (!txByYearMonth.has(key)) txByYearMonth.set(key, []);
      txByYearMonth.get(key)!.push(entry);
    });

    // Calculate sequential opening and closing balances across all time
    // Identify all unique months with activity, plus all months of the selected year
    const activeMonthKeys = new Set<string>();
    for (let m = 0; m < 12; m++) {
      activeMonthKeys.add(`${selectedYear}-${m}`);
    }
    txByYearMonth.forEach((_, key) => activeMonthKeys.add(key));

    const sortedMonthKeys = Array.from(activeMonthKeys).sort((a, b) => {
      const [yA, mA] = a.split('-').map(Number);
      const [yB, mB] = b.split('-').map(Number);
      return yA !== yB ? yA - yB : mA - mB;
    });

    let cumulativeRunningBalance = 0;
    const summariesByYearMonth = new Map<string, MonthlySummary>();

    sortedMonthKeys.forEach((key) => {
      const [yr, mIdx] = key.split('-').map(Number);
      const entries = txByYearMonth.get(key) || [];
      const openingBal = cumulativeRunningBalance;

      let monthRec = 0;
      let monthDisp = 0;
      let monthTrans = 0;
      let monthExp = 0;
      let monthDisposed = 0;
      let monthAdjust = 0;

      entries.forEach((e) => {
        monthRec += e.received;
        monthDisp += e.dispensed;
        monthTrans += e.transferred;
        monthExp += e.expired;
        monthDisposed += e.disposed;
        monthAdjust += e.adjustments;
      });

      const netMonthDelta = monthRec + monthAdjust - monthDisp - monthTrans - monthExp - monthDisposed;
      cumulativeRunningBalance += netMonthDelta;
      const closingBal = cumulativeRunningBalance;

      const daysInMonth = new Date(yr, mIdx + 1, 0).getDate();

      summariesByYearMonth.set(key, {
        year: yr,
        monthIndex: mIdx,
        monthName: MONTH_NAMES[mIdx],
        monthYear: `${MONTH_NAMES[mIdx]} ${yr}`,
        openingBalance: openingBal,
        hasTrustworthyOpening: hasInitialReceipt || openingBal > 0,
        received: monthRec,
        dispensed: monthDisp,
        transferred: monthTrans,
        expired: monthExp,
        disposed: monthDisposed,
        adjustments: monthAdjust,
        closingBalance: closingBal,
        activityCount: entries.length,
        daysInMonth,
      });
    });

    // Filter summaries for the selected year
    const summariesForYear: MonthlySummary[] = [];
    let annualRec = 0;
    let annualDisp = 0;
    let annualTrans = 0;
    let annualExp = 0;
    let annualDisposed = 0;
    let annualAdjust = 0;

    for (let m = 0; m < 12; m++) {
      const s = summariesByYearMonth.get(`${selectedYear}-${m}`);
      if (s) {
        annualRec += s.received;
        annualDisp += s.dispensed;
        annualTrans += s.transferred;
        annualExp += s.expired;
        annualDisposed += s.disposed;
        annualAdjust += s.adjustments;

        // Show months that have activity, plus the current month of current year
        const isCurrentCalendarMonth = selectedYear === new Date().getFullYear() && m === new Date().getMonth();
        if (s.activityCount > 0 || isCurrentCalendarMonth) {
          summariesForYear.push(s);
        }
      }
    }

    const netAnnual = annualRec + annualAdjust - annualDisp - annualTrans - annualExp - annualDisposed;
    const reconciled = currentBatch ? cumulativeRunningBalance === Number(currentBatch.current_quantity) : true;

    return {
      monthlySummaries: summariesForYear,
      annualTotals: {
        received: annualRec,
        dispensed: annualDisp,
        transferred: annualTrans,
        expired: annualExp,
        disposed: annualDisposed,
        adjustments: annualAdjust,
        netDelta: netAnnual,
      },
      isReconciled: reconciled,
      computedLatestBalance: cumulativeRunningBalance,
    };
  }, [transactions, selectedYear, currentBatch]);

  // 4. Stock Card Preview Dialog State
  const [previewMonthSummary, setPreviewMonthSummary] = useState<MonthlySummary | null>(null);

  // Compute 31-day table for the selected preview month
  const previewDayRows: DayRow[] = useMemo(() => {
    if (!previewMonthSummary) return [];

    const yr = previewMonthSummary.year;
    const mIdx = previewMonthSummary.monthIndex;
    const daysInMonth = previewMonthSummary.daysInMonth;

    // Filter transactions for this exact month
    const mTxList = transactions.filter((tx) => {
      const { year, month } = parseTxDate(tx.transaction_date);
      return year === yr && month === mIdx;
    }).sort((a, b) => {
      const dDiff = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      return dDiff !== 0 ? dDiff : a.transaction_id - b.transaction_id;
    });

    const txByDay: Record<number, Transaction[]> = {};
    mTxList.forEach((tx) => {
      const { day } = parseTxDate(tx.transaction_date);
      if (!txByDay[day]) txByDay[day] = [];
      txByDay[day].push(tx);
    });

    let runningBal = previewMonthSummary.openingBalance;
    const rows: DayRow[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayTxs = txByDay[d] || [];
      if (dayTxs.length > 0) {
        let dRec = 0;
        let dFrom = '';
        let dDisp = 0;
        let dTrans = 0;
        let dExp = 0;
        let dDisposed = 0;
        let dAdjust = 0;

        dayTxs.forEach((tx) => {
          const classified = classifyTx(tx);
          dRec += classified.received;
          if (classified.receivedFrom) {
            dFrom = dFrom ? `${dFrom}, ${classified.receivedFrom}` : classified.receivedFrom;
          }
          dDisp += classified.dispensed;
          dTrans += classified.transferred;
          dExp += classified.expired;
          dDisposed += classified.disposed;
          dAdjust += classified.adjustments;
        });

        runningBal = runningBal + dRec + dAdjust - dDisp - dTrans - dExp - dDisposed;

        rows.push({
          dayNum: d,
          qtyReceived: dRec,
          receivedFrom: dFrom,
          dispensed: dDisp,
          transferred: dTrans,
          expired: dExp,
          disposed: dDisposed,
          adjustments: dAdjust,
          balance: runningBal,
        });
      } else {
        rows.push({
          dayNum: d,
          qtyReceived: 0,
          receivedFrom: '',
          dispensed: 0,
          transferred: 0,
          expired: 0,
          disposed: 0,
          adjustments: 0,
          balance: rows.length > 0 && rows[rows.length - 1].balance !== null ? runningBal : previewMonthSummary.openingBalance,
        });
      }
    }

    return rows;
  }, [previewMonthSummary, transactions]);

  // Clinic metadata for letterhead and printing
  const clinic = useMemo(() => ({
    clinic_id: currentBatch?.clinic_id || authClinic?.id || 1,
    name: authClinic?.name || 'Animal Bite Treatment Center',
    office_name: authClinic?.name || 'MUNICIPAL HEALTH OFFICE - ANIMAL BITE TREATMENT CENTER',
    province: authClinic?.province || 'Misamis Oriental',
    municipality: authClinic?.municipality || 'Tagoloan',
    phone: authClinic?.contact_number || authClinic?.phone || '(088) 123-4567',
    address: authClinic?.address || '',
    left_logo: authClinic?.left_print_logo_url || null,
    right_logo: authClinic?.right_print_logo_url || null,
  }), [currentBatch, authClinic]);

  // 5. Export Actions: CSV, Printable HTML, Print
  const handlePrint = (summary: MonthlySummary) => {
    if (!currentBatch) return;
    const html = buildPrintableStockCardHtml(
      currentBatch,
      clinic,
      user?.name || 'Clinic Staff',
      summary,
      previewDayRows
    );
    const printWin = window.open('', '_blank', 'width=1050,height=880');
    if (!printWin) return;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 300);
  };

  const handleDownloadPrintable = (summary: MonthlySummary) => {
    if (!currentBatch) return;
    const html = buildPrintableStockCardHtml(
      currentBatch,
      clinic,
      user?.name || 'Clinic Staff',
      summary,
      previewDayRows
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Card_${currentBatch.vaccine_type}_${currentBatch.batch_number}_${summary.monthName}_${summary.year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = (summary: MonthlySummary) => {
    if (!currentBatch) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const rows = [
      ['Official Stock Card Record - Animal Bite Treatment Center'],
      ['Vaccine / Medicine:', currentBatch.vaccine_type, 'Batch / Lot No:', currentBatch.batch_number],
      ['Month & Year:', summary.monthYear, 'Expiry Date:', formatDate(currentBatch.expiration_date)],
      ['Clinic Facility:', clinic.name, 'Storage Spec:', currentBatch.cold_chain_notes || '2°C to 8°C Cold Chain'],
      [],
      ['Day', 'Date', 'Qty Received', 'Received From', 'Dispensed', 'Transferred', 'Expired', 'Other / Disposed', 'Balance'],
    ];

    previewDayRows.forEach((r) => {
      const dateStr = `${summary.year}-${pad(summary.monthIndex + 1)}-${pad(r.dayNum)}`;
      rows.push([
        String(r.dayNum),
        dateStr,
        r.qtyReceived ? String(r.qtyReceived) : '',
        r.receivedFrom ? `"${r.receivedFrom.replace(/"/g, '""')}"` : '',
        r.dispensed ? String(r.dispensed) : '',
        r.transferred ? String(r.transferred) : '',
        r.expired ? String(r.expired) : '',
        r.disposed ? String(r.disposed) : '',
        r.balance !== null ? String(r.balance) : '',
      ]);
    });

    rows.push([]);
    rows.push([
      'Total',
      'Ending Balance',
      `+${summary.received}`,
      'Monthly Closing Summary',
      String(summary.dispensed),
      String(summary.transferred),
      String(summary.expired),
      String(summary.disposed),
      String(summary.closingBalance),
    ]);

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Card_${currentBatch.vaccine_type}_${currentBatch.batch_number}_${summary.monthName}_${summary.year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#059669' }} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <VaccineIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
          No Vaccine Batches Available
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
          Add physical vaccine batches to your clinic inventory to review stock card records.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* ── Filter Bar ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2.25,
          mb: 2.5,
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
        }}
      >
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="stock-card-vaccine-label">Vaccine Type</InputLabel>
              <Select
                labelId="stock-card-vaccine-label"
                label="Vaccine Type"
                value={selectedVaccine}
                onChange={(e) => setSelectedVaccine(e.target.value)}
                sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
              >
                {vaccineOptions.map((v) => (
                  <MenuItem key={v} value={v}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{v}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <FormControl fullWidth size="small" disabled={batchOptions.length === 0}>
              <InputLabel id="stock-card-batch-label">Batch / Lot No.</InputLabel>
              <Select
                labelId="stock-card-batch-label"
                label="Batch / Lot No."
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
              >
                {batchOptions.map((b) => (
                  <MenuItem key={b.inventory_id} value={b.inventory_id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                        {b.batch_number}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                        Exp: {formatDate(b.expiration_date)} &bull; Bal: {b.current_quantity} vials
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="stock-card-year-label">Year</InputLabel>
              <Select
                labelId="stock-card-year-label"
                label="Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
              >
                {availableYears.map((yr) => (
                  <MenuItem key={yr} value={yr}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{yr}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Batch Summary & Annual Movement ── */}
      {currentBatch && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 2.5,
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
          }}
        >
          {/* Batch Identity Header */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              pb: 2,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <VaccineIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {currentBatch.vaccine_type}
                  </Typography>
                  <Chip
                    label={currentBatch.batch_number}
                    size="small"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: 12,
                      bgcolor: '#f1f5f9',
                      color: '#1e293b',
                    }}
                  />
                  <Chip
                    label={currentBatch.status.toUpperCase()}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: 10,
                      bgcolor: currentBatch.status === 'active' ? '#ecfdf5' : '#fff7ed',
                      color: currentBatch.status === 'active' ? '#047857' : '#c2410c',
                    }}
                  />
                </Stack>
                <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.25 }}>
                  Expires: <strong>{formatDate(currentBatch.expiration_date)}</strong> &bull; Received from: {currentBatch.received_from || 'Central Supply'}
                </Typography>
              </Box>
            </Box>

            {/* Live Current Balance Callout */}
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.5px' }}>
                  Live Stock Balance
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
                  {currentBatch.current_quantity} <span style={{ fontSize: 12, fontWeight: 600 }}>vials</span>
                </Typography>
              </Box>
              <Tooltip title={isReconciled ? 'Computed transaction balance matches live inventory stock.' : 'Computed balance differs from live stock quantity.'}>
                {isReconciled ? (
                  <CheckIcon sx={{ color: '#059669', fontSize: 20 }} />
                ) : (
                  <WarningIcon sx={{ color: '#d97706', fontSize: 20 }} />
                )}
              </Tooltip>
            </Box>
          </Box>

          {/* Annual Movement Metrics */}
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', mb: 1.5 }}>
              {selectedYear} Annual Movement Summary
            </Typography>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Received</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#047857', mt: 0.25 }}>
                    +{annualTotals.received}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>vials added</Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Dispensed</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#b91c1c', mt: 0.25 }}>
                    {annualTotals.dispensed}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>vials used</Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Transferred</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#d97706', mt: 0.25 }}>
                    {annualTotals.transferred}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>to other units</Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Expired</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#dc2626', mt: 0.25 }}>
                    {annualTotals.expired}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>expired stock</Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Disposed / Adj.</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#475569', mt: 0.25 }}>
                    {annualTotals.disposed}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>removals / logs</Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Net Delta ({selectedYear})</Typography>
                  <Typography
                    sx={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: annualTotals.netDelta >= 0 ? '#047857' : '#b91c1c',
                      mt: 0.25,
                    }}
                  >
                    {annualTotals.netDelta >= 0 ? `+${annualTotals.netDelta}` : annualTotals.netDelta}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>annual net</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* ── Monthly Stock Card History Table ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              Stock Card History &bull; {selectedYear}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.25 }}>
              Official monthly ledger records. Click &ldquo;View Stock Card&rdquo; to preview, print, or export that month&rsquo;s document.
            </Typography>
          </Box>

          {txLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} sx={{ color: '#059669' }} />
              <Typography sx={{ fontSize: 12, color: '#64748b' }}>Updating transactions…</Typography>
            </Box>
          )}
        </Box>

        {txError && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{txError}</Alert>
          </Box>
        )}

        {monthlySummaries.length === 0 && !txLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <CalendarIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
              No Activity Recorded in {selectedYear}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.25 }}>
              There are no recorded transactions for {currentBatch?.batch_number} in calendar year {selectedYear}.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: 11, color: '#475569', py: 1.25 }}>MONTH</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: '#475569', py: 1.25 }}>OPENING</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: '#047857', py: 1.25 }}>RECEIVED (+)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: '#b91c1c', py: 1.25 }}>DISPENSED (-)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: '#d97706', py: 1.25 }}>TRANSFERRED</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: '#dc2626', py: 1.25 }}>EXPIRED</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: '#64748b', py: 1.25 }}>DISPOSED / ADJ</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: '#0f172a', py: 1.25 }}>CLOSING</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: 11, color: '#475569', py: 1.25 }}>ACTION</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlySummaries.map((summary) => (
                  <TableRow
                    key={summary.monthYear}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      bgcolor: summary.activityCount > 0 ? 'transparent' : '#fafafa',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon sx={{ fontSize: 16, color: '#059669' }} />
                        <span>{summary.monthYear}</span>
                        {summary.activityCount > 0 && (
                          <Chip
                            label={`${summary.activityCount} record${summary.activityCount === 1 ? '' : 's'}`}
                            size="small"
                            sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534' }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                      {summary.hasTrustworthyOpening ? summary.openingBalance : '—'}
                    </TableCell>

                    <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 700, color: summary.received ? '#047857' : '#94a3b8' }}>
                      {summary.received ? `+${summary.received}` : '0'}
                    </TableCell>

                    <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 700, color: summary.dispensed ? '#b91c1c' : '#94a3b8' }}>
                      {summary.dispensed ? summary.dispensed : '0'}
                    </TableCell>

                    <TableCell align="right" sx={{ fontSize: 12.5, color: summary.transferred ? '#d97706' : '#94a3b8' }}>
                      {summary.transferred ? summary.transferred : '0'}
                    </TableCell>

                    <TableCell align="right" sx={{ fontSize: 12.5, color: summary.expired ? '#dc2626' : '#94a3b8' }}>
                      {summary.expired ? summary.expired : '0'}
                    </TableCell>

                    <TableCell align="right" sx={{ fontSize: 12.5, color: summary.disposed ? '#475569' : '#94a3b8' }}>
                      {summary.disposed ? summary.disposed : '0'}
                    </TableCell>

                    <TableCell align="right" sx={{ fontSize: 13, fontWeight: 800, color: '#047857' }}>
                      {summary.closingBalance}
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon sx={{ fontSize: 15 }} />}
                        onClick={() => setPreviewMonthSummary(summary)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: 12,
                          borderColor: '#10b981',
                          color: '#059669',
                          borderRadius: 2,
                          py: 0.35,
                          px: 1.5,
                          '&:hover': {
                            borderColor: '#059669',
                            bgcolor: '#059669',
                            color: '#ffffff',
                          },
                        }}
                      >
                        View Stock Card
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Stock Card Preview Modal ── */}
      {previewMonthSummary && currentBatch && (
        <Dialog
          open={Boolean(previewMonthSummary)}
          onClose={() => setPreviewMonthSummary(null)}
          maxWidth="lg"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
        >
          {/* Modal Header */}
          <DialogTitle
            sx={{
              bgcolor: '#ffffff',
              color: '#0f172a',
              px: 3,
              py: 2,
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Official Stock Card &bull; {currentBatch.vaccine_type} ({currentBatch.batch_number})
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.25 }}>
                {previewMonthSummary.monthYear} &bull; Facility Stock Card Record
              </Typography>
            </Box>
            <IconButton
              onClick={() => setPreviewMonthSummary(null)}
              size="small"
              sx={{ color: '#64748b', '&:hover': { color: '#0f172a', bgcolor: '#f1f5f9' } }}
              aria-label="Close"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          {/* Action Toolbar */}
          <Box
            sx={{
              px: 3,
              py: 1.5,
              bgcolor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                label={`Opening: ${previewMonthSummary.openingBalance}`}
                size="small"
                sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#ffffff', border: '1px solid #cbd5e1' }}
              />
              <Chip
                label={`Received: +${previewMonthSummary.received}`}
                size="small"
                sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
              />
              <Chip
                label={`Dispensed: -${previewMonthSummary.dispensed}`}
                size="small"
                sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
              />
              <Chip
                label={`Closing: ${previewMonthSummary.closingBalance}`}
                size="small"
                sx={{ fontWeight: 800, fontSize: 11, bgcolor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
              />
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleDownloadCsv(previewMonthSummary)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  borderRadius: 2,
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' },
                }}
              >
                Download CSV
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleDownloadPrintable(previewMonthSummary)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  borderRadius: 2,
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' },
                }}
              >
                Download Printable Card
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                onClick={() => handlePrint(previewMonthSummary)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 12,
                  bgcolor: '#059669',
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                Print Stock Card
              </Button>
            </Stack>
          </Box>

          {/* Modal Document Body */}
          <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#ffffff' }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Document Letterhead */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  pb: 2,
                  borderBottom: '2px solid #0f172a',
                }}
              >
                <Box sx={{ width: 75, height: 75, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img
                    src={clinic.left_logo || '/assets/Flag_of_Tagoloan,_Misamis_Oriental.png'}
                    alt="Clinic Seal"
                    style={{ width: 75, height: 75, objectFit: 'contain' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/Flag_of_Tagoloan,_Misamis_Oriental.png'; }}
                  />
                </Box>

                <Box sx={{ textAlign: 'center', px: 2, flex: 1 }}>
                  <Typography sx={{ fontSize: 11, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                    Republic of the Philippines &bull; {clinic.province} &bull; {clinic.municipality}
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mt: 0.25 }}>
                    {clinic.office_name}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#64748b' }}>
                    Tel. No. : {clinic.phone} &bull; {clinic.address}
                  </Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mt: 0.5, textDecoration: 'underline' }}>
                    STOCK CARD
                  </Typography>
                </Box>

                <Box sx={{ width: 75, height: 75, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img
                    src={clinic.right_logo || '/assets/rhu-logo.png'}
                    alt="Health Office Logo"
                    style={{ width: 75, height: 75, objectFit: 'contain' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/rhu-logo.png'; }}
                  />
                </Box>
              </Box>

              {/* Metadata Box */}
              <Box sx={{ border: '1.5px solid #0f172a', p: 1.5, mb: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 11.5 }}>
                      <strong>Name of vaccine/medicine:</strong>{' '}
                      <span style={{ color: '#059669', fontWeight: 800 }}>{currentBatch.vaccine_type}</span>
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 11.5 }}>
                      <strong>Month & Year:</strong> <strong>{previewMonthSummary.monthYear}</strong>
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 11.5 }}>
                      <strong>Lot / Batch Number:</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{currentBatch.batch_number}</span>
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 11.5 }}>
                      <strong>Expiry Date:</strong> <strong>{formatDate(currentBatch.expiration_date)}</strong>
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 11.5 }}>
                      <strong>Facility Clinic:</strong> {clinic.name}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ fontSize: 11.5 }}>
                      <strong>Storage Spec:</strong> {currentBatch.cold_chain_notes || '2°C to 8°C Cold Chain'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Official Table */}
              <TableContainer sx={{ border: '1px solid #0f172a', borderRadius: 0.5 }}>
                <Table size="small" sx={{ '& td, & th': { border: '1px solid #0f172a', py: 0.5, px: 0.75 } }}>
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell rowSpan={2} align="center" sx={{ width: 45, fontWeight: 800, fontSize: 10 }}>DATE</TableCell>
                      <TableCell colSpan={2} align="center" sx={{ fontWeight: 800, fontSize: 10, borderLeft: '2px solid #0f172a !important' }}>DELIVERY</TableCell>
                      <TableCell colSpan={3} align="center" sx={{ fontWeight: 800, fontSize: 10, borderLeft: '2px solid #0f172a !important' }}>OUT FROM FACILITY</TableCell>
                      <TableCell rowSpan={2} align="center" sx={{ width: 75, fontWeight: 800, fontSize: 10, borderLeft: '2px solid #0f172a !important' }}>BALANCE</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="center" sx={{ width: 90, fontWeight: 800, fontSize: 9.5, borderLeft: '2px solid #0f172a !important' }}>Qty Received</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: 9.5 }}>Received From</TableCell>
                      <TableCell align="center" sx={{ width: 70, fontWeight: 800, fontSize: 9.5, borderLeft: '2px solid #0f172a !important' }}>Dispensed</TableCell>
                      <TableCell align="center" sx={{ width: 70, fontWeight: 800, fontSize: 9.5 }}>Transferred</TableCell>
                      <TableCell align="center" sx={{ width: 70, fontWeight: 800, fontSize: 9.5 }}>Expired</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewDayRows.map((r) => {
                      const hasActivity = r.qtyReceived || r.dispensed || r.transferred || r.expired || r.disposed || r.adjustments;
                      return (
                        <TableRow key={r.dayNum} sx={{ bgcolor: hasActivity ? '#f0fdf4' : 'transparent' }}>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: 10.5 }}>{r.dayNum}</TableCell>
                          <TableCell align="center" sx={{ borderLeft: '2px solid #0f172a !important', fontWeight: 700, color: r.qtyReceived ? '#047857' : 'inherit', fontSize: 10.5 }}>
                            {r.qtyReceived ? `+${r.qtyReceived}` : ''}
                          </TableCell>
                          <TableCell sx={{ fontSize: 9.5 }}>{r.receivedFrom}</TableCell>
                          <TableCell align="center" sx={{ borderLeft: '2px solid #0f172a !important', fontWeight: 700, color: r.dispensed ? '#b91c1c' : 'inherit', fontSize: 10.5 }}>
                            {r.dispensed || ''}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: 10.5, color: r.transferred ? '#d97706' : 'inherit' }}>
                            {r.transferred || ''}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: 10.5, color: r.expired ? '#dc2626' : 'inherit' }}>
                            {r.expired || ''}
                          </TableCell>
                          <TableCell align="center" sx={{ borderLeft: '2px solid #0f172a !important', fontWeight: 800, color: r.balance !== null && r.balance <= 10 ? '#d97706' : '#047857', fontSize: 11 }}>
                            {r.balance !== null ? r.balance : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Ending Balance Summary Row */}
                    <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #0f172a !important' }}>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: 11 }}>Total</TableCell>
                      <TableCell align="center" sx={{ borderLeft: '2px solid #0f172a !important', fontWeight: 800, color: '#047857', fontSize: 11 }}>
                        +{previewMonthSummary.received}
                      </TableCell>
                      <TableCell sx={{ fontStyle: 'italic', fontSize: 10, color: '#475569' }}>
                        Monthly Closing Summary
                      </TableCell>
                      <TableCell align="center" sx={{ borderLeft: '2px solid #0f172a !important', fontWeight: 800, color: '#b91c1c', fontSize: 11 }}>
                        {previewMonthSummary.dispensed}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#d97706', fontSize: 11 }}>
                        {previewMonthSummary.transferred}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#dc2626', fontSize: 11 }}>
                        {previewMonthSummary.expired}
                      </TableCell>
                      <TableCell align="center" sx={{ borderLeft: '2px solid #0f172a !important', fontWeight: 800, color: '#047857', bgcolor: '#dcfce7', fontSize: 12 }}>
                        {previewMonthSummary.closingBalance}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Signatures */}
              <Box sx={{ mt: 3, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ width: '42%', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 11, color: '#475569' }}>Prepared & Logged by:</Typography>
                  <Box sx={{ borderTop: '1px solid #0f172a', mt: 3.5, pt: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                      {user?.name || 'Clinic Staff'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: '#64748b' }}>
                      Inventory Officer / Clinic Staff
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ width: '42%', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 11, color: '#475569' }}>Verified & Approved by:</Typography>
                  <Box sx={{ borderTop: '1px solid #0f172a', mt: 3.5, pt: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                      Clinic Physician / Medical Officer
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: '#64748b' }}>
                      Designated Facility In-Charge
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </DialogContent>

          {/* Modal Footer */}
          <DialogActions sx={{ px: 3, py: 1.75, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
            <Button
              onClick={() => setPreviewMonthSummary(null)}
              variant="outlined"
              color="inherit"
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#cbd5e1', color: '#475569', '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' } }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
