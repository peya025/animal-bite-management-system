import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, FormControl, InputAdornment, MenuItem, Paper, Select, Skeleton, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { CheckCircleOutlined, Clear, ErrorOutlined, FileDownloadOutlined, LocationOnOutlined, PetsOutlined, SearchOutlined, TrendingDown, TrendingUp, WarningAmberOutlined } from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';

type RiskLevel = 'high' | 'medium' | 'low';
type LocationSummary = { location: string; location_level: string; risk_score: number; risk_level: RiskLevel; total_cases: number; cat_1: number; cat_2: number; cat_3: number; animal_types: Record<string, number>; pep_compliance: number; overdue_doses: number; trend: 'up' | 'down' | 'neutral' | 'new'; trend_diff: number | null; last_incident: string | null; last_incident_days_ago: number | null };
type CaseSummary = { bite_id: number; case_number: string; patient_name: string; bite_date: string | null; location: string; category: string; animal_type: string; status: string };
type DashboardData = { summary: { total_cases: number; active_cases: number; completed: number; high_risk_zones: number; overdue_doses: number; pep_compliance: number }; locations: LocationSummary[]; cases: CaseSummary[]; risk_alerts: { high_risk_zones: string[]; overdue_count: number } };
type Filters = { search: string; severity: string; status: string; animal: string; range: string; customFrom: string; customTo: string };
const BORDER = '0.5px solid #e5e7eb';
const riskConfig: Record<RiskLevel, { label: string; color: string; background: string }> = { high: { label: 'High Risk', color: '#ef4444', background: '#fef2f2' }, medium: { label: 'Medium Risk', color: '#f59e0b', background: '#fffbeb' }, low: { label: 'Low Risk', color: '#16a34a', background: '#f0fdf4' } };

function dateRange(range: string, customFrom: string, customTo: string) { const today = new Date(); const end = today.toISOString().slice(0, 10); const start = new Date(today); if (range === 'week') start.setDate(today.getDate() - 6); if (range === 'month') start.setMonth(today.getMonth() - 1); if (range === 'quarter') start.setMonth(today.getMonth() - 3); if (range === 'custom') return { ...(customFrom ? { from: customFrom } : {}), ...(customTo ? { to: customTo } : {}) }; return range === 'all' ? {} : { from: start.toISOString().slice(0, 10), to: end }; }
function Progress({ value, color, width = 78 }: { value: number; color: string; width?: number }) { return <Box sx={{ width, height: 4, borderRadius: 2, bgcolor: '#e5e7eb', overflow: 'hidden' }}><Box sx={{ width: `${Math.min(value, 100)}%`, height: '100%', borderRadius: 2, bgcolor: color }} /></Box>; }
function StatCard({ label, value, color, icon, loading }: { label: string; value: string | number; color: string; icon: React.ReactNode; loading: boolean }) { return <Paper elevation={0} sx={{ p: '14px 16px', border: BORDER, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', transition: 'box-shadow 0.25s ease, border-color 0.25s ease', '&:hover': { borderColor: 'rgba(16, 185, 129, 0.38)', boxShadow: '0 8px 22px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.16)' } }}><Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: `${color}18`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box><Box sx={{ minWidth: 0 }}>{loading ? <Skeleton width={48} height={25} /> : <Typography sx={{ color: '#111827', fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>{value}</Typography>}<Typography sx={{ color: '#6b7280', fontSize: 10, fontWeight: 500, letterSpacing: '.04em', mt: .35, whiteSpace: 'nowrap' }}>{label}</Typography></Box></Paper>; }
function RiskPill({ level }: { level: RiskLevel }) { const c = riskConfig[level]; return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .6, px: 1, py: .45, borderRadius: 20, fontSize: 11, fontWeight: 500, bgcolor: c.background, color: c.color }}><Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.color }} />{c.label}</Box>; }
function Guide({ color, text }: { color: string; text: string }) { return <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} /><Typography sx={{ fontSize: 11, color: '#6b7280' }}>{text}</Typography></Box>; }
function Filter({ value, onChange, ariaLabel, children }: { value: string; onChange: (value: string) => void; ariaLabel: string; children: React.ReactNode }) { return <FormControl size="small"><Select value={value} displayEmpty onChange={event => onChange(event.target.value)} inputProps={{ 'aria-label': ariaLabel }} sx={{ minWidth: 120, borderRadius: 2, fontSize: 12, '& fieldset': { borderColor: '#e5e7eb' } }}>{children}</Select></FormControl>; }
function AnimalPills({ types }: { types: Record<string, number> }) { const info: Record<string, [string, string, string]> = { dog: ['Dog', '#2563eb', '#eff6ff'], cat: ['Cat', '#7c3aed', '#f5f3ff'], other: ['Other', '#6b7280', '#f3f4f6'] }; return <Box sx={{ display: 'flex', gap: .5, justifyContent: 'center', flexWrap: 'wrap' }}>{Object.entries(info).filter(([type]) => (types[type] ?? 0) > 0).map(([type, [label, color, bg]]) => <Box key={type} sx={{ px: .75, py: .3, borderRadius: 20, bgcolor: bg, color, fontSize: 10, whiteSpace: 'nowrap' }}>{label} ×{types[type]}</Box>)}</Box>; }
function Count({ count, color }: { count: number; color: string }) { return count > 0 ? <Typography sx={{ fontSize: 12, color, fontWeight: 600 }}>{count}</Typography> : <Typography sx={{ color: '#e5e7eb', fontSize: 13 }}>—</Typography>; }

