import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControl,
  FormControlLabel,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  Clear,
  FilterListOutlined,
  KeyboardArrowDownOutlined,
  SearchOutlined,
} from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';
import { BiteCasesEpisodesTab } from '../components/BiteCasesEpisodesTab';
import { BiteCasesOverviewTab } from '../components/BiteCasesOverviewTab';
import { BiteCasesPresentationDialog } from '../components/BiteCasesPresentationDialog';
import { BC_BORDER } from '../components/BiteCasesSharedUi';
import { BiteCasesTreatmentTab } from '../components/BiteCasesTreatmentTab';
import {
  BITE_SUMMARY_AGE_GROUPS,
  computeDateRange,
  formatDaysAgo,
  formatPct,
  normalizeSeverityParam,
} from '../types/biteCasesSummary.types';
import type {
  CaseSummary,
  CohortCategoryRow,
  ComparisonMetric,
  DashboardData,
  DohSummary,
  Filters,
  LocationSummary,
  PatientFollowupLog,
  PrivacyMode,
  ReportActionItem,
  StageMatrixRow,
  ViewTab,
} from '../types/biteCasesSummary.types';
import {
  exportAggregateSummaryToCsv,
  exportCasesToCsv,
} from '../utils/biteCaseUtils';
import '../styles/biteCasesAccessibility.css';

// Re-export shared domain types & helpers for external consumers.
export { formatDaysAgo };
export type {
  CaseSummary,
  CohortCategoryRow,
  ComparisonMetric,
  DohSummary,
  LocationSummary,
  StageMatrixRow,
};

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

