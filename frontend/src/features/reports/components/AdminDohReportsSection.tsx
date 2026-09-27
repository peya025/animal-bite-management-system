import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { PrintOutlined } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { resolvePrintLogoUrls } from '../../../components/print/printHeaderHelper';
import { waitForPrintImages } from '../../../components/print/printReady';

type ReportType = 'exposure-registry' | 'monthly' | 'cohort';

const reports: Record<ReportType, { title: string; frequency: string; orientation: string; description: string }> = {
  'exposure-registry': {
    title: 'Rabies Exposure Registry',
    frequency: 'Weekly',
    orientation: 'Landscape',
    description: 'Weekly breakdown of human demographics, age groups (under 15 and 15+), Category I–III exposures, TCV and RIG doses, and animal types (dog, cat, others).',
  },
  monthly: {
    title: 'ABTC Monthly Report',
    frequency: 'Monthly',
    orientation: 'Landscape',
    description: 'Official NRPCP monthly report summarizing cases by sex, exposure categories, completed vaccinations, RIG administered, and completion rate.',
  },
  cohort: {
    title: 'Cohort Report (Quarterly)',
    frequency: 'Quarterly',
    orientation: 'Portrait',
    description: 'Quarterly cohort matrix evaluating PEP cases, completions, RIG administration, and completion rates across Q1–Q4 and the annual total.',
  },
};

const reportOrder: ReportType[] = ['exposure-registry', 'monthly', 'cohort'];
const now = new Date();
const currentYear = now.getFullYear();
const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
const today = localDate(now);
const currentMonth = today.slice(0, 7);

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function quarterDates(year: number, quarter: number) {
  const start = localDate(new Date(year, (quarter - 1) * 3, 1));
  const end = localDate(new Date(year, quarter * 3, 0));
  return { from: start, to: end > today ? today : end, end };
}

async function fetchPrintHtml(type: ReportType, query: string, signal?: AbortSignal) {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const response = await fetch(`${apiBase}/print/reports/${type}?${query}`, {
    headers: { Accept: 'text/html', Authorization: `Bearer ${token}` },
    signal,
  });
  const rawHtml = await response.text();
  const cleanHtml = rawHtml
    .replace(/<div class="[^"]*no-print-bar[^"]*">[\s\S]*?<\/div>/gi, '')
    .replace(/<button class="btn-print"[^>]*>[\s\S]*?<\/button>/gi, '');
  return resolvePrintLogoUrls(cleanHtml);
}

