import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Pagination, Paper, Skeleton, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DownloadOutlined, PrintOutlined, ArrowForward, Refresh } from '@mui/icons-material';
import api from '../../../services/api';
import './RegistrationReports.css';

type Report = 'summary' | 'pep' | 'followup' | 'awaiting' | 'surveillance' | 'referrals';
type ReportTab = 'overview' | 'pep' | 'surveillance';
type Counts = { label: string; count: number }[];
type Completion = { eligible: number; completed: number; rate: number | null; excluded: number };
type Filters = { from: string; to: string; category: string };
interface ReportData {
  period: Filters & { previous_from: string; previous_to: string; as_of: string };
  meta: { title: string; clinic: string; prepared_by: string; generated_at: string; basis: string; notes: string[] };
  stats: {
    patients: number; incidents: number; pep_starts: number; completion: Completion; previous_completion: Completion;
    completion_change_pp: number | null; overdue_patients: number; overdue_doses: number; awaiting_d0: number;
    referrals: number; referral_rate: number | null;
    delay: { average: number | null; median: number | null; min: number | null; max: number | null; samples: number; excluded: number };
  };
  months: { month: string; I: number; II: number; III: number }[];
  breakdowns: { barangays: Counts; ages: Counts; animals: Counts; ownership: Counts; observation: Counts; weekdays: Counts; outcomes: Counts };
  records: { columns: Record<string, string>; rows: Record<string, string | number | null>[]; total: number; page: number; last_page: number };
}

const TITLES: Record<Report, string> = { summary: 'Clinic Summary', pep: 'PEP Treatment Outcomes', followup: 'Overdue Doses & Follow-up', awaiting: 'Awaiting First Dose', surveillance: 'Bite Surveillance', referrals: 'Referrals & Transfers' };
const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function dateRange(preset: string): Filters {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = now;
  if (preset === 'today') {
    start = now;
    end = now;
  } else if (preset === 'week') {
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek + 6) % 7; // Monday as start of week
    start = new Date(now);
    start.setDate(now.getDate() - diff);
    end = now;
  } else if (preset === 'last30') {
    start = new Date(now);
    start.setDate(start.getDate() - 29);
  } else if (preset === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else if (preset === 'previous') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  return { from: dateString(start), to: dateString(end), category: 'ALL' };
}
const display = (value: string | number | null | undefined) => value === null || value === undefined || value === '' ? 'Not available' : String(value);
const percent = (value: number | null) => value === null ? 'Not available' : `${value}%`;
const escapeHtml = (value: unknown) => String(value ?? 'Not available').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

function Bars({ title, rows, note, limit }: { title: string; rows: Counts; note?: string; limit?: number }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(1, ...rows.map(row => row.count));
  return <Paper elevation={0} className="rr-panel">
    <Typography component="h2" className="rr-section-title">{title}</Typography>
    {total === 0 ? <p className="rr-empty">No records in this period.</p> : <ul className="rr-bars">
      {rows.slice(0, limit ?? rows.length).map(row => <li key={row.label}>
        <div><span>{row.label}</span><span>{row.count} <small>({Math.round(row.count / total * 100)}%)</small></span></div>
        <div className="rr-track" aria-hidden="true"><span style={{ width: `${row.count / max * 100}%` }} /></div>
      </li>)}
    </ul>}
    {note && <p className="rr-note">{note}</p>}
  </Paper>;
}

