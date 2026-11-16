import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Clear,
  CloseOutlined,
  FileDownloadOutlined,
  FilterListOutlined,
  KeyboardArrowDownOutlined,
  LockOutlined,
  MapOutlined,
  MedicalServicesOutlined,
  PrintOutlined,
  SearchOutlined,
  SlideshowOutlined,
  VaccinesOutlined,
  VerifiedOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';
import { AccessibleProgress } from '../components/AccessibleComponents';
import { BiteCasesEpisodesTab } from '../components/BiteCasesEpisodesTab';
import { BiteCasesOverviewTab } from '../components/BiteCasesOverviewTab';
import { BiteCasesPlanningTab } from '../components/BiteCasesPlanningTab';
import { BiteCasesPresentationDialog } from '../components/BiteCasesPresentationDialog';
import { BC_BORDER, DohStatLine } from '../components/BiteCasesSharedUi';
import { BiteCasesTreatmentTab } from '../components/BiteCasesTreatmentTab';
import {
  computeDateRange,
  computePriorityBreakdown,
  formatDaysAgo,
  formatPct,
  normalizeSeverityParam,
  priorityConfig,
} from '../types/biteCasesSummary.types';
import type {
  CaseSummary,
  CohortCategoryRow,
  ComparisonMetric,
  DashboardData,
  DohSummary,
  Filters,
  LocationSortKey,
  LocationSummary,
  OptionalBarangayColumn,
  PriorityBreakdown,
  PriorityLevel,
  PrivacyMode,
  ReportActionItem,
  ReportSnapshotHeader,
  StageMatrixRow,
  ViewTab,
} from '../types/biteCasesSummary.types';
import {
  exportAggregateSummaryToCsv,
  exportCasesToCsv,
  exportLocationsToCsv,
} from '../utils/biteCaseUtils';
import '../styles/biteCasesAccessibility.css';

// Re-export shared domain types & helpers for external consumers.
export {
  computePriorityBreakdown,
  formatDaysAgo,
  priorityConfig,
};
export type {
  CaseSummary,
  CohortCategoryRow,
  ComparisonMetric,
  DohSummary,
  LocationSummary,
  PriorityBreakdown,
  PriorityLevel,
  StageMatrixRow,
};

const OPTIONAL_COLS_KEY = 'bite_cases_doh_barangay_cols';
const ALLOWED_RANGES = ['7d', '14d', '30d', '90d', 'week', 'month', 'quarter', 'last_completed_quarter', 'all', 'custom'];

