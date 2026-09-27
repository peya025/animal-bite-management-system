import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, MenuItem, Pagination, Paper, Skeleton,
  Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Typography,
} from '@mui/material';
import { DownloadOutlined, Refresh, ArrowForward } from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';
import AdminDohReportsSection from '../components/AdminDohReportsSection';

type Section = 'overview' | 'trends' | 'doh';
type Report = 'surveillance' | 'pep' | 'followup' | 'awaiting' | 'referrals';
type Filters = { from: string; to: string; category: 'ALL' | 'I' | 'II' | 'III' };
type CountRow = { label: string; count: number };
type RecordRow = Record<string, string | number | null>;

interface ReportResponse {
  period: Filters & { as_of: string };
  meta: { title: string; basis: string; notes: string[] };
  stats: {
    patients: number;
    incidents: number;
    pep_starts: number;
    completion: { eligible: number; completed: number; rate: number | null; excluded: number };
    overdue_patients: number;
    overdue_doses: number;
    awaiting_d0: number;
    delay: { average: number | null; samples: number };
  };
  months: { month: string; I: number; II: number; III: number }[];
  breakdowns: { barangays: CountRow[]; animals: CountRow[]; ages: CountRow[] };
  records: {
    columns: Record<string, string>;
    rows: RecordRow[];
    total: number;
    page: number;
    last_page: number;
  };
}

interface InventoryStats {
  low_stock: number;
  expiring_soon: number;
  expired_batches: number;
  total_stock: number;
}

const reportLabels: Record<Report, string> = {
  surveillance: 'Bite episodes',
  pep: 'PEP outcomes',
  followup: 'Overdue doses',
  awaiting: 'Awaiting first dose',
  referrals: 'Referrals',
};
const reportOrder: Report[] = ['surveillance', 'pep', 'followup', 'awaiting', 'referrals'];

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function periodDates(period: string): Pick<Filters, 'from' | 'to'> {
  const now = new Date();
  const to = dateString(now);
  if (period === 'today') return { from: to, to };
  if (period === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return { from: dateString(start), to };
  }
  if (period === 'last30') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 29);
    return { from: dateString(start), to };
  }
  if (period === 'year') return { from: `${now.getFullYear()}-01-01`, to };
  return { from: dateString(new Date(now.getFullYear(), now.getMonth(), 1)), to };
}

const initialFilters = (): Filters => ({ ...periodDates('month'), category: 'ALL' });
const panelSx = { border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: 'none', bgcolor: 'background.paper' };

