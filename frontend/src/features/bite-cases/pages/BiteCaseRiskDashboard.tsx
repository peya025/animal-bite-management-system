import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ErrorOutlined as HighRiskIcon,
  FmdBad as LocationIcon,
  Pets as AnimalIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  TrendingDown as LowIcon,
  TrendingUp as HighIcon,
  Warning as MedIcon,
  BarChart as StatsIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import StatCard from '../../../components/common/StatCard/StatCard';

// ─── Types ────────────────────────────────────────────────────
interface BiteCase {
  bite_id: number;
  case_number: string;
  bite_date: string;
  bite_place: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  exposure_type: string;
  animal_type: string | null;
  animal_status: string;
  status: 'active' | 'completed' | 'referred' | 'abandoned';
  patient: { patient_id: number; name: string; age: number; gender: string };
}

interface LocationRisk {
  place: string;
  total: number;
  severe: number;
  moderate: number;
  minor: number;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface Stats {
  total_cases: number;
  active_cases: number;
  completed_cases: number;
  by_severity: Record<string, number>;
  by_animal_type: Record<string, number>;
}

// ─── Risk scoring ─────────────────────────────────────────────
function computeRisk(total: number, severe: number, moderate: number): number {
  return Math.round(((severe * 3 + moderate * 2 + (total - severe - moderate)) / (total * 3)) * 100);
}

const RISK_CFG = {
  high:   { bg: '#fee2e2', color: '#dc2626', dot: '#ef4444', label: 'High Risk',   icon: <HighRiskIcon sx={{ fontSize: 13 }} /> },
  medium: { bg: '#fff7ed', color: '#c2410c', dot: '#f97316', label: 'Medium Risk', icon: <MedIcon sx={{ fontSize: 13 }} /> },
  low:    { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: 'Low Risk',    icon: <LowIcon sx={{ fontSize: 13 }} /> },
};

const SEV_CFG = {
  severe:   { bg: '#fee2e2', color: '#dc2626', label: 'Severe'   },
  moderate: { bg: '#fff7ed', color: '#c2410c', label: 'Moderate' },
  minor:    { bg: '#f0fdf4', color: '#16a34a', label: 'Minor'    },
};

const filterSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#f9fafb', borderRadius: 1.5,
    '& fieldset': { borderColor: '#e5e7eb' },
    '&:hover fieldset': { borderColor: '#9ca3af' },
    '&.Mui-focused fieldset': { borderColor: '#ef4444', borderWidth: '1.5px' },
  },
  '& .MuiOutlinedInput-input': { fontSize: 13 },
  '& .MuiInputLabel-root': { fontSize: 13 },
};

