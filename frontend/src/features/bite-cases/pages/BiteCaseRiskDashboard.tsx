import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AssessmentOutlined,
  CheckCircleOutlined,
  Clear,
  CloseOutlined,
  ErrorOutlined,
  FileDownloadOutlined,
  FilterAltOutlined,
  HelpOutlineOutlined,
  InfoOutlined,
  LocationOnOutlined,
  MapOutlined,
  OpenInNewOutlined,
  PetsOutlined,
  SearchOutlined,
  TrendingDown,
  TrendingUp,
  WarningAmberOutlined,
} from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';

export type PriorityLevel = 'high' | 'medium' | 'low' | 'limited_data';
type RiskLevel = 'high' | 'medium' | 'low';

export type LocationSummary = {
  location: string;
  location_level: string;
  risk_score: number;
  risk_level: RiskLevel;
  total_cases: number;
  cat_1: number;
  cat_2: number;
  cat_3: number;
  animal_types: Record<string, number>;
  pep_compliance: number;
  overdue_doses: number;
  trend: 'up' | 'down' | 'neutral' | 'new';
  trend_diff: number | null;
  last_incident: string | null;
  last_incident_days_ago: number | null;
};

type CaseSummary = {
  bite_id: number;
  case_number: string;
  patient_name: string;
  bite_date: string | null;
  location: string;
  category: string;
  animal_type: string;
  status: string;
};

type DashboardData = {
  summary: {
    total_cases: number;
    active_cases: number;
    completed: number;
    high_risk_zones: number;
    overdue_doses: number;
    pep_compliance: number;
  };
  locations: LocationSummary[];
  cases: CaseSummary[];
  risk_alerts: {
    high_risk_zones: string[];
    overdue_count: number;
  };
};

type Filters = {
  search: string;
  severity: string;
  status: string;
  animal: string;
  range: string;
  customFrom: string;
  customTo: string;
};

const BORDER = '0.5px solid #e5e7eb';

export const priorityConfig: Record<
  PriorityLevel,
  { label: string; color: string; background: string; border: string; desc: string }
> = {
  high: {
    label: 'High Priority',
    color: '#ef4444',
    background: '#fef2f2',
    border: '#fecaca',
    desc: 'High case volume, severe Category III exposures, or overdue PEP patients requiring immediate attention.',
  },
  medium: {
    label: 'Medium Priority',
    color: '#f59e0b',
    background: '#fffbeb',
    border: '#fde68a',
    desc: 'Moderate case frequency or mixed exposure severity. Continue standard monitoring.',
  },
  low: {
    label: 'Low Priority',
    color: '#16a34a',
    background: '#f0fdf4',
    border: '#bbf7d0',
    desc: 'Low bite case counts and stable follow-up compliance.',
  },
  limited_data: {
    label: 'Limited Data (N<3)',
    color: '#2563eb',
    background: '#eff6ff',
    border: '#bfdbfe',
    desc: 'Small sample size (<3 cases). An isolated incident does not establish an area-wide outbreak pattern.',
  },
};

export interface PriorityBreakdown {
  caseBurdenScore: number;
  severityScore: number;
  overdueScore: number;
  trendScore: number;
  compositeScore: number;
  priorityLevel: PriorityLevel;
  isLimitedData: boolean;
  explanation: string;
}

/**
 * Computes transparent, bounded (0-100) descriptive surveillance scores
 * synthesizing Case Volume, Category III Severity, Overdue PEP, and Trend.
 */