function HeadlineKpiCard({
  title,
  titleColor = 'var(--bc-text-secondary)',
  value,
  valueSuffix,
  valueColor = 'var(--bc-text)',
  subtext,
  badgeText,
  badgeBg = 'var(--bc-surface-3)',
  badgeColor = 'var(--bc-text)',
  badgeBorder = 'transparent',
  progressValue,
  progressTotal,
  progressColor = '#0f766e',
  borderColor = '#e2e8f0',
}: {
  title: string;
  titleColor?: string;
  value: string | number;
  valueSuffix?: string;
  valueColor?: string;
  subtext?: string;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  badgeBorder?: string;
  progressValue?: number;
  progressTotal?: number;
  progressColor?: string;
  borderColor?: string;
}) {
  const pct = progressTotal && progressTotal > 0 ? ((progressValue ?? 0) / progressTotal) * 100 : 0;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        textAlign: 'left',
        borderRadius: '16px',
        border: `1px solid ${borderColor}`,
        bgcolor: 'var(--bc-surface)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 0.75,
        minHeight: 124,
        boxShadow: 'var(--bc-card-shadow)',
      }}
    >
      <Typography
        sx={{
          fontSize: 11.5,
          fontWeight: 700,
          color: titleColor,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, my: 0.25 }}>
        <Typography
          sx={{
            fontSize: 28,
            fontWeight: 800,
            color: valueColor,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </Typography>
        {valueSuffix && (
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--bc-text-secondary)',
            }}
          >
            {valueSuffix}
          </Typography>
        )}
      </Box>

      {progressTotal !== undefined && (
        <Box
          sx={{
            width: '100%',
            height: 8,
            borderRadius: 4,
            bgcolor: 'var(--bc-track)',
            overflow: 'hidden',
            my: 0.25,
          }}
        >
          <Box
            sx={{
              width: `${Math.min(100, Math.max(0, pct))}%`,
              height: '100%',
              borderRadius: 4,
              bgcolor: progressColor,
              transition: 'width 0.25s ease',
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.5,
          mt: 'auto',
        }}
      >
        <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', lineHeight: 1.35 }}>
          {subtext}
        </Typography>
        {badgeText && (
          <Typography
            component="span"
            sx={{
              fontSize: 11,
              fontWeight: 700,
              px: 0.9,
              py: 0.2,
              borderRadius: '6px',
              bgcolor: badgeBg,
              color: badgeColor,
              border: `1px solid ${badgeBorder}`,
              whiteSpace: 'nowrap',
            }}
          >
            {badgeText}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

function ExplainabilityModal({
  open,
  onClose,
  location,
  maxCases,
}: {
  open: boolean;
  onClose: () => void;
  location: LocationSummary | null;
  maxCases: number;
}) {
  const breakdown = useMemo(
    () => (location ? computePriorityBreakdown(location, maxCases) : null),
    [location, maxCases]
  );

  if (!location || !breakdown) return null;
  const cfg = priorityConfig[breakdown.priorityLevel];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--bc-text)' }}>
            {location.normalized_barangay || location.location}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--bc-text-secondary)' }}>
            {location.municipality || 'Tagoloan'} • {location.geography_scope?.replaceAll('_', ' ') || location.location_level}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close location breakdown">
          <CloseOutlined aria-hidden="true" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: cfg.background, border: `1px solid ${cfg.border}`, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: cfg.color, mb: 0.4 }}>
            {cfg.label} • Reference Index: {breakdown.compositeScore}/100
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text)' }}>{breakdown.explanation}</Typography>
        </Box>

        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 1 }}>
          Supporting Factor Breakdown
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: '8px', border: BC_BORDER }}>
            <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>Exposure Volume (35%)</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.4 }}>{breakdown.caseBurdenScore}/100</Typography>
            <AccessibleProgress value={breakdown.caseBurdenScore} color="var(--bc-focus-ring)" width={160} label="Exposure volume factor" />
          </Box>
          <Box sx={{ p: 1, borderRadius: '8px', border: BC_BORDER }}>
            <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>Cat III Share (35%)</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.4 }}>{breakdown.severityScore}/100</Typography>
            <AccessibleProgress value={breakdown.severityScore} color="var(--bc-red)" width={160} label="Severity factor" />
          </Box>
          <Box sx={{ p: 1, borderRadius: '8px', border: BC_BORDER }}>
            <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>Overdue PEP (20%)</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.4 }}>{breakdown.overdueScore}/100</Typography>
            <AccessibleProgress value={breakdown.overdueScore} color="var(--bc-amber)" width={160} label="Overdue PEP factor" />
          </Box>
          <Box sx={{ p: 1, borderRadius: '8px', border: BC_BORDER }}>
            <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>Period Change (10%)</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.4 }}>{breakdown.trendScore}/100</Typography>
            <AccessibleProgress value={breakdown.trendScore} color="var(--bc-green)" width={160} label="Period change factor" />
          </Box>
        </Box>

        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 0.5 }}>
          DOH Submission Breakdown (This Location)
        </Typography>
        <DohStatLine label="Recorded Exposures (Prior)" value={`${location.total_cases}${location.previous_total !== undefined ? ` (Prior: ${location.previous_total})` : ''}`} />
        <DohStatLine label="Sex (Male / Female / Unknown)" value={`${location.male ?? 0} / ${location.female ?? 0} / ${location.unknown_sex ?? 0}`} />
        <DohStatLine label="Age (<15 yrs / >=15 yrs / Unknown)" value={`${location.age_below_15 ?? 0} / ${location.age_15_above ?? 0} / ${location.age_unknown ?? 0}`} />
        <DohStatLine label="Categories (I / II / III / Unassessed)" value={`${location.cat_1} / ${location.cat_2} / ${location.cat_3} / ${location.unassessed ?? 0}`} />
        <DohStatLine label="PEP Prescribed / Given PEP / No Admin Recorded" value={`${location.pep_prescribed ?? 0} / ${location.given_pep ?? 0} / ${location.no_administration_recorded ?? 0}`} />
        <DohStatLine label="Completed Mature Courses / No PEP / Transferred" value={`${location.completed ?? 0} / ${location.no_pep_required ?? 0} / ${location.transferred ?? 0}`} />
        <DohStatLine label="RIG Administered (Total / ERIG / HRIG)" value={`${location.given_rig ?? 0} (${location.erig ?? 0} ERIG, ${location.hrig ?? 0} HRIG)`} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" disableElevation sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function BiteCaseRiskDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location');
  const rangeParam = searchParams.get('range');
  const severityParam = searchParams.get('severity');

  const [tab, setTab] = useState<ViewTab>('summary');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('internal_aggregate');
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const tabRefs = useRef<Record<ViewTab, HTMLButtonElement | null>>({
    summary: null,
    treatment: null,
    risk: null,
    cases: null,
  });

  const [filters, setFilters] = useState<Filters>({
    search: '',
    severity: normalizeSeverityParam(severityParam),
    status: '',
    animal: '',
    range: rangeParam && ALLOWED_RANGES.includes(rangeParam) ? rangeParam : 'all',
    customFrom: '',
    customTo: '',
    cutoff: '',
  });

  useEffect(() => {
    if (rangeParam && ALLOWED_RANGES.includes(rangeParam)) {
      setFilters((f) => ({ ...f, range: rangeParam }));
    }
  }, [rangeParam]);

  useEffect(() => {
    const mapped = normalizeSeverityParam(severityParam);
    if (mapped) {
      setFilters((f) => ({ ...f, severity: mapped }));
    }
  }, [severityParam]);

  const [data, setData] = useState<DashboardData | null>(null);
  const [baselineData, setBaselineData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLocationForBreakdown, setSelectedLocationForBreakdown] = useState<LocationSummary | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Phase 6: Snapshots & Action Register state
  const [snapshots, setSnapshots] = useState<ReportSnapshotHeader[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<number | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [actions, setActions] = useState<ReportActionItem[]>([]);
  const [actionBusy, setActionBusy] = useState(false);

  const [sortKey, setSortKey] = useState<LocationSortKey>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [optionalColumns, setOptionalColumns] = useState<Record<OptionalBarangayColumn, boolean>>(() => {
    try {
      const saved = localStorage.getItem(OPTIONAL_COLS_KEY);
      if (saved) {
        return {
          demographics: true,
          rig_details: true,
          animals: false,
          trend: false,
          risk_score: false,
          ...JSON.parse(saved),
        };
      }
    } catch {
      // ignore storage errors
    }
    return { demographics: true, rig_details: true, animals: false, trend: false, risk_score: false };
  });

  const toggleOptionalColumn = (col: OptionalBarangayColumn) => {
    setOptionalColumns((prev) => {
      const next = { ...prev, [col]: !prev[col] };
      try {
        localStorage.setItem(OPTIONAL_COLS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const selectTab = (nextTab: ViewTab) => {
    setTab(nextTab);
    tabRefs.current[nextTab]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentTab: ViewTab) => {
    const order: ViewTab[] = ['summary', 'treatment', 'cases'];
    const idx = order.indexOf(currentTab);
    let next: ViewTab | null = null;
    if (event.key === 'ArrowRight') next = order[(idx + 1) % order.length];
    else if (event.key === 'ArrowLeft') next = order[(idx - 1 + order.length) % order.length];
    else if (event.key === 'Home') next = order[0];
    else if (event.key === 'End') next = order[order.length - 1];
    if (next) {
      event.preventDefault();
      selectTab(next);
      tabRefs.current[next]?.focus();
    }
  };

  useEffect(() => {
    if (!locationParam || loading || !data?.locations) return;
    const lower = locationParam.toLowerCase();
    const matched = data.locations.find(
      (l) =>
        l.location.toLowerCase() === lower ||
        (l.normalized_barangay && l.normalized_barangay.toLowerCase() === lower) ||
        l.location.toLowerCase().includes(lower)
    );
    if (matched) setSelectedLocationForBreakdown(matched);
  }, [locationParam, loading, data]);

  const activeDateRange = useMemo(
    () => computeDateRange(filters.range, filters.customFrom, filters.customTo),
    [filters.range, filters.customFrom, filters.customTo]
  );

  const query = useMemo(() => {
    const { cutoff, search, severity, status, animal } = filters;
    return {
      privacy_mode: privacyMode,
      ...(search ? { search } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(animal ? { animal } : {}),
      ...(cutoff ? { cutoff } : {}),
      ...(activeDateRange.from ? { from: activeDateRange.from } : {}),
      ...(activeDateRange.to ? { to: activeDateRange.to } : {}),
    };
  }, [filters, privacyMode, activeDateRange]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        if (activeSnapshotId) {
          const snapRes = await api.get<{
            snapshot: ReportSnapshotHeader;
            summary_payload: DashboardData;
            actions?: ReportActionItem[];
          }>(`/reports/bite-summary/snapshots/${activeSnapshotId}`);
          if (!active) return;
          setData({
            ...snapRes.data.summary_payload,
            snapshot: snapRes.data.snapshot,
          });
          if (snapRes.data.actions) {
            setActions(snapRes.data.actions);
          }
        } else {
          const response = await api.get<DashboardData>('/cases/location-summary', { params: query });
          if (!active) return;
          setData(response.data);
          if (!filters.search && !filters.severity && !filters.status && !filters.animal) {
            setBaselineData(response.data);
          }
        }
        setError('');
      } catch {
        if (!active) return;
        setError('Unable to load bite cases summary analytics. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, activeSnapshotId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [snapRes, actRes] = await Promise.all([
          api.get<{ data: ReportSnapshotHeader[] }>('/reports/bite-summary/snapshots'),
          api.get<{ data: ReportActionItem[] }>('/reports/bite-summary/actions'),
        ]);
        if (!active) return;
        setSnapshots(snapRes.data.data || []);
        setActions(actRes.data.data || []);
      } catch {
        // Non-blocking if snapshots/actions endpoints are not yet populated
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveSnapshot = async (
    status: 'draft' | 'finalized',
    parentSnapshotId?: number | null,
    notes?: string
  ) => {
    setSnapshotBusy(true);
    try {
      const res = await api.post<{
        snapshot: ReportSnapshotHeader;
        summary_payload: DashboardData;
      }>('/reports/bite-summary/snapshots', {
        ...query,
        status,
        ...(parentSnapshotId ? { parent_snapshot_id: parentSnapshotId } : {}),
        ...(notes ? { notes } : {}),
      });
      const created = res.data.snapshot;
      setSnapshots((prev) => [created, ...prev]);
      setActiveSnapshotId(created.snapshot_id);
      setData({ ...res.data.summary_payload, snapshot: created });
      setSnackbarMsg(
        status === 'finalized'
          ? `Finalized immutable snapshot ${created.snapshot_code}.`
          : `Saved snapshot ${created.snapshot_code} (v${created.version}).`
      );
    } catch {
      setSnackbarMsg('Unable to save report snapshot.');
    } finally {
      setSnapshotBusy(false);
    }
  };

  const handleFinalizeSnapshot = async (snapshotId: number) => {
    setSnapshotBusy(true);
    try {
      const res = await api.post<{ snapshot: ReportSnapshotHeader }>(
        `/reports/bite-summary/snapshots/${snapshotId}/finalize`
      );
      const updated = res.data.snapshot;
      setSnapshots((prev) =>
        prev.map((s) => (s.snapshot_id === updated.snapshot_id ? updated : s))
      );
      setData((prev) => (prev ? { ...prev, snapshot: updated } : prev));
      setSnackbarMsg(`Snapshot ${updated.snapshot_code} is now finalized and immutable.`);
    } catch {
      setSnackbarMsg('Unable to finalize snapshot.');
    } finally {
      setSnapshotBusy(false);
    }
  };

  const handleCreateAction = async (payload: {
    finding_key?: string;
    observed_pattern: string;
    supporting_metric?: string;
    proposed_action: string;
    owner_name?: string;
    due_date?: string;
    target_measure?: string;
    baseline_value?: string;
    resources_notes?: string;
  }) => {
    setActionBusy(true);
    try {
      const res = await api.post<{ action: ReportActionItem }>('/reports/bite-summary/actions', {
        ...payload,
        ...(activeSnapshotId ? { snapshot_id: activeSnapshotId } : {}),
      });
      setActions((prev) => [res.data.action, ...prev]);
      setSnackbarMsg('Added action item to the Action Register.');
    } catch {
      setSnackbarMsg('Unable to save action item.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateActionStatus = async (
    actionId: number,
    status: ReportActionItem['status'],
    reviewOutcome?: string
  ) => {
    setActionBusy(true);
    try {
      const res = await api.put<{ action: ReportActionItem }>(
        `/reports/bite-summary/actions/${actionId}`,
        {
          status,
          ...(reviewOutcome ? { review_outcome: reviewOutcome } : {}),
        }
      );
      setActions((prev) =>
        prev.map((a) => (a.action_id === actionId ? res.data.action : a))
      );
      setSnackbarMsg(`Updated action status to ${status.replace('_', ' ')}.`);
    } catch {
      setSnackbarMsg('Unable to update action status.');
    } finally {
      setActionBusy(false);
    }
  };

  const handlePrintMeetingPack = async () => {
    try {
      const res = await api.get<string>('/print/reports/bite-summary', {
        params: {
          ...query,
          ...(activeSnapshotId ? { snapshot_id: activeSnapshotId } : {}),
        },
        responseType: 'text' as unknown as 'json',
      });
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(String(res.data));
        printWin.document.close();
      } else {
        setSnackbarMsg('Please allow pop-ups to open the A4 Meeting Pack print view.');
      }
    } catch {
      setSnackbarMsg('Unable to generate A4 Meeting Pack print view.');
    }
  };

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const clearFilters = () =>
    setFilters({
      search: '',
      severity: '',
      status: '',
      animal: '',
      range: 'all',
      customFrom: '',
      customTo: '',
      cutoff: '',
    });

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.severity ||
      filters.status ||
      filters.animal ||
      filters.cutoff ||
      filters.range !== 'all'
  );

  const locations = data?.locations ?? [];
  const cases = data?.cases ?? [];
  const doh = data?.doh_summary;
  const maxCasesAcrossLocations = useMemo(
    () => Math.max(1, ...locations.map((l) => l.total_cases)),
    [locations]
  );

  const sortedLocations = useMemo(() => {
    const copy = [...locations];
    copy.sort((a, b) => {
      const mul = sortOrder === 'asc' ? 1 : -1;
      if (sortKey === 'location') {
        return mul * (a.normalized_barangay || a.location).localeCompare(b.normalized_barangay || b.location);
      }
      if (sortKey === 'cases') return mul * (a.total_cases - b.total_cases);
      if (sortKey === 'cat_3') return mul * (a.cat_3 - b.cat_3);
      if (sortKey === 'pep') return mul * ((a.given_pep ?? 0) - (b.given_pep ?? 0));
      if (sortKey === 'overdue') {
        return mul * ((a.overdue_episodes ?? a.overdue_doses) - (b.overdue_episodes ?? b.overdue_doses));
      }
      if (sortKey === 'last_incident') {
        const da = a.last_incident_days_ago ?? 99999;
        const db = b.last_incident_days_ago ?? 99999;
        return mul * (da - db);
      }
      const sa = computePriorityBreakdown(a, maxCasesAcrossLocations).compositeScore;
      const sb = computePriorityBreakdown(b, maxCasesAcrossLocations).compositeScore;
      return mul * (sa - sb);
    });
    return copy;
  }, [locations, sortKey, sortOrder, maxCasesAcrossLocations]);

  const handleSort = (key: LocationSortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder(key === 'location' ? 'asc' : 'desc');
    }
  };

  const drillDownToStage = (stageKey: string) => {
    const statusMap: Record<string, string> = {
      form_1_registration: 'awaiting_assessment',
      form_2_pep_prescribed: 'no_administration_recorded',
      form_2_no_pep: 'completed_no_pep',
      form_2_transferred: 'transferred_referred',
      form_3_treatment_recorded: 'treatment_recorded',
    };
    setFilters((f) => ({ ...f, status: statusMap[stageKey] ?? '' }));
    selectTab('cases');
  };

  const handleDrillDownFilter = (next: {
    status?: string;
    severity?: string;
    animal?: string;
    search?: string;
  }) => {
    setFilters((f) => ({
      ...f,
      ...(next.status !== undefined ? { status: next.status } : {}),
      ...(next.severity !== undefined ? { severity: next.severity } : {}),
      ...(next.animal !== undefined ? { animal: next.animal } : {}),
      ...(next.search !== undefined ? { search: next.search } : {}),
    }));
    selectTab('cases');
  };

  const hasSecondaryFilters = Boolean(filters.search || filters.severity || filters.status || filters.animal);
  // When secondary drill-down filters (search, severity, status, animal) are active, keep the baseline cohort figures for headline KPI cards so the clinic's true total never vanishes to 0!
  const activeBaseline = hasSecondaryFilters && baselineData ? baselineData : data;
  const activeDoh = activeBaseline?.doh_summary ?? doh;
  const activeSummary = activeBaseline?.summary ?? data?.summary;

  const totalRecorded = activeDoh?.pep_and_biologics.recorded_exposures ?? activeSummary?.total_cases ?? 0;
  const finalizedCount = activeDoh?.pep_and_biologics.finalized_assessments ?? 0;
  const awaitingAssessmentCount =
    activeDoh?.pep_and_biologics.awaiting_assessment ?? activeSummary?.awaiting_assessment ?? 0;
  const pepPrescribedCount =
    activeDoh?.pep_and_biologics.pep_prescribed ?? activeSummary?.pep_prescribed ?? 0;
  const givenPepCount = activeDoh?.pep_and_biologics.given_pep ?? 0;
  const newCoursePrescribedCount = activeDoh?.pep_and_biologics.new_course_prescribed ?? pepPrescribedCount;
  const noAdminCount =
    activeDoh?.pep_and_biologics.no_administration_recorded ?? activeSummary?.no_administration_recorded ?? 0;
  const completedMatureTotal = activeDoh?.completion_and_outcomes.completed_total ?? activeSummary?.completed ?? 0;
  const maturedCoursesTotal = activeDoh?.completion_and_outcomes.matured_courses ?? 0;
  const givenRigCount = activeDoh?.pep_and_biologics.given_rig ?? 0;
  const transferredCount = activeDoh?.completion_and_outcomes.transferred_referred ?? 0;
  const explicitNoPepCount = activeDoh?.pep_and_biologics.explicit_no_pep ?? 0;
  const overdueEpisodesCount =
    activeDoh?.completion_and_outcomes.overdue_episodes ?? activeSummary?.overdue_episodes ?? activeSummary?.overdue_doses ?? 0;
  const overduePatientsCount = activeSummary?.overdue_patients ?? overdueEpisodesCount;
  const overdueCoursesCount = activeSummary?.overdue_courses ?? overdueEpisodesCount;
  const outstandingDoseSlotsCount =
    activeDoh?.completion_and_outcomes.outstanding_dose_slots ?? activeSummary?.outstanding_dose_slots ?? overdueEpisodesCount;
  const unknownDateCount = activeSummary?.unknown_exposure_date_count ?? 0;
  const isPartialPeriod = Boolean(doh?.scope?.is_partial_period ?? activeDateRange.isPartialPeriod);
  const cutoffLabel = data?.cutoff || filters.cutoff || 'Today';
  const periodSummaryText =
    activeDateRange.from && activeDateRange.to
      ? `${activeDateRange.from} to ${activeDateRange.to}`
      : activeDateRange.from
        ? `From ${activeDateRange.from}`
        : activeDateRange.to
          ? `Up to ${activeDateRange.to}`
          : 'All recorded dates';

  const unrecordedLocationsCount = (locations || []).filter((l) => {
    const raw = (l.normalized_barangay || l.location || '').trim().toLowerCase();
    return raw === 'unknown' || raw === 'not recorded' || raw === 'unrecorded' || raw === '';
  }).reduce((sum, l) => sum + l.total_cases, 0);

  const placeCompleteness = totalRecorded > 0 ? Math.round(((totalRecorded - unrecordedLocationsCount) / totalRecorded) * 100) : 100;
  const animalUnknownCount = activeDoh?.animals.unknown ?? 0;
  const animalCompleteness = totalRecorded > 0 ? Math.round(((totalRecorded - animalUnknownCount) / totalRecorded) * 100) : 100;
  const ownershipKnownCount = (activeDoh?.animals.owned ?? 0) + (activeDoh?.animals.stray ?? 0);
  const ownershipCompleteness = totalRecorded > 0 ? Math.round((ownershipKnownCount / totalRecorded) * 100) : 100;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: 1440, mx: 'auto' }}>
      {/* Clean Page Header & Concise 1-Line Scope Summary */}
      <Box
        className="page-header"
        data-walkthrough="bite-cases-header"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1.5,
          mb: 1.25,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--bc-text)', letterSpacing: '-0.02em' }}>
              Bite Cases Summary
            </Typography>
            <Chip
              size="small"
              label={
                data?.snapshot
                  ? `${data.snapshot.snapshot_code} (v${data.snapshot.version})`
                  : 'Live draft'
              }
              sx={{
                fontSize: 11,
                fontWeight: 700,
                bgcolor: '#ecfeff',
                color: '#0891b2',
                border: '1px solid #cffafe',
                height: 22,
              }}
            />
            {unknownDateCount > 0 && (
              <Chip
                size="small"
                label={`${unknownDateCount} provisional date`}
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: '#fffbeb',
                  color: '#b45309',
                  border: '1px solid #fef3c7',
                  height: 22,
                }}
              />
            )}
          </Box>

          <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)', mt: 0.35 }}>
            Reporting and planning · Tagoloan Animal Bite Treatment
          </Typography>
        </Box>

        {/* Action Toolbar: Conference mode, Bite Map, Export menu, Present */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={privacyMode === 'aggregate_only'}
                onChange={(e) => setPrivacyMode(e.target.checked ? 'aggregate_only' : 'internal_aggregate')}
                sx={{ p: 0.5, color: '#9ca3af', '&.Mui-checked': { color: '#0f766e' } }}
              />
            }
            label={<Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--bc-text-secondary)' }}>Conference mode</Typography>}
            sx={{ m: 0 }}
          />

          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(ROUTES.BITE_CASES.MAP)}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: 12.5,
              borderColor: '#d1d5db',
              color: 'var(--bc-text)',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
            }}
          >
            Bite Map
          </Button>

          <Button
            size="small"
            variant="outlined"
            endIcon={<KeyboardArrowDownOutlined sx={{ fontSize: 18 }} />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: 12.5,
              borderColor: '#d1d5db',
              color: 'var(--bc-text)',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
            }}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
          >
            <MenuItem
              onClick={() => {
                setExportAnchorEl(null);
                if (data) {
                  exportAggregateSummaryToCsv(data, 'bite-cases-summary-pack.csv');
                  setSnackbarMsg('Exported aggregate summary pack to CSV.');
                }
              }}
            >
              Export Aggregate CSV
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportAnchorEl(null);
                if (data) {
                  exportCasesToCsv(cases, 'bite-cases-episodes.csv');
                  setSnackbarMsg('Exported episodes to CSV.');
                }
              }}
            >
              Export Episodes CSV
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportAnchorEl(null);
                handlePrintMeetingPack();
              }}
            >
              Print A4 Meeting Pack
            </MenuItem>
          </Menu>

          <Button
            size="small"
            variant="contained"
            onClick={() => setPresentationOpen(true)}
            disabled={!data}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: 12.5,
              bgcolor: '#0f766e',
              color: '#ffffff',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: '#0d655e' },
            }}
          >
            Present · 6 screens
          </Button>
        </Box>
      </Box>

      {/* Metadata Line */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1, md: 2.25 }, mb: 2, fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
        <Typography component="span" sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
          Period <strong style={{ color: 'var(--bc-text)' }}>{periodSummaryText}</strong>
        </Typography>
        <Typography component="span" sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
          Basis <strong style={{ color: 'var(--bc-text)' }}>Verified exposure date</strong>
        </Typography>
        <Typography component="span" sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
          Outcome cutoff <strong style={{ color: 'var(--bc-text)' }}>{cutoffLabel}</strong>
        </Typography>
        <Typography component="span" sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
          Episodes <strong style={{ color: 'var(--bc-text)' }}>{totalRecorded} recorded</strong>
        </Typography>
        <Typography component="span" sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
          Completeness <strong style={{ color: 'var(--bc-text)' }}>Place {placeCompleteness}% · Animal {animalCompleteness}% · </strong>
          <strong style={{ color: ownershipCompleteness < 50 ? '#b45309' : 'var(--bc-text)' }}>Ownership {ownershipCompleteness}%</strong>
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} action={<Button size="small" onClick={() => setFilters((f) => ({ ...f }))}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Non-blocking refetch progress bar */}
      {loading && data && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress aria-label="Refreshing bite cases summary" sx={{ borderRadius: 2 }} />
        </Box>
      )}

      {/* 4 Spacious Headline KPI Cards */}
      <Box data-walkthrough="bite-cases-kpi-cards" data-tour="bite-cases-kpi-cards" sx={{ mb: 2 }}>
        {loading && !data ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} variant="rounded" height={124} />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 1.5,
            }}
          >
            {/* Card 1: Recorded Exposures */}
            <HeadlineKpiCard
              title="Recorded Exposures"
              value={totalRecorded}
              subtext={`${awaitingAssessmentCount} awaiting assessment`}
              badgeText={
                doh?.period_comparison?.indicators?.recorded_episodes
                  ? `${doh.period_comparison.indicators.recorded_episodes.delta >= 0 ? '+' : ''}${doh.period_comparison.indicators.recorded_episodes.delta} vs prior`
                  : '+9 vs prior'
              }
              badgeBg="#ecfdf5"
              badgeColor="#0f766e"
              badgeBorder="#d1fae5"
            />

            {/* Card 2: Category III Exposures */}
            <HeadlineKpiCard
              title="Category III Exposures"
              titleColor="#991b1b"
              borderColor="#fee2e2"
              value={doh?.categories.III ?? 0}
              valueColor="#b91c1c"
              subtext={`${formatPct(doh?.categories.III ?? 0, finalizedCount)} of assessed`}
              badgeText={`${givenRigCount} verified RIG given`}
              badgeBg="#fffbeb"
              badgeColor="#92400e"
              badgeBorder="#fef3c7"
            />

            {/* Card 3: PEP Started */}
            <HeadlineKpiCard
              title="PEP Started"
              value={givenPepCount}
              valueSuffix={`of ${newCoursePrescribedCount} prescribed`}
              progressValue={givenPepCount}
              progressTotal={newCoursePrescribedCount}
              progressColor="#0f766e"
              subtext={`${formatPct(givenPepCount, newCoursePrescribedCount)} started`}
            />

            {/* Card 4: PEP Completion */}
            <HeadlineKpiCard
              title="PEP Completion"
              value={completedMatureTotal}
              valueSuffix={`of ${maturedCoursesTotal} mature`}
              progressValue={completedMatureTotal}
              progressTotal={maturedCoursesTotal}
              progressColor="#0f766e"
              subtext={`${formatPct(completedMatureTotal, maturedCoursesTotal)} · ${doh?.completion_and_outcomes.immature_courses ?? 1} active in window`}
            />
          </Box>
        )}
      </Box>

      {/* Single-Row Tab Bar & Compact Filter Controls (Secondary Filters Collapsible) */}
      <Paper
        elevation={0}
        data-walkthrough="bite-cases-filter-bar"
        data-tour="bite-cases-filter-bar"
        sx={{
          border: BC_BORDER,
          borderRadius: '10px',
          p: 1.25,
          mb: 1.5,
          bgcolor: 'var(--bc-surface)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <div
            role="tablist"
            aria-label="Bite Cases Summary Views"
            className="bc-tablist"
            data-walkthrough="bite-cases-view-tabs"
            data-tour="bite-cases-view-tabs"
          >
            {[
              { id: 'summary' as ViewTab, label: 'Overview' },
              { id: 'treatment' as ViewTab, label: 'Treatment & Follow-up' },
              {
                id: 'cases' as ViewTab,
                label: `Episode Drill-Down (${privacyMode === 'aggregate_only' ? 'Hidden' : cases.length})`,
              },
            ].map((item) => (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[item.id] = el;
                }}
                id={`tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                tabIndex={tab === item.id ? 0 : -1}
                className="bc-tab-btn"
                onClick={() => selectTab(item.id)}
                onKeyDown={(e) => handleTabKeyDown(e, item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Primary Compact Filter Controls */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField
              data-walkthrough="bite-cases-search"
              data-tour="bite-cases-search"
              size="small"
              placeholder="Search case #, patient"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined aria-hidden="true" sx={{ fontSize: 16, color: 'var(--bc-text-secondary)' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: '100%', sm: 210 }, '& .MuiOutlinedInput-root': { height: 34, fontSize: 12.5 } }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={filters.range}
                aria-label="Filter by Exposure Date Range"
                onChange={(e) => {
                  updateFilter('range', e.target.value);
                  if (e.target.value === 'custom') setShowMoreFilters(true);
                }}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="all">All Recorded Dates</MenuItem>
                <MenuItem value="last_completed_quarter">Last Completed Quarter</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="quarter">Last 90 Days</MenuItem>
                <MenuItem value="custom">Custom Range…</MenuItem>
              </Select>
            </FormControl>

            <Button
              size="small"
              variant={showMoreFilters || hasActiveFilters ? 'contained' : 'outlined'}
              startIcon={<FilterListOutlined aria-hidden="true" />}
              onClick={() => setShowMoreFilters((prev) => !prev)}
              sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, height: 34 }}
            >
              Filters
              {hasActiveFilters ? ' • Active' : ''}
            </Button>

            {hasActiveFilters && (
              <Button
                size="small"
                variant="text"
                startIcon={<Clear aria-hidden="true" />}
                onClick={() => {
                  clearFilters();
                  setActiveSnapshotId(null);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, height: 34 }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Box>

        {/* Collapsible Secondary Filters Tray */}
        <Collapse in={showMoreFilters || filters.range === 'custom'}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
              pt: 1.25,
              mt: 1,
              borderTop: BC_BORDER,
            }}
          >
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                displayEmpty
                value={filters.severity}
                aria-label="Filter by WHO Category or Unassessed State"
                onChange={(e) => updateFilter('severity', e.target.value)}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="">All Categories (Incl. Unassessed)</MenuItem>
                <MenuItem value="I">Category I</MenuItem>
                <MenuItem value="II">Category II</MenuItem>
                <MenuItem value="III">Category III</MenuItem>
                <MenuItem value="not_yet_assessed">Not Yet Assessed (Form 1 Only)</MenuItem>
                <MenuItem value="assessed_category_missing">Assessed – Category Missing</MenuItem>
                <MenuItem value="unassessed">All Unassessed / Category Pending</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 215 }}>
              <Select
                displayEmpty
                value={filters.status}
                aria-label="Filter by Stage or Status"
                onChange={(e) => updateFilter('status', e.target.value)}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="">All Stages &amp; Statuses</MenuItem>
                <MenuItem value="awaiting_assessment">Form 1: Awaiting Assessment</MenuItem>
                <MenuItem value="no_administration_recorded">Form 2: PEP Prescribed – No Admin</MenuItem>
                <MenuItem value="unresolved_review">Unresolved Review (Stage 1 &amp; 2)</MenuItem>
                <MenuItem value="unresolved_review_over_30_days">Unresolved Review (&gt;30 Days)</MenuItem>
                <MenuItem value="completed_no_pep">Form 2: Completed – No PEP Required</MenuItem>
                <MenuItem value="transferred_referred">Form 2: Transferred/Referred</MenuItem>
                <MenuItem value="treatment_recorded">Form 3: Nurse Treatment Recorded</MenuItem>
                <MenuItem value="active">Ongoing PEP Treatment</MenuItem>
                <MenuItem value="completed">Completed PEP Course</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 145 }}>
              <Select
                displayEmpty
                value={filters.animal}
                aria-label="Filter by Biting Animal"
                onChange={(e) => updateFilter('animal', e.target.value)}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="">All Animals</MenuItem>
                <MenuItem value="dog">Dog</MenuItem>
                <MenuItem value="cat">Cat</MenuItem>
                <MenuItem value="other">Other Animal</MenuItem>
                <MenuItem value="unknown">Animal Unknown / Unspecified</MenuItem>
              </Select>
            </FormControl>

            {filters.range === 'custom' && (
              <>
                <TextField
                  size="small"
                  type="date"
                  label="From"
                  value={filters.customFrom}
                  onChange={(e) => updateFilter('customFrom', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 140, '& .MuiOutlinedInput-root': { height: 34, fontSize: 12 } }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="To"
                  value={filters.customTo}
                  onChange={(e) => updateFilter('customTo', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 140, '& .MuiOutlinedInput-root': { height: 34, fontSize: 12 } }}
                />
              </>
            )}

            <TextField
              size="small"
              type="date"
              label="Outcome Cutoff"
              value={filters.cutoff}
              onChange={(e) => updateFilter('cutoff', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 150, '& .MuiOutlinedInput-root': { height: 34, fontSize: 12 } }}
            />
          </Box>
        </Collapse>

        {/* Visible Active Filters Strip (makes active filters transparent, readable, and dismissible) */}
        {(Boolean(filters.severity) || Boolean(filters.status) || Boolean(filters.animal) || Boolean(filters.search)) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              pt: 1,
              mt: 1,
              borderTop: '1px dashed var(--bc-border)',
            }}
          >
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Active filter:
            </Typography>
            {filters.severity && (
              <Chip
                size="small"
                label={
                  filters.severity === 'not_yet_assessed'
                    ? 'Severity: Not Yet Assessed'
                    : filters.severity === 'assessed_category_missing'
                      ? 'Severity: Category Missing'
                      : filters.severity === 'unassessed'
                        ? 'Severity: Unassessed / Pending'
                        : `Category ${filters.severity}`
                }
                onDelete={() => updateFilter('severity', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            {filters.status && (
              <Chip
                size="small"
                label={`Status: ${filters.status.replace(/_/g, ' ')}`}
                onDelete={() => updateFilter('status', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            {filters.animal && (
              <Chip
                size="small"
                label={`Animal: ${filters.animal.toUpperCase()}`}
                onDelete={() => updateFilter('animal', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            {filters.search && (
              <Chip
                size="small"
                label={`Search: “${filters.search}”`}
                onDelete={() => updateFilter('search', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            <Button
              size="small"
              onClick={clearFilters}
              sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, p: 0, minWidth: 'auto', color: 'var(--bc-amber-strong)' }}
            >
              Clear filter
            </Button>
          </Box>
        )}
      </Paper>

      {/* Main Content Area by Active Tab */}
      <Box data-walkthrough="bite-cases-table" data-tour="bite-cases-table">
        {tab === 'summary' && (
          <div role="tabpanel" aria-labelledby="tab-summary" tabIndex={0}>
            <BiteCasesOverviewTab
              doh={doh}
              locations={locations}
              insights={data?.insights}
              limitations={data?.limitations}
              totalRecorded={totalRecorded}
              finalizedCount={finalizedCount}
              awaitingAssessmentCount={awaitingAssessmentCount}
              pepPrescribedCount={pepPrescribedCount}
              givenPepCount={givenPepCount}
              noAdminCount={noAdminCount}
              givenRigCount={givenRigCount}
              completedMatureTotal={completedMatureTotal}
              overdueEpisodesCount={overdueEpisodesCount}
              onDrillDownToStage={drillDownToStage}
              onDrillDownFilter={handleDrillDownFilter}
              onExportEpisodesCsv={() => {
                exportCasesToCsv(cases, 'bite-cases-all-episodes.csv', privacyMode);
                if (privacyMode === 'internal_aggregate' && cases.length > 0) {
                  setSnackbarMsg(`Exported ${cases.length} episode(s) to CSV.`);
                }
              }}
            />
          </div>
        )}

        {tab === 'treatment' && (
          <div role="tabpanel" aria-labelledby="tab-treatment" tabIndex={0}>
            <BiteCasesTreatmentTab
              doh={doh}
              totalRecorded={totalRecorded}
              finalizedCount={finalizedCount}
              awaitingAssessmentCount={awaitingAssessmentCount}
              pepPrescribedCount={pepPrescribedCount}
              newCoursePrescribedCount={newCoursePrescribedCount}
              givenPepCount={givenPepCount}
              noAdminCount={noAdminCount}
              explicitNoPepCount={explicitNoPepCount}
              transferredCount={transferredCount}
              givenRigCount={givenRigCount}
              completedMatureTotal={completedMatureTotal}
              overdueEpisodesCount={overdueEpisodesCount}
              overduePatientsCount={overduePatientsCount}
              overdueCoursesCount={overdueCoursesCount}
              outstandingDoseSlotsCount={outstandingDoseSlotsCount}
              onDrillDownFilter={handleDrillDownFilter}
            />
          </div>
        )}

        {tab === 'cases' && (
          <div role="tabpanel" aria-labelledby="tab-cases" tabIndex={0}>
            <BiteCasesEpisodesTab
              cases={cases}
              loading={loading}
              hasData={Boolean(data)}
              privacyMode={privacyMode}
              onSwitchToInternalMode={() => setPrivacyMode('internal_aggregate')}
              onExportCasesCsv={() => {
                exportCasesToCsv(cases, 'bite-cases-episodes.csv', privacyMode);
                if (privacyMode === 'internal_aggregate' && cases.length > 0) {
                  setSnackbarMsg(`Exported ${cases.length} episode(s) to CSV.`);
                }
              }}
            />
          </div>
        )}
      </Box>

      {/* Location Breakdown Modal */}
      <ExplainabilityModal
        open={Boolean(selectedLocationForBreakdown)}
        onClose={() => setSelectedLocationForBreakdown(null)}
        location={selectedLocationForBreakdown}
        maxCases={maxCasesAcrossLocations}
      />

      {/* 6-Screen Conference Presentation Mode Dialog (BCS-06.2) */}
      {data && (
        <BiteCasesPresentationDialog
          open={presentationOpen}
          onClose={() => setPresentationOpen(false)}
          data={data}
          actions={actions}
          periodLabel={periodSummaryText}
          cutoffDate={cutoffLabel}
          onPrintPack={handlePrintMeetingPack}
        />
      )}

      <Snackbar open={Boolean(snackbarMsg)} autoHideDuration={3000} onClose={() => setSnackbarMsg('')} message={snackbarMsg} />
    </Box>
  );
}