function LocationRow({ row, index }: { row: LocationSummary; index: number }) {
  const risk = riskConfig[row.risk_level]; const complianceColor = row.pep_compliance >= 80 ? '#16a34a' : row.pep_compliance >= 50 ? '#f59e0b' : '#ef4444';
  const trend = row.trend === 'up' ? { icon: <TrendingUp sx={{ fontSize: 15 }} />, color: '#ef4444', text: `+${row.trend_diff ?? 0} vs last period` } : row.trend === 'down' ? { icon: <TrendingDown sx={{ fontSize: 15 }} />, color: '#16a34a', text: `${row.trend_diff ?? 0} vs last period` } : { icon: null, color: '#9ca3af', text: row.trend === 'new' ? 'New' : '—' };
  return <TableRow hover sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
    <TableCell align="center" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>{index + 1}</TableCell>
    <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: risk.background, color: risk.color, display: 'grid', placeItems: 'center' }}><LocationOnOutlined sx={{ fontSize: 16 }} /></Box><Box><Typography sx={{ fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{row.location}</Typography><Typography sx={{ fontSize: 10, color: '#9ca3af' }}>{row.location_level}</Typography></Box></Box></TableCell>
    <TableCell align="center"><RiskPill level={row.risk_level} /></TableCell><TableCell align="center"><Box sx={{ display: 'grid', justifyItems: 'center', gap: .45 }}><Typography sx={{ color: risk.color, fontSize: 12, fontWeight: 600 }}>{row.risk_score}%</Typography><Progress value={row.risk_score} color={risk.color} /></Box></TableCell><TableCell align="center"><Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{row.total_cases}</Typography></TableCell>
    <TableCell align="center"><Count count={row.cat_3} color="#f59e0b" /></TableCell><TableCell align="center"><Count count={row.cat_2} color="#f59e0b" /></TableCell><TableCell align="center"><Count count={row.cat_1} color="#1D9E75" /></TableCell><TableCell align="center"><AnimalPills types={row.animal_types} /></TableCell>
    <TableCell align="center"><Box sx={{ display: 'grid', justifyItems: 'center', gap: .45 }}><Typography sx={{ fontSize: 12, fontWeight: 600, color: complianceColor }}>{row.pep_compliance}%</Typography><Progress value={row.pep_compliance} color={complianceColor} width={70} /></Box></TableCell>
    <TableCell align="center">{row.overdue_doses > 0 ? <Tooltip title="Patients with an overdue scheduled PEP dose"><Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .4, px: .75, py: .35, borderRadius: 20, bgcolor: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 600 }}><WarningAmberOutlined sx={{ fontSize: 13 }} />{row.overdue_doses} patient{row.overdue_doses === 1 ? '' : 's'}</Box></Tooltip> : <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .35, px: .75, py: .35, borderRadius: 20, bgcolor: '#f0fdf4', color: '#16a34a', fontSize: 10, fontWeight: 600 }}><CheckCircleOutlined sx={{ fontSize: 13 }} />None</Box>}</TableCell>
    <TableCell align="center"><Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .35, color: trend.color, fontSize: 10, whiteSpace: 'nowrap' }}>{trend.icon}{trend.text}</Box></TableCell><TableCell><Typography sx={{ fontSize: 11, color: '#4b5563', whiteSpace: 'nowrap' }}>{row.last_incident ?? '—'}</Typography>{row.last_incident_days_ago !== null && <Typography sx={{ fontSize: 10, color: '#9ca3af' }}>{row.last_incident_days_ago === 0 ? 'Today' : `${row.last_incident_days_ago} days ago`}</Typography>}</TableCell>
  </TableRow>;
}
function CaseRow({ row, index }: { row: CaseSummary; index: number }) {
  const statusColor: Record<string, string> = { active: '#1D9E75', completed: '#16a34a', cancelled: '#6b7280' };
  return <TableRow hover sx={{ '&:hover': { bgcolor: '#fafafa' } }}><TableCell align="center" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>{index + 1}</TableCell><TableCell><Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', fontWeight: 600 }}>{row.case_number}</Typography></TableCell><TableCell><Typography sx={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{row.patient_name}</Typography></TableCell><TableCell><Typography sx={{ fontSize: 12, color: '#4b5563' }}>{row.location}</Typography></TableCell><TableCell align="center"><Box sx={{ display: 'inline-flex', px: .8, py: .3, borderRadius: 20, bgcolor: '#f3f4f6', color: '#4b5563', fontSize: 10 }}>Category {row.category}</Box></TableCell><TableCell align="center"><Typography sx={{ fontSize: 12, textTransform: 'capitalize', color: '#4b5563' }}>{row.animal_type}</Typography></TableCell><TableCell align="center"><Box sx={{ display: 'inline-flex', px: .8, py: .3, borderRadius: 20, bgcolor: `${statusColor[row.status] ?? '#6b7280'}18`, color: statusColor[row.status] ?? '#6b7280', fontSize: 10, textTransform: 'capitalize' }}>{row.status.replaceAll('_', ' ')}</Box></TableCell><TableCell><Typography sx={{ fontSize: 11, color: '#4b5563' }}>{row.bite_date ?? '—'}</Typography></TableCell></TableRow>;
}