export function computePriorityBreakdown(
  row: LocationSummary,
  maxCasesAcrossLocations: number = 1
): PriorityBreakdown {
  const isLimitedData = row.total_cases < 3;

  // 1. Case Burden: Volume relative to the most active location in this period (0-100)
  const caseBurdenScore = Math.min(
    100,
    Math.round((row.total_cases / Math.max(1, maxCasesAcrossLocations)) * 100)
  );

  // 2. Exposure Severity: Proportion of assessed cases that are Category III (0-100)
  const severityScore =
    row.total_cases > 0 ? Math.min(100, Math.round((row.cat_3 / row.total_cases) * 100)) : 0;

  // 3. Overdue PEP Follow-up Concern (0-100)
  const overdueScore =
    row.total_cases > 0 ? Math.min(100, Math.round((row.overdue_doses / row.total_cases) * 100)) : 0;

  // 4. Period Velocity / Trend (0-100; 50 is stable/neutral)
  let trendScore = 50;
  if (row.trend === 'up') {
    trendScore = Math.min(100, 50 + (row.trend_diff ? Math.min(50, row.trend_diff * 15) : 25));
  } else if (row.trend === 'down') {
    trendScore = Math.max(0, 50 - (row.trend_diff ? Math.min(50, Math.abs(row.trend_diff) * 15) : 25));
  } else if (row.trend === 'new') {
    trendScore = 60;
  }

  // Composite Formula: Burden 35% + Severity 35% + Overdue 20% + Trend 10%
  const rawComposite =
    caseBurdenScore * 0.35 + severityScore * 0.35 + overdueScore * 0.20 + trendScore * 0.10;
  const compositeScore = Math.min(100, Math.max(0, Math.round(rawComposite)));

  let priorityLevel: PriorityLevel;
  if (isLimitedData) {
    priorityLevel = 'limited_data';
  } else if (compositeScore >= 70) {
    priorityLevel = 'high';
  } else if (compositeScore >= 40) {
    priorityLevel = 'medium';
  } else {
    priorityLevel = 'low';
  }

  // Generate plain-English explanation
  let explanation = '';
  if (isLimitedData) {
    explanation = `${row.location} recorded ${row.total_cases} case${
      row.total_cases === 1 ? '' : 's'
    } (${row.cat_3} Category III) during this period. Classified as Limited Data (N<3) to prevent single isolated incidents from distorting community surveillance.`;
  } else if (priorityLevel === 'high') {
    const reasons: string[] = [];
    if (caseBurdenScore >= 60) reasons.push(`substantial bite volume (${row.total_cases} cases)`);
    if (severityScore >= 50)
      reasons.push(`${severityScore}% severe Category III exposures (${row.cat_3}/${row.total_cases})`);
    if (row.overdue_doses > 0)
      reasons.push(`${row.overdue_doses} patient(s) with overdue PEP follow-up`);
    if (row.trend === 'up') reasons.push(`an upward trend (+${row.trend_diff ?? 1} cases)`);
    explanation = `Flagged for High Priority surveillance due to ${reasons.join(
      ', '
    )}. Review and follow-up recommended.`;
  } else if (priorityLevel === 'medium') {
    explanation = `Moderate surveillance activity with ${row.total_cases} recorded bite incidents (${row.cat_3} Cat III, ${row.cat_2} Cat II). Continue routine follow-up tracking and patient education.`;
  } else {
    explanation = `Low surveillance priority with ${row.total_cases} recorded bite incident${
      row.total_cases === 1 ? '' : 's'
    }, low severe exposure rate, and stable follow-up compliance.`;
  }

  return {
    caseBurdenScore,
    severityScore,
    overdueScore,
    trendScore,
    compositeScore,
    priorityLevel,
    isLimitedData,
    explanation,
  };
}

function dateRange(range: string, customFrom: string, customTo: string) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today);
  if (range === 'week') start.setDate(today.getDate() - 6);
  if (range === 'month') start.setMonth(today.getMonth() - 1);
  if (range === 'quarter') start.setMonth(today.getMonth() - 3);
  if (range === 'custom')
    return { ...(customFrom ? { from: customFrom } : {}), ...(customTo ? { to: customTo } : {}) };
  return range === 'all' ? {} : { from: start.toISOString().slice(0, 10), to: end };
}