function CategoryTrend({ months }: { months: ReportData['months'] }) {
  const max = Math.max(1, ...months.map(m => m.I + m.II + m.III));
  return <Paper elevation={0} className="rr-panel">
    <Typography component="h2" className="rr-section-title">Exposure categories over time</Typography>
    <div className="rr-legend"><span><i className="rr-cat-I" />Category I</span><span><i className="rr-cat-II" />Category II</span><span><i className="rr-cat-III" />Category III</span></div>
    <div className="rr-chart" role="img" aria-label="Monthly incident counts by exposure category; exact values are in the table below.">
      {months.map(m => <div className="rr-chart-column" key={m.month}>
        <div className="rr-chart-stack" title={`${m.month}: I ${m.I}, II ${m.II}, III ${m.III}`}>
          {(['III', 'II', 'I'] as const).map(cat => <div key={cat} className={`rr-cat-${cat}`} style={{ height: `${m[cat] / max * 130}px` }} />)}
        </div><small>{m.month}</small>
      </div>)}
    </div>
    <details className="rr-note"><summary>View exact category counts</summary><table className="rr-table"><thead><tr><th>Month</th><th>I</th><th>II</th><th>III</th><th>III share</th></tr></thead><tbody>
      {months.map(m => <tr key={m.month}><td>{m.month}</td><td>{m.I}</td><td>{m.II}</td><td>{m.III}</td><td>{m.I + m.II + m.III ? `${Math.round(m.III / (m.I + m.II + m.III) * 100)}%` : '—'}</td></tr>)}
    </tbody></table></details>
  </Paper>;
}