export default function AdminDohReportsSection() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType>('exposure-registry');
  const [registryQuarter, setRegistryQuarter] = useState(currentQuarter);
  const [registryYear, setRegistryYear] = useState(currentYear);
  const [registryFrom, setRegistryFrom] = useState(quarterDates(currentYear, currentQuarter).from);
  const [registryTo, setRegistryTo] = useState(quarterDates(currentYear, currentQuarter).to);
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);
  const [cohortYear, setCohortYear] = useState(currentYear);
  const [printLoading, setPrintLoading] = useState(false);
  const [previewRefresh, setPreviewRefresh] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; html: string; error: string | null } | null>(null);

  const registryBounds = quarterDates(registryYear, registryQuarter);
  const registryValid = registryFrom >= registryBounds.from && registryFrom <= registryTo
    && registryTo <= registryBounds.end && registryTo <= today;
  const validSelection = selectedReport === 'exposure-registry'
    ? registryValid
    : selectedReport === 'monthly' ? Boolean(monthlyMonth && monthlyMonth <= currentMonth) : Boolean(cohortYear);
  const selected = reports[selectedReport];
  const params: Record<string, string | number> = selectedReport === 'exposure-registry'
    ? { from: registryFrom, to: registryTo, quarter: `${registryQuarter}${['st', 'nd', 'rd', 'th'][registryQuarter - 1]}`, year: registryYear }
    : selectedReport === 'monthly' ? { month: monthlyMonth } : { year: cohortYear };
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
  const previewKey = `${selectedReport}?${query}`;
  const currentPreview = preview?.key === previewKey ? preview : null;
  const previewHtml = validSelection ? currentPreview?.html || '' : '';
  const previewError = validSelection ? currentPreview?.error : null;
  const previewLoading = validSelection && !currentPreview;

  useEffect(() => {
    if (user?.role !== 'admin' || !validSelection) return;
    const controller = new AbortController();
    void fetchPrintHtml(selectedReport, query, controller.signal)
      .then(html => {
        if (!controller.signal.aborted) setPreview({ key: previewKey, html, error: null });
      })
      .catch(error => {
        if (!controller.signal.aborted) setPreview({ key: previewKey, html: '', error: error instanceof Error ? error.message : 'Unable to load the report preview.' });
      });
    return () => controller.abort();
  }, [user?.role, selectedReport, query, previewKey, validSelection, previewRefresh]);

  if (user?.role !== 'admin') return null;

  const updateRegistryPeriod = (year: number, quarter: number) => {
    const dates = quarterDates(year, quarter);
    setRegistryYear(year);
    setRegistryQuarter(quarter);
    setRegistryFrom(dates.from);
    setRegistryTo(dates.to);
  };

  const printReport = async () => {
    setErrorMsg(null);
    setPrintLoading(true);
    let iframe: HTMLIFrameElement | null = null;
    try {
      const html = await fetchPrintHtml(selectedReport, query);
      iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
      document.body.appendChild(iframe);
      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) throw new Error('Unable to prepare the print view.');
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      await new Promise(resolve => window.setTimeout(resolve, 400));
      await waitForPrintImages(frameDoc);
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe?.remove(), 2000);
    } catch (error) {
      iframe?.remove();
      setErrorMsg(error instanceof Error ? error.message : 'Unable to print the report.');
    } finally {
      setPrintLoading(false);
    }
  };

  return (
    <Box component="section" aria-label="DOH submissions" sx={{ mb: 4 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
        {reportOrder.map(type => {
          const report = reports[type];
          const active = selectedReport === type;
          return (
            <ButtonBase
              key={type}
              component="button"
              type="button"
              aria-pressed={active}
              disabled={printLoading}
              onClick={() => { setSelectedReport(type); setErrorMsg(null); }}
              sx={{
                display: 'block', textAlign: 'left', width: '100%', minHeight: 76, p: 1.75,
                border: '1px solid', borderColor: active ? 'success.main' : 'divider',
                borderRadius: 2, bgcolor: active ? 'rgba(5, 150, 105, 0.07)' : 'background.paper',
                '&:hover': { borderColor: 'success.main' },
                '&:focus-visible': { outline: '2px solid #059669', outlineOffset: 2 },
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, color: 'text.primary' }}>{report.title}</Typography>
              <Typography variant="caption" color="text.secondary">{report.frequency} · {report.orientation}</Typography>
            </ButtonBase>
          );
        })}
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {selectedReport === 'exposure-registry' && (
              <>
                <TextField select size="small" label="Quarter" value={registryQuarter} onChange={event => { updateRegistryPeriod(registryYear, Number(event.target.value)); setErrorMsg(null); }} sx={{ minWidth: 85 }}>
                  {[1, 2, 3, 4].map(quarter => <MenuItem key={quarter} value={quarter} disabled={registryYear === currentYear && quarter > currentQuarter}>Q{quarter}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Year" value={registryYear} onChange={event => { updateRegistryPeriod(Number(event.target.value), Math.min(registryQuarter, Number(event.target.value) === currentYear ? currentQuarter : 4)); setErrorMsg(null); }} sx={{ minWidth: 95 }}>
                  {Array.from({ length: 5 }, (_, index) => currentYear - index).map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                </TextField>
                <TextField size="small" type="date" label="From" value={registryFrom} onChange={event => { setRegistryFrom(event.target.value); setErrorMsg(null); }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 140 }} />
                <TextField size="small" type="date" label="To" value={registryTo} onChange={event => { setRegistryTo(event.target.value); setErrorMsg(null); }} error={!registryValid} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 140 }} />
              </>
            )}
            {selectedReport === 'monthly' && (
              <TextField size="small" type="month" label="Reporting month" value={monthlyMonth} onChange={event => { setMonthlyMonth(event.target.value); setErrorMsg(null); }} error={!validSelection} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 180 }} />
            )}
            {selectedReport === 'cohort' && (
              <TextField select size="small" label="Calendar year" value={cohortYear} onChange={event => { setCohortYear(Number(event.target.value)); setErrorMsg(null); }} sx={{ minWidth: 140 }}>
                {Array.from({ length: 5 }, (_, index) => currentYear - index).map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
              </TextField>
            )}
            <Button variant="contained" startIcon={printLoading ? <CircularProgress size={16} color="inherit" /> : <PrintOutlined />} disabled={!validSelection || printLoading} onClick={() => void printReport()} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap', height: 40 }}>
              Print report
            </Button>
          </Box>
        </Box>
        {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mx: { xs: 2, md: 2.5 }, mb: 2 }}>{errorMsg}</Alert>}
        {previewError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => { setPreview(null); setPreviewRefresh(value => value + 1); }}>Retry</Button>} sx={{ mx: { xs: 2, md: 2.5 }, mb: 2 }}>{previewError}</Alert>}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {previewHtml ? <iframe
            id="doh-preview-iframe"
            title={`${selected.title} preview`}
            srcDoc={previewHtml}
            style={{ width: '100%', height: 640, border: 0, backgroundColor: '#fff' }}
          /> : <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}>
            {previewLoading ? <CircularProgress size={28} aria-label="Loading report preview" /> : <Typography variant="body2" color="text.secondary">{previewError ? 'The report preview could not be loaded.' : 'Choose a valid reporting period.'}</Typography>}
          </Box>}
        </Box>
      </Box>
    </Box>
  );
}