export default function BiteCaseRiskDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const searchParam = searchParams.get('search') || searchParams.get('location') || '';
  const rangeParam = searchParams.get('range');
  const severityParam = searchParams.get('severity');
  const statusParam = searchParams.get('status') || '';
  const animalParam = searchParams.get('animal') || '';
  const animalStatusParam = searchParams.get('animal_status') || '';
  const animalConditionParam = searchParams.get('animal_condition') || '';
  const channelParam = searchParams.get('channel') || '';
  const ageGroupParam = searchParams.get('age_group') || '';

  const [tab, setTab] = useState<ViewTab>(
    tabParam === 'treatment' || tabParam === 'cases' ? tabParam : 'summary'
  );
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('internal_aggregate');
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const tabRefs = useRef<Record<ViewTab, HTMLButtonElement | null>>({
    summary: null,
    treatment: null,
    cases: null,
  });

  const [filters, setFilters] = useState<Filters>({
    search: searchParam,
    severity: normalizeSeverityParam(severityParam),
    status: statusParam,
    animal: animalParam,
    animalStatus: animalStatusParam,
    animalCondition: animalConditionParam,
    channel: channelParam,
    ageGroup: ageGroupParam,
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

  useEffect(() => {
    if (searchParam) {
      setFilters((f) => ({ ...f, search: searchParam }));
    }
  }, [searchParam]);

  useEffect(() => {
    if (statusParam) {
      setFilters((f) => ({ ...f, status: statusParam }));
    }
  }, [statusParam]);

  const [data, setData] = useState<DashboardData | null>(null);
  const [baselineData, setBaselineData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [actions, setActions] = useState<ReportActionItem[]>([]);
  const [actionsLoaded, setActionsLoaded] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

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
    const next = new URLSearchParams();
    if (tab !== 'summary') next.set('tab', tab);
    if (filters.search) next.set('search', filters.search);
    if (filters.range && filters.range !== 'all') next.set('range', filters.range);
    if (filters.severity) next.set('severity', filters.severity);
    if (filters.status) next.set('status', filters.status);
    if (filters.animal) next.set('animal', filters.animal);
    if (filters.animalStatus) next.set('animal_status', filters.animalStatus);
    if (filters.animalCondition) next.set('animal_condition', filters.animalCondition);
    if (filters.channel) next.set('channel', filters.channel);
    if (filters.ageGroup) next.set('age_group', filters.ageGroup);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [tab, filters, searchParams, setSearchParams]);

  const activeDateRange = useMemo(
    () => computeDateRange(filters.range, filters.customFrom, filters.customTo),
    [filters.range, filters.customFrom, filters.customTo]
  );

  const query = useMemo(() => {
    const { cutoff, search, severity, status, animal, animalStatus, animalCondition, channel, ageGroup } = filters;
    return {
      privacy_mode: privacyMode,
      ...(search ? { search } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(animal ? { animal } : {}),
      ...(animalStatus ? { animal_status: animalStatus } : {}),
      ...(animalCondition ? { animal_condition: animalCondition } : {}),
      ...(channel ? { channel } : {}),
      ...(ageGroup ? { age_group: ageGroup } : {}),
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
        const response = await api.get<DashboardData>('/cases/location-summary', { params: query });
        if (!active) return;
        setData(response.data);
        if (!filters.search && !filters.severity && !filters.status && !filters.animal && !filters.animalStatus && !filters.animalCondition && !filters.channel && !filters.ageGroup) {
          setBaselineData(response.data);
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
  }, [query, refreshNonce]);

  // Lazy-load action register items only when Conference Presentation Mode is opened.
  useEffect(() => {
    if (!presentationOpen || actionsLoaded) return;
    let active = true;
    (async () => {
      try {
        const actRes = await api.get<{ data: ReportActionItem[] }>('/reports/bite-summary/actions');
        if (!active) return;
        setActions(actRes.data.data || []);
        setActionsLoaded(true);
      } catch {
        // Non-blocking if action register is empty or unavailable for this role
      }
    })();
    return () => {
      active = false;
    };
  }, [presentationOpen, actionsLoaded]);

  const handlePrintMeetingPack = async () => {
    try {
      const res = await api.get<string>('/print/reports/bite-summary', {
        params: query,
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

  const handlePrintDailyTurnover = async () => {
    try {
      const res = await api.get<string>('/print/reports/daily-turnover', {
        responseType: 'text' as unknown as 'json',
      });
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(String(res.data));
        printWin.document.close();
      } else {
        setSnackbarMsg('Please allow pop-ups to open the Daily Shift Turnover Slip.');
      }
    } catch {
      setSnackbarMsg('Unable to generate Daily Shift Turnover Slip.');
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
      animalStatus: '',
      animalCondition: '',
      channel: '',
      ageGroup: '',
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
      filters.animalStatus ||
      filters.animalCondition ||
      filters.channel ||
      filters.ageGroup ||
      filters.cutoff ||
      filters.range !== 'all'
  );

  const locations = data?.locations ?? [];
  const cases = data?.cases ?? [];
  const doh = data?.doh_summary;

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
    animal_status?: string;
    animal_condition?: string;
    channel?: string;
    age_group?: string;
    search?: string;
    range?: string;
  }) => {
    setFilters((f) => ({
      ...f,
      ...(next.status !== undefined ? { status: next.status } : {}),
      ...(next.severity !== undefined ? { severity: next.severity } : {}),
      ...(next.animal !== undefined ? { animal: next.animal } : {}),
      ...(next.animal_status !== undefined ? { animalStatus: next.animal_status } : {}),
      ...(next.animal_condition !== undefined ? { animalCondition: next.animal_condition } : {}),
      ...(next.channel !== undefined ? { channel: next.channel } : {}),
      ...(next.age_group !== undefined ? { ageGroup: next.age_group } : {}),
      ...(next.search !== undefined ? { search: next.search } : {}),
      ...(next.range !== undefined && ALLOWED_RANGES.includes(next.range) ? { range: next.range } : {}),
    }));
    selectTab('cases');
  };

  const handleJumpToOverdue = () => {
    selectTab('treatment');
    window.setTimeout(() => {
      document.getElementById('bc-overdue-followup-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  };

  const hasSecondaryFilters = Boolean(
    filters.search ||
      filters.severity ||
      filters.status ||
      filters.animal ||
      filters.animalStatus ||
      filters.animalCondition ||
      filters.channel ||
      filters.ageGroup
  );
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

  const handleCaseLogsUpdated = (biteId: number, log: PatientFollowupLog) => {
    setData((prev) => {
      if (!prev?.cases) return prev;
      return {
        ...prev,
        cases: prev.cases.map((c) =>
          c.bite_id === biteId
            ? {
                ...c,
                followup_logs: [log, ...(c.followup_logs ?? [])],
                followup_logs_count: (c.followup_logs_count ?? 0) + 1,
              }
            : c
        ),
      };
    });
  };

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
            <Typography
              component="h1"
              sx={{
                fontSize: '22px',
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: '-0.5px',
                color: 'var(--bc-text)',
              }}
            >
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
            <MenuItem
              onClick={() => {
                setExportAnchorEl(null);
                handlePrintDailyTurnover();
              }}
            >
              Print Daily Shift Turnover Slip
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
            />

            {/* Card 2: Category III Exposures */}
            <HeadlineKpiCard
              title="Category III Exposures"
              titleColor="#991b1b"
              borderColor="#fee2e2"
              value={activeDoh?.categories.III ?? 0}
              valueColor="#b91c1c"
              subtext={`${formatPct(activeDoh?.categories.III ?? 0, finalizedCount)} of assessed`}
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
              subtext={`${formatPct(completedMatureTotal, maturedCoursesTotal)} · ${activeDoh?.completion_and_outcomes.immature_courses ?? 0} ongoing treatment`}
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
                <MenuItem value="rig_pending">RIG Pending (Category III / Indicated)</MenuItem>
                <MenuItem value="awaiting_assessment">Form 1: Awaiting Assessment</MenuItem>
                <MenuItem value="unassessed_over_48h">Form 1: Unassessed &gt; 48 Hours</MenuItem>
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
                <MenuItem value="species_unknown">Species Unknown</MenuItem>
                <MenuItem value="species_not_recorded">Species Not Recorded</MenuItem>
                <MenuItem value="unknown">Animal Unknown / Unspecified</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 155 }}>
              <Select
                displayEmpty
                value={filters.animalStatus}
                aria-label="Filter by Animal Ownership"
                onChange={(e) => updateFilter('animalStatus', e.target.value)}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="">All Ownership</MenuItem>
                <MenuItem value="owned">Owned</MenuItem>
                <MenuItem value="stray">Stray</MenuItem>
                <MenuItem value="unknown">Ownership Unknown</MenuItem>
                <MenuItem value="not_recorded">Ownership Not Recorded</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 165 }}>
              <Select
                displayEmpty
                value={filters.animalCondition}
                aria-label="Filter by Animal Condition"
                onChange={(e) => updateFilter('animalCondition', e.target.value)}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="">All Animal Conditions</MenuItem>
                <MenuItem value="healthy">Healthy</MenuItem>
                <MenuItem value="sick">Sick</MenuItem>
                <MenuItem value="died">Dead / Died</MenuItem>
                <MenuItem value="unknown">Condition Unknown</MenuItem>
                <MenuItem value="not_recorded">Condition Not Recorded</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 145 }}>
              <Select
                displayEmpty
                value={filters.channel}
                aria-label="Filter by Registration Channel"
                onChange={(e) => updateFilter('channel', e.target.value)}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="">All Channels</MenuItem>
                <MenuItem value="walk_in">Walk-in</MenuItem>
                <MenuItem value="online">Online</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 190 }}>
              <Select
                displayEmpty
                value={filters.ageGroup}
                aria-label="Filter by Age Group"
                onChange={(e) => updateFilter('ageGroup', e.target.value)}
                sx={{ height: 34, fontSize: 12.5 }}
              >
                <MenuItem value="">All Age Groups</MenuItem>
                {BITE_SUMMARY_AGE_GROUPS.map((group) => (
                  <MenuItem key={group.key} value={group.key}>
                    {group.label} ({group.range})
                  </MenuItem>
                ))}
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
        {(Boolean(filters.severity) ||
          Boolean(filters.status) ||
          Boolean(filters.animal) ||
          Boolean(filters.animalStatus) ||
          Boolean(filters.animalCondition) ||
          Boolean(filters.channel) ||
          Boolean(filters.ageGroup) ||
          Boolean(filters.search)) && (
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
                label={`Animal: ${filters.animal.replace(/_/g, ' ').toUpperCase()}`}
                onDelete={() => updateFilter('animal', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            {filters.animalStatus && (
              <Chip
                size="small"
                label={`Ownership: ${filters.animalStatus.replace(/_/g, ' ')}`}
                onDelete={() => updateFilter('animalStatus', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            {filters.animalCondition && (
              <Chip
                size="small"
                label={`Condition: ${filters.animalCondition === 'died' ? 'dead / died' : filters.animalCondition.replace(/_/g, ' ')}`}
                onDelete={() => updateFilter('animalCondition', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            {filters.channel && (
              <Chip
                size="small"
                label={`Channel: ${filters.channel === 'walk_in' ? 'Walk-in' : 'Online'}`}
                onDelete={() => updateFilter('channel', '')}
                sx={{ fontSize: 12, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text)' }}
              />
            )}
            {filters.ageGroup && (
              <Chip
                size="small"
                label={(() => {
                  const matched = BITE_SUMMARY_AGE_GROUPS.find((g) => g.key === filters.ageGroup);
                  return matched ? `Age group: ${matched.label} (${matched.range})` : `Age group: ${filters.ageGroup}`;
                })()}
                onDelete={() => updateFilter('ageGroup', '')}
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
              clinicalAlerts={data?.clinical_alerts}
              insights={data?.insights}
              limitations={data?.limitations}
              totalRecorded={totalRecorded}
              finalizedCount={finalizedCount}
              awaitingAssessmentCount={awaitingAssessmentCount}
              pepPrescribedCount={pepPrescribedCount}
              givenPepCount={givenPepCount}
              noAdminCount={noAdminCount}
              onDrillDownToStage={drillDownToStage}
              onDrillDownFilter={handleDrillDownFilter}
              onJumpToOverdue={handleJumpToOverdue}
              onNotify={(msg) => setSnackbarMsg(msg)}
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
              cases={cases}
              privacyMode={privacyMode}
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
              onSwitchToInternalMode={() => setPrivacyMode('internal_aggregate')}
              onCaseLogsUpdated={handleCaseLogsUpdated}
              onNotify={(msg) => setSnackbarMsg(msg)}
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
              onCaseUpdated={() => setRefreshNonce((n) => n + 1)}
              onNotify={(msg) => setSnackbarMsg(msg)}
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