function Metric({ label, value, detail, onClick }: { label: string; value: string | number; detail: string; onClick?: () => void }) {
  return (
    <Paper component={onClick ? 'button' : 'div'} onClick={onClick} elevation={0} sx={{
      ...panelSx, display: 'block', width: '100%', p: 2, textAlign: 'left', font: 'inherit',
      appearance: 'none', color: 'inherit', cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { borderColor: 'success.main' } : undefined,
    }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 28, lineHeight: 1.3, fontWeight: 700, color: 'text.primary', my: 0.5 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{detail}</Typography>
    </Paper>
  );
}

function Breakdown({ title, rows, limit = 6 }: { title: string; rows: CountRow[]; limit?: number }) {
  const visible = rows.slice(0, limit);
  const max = Math.max(1, ...visible.map(row => row.count));
  return <Paper elevation={0} sx={{ ...panelSx, p: 2.5 }}>
    <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>{title}</Typography>
    {visible.length === 0 || visible.every(row => row.count === 0) ? <Typography variant="body2" color="text.secondary">No recorded cases in this period.</Typography> : (
      <Stack spacing={1.5}>
        {visible.map(row => <Box key={row.label}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
            <Typography variant="body2">{row.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.count}</Typography>
          </Box>
          <Box sx={{ height: 7, borderRadius: 4, bgcolor: 'action.hover' }}>
            <Box sx={{ width: `${row.count / max * 100}%`, height: '100%', borderRadius: 4, bgcolor: '#1D9E75' }} />
          </Box>
        </Box>)}
      </Stack>
    )}
  </Paper>;
}

function CategoryTrend({ months }: { months: ReportResponse['months'] }) {
  const max = Math.max(1, ...months.map(month => month.I + month.II + month.III));
  return <Paper elevation={0} sx={{ ...panelSx, p: 2.5 }}>
    <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700 }}>Exposure categories over time</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Bite episodes by incident month</Typography>
    {months.every(month => month.I + month.II + month.III === 0) ? <Typography variant="body2" color="text.secondary">No recorded cases in this period.</Typography> : <>
      <Box sx={{ display: 'flex', alignItems: 'end', gap: 1.5, overflowX: 'auto', minHeight: 176, pb: 1 }} role="img" aria-label="Stacked bars show category I, II, and III bite episodes by month. Exact counts follow below.">
        {months.map(month => <Box key={month.month} sx={{ flex: '1 0 64px', minWidth: 64, textAlign: 'center' }}>
          <Box title={`${month.month}: I ${month.I}, II ${month.II}, III ${month.III}`} sx={{ height: 132, display: 'flex', flexDirection: 'column', justifyContent: 'end' }}>
            <Box sx={{ height: `${month.III / max * 132}px`, bgcolor: '#C96363', borderRadius: '3px 3px 0 0' }} />
            <Box sx={{ height: `${month.II / max * 132}px`, bgcolor: '#E3AD53' }} />
            <Box sx={{ height: `${month.I / max * 132}px`, bgcolor: '#1D9E75' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">{month.month}</Typography>
        </Box>)}
      </Box>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mb: 1 }}>
        {[['#1D9E75', 'Category I'], ['#E3AD53', 'Category II'], ['#C96363', 'Category III']].map(([color, label]) =>
          <Typography key={label} variant="caption" color="text.secondary"><Box component="span" sx={{ display: 'inline-block', width: 9, height: 9, mr: 0.5, bgcolor: color }} />{label}</Typography>)}
      </Stack>
      <Box component="details" sx={{ fontSize: 12, color: 'text.secondary', '& summary': { cursor: 'pointer' } }}>
        <summary>View exact monthly counts</summary>
        <Table size="small" aria-label="Monthly exposure category counts"><TableHead><TableRow><TableCell>Month</TableCell><TableCell>I</TableCell><TableCell>II</TableCell><TableCell>III</TableCell></TableRow></TableHead>
          <TableBody>{months.map(month => <TableRow key={month.month}><TableCell>{month.month}</TableCell><TableCell>{month.I}</TableCell><TableCell>{month.II}</TableCell><TableCell>{month.III}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Box>
    </>}
  </Paper>;
}

export default function AdminReportsPage() {
  const [section, setSection] = useState<Section>('overview');
  const [preset, setPreset] = useState('month');
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<ReportResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [followup, setFollowup] = useState<ReportResponse | null>(null);
  const [followupLoading, setFollowupLoading] = useState(true);
  const [followupError, setFollowupError] = useState('');
  const [inventory, setInventory] = useState<InventoryStats | null>(null);
  const [inventoryError, setInventoryError] = useState('');
  const [report, setReport] = useState<Report>('surveillance');
  const [reportPage, setReportPage] = useState(1);
  const [records, setRecords] = useState<ReportResponse | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [exporting, setExporting] = useState(false);

  const today = dateString(new Date());
  const valid = Boolean(draft.from && draft.to && draft.from <= draft.to && draft.to <= today);
  const dirty = JSON.stringify(draft) !== JSON.stringify(filters);

  useEffect(() => {
    const controller = new AbortController();
    api.get<ReportResponse>('/reports/registration', { params: { ...filters, report: 'summary' }, signal: controller.signal })
      .then(response => { setSummary(response.data); setSummaryError(''); })
      .catch(() => { if (!controller.signal.aborted) setSummaryError('Unable to load clinic analytics. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setSummaryLoading(false); });
    return () => controller.abort();
  }, [filters, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    api.get<ReportResponse>('/reports/registration', { params: { ...periodDates('month'), category: filters.category, report: 'followup', per_page: 5 }, signal: controller.signal })
      .then(response => { setFollowup(response.data); setFollowupError(''); })
      .catch(() => { if (!controller.signal.aborted) { setFollowup(null); setFollowupError('Unable to load the follow-up list.'); } })
      .finally(() => { if (!controller.signal.aborted) setFollowupLoading(false); });
    return () => controller.abort();
  }, [filters.category, refresh]); // Current follow-up spans all incident dates; only category changes this list.

  useEffect(() => {
    const controller = new AbortController();
    api.get<InventoryStats>('/inventory/statistics', { signal: controller.signal })
      .then(response => { setInventory(response.data); setInventoryError(''); })
      .catch(() => { if (!controller.signal.aborted) setInventoryError('Unable to load stock status.'); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (section !== 'trends') return;
    const controller = new AbortController();
    api.get<ReportResponse>('/reports/registration', { params: { ...filters, report, page: reportPage }, signal: controller.signal })
      .then(response => { setRecords(response.data); setRecordsError(''); })
      .catch(() => { if (!controller.signal.aborted) setRecordsError('Unable to load records. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setRecordsLoading(false); });
    return () => controller.abort();
  }, [section, filters, report, reportPage, refresh]);

  const selectReport = (next: Report) => {
    if (next === report && reportPage === 1 && section === 'trends') return;
    setRecordsError('');
    setReport(next);
    setReportPage(1);
    setRecords(null);
    setRecordsLoading(true);
  };
  const openReport = (next: Report) => {
    selectReport(next);
    setSection('trends');
  };
  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || !dirty) return;
    setSummaryLoading(true);
    setSummaryError('');
    setSummary(null);
    if (draft.category !== filters.category) {
      setFollowup(null);
      setFollowupLoading(true);
    }
    setRecordsLoading(true);
    setRecords(null);
    setReportPage(1);
    setFilters(draft);
  };
  const resetFilters = () => {
    const next = initialFilters();
    const changed = JSON.stringify(next) !== JSON.stringify(filters);
    setPreset('month');
    setDraft(next);
    setFilters(next);
    setReportPage(1);
    if (changed) {
      setSummaryError('');
      setRecordsError('');
      setSummary(null);
      setSummaryLoading(true);
      if (next.category !== filters.category) {
        setFollowup(null);
        setFollowupLoading(true);
      }
      setRecords(null);
      setRecordsLoading(true);
    }
  };
  const exportCsv = async () => {
    setExporting(true);
    setRecordsError('');
    try {
      const response = await api.get('/reports/registration', { params: { ...filters, report, format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clinic-${report}-${filters.from}-${filters.to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setRecordsError('Unable to export these records. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const selectedColumns = records ? Object.keys(records.records.columns) : [];
  const recordIsCurrent = records?.meta.title === ({ surveillance: 'Bite Surveillance', pep: 'PEP Treatment Outcomes', followup: 'Overdue Doses & Follow-up', awaiting: 'Awaiting First Dose', referrals: 'Referrals & Transfers' } as Record<Report, string>)[report];

  return <Box sx={{ px: { xs: 1, sm: 3 }, pb: 4 }}>
    <Box sx={{ mb: 3 }}>
      <Typography component="h1" sx={{ fontSize: 24, fontWeight: 700, color: 'text.primary' }}>Reports &amp; Analytics</Typography>
      <Typography variant="body2" color="text.secondary">Clinic actions, case trends, and DOH submission reports</Typography>
      <Typography variant="caption" color="text.secondary">
        <Box component={RouterLink} to={ROUTES.DASHBOARD} sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Box>
        {' › Reports & Analytics'}
      </Typography>
    </Box>

    <Tabs value={section} onChange={(_, value: Section) => setSection(value)} variant="scrollable" allowScrollButtonsMobile aria-label="Administrator report sections" sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tab value="overview" label="Clinic overview" />
      <Tab value="trends" label="Trends & records" />
      <Tab value="doh" label="DOH submissions" />
    </Tabs>

    {section !== 'doh' && <Paper component="form" onSubmit={applyFilters} elevation={0} sx={{ ...panelSx, p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Period" value={preset} onChange={event => {
          const next = event.target.value;
          setPreset(next);
          if (next !== 'custom') setDraft(current => ({ ...current, ...periodDates(next) }));
        }} sx={{ minWidth: 145 }}>
          <MenuItem value="today">Today</MenuItem><MenuItem value="week">This week</MenuItem><MenuItem value="month">This month</MenuItem>
          <MenuItem value="last30">Last 30 days</MenuItem><MenuItem value="year">This year</MenuItem><MenuItem value="custom">Custom range</MenuItem>
        </TextField>
        <TextField size="small" type="date" label="From" value={draft.from} onChange={event => { setDraft(current => ({ ...current, from: event.target.value })); setPreset('custom'); }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={draft.to} onChange={event => { setDraft(current => ({ ...current, to: event.target.value })); setPreset('custom'); }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField select size="small" label="Exposure category" value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value as Filters['category'] }))} sx={{ minWidth: 170 }}>
          <MenuItem value="ALL">All categories</MenuItem><MenuItem value="I">Category I</MenuItem><MenuItem value="II">Category II</MenuItem><MenuItem value="III">Category III</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" disableElevation disabled={!valid || !dirty}>Apply</Button>
        <Button type="button" onClick={resetFilters}>Reset</Button>
        <Button type="button" aria-label="Refresh report data" onClick={() => { setSummaryLoading(true); setFollowupLoading(true); setRecordsLoading(true); setRefresh(value => value + 1); }} sx={{ ml: { sm: 'auto' } }} startIcon={<Refresh />}>Refresh</Button>
      </Box>
      {!valid && <Typography role="alert" variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>Enter a valid range ending today or earlier.</Typography>}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Showing {filters.from} to {filters.to} · {filters.category === 'ALL' ? 'all categories' : `Category ${filters.category}`}. Incident trends use bite dates; completion uses D0 dates. Follow-up and stock are current snapshots.
      </Typography>
    </Paper>}

    {section !== 'doh' && summaryError && <Alert severity="error" action={<Button color="inherit" onClick={() => setRefresh(value => value + 1)}>Retry</Button>} sx={{ mb: 2 }}>{summaryError}</Alert>}

    {section === 'overview' && <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2, mb: 2 }}>
        <Box><Typography component="h2" sx={{ fontSize: 19, fontWeight: 700 }}>Clinic overview</Typography>
          <Typography variant="body2" color="text.secondary">What needs attention and how treatment is progressing</Typography></Box>
        <Typography variant="caption" color="text.secondary">Current actions as of {summary?.period.as_of || today}</Typography>
      </Box>
      {summaryLoading && !summary ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>{[1, 2, 3, 4].map(item => <Skeleton key={item} variant="rounded" height={125} />)}</Box> : summary && <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 3 }}>
          <Metric label="Bite episodes" value={summary.stats.incidents} detail="Incident dates in selected period" onClick={() => openReport('surveillance')} />
          <Metric label="Eligible PEP completion" value={summary.stats.completion.rate === null ? '—' : `${summary.stats.completion.rate}%`} detail={`${summary.stats.completion.completed} of ${summary.stats.completion.eligible} eligible D0 courses`} onClick={() => openReport('pep')} />
          <Metric label="Patients with overdue doses" value={summary.stats.overdue_patients} detail="Current, across all incident dates" onClick={() => openReport('followup')} />
          <Metric label="Awaiting first dose" value={summary.stats.awaiting_d0} detail="Ordered regimen, no recorded D0" onClick={() => openReport('awaiting')} />
        </Box>
        {(summary.stats.overdue_patients > 0 || summary.stats.awaiting_d0 > 0) && <Alert severity="warning" sx={{ mb: 3 }}>
          Follow-up needed: {summary.stats.overdue_patients} patient(s) with overdue doses and {summary.stats.awaiting_d0} episode(s) awaiting a recorded first dose.
        </Alert>}
      </>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(270px, 1fr)' }, gap: 2 }}>
        <Paper elevation={0} sx={{ ...panelSx, p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Box><Typography component="h3" sx={{ fontSize: 16, fontWeight: 700 }}>Overdue dose follow-up</Typography>
              <Typography variant="body2" color="text.secondary">First five overdue dose records · {filters.category === 'ALL' ? 'all categories' : `Category ${filters.category}`}</Typography></Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button size="small" onClick={() => openReport('followup')} endIcon={<ArrowForward />}>View all</Button>
              <Button component={RouterLink} to={ROUTES.PATIENTS.NURSE_LIST} size="small" variant="outlined">Open follow-up station</Button>
            </Stack>
          </Box>
          {followupError && <Alert severity="warning" sx={{ mb: 1 }}>{followupError}</Alert>}
          {followupLoading && !followup ? <Skeleton variant="rounded" height={160} /> : followup?.records.rows.length ? <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Overdue dose follow-up"><TableHead><TableRow><TableCell>Patient</TableCell><TableCell>Due dose</TableCell><TableCell>Days overdue</TableCell><TableCell>Contact</TableCell><TableCell>Reminder</TableCell></TableRow></TableHead>
              <TableBody>{followup.records.rows.map((row, index) => <TableRow key={`${row.case_number}-${row.dose}-${index}`}>
                <TableCell>{row.patient}</TableCell><TableCell>{row.dose}</TableCell><TableCell>{row.days_overdue}</TableCell>
                <TableCell>{row.contact || 'Not recorded'}</TableCell><TableCell>{row.reminder_status || 'Not recorded'}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </TableContainer> : !followupError && <Typography variant="body2" color="text.secondary">No overdue prescribed doses currently recorded for this category.</Typography>}
        </Paper>
        <Paper elevation={0} sx={{ ...panelSx, p: 2.5 }}>
          <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>Vaccine stock</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Current batch exceptions</Typography>
          {inventoryError && <Alert severity="warning" sx={{ mb: 2 }}>{inventoryError}</Alert>}
          {inventory ? <Stack spacing={1.3} sx={{ mb: 2 }}>
            <Typography variant="body2"><b>{inventory.low_stock}</b> low-stock batches</Typography>
            <Typography variant="body2"><b>{inventory.expiring_soon}</b> expiring within 30 days</Typography>
            <Typography variant="body2"><b>{inventory.expired_batches}</b> expired batches</Typography>
          </Stack> : !inventoryError && <Skeleton variant="rounded" height={95} sx={{ mb: 2 }} />}
          <Button component={RouterLink} to={ROUTES.INVENTORY.LIST} variant="outlined" size="small" endIcon={<ArrowForward />}>Open inventory</Button>
        </Paper>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Overdue means a prescribed dose is past its due date. Reminder status records a send attempt; it does not confirm patient contact or loss to follow-up.</Typography>
    </>}

    {section === 'trends' && <>
      <Typography component="h2" sx={{ fontSize: 19, fontWeight: 700, mb: 0.5 }}>Trends & records</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Review bite patterns, treatment outcomes, and the records behind them.</Typography>
      {summaryLoading && !summary ? <Skeleton variant="rounded" height={230} sx={{ mb: 2 }} /> : summary && <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' }, gap: 2, mb: 2 }}>
          <CategoryTrend months={summary.months} />
          <Breakdown title="Recorded incident barangays" rows={summary.breakdowns.barangays} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <Breakdown title="Animal type" rows={summary.breakdowns.animals} />
          <Paper elevation={0} sx={{ ...panelSx, p: 2.5 }}>
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>Treatment measure</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700 }}>{summary.stats.completion.rate === null ? 'Not available' : `${summary.stats.completion.rate}%`}</Typography>
            <Typography variant="body2" color="text.secondary">{summary.stats.completion.completed} completed of {summary.stats.completion.eligible} eligible D0 courses in the selected period.</Typography>
            <Typography variant="caption" color="text.secondary">{summary.stats.completion.excluded} D0 course(s) outside the denominator. Outcomes observed as of {summary.period.as_of}.</Typography>
          </Paper>
        </Box>
      </>}

      <Paper elevation={0} sx={{ ...panelSx, p: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700 }}>Clinic records</Typography>
          <Button variant="outlined" size="small" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadOutlined />} disabled={!recordIsCurrent || recordsLoading || exporting} onClick={() => void exportCsv()}>Export CSV</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
          {reportOrder.map(type => <Button key={type} size="small" variant={type === report ? 'contained' : 'outlined'} disableElevation onClick={() => selectReport(type)}>{reportLabels[type]}</Button>)}
        </Box>
        {recordsError && <Alert severity="error" sx={{ mb: 2 }}>{recordsError}</Alert>}
        {(recordsLoading || !recordIsCurrent) && <Skeleton variant="rounded" height={180} />}
        {!recordsLoading && recordIsCurrent && records && <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{records.meta.basis}</Typography>
          <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" aria-label={`${reportLabels[report]} records`}>
            <TableHead><TableRow>{selectedColumns.map(key => <TableCell key={key} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{records.records.columns[key]}</TableCell>)}</TableRow></TableHead>
            <TableBody>{records.records.rows.map((row, index) => <TableRow key={`${row.case_number ?? report}-${index}`} hover>
              {selectedColumns.map(key => <TableCell key={key} sx={{ whiteSpace: 'nowrap' }}>{row[key] === null || row[key] === '' ? 'Not available' : String(row[key])}</TableCell>)}
            </TableRow>)}</TableBody>
          </Table></TableContainer>
          {records.records.rows.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No records for this selection.</Typography>}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            <Typography variant="caption" color="text.secondary">{records.records.total} record(s)</Typography>
            {records.records.last_page > 1 && <Pagination count={records.records.last_page} page={records.records.page} onChange={(_, page) => { setReportPage(page); setRecordsLoading(true); }} size="small" />}
          </Box>
        </>}
      </Paper>
    </>}

    {section === 'doh' && <AdminDohReportsSection />}
  </Box>;
}
