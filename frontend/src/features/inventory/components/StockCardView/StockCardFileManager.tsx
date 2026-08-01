import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Button, TextField, InputAdornment,
  Grid, Paper, IconButton, Tooltip, Divider, Menu, MenuItem, Stack,
  LinearProgress, Snackbar, Alert, DialogActions, Select, FormControl, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  Search as SearchIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  DriveFileRenameOutline as RenameIcon,
  Delete as DeleteIcon,
  KeyboardArrowRight as ArrowRightIcon,
  KeyboardArrowDown as ArrowDownIcon,
  RemoveRedEye as EyeIcon,
  LocalHospital as ClinicIcon,
} from '@mui/icons-material';
import type { InventoryItem } from '../../types';
import { DEMO_CLINICS } from '../../data/inventoryDemoData';
import ConfirmationDialog from '../../../../components/feedback/ConfirmationDialog';

// ─── Types & Interfaces ───────────────────────────────────────

export interface StockCardFile {
  id: string;
  monthIndex: number;
  monthName: string;
  year: number;
  fileName: string;
  fileSize: string;
  lastModified: string;
  status: 'active' | 'finalized' | 'scheduled';
  entriesCount: number;
  totalDispensed: number;
  totalReceived: number;
  finalBalance: number;
}

interface StockCardFileManagerProps {
  open?: boolean;
  onClose?: () => void;
  item: InventoryItem;
  items?: InventoryItem[];
  selectedMonth?: number;
  selectedYear?: number;
  onSelectMonthYear?: (monthIndex: number, year: number) => void;
  onPrintMonth?: (monthIndex: number, year: number) => void;
  isModal?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Helper to generate file items with realistic 31-day sample data
function generateMonthlyFiles(year: number, item: InventoryItem): StockCardFile[] {
  return MONTH_NAMES.map((mName, idx) => {
    const isJuly = idx === 6 && year === 2026;
    const isPast = year < 2026 || (year === 2026 && idx < 6);
    const status: StockCardFile['status'] = isJuly ? 'active' : isPast ? 'finalized' : 'scheduled';
    const entriesCount = 31;
    const totalReceived = 50 + ((idx * 7) % 30);
    const totalDispensed = 18 + ((idx * 4) % 20);
    const finalBalance = Math.max(0, item.current_quantity + totalReceived - totalDispensed);
    const pad = (n: number) => String(n).padStart(2, '0');

    return {
      id: `file-${year}-${idx}`,
      monthIndex: idx,
      monthName: mName,
      year,
      fileName: `${pad(idx + 1)}_${mName.toLowerCase()}_${year}.scard`,
      fileSize: `${(4.2 + (idx * 0.25)).toFixed(1)} KB`,
      lastModified: isJuly ? 'Today, 05:42 PM' : `18 ${mName} ${year}`,
      status,
      entriesCount,
      totalReceived,
      totalDispensed,
      finalBalance,
    };
  });
}

// Generate 31-day sample transactions for a given month
function generate31DaySampleData(monthIndex: number, _year: number, _item: InventoryItem) {
  const rows = [];
  let runningBal = 0;

  for (let day = 1; day <= 31; day++) {
    let rcv = 0;
    let rcvFrom = '';
    let disp = 0;
    let trans = 0;
    let exp = 0;

    if (day === 1) {
      rcv = 50 + (monthIndex % 5) * 10;
      rcvFrom = 'DOH Regional Office 10 Supply Depot';
      runningBal += rcv;
    } else if (day === 3) {
      disp = 3;
      runningBal -= disp;
    } else if (day === 6) {
      disp = 4;
      runningBal -= disp;
    } else if (day === 10) {
      disp = 2;
      runningBal -= disp;
    } else if (day === 15) {
      rcv = 30;
      rcvFrom = 'Provincial Health Office Cold Chain Storage';
      runningBal += rcv;
    } else if (day === 18) {
      disp = 5;
      runningBal -= disp;
    } else if (day === 22) {
      disp = 3;
      runningBal -= disp;
    } else if (day === 26) {
      disp = 4;
      runningBal -= disp;
    } else if (day === 30) {
      trans = 2;
      runningBal -= trans;
    }

    rows.push({
      dayNum: day,
      qtyReceived: rcv,
      receivedFrom: rcvFrom,
      dispensed: disp,
      transferred: trans,
      expired: exp,
      balance: runningBal,
    });
  }

  return rows;
}

export default function StockCardFileManager({
  open = true,
  onClose,
  item,
  items,
  selectedMonth: _selectedMonth,
  selectedYear,
  onSelectMonthYear: _onSelectMonthYear,
  onPrintMonth: _onPrintMonth,
  isModal = true,
}: StockCardFileManagerProps) {
  const [activeItem, setActiveItem] = useState<InventoryItem>(item);

  useEffect(() => {
    if (item) setActiveItem(item);
  }, [item]);

  const [currentYear, setCurrentYear] = useState<number>(selectedYear || 2026);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filesList, setFilesList] = useState<StockCardFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<StockCardFile | null>(null);

  // File Viewer Modal State ("What's Inside")
  const [viewerFile, setViewerFile] = useState<StockCardFile | null>(null);

  const [treeExpanded, setTreeExpanded] = useState<Record<string, boolean>>({
    myFiles: true,
    y2026: true,
    y2025: false,
    y2024: false,
  });

  // Right-Click Context Menu State (x, y position)
  const [contextMenuPos, setContextMenuPos] = useState<{ mouseX: number; mouseY: number; file: StockCardFile } | null>(null);
  const [addNewAnchor, setAddNewAnchor] = useState<HTMLElement | null>(null);
  
  // Add New File & Folder Dialog States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMonthIndex, setNewMonthIndex] = useState<number>(7);
  const [newFileName, setNewFileName] = useState<string>('08_august_2026.scard');

  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string>('2027 Stock Cards');
  const [customFolders, setCustomFolders] = useState<Array<{ year: number; key: string; label: string }>>([
    { year: 2026, key: 'y2026', label: '2026 Stock Cards' },
    { year: 2025, key: 'y2025', label: '2025 Archives' },
    { year: 2024, key: 'y2024', label: '2024 Archives' },
  ]);

