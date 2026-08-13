import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ErrorOutlined as HighRiskIcon,
  FmdBad as LocationIcon,
  Pets as AnimalIcon,
  Pets as PetsIcon,
  Place as PlaceIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  TrendingDown as LowIcon,
  Warning as MedIcon,
  Visibility as VisibilityIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import StatCard from '../../../components/common/StatCard/StatCard';
import AddPatientModal from '../../patients/components/AddPatientModal/AddPatientModal';
import TagoloanTreatmentCardModal from '../../vaccinations/components/TagoloanTreatmentCardModal';

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
    bgcolor: 'var(--input-bg)', borderRadius: 1.5,
    color: 'var(--input-text)',
    '& fieldset': { borderColor: 'var(--input-border)' },
    '&:hover fieldset': { borderColor: 'var(--text-secondary)' },
    '&.Mui-focused fieldset': { borderColor: '#ef4444', borderWidth: '1.5px' },
  },
  '& .MuiInputBase-input': { fontSize: 13 },
};

// ─── Main Component ───────────────────────────────────────────
export default function BiteCaseRiskDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBiteMap = location.pathname.includes('/map');

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

  // Modal State
  const [cardPatientId] = useState<number | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [selectedBiteCase, setSelectedBiteCase] = useState<BiteCase | null>(null);

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
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>
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
          <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'var(--text-h)' }}>
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
          <Box sx={{ mt: 0.5, height: 4, borderRadius: 4, bgcolor: 'var(--table-row-border)', width: 80, mx: 'auto', overflow: 'hidden' }}>
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
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'var(--text-h)' }}>{row.total}</Typography>
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
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, bgcolor: 'var(--bg-secondary)', border: '1px solid var(--table-border)', borderRadius: 1.5, fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          {row.case_number}
        </Box>
      ),
    },
    {
      key: 'patient', header: 'Patient',
      render: row => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'var(--text-h)' }}>{row.patient?.name ?? '—'}</Typography>
          <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mt: 0.25 }}>
            {row.patient?.age}y · {row.patient?.gender}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'bite_place', header: 'Location', align: 'center',
      render: row => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
          <LocationIcon sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
          <Typography sx={{ fontSize: 13, color: 'var(--text)' }}>{row.bite_place || '—'}</Typography>
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
          <AnimalIcon sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
          <Typography sx={{ fontSize: 13, color: 'var(--text)', textTransform: 'capitalize' }}>
            {row.animal_type || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'bite_date', header: 'Date', align: 'center',
      render: row => (
        <Typography sx={{ fontSize: 13, color: 'var(--text)' }}>
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
    {
      key: 'actions', header: 'Action', align: 'center',
      render: row => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => setSelectedBiteCase(row)}
          startIcon={<VisibilityIcon fontSize="small" />}
          sx={{
            fontSize: 12,
            py: 0.3,
            px: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '6px',
            borderColor: '#bbf7d0',
            color: '#166534',
            bgcolor: '#f0fdf4',
            '&:hover': { bgcolor: '#dcfce7', borderColor: '#86efac' },
          }}
        >
          View Bite Info
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ px: 3 }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '25px',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              color: 'var(--text-h)',
              mb: '7px',
            }}
          >
            {isBiteMap ? 'Bite Risk Map & Location Surveillance' : 'Bite Case Risk Dashboard'}
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {isBiteMap
              ? 'Geographical rabies risk mapping, hotspot analysis, and barangay incident tracking'
              : 'Track high and low risk locations for animal bites'}
          </Typography>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>›</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {isBiteMap ? 'Bite Map' : 'Bite Cases & Risk'}
            </span>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Stat Cards Grid (6-column layout matching Vaccine Inventory Design) ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Total Cases', value: stats?.total_cases ?? '-', color: 'primary' as const },
          { label: 'Active Cases', value: stats?.active_cases ?? '-', color: 'error' as const },
          { label: 'Completed', value: stats?.completed_cases ?? '-', color: 'success' as const },
          { label: 'High Risk Zones', value: loading ? '-' : highRisk, color: 'error' as const },
          { label: 'Medium Risk', value: loading ? '-' : mediumRisk, color: 'warning' as const },
          { label: 'Low Risk', value: loading ? '-' : lowRisk, color: 'success' as const },
        ].map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} total={stats?.total_cases} loading={loading} />
        ))}
      </Box>

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
                : { borderColor: 'var(--input-border)', color: 'var(--text-secondary)', bgcolor: 'var(--input-bg)', '&:hover': { borderColor: 'var(--text-secondary)', bgcolor: 'var(--bg-hover)' } }),
            }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              {t === 'map' ? <PlaceIcon fontSize="inherit" /> : <DescriptionIcon fontSize="inherit" />}
              <span>{t === 'map' ? 'Risk by Location' : 'All Cases'}</span>
            </Box>
          </Button>
        ))}
      </Box>

      {/* ── Standard Table Container (Filter + Table Together) ── */}
      <Paper elevation={0} sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden', bgcolor: 'var(--card-bg)' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid var(--table-row-border)', bgcolor: 'var(--card-bg)' }}>
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" placeholder="Search case number or patient…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} /></InputAdornment> } }}
                sx={filterSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select label="Severity" value={severity} onChange={e => { setSeverity(e.target.value); setPage(0); }}
                  sx={{ bgcolor: 'var(--input-bg)', color: 'var(--input-text)', borderRadius: 1.5, '& fieldset': { borderColor: 'var(--input-border)' } }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="severe">Severe</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="minor">Minor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}
                  sx={{ bgcolor: 'var(--input-bg)', color: 'var(--input-text)', borderRadius: 1.5, '& fieldset': { borderColor: 'var(--input-border)' } }}>
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
                sx={{ borderRadius: 1.5, borderColor: 'var(--input-border)', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 500, fontSize: 13, py: '8px', bgcolor: 'var(--input-bg)', '&:hover': { borderColor: 'var(--text-secondary)', bgcolor: 'var(--bg-hover)' } }}>
                Clear
              </Button>
            </Grid>
          </Grid>
        </Box>

        {tab === 'map' ? (
          <>
            {/* Risk legend */}
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid var(--table-row-border)', bgcolor: 'var(--table-header-bg)', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--text-h)', mr: 1 }}>Risk Score Guide:</Typography>
              {Object.entries(RISK_CFG).map(([key, cfg]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.dot }} />
                  <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
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

      {/* ── Patient Record Modal (Form 1, Form 2, Form 3 Tabs) ── */}
      {patientModalOpen && (
        <AddPatientModal
          onClose={() => setPatientModalOpen(false)}
          onSuccess={() => {
            setPatientModalOpen(false);
            loadData();
          }}
          role="triage"
        />
      )}

      {/* ── Tagoloan Treatment Card Modal (Form 3) ── */}
      <TagoloanTreatmentCardModal
        open={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        patientId={cardPatientId}
        onSaved={loadData}
      />

      {/* ── Brief Bite Information Details Modal ── */}
      <BiteDetailsModal
        biteCase={selectedBiteCase}
        onClose={() => setSelectedBiteCase(null)}
      />
    </Box>
  );
}

function BiteDetailsModal({
  biteCase,
  onClose,
}: {
  biteCase: BiteCase | null;
  onClose: () => void;
}) {
  if (!biteCase) return null;

  const sevCfg = SEV_CFG[biteCase.severity] ?? SEV_CFG.minor;
  const sevLabel = biteCase.severity === 'severe' ? 'Category III (Severe)' : biteCase.severity === 'moderate' ? 'Category II (Moderate)' : 'Category I (Minor)';

  return (
    <Dialog open={!!biteCase} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid var(--table-border)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PetsIcon sx={{ color: 'var(--primary)' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-h)', fontSize: 16 }}>
            Bite Incident Summary
          </Typography>
        </Box>
        <Chip
          label={`Case #${biteCase.case_number}`}
          size="small"
          sx={{ bgcolor: 'var(--bg-secondary)', color: 'var(--text)', fontWeight: 600, fontFamily: 'monospace' }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        <Stack spacing={2.5}>
          {/* Patient Details Card */}
          <Box sx={{ p: 2, bgcolor: 'var(--bg-secondary)', borderRadius: 2, border: '1px solid var(--table-border)' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
              Patient Information
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Full Name</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>
                  {biteCase.patient?.name || '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Age / Gender</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {biteCase.patient?.age} yrs · {biteCase.patient?.gender}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Patient ID</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>
                  #{biteCase.patient?.patient_id}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Bite Details Grid */}
          <Box sx={{ p: 2, bgcolor: 'var(--card-bg)', borderRadius: 2, border: '1px solid var(--table-border)' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
              Bite Exposure Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Date of Bite</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>
                  {new Date(biteCase.bite_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Incident Location</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PlaceIcon fontSize="inherit" />
                  <span>{biteCase.bite_place || 'Claveria, Misamis Oriental'}</span>
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.5 }}>WHO Severity Category</Typography>
                <Chip
                  size="small"
                  label={sevLabel}
                  sx={{ bgcolor: sevCfg.bg, color: sevCfg.color, fontWeight: 700, fontSize: 11.5 }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.5 }}>Treatment Status</Typography>
                <Chip
                  size="small"
                  label={biteCase.status.toUpperCase()}
                  sx={{
                    bgcolor: biteCase.status === 'completed' ? '#ecfdf5' : '#eff6ff',
                    color: biteCase.status === 'completed' ? '#047857' : '#1d4ed8',
                    border: `1px solid ${biteCase.status === 'completed' ? '#a7f3d0' : '#bfdbfe'}`,
                    fontWeight: 700, fontSize: 11,
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Animal Involved</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <AnimalIcon fontSize="inherit" />
                  <span>{biteCase.animal_type || 'Dog'}</span>
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Animal Status</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
                  {biteCase.animal_status || 'Under 14-day Observation'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Exposure Description</Typography>
                <Typography sx={{ fontSize: 12.5, color: 'var(--text)', mt: 0.25, bgcolor: 'var(--bg-secondary)', p: 1.25, borderRadius: 1.5, border: '1px solid var(--table-row-border)' }}>
                  {biteCase.exposure_type || 'Transdermal bite wound on extremity with direct animal contact. Immediate wound washing and rabies PEP initiated.'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--table-border)', bgcolor: 'var(--bg-secondary)' }}>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)' }, textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
