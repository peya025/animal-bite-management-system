import { useState } from 'react';
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
import { PrintOutlined, VisibilityOutlined } from '@mui/icons-material';
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

export default function AdminDohReportsSection() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType>('exposure-registry');
  const [registryQuarter, setRegistryQuarter] = useState(currentQuarter);
  const [registryYear, setRegistryYear] = useState(currentYear);
  const [registryFrom, setRegistryFrom] = useState(quarterDates(currentYear, currentQuarter).from);
  const [registryTo, setRegistryTo] = useState(quarterDates(currentYear, currentQuarter).to);
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);
  const [cohortYear, setCohortYear] = useState(currentYear);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  if (user?.role !== 'admin') return null;

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

  const updateRegistryPeriod = (year: number, quarter: number) => {
    const dates = quarterDates(year, quarter);
    setRegistryYear(year);
    setRegistryQuarter(quarter);
    setRegistryFrom(dates.from);
    setRegistryTo(dates.to);
  };

  const fetchPrintHtml = async (type: ReportType, queryParams: Record<string, string | number>) => {
    const query = new URLSearchParams(Object.entries(queryParams).map(([key, value]) => [key, String(value)])).toString();
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
    const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${apiBase}/print/reports/${type}?${query}`, {
      headers: { Accept: 'text/html', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Unable to load report (HTTP ${response.status}). Please try again.`);
    return resolvePrintLogoUrls(await response.text());
  };

  const previewReport = async () => {
    setErrorMsg(null);
    setLoadingType('preview');
    try {
      const html = await fetchPrintHtml(selectedReport, params);
      setPreviewTitle(selected.title);
      setPreviewHtml(html);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to load the report preview.');
    } finally {
      setLoadingType(null);
    }
  };

  const printReport = async () => {
    setErrorMsg(null);
    setLoadingType('print');
    let iframe: HTMLIFrameElement | null = null;
    try {
      const html = await fetchPrintHtml(selectedReport, params);
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
      setLoadingType(null);
    }
  };

  return (
    <Box component="section" aria-labelledby="doh-reports-title" sx={{ mb: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography id="doh-reports-title" component="h2" sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary' }}>
          DOH submission reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a clinic report, set its reporting period, then preview or print it. These periods are separate from the analytics filter.
        </Typography>
      </Box>

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
              disabled={loadingType !== null}
              onClick={() => { setSelectedReport(type); setPreviewHtml(''); setErrorMsg(null); }}
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

      <Box sx={{ p: { xs: 2, md: 2.5 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{selected.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selected.description}</Typography>

        {selectedReport === 'exposure-registry' && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
              <TextField select size="small" label="Quarter" value={registryQuarter} onChange={event => { updateRegistryPeriod(registryYear, Number(event.target.value)); setPreviewHtml(''); }}>
                {[1, 2, 3, 4].map(quarter => <MenuItem key={quarter} value={quarter} disabled={registryYear === currentYear && quarter > currentQuarter}>Q{quarter}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Year" value={registryYear} onChange={event => { updateRegistryPeriod(Number(event.target.value), Math.min(registryQuarter, Number(event.target.value) === currentYear ? currentQuarter : 4)); setPreviewHtml(''); }}>
                {Array.from({ length: 5 }, (_, index) => currentYear - index).map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="From" value={registryFrom} onChange={event => { setRegistryFrom(event.target.value); setPreviewHtml(''); }} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="date" label="To" value={registryTo} onChange={event => { setRegistryTo(event.target.value); setPreviewHtml(''); }} slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            <Typography variant="caption" color={registryValid ? 'text.secondary' : 'error.main'} sx={{ display: 'block', mt: 1 }}>
              {registryValid ? 'Report rows are grouped by calendar week.' : 'Choose dates in the selected quarter, ending today or earlier.'}
            </Typography>
          </>
        )}
        {selectedReport === 'monthly' && (
          <TextField size="small" type="month" label="Reporting month" value={monthlyMonth} onChange={event => { setMonthlyMonth(event.target.value); setPreviewHtml(''); }} error={!validSelection} helperText={!validSelection ? 'Choose this month or an earlier month.' : undefined} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 220, maxWidth: '100%' }} />
        )}
        {selectedReport === 'cohort' && (
          <TextField select size="small" label="Calendar year" value={cohortYear} onChange={event => { setCohortYear(Number(event.target.value)); setPreviewHtml(''); }} sx={{ minWidth: 220, maxWidth: '100%' }}>
            {Array.from({ length: 5 }, (_, index) => currentYear - index).map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
          </TextField>
        )}

        {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mt: 2 }}>{errorMsg}</Alert>}
        <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, flexWrap: 'wrap', gap: 1, mt: 2.5 }}>
          <Button variant="outlined" startIcon={loadingType === 'preview' ? <CircularProgress size={16} /> : <VisibilityOutlined />} disabled={!validSelection || loadingType !== null} onClick={() => void previewReport()} sx={{ flex: { xs: 1, sm: 'none' } }}>
            Preview
          </Button>
          <Button variant="contained" startIcon={loadingType === 'print' ? <CircularProgress size={16} color="inherit" /> : <PrintOutlined />} disabled={!validSelection || loadingType !== null} onClick={() => void printReport()} sx={{ flex: { xs: 1, sm: 'none' }, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
            Print report
          </Button>
        </Box>
      </Box>

      <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700 }}>{previewHtml ? `${previewTitle} preview` : 'Form preview'}</Typography>
            <Typography variant="caption" color="text.secondary">The preview uses the same clinic form as printing.</Typography>
          </Box>
        </Box>
        {previewHtml ? <iframe
          id="doh-preview-iframe"
          title={`${previewTitle} preview`}
          srcDoc={previewHtml}
          style={{ width: '100%', height: 640, border: 0, backgroundColor: '#fff' }}
        /> : <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Choose a report and select Preview to review it here before printing.</Typography>
        </Box>}
      </Box>
    </Box>
  );
}