export default function BiteCaseRiskDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate(); const [tab, setTab] = useState<'risk' | 'cases'>('risk'); const [filters, setFilters] = useState<Filters>({ search: '', severity: '', status: '', animal: '', range: 'all', customFrom: '', customTo: '' }); const [data, setData] = useState<DashboardData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const query = useMemo(() => { const { range, customFrom, customTo, ...params } = filters; return { ...params, ...dateRange(range, customFrom, customTo) }; }, [filters]);
  useEffect(() => { const timer = window.setTimeout(async () => { setLoading(true); try { const response = await api.get<DashboardData>('/cases/location-summary', { params: query }); setData(response.data); setError(''); } catch { setError('Unable to load the bite-case analytics. Please try again.'); } finally { setLoading(false); } }, 300); return () => window.clearTimeout(timer); }, [query]);
  const update = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value })); const clear = () => setFilters({ search: '', severity: '', status: '', animal: '', range: 'all', customFrom: '', customTo: '' });
  const alerts = [data?.risk_alerts.high_risk_zones.length ? `${data.risk_alerts.high_risk_zones.length} high-risk zone(s): ${data.risk_alerts.high_risk_zones.join(', ')}` : '', data?.risk_alerts.overdue_count ? `${data.risk_alerts.overdue_count} patient(s) have overdue PEP doses — immediate follow-up required` : ''].filter(Boolean);
  const exportCsv = () => { if (!data?.locations.length) return; const rows = [['Location', 'Risk level', 'Risk score', 'Total cases', 'Category III', 'Category II', 'Category I', 'PEP compliance', 'Overdue doses', 'Last incident'], ...data.locations.map(row => [row.location, row.risk_level, `${row.risk_score}%`, row.total_cases, row.cat_3, row.cat_2, row.cat_1, `${row.pep_compliance}%`, row.overdue_doses, row.last_incident ?? ''])]; const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'location-risk-summary.csv'; link.click(); URL.revokeObjectURL(url); };
  const riskHeaders = ['#', 'LOCATION', 'RISK LEVEL', 'RISK SCORE', 'TOTAL CASES', 'SEVERE', 'MODERATE', 'MINOR', 'ANIMAL TYPE', 'PEP COMPLIANCE', 'OVERDUE DOSES', 'TREND', 'LAST INCIDENT']; const caseHeaders = ['#', 'CASE NUMBER', 'PATIENT', 'LOCATION', 'SEVERITY', 'ANIMAL', 'STATUS', 'INCIDENT DATE']; const headers = tab === 'risk' ? riskHeaders : caseHeaders;
  return <Box sx={{ px: { xs: 1.5, md: 3 }, py: 1, bgcolor: '#f9fafb', minHeight: '100%' }}>
    <Box sx={{ mb: 2.5 }}>
      {user?.role === 'treatment' ? (
        <>
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Poppins',
              fontSize: '24px',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--text-h, #111827)',
              mb: 0.5,
            }}
          >
            Bite Cases Summary
          </Typography>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              fontFamily: 'Poppins',
              fontSize: '13px',
            }}
          >
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#3b82f6',
                fontFamily: 'Poppins',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Bite Cases Summary</span>
          </div>
        </>
      ) : (
        <>
          <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>Bite Cases Summary</Typography>
          <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: .4 }}>Track high and low risk locations, PEP compliance, and animal bite surveillance</Typography>
          <Box sx={{ display: 'flex', gap: .75, mt: .8, fontSize: 12 }}>
            <Button onClick={() => navigate('/dashboard')} sx={{ minWidth: 0, p: 0, fontSize: 12, textTransform: 'none', color: '#6b7280' }}>Dashboard</Button>
            <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>›</Typography>
            <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>Bite Cases Summary</Typography>
          </Box>
        </>
      )}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(6, minmax(0, 1fr))' }, gap: 1.25, mb: 2 }}><StatCard label="TOTAL CASES" value={data?.summary.total_cases ?? 0} color="#3b82f6" icon={<PetsOutlined fontSize="small" />} loading={loading} /><StatCard label="ACTIVE CASES" value={data?.summary.active_cases ?? 0} color="#1D9E75" icon={<WarningAmberOutlined fontSize="small" />} loading={loading} /><StatCard label="COMPLETED" value={data?.summary.completed ?? 0} color="#16a34a" icon={<CheckCircleOutlined fontSize="small" />} loading={loading} /><StatCard label="HIGH RISK ZONES" value={data?.summary.high_risk_zones ?? 0} color="#ef4444" icon={<ErrorOutlined fontSize="small" />} loading={loading} /><StatCard label="OVERDUE DOSES" value={data?.summary.overdue_doses ?? 0} color="#f59e0b" icon={<WarningAmberOutlined fontSize="small" />} loading={loading} /><StatCard label="PEP COMPLIANCE" value={`${data?.summary.pep_compliance ?? 0}%`} color="#6b7280" icon={<CheckCircleOutlined fontSize="small" />} loading={loading} /></Box>
    {alerts.length > 0 && <Box sx={{ mb: 2, p: '10px 14px', borderRadius: '10px', border: '0.5px solid #fecaca', bgcolor: '#fef2f2', display: 'flex', gap: 1, alignItems: 'flex-start' }}><WarningAmberOutlined sx={{ color: '#ef4444', fontSize: 20, mt: .1 }} /><Typography sx={{ color: '#991b1b', fontSize: 12, lineHeight: 1.55, fontWeight: 600 }}>{alerts.join(' · ')}</Typography></Box>}
    <Paper elevation={0} sx={{ border: BORDER, borderRadius: '12px', p: '12px 14px', mb: 2 }}><Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}><Button onClick={() => setTab('risk')} variant={tab === 'risk' ? 'contained' : 'text'} disableElevation sx={{ bgcolor: tab === 'risk' ? '#1D9E75' : 'transparent', color: tab === 'risk' ? '#fff' : '#6b7280', '&:hover': { bgcolor: tab === 'risk' ? '#187e5e' : '#f3f4f6' }, textTransform: 'none', borderRadius: 2, fontWeight: 500, fontSize: 12 }}>Risk by Location</Button><Button onClick={() => setTab('cases')} variant={tab === 'cases' ? 'contained' : 'text'} disableElevation sx={{ bgcolor: tab === 'cases' ? '#1D9E75' : 'transparent', color: tab === 'cases' ? '#fff' : '#6b7280', '&:hover': { bgcolor: tab === 'cases' ? '#187e5e' : '#f3f4f6' }, textTransform: 'none', borderRadius: 2, fontWeight: 500, fontSize: 12 }}>All Cases</Button></Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) repeat(4, minmax(115px, auto)) auto' }, gap: 1, alignItems: 'center' }}><TextField size="small" placeholder="Search case number, patient, or location…" value={filters.search} onChange={event => update('search', event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#9ca3af', fontSize: 18 }} /></InputAdornment> } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 12 }, '& fieldset': { borderColor: '#e5e7eb' } }} /><Filter value={filters.severity} onChange={value => update('severity', value)} ariaLabel="Severity"><MenuItem value="">All severity</MenuItem><MenuItem value="I">Category I</MenuItem><MenuItem value="II">Category II</MenuItem><MenuItem value="III">Category III</MenuItem></Filter><Filter value={filters.status} onChange={value => update('status', value)} ariaLabel="Status"><MenuItem value="">All status</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="completed">Completed</MenuItem><MenuItem value="cancelled">Cancelled</MenuItem></Filter><Filter value={filters.animal} onChange={value => update('animal', value)} ariaLabel="Animal type"><MenuItem value="">All animals</MenuItem><MenuItem value="dog">Dog</MenuItem><MenuItem value="cat">Cat</MenuItem><MenuItem value="other">Other</MenuItem></Filter><Filter value={filters.range} onChange={value => update('range', value)} ariaLabel="Date range"><MenuItem value="all">All time</MenuItem><MenuItem value="week">This week</MenuItem><MenuItem value="month">This month</MenuItem><MenuItem value="quarter">This quarter</MenuItem><MenuItem value="custom">Custom</MenuItem></Filter><Button onClick={clear} startIcon={<Clear fontSize="small" />} sx={{ color: '#6b7280', textTransform: 'none', fontSize: 12, whiteSpace: 'nowrap' }}>Clear</Button></Box>
      {filters.range === 'custom' && <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}><TextField label="From" type="date" size="small" value={filters.customFrom} onChange={event => update('customFrom', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 12 }, '& fieldset': { borderColor: '#e5e7eb' } }} /><TextField label="To" type="date" size="small" value={filters.customTo} onChange={event => update('customTo', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 12 }, '& fieldset': { borderColor: '#e5e7eb' } }} /></Box>}
      <Box sx={{ mt: 1.5, pt: 1.25, borderTop: '0.5px solid #f3f4f6', display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}><Typography sx={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Risk Score Guide:</Typography><Guide color="#ef4444" text="High Risk: ≥65%" /><Guide color="#f59e0b" text="Medium Risk: 35–64%" /><Guide color="#16a34a" text="Low Risk: <35%" /><Typography sx={{ ml: { md: 'auto' }, fontSize: 10, color: '#9ca3af' }}>Risk Score = (Cat III × 1.5 + Cat II × 1.0) / Total Cases × 100</Typography></Box>
    </Paper>
    <Paper elevation={0} sx={{ border: BORDER, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}><Box sx={{ px: 1.75, py: 1.4, display: 'flex', alignItems: 'center', gap: .75, borderBottom: '0.5px solid #f3f4f6' }}><LocationOnOutlined sx={{ color: '#1D9E75', fontSize: 18 }} /><Typography sx={{ color: '#111827', fontSize: 14, fontWeight: 600 }}>{tab === 'risk' ? 'Location Risk Summary' : 'All Bite Cases'}</Typography><Typography sx={{ color: '#9ca3af', fontSize: 11 }}>{tab === 'risk' ? `${data?.locations.length ?? 0} location${data?.locations.length === 1 ? '' : 's'}` : `${data?.cases.length ?? 0} case${data?.cases.length === 1 ? '' : 's'}`}</Typography><Button onClick={exportCsv} disabled={!data?.locations.length} startIcon={<FileDownloadOutlined fontSize="small" />} variant="outlined" size="small" sx={{ ml: 'auto', borderColor: '#d1d5db', color: '#4b5563', textTransform: 'none', fontSize: 11 }}>Export</Button></Box><TableContainer sx={{ maxHeight: 590 }}><Table stickyHeader size="small" sx={{ minWidth: tab === 'risk' ? 1210 : 820, '& .MuiTableCell-root': { borderBottom: '0.5px solid #f9fafb', fontSize: 12, py: 1.15, px: 1.25 } }}><TableHead><TableRow>{headers.map(header => <TableCell key={header} align={['#', 'RISK LEVEL', 'RISK SCORE', 'TOTAL CASES', 'SEVERE', 'MODERATE', 'MINOR', 'ANIMAL TYPE', 'PEP COMPLIANCE', 'OVERDUE DOSES', 'TREND', 'SEVERITY', 'ANIMAL', 'STATUS'].includes(header) ? 'center' : 'left'} sx={{ bgcolor: '#fff', color: '#9ca3af', fontWeight: 600, fontSize: '10px !important', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{header}</TableCell>)}</TableRow></TableHead><TableBody>{loading ? Array.from({ length: 5 }).map((_, index) => <TableRow key={index}>{Array.from({ length: headers.length }).map((__, cell) => <TableCell key={cell}><Skeleton height={20} /></TableCell>)}</TableRow>) : tab === 'risk' ? data?.locations.map((row, index) => <LocationRow key={row.location} row={row} index={index} />) : data?.cases.map((row, index) => <CaseRow key={row.bite_id} row={row} index={index} />)}{!loading && !(tab === 'risk' ? data?.locations.length : data?.cases.length) && <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: '42px !important', color: '#9ca3af' }}>No bite cases match the selected filters.</TableCell></TableRow>}</TableBody></Table></TableContainer></Paper>
    <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}><Alert severity="error" onClose={() => setError('')}>{error}</Alert></Snackbar>
  </Box>;
}