function Progress({ value, color, width = 74 }: { value: number; color: string; width?: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <Box sx={{ width, height: 4, borderRadius: 2, bgcolor: '#e5e7eb', overflow: 'hidden' }}>
      <Box sx={{ width: `${clampedValue}%`, height: '100%', borderRadius: 2, bgcolor: color }} />
    </Box>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  loading,
  tooltip,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  loading: boolean;
  tooltip?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: '14px 16px',
        border: BORDER,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minWidth: 0,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          borderColor: 'rgba(16, 185, 129, 0.38)',
          boxShadow: '0 8px 22px rgba(16, 185, 129, 0.22), 0 2px 8px rgba(16, 185, 129, 0.12)',
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: `${color}18`,
          color,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {loading ? (
          <Skeleton width={48} height={25} />
        ) : (
          <Typography sx={{ color: '#111827', fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
            {value}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
          <Typography
            sx={{
              color: '#6b7280',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} arrow>
              <InfoOutlined sx={{ fontSize: 13, color: '#9ca3af', cursor: 'help' }} />
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function PriorityPill({
  level,
  onClick,
}: {
  level: PriorityLevel;
  onClick?: () => void;
}) {
  const c = priorityConfig[level];
  return (
    <Box
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.1,
        py: 0.45,
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        bgcolor: c.background,
        color: c.color,
        border: `1px solid ${c.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease',
        '&:hover': onClick ? { transform: 'scale(1.04)' } : undefined,
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.color }} />
      {c.label}
    </Box>
  );
}

function Guide({
  color,
  text,
  tooltip,
}: {
  color: string;
  text: string;
  tooltip?: string;
}) {
  return (
    <Tooltip title={tooltip || ''} arrow>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, cursor: tooltip ? 'help' : 'default' }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
        <Typography sx={{ fontSize: 11, color: '#4b5563', fontWeight: 500 }}>{text}</Typography>
      </Box>
    </Tooltip>
  );
}

function Filter({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <FormControl size="small">
      <Select
        value={value}
        displayEmpty
        onChange={(event) => onChange(event.target.value)}
        inputProps={{ 'aria-label': ariaLabel }}
        sx={{
          minWidth: 125,
          borderRadius: 2,
          fontSize: 12,
          '& fieldset': { borderColor: '#e5e7eb' },
        }}
      >
        {children}
      </Select>
    </FormControl>
  );
}

function AnimalPills({ types }: { types: Record<string, number> }) {
  const info: Record<string, [string, string, string]> = {
    dog: ['Dog', '#2563eb', '#eff6ff'],
    cat: ['Cat', '#7c3aed', '#f5f3ff'],
    other: ['Other', '#6b7280', '#f3f4f6'],
  };
  return (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Object.entries(info)
        .filter(([type]) => (types[type] ?? 0) > 0)
        .map(([type, [label, color, bg]]) => (
          <Box
            key={type}
            sx={{
              px: 0.75,
              py: 0.3,
              borderRadius: 20,
              bgcolor: bg,
              color,
              fontSize: 10,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {label} ×{types[type]}
          </Box>
        ))}
    </Box>
  );
}

function Count({ count, color }: { count: number; color: string }) {
  return count > 0 ? (
    <Typography sx={{ fontSize: 12, color, fontWeight: 700 }}>{count}</Typography>
  ) : (
    <Typography sx={{ color: '#d1d5db', fontSize: 13 }}>—</Typography>
  );
}

/**
 * Breakdown & Explainability Dialog
 */
function ExplainabilityModal({
  location,
  maxCases,
  open,
  onClose,
  onFilterLocation,
  onOpenMap,
}: {
  location: LocationSummary | null;
  maxCases: number;
  open: boolean;
  onClose: () => void;
  onFilterLocation: (loc: string) => void;
  onOpenMap: (loc: string) => void;
}) {
  if (!location) return null;

  const breakdown = computePriorityBreakdown(location, maxCases);
  const cfg = priorityConfig[breakdown.priorityLevel];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: cfg.background,
              color: cfg.color,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <LocationOnOutlined sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                {location.location}
              </Typography>
              <Chip
                label={location.location_level || 'Area'}
                size="small"
                sx={{ fontSize: 10, height: 20, bgcolor: '#f3f4f6', color: '#4b5563', fontWeight: 600 }}
              />
            </Box>
            <Typography sx={{ fontSize: 12, color: '#6b7280', mt: 0.2 }}>
              Descriptive Surveillance Priority Breakdown
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#9ca3af' }}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5, pb: 2 }}>
        {/* Descriptive Analytics Disclaimer */}
        <Alert
          severity="info"
          icon={<InfoOutlined sx={{ fontSize: 18 }} />}
          sx={{
            mb: 2.5,
            fontSize: 11.5,
            bgcolor: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            '& .MuiAlert-message': { lineHeight: 1.5 },
          }}
        >
          <strong>System-Generated Descriptive Analytics:</strong> This index summarizes clinic animal bite records to
          help healthcare personnel prioritize follow-ups and community bite awareness. It is not an official
          epidemiological rabies outbreak declaration.
        </Alert>

        {/* Priority Summary Banner */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: '12px',
            border: `1px solid ${cfg.border}`,
            bgcolor: cfg.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
              <PriorityPill level={breakdown.priorityLevel} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
                Priority Index: {breakdown.compositeScore} / 100
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
              {breakdown.explanation}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', pr: 1 }}>
            <Typography sx={{ fontSize: 10.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Exposure Ratio
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {Math.min(100, location.risk_score)}%
            </Typography>
            <Typography sx={{ fontSize: 9.5, color: '#9ca3af' }}>
              (Cat III × 1.5 + Cat II)
            </Typography>
          </Box>
        </Paper>

        {/* 4 Core Indicators Grid */}
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mb: 1.25 }}>
          Four Core Surveillance Indicators
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2.5 }}>
          {/* 1. Case Burden */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                1. Case Burden (Volume)
              </Typography>
              <Chip label="Weight: 35%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: '#e5e7eb' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: '#4b5563', mb: 1 }}>
              {location.total_cases} incident{location.total_cases === 1 ? '' : 's'} ({breakdown.caseBurdenScore}% of peak volume)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.caseBurdenScore} color="#3b82f6" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#1e40af' }}>
                {breakdown.caseBurdenScore} pts
              </Typography>
            </Box>
          </Paper>

          {/* 2. Exposure Severity */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                2. Exposure Severity (Cat III)
              </Typography>
              <Chip label="Weight: 35%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: '#e5e7eb' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: '#4b5563', mb: 1 }}>
              {location.cat_3} Cat III, {location.cat_2} Cat II, {location.cat_1} Cat I ({breakdown.severityScore}% severe)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.severityScore} color="#ef4444" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>
                {breakdown.severityScore} pts
              </Typography>
            </Box>
          </Paper>

          {/* 3. PEP Follow-Up Concern */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                3. Overdue PEP Follow-Up
              </Typography>
              <Chip label="Weight: 20%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: '#e5e7eb' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: '#4b5563', mb: 1 }}>
              {location.overdue_doses} overdue patient{location.overdue_doses === 1 ? '' : 's'} · {location.pep_compliance}% compliance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.overdueScore} color="#f59e0b" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>
                {breakdown.overdueScore} pts
              </Typography>
            </Box>
          </Paper>

          {/* 4. Case Trend */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                4. Period Velocity / Trend
              </Typography>
              <Chip label="Weight: 10%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: '#e5e7eb' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: '#4b5563', mb: 1 }}>
              {location.trend === 'up'
                ? `Surge: +${location.trend_diff ?? 0} vs last period`
                : location.trend === 'down'
                ? `Decrease: ${location.trend_diff ?? 0} vs last period`
                : location.trend === 'new'
                ? 'Newly recorded location'
                : 'Stable case volume'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.trendScore} color="#8b5cf6" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6d28d9' }}>
                {breakdown.trendScore} pts
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Small Data Warning if N < 3 */}
        {breakdown.isLimitedData && (
          <Alert
            severity="warning"
            icon={<WarningAmberOutlined sx={{ fontSize: 18 }} />}
            sx={{
              mb: 2,
              fontSize: 11.5,
              bgcolor: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '10px',
            }}
          >
            <strong>Small-Sample Protection Active:</strong> Because this location has only {location.total_cases}{' '}
            case{location.total_cases === 1 ? '' : 's'} recorded, it is marked as Limited Data. Isolated individual
            exposures are not treated as community outbreak clusters.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 0, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FilterAltOutlined fontSize="small" />}
            onClick={() => {
              onFilterLocation(location.location);
              onClose();
            }}
            sx={{ borderColor: '#d1d5db', color: '#374151', textTransform: 'none', fontSize: 12, borderRadius: 2 }}
          >
            Filter Cases for this Location
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MapOutlined fontSize="small" />}
            onClick={() => {
              onOpenMap(location.location);
              onClose();
            }}
            sx={{ borderColor: '#d1d5db', color: '#374151', textTransform: 'none', fontSize: 12, borderRadius: 2 }}
          >
            View in Bite Map
          </Button>
        </Box>
        <Button
          size="small"
          onClick={onClose}
          sx={{ color: '#6b7280', textTransform: 'none', fontSize: 12 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function LocationRow({
  row,
  index,
  maxCases,
  onOpenBreakdown,
  onFilterLocation,
}: {
  row: LocationSummary;
  index: number;
  maxCases: number;
  onOpenBreakdown: (row: LocationSummary) => void;
  onFilterLocation: (loc: string) => void;
}) {
  const breakdown = computePriorityBreakdown(row, maxCases);
  const cfg = priorityConfig[breakdown.priorityLevel];
  const complianceColor =
    row.pep_compliance >= 80 ? '#16a34a' : row.pep_compliance >= 50 ? '#f59e0b' : '#ef4444';

  const trend =
    row.trend === 'up'
      ? {
          icon: <TrendingUp sx={{ fontSize: 15 }} />,
          color: '#ef4444',
          text: `+${row.trend_diff ?? 0} vs last period`,
        }
      : row.trend === 'down'
      ? {
          icon: <TrendingDown sx={{ fontSize: 15 }} />,
          color: '#16a34a',
          text: `${row.trend_diff ?? 0} vs last period`,
        }
      : {
          icon: null,
          color: '#9ca3af',
          text: row.trend === 'new' ? 'New' : '—',
        };

  return (
    <TableRow hover sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
      <TableCell align="center" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>
        {index + 1}
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              bgcolor: cfg.background,
              color: cfg.color,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <LocationOnOutlined sx={{ fontSize: 16 }} />
          </Box>
          <Box>
            <Typography
              onClick={() => onOpenBreakdown(row)}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: '#111827',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                '&:hover': { color: '#1D9E75', textDecoration: 'underline' },
              }}
            >
              {row.location}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#9ca3af' }}>{row.location_level || 'Area'}</Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell align="center">
        <PriorityPill level={breakdown.priorityLevel} onClick={() => onOpenBreakdown(row)} />
      </TableCell>

      <TableCell align="center">
        <Tooltip title="Click to view indicator scoring breakdown" arrow>
          <Box
            onClick={() => onOpenBreakdown(row)}
            sx={{ display: 'grid', justifyItems: 'center', gap: 0.45, cursor: 'pointer' }}
          >
            <Typography sx={{ color: cfg.color, fontSize: 12, fontWeight: 700 }}>
              {breakdown.compositeScore}
              <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}> /100</span>
            </Typography>
            <Progress value={breakdown.compositeScore} color={cfg.color} />
          </Box>
        </Tooltip>
      </TableCell>

      <TableCell align="center">
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.total_cases}</Typography>
      </TableCell>

      <TableCell align="center">
        <Count count={row.cat_3} color="#ef4444" />
      </TableCell>
      <TableCell align="center">
        <Count count={row.cat_2} color="#f59e0b" />
      </TableCell>
      <TableCell align="center">
        <Count count={row.cat_1} color="#1D9E75" />
      </TableCell>
      <TableCell align="center">
        <AnimalPills types={row.animal_types} />
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'grid', justifyItems: 'center', gap: 0.45 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: complianceColor }}>
            {row.pep_compliance}%
          </Typography>
          <Progress value={row.pep_compliance} color={complianceColor} width={70} />
        </Box>
      </TableCell>
      <TableCell align="center">
        {row.overdue_doses > 0 ? (
          <Tooltip title="Patients with an overdue scheduled PEP dose in this location">
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                px: 0.75,
                py: 0.35,
                borderRadius: 20,
                bgcolor: '#fef2f2',
                color: '#dc2626',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              <WarningAmberOutlined sx={{ fontSize: 13 }} />
              {row.overdue_doses} patient{row.overdue_doses === 1 ? '' : 's'}
            </Box>
          </Tooltip>
        ) : (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.35,
              px: 0.75,
              py: 0.35,
              borderRadius: 20,
              bgcolor: '#f0fdf4',
              color: '#16a34a',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            <CheckCircleOutlined sx={{ fontSize: 13 }} />
            None
          </Box>
        )}
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, color: trend.color, fontSize: 10, whiteSpace: 'nowrap' }}>
          {trend.icon}
          {trend.text}
        </Box>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 11, color: '#4b5563', whiteSpace: 'nowrap' }}>
          {row.last_incident ?? '—'}
        </Typography>
        {row.last_incident_days_ago !== null && (
          <Typography sx={{ fontSize: 10, color: '#9ca3af' }}>
            {row.last_incident_days_ago === 0 ? 'Today' : `${row.last_incident_days_ago} days ago`}
          </Typography>
        )}
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="View Area Priority Breakdown" arrow>
            <IconButton
              size="small"
              onClick={() => onOpenBreakdown(row)}
              sx={{ color: '#1D9E75', p: 0.5, '&:hover': { bgcolor: '#ecfdf5' } }}
            >
              <AssessmentOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filter bite cases in this location" arrow>
            <IconButton
              size="small"
              onClick={() => onFilterLocation(row.location)}
              sx={{ color: '#6b7280', p: 0.5, '&:hover': { bgcolor: '#f3f4f6' } }}
            >
              <FilterAltOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

function CaseRow({ row, index }: { row: CaseSummary; index: number }) {
  const statusColor: Record<string, string> = { active: '#1D9E75', completed: '#16a34a', cancelled: '#6b7280' };
  return (
    <TableRow hover sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
      <TableCell align="center" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>
        {index + 1}
      </TableCell>
      <TableCell>
        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', fontWeight: 600 }}>
          {row.case_number}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {row.patient_name}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 12, color: '#4b5563' }}>{row.location}</Typography>
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'inline-flex', px: 0.8, py: 0.3, borderRadius: 20, bgcolor: '#f3f4f6', color: '#4b5563', fontSize: 10, fontWeight: 600 }}>
          Category {row.category}
        </Box>
      </TableCell>
      <TableCell align="center">
        <Typography sx={{ fontSize: 12, textTransform: 'capitalize', color: '#4b5563' }}>
          {row.animal_type}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Box
          sx={{
            display: 'inline-flex',
            px: 0.8,
            py: 0.3,
            borderRadius: 20,
            bgcolor: `${statusColor[row.status] ?? '#6b7280'}18`,
            color: statusColor[row.status] ?? '#6b7280',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'capitalize',
          }}
        >
          {row.status.replaceAll('_', ' ')}
        </Box>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 11, color: '#4b5563' }}>{row.bite_date ?? '—'}</Typography>
      </TableCell>
    </TableRow>
  );
}

export default function BiteCaseRiskDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'risk' | 'cases'>('risk');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    severity: '',
    status: '',
    animal: '',
    range: 'all',
    customFrom: '',
    customTo: '',
  });
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLocationForBreakdown, setSelectedLocationForBreakdown] = useState<LocationSummary | null>(null);

  const query = useMemo(() => {
    const { range, customFrom, customTo, ...params } = filters;
    return { ...params, ...dateRange(range, customFrom, customTo) };
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get<DashboardData>('/cases/location-summary', { params: query });
        setData(response.data);
        setError('');
      } catch {
        setError('Unable to load the bite-case analytics. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const update = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const clear = () =>
    setFilters({
      search: '',
      severity: '',
      status: '',
      animal: '',
      range: 'all',
      customFrom: '',
      customTo: '',
    });

  const maxCases = useMemo(() => {
    if (!data?.locations || data.locations.length === 0) return 1;
    return Math.max(1, ...data.locations.map((l) => l.total_cases));
  }, [data?.locations]);

  // Identify high-priority locations based on descriptive surveillance
  const highPriorityLocations = useMemo(() => {
    if (!data?.locations) return [];
    return data.locations.filter((loc) => {
      const b = computePriorityBreakdown(loc, maxCases);
      return b.priorityLevel === 'high';
    });
  }, [data?.locations, maxCases]);

  const exportCsv = () => {
    if (!data?.locations.length) return;
    const rows = [
      [
        'Location',
        'Location Level',
        'Priority Level',
        'Priority Score',
        'Total Cases',
        'Category III',
        'Category II',
        'Category I',
        'PEP Compliance',
        'Overdue Doses',
        'Trend',
        'Last Incident',
      ],
      ...data.locations.map((row) => {
        const b = computePriorityBreakdown(row, maxCases);
        return [
          row.location,
          row.location_level || 'Area',
          b.priorityLevel,
          `${b.compositeScore}/100`,
          row.total_cases,
          row.cat_3,
          row.cat_2,
          row.cat_1,
          `${row.pep_compliance}%`,
          row.overdue_doses,
          row.last_incident ?? '',
        ];
      }),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'location-surveillance-summary.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFilterLocation = (locationName: string) => {
    setFilters((current) => ({ ...current, search: locationName }));
    setTab('cases');
  };

  const handleOpenMap = (locationName?: string) => {
    navigate(ROUTES.BITE_CASES.MAP);
  };

  const riskHeaders = [
    '#',
    'LOCATION',
    'PRIORITY LEVEL',
    'PRIORITY INDEX',
    'TOTAL CASES',
    'SEVERE (CAT III)',
    'MODERATE (CAT II)',
    'MINOR (CAT I)',
    'ANIMAL TYPE',
    'PEP COMPLIANCE',
    'OVERDUE DOSES',
    'TREND',
    'LAST INCIDENT',
    'ACTIONS',
  ];
  const caseHeaders = [
    '#',
    'CASE NUMBER',
    'PATIENT',
    'LOCATION',
    'SEVERITY',
    'ANIMAL',
    'STATUS',
    'INCIDENT DATE',
  ];
  const headers = tab === 'risk' ? riskHeaders : caseHeaders;

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, py: 1, bgcolor: '#f9fafb', minHeight: '100%' }}>
      {/* ── Page Header ── */}
      <Box sx={{ mb: 2 }}>
        <Typography
          component="h1"
          sx={{
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#3b82f6',
              fontSize: '13px',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Dashboard
          </button>
          <span style={{ color: '#9ca3af' }}>›</span>
          <span style={{ color: '#6b7280' }}>Bite Cases Summary</span>
        </Box>
      </Box>

      {/* ── KPI Stat Cards ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(6, minmax(0, 1fr))',
          },
          gap: 1.25,
          mb: 2,
        }}
      >
        <StatCard
          label="TOTAL CASES"
          value={data?.summary.total_cases ?? 0}
          color="#3b82f6"
          icon={<PetsOutlined fontSize="small" />}
          loading={loading}
          tooltip="Total recorded animal bite incidents matching the active filter criteria."
        />
        <StatCard
          label="ACTIVE CASES"
          value={data?.summary.active_cases ?? 0}
          color="#1D9E75"
          icon={<WarningAmberOutlined fontSize="small" />}
          loading={loading}
          tooltip="Bite cases currently undergoing evaluation, active PEP vaccination, or follow-up."
        />
        <StatCard
          label="COMPLETED"
          value={data?.summary.completed ?? 0}
          color="#16a34a"
          icon={<CheckCircleOutlined fontSize="small" />}
          loading={loading}
          tooltip="Bite cases with full vaccination courses completed and verified."
        />
        <StatCard
          label="HIGH-PRIORITY AREAS"
          value={highPriorityLocations.length || (data?.summary.high_risk_zones ?? 0)}
          color="#ef4444"
          icon={<ErrorOutlined fontSize="small" />}
          loading={loading}
          tooltip="System-generated descriptive classification based on bite volume, Category III severity rate, and follow-up indicators. This is intended to support clinic surveillance and does not represent an official public health outbreak declaration."
        />
        <StatCard
          label="OVERDUE DOSES"
          value={data?.summary.overdue_doses ?? 0}
          color="#f59e0b"
          icon={<WarningAmberOutlined fontSize="small" />}
          loading={loading}
          tooltip="Patients with scheduled PEP vaccination dates in the past who have not yet received their dose."
        />
        <StatCard
          label="PEP COMPLIANCE"
          value={`${data?.summary.pep_compliance ?? 0}%`}
          color="#6b7280"
          icon={<CheckCircleOutlined fontSize="small" />}
          loading={loading}
          tooltip="Proportion of eligible active patients who are up-to-date with their required vaccination regimen."
        />
      </Box>

      {/* ── Explainable Surveillance Alerts Banner ── */}
      {(highPriorityLocations.length > 0 || (data?.summary.overdue_doses ?? 0) > 0) && (
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            p: 1.75,
            borderRadius: '12px',
            border: '1px solid #fecaca',
            bgcolor: '#fef2f2',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <WarningAmberOutlined sx={{ color: '#dc2626', fontSize: 22, mt: 0.1 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#991b1b', fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                Descriptive Surveillance Attention Needed
              </Typography>
              <Typography sx={{ color: '#7f1d1d', fontSize: 11.5, mt: 0.2 }}>
                The system detected areas with high Category III exposure rates, elevated bite counts, or overdue PEP doses.
                Click an area below to view its clinical breakdown and follow-up recommendations.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', pl: 3.5 }}>
            {highPriorityLocations.map((loc) => (
              <Chip
                key={loc.location}
                icon={<LocationOnOutlined sx={{ fontSize: '14px !important', color: '#dc2626 !important' }} />}
                label={`${loc.location} (${loc.total_cases} cases · ${loc.cat_3} Cat III)`}
                size="small"
                onClick={() => setSelectedLocationForBreakdown(loc)}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#fee2e2' },
                }}
              />
            ))}

            {(data?.summary.overdue_doses ?? 0) > 0 && (
              <Chip
                icon={<WarningAmberOutlined sx={{ fontSize: '14px !important', color: '#d97706 !important' }} />}
                label={`${data?.summary.overdue_doses} patient(s) overdue for PEP`}
                size="small"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, status: 'active' }));
                  setTab('cases');
                }}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#b45309',
                  border: '1px solid #fcd34d',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#fef3c7' },
                }}
              />
            )}
          </Box>
        </Paper>
      )}

      {/* ── Tabs & Filter Controls ── */}
      <Paper elevation={0} sx={{ border: BORDER, borderRadius: '12px', p: '12px 14px', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
          <Button
            onClick={() => setTab('risk')}
            variant={tab === 'risk' ? 'contained' : 'text'}
            disableElevation
            sx={{
              bgcolor: tab === 'risk' ? '#1D9E75' : 'transparent',
              color: tab === 'risk' ? '#fff' : '#4b5563',
              '&:hover': { bgcolor: tab === 'risk' ? '#187e5e' : '#f3f4f6' },
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600,
              fontSize: 12.5,
              px: 1.75,
            }}
          >
            Location Priority (Surveillance)
          </Button>
          <Button
            onClick={() => setTab('cases')}
            variant={tab === 'cases' ? 'contained' : 'text'}
            disableElevation
            sx={{
              bgcolor: tab === 'cases' ? '#1D9E75' : 'transparent',
              color: tab === 'cases' ? '#fff' : '#4b5563',
              '&:hover': { bgcolor: tab === 'cases' ? '#187e5e' : '#f3f4f6' },
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600,
              fontSize: 12.5,
              px: 1.75,
            }}
          >
            All Cases ({data?.cases.length ?? 0})
          </Button>

          <Button
            onClick={() => handleOpenMap()}
            variant="outlined"
            size="small"
            startIcon={<MapOutlined fontSize="small" />}
            sx={{
              ml: 'auto',
              borderColor: '#e5e7eb',
              color: '#374151',
              textTransform: 'none',
              fontSize: 11.5,
              borderRadius: 2,
            }}
          >
            Bite Map
          </Button>
        </Box>

        {/* Filter Bar */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(220px, 1fr) repeat(4, minmax(115px, auto)) auto',
            },
            gap: 1,
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search case number, patient, or location…"
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined sx={{ color: '#9ca3af', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 12 },
              '& fieldset': { borderColor: '#e5e7eb' },
            }}
          />
          <Filter value={filters.severity} onChange={(value) => update('severity', value)} ariaLabel="Severity">
            <MenuItem value="">All severity</MenuItem>
            <MenuItem value="I">Category I</MenuItem>
            <MenuItem value="II">Category II</MenuItem>
            <MenuItem value="III">Category III</MenuItem>
          </Filter>
          <Filter value={filters.status} onChange={(value) => update('status', value)} ariaLabel="Status">
            <MenuItem value="">All status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Filter>
          <Filter value={filters.animal} onChange={(value) => update('animal', value)} ariaLabel="Animal type">
            <MenuItem value="">All animals</MenuItem>
            <MenuItem value="dog">Dog</MenuItem>
            <MenuItem value="cat">Cat</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Filter>
          <Filter value={filters.range} onChange={(value) => update('range', value)} ariaLabel="Date range">
            <MenuItem value="all">All time</MenuItem>
            <MenuItem value="week">This week</MenuItem>
            <MenuItem value="month">This month</MenuItem>
            <MenuItem value="quarter">This quarter</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Filter>
          <Button
            onClick={clear}
            startIcon={<Clear fontSize="small" />}
            sx={{ color: '#6b7280', textTransform: 'none', fontSize: 12, whiteSpace: 'nowrap' }}
          >
            Clear
          </Button>
        </Box>

        {filters.range === 'custom' && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <TextField
              label="From"
              type="date"
              size="small"
              value={filters.customFrom}
              onChange={(event) => update('customFrom', event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 12 },
                '& fieldset': { borderColor: '#e5e7eb' },
              }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={filters.customTo}
              onChange={(event) => update('customTo', event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 12 },
                '& fieldset': { borderColor: '#e5e7eb' },
              }}
            />
          </Box>
        )}

        {/* Descriptive Analytics Guide & Legend */}
        <Box
          sx={{
            mt: 1.5,
            pt: 1.25,
            borderTop: '0.5px solid #f3f4f6',
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ fontSize: 11, color: '#374151', fontWeight: 700 }}>
            Surveillance Priority Guide:
          </Typography>
          <Guide color="#ef4444" text="High Priority: ≥70" tooltip="Significant volume, severe Category III exposures, or overdue PEP patients." />
          <Guide color="#f59e0b" text="Medium Priority: 40–69" tooltip="Moderate case activity or mixed severity." />
          <Guide color="#16a34a" text="Low Priority: <40" tooltip="Low volume, mild exposures, and good adherence." />
          <Guide color="#2563eb" text="Limited Data: <3 Cases" tooltip="Small sample size; single bites are not classified as outbreak clusters." />
          <Typography sx={{ ml: { md: 'auto' }, fontSize: 10, color: '#6b7280' }}>
            Composite Priority (0–100) = (Burden × 0.35) + (Severity × 0.35) + (Overdue × 0.20) + (Trend × 0.10)
          </Typography>
        </Box>
      </Paper>

      {/* ── Table Panel ── */}
      <Paper elevation={0} sx={{ border: BORDER, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Box sx={{ px: 1.75, py: 1.4, display: 'flex', alignItems: 'center', gap: 0.75, borderBottom: '0.5px solid #f3f4f6' }}>
          <LocationOnOutlined sx={{ color: '#1D9E75', fontSize: 18 }} />
          <Typography sx={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>
            {tab === 'risk' ? 'Location Priority Summary' : 'All Recorded Bite Cases'}
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: 11 }}>
            {tab === 'risk'
              ? `${data?.locations.length ?? 0} location${data?.locations.length === 1 ? '' : 's'}`
              : `${data?.cases.length ?? 0} case${data?.cases.length === 1 ? '' : 's'}`}
          </Typography>
          <Button
            onClick={exportCsv}
            disabled={!data?.locations.length}
            startIcon={<FileDownloadOutlined fontSize="small" />}
            variant="outlined"
            size="small"
            sx={{ ml: 'auto', borderColor: '#d1d5db', color: '#4b5563', textTransform: 'none', fontSize: 11 }}
          >
            Export CSV
          </Button>
        </Box>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small" sx={{ minWidth: tab === 'risk' ? 1280 : 820, '& .MuiTableCell-root': { borderBottom: '0.5px solid #f9fafb', fontSize: 12, py: 1.15, px: 1.25 } }}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableCell
                    key={header}
                    align={
                      [
                        '#',
                        'PRIORITY LEVEL',
                        'PRIORITY INDEX',
                        'TOTAL CASES',
                        'SEVERE (CAT III)',
                        'MODERATE (CAT II)',
                        'MINOR (CAT I)',
                        'ANIMAL TYPE',
                        'PEP COMPLIANCE',
                        'OVERDUE DOSES',
                        'TREND',
                        'SEVERITY',
                        'ANIMAL',
                        'STATUS',
                        'ACTIONS',
                      ].includes(header)
                        ? 'center'
                        : 'left'
                    }
                    sx={{
                      bgcolor: '#fff',
                      color: '#6b7280',
                      fontWeight: 700,
                      fontSize: '10px !important',
                      letterSpacing: '.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: headers.length }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tab === 'risk' ? (
                data?.locations.map((row, index) => (
                  <LocationRow
                    key={row.location}
                    row={row}
                    index={index}
                    maxCases={maxCases}
                    onOpenBreakdown={(r) => setSelectedLocationForBreakdown(r)}
                    onFilterLocation={handleFilterLocation}
                  />
                ))
              ) : (
                data?.cases.map((row, index) => <CaseRow key={row.bite_id} row={row} index={index} />)
              )}
              {!loading && !(tab === 'risk' ? data?.locations.length : data?.cases.length) && (
                <TableRow>
                  <TableCell colSpan={headers.length} align="center" sx={{ py: '42px !important', color: '#9ca3af' }}>
                    No bite cases match the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Area Priority Breakdown Dialog (Explainability) ── */}
      <ExplainabilityModal
        location={selectedLocationForBreakdown}
        maxCases={maxCases}
        open={Boolean(selectedLocationForBreakdown)}
        onClose={() => setSelectedLocationForBreakdown(null)}
        onFilterLocation={handleFilterLocation}
        onOpenMap={handleOpenMap}
      />

      {/* ── Error Snackbar ── */}
      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