  // Rename & Delete Modal State
  const [renameTarget, setRenameTarget] = useState<StockCardFile | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<StockCardFile | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ year: number; key: string; label: string } | null>(null);

  const handleConfirmDeleteFolder = () => {
    if (!deleteFolderTarget) return;
    setCustomFolders(prev => prev.filter(f => f.key !== deleteFolderTarget.key));
    setToast({ open: true, message: `Deleted folder "${deleteFolderTarget.label}"`, severity: 'error' });
    setDeleteFolderTarget(null);
  };

  // Toast Alerts
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const activeClinic = useMemo(() => {
    return {
      ...DEMO_CLINICS[0],
      name: 'Tagoloan Animal Bite Treatment Center',
    };
  }, []);

  // Sync files list when year or activeItem changes
  useEffect(() => {
    const list = generateMonthlyFiles(currentYear, activeItem);
    setFilesList(list);
    if (list.length > 0) setSelectedFile(list[0]);
  }, [currentYear, activeItem]);

  const filteredFiles = useMemo(() => {
    return filesList.filter(file => {
      return file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.monthName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [filesList, searchQuery]);

  // Robust Right-Click Handler with exact cursor position
  const handleRightClick = (event: React.MouseEvent, file: StockCardFile) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFile(file);
    setContextMenuPos({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      file,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenuPos(null);
  };

  // 1A. DOWNLOAD OFFICIAL CSV SPREADSHEET (OPENS PERFECTLY IN EXCEL / SHEETS)
  const handleDownloadCSV = (file: StockCardFile) => {
    const sampleData = generate31DaySampleData(file.monthIndex, file.year, activeItem);

    const csvLines = [
      `REPUBLIC OF THE PHILIPPINES`,
      `${activeClinic.name.toUpperCase()}`,
      `OFFICIAL VACCINE & MEDICINE STOCK CARD REPORT`,
      ``,
      `Vaccine/Medicine,${activeItem.vaccine_type}`,
      `Lot / Batch Number,${activeItem.batch_number}`,
      `Month & Year,${file.monthName} ${file.year}`,
      `Expiration Date,${activeItem.expiration_date}`,
      `Storage Spec,2°C to 8°C Cold Chain Required`,
      `Facility Clinic,${activeClinic.name}`,
      `File Identifier,${file.fileName}`,
      ``,
      `DATE,QTY RECEIVED,RECEIVED FROM,DISPENSED,TRANSFERRED,EXPIRED,BALANCE`,
      ...sampleData.map(r => 
        `${r.dayNum},"${r.qtyReceived || ''}","${r.receivedFrom}","${r.dispensed || ''}","${r.transferred || ''}","${r.expired || ''}",${r.balance}`
      ),
      ``,
      `SUMMARY STATS:`,
      `Total Received,${file.totalReceived} vials`,
      `Total Dispensed,${file.totalDispensed} vials`,
      `Ending Stock Balance,${file.finalBalance} vials`,
      ``,
      `PREPARED BY,________________________________,Inventory Nurse / Pharmacist In-Charge`,
      `APPROVED BY,________________________________,Municipal Health Officer / MHO Head`,
      `Generated via Animal Bite Management System on ${new Date().toLocaleDateString()}`,
    ].join('\n');

    const targetFileName = file.fileName.replace('.scard', '.csv');
    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', targetFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    handleCloseContextMenu();
    setToast({ open: true, message: `Downloaded ${targetFileName} (Excel / CSV Spreadsheet)!`, severity: 'success' });
  };

  // 1B. DOWNLOAD STOCK CARD AS HTML DOCUMENT FILE
  const handleSaveAsPDF = (file: StockCardFile) => {
    const sampleData = generate31DaySampleData(file.monthIndex, file.year, activeItem);
    const trackingCode = `ABTC-SC-${file.year}-${String(file.monthIndex + 1).padStart(2, '0')}-${activeItem.batch_number}`;

    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Stock Card - ${file.monthName} ${file.year} - ${activeItem.vaccine_type}</title>
    <style>
      @page { size: A4 portrait; margin: 6mm 8mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; font-size: 8.5pt; line-height: 1.3; }
      .meta-box { border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 8px; background: #fafafa; }
      .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .meta-cell { font-size: 8.5pt; }
      .meta-label { font-weight: bold; color: #222; }
      .meta-val { font-weight: bold; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 4px; }
      th, td { border: 1.2px solid #000; padding: 3px 5px; font-size: 8pt; text-align: center; }
      th { font-weight: bold; background-color: #f0fdf4 !important; text-transform: uppercase; font-size: 7.5pt; color: #166534; }
      tr.activity-row { background-color: #f0fdf4 !important; }
      .sig-container { margin-top: 20px; display: flex; justify-content: space-between; font-size: 8.5pt; }
      .sig-box { width: 42%; text-align: center; }
      .sig-line { border-top: 1px solid #000; margin-top: 28px; padding-top: 3px; font-weight: bold; }
      .footer-info { margin-top: 14px; padding-top: 4px; border-top: 1px solid #666; display: flex; justify-content: space-between; font-size: 7pt; color: #444; }
    </style>
  </head>
  <body>
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
      <img src="${window.location.origin}/assets/Flag_of_Tagoloan,_Misamis_Oriental.png" style="height: 80px; width: 80px; object-fit: contain;" />
      <div style="text-align: center; flex: 1; padding: 0 8px;">
        <div style="font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #333;">Republic of the Philippines</div>
        <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase; color: #000;">PROVINCE OF MISAMIS ORIENTAL</div>
        <div style="font-size: 9pt; font-weight: bold; color: #333;">Municipality of Tagoloan</div>
        <div style="font-size: 11pt; font-weight: 800; text-transform: uppercase; color: #059669; margin-top: 1px;">MUNICIPAL HEALTH OFFICE</div>
        <div style="font-size: 8pt; color: #444;">Tel. No. : (088) 555-4778</div>
      </div>
      <img src="${window.location.origin}/assets/rhu-logo.png" style="height: 80px; width: 80px; object-fit: contain;" />
    </div>

    <div style="text-align: center; margin-bottom: 12px;">
      <div style="font-size: 14pt; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000; text-decoration: underline;">STOCK CARD</div>
    </div>

    <div class="meta-box">
      <div class="meta-row">
        <div class="meta-cell"><span class="meta-label">Name of vaccine/medicine:</span> <span class="meta-val" style="color: #059669">${activeItem.vaccine_type}</span></div>
        <div class="meta-cell"><span class="meta-label">Month & Year:</span> <span class="meta-val">${file.monthName} ${file.year}</span></div>
      </div>
      <div class="meta-row">
        <div class="meta-cell"><span class="meta-label">Lot / Batch Number:</span> <span class="meta-val" style="font-family: monospace">${activeItem.batch_number}</span></div>
        <div class="meta-cell"><span class="meta-label">Expiry Date:</span> <span class="meta-val">${activeItem.expiration_date}</span></div>
      </div>
      <div class="meta-row">
        <div class="meta-cell"><span class="meta-label">Facility Clinic:</span> <span class="meta-val">${activeClinic.name}</span></div>
        <div class="meta-cell"><span class="meta-label">Storage Spec:</span> <span class="meta-val">2°C to 8°C Cold Chain Required</span></div>
      </div>
    </div>

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
        ${sampleData.map(r => `
          <tr class="${r.qtyReceived || r.dispensed || r.transferred || r.expired ? 'activity-row' : ''}">
            <td style="font-weight: bold">${r.dayNum}</td>
            <td style="border-left: 2px solid #000; color: ${r.qtyReceived ? '#047857' : 'inherit'}; font-weight: ${r.qtyReceived ? 'bold' : 'normal'}">${r.qtyReceived || ''}</td>
            <td style="text-align: left; font-size: 7.5pt">${r.receivedFrom}</td>
            <td style="border-left: 2px solid #000; color: ${r.dispensed ? '#b91c1c' : 'inherit'}">${r.dispensed || ''}</td>
            <td style="color: ${r.transferred ? '#d97706' : 'inherit'}">${r.transferred || ''}</td>
            <td style="color: ${r.expired ? '#dc2626' : 'inherit'}">${r.expired || ''}</td>
            <td style="border-left: 2px solid #000; font-weight: bold; color: ${r.balance <= 10 ? '#d97706' : '#047857'}">${r.balance}</td>
          </tr>
        `).join('')}
        <tr style="background-color: #f1f5f9; border-top: 2px solid #000; font-weight: bold">
          <td style="font-weight: 800">Ending Balance</td>
          <td style="border-left: 2px solid #000; color: #047857">+${file.totalReceived}</td>
          <td style="text-align: left; font-size: 7.5pt; font-style: italic">Monthly Stock Balance Summary</td>
          <td style="border-left: 2px solid #000; color: #b91c1c">${file.totalDispensed}</td>
          <td style="color: #d97706">0</td>
          <td style="color: #dc2626">0</td>
          <td style="border-left: 2px solid #000; font-weight: 900; color: #047857">${file.finalBalance}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 6px; font-size: 8.5pt; font-weight: bold; text-align: right; color: #047857">
      Ending Stock Balance: ${file.finalBalance} vials (≈ ${file.finalBalance * 3} coverable doses)
    </div>

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

    <div class="footer-info">
      <span>Official Form MHO-SC-2026 &bull; ${activeClinic.name}</span>
      <span>Tracking Code: ${trackingCode}</span>
      <span>Generated on: ${new Date().toLocaleString()}</span>
    </div>
  </body>
</html>`;

    // Direct Blob download as .html file
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StockCard_${activeItem.batch_number}_${file.monthName}_${file.year}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    handleCloseContextMenu();
    setToast({ open: true, message: `Downloaded ${link.download} HTML file!`, severity: 'success' });
  };

  // 1C. PRINT STOCK CARD (DIRECT SINGLE A4 PAGE PRINTER DRIVER - NO DUPLICATE PAGES)
  const handlePrintStockCard = (file: StockCardFile) => {
    const sampleData = generate31DaySampleData(file.monthIndex, file.year, activeItem);
    const trackingCode = `ABTC-SC-${file.year}-${String(file.monthIndex + 1).padStart(2, '0')}-${activeItem.batch_number}`;

    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) return;

    printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Print Stock Card - ${file.monthName} ${file.year}</title>
    <style>
      @page { size: A4 portrait; margin: 4mm 6mm; }
      @media print {
        html, body { height: 99%; overflow: hidden; page-break-after: avoid; page-break-before: avoid; }
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; font-size: 7.5pt; line-height: 1.15; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .meta-box { border: 1.2px solid #000; padding: 4px 8px; margin-bottom: 4px; }
      .meta-row { display: flex; justify-content: space-between; margin-bottom: 1px; }
      .meta-cell { font-size: 7.5pt; }
      .meta-label { font-weight: bold; }
      .meta-val { font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-top: 2px; }
      th, td { border: 1px solid #000; padding: 1.5px 3px; font-size: 7pt; text-align: center; }
      th { font-weight: bold; background-color: #f1f5f9 !important; text-transform: uppercase; font-size: 6.5pt; }
      .sig-container { margin-top: 10px; display: flex; justify-content: space-between; font-size: 7.5pt; }
      .sig-box { width: 42%; text-align: center; }
      .sig-line { border-top: 1px solid #000; margin-top: 16px; padding-top: 1px; font-weight: bold; }
      .footer-info { margin-top: 6px; padding-top: 2px; border-top: 1px solid #666; display: flex; justify-content: space-between; font-size: 6pt; color: #444; }
    </style>
  </head>
  <body>
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 4px;">
      <img src="${window.location.origin}/assets/Flag_of_Tagoloan,_Misamis_Oriental.png" style="height: 55px; width: 55px; object-fit: contain;" />
      <div style="text-align: center; flex: 1; padding: 0 6px;">
        <div style="font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; color: #333;">Republic of the Philippines</div>
        <div style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #000;">PROVINCE OF MISAMIS ORIENTAL</div>
        <div style="font-size: 8pt; font-weight: bold; color: #333;">Municipality of Tagoloan</div>
        <div style="font-size: 9.5pt; font-weight: 800; text-transform: uppercase; color: #059669; margin-top: 1px;">MUNICIPAL HEALTH OFFICE</div>
        <div style="font-size: 7pt; color: #444;">Tel. No. : (088) 555-4778</div>
      </div>
      <img src="${window.location.origin}/assets/rhu-logo.png" style="height: 55px; width: 55px; object-fit: contain;" />
    </div>

    <div style="text-align: center; margin-bottom: 4px;">
      <div style="font-size: 12pt; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #000; text-decoration: underline;">STOCK CARD</div>
    </div>

    <div class="meta-box">
      <div class="meta-row">
        <div class="meta-cell"><span class="meta-label">Name of vaccine/medicine:</span> <span class="meta-val" style="color: #059669">${activeItem.vaccine_type}</span></div>
        <div class="meta-cell"><span class="meta-label">Month & Year:</span> <span class="meta-val">${file.monthName} ${file.year}</span></div>
      </div>
      <div class="meta-row">
        <div class="meta-cell"><span class="meta-label">Lot / Batch Number:</span> <span class="meta-val" style="font-family: monospace">${activeItem.batch_number}</span></div>
        <div class="meta-cell"><span class="meta-label">Expiry Date:</span> <span class="meta-val">${activeItem.expiration_date}</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowSpan="2" style="width: 35px">DATE</th>
          <th colSpan="2">DELIVERY</th>
          <th colSpan="3">OUT FROM FACILITY</th>
          <th rowSpan="2" style="width: 65px">BALANCE</th>
        </tr>
        <tr>
          <th style="width: 85px">Qty Received</th>
          <th>Received From</th>
          <th style="width: 60px">Dispensed</th>
          <th style="width: 60px">Transferred</th>
          <th style="width: 60px">Expired</th>
        </tr>
      </thead>
      <tbody>
        ${sampleData.map(r => `
          <tr>
            <td style="font-weight: bold">${r.dayNum}</td>
            <td style="color: ${r.qtyReceived ? '#047857' : 'inherit'}; font-weight: ${r.qtyReceived ? 'bold' : 'normal'}">${r.qtyReceived || ''}</td>
            <td style="text-align: left; font-size: 6.5pt">${r.receivedFrom}</td>
            <td style="color: ${r.dispensed ? '#b91c1c' : 'inherit'}">${r.dispensed || ''}</td>
            <td style="color: ${r.transferred ? '#d97706' : 'inherit'}">${r.transferred || ''}</td>
            <td style="color: ${r.expired ? '#dc2626' : 'inherit'}">${r.expired || ''}</td>
            <td style="font-weight: bold; color: ${r.balance <= 10 ? '#d97706' : '#047857'}">${r.balance}</td>
          </tr>
        `).join('')}
        <tr style="background-color: #f1f5f9; font-weight: bold">
          <td style="font-weight: 800">Ending Balance</td>
          <td style="color: #047857">+${file.totalReceived}</td>
          <td style="text-align: left; font-size: 6.5pt; font-style: italic">Monthly Stock Balance Summary</td>
          <td style="color: #b91c1c">${file.totalDispensed}</td>
          <td style="color: #d97706">0</td>
          <td style="color: #dc2626">0</td>
          <td style="font-weight: 900; color: #047857">${file.finalBalance}</td>
        </tr>
      </tbody>
    </table>

    <div class="sig-container">
      <div class="sig-box">
        <div class="sig-line">Prepared & Issued By:</div>
        <div style="font-size: 6.5pt; color: #555">Inventory Nurse / Pharmacist In-Charge</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Approved & Verified By:</div>
        <div style="font-size: 6.5pt; color: #555">Municipal Health Officer / MHO Head</div>
      </div>
    </div>

    <div class="footer-info">
      <span>Official Form MHO-SC-2026 &bull; ${activeClinic.name}</span>
      <span>Tracking Code: ${trackingCode}</span>
      <span>Generated on: ${new Date().toLocaleString()}</span>
    </div>
  </body>
</html>`);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 250);

    handleCloseContextMenu();
    setToast({ open: true, message: `Opened printer for ${file.fileName}`, severity: 'info' });
  };

  // 2. OPEN ACTION ("WHAT'S INSIDE" SAMPLE FILE VIEWER MODAL)
  const handleOpenFile = (file: StockCardFile) => {
    setSelectedFile(file);
    setViewerFile(file);
    handleCloseContextMenu();
  };

  // 3. RENAME ACTION
  const handleOpenRename = (file: StockCardFile) => {
    setRenameTarget(file);
    setRenameValue(file.fileName);
    handleCloseContextMenu();
  };

  const handleConfirmRename = () => {
    if (!renameTarget || !renameValue.trim()) return;
    setFilesList(prev => prev.map(f => f.id === renameTarget.id ? { ...f, fileName: renameValue.trim() } : f));
    setToast({ open: true, message: `Renamed file to "${renameValue.trim()}"`, severity: 'success' });
    setRenameTarget(null);
  };

  // 4. DELETE ACTION
  const handleOpenDelete = (file: StockCardFile) => {
    setDeleteTarget(file);
    handleCloseContextMenu();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setFilesList(prev => prev.filter(f => f.id !== deleteTarget.id));
    if (selectedFile?.id === deleteTarget.id) setSelectedFile(null);
    setToast({ open: true, message: `Deleted ${deleteTarget.fileName}`, severity: 'error' });
    setDeleteTarget(null);
  };

  // 5. ADD NEW FILE ACTION
  const handleCreateNewFile = () => {
    const mName = MONTH_NAMES[newMonthIndex];
    const newFileObj: StockCardFile = {
      id: `file-${currentYear}-${newMonthIndex}-${Date.now()}`,
      monthIndex: newMonthIndex,
      monthName: mName,
      year: currentYear,
      fileName: newFileName.trim() || `0${newMonthIndex + 1}_${mName.toLowerCase()}_${currentYear}.scard`,
      fileSize: '4.2 KB',
      lastModified: 'Just now',
      status: 'active',
      entriesCount: 31,
      totalReceived: 50,
      totalDispensed: 18,
      finalBalance: 32,
    };

    setFilesList(prev => [newFileObj, ...prev]);
    setSelectedFile(newFileObj);
    setIsAddModalOpen(false);
    setToast({ open: true, message: `Created new file: ${newFileObj.fileName}`, severity: 'success' });
  };

  // 6. ADD NEW ARCHIVE FOLDER ACTION
  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) return;
    const yearMatch = newFolderName.match(/\d{4}/);
    const folderYear = yearMatch ? parseInt(yearMatch[0], 10) : currentYear;
    const folderKey = `custom-${Date.now()}`;

    setCustomFolders(prev => [
      ...prev,
      { year: folderYear, key: folderKey, label: newFolderName.trim() }
    ]);
    setCurrentYear(folderYear);
    setIsAddFolderModalOpen(false);
    setToast({ open: true, message: `Created archive folder "${newFolderName.trim()}"`, severity: 'success' });
  };

  const toggleTree = (key: string) => {
    setTreeExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Sample data for viewer modal
  const sampleViewerData = useMemo(() => {
    if (!viewerFile) return [];
    return generate31DaySampleData(viewerFile.monthIndex, viewerFile.year, activeItem);
  }, [viewerFile, activeItem]);

  const managerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {/* ── Webix Style Emerald Header Bar ── */}
      <Box
        sx={{
          bgcolor: '#059669',
          color: '#ffffff',
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 260 }}>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 0.75, borderRadius: 1.5, display: 'flex', alignItems: 'center' }}>
            <FolderOpenIcon sx={{ fontSize: 22, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#ffffff', lineHeight: 1.2 }}>
              Stock Card File Manager
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#dcfce7', mt: 0.25 }}>
              {activeClinic.name} • {activeItem.vaccine_type} ({activeItem.batch_number})
            </Typography>
          </Box>
        </Box>

        {/* Center Search Input & Batch Selector */}
        <Box sx={{ flex: 1, maxWidth: 520, mx: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {items && items.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <Select
                value={activeItem.inventory_id}
                onChange={(e) => {
                  const found = items.find(i => i.inventory_id === Number(e.target.value));
                  if (found) setActiveItem(found);
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  height: 36,
                  borderRadius: 2,
                  '& .MuiSelect-icon': { color: '#ffffff' },
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                }}
              >
                {items.map(inv => (
                  <MenuItem key={inv.inventory_id} value={inv.inventory_id} sx={{ fontSize: 12 }}>
                    {inv.vaccine_type} ({inv.batch_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth
            size="small"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#059669', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#ffffff',
                fontSize: 13,
                height: 36,
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: '#a7f3d0' },
                '&.Mui-focused fieldset': { borderColor: '#ffffff', borderWidth: '2px' },
              },
            }}
          />
        </Box>

        {/* Right Action Icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => selectedFile && handleOpenFile(selectedFile)}
            sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
          >
            <Tooltip title="Open File Content Viewer"><EyeIcon sx={{ fontSize: 18 }} /></Tooltip>
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setViewMode('list')}
            sx={{
              color: '#ffffff',
              bgcolor: viewMode === 'list' ? 'rgba(255,255,255,0.3)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            <Tooltip title="List View"><ViewListIcon sx={{ fontSize: 18 }} /></Tooltip>
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setViewMode('grid')}
            sx={{
              color: '#ffffff',
              bgcolor: viewMode === 'grid' ? 'rgba(255,255,255,0.3)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            <Tooltip title="Grid Icons"><GridViewIcon sx={{ fontSize: 18 }} /></Tooltip>
          </IconButton>
          {onClose && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, my: 'auto', borderColor: 'rgba(255,255,255,0.3)' }} />
              <IconButton onClick={onClose} size="small" sx={{ color: '#ffffff', '&:hover': { bgcolor: 'rgba(239,68,68,0.8)' } }}>
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {/* ── Main Explorer Content ── */}
      <DialogContent sx={{ p: 0, display: 'flex', height: 'calc(100% - 56px)', bgcolor: '#ffffff' }}>
        
        {/* ── Left Sidebar (Tree Navigation & Storage) ── */}
        <Box
          sx={{
            width: 240,
            borderRight: '1px solid #e2e8f0',
            bgcolor: '#f8fafc',
            p: 1.75,
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <Box>
            {/* Green "+ Add New" Dropdown Button */}
            <Button
              fullWidth
              variant="contained"
              disableElevation
              onClick={(e) => setAddNewAnchor(e.currentTarget)}
              startIcon={<AddIcon />}
              sx={{
                bgcolor: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'none',
                py: 1.1,
                mb: 2.5,
                borderRadius: 2,
                boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)',
                '&:hover': { bgcolor: '#047857' },
              }}
            >
              Add New
            </Button>

            {/* Add New Popover Menu */}
            <Menu
              anchorEl={addNewAnchor}
              open={Boolean(addNewAnchor)}
              onClose={() => setAddNewAnchor(null)}
              slotProps={{
                paper: {
                  elevation: 4,
                  sx: {
                    width: 200,
                    borderRadius: 2,
                    py: 0.5,
                    mt: 0.5,
                    border: '1px solid #a7f3d0',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  setAddNewAnchor(null);
                  setIsAddModalOpen(true);
                }}
                sx={{ fontSize: 12, gap: 1, py: 0.85, px: 1.5, color: '#166534', fontWeight: 600 }}
              >
                <FileIcon sx={{ fontSize: 16, color: '#059669' }} />
                <span>New Stock Card File</span>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAddNewAnchor(null);
                  setIsAddFolderModalOpen(true);
                }}
                sx={{ fontSize: 12, gap: 1, py: 0.85, px: 1.5, color: '#166534', fontWeight: 600 }}
              >
                <FolderIcon sx={{ fontSize: 16, color: '#eab308' }} />
                <span>New Archive Folder</span>
              </MenuItem>
            </Menu>

            {/* Directory Structure */}
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#047857', mb: 1.25, px: 0.5, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Directory Structure
            </Typography>

            <Stack spacing={0.5}>
              <Box
                onClick={() => toggleTree('myFiles')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.75,
                  px: 1,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  bgcolor: '#ecfdf5',
                  color: '#047857',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#dcfce7' },
                }}
              >
                {treeExpanded.myFiles ? <ArrowDownIcon sx={{ fontSize: 16, color: '#059669' }} /> : <ArrowRightIcon sx={{ fontSize: 16, color: '#059669' }} />}
                <FolderOpenIcon sx={{ fontSize: 18, color: '#10b981' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  My Files
                </Typography>
              </Box>

              {treeExpanded.myFiles && (
                <Box sx={{ pl: 2 }}>
                  {customFolders.map(itemFolder => (
                    <Box
                      key={itemFolder.key}
                      onClick={() => {
                        setCurrentYear(itemFolder.year);
                        toggleTree(itemFolder.key);
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        py: 0.6,
                        px: 1,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        bgcolor: currentYear === itemFolder.year ? '#dcfce7' : 'transparent',
                        color: currentYear === itemFolder.year ? '#15803d' : '#475569',
                        '&:hover': {
                          bgcolor: '#ecfdf5',
                          '& .delete-folder-btn': { opacity: 1 },
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                        <FolderIcon sx={{ fontSize: 16, color: currentYear === itemFolder.year ? '#059669' : '#cbd5e1' }} />
                        <Typography noWrap sx={{ fontSize: 12.5, fontWeight: currentYear === itemFolder.year ? 700 : 500 }}>
                          {itemFolder.label}
                        </Typography>
                      </Box>

                      {/* Folder Delete Action Button */}
                      <IconButton
                        className="delete-folder-btn"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFolderTarget(itemFolder);
                        }}
                        sx={{
                          opacity: 0,
                          p: 0.2,
                          color: '#dc2626',
                          transition: 'opacity 0.2s',
                          '&:hover': { bgcolor: '#fee2e2' },
                        }}
                      >
                        <Tooltip title="Delete Folder">
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </Tooltip>
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Stack>

            {/* Vaccine Batches Directory Node List */}
            {items && items.length > 1 && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#047857', mb: 1, px: 0.5, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Vaccine Batches ({items.length})
                </Typography>
                <Stack spacing={0.5}>
                  {items.map(inv => {
                    const isSelected = activeItem.inventory_id === inv.inventory_id;
                    return (
                      <Box
                        key={inv.inventory_id}
                        onClick={() => setActiveItem(inv)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 0.65,
                          px: 1,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          bgcolor: isSelected ? '#dcfce7' : 'transparent',
                          color: isSelected ? '#15803d' : '#475569',
                          '&:hover': { bgcolor: '#ecfdf5' },
                        }}
                      >
                        <ClinicIcon sx={{ fontSize: 15, color: isSelected ? '#059669' : '#94a3b8' }} />
                        <Box sx={{ overflow: 'hidden' }}>
                          <Typography noWrap sx={{ fontSize: 12, fontWeight: isSelected ? 700 : 500 }}>
                            {inv.vaccine_type}
                          </Typography>
                          <Typography noWrap sx={{ fontSize: 10, color: isSelected ? '#166534' : '#94a3b8', fontFamily: 'monospace' }}>
                            {inv.batch_number}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>

          {/* Storage Progress Bar */}
          <Box sx={{ p: 1.25, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                97.7 KB of 125.0 KB used
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={78}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': { bgcolor: '#059669' },
              }}
            />
          </Box>
        </Box>

        {/* ── Center Content: Files Explorer Table ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #e2e8f0' }}>
          
          {/* Breadcrumb Bar */}
          <Box sx={{ px: 2.5, py: 1.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fafafa', display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderOpenIcon sx={{ fontSize: 18, color: '#059669' }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              My Files &nbsp;&rsaquo;&nbsp; {currentYear} Stock Cards &nbsp;&rsaquo;&nbsp; {activeItem.vaccine_type} ({activeItem.batch_number})
            </Typography>
          </Box>

          {/* Files List Table */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {viewMode === 'list' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '12px', width: '50%' }}>File Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '12px', width: '20%' }}>Size</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '12px', width: '30%' }}>Date Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map(file => {
                    const isSelected = selectedFile?.id === file.id;
                    return (
                      <tr
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        onDoubleClick={() => handleOpenFile(file)}
                        onContextMenu={(e) => handleRightClick(e, file)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <FileIcon sx={{ fontSize: 22, color: isSelected ? '#059669' : '#94a3b8' }} />
                            <Typography sx={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#047857' : '#1e293b' }}>
                              {file.fileName}
                            </Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12.5px' }}>
                          {file.fileSize}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12.5px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{file.lastModified}</span>
                            <IconButton
                              size="small"
                              onClick={(e) => handleRightClick(e, file)}
                              sx={{ color: '#94a3b8', p: 0.25, '&:hover': { color: '#059669' } }}
                            >
                              <MoreVertIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* Grid Mode */
              <Grid container spacing={2}>
                {filteredFiles.map(file => {
                  const isSelected = selectedFile?.id === file.id;
                  return (
                    <Grid key={file.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        elevation={0}
                        onClick={() => setSelectedFile(file)}
                        onDoubleClick={() => handleOpenFile(file)}
                        onContextMenu={(e) => handleRightClick(e, file)}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                          bgcolor: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          '&:hover': { borderColor: '#059669', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.1)' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <FileIcon sx={{ fontSize: 32, color: '#059669' }} />
                          <Box sx={{ overflow: 'hidden' }}>
                            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {file.monthName} {file.year}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                              {file.fileSize} • {file.lastModified}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Box>

        {/* ── Right Details Preview Panel ("What's Inside" Quick Preview) ── */}
        <Box sx={{ width: 300, bgcolor: '#fafafa', p: 2.25, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          {selectedFile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ textAlign: 'center', pb: 2, borderBottom: '1px solid #e2e8f0' }}>
                <FileIcon sx={{ fontSize: 48, color: '#059669', mb: 0.5 }} />
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                  {selectedFile.monthName} {selectedFile.year}
                </Typography>
                <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', mt: 0.25 }}>
                  {selectedFile.fileName}
                </Typography>
              </Box>

              {/* Sample Data Details */}
              <Box sx={{ p: 1.75, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #a7f3d0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', mb: 1.25, letterSpacing: '0.5px' }}>
                  Sample Data Summary
                </Typography>
                <Stack spacing={1.25}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>Total Received:</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#047857' }}>+{selectedFile.totalReceived} vials</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>Total Dispensed:</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#b91c1c' }}>-{selectedFile.totalDispensed} vials</Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Ending Balance:</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>{selectedFile.finalBalance} vials</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>Logged Rows:</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>31 Days Logged</Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Quick Action Buttons */}
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ViewIcon />}
                  onClick={() => handleOpenFile(selectedFile)}
                  sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700, fontSize: 13, py: 1, borderRadius: 1.5 }}
                >
                  Open &amp; View Content
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon sx={{ color: '#059669' }} />}
                  onClick={() => handleDownloadCSV(selectedFile)}
                  sx={{ borderColor: '#059669', color: '#059669', '&:hover': { bgcolor: '#ecfdf5' }, textTransform: 'none', fontWeight: 700, fontSize: 13, py: 1, borderRadius: 1.5 }}
                >
                  Download CSV (Excel Data)
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon sx={{ color: '#059669' }} />}
                  onClick={() => handleSaveAsPDF(selectedFile)}
                  sx={{ borderColor: '#059669', color: '#059669', '&:hover': { bgcolor: '#ecfdf5' }, textTransform: 'none', fontWeight: 700, fontSize: 13, py: 1, borderRadius: 1.5 }}
                >
                  Download Stock Card
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PrintIcon sx={{ color: '#047857' }} />}
                  onClick={() => handlePrintStockCard(selectedFile)}
                  sx={{ borderColor: '#cbd5e1', color: '#334155', '&:hover': { bgcolor: '#f8fafc' }, textTransform: 'none', fontWeight: 700, fontSize: 13, py: 1, borderRadius: 1.5 }}
                >
                  Print Stock Card
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <FileIcon sx={{ fontSize: 44, mb: 1, opacity: 0.4 }} />
              <Typography sx={{ fontSize: 13 }}>Select a file to inspect sample data</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* ── Context Menu Popover (Exact Match with Shortcut Hints) ── */}
      <Menu
        open={contextMenuPos !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenuPos !== null
            ? { top: contextMenuPos.mouseY, left: contextMenuPos.mouseX }
            : undefined
        }
        slotProps={{
          paper: {
            elevation: 4,
            sx: {
              minWidth: 250,
              width: 'auto',
              borderRadius: 1.5,
              py: 0.5,
              border: '1px solid #cbd5e1',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        {contextMenuPos && (
          <Box>
            <MenuItem
              onClick={() => handleOpenFile(contextMenuPos.file)}
              sx={{ fontSize: 12.5, py: 0.85, display: 'flex', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <ViewIcon sx={{ fontSize: 16, color: '#059669' }} />
                <span>Open ("What's Inside")</span>
              </Box>
              <Typography sx={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>Ctrl+O</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleDownloadCSV(contextMenuPos.file)}
              sx={{ fontSize: 12.5, py: 0.85, display: 'flex', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <DownloadIcon sx={{ fontSize: 16, color: '#059669' }} />
                <span>Download CSV (Excel)</span>
              </Box>
              <Typography sx={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>Ctrl+D</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleSaveAsPDF(contextMenuPos.file)}
              sx={{ fontSize: 12.5, py: 0.85, display: 'flex', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <DownloadIcon sx={{ fontSize: 16, color: '#059669' }} />
                <span>Download Stock Card</span>
              </Box>
            </MenuItem>

            <MenuItem
              onClick={() => handleOpenRename(contextMenuPos.file)}
              sx={{ fontSize: 12.5, py: 0.85, display: 'flex', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <RenameIcon sx={{ fontSize: 16, color: '#d97706' }} />
                <span>Rename</span>
              </Box>
              <Typography sx={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>Ctrl+R</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handlePrintStockCard(contextMenuPos.file)}
              sx={{ fontSize: 12.5, py: 0.85, display: 'flex', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <PrintIcon sx={{ fontSize: 16, color: '#059669' }} />
                <span>Print Stock Card</span>
              </Box>
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={() => handleOpenDelete(contextMenuPos.file)}
              sx={{ fontSize: 12.5, py: 0.85, display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <DeleteIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                <span>Delete</span>
              </Box>
              <Typography sx={{ fontSize: 10.5, color: '#f87171', fontFamily: 'monospace' }}>Del</Typography>
            </MenuItem>
          </Box>
        )}
      </Menu>

      {/* ── "WHAT'S INSIDE" STOCK CARD FILE CONTENT VIEWER MODAL ── */}
      {viewerFile && (
        <Dialog
          open={!!viewerFile}
          onClose={() => setViewerFile(null)}
          maxWidth="md"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 2.5, height: 600 } } }}
        >
          <DialogTitle
            sx={{
              m: 0,
              p: 2,
              bgcolor: '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FileIcon sx={{ fontSize: 24 }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
                  File Content: {viewerFile.fileName}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#dcfce7' }}>
                  {activeClinic.name} • {viewerFile.monthName} {viewerFile.year}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setViewerFile(null)} sx={{ color: '#ffffff' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 4, pt: 3.5, pb: 4, bgcolor: '#f1f5f9' }}>
            <Paper elevation={0} sx={{ p: 4, pt: 4, pb: 4, border: '1px solid #94a3b8', bgcolor: '#ffffff', borderRadius: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              {/* Header with Logos & Republic Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, pb: 2, borderBottom: '2px solid #0f172a' }}>
                {/* Left Tagoloan Seal Flag Logo */}
                <Box sx={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src="/assets/Flag_of_Tagoloan,_Misamis_Oriental.png" alt="Tagoloan Municipal Flag Seal" style={{ width: 90, height: 90, objectFit: 'contain' }} />
                </Box>

                {/* Center Text */}
                <Box sx={{ textAlign: 'center', px: 1 }}>
                  <Typography sx={{ fontSize: 11, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.5px' }}>
                    Republic of the Philippines
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.5px' }}>
                    PROVINCE OF MISAMIS ORIENTAL
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                    Municipality of Tagoloan
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, textTransform: 'uppercase', color: '#059669', letterSpacing: '0.5px', mt: 0.25 }}>
                    MUNICIPAL HEALTH OFFICE
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#475569' }}>
                    Tel. No. : (088) 555-4778
                  </Typography>
                </Box>

                {/* Right RHU Health Office Logo */}
                <Box sx={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src="/assets/rhu-logo.png" alt="RHU Health Office Seal" style={{ width: 90, height: 90, objectFit: 'contain' }} />
                </Box>
              </Box>

              {/* Title */}
              <Box sx={{ textAlign: 'center', my: 2.5 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline', color: '#0f172a' }}>
                  STOCK CARD
                </Typography>
              </Box>

              {/* Metadata Fields (matching picture underlines layout) */}
              <Box sx={{ mb: 2.5, fontSize: 12.5, color: '#0f172a' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 0.8fr' }, gap: 2, mb: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12.5, mr: 1, whiteSpace: 'nowrap' }}>
                      Name of vaccine/medicine:
                    </Typography>
                    <Box sx={{ flex: 1, borderBottom: '1px solid #000', pb: 0.25, px: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#059669' }}>
                        {activeItem.vaccine_type}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12.5, mr: 1, whiteSpace: 'nowrap' }}>
                      Month &amp; Year:
                    </Typography>
                    <Box sx={{ flex: 1, borderBottom: '1px solid #000', pb: 0.25, px: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>
                        {viewerFile.monthName} {viewerFile.year}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 0.8fr' }, gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12.5, mr: 1, whiteSpace: 'nowrap' }}>
                      Lot number:
                    </Typography>
                    <Box sx={{ flex: 1, borderBottom: '1px solid #000', pb: 0.25, px: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 12.5, fontFamily: 'monospace' }}>
                        {activeItem.batch_number}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12.5, mr: 1, whiteSpace: 'nowrap' }}>
                      Expiry Date:
                    </Typography>
                    <Box sx={{ flex: 1, borderBottom: '1px solid #000', pb: 0.25, px: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>
                        {activeItem.expiration_date}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Data Table */}
              <TableContainer component={Paper} elevation={0} sx={{ border: '1.5px solid #000', borderRadius: 0, maxHeight: 400 }}>
                <Table stickyHeader size="small" sx={{ '& th, & td': { border: '1px solid #000', padding: '4px 6px', fontSize: '11.5px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell rowSpan={2} sx={{ bgcolor: '#f8fafc', fontWeight: 800, textAlign: 'center', width: '55px' }}>
                        DATE
                      </TableCell>
                      <TableCell colSpan={2} sx={{ bgcolor: '#f8fafc', fontWeight: 800, textAlign: 'center' }}>
                        DELIVERY
                      </TableCell>
                      <TableCell colSpan={3} sx={{ bgcolor: '#f8fafc', fontWeight: 800, textAlign: 'center' }}>
                        OUT FROM FACILITY
                      </TableCell>
                      <TableCell rowSpan={2} sx={{ bgcolor: '#f8fafc', fontWeight: 800, textAlign: 'center', width: '85px' }}>
                        BALANCE
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, textAlign: 'center', width: '110px' }}>
                        Quantity received
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, textAlign: 'center' }}>
                        Received from
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, textAlign: 'center', width: '75px' }}>
                        Dispensed
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, textAlign: 'center', width: '75px' }}>
                        Transferred
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, textAlign: 'center', width: '75px' }}>
                        Expired
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sampleViewerData.map(r => {
                      const hasActivity = r.qtyReceived > 0 || r.dispensed > 0 || r.transferred > 0;
                      return (
                        <TableRow key={r.dayNum} sx={{ bgcolor: hasActivity ? '#f0fdf4' : '#ffffff' }}>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>{r.dayNum}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: r.qtyReceived ? '#047857' : 'inherit', fontWeight: r.qtyReceived ? 700 : 400 }}>{r.qtyReceived || ''}</TableCell>
                          <TableCell sx={{ textAlign: 'left', fontSize: '11px' }}>{r.receivedFrom}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: r.dispensed ? '#b91c1c' : 'inherit', fontWeight: r.dispensed ? 600 : 400 }}>{r.dispensed || ''}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: r.transferred ? '#d97706' : 'inherit', fontWeight: r.transferred ? 600 : 400 }}>{r.transferred || ''}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: r.expired ? '#dc2626' : 'inherit', fontWeight: r.expired ? 600 : 400 }}>{r.expired || ''}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: r.balance <= 10 ? '#d97706' : '#047857' }}>{r.balance}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Ending Balance Row (Matching Picture) */}
                    <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #000' }}>
                      <TableCell sx={{ fontWeight: 800, fontSize: '11px', textAlign: 'center', bgcolor: '#e2e8f0' }}>
                        Ending Balance
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', color: '#047857' }}>
                        +{viewerFile.totalReceived}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11px', fontStyle: 'italic', textAlign: 'left' }}>
                        Monthly Stock Balance Summary
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', color: '#b91c1c' }}>
                        {viewerFile.totalDispensed}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', color: '#d97706' }}>
                        0
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center', color: '#dc2626' }}>
                        0
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, textAlign: 'center', fontSize: '13px', color: '#059669', bgcolor: '#dcfce7' }}>
                        {viewerFile.finalBalance}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </DialogContent>

          <DialogActions sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownloadCSV(viewerFile)}
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700 }}
            >
              Download CSV (Excel Data)
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon sx={{ color: '#059669' }} />}
              onClick={() => handleSaveAsPDF(viewerFile)}
              sx={{ borderColor: '#059669', color: '#059669', '&:hover': { bgcolor: '#ecfdf5' }, textTransform: 'none', fontWeight: 700 }}
            >
              Download Stock Card
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintIcon sx={{ color: '#047857' }} />}
              onClick={() => handlePrintStockCard(viewerFile)}
              sx={{ borderColor: '#cbd5e1', color: '#334155', '&:hover': { bgcolor: '#f8fafc' }, textTransform: 'none', fontWeight: 700 }}
            >
              Print Stock Card
            </Button>
            <Button onClick={() => setViewerFile(null)} sx={{ textTransform: 'none' }}>
              Close Viewer
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Add New File Dialog Modal ── */}
      {isAddModalOpen && (
        <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: '#166534' }}>Create New Stock Card File</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155', mb: 0.5 }}>Target Month</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={newMonthIndex}
                    onChange={e => {
                      const idx = Number(e.target.value);
                      setNewMonthIndex(idx);
                      const pad = String(idx + 1).padStart(2, '0');
                      setNewFileName(`${pad}_${MONTH_NAMES[idx].toLowerCase()}_${currentYear}.scard`);
                    }}
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <MenuItem key={m} value={idx}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155', mb: 0.5 }}>File Name</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsAddModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateNewFile} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none' }}>
              Create File
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Rename Dialog Modal ── */}
      {renameTarget && (
        <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Rename File</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography sx={{ fontSize: 13, color: '#64748b', mb: 1.5 }}>
                Enter new filename for <strong>{renameTarget.monthName} {renameTarget.year}</strong>:
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                autoFocus
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRenameTarget(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirmRename} sx={{ bgcolor: '#059669', textTransform: 'none' }}>Save Rename</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Delete File Confirmation Dialog ── */}
      {deleteTarget && (
        <ConfirmationDialog
          variant="danger"
          title="Delete Stock Card File"
          message={
            <span>
              Are you sure you want to delete <strong>{deleteTarget.fileName}</strong>? This record will be permanently removed from your directory archive.
            </span>
          }
          confirmLabel="Delete File"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Add New Folder Dialog Modal ── */}
      {isAddFolderModalOpen && (
        <Dialog open={isAddFolderModalOpen} onClose={() => setIsAddFolderModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: '#166534' }}>Create New Archive Folder</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155', mb: 0.5 }}>Folder Name</Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. 2027 Stock Cards or Batch Archives"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsAddFolderModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateNewFolder} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none' }}>
              Create Folder
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Delete Folder Confirmation Dialog ── */}
      {deleteFolderTarget && (
        <ConfirmationDialog
          variant="danger"
          title="Delete Archive Folder"
          message={
            <span>
              Are you sure you want to delete archive folder <strong>"{deleteFolderTarget.label}"</strong>? This will remove the directory structure from your system.
            </span>
          }
          confirmLabel="Delete Folder"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))} sx={{ fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );

  if (!isModal) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2.5,
          height: 'calc(100vh - 180px)',
          minHeight: 650,
          width: '100%',
          bgcolor: '#ffffff',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        }}
      >
        {managerContent}
      </Paper>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2.5,
            height: 660,
            maxHeight: '92vh',
            bgcolor: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 25px 35px -5px rgba(5, 150, 105, 0.15), 0 15px 15px -5px rgba(0, 0, 0, 0.08)',
          },
        },
      }}
    >
      {managerContent}
    </Dialog>
  );
}