// ─── Main Component ───────────────────────────────────────────
export default function BiteCaseRiskDashboard() {
  const [cases, setCases]       = useState<BiteCase[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal]       = useState(0);
  const [search, setSearch]     = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus]     = useState('');
  const [tab, setTab]           = useState<'map' | 'cases'>('map');

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: page + 1, per_page: 200 };
      if (severity) params.severity = severity;
      if (status)   params.status   = status;
      if (search)   params.search   = search;

      const [casesRes, statsRes] = await Promise.all([
        api.get('/cases', { params }),
        api.get('/cases/statistics'),
      ]);
      setCases(casesRes.data.data ?? []);
      setTotal(casesRes.data.total ?? 0);
      setStats(statsRes.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load bite case data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, severity, status]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Compute location risk from bite_place field ──────────────
  const locationRisks: LocationRisk[] = (() => {
    const map: Record<string, { total: number; severe: number; moderate: number; minor: number }> = {};
    cases.forEach(c => {
      const place = (c.bite_place || 'Unknown').trim();
      if (!map[place]) map[place] = { total: 0, severe: 0, moderate: 0, minor: 0 };
      map[place].total++;
      if (c.severity === 'severe')   map[place].severe++;
      if (c.severity === 'moderate') map[place].moderate++;
      if (c.severity === 'minor')    map[place].minor++;
    });
    return Object.entries(map)
      .map(([place, d]) => {
        const score = computeRisk(d.total, d.severe, d.moderate);
        return {
          place, ...d,
          riskScore: score,
          riskLevel: score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low',
        } as LocationRisk;
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  })();

  const highRisk   = locationRisks.filter(l => l.riskLevel === 'high').length;
  const mediumRisk = locationRisks.filter(l => l.riskLevel === 'medium').length;
  const lowRisk    = locationRisks.filter(l => l.riskLevel === 'low').length;

  // Paginate cases for the Cases tab
  const paginatedCases = cases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Column definitions ──────────────────────────────────────

  const riskColumns: ColumnDef<LocationRisk>[] = [
    {
      key: 'rank', header: '#', width: '48px', align: 'center',
      render: (_, idx) => (
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#6b7280' }}>
          {idx + 1}
        </Typography>
      ),
    },
    {
      key: 'place', header: 'Location', align: 'left',
      render: row => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: 1.5, flexShrink: 0,
            bgcolor: RISK_CFG[row.riskLevel].bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LocationIcon sx={{ fontSize: 17, color: RISK_CFG[row.riskLevel].color }} />
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
            {row.place}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'risk', header: 'Risk Level', align: 'center',
      render: row => {
        const cfg = RISK_CFG[row.riskLevel];
        return (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            px: 1.5, py: 0.5, borderRadius: 5,
            bgcolor: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.dot }} />
            {cfg.label}
          </Box>
        );
      },
    },
    {
      key: 'score', header: 'Risk Score', align: 'center',
      render: row => (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: RISK_CFG[row.riskLevel].color }}>
            {row.riskScore}%
          </Typography>
          <Box sx={{ mt: 0.5, height: 4, borderRadius: 4, bgcolor: '#f3f4f6', width: 80, mx: 'auto', overflow: 'hidden' }}>
            <Box sx={{
              height: '100%', borderRadius: 4,
              width: `${row.riskScore}%`,
              bgcolor: row.riskLevel === 'high' ? '#ef4444' : row.riskLevel === 'medium' ? '#f97316' : '#22c55e',
              transition: 'width 0.4s ease',
            }} />
          </Box>
        </Box>
      ),
    },
    {
      key: 'total', header: 'Total Cases', align: 'center',
      render: row => (
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{row.total}</Typography>
      ),
    },
    {
      key: 'severe', header: 'Severe', align: 'center',
      render: row => row.severe > 0 ? (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
          {row.severe}
        </Box>
      ) : <Typography sx={{ color: '#d1d5db', fontSize: 13 }}>—</Typography>,
    },
    {
      key: 'moderate', header: 'Moderate', align: 'center',
      render: row => row.moderate > 0 ? (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: '#fff7ed', color: '#c2410c', fontSize: 12, fontWeight: 700 }}>
          {row.moderate}
        </Box>
      ) : <Typography sx={{ color: '#d1d5db', fontSize: 13 }}>—</Typography>,
    },
    {
      key: 'minor', header: 'Minor', align: 'center',
      render: row => row.minor > 0 ? (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 700 }}>
          {row.minor}
        </Box>
      ) : <Typography sx={{ color: '#d1d5db', fontSize: 13 }}>—</Typography>,
    },
  ];

  const caseColumns: ColumnDef<BiteCase>[] = [
    {
      key: 'case_number', header: 'Case #', align: 'center', width: '110px',
      render: row => (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, bgcolor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 1.5, fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {row.case_number}
        </Box>
      ),
    },
    {
      key: 'patient', header: 'Patient',
      render: row => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{row.patient?.name ?? '—'}</Typography>
          <Typography sx={{ fontSize: 11, color: '#9ca3af', mt: 0.25 }}>
            {row.patient?.age}y · {row.patient?.gender}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'bite_place', header: 'Location', align: 'center',
      render: row => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
          <LocationIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
          <Typography sx={{ fontSize: 13, color: '#374151' }}>{row.bite_place || '—'}</Typography>
        </Box>
      ),
    },
    {
      key: 'severity', header: 'Severity', align: 'center',
      render: row => {
        const s = SEV_CFG[row.severity] ?? SEV_CFG.minor;
        return (
          <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
            {s.label}
          </Box>
        );
      },
    },
    {
      key: 'animal_type', header: 'Animal', align: 'center',
      render: row => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
          <AnimalIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
          <Typography sx={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>
            {row.animal_type || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'bite_date', header: 'Date', align: 'center',
      render: row => (
        <Typography sx={{ fontSize: 13, color: '#374151' }}>
          {new Date(row.bite_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>
      ),
    },
    {
      key: 'status', header: 'Status', align: 'center',
      render: row => {
        const cfg: Record<string, { bg: string; color: string }> = {
          active:    { bg: '#eff6ff', color: '#2563eb' },
          completed: { bg: '#f0fdf4', color: '#16a34a' },
          referred:  { bg: '#fff7ed', color: '#c2410c' },
          abandoned: { bg: '#f3f4f6', color: '#6b7280' },
        };
        const s = cfg[row.status] ?? cfg.active;
        return (
          <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: s.bg, color: s.color, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
            {row.status}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ px: 3 }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 700, fontSize: 20, color: '#111827', mb: 0.5 }}>
            Bite Case Risk Dashboard
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
            Track high and low risk locations for animal bites
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        {[
          { label: 'Total Cases',    value: stats?.total_cases     ?? '-', icon: <StatsIcon />,   color: 'primary'  as const },
          { label: 'Active Cases',   value: stats?.active_cases    ?? '-', icon: <HighIcon />,    color: 'error'    as const },
          { label: 'Completed',      value: stats?.completed_cases ?? '-', icon: <LowIcon />,     color: 'success'  as const },
          { label: 'High Risk Zones',value: loading ? '-' : highRisk,      icon: <HighRiskIcon />,color: 'error'    as const },
          { label: 'Medium Risk',    value: loading ? '-' : mediumRisk,    icon: <MedIcon />,     color: 'warning'  as const },
          { label: 'Low Risk',       value: loading ? '-' : lowRisk,       icon: <LowIcon />,     color: 'success'  as const },
        ].map(s => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label={s.label} value={s.value} icon={s.icon} color={s.color} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Tab switcher ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        {(['map', 'cases'] as const).map(t => (
          <Button key={t} variant={tab === t ? 'contained' : 'outlined'} size="small"
            onClick={() => { setTab(t); setPage(0); }}
            disableElevation
            sx={{
              textTransform: 'none', fontWeight: 600, fontSize: 13, borderRadius: 1.5,
              ...(tab === t
                ? { bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }
                : { borderColor: '#e5e7eb', color: '#6b7280', bgcolor: '#f9fafb', '&:hover': { borderColor: '#9ca3af', bgcolor: '#f3f4f6' } }),
            }}>
            {t === 'map' ? '📍 Risk by Location' : '📋 All Cases'}
          </Button>
        ))}
      </Box>

      {/* ── Filters ── */}
      <Paper elevation={0} sx={{ mb: 2.5, p: 2, border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#fff' }}>
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth size="small" placeholder="Search case number or patient…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} /></InputAdornment> } }}
              sx={filterSx}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: 13 }}>Severity</InputLabel>
              <Select label="Severity" value={severity} onChange={e => { setSeverity(e.target.value); setPage(0); }}
                sx={{ bgcolor: '#f9fafb', fontSize: 13, borderRadius: 1.5, '& fieldset': { borderColor: '#e5e7eb' } }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="severe">Severe</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="minor">Minor</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: 13 }}>Status</InputLabel>
              <Select label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}
                sx={{ bgcolor: '#f9fafb', fontSize: 13, borderRadius: 1.5, '& fieldset': { borderColor: '#e5e7eb' } }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="referred">Referred</MenuItem>
                <MenuItem value="abandoned">Abandoned</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <Button fullWidth variant="outlined" size="small"
              onClick={() => { setSearch(''); setSeverity(''); setStatus(''); setPage(0); }}
              sx={{ borderRadius: 1.5, borderColor: '#e5e7eb', color: '#6b7280', textTransform: 'none', fontWeight: 500, fontSize: 13, py: '8px', bgcolor: '#f9fafb', '&:hover': { borderColor: '#9ca3af', bgcolor: '#f3f4f6' } }}>
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Table ── */}
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
        {tab === 'map' ? (
          <>
            {/* Risk legend */}
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #f3f4f6', bgcolor: '#fafafa', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mr: 1 }}>Risk Score Guide:</Typography>
              {Object.entries(RISK_CFG).map(([key, cfg]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.dot }} />
                  <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                    {cfg.label}: {key === 'high' ? '≥65%' : key === 'medium' ? '35–64%' : '<35%'}
                  </Typography>
                </Box>
              ))}
            </Box>
            <DataTable
              columns={riskColumns}
              rows={locationRisks}
              loading={loading}
              skeletonRows={8}
              rowKey={r => r.place}
              emptyIcon={<LocationIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
              emptyTitle="No location data available"
              emptySubtitle="Bite cases with a recorded location will appear here"
            />
          </>
        ) : (
          <>
            <DataTable
              columns={caseColumns}
              rows={paginatedCases}
              loading={loading}
              skeletonRows={rowsPerPage}
              rowKey={r => r.bite_id}
              emptyIcon={<AnimalIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
              emptyTitle="No bite cases found"
              emptySubtitle="Recorded bite cases will appear here"
            />
            <TablePager
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={n => { setRowsPerPage(n); setPage(0); }}
            />
          </>
        )}
      </Paper>

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