export default function RegistrationReportsPage() {
  const [tab, setTab] = useState<ReportTab>('overview');
  const [report, setReport] = useState<Report>('summary');
  const [preset, setPreset] = useState('month');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [draft, setDraft] = useState<Filters>(() => dateRange('month'));
  const [filters, setFilters] = useState<Filters>(() => dateRange('month'));
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: ReportData; error?: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const valid = Boolean(draft.from && draft.to && draft.from <= draft.to && draft.to <= dateString(new Date()));
  const dirty = JSON.stringify(draft) !== JSON.stringify(filters);
  const requestKey = JSON.stringify({ filters, report, page, refresh });
  const loading = result?.key !== requestKey;
  const data = loading ? null : result?.data ?? null;
  const error = loading ? '' : result?.error ?? '';

  useEffect(() => {
    if (!['overview', 'pep', 'surveillance'].includes(tab)) return;
    const controller = new AbortController();
    api.get<ReportData>('/reports/registration', { params: { ...filters, report, page }, signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setResult({ key: requestKey, data: response.data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, error: 'Unable to load reports. Check your connection and try again.' }); });
    return () => controller.abort();
  }, [tab, filters, report, page, requestKey]);

  const selectReport = (next: Report, switchTab: boolean = true) => {
    setReport(next); setPage(1);
    if (switchTab) {
      setTab(next === 'summary' ? 'overview' : ['pep', 'followup', 'awaiting'].includes(next) ? 'pep' : 'surveillance');
    }
  };

  const exportReport = async (format: 'csv' | 'print') => {
    setExportError('');
    setExporting(true);
    try {
      if (format === 'csv') {
        const response = await api.get('/reports/registration', { params: { ...filters, report, format }, responseType: 'blob' });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a'); link.href = url; link.download = `registration-${report}-${filters.from}-${filters.to}.csv`;
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const response = await api.get<ReportData>('/reports/registration', { params: { ...filters, report, format } });
        const result = response.data;
        const columns = Object.keys(result.records.columns);

        const printHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(result.meta.title)}</title><style>
          @page{size:A4 ${orientation};margin:10mm}
          body{font:11px system-ui,-apple-system,sans-serif;color:#111827;margin:12px;line-height:1.4}
          .header-box{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px}
          .header-box .republic{font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#374151}
          .header-box .lgu{font-size:11px;font-weight:700;color:#111827}
          .header-box .office{font-size:13px;font-weight:800;color:#047857;margin-top:2px}
          .header-box .clinic{font-size:10px;font-weight:600;color:#4b5563}
          .doc-title{text-align:center;margin:10px 0}
          .doc-title h2{font-size:14px;font-weight:800;text-transform:uppercase;margin:0;text-decoration:underline}
          .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:10px;border:1px solid #d1d5db;background:#f9fafb;padding:8px 12px;margin-bottom:12px;border-radius:4px}
          .meta-grid span.lbl{color:#6b7280;font-weight:600}
          .meta-grid span.val{color:#111827;font-weight:700}
          table{border-collapse:collapse;width:100%;font-size:${orientation === 'portrait' ? '9.5px' : '10.5px'};margin-top:8px}
          th,td{border:1px solid #d1d5db;padding:${orientation === 'portrait' ? '5px 4px' : '6px 7px'};text-align:left;overflow-wrap:anywhere}
          thead{display:table-header-group}
          tr{break-inside:avoid;page-break-inside:avoid}
          th{background:#f3f4f6;font-weight:700;color:#111827}
          .total-count{margin-top:8px;font-size:10px;font-weight:700}
          .notes{font-size:9px;color:#64748b;margin-top:10px;line-height:1.3;break-inside:avoid}
          .sig-section{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:40px;break-inside:avoid;page-break-inside:avoid}
          .sig-block{border-top:1px solid #000;padding-top:4px}
          .sig-name{font-weight:700;font-size:10px;text-transform:uppercase}
          .sig-title{font-size:9px;color:#4b5563}
          @media print{body{margin:0}}
          </style></head><body>
          <div class="header-box">
            <div class="republic">Republic of the Philippines · Province of Misamis Oriental</div>
            <div class="lgu">MUNICIPALITY OF TAGOLOAN</div>
            <div class="office">MUNICIPAL HEALTH OFFICE — ANIMAL BITE TREATMENT CENTER</div>
            <div class="clinic">${escapeHtml(result.meta.clinic)}</div>
          </div>
          <div class="doc-title">
            <h2>${escapeHtml(result.meta.title)}</h2>
          </div>
          <div class="meta-grid">
            <div><span class="lbl">Reporting Period: </span><span class="val">${escapeHtml(result.period.from)} to ${escapeHtml(result.period.to)}</span></div>
            <div><span class="lbl">Category: </span><span class="val">${escapeHtml(result.period.category)}</span></div>
            <div><span class="lbl">Prepared by: </span><span class="val">${escapeHtml(result.meta.prepared_by)}</span></div>
            <div><span class="lbl">Date Generated: </span><span class="val">${new Date(result.meta.generated_at).toLocaleString()}</span></div>
          </div>
          <table><thead><tr>${Object.values(result.records.columns).map(label => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead><tbody>
          ${result.records.rows.length ? result.records.rows.map(row => `<tr>${columns.map(key => `<td>${escapeHtml(display(row[key]))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}">No matching records.</td></tr>`}
          </tbody></table>
          <div class="total-count">Total: ${result.records.total} record(s)</div>
          <div class="notes">${result.meta.notes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}</div>
          <div class="sig-section">
            <div class="sig-block">
              <div class="sig-name">${escapeHtml(result.meta.prepared_by)}</div>
              <div class="sig-title">Prepared by (Registration Staff / Officer)</div>
            </div>
            <div class="sig-block">
              <div class="sig-name">____________________________</div>
              <div class="sig-title">Noted &amp; Approved by (Medical Officer / Doctor in Charge)</div>
            </div>
          </div>
          </body></html>`;

        const iframe = document.createElement('iframe');
        iframe.setAttribute('data-testid', 'print-frame');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const frameDoc = iframe.contentWindow?.document;
        if (!frameDoc) {
          throw new Error('Unable to access print frame');
        }

        frameDoc.open();
        frameDoc.write(printHtml);
        frameDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Printing error:', e);
          } finally {
            setTimeout(() => {
              iframe.remove();
            }, 1500);
          }
        }, 300);
      }
    } catch { setExportError('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  const stats = data?.stats;
  return <Box className="registration-reports" sx={{ color: 'text.primary', bgcolor: 'background.default' }}>
    <header className="rr-header"><div><Typography component="h1">Reports &amp; Analytics</Typography><p>Treatment outcomes, follow-up priorities, and bite surveillance</p><small>Dashboard / Reports</small></div>
      {['overview', 'pep', 'surveillance'].includes(tab) && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            size="small"
            value={orientation}
            exclusive
            onChange={(_, val) => { if (val) setOrientation(val); }}
            aria-label="Print orientation"
            sx={{ height: 36, bgcolor: 'background.paper' }}
          >
            <ToggleButton value="portrait" sx={{ textTransform: 'none', px: 1.5, py: 0.5, fontSize: '0.8125rem' }}>
              Portrait
            </ToggleButton>
            <ToggleButton value="landscape" sx={{ textTransform: 'none', px: 1.5, py: 0.5, fontSize: '0.8125rem' }}>
              Landscape
            </ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" startIcon={<DownloadOutlined />} disabled={!data || loading || exporting} onClick={() => void exportReport('csv')}>Export CSV</Button>
          <Button variant="contained" disableElevation startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <PrintOutlined />} disabled={!data || loading || exporting} onClick={() => void exportReport('print')}>Print Report</Button>
        </Stack>
      )}
    </header>
    <Tabs
      value={tab}
      onChange={(_, value: ReportTab) => {
        setTab(value);
        if (value === 'overview') selectReport('summary', false);
        else if (value === 'pep') selectReport('pep', false);
        else if (value === 'surveillance') selectReport('surveillance', false);
      }}
      variant="scrollable"
      allowScrollButtonsMobile
      aria-label="Registration report sections"
      sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
    >
      <Tab value="overview" label="Overview" />
      <Tab value="pep" label="PEP & Follow-up" />
      <Tab value="surveillance" label="Bite Surveillance" />
    </Tabs>

    {/* Unified Global Filters for all report tabs */}
    <Paper elevation={0} className="rr-panel rr-filters" component="form" onSubmit={event => { event.preventDefault(); if (valid) { setFilters({ ...draft }); setPage(1); } }}>
      <div className="rr-filter-row">
        <TextField select size="small" label="Period" value={preset} onChange={event => { const next = event.target.value; setPreset(next); if (next !== 'custom') setDraft({ ...dateRange(next), category: draft.category }); }}>
          <MenuItem value="today">Today</MenuItem>
          <MenuItem value="week">This week</MenuItem>
          <MenuItem value="month">This month</MenuItem>
          <MenuItem value="previous">Previous month</MenuItem>
          <MenuItem value="last30">Last 30 days</MenuItem>
          <MenuItem value="year">This year</MenuItem>
          <MenuItem value="custom">Custom range</MenuItem>
        </TextField>
        <TextField size="small" type="date" label="From" value={draft.from} slotProps={{ inputLabel: { shrink: true } }} onChange={e => { setDraft({ ...draft, from: e.target.value }); setPreset('custom'); }} />
        <TextField size="small" type="date" label="To" value={draft.to} slotProps={{ inputLabel: { shrink: true } }} onChange={e => { setDraft({ ...draft, to: e.target.value }); setPreset('custom'); }} />
        <TextField size="small" select label="Category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>
          <MenuItem value="ALL">All categories</MenuItem>{['I', 'II', 'III'].map(value => <MenuItem key={value} value={value}>Category {value}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="contained" disableElevation disabled={!valid || loading}>Apply</Button>
        <Button onClick={() => { const next = dateRange('month'); setDraft(next); setFilters(next); setPreset('month'); setPage(1); }}>Reset</Button>
      </div>
      {!valid && <p className="rr-error" role="alert">Enter a valid date range ending today or earlier.</p>}
      <p className="rr-note">Showing {filters.from} to {filters.to} · {filters.category === 'ALL' ? 'All categories' : `Category ${filters.category}`}{dirty ? ' · Filter changes not applied' : ''}</p>
    </Paper>

    {['overview', 'pep', 'surveillance'].includes(tab) && <>
    {exportError && <Alert severity="error" onClose={() => setExportError('')}>{exportError}</Alert>}
    {error && <Alert severity="error" action={<Button color="inherit" startIcon={<Refresh />} onClick={() => setRefresh(n => n + 1)}>Retry</Button>}>{error}</Alert>}
    {loading && <div aria-label="Loading reports" aria-busy="true"><div className="rr-grid rr-grid-three">{[1, 2, 3].map(n => <Skeleton key={n} variant="rounded" height={160} />)}</div><Skeleton variant="rounded" height={250} sx={{ mt: 2 }} /></div>}
    {!loading && data && stats && <>
      {tab === 'overview' && <>
        {/* Row 1: Key Performance Indicators & Follow-up Alerts */}
        <div className="rr-grid rr-grid-three">
          <Paper elevation={0} className="rr-panel rr-metric">
            <h2>PEP vaccine-course completion</h2>
            <strong>{percent(stats.completion.rate)}</strong>
            <p>{stats.completion.completed} of {stats.completion.eligible} eligible courses completed</p>
            <small>{stats.completion_change_pp === null ? 'No comparable prior cohort' : `${stats.completion_change_pp > 0 ? '+' : ''}${stats.completion_change_pp} percentage points vs previous D0 cohort`}</small>
            <Button size="small" onClick={() => selectReport('pep')}>View outcomes</Button>
          </Paper>
          <Paper elevation={0} className="rr-panel rr-metric">
            <h2>Average time to first dose</h2>
            <strong>{stats.delay.average === null ? 'Not available' : `${stats.delay.average} days`}</strong>
            <p>{stats.delay.samples ? `Median: ${stats.delay.median} · Range: ${stats.delay.min}–${stats.delay.max} days` : 'No valid D0 dates in the selected period'}</p>
            <small>{stats.delay.samples} courses · Calendar days from exposure to D0</small>
          </Paper>
          <Paper elevation={0} className="rr-panel rr-metric">
            <h2>Patients needing follow-up</h2>
            <strong>{stats.overdue_patients}</strong>
            <p>{stats.overdue_doses} overdue doses · As of {data.period.as_of}</p>
            <small>All incident dates · Not confirmed loss to follow-up</small>
            <Button size="small" onClick={() => selectReport('followup')}>View follow-up list</Button>
          </Paper>
        </div>

        {(stats.overdue_patients > 0 || stats.awaiting_d0 > 0) && (
          <Alert
            severity="warning"
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {stats.overdue_patients > 0 && (
                  <Button color="inherit" size="small" variant="outlined" onClick={() => selectReport('followup', false)}>
                    View Overdue ({stats.overdue_patients})
                  </Button>
                )}
                {stats.awaiting_d0 > 0 && (
                  <Button color="inherit" size="small" variant="outlined" onClick={() => selectReport('awaiting', false)}>
                    View Awaiting D0 ({stats.awaiting_d0})
                  </Button>
                )}
              </Stack>
            }
          >
            Current actions: {stats.overdue_patients} patient(s) overdue · {stats.awaiting_d0} episode(s) awaiting D0. As of {data.period.as_of}, across all incident dates.
          </Alert>
        )}

        {/* Section 2: PEP & Treatment Outcomes (Treatment outcomes + Follow-up priorities) */}
        <div className="rr-section-heading">
          <Typography component="h2" className="rr-group-title">PEP &amp; Treatment Outcomes</Typography>
          <span className="rr-group-desc">Vaccine regimen completion rates and patient follow-up compliance</span>
        </div>
        <div className="rr-grid rr-grid-two rr-outcomes-grid">
          <Bars
            title="Treatment outcomes — selected D0 cohort"
            rows={data.breakdowns.outcomes}
            note={`D0 cohort: ${filters.from} to ${filters.to} · ${stats.completion.excluded} course(s) excluded from completion denominator`}
          />
          <Paper elevation={0} className="rr-panel rr-followup-priorities">
            <Typography component="h2" className="rr-section-title">Follow-up priorities today</Typography>
            <div className="rr-priorities-body">
              <div className="rr-priority-stat">
                <span className="rr-priority-val rr-priority-warn">{stats.overdue_patients}</span>
                <div className="rr-priority-text">
                  <p className="rr-priority-main"><b>{stats.overdue_patients}</b> patients have <b>{stats.overdue_doses}</b> overdue prescribed doses.</p>
                  <span className="rr-priority-sub">Scheduled follow-up dose target dates exceeded</span>
                </div>
              </div>
              <div className="rr-priority-stat">
                <span className="rr-priority-val rr-priority-info">{stats.awaiting_d0}</span>
                <div className="rr-priority-text">
                  <p className="rr-priority-main"><b>{stats.awaiting_d0}</b> episodes have an ordered regimen with no recorded D0.</p>
                  <span className="rr-priority-sub">Prescriptions awaiting initial vaccination administration</span>
                </div>
              </div>
            </div>
            <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 1.5, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" onClick={() => selectReport('followup')}>Overdue doses</Button>
              <Button variant="outlined" size="small" onClick={() => selectReport('awaiting')}>Awaiting D0</Button>
            </Stack>
            <p className="rr-note">Reminder status shows the latest recorded send attempt. Confirmed loss to follow-up and contact outcomes are not currently recorded.</p>
          </Paper>
        </div>

        {/* Section 3: Bite Surveillance Analytics */}
        <div className="rr-section-heading">
          <Typography component="h2" className="rr-group-title">Bite Surveillance Analytics</Typography>
          <span className="rr-group-desc">Temporal patterns, demographic distribution, and animal characteristics</span>
        </div>
        <div className="rr-activity">
          <span><b>{stats.incidents}</b> incident episodes</span>
          <span><b>{stats.patients}</b> unique patients</span>
          <span><b>{stats.pep_starts}</b> PEP starts</span>
          <span><b>{percent(stats.referral_rate)}</b> referred/transferred cases</span>
          <Button component={RouterLink} to="/bite-map" endIcon={<ArrowForward />} size="small">Open Bite Map</Button>
        </div>

        {/* Larger analytics charts with equal width and height */}
        <div className="rr-surveillance-row-1">
          <CategoryTrend months={data.months} />
          <Bars title="Age at incident" rows={data.breakdowns.ages} note="Counts bite episodes. A patient with separate incidents can appear more than once." />
          <Bars title="Incident day of week" rows={data.breakdowns.weekdays} note="Hourly patterns are unavailable because incident times are not recorded." />
        </div>

        {/* Smaller breakdown charts grouped together in a balanced row */}
        <div className="rr-surveillance-row-2">
          <Bars title="Incident barangays" rows={data.breakdowns.barangays} limit={10} note="Recorded bite locations only. Open Bite Map for the geographic view." />
          <Bars title="Animal type" rows={data.breakdowns.animals} />
          <Bars title="Animal ownership" rows={data.breakdowns.ownership} note="Ownership and vaccination are different attributes. Animal vaccination status is not currently recorded as a structured field." />
          <Bars title="Recorded animal observation status" rows={data.breakdowns.observation} />
        </div>
      </>}
      {tab === 'pep' && <>
        <Alert severity="info">D0 cohort: {filters.from} to {filters.to}. Outcomes observed as of {data.period.as_of}. {stats.completion.excluded} course(s) are not eligible for the completion denominator. Current follow-up and awaiting-D0 lists include all incident dates.</Alert>
        <div className="rr-pep-header">
          <Typography component="h2" className="rr-section-title" sx={{ mb: 0.5 }}>PEP &amp; Follow-up Clinical Records</Typography>
          <p className="rr-note" style={{ margin: 0 }}>Review patient treatment outcomes, overdue dose queues, and episodes awaiting initial Day 0 doses.</p>
        </div>
        <div className="rr-pep-tabs-bar">
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant={report === 'pep' ? 'contained' : 'outlined'}
              size="small"
              className="rr-pep-tab-btn"
              onClick={() => selectReport('pep', false)}
            >
              PEP Treatment Outcomes
            </Button>
            <Button
              variant={report === 'followup' ? 'contained' : 'outlined'}
              size="small"
              className="rr-pep-tab-btn"
              onClick={() => selectReport('followup', false)}
            >
              Overdue Patients ({stats.overdue_patients})
            </Button>
            <Button
              variant={report === 'awaiting' ? 'contained' : 'outlined'}
              size="small"
              className="rr-pep-tab-btn"
              onClick={() => selectReport('awaiting', false)}
            >
              Awaiting D0 ({stats.awaiting_d0})
            </Button>
          </Stack>
        </div>
      </>}
      {tab === 'surveillance' && <>
        <div className="rr-activity">
          <span><b>{stats.incidents}</b> incident episodes</span>
          <span><b>{stats.patients}</b> unique patients</span>
          <span><b>{percent(stats.referral_rate)}</b> referred/transferred cases</span>
          <Button component={RouterLink} to="/bite-map" endIcon={<ArrowForward />}>Open Bite Map</Button>
        </div>
        <div className="rr-surveillance-header">
          <Typography component="h2" className="rr-section-title" sx={{ mb: 0.5 }}>Bite Surveillance Incident Records</Typography>
          <p className="rr-note" style={{ margin: 0 }}>Examine incident registry logs, bite exposures by barangay and animal species, and referred cases.</p>
        </div>
        <div className="rr-surveillance-tabs-bar">
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant={report === 'surveillance' ? 'contained' : 'outlined'}
              size="small"
              className="rr-surveillance-tab-btn"
              onClick={() => selectReport('surveillance', false)}
            >
              Incident List ({stats.incidents})
            </Button>
            <Button
              variant={report === 'referrals' ? 'contained' : 'outlined'}
              size="small"
              className="rr-surveillance-tab-btn"
              onClick={() => selectReport('referrals', false)}
            >
              Referrals &amp; Transfers ({stats.referrals})
            </Button>
          </Stack>
        </div>
      </>}
      <Paper elevation={0} className="rr-panel">
        <div className="rr-record-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="rr-section-title">{TITLES[report]}</h2>
            <p className="rr-note">{data.records.total} record(s) · {data.meta.basis}</p>
          </div>
          <TextField
            select
            size="small"
            label="Report / Patient List"
            value={report}
            onChange={e => selectReport(e.target.value as Report, false)}
            sx={{ minWidth: 280 }}
          >
            <MenuItem value="surveillance">Patient Bite Incident List (Category, Animal, Location)</MenuItem>
            <MenuItem value="followup">Overdue Patients &amp; Follow-up</MenuItem>
            <MenuItem value="awaiting">Patients Awaiting First Dose (D0)</MenuItem>
            <MenuItem value="pep">PEP Treatment Outcomes</MenuItem>
            <MenuItem value="referrals">Referrals &amp; Transfers</MenuItem>
            <MenuItem value="summary">Clinic Summary (Key Metrics)</MenuItem>
          </TextField>
        </div>
        <div className="rr-table-scroll" tabIndex={0} role="region" aria-label={TITLES[report]}><table className="rr-table"><thead><tr>{Object.values(data.records.columns).map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
          {data.records.rows.length ? data.records.rows.map((row, index) => <tr key={`${page}-${index}`}>{Object.keys(data.records.columns).map(key => <td key={key}>{key === 'category' ? <Chip size="small" variant="outlined" label={`Category ${display(row[key])}`} /> : display(row[key])}</td>)}</tr>) : <tr><td colSpan={Object.keys(data.records.columns).length} className="rr-empty">No matching records.</td></tr>}
        </tbody></table></div>
        {data.records.last_page > 1 && <Pagination sx={{ mt: 2 }} count={data.records.last_page} page={data.records.page} onChange={(_, next) => setPage(next)} aria-label="Report pages" />}
        <p className="rr-note">CSV and print include every matching record, across all pages.</p>
      </Paper>
      <details className="rr-definitions"><summary>Metric definitions and data availability</summary>{data.meta.notes.map(note => <p key={note}>{note}</p>)}
        <p>Previous D0 cohort: {data.period.previous_from} to {data.period.previous_to}; {stats.previous_completion.completed}/{stats.previous_completion.eligible} eligible courses completed ({percent(stats.previous_completion.rate)}). Both cohorts are observed today, so follow-up durations differ.</p>
        <p>{stats.delay.excluded} D0 course(s) excluded from delay calculations because exposure-to-dose dates are invalid or unavailable. Zero means a measured zero; “Not available” means no eligible observations.</p>
      </details>
      <p className="rr-note rr-updated">Updated {new Date(data.meta.generated_at).toLocaleString()} · {data.meta.clinic}</p>
    </>}
    </>}
  </Box>;
}
