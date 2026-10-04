import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
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
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Select,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
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
  ViewColumnOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';

// Import accessibility components and utilities
import { AccessibleProgress, AccessibleIconButton } from '../components/AccessibleComponents';
import {
  exportLocationsToCsv,
  exportCasesToCsv,
  type ColumnKey,
  getStoredColumnVisibility,
  saveColumnVisibility,
  DEFAULT_VISIBLE_COLUMNS,
} from '../utils/biteCaseUtils';
import '../styles/biteCasesAccessibility.css';

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

export type CaseSummary = {
  bite_id: number;
  case_number: string;
  patient_id?: number;
  patient_name: string;
  bite_date: string | null;
  location: string;
  category: string;
  animal_type: string;
  status: string;
  is_overdue?: boolean;
  days_overdue?: number;
  overdue_dose?: string | null;
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

const BORDER = '0.5px solid var(--bc-border)';

export const priorityConfig: Record<
  PriorityLevel,
  { label: string; shortLabel: string; color: string; background: string; border: string; desc: string }
> = {
  high: {
    label: 'High Priority',
    shortLabel: 'High',
    color: 'var(--bc-red)',
    background: 'var(--bc-danger-bg)',
    border: 'var(--bc-danger-border)',
    desc: 'High case volume, severe Category III exposures, or overdue PEP patients requiring immediate attention.',
  },
  medium: {
    label: 'Medium Priority',
    shortLabel: 'Medium',
    color: 'var(--bc-amber)',
    background: 'var(--bc-amber-bg)',
    border: 'var(--bc-amber-border)',
    desc: 'Moderate case frequency or mixed exposure severity. Continue standard monitoring.',
  },
  low: {
    label: 'Low Priority',
    shortLabel: 'Low',
    color: 'var(--bc-green)',
    background: 'var(--bc-success-bg)',
    border: 'var(--bc-success-border)',
    desc: 'Low bite case counts and stable follow-up compliance.',
  },
  limited_data: {
    label: 'Limited Data (<3 cases)',
    shortLabel: 'Limited data',
    color: 'var(--bc-text-secondary)',
    background: 'var(--bc-surface-3)',
    border: 'var(--bc-border)',
    desc: 'Fewer than 3 cases. Score is shown for reference only.',
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

export function formatDaysAgo(days: number | null): string {
  if (days === null || days === undefined) return '—';
  const absDays = Math.abs(days);
  if (absDays === 0) return 'Today';
  if (absDays === 1) return 'Yesterday';
  return `${absDays} days ago`;
}

function Progress({ value, color, width = 74 }: { value: number; color: string; width?: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <AccessibleProgress 
      value={clampedValue} 
      color={color} 
      width={width}
      label={`Progress: ${clampedValue}%`}
    />
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  loading,
  tooltip,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  loading: boolean;
  tooltip?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        p: '8px 12px',
        border: active ? `2px solid ${color}` : BORDER,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        bgcolor: active ? `${color}0c` : 'var(--bc-surface)',
        boxShadow: active
          ? `0 4px 12px ${color}24`
          : '0 1px 2px rgba(0, 0, 0, 0.04)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease-in-out',
        position: 'relative',
        outline: 'none',
        '&:hover': {
          borderColor: active ? color : 'rgba(29, 158, 117, 0.45)',
          boxShadow: `0 4px 12px ${color}1e`,
          transform: onClick ? 'translateY(-1px)' : 'none',
        },
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '8px',
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
          <Skeleton width={36} height={20} />
        ) : (
          <Typography
            sx={{
              color: active ? color : 'var(--bc-text)',
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {value}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, mt: 0.2 }}>
          <Typography
            sx={{
              color: active ? color : 'var(--bc-text-secondary)',
              fontSize: 9.5,
              fontWeight: active ? 700 : 600,
              letterSpacing: '.02em',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} arrow>
              <InfoOutlined
                sx={{
                  fontSize: 11,
                  color: active ? color : 'var(--bc-text-secondary)',
                  cursor: 'help',
                  flexShrink: 0,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          )}
        </Box>
      </Box>
      {active && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 6,
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: color,
          }}
        />
      )}
    </Paper>
  );
}

function PriorityPill({
  level,
  score,
  onClick,
}: {
  level: PriorityLevel;
  score?: number;
  onClick?: () => void;
}) {
  const c = priorityConfig[level];
  const isLimited = level === 'limited_data';
  const tooltipText = isLimited
    ? 'Fewer than 3 cases. Score is shown for reference only.'
    : c.desc;

  const icon =
    level === 'high' ? (
      <ErrorOutlined sx={{ fontSize: 13, color: c.color, flexShrink: 0 }} />
    ) : level === 'medium' ? (
      <WarningAmberOutlined sx={{ fontSize: 13, color: c.color, flexShrink: 0 }} />
    ) : level === 'low' ? (
      <CheckCircleOutlined sx={{ fontSize: 13, color: c.color, flexShrink: 0 }} />
    ) : (
      <InfoOutlined sx={{ fontSize: 13, color: c.color, flexShrink: 0 }} />
    );

  // Use stroke/outline for high and medium, filled for low and limited
  const useStroke = level === 'high' || level === 'medium';

  const pillContent = (
    <Box
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.35,
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        bgcolor: useStroke ? 'transparent' : c.background,
        color: c.color,
        border: useStroke ? `2px solid ${c.color}` : `1px solid ${c.border}`,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        transition: 'transform 0.15s ease, background-color 0.15s ease',
        '&:hover': onClick ? { 
          transform: 'scale(1.04)',
          bgcolor: useStroke ? `${c.color}10` : c.background,
        } : undefined,
      }}
    >
      {icon}
      <span>
        {isLimited ? (
          <>
            <span>Limited data</span>
            {score !== undefined && (
              <span style={{ color: 'var(--bc-text-secondary)', fontWeight: 500, marginLeft: 4 }}>
                · {score}
              </span>
            )}
          </>
        ) : score !== undefined ? (
          `${c.shortLabel} Priority · ${score}`
        ) : (
          c.label
        )}
      </span>
    </Box>
  );

  return (
    <Tooltip title={tooltipText} arrow>
      {pillContent}
    </Tooltip>
  );
}

function formatAnimalSummary(types?: Record<string, number>) {
  if (!types) return 'None';
  const parts: string[] = [];
  if (types.dog) parts.push(`${types.dog} Dog${types.dog > 1 ? 's' : ''}`);
  if (types.cat) parts.push(`${types.cat} Cat${types.cat > 1 ? 's' : ''}`);
  if (types.other) parts.push(`${types.other} Other*`);
  return parts.join(' · ') || 'None';
}

function CasesSeverityCell({
  totalCases,
  cat3,
  cat2,
  cat1,
}: {
  totalCases: number;
  cat3: number;
  cat2: number;
  cat1: number;
}) {
  const allZero = cat3 === 0 && cat2 === 0 && cat1 === 0;
  const tooltipText = `${cat3} Category III, ${cat2} Category II, ${cat1} Category I`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)', lineHeight: 1.1 }}>
        {totalCases}
      </Typography>
      {allZero ? (
        <Typography sx={{ fontSize: 10, color: 'var(--bc-text-secondary)' }}>—</Typography>
      ) : (
        <Tooltip title={tooltipText} arrow>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              fontSize: 10,
              fontWeight: 600,
              cursor: 'help',
              lineHeight: 1,
            }}
          >
            <Box component="span" sx={{ color: 'var(--bc-red)' }}>
              ● {cat3}
            </Box>
            <Box component="span" sx={{ color: 'var(--bc-amber)' }}>
              ● {cat2}
            </Box>
            <Box component="span" sx={{ color: 'var(--bc-green)' }}>
              ● {cat1}
            </Box>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

function FollowUpCell({
  compliance,
  overdueDoses,
}: {
  compliance: number;
  overdueDoses: number;
}) {
  const complianceColor =
    compliance >= 80 ? 'var(--bc-green)' : compliance >= 50 ? 'var(--bc-amber)' : 'var(--bc-red)';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.35 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: complianceColor }}>
          {compliance}%
        </Typography>
        <Progress value={compliance} color={complianceColor} width={45} />
      </Box>
      {overdueDoses > 0 ? (
        <Tooltip title="Patients with overdue scheduled PEP vaccine dose" arrow>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.35,
              px: 0.65,
              py: 0.2,
              borderRadius: '12px',
              bgcolor: 'var(--bc-danger-bg-2)',
              color: 'var(--bc-red)',
              fontSize: 9.5,
              fontWeight: 700,
            }}
          >
            <WarningAmberOutlined sx={{ fontSize: 11 }} />
            {overdueDoses} overdue
          </Box>
        </Tooltip>
      ) : (
        <Typography sx={{ fontSize: 9.5, color: 'var(--bc-green)', fontWeight: 600 }}>
          0 overdue
        </Typography>
      )}
    </Box>
  );
}

function LastIncidentCell({
  lastIncident,
  daysAgo,
  trend,
  trendDiff,
}: {
  lastIncident: string | null;
  daysAgo: number | null;
  trend: 'up' | 'down' | 'neutral' | 'new';
  trendDiff: number | null;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
      <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {lastIncident ?? '—'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
        {daysAgo !== null && (
          <Typography sx={{ fontSize: 10, color: 'var(--bc-text-secondary)', whiteSpace: 'nowrap' }}>
            {formatDaysAgo(daysAgo)}
          </Typography>
        )}
        {trend === 'up' && trendDiff !== null && (
          <Typography sx={{ fontSize: 9.5, color: 'var(--bc-red)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            ▲ +{trendDiff}
          </Typography>
        )}
        {trend === 'down' && trendDiff !== null && (
          <Typography sx={{ fontSize: 9.5, color: 'var(--bc-green)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            ▼ {trendDiff}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

type OptionalColumnKey = 'cat_3' | 'cat_2' | 'cat_1' | 'animal' | 'trend';

const DEFAULT_OPTIONAL_COLUMNS: Record<OptionalColumnKey, boolean> = {
  cat_3: false,
  cat_2: false,
  cat_1: false,
  animal: false,
  trend: false,
};

function getStoredOptionalColumns(): Record<OptionalColumnKey, boolean> {
  try {
    const saved = localStorage.getItem('bite_cases_location_columns');
    if (saved) {
      return { ...DEFAULT_OPTIONAL_COLUMNS, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_OPTIONAL_COLUMNS;
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
  const isActive = Boolean(value && value !== 'all');
  return (
    <FormControl size="small">
      <Select
        value={value}
        displayEmpty
        onChange={(event) => onChange(event.target.value)}
        inputProps={{ 'aria-label': ariaLabel }}
        sx={{
          minWidth: { xs: '100%', sm: 110 },
          height: 32,
          borderRadius: '8px',
          fontSize: 11.5,
          bgcolor: isActive ? 'var(--bc-success-bg)' : 'var(--bc-surface)',
          '& fieldset': { borderColor: isActive ? 'var(--bc-success-border)' : 'var(--bc-border)' },
          '& .MuiSelect-select': { py: '5px !important' },
        }}
      >
        {children}
      </Select>
    </FormControl>
  );
}

function Count({ count, color }: { count: number; color: string }) {
  return count > 0 ? (
    <Typography sx={{ fontSize: 12, color, fontWeight: 700 }}>{count}</Typography>
  ) : (
    <Typography sx={{ color: 'var(--bc-text-secondary)', fontSize: 13 }}>—</Typography>
  );
}

function getClinicalSummary(location: LocationSummary, breakdown: PriorityBreakdown): {
  headline: string;
  action: string;
  toneColor: string;
} {
  const casesText =
    location.total_cases === 1 ? '1 isolated case' : `${location.total_cases} cases this period`;
  const overdueText =
    location.overdue_doses > 0
      ? `${location.overdue_doses} patient${location.overdue_doses === 1 ? '' : 's'} overdue for PEP`
      : 'no overdue follow-ups';

  if (breakdown.isLimitedData) {
    return {
      headline: `Limited data concern. ${casesText}, ${overdueText}.`,
      action:
        location.overdue_doses > 0
          ? 'Contact overdue patients for PEP completion.'
          : 'Continue routine monitoring.',
      toneColor: 'var(--bc-text-3)',
    };
  }

  if (breakdown.priorityLevel === 'high') {
    return {
      headline: `High concern. ${casesText}, ${overdueText}.`,
      action:
        location.overdue_doses > 0
          ? 'Prioritize follow-up calls.'
          : 'Ensure adequate PEP biologics and conduct bite awareness.',
      toneColor: 'var(--bc-red)',
    };
  }

  if (breakdown.priorityLevel === 'medium') {
    return {
      headline: `Moderate concern. ${casesText}, ${overdueText}.`,
      action:
        location.overdue_doses > 0
          ? 'Follow up with overdue patients to ensure complete vaccination.'
          : 'Continue standard surveillance and routine monitoring.',
      toneColor: 'var(--bc-amber)',
    };
  }

  return {
    headline: `Low concern. ${casesText}, ${overdueText}.`,
    action: 'Continue routine monitoring.',
    toneColor: 'var(--bc-green)',
  };
}

/**
 * Breakdown & Explainability Dialog
 */
function ExplainabilityModal({
  location,
  maxCases,
  cases = [],
  open,
  onClose,
  onFilterLocation,
  onOpenMap,
}: {
  location: LocationSummary | null;
  maxCases: number;
  cases?: CaseSummary[];
  open: boolean;
  onClose: () => void;
  onFilterLocation: (loc: string) => void;
  onOpenMap: (loc: string) => void;
}) {
  if (!location) return null;

  const breakdown = computePriorityBreakdown(location, maxCases);
  const cfg = priorityConfig[breakdown.priorityLevel];
  const summary = getClinicalSummary(location, breakdown);

  const overdueCases = useMemo(() => {
    if (!location || location.overdue_doses === 0) return [];
    const locLower = location.location.toLowerCase();
    const matched = cases.filter(
      (c) => c.location.toLowerCase() === locLower && c.is_overdue
    );
    if (matched.length > 0) return matched;
    return cases
      .filter((c) => c.location.toLowerCase() === locLower && c.status === 'active')
      .slice(0, location.overdue_doses);
  }, [cases, location]);

  const handleOpenPatient = (c: CaseSummary) => {
    if (c.patient_id) {
      window.open(`/patients?openId=${c.patient_id}`, '_blank');
    } else {
      onFilterLocation(location.location);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            p: 1,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: breakdown.priorityLevel === 'high' || breakdown.priorityLevel === 'medium'
                ? 'transparent'
                : cfg.background,
              border: breakdown.priorityLevel === 'high' || breakdown.priorityLevel === 'medium'
                ? `2px solid ${cfg.color}`
                : 'none',
              color: cfg.color,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <LocationOnOutlined sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--bc-text)' }}>
                {location.location}
              </Typography>
              <Chip
                label={location.location_level || 'Area'}
                size="small"
                sx={{ fontSize: 10, height: 20, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text-3)', fontWeight: 600 }}
              />
            </Box>
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mt: 0.2 }}>
              Descriptive Surveillance Priority Breakdown
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog" sx={{ color: 'var(--bc-text-secondary)', '&:hover': { color: 'var(--bc-text-2)' } }}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 2 }}>
        {/* 1 & 2: Put the answer first + Priority badge and score next to summary */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: '12px',
            border: breakdown.priorityLevel === 'high' || breakdown.priorityLevel === 'medium'
              ? `2px solid ${cfg.color}`
              : `1px solid ${cfg.border}`,
            bgcolor: breakdown.priorityLevel === 'high' || breakdown.priorityLevel === 'medium'
              ? 'transparent'
              : cfg.background,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          {/* Top Row: Priority Badge + Score + Share of severe exposures */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PriorityPill level={breakdown.priorityLevel} score={breakdown.compositeScore} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
                Priority: {breakdown.compositeScore} / 100
              </Typography>
            </Box>

            <Tooltip title="Formula: (Category III × 1.5 + Category II) / Total Cases × 100" arrow>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>
                  Share of severe exposures:
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)' }}>
                  {Math.min(100, location.risk_score)}%
                </Typography>
                <InfoOutlined sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }} />
              </Box>
            </Tooltip>
          </Box>

          {/* Plain-Language Summary and Recommended Action */}
          <Box
            sx={{
              bgcolor: 'var(--bc-surface)',
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <Typography sx={{ fontSize: 13.5, color: 'var(--bc-text)', lineHeight: 1.55 }}>
              <Box component="span" sx={{ fontWeight: 700, color: summary.toneColor }}>
                {summary.headline}
              </Box>{' '}
              <span>{summary.action}</span>
            </Typography>
          </Box>
        </Paper>

        {/* 4. Action Needed List for Overdue Patients */}
        {location.overdue_doses > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              mb: 2,
              borderRadius: '10px',
              border: '2px solid var(--bc-red)',
              bgcolor: 'transparent',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <WarningAmberOutlined sx={{ fontSize: 18, color: 'var(--bc-red)' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-red-strong)' }}>
                  Action Needed: {location.overdue_doses} Overdue PEP Patient{location.overdue_doses === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 10.5, color: 'var(--bc-red)', fontWeight: 600 }}>
                Requires urgent recall or follow-up call
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
              {overdueCases.length > 0 ? (
                overdueCases.map((c) => (
                  <Paper
                    key={c.bite_id}
                    elevation={0}
                    sx={{
                      p: 1.25,
                      borderRadius: '8px',
                      border: '1px solid var(--bc-danger-border)',
                      bgcolor: 'var(--bc-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)' }}>
                          {c.patient_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.2 }}>
                          <Typography sx={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--bc-text-secondary)' }}>
                            Case #{c.case_number}
                          </Typography>
                          {c.overdue_dose && (
                            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-3)', fontWeight: 500 }}>
                              · {c.overdue_dose}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${c.days_overdue ?? 1} day${(c.days_overdue ?? 1) === 1 ? '' : 's'} overdue`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10.5,
                          fontWeight: 700,
                          bgcolor: 'var(--bc-danger-bg-2)',
                          color: 'var(--bc-red)',
                          border: '1px solid var(--bc-danger-border)',
                        }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenPatient(c)}
                        endIcon={<OpenInNewOutlined sx={{ fontSize: '13px !important' }} />}
                        sx={{
                          height: 26,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'none',
                          borderColor: 'var(--bc-border-strong)',
                          color: 'var(--bc-brand-text)',
                          borderRadius: '6px',
                          px: 1,
                          py: 0,
                          bgcolor: 'var(--bc-surface)',
                          '&:hover': {
                            borderColor: 'var(--bc-brand)',
                            bgcolor: 'var(--bc-success-bg)',
                          },
                        }}
                      >
                        Open Patient
                      </Button>
                    </Box>
                  </Paper>
                ))
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.25,
                    borderRadius: '8px',
                    border: '1px solid var(--bc-danger-border)',
                    bgcolor: 'var(--bc-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: 'var(--bc-red-strong)', fontWeight: 500 }}>
                    {location.overdue_doses} patient(s) in {location.location} currently overdue for follow-up doses.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      onFilterLocation(location.location);
                      onClose();
                    }}
                    sx={{
                      height: 26,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: 'var(--bc-danger-border)',
                      color: 'var(--bc-red)',
                      borderRadius: '6px',
                      '&:hover': { bgcolor: 'var(--bc-danger-bg)' },
                    }}
                  >
                    View in Cases Tab
                  </Button>
                </Paper>
              )}
            </Box>
          </Paper>
        )}

        {/* 2. Four Core Surveillance Indicators (2x2 Grid) */}
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)', mb: 1.25 }}>
          Four Core Surveillance Indicators
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
          {/* 1. Case Burden */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: 'var(--bc-surface-2)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text)' }}>
                  1. Case Burden
                </Typography>
                <Tooltip title="Measures total bite volume normalized against the most active area during this surveillance period." arrow>
                  <InfoOutlined sx={{ fontSize: 13, color: 'var(--bc-text-secondary)', cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Chip label="Weight: 35%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: 'var(--bc-track)', fontWeight: 600 }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', mb: 1 }}>
              {location.total_cases} case{location.total_cases === 1 ? '' : 's'} recorded ({breakdown.caseBurdenScore}% of highest area)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.caseBurdenScore} color="#3b82f6" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--bc-blue)' }}>
                {breakdown.caseBurdenScore} pts
              </Typography>
            </Box>
          </Paper>

          {/* 2. Exposure Severity */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: 'var(--bc-surface-2)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text)' }}>
                  2. Exposure Severity
                </Typography>
                <Tooltip title="Percentage of assessed bite cases categorized as Category III severe rabies exposures requiring RIG and full vaccination." arrow>
                  <InfoOutlined sx={{ fontSize: 13, color: 'var(--bc-text-secondary)', cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Chip label="Weight: 35%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: 'var(--bc-track)', fontWeight: 600 }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', mb: 1 }}>
              {location.cat_3} Cat III, {location.cat_2} Cat II, {location.cat_1} Cat I ({breakdown.severityScore}% severe)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.severityScore} color="#ef4444" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--bc-red)' }}>
                {breakdown.severityScore} pts
              </Typography>
            </Box>
          </Paper>

          {/* 3. Overdue PEP Follow-Up */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: 'var(--bc-surface-2)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text)' }}>
                  3. Overdue PEP Follow-Up
                </Typography>
                <Tooltip title="Proportion of patients who missed scheduled follow-up vaccine doses (Day 3, 7, 14, 28) and require immediate recall." arrow>
                  <InfoOutlined sx={{ fontSize: 13, color: 'var(--bc-text-secondary)', cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Chip label="Weight: 20%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: 'var(--bc-track)', fontWeight: 600 }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', mb: 1 }}>
              {location.overdue_doses} overdue patient{location.overdue_doses === 1 ? '' : 's'} · {location.pep_compliance}% compliance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.overdueScore} color="#f59e0b" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--bc-amber)' }}>
                {breakdown.overdueScore} pts
              </Typography>
            </Box>
          </Paper>

          {/* 4. Trend Velocity */}
          <Paper elevation={0} sx={{ p: 1.5, border: BORDER, borderRadius: '10px', bgcolor: 'var(--bc-surface-2)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text)' }}>
                  4. Trend Velocity
                </Typography>
                <Tooltip title="Surge or decline in incident velocity compared to the immediately preceding surveillance period of identical length." arrow>
                  <InfoOutlined sx={{ fontSize: 13, color: 'var(--bc-text-secondary)', cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Chip label="Weight: 10%" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: 'var(--bc-track)', fontWeight: 600 }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', mb: 1 }}>
              {location.trend === 'up'
                ? `Surge: +${location.trend_diff ?? 0} vs last period`
                : location.trend === 'down'
                ? `Decrease: ${location.trend_diff ?? 0} vs last period`
                : location.trend === 'new'
                ? 'Newly recorded location'
                : 'Stable case volume'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Progress value={breakdown.trendScore} color="#0284c7" width={120} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--bc-blue)' }}>
                {breakdown.trendScore} pts
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Animal Vectors Breakdown */}
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, border: BORDER, borderRadius: '10px', bgcolor: 'var(--bc-surface-2)' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text)', mb: 0.75 }}>
            Animal Vectors Recorded
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              icon={<PetsOutlined sx={{ fontSize: '13px !important' }} />}
              label={`Dogs: ${location.animal_types?.dog ?? 0}`}
              size="small"
              sx={{ bgcolor: 'var(--bc-blue-bg)', color: 'var(--bc-blue)', fontWeight: 600, fontSize: 11 }}
            />
            <Chip
              icon={<PetsOutlined sx={{ fontSize: '13px !important' }} />}
              label={`Cats: ${location.animal_types?.cat ?? 0}`}
              size="small"
              sx={{ bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text-2)', fontWeight: 600, fontSize: 11 }}
            />
            <Chip
              label={`Other*: ${location.animal_types?.other ?? 0}`}
              size="small"
              sx={{ bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text-3)', fontWeight: 600, fontSize: 11 }}
            />
            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)', fontStyle: 'italic', ml: 0.5 }}>
              *“Other” includes monkeys, bats, livestock (swine/cattle), and other non-canine/feline mammals.
            </Typography>
          </Box>
        </Paper>

        {/* 3. Merged Subtle Bottom Note */}
        {breakdown.isLimitedData ? (
          <Box
            sx={{
              p: 1.25,
              borderRadius: '8px',
              bgcolor: 'var(--bc-amber-bg)',
              border: '1px solid var(--bc-amber-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
            }}
          >
            <WarningAmberOutlined sx={{ fontSize: 16, color: 'var(--bc-amber)', mt: 0.15, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 11, color: 'var(--bc-amber-strong)', lineHeight: 1.45 }}>
              <strong>Small-Sample Protection:</strong> Fewer than 3 cases recorded in {location.location}. Score is shown for reference only and does not establish a community outbreak. <em>Descriptive clinic records summary for prioritization, not an official rabies declaration.</em>
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              p: 1,
              borderRadius: '8px',
              bgcolor: 'var(--bc-surface-2)',
              border: '1px solid var(--bc-border-soft)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <InfoOutlined sx={{ fontSize: 14, color: 'var(--bc-text-secondary)', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)', lineHeight: 1.4 }}>
              Descriptive clinic records summary to help staff prioritize follow-up calls and community awareness; not an official epidemiological rabies declaration.
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* 5. Footer Buttons */}
      <DialogActions sx={{ px: 3, pb: 2, pt: 1.5, borderTop: '0.5px solid var(--bc-border-soft)', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<FilterAltOutlined fontSize="small" />}
            onClick={() => {
              onFilterLocation(location.location);
              onClose();
            }}
            sx={{
              bgcolor: 'var(--bc-brand)',
              color: '#ffffff',
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': { bgcolor: 'var(--bc-brand-hover)', boxShadow: 'none' },
            }}
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
            sx={{
              borderColor: 'var(--bc-border-strong)',
              color: 'var(--bc-text-2)',
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 2,
              bgcolor: 'var(--bc-surface)',
              '&:hover': { borderColor: 'var(--bc-brand)', color: 'var(--bc-brand-text)', bgcolor: 'var(--bc-success-bg)' },
            }}
          >
            View in Bite Map
          </Button>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={onClose}
          sx={{
            borderColor: 'var(--bc-border-strong)',
            color: 'var(--bc-text-3)',
            textTransform: 'none',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 2,
            px: 2,
            '&:hover': { borderColor: 'var(--bc-border-strong)', bgcolor: 'var(--bc-surface-2)' },
          }}
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
  optionalColumns,
  onOpenBreakdown,
  onFilterLocation,
}: {
  row: LocationSummary;
  index: number;
  maxCases: number;
  optionalColumns: Record<OptionalColumnKey, boolean>;
  onOpenBreakdown: (row: LocationSummary, target?: HTMLElement) => void;
  onFilterLocation: (loc: string) => void;
}) {
  const breakdown = computePriorityBreakdown(row, maxCases);
  const cfg = priorityConfig[breakdown.priorityLevel];
  const hasOverdue = row.overdue_doses > 0;
  const rowBg = hasOverdue ? 'var(--bc-danger-bg)' : 'var(--bc-surface)';
  const hoverBg = hasOverdue ? 'var(--bc-danger-bg-2)' : 'var(--bc-surface-2)';
  const animalSummary = formatAnimalSummary(row.animal_types);

  return (
    <TableRow
      hover
      tabIndex={0}
      role="button"
      aria-label={`View priority breakdown for ${row.location}`}
      onClick={(e) => onOpenBreakdown(row, e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenBreakdown(row, e.currentTarget);
        }
      }}
      sx={{
        cursor: 'pointer',
        borderLeft: `3.5px solid ${cfg.color}`,
        bgcolor: rowBg,
        '&:hover': {
          bgcolor: `${hoverBg} !important`,
        },
        '&:focus-visible': {
          outline: '2px solid var(--bc-brand)',
          outlineOffset: '-2px',
        },
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* 1. Rank (#) - Sticky Left 0 */}
      <TableCell
        align="center"
        sx={{
          position: 'sticky',
          left: 0,
          zIndex: 1,
          bgcolor: rowBg,
          color: 'var(--bc-text-secondary)',
          fontFamily: 'monospace',
          fontSize: 11,
          width: 44,
          minWidth: 44,
          borderBottom: '0.5px solid var(--bc-border-soft)',
          py: 0.9,
          px: 0.5,
        }}
      >
        {index + 1}
      </TableCell>

      {/* 2. Location (Barangay bold, municipality subtext) - Sticky Left 44 */}
      <TableCell
        sx={{
          position: 'sticky',
          left: 44,
          zIndex: 1,
          bgcolor: rowBg,
          boxShadow: '3px 0 6px -2px rgba(0,0,0,0.05)',
          borderBottom: '0.5px solid var(--bc-border-soft)',
          py: 0.9,
          px: 1.25,
        }}
      >
        <Tooltip title={`Animals: ${animalSummary} (*Other includes monkeys, bats, livestock, etc.)`} arrow>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--bc-text)',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.location}
              </Typography>
              {row.trend === 'new' && (
                <Chip
                  label="New"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 9,
                    fontWeight: 700,
                    bgcolor: 'var(--bc-blue-bg)',
                    color: 'var(--bc-blue)',
                    border: '1px solid var(--bc-blue-border)',
                    borderRadius: '4px',
                    px: 0.2,
                  }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: 10, color: 'var(--bc-text-secondary)', whiteSpace: 'nowrap' }}>
              {row.location_level || 'Villanueva'}
            </Typography>
          </Box>
        </Tooltip>
      </TableCell>

      {/* 3. Priority (Colored badge + score) */}
      <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
        <PriorityPill level={breakdown.priorityLevel} score={breakdown.compositeScore} />
      </TableCell>

      {/* 4. Cases (Total with compact severity breakdown) */}
      <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
        <CasesSeverityCell
          totalCases={row.total_cases}
          cat3={row.cat_3}
          cat2={row.cat_2}
          cat1={row.cat_1}
        />
      </TableCell>

      {/* Optional: Severe (Cat III) */}
      {optionalColumns.cat_3 && (
        <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
          <Count count={row.cat_3} color="#ef4444" />
        </TableCell>
      )}

      {/* Optional: Moderate (Cat II) */}
      {optionalColumns.cat_2 && (
        <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
          <Count count={row.cat_2} color="#f59e0b" />
        </TableCell>
      )}

      {/* Optional: Minor (Cat I) */}
      {optionalColumns.cat_1 && (
        <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
          <Count count={row.cat_1} color="#1D9E75" />
        </TableCell>
      )}

      {/* Optional: Animal Type */}
      {optionalColumns.animal && (
        <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
          <Tooltip title="*Other includes monkeys, bats, livestock, or unspecified mammals" arrow>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', whiteSpace: 'nowrap' }}>
              {animalSummary}
            </Typography>
          </Tooltip>
        </TableCell>
      )}

      {/* 5. Follow-up (PEP compliance % bar + overdue count) */}
      <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
        <FollowUpCell compliance={row.pep_compliance} overdueDoses={row.overdue_doses} />
      </TableCell>

      {/* Optional: Trend */}
      {optionalColumns.trend && (
        <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
          {row.trend === 'up' && row.trend_diff !== null ? (
            <Typography sx={{ fontSize: 10, color: 'var(--bc-red)', fontWeight: 700 }}>
              ▲ +{row.trend_diff}
            </Typography>
          ) : row.trend === 'down' && row.trend_diff !== null ? (
            <Typography sx={{ fontSize: 10, color: 'var(--bc-green)', fontWeight: 700 }}>
              ▼ {row.trend_diff}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>—</Typography>
          )}
        </TableCell>
      )}

      {/* 6. Last Incident */}
      <TableCell align="center" sx={{ borderBottom: '0.5px solid var(--bc-border-soft)', py: 0.9, px: 1 }}>
        <LastIncidentCell
          lastIncident={row.last_incident}
          daysAgo={row.last_incident_days_ago}
          trend={row.trend}
          trendDiff={row.trend_diff}
        />
      </TableCell>

      {/* 7. Actions (Sticky Right) */}
      <TableCell
        align="center"
        sx={{
          position: 'sticky',
          right: 0,
          zIndex: 1,
          bgcolor: rowBg,
          boxShadow: '-3px 0 6px -2px rgba(0,0,0,0.05)',
          borderBottom: '0.5px solid var(--bc-border-soft)',
          py: 0.9,
          px: 1,
          whiteSpace: 'nowrap',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip title={`Filter all bite cases in ${row.location}`} arrow>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onFilterLocation(row.location)}
            startIcon={<FilterAltOutlined sx={{ fontSize: 14 }} />}
            sx={{
              py: 0.35,
              px: 1,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'none',
              borderColor: 'var(--bc-border-strong)',
              color: 'var(--bc-text-2)',
              borderRadius: '6px',
              bgcolor: 'var(--bc-surface)',
              whiteSpace: 'nowrap',
              '&:hover': {
                borderColor: 'var(--bc-brand)',
                color: 'var(--bc-brand-text)',
                bgcolor: 'var(--bc-success-bg)',
              },
            }}
          >
            Filter cases
          </Button>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function LocationMobileCard({
  row,
  index,
  maxCases,
  onOpenBreakdown,
  onFilterLocation,
}: {
  row: LocationSummary;
  index: number;
  maxCases: number;
  onOpenBreakdown: (row: LocationSummary, target?: HTMLElement) => void;
  onFilterLocation: (loc: string) => void;
}) {
  const breakdown = computePriorityBreakdown(row, maxCases);
  const cfg = priorityConfig[breakdown.priorityLevel];
  const hasOverdue = row.overdue_doses > 0;
  const complianceColor =
    row.pep_compliance >= 80 ? 'var(--bc-green)' : row.pep_compliance >= 50 ? 'var(--bc-amber)' : 'var(--bc-red)';

  return (
    <Paper
      elevation={0}
      tabIndex={0}
      role="button"
      aria-label={`View priority breakdown for ${row.location}`}
      onClick={(e) => onOpenBreakdown(row, e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenBreakdown(row, e.currentTarget);
        }
      }}
      sx={{
        p: 1.5,
        mb: 1.25,
        borderRadius: '10px',
        border: BORDER,
        borderLeft: `4px solid ${cfg.color}`,
        bgcolor: hasOverdue ? 'var(--bc-danger-bg)' : 'var(--bc-surface)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: hasOverdue ? 'var(--bc-danger-bg-2)' : 'var(--bc-surface-2)',
          transform: 'translateY(-1px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
        '&:focus-visible': {
          outline: '2px solid var(--bc-brand)',
          outlineOffset: '-2px',
        },
      }}
    >
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--bc-text-secondary)', fontWeight: 600 }}>
            #{index + 1}
          </Typography>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'var(--bc-text)' }}>
                {row.location}
              </Typography>
              {row.trend === 'new' && (
                <Chip
                  label="New"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 9,
                    fontWeight: 700,
                    bgcolor: 'var(--bc-blue-bg)',
                    color: 'var(--bc-blue)',
                    border: '1px solid var(--bc-blue-border)',
                  }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>
              {row.location_level || 'Villanueva'}
            </Typography>
          </Box>
        </Box>
        <PriorityPill level={breakdown.priorityLevel} score={breakdown.compositeScore} />
      </Box>

      {/* Key Numbers Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          p: 1,
          bgcolor: hasOverdue ? 'rgba(254, 226, 226, 0.4)' : 'var(--bc-surface-2)',
          borderRadius: '8px',
          mb: 1.25,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 9.5, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Cases
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)' }}>
            {row.total_cases}
          </Typography>
          <Box sx={{ display: 'inline-flex', gap: 0.4, fontSize: 9.5, fontWeight: 600 }}>
            <span style={{ color: 'var(--bc-red)' }}>●{row.cat_3}</span>
            <span style={{ color: 'var(--bc-amber)' }}>●{row.cat_2}</span>
            <span style={{ color: 'var(--bc-green)' }}>●{row.cat_1}</span>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 9.5, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Follow-up
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: complianceColor }}>
            {row.pep_compliance}%
          </Typography>
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 600,
              color: hasOverdue ? 'var(--bc-red)' : 'var(--bc-green)',
            }}
          >
            {hasOverdue ? `${row.overdue_doses} overdue` : '0 overdue'}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 9.5, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Last Incident
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'var(--bc-text-2)' }}>
            {row.last_incident ?? '—'}
          </Typography>
          {row.last_incident_days_ago !== null && (
            <Typography sx={{ fontSize: 9.5, color: 'var(--bc-text-secondary)' }}>
              {formatDaysAgo(row.last_incident_days_ago)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Action Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 11, color: 'var(--bc-brand-text)', fontWeight: 600 }}>
          Tap to view breakdown →
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            onFilterLocation(row.location);
          }}
          startIcon={<FilterAltOutlined sx={{ fontSize: 13 }} />}
          sx={{
            py: 0.25,
            px: 1,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '6px',
            borderColor: 'var(--bc-border-strong)',
            color: 'var(--bc-text-2)',
            bgcolor: 'var(--bc-surface)',
          }}
        >
          Filter cases
        </Button>
      </Box>
    </Paper>
  );
}

function CaseRow({ row, index }: { row: CaseSummary; index: number }) {
  const statusColor: Record<string, string> = { active: '#1D9E75', completed: '#16a34a', cancelled: '#6b7280' };
  const statusText: Record<string, string> = {
    active: 'var(--bc-brand-text)',
    completed: 'var(--bc-green)',
    cancelled: 'var(--bc-text-3)',
  };
  return (
    <TableRow hover sx={{ '&:hover': { bgcolor: 'var(--bc-surface-2)' } }}>
      <TableCell align="center" sx={{ color: 'var(--bc-text-secondary)', fontFamily: 'monospace' }}>
        {index + 1}
      </TableCell>
      <TableCell>
        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--bc-text-2)', fontWeight: 600 }}>
          {row.case_number}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text-2)' }}>
          {row.patient_name}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 12, color: 'var(--bc-text-3)' }}>{row.location}</Typography>
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'inline-flex', px: 0.8, py: 0.3, borderRadius: 20, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text-3)', fontSize: 10, fontWeight: 600 }}>
          Category {row.category}
        </Box>
      </TableCell>
      <TableCell align="center">
        <Typography sx={{ fontSize: 12, textTransform: 'capitalize', color: 'var(--bc-text-3)' }}>
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
            color: statusColor[row.status] ?? 'var(--bc-text-secondary)',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'capitalize',
          }}
        >
          {row.status.replaceAll('_', ' ')}
        </Box>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)' }}>{row.bite_date ?? '—'}</Typography>
      </TableCell>
    </TableRow>
  );
}

export default function BiteCaseRiskDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location');
  const rangeParam = searchParams.get('range');
  const severityParam = searchParams.get('severity');

  const [tab, setTab] = useState<'risk' | 'cases'>('risk');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    severity: severityParam && ['minor', 'moderate', 'severe'].includes(severityParam) ? severityParam : '',
    status: '',
    animal: '',
    range: rangeParam && ['7d', '14d', '30d', '90d', 'all'].includes(rangeParam) ? (rangeParam as any) : 'all',
    customFrom: '',
    customTo: '',
  });

  useEffect(() => {
    if (rangeParam && ['7d', '14d', '30d', '90d', 'all'].includes(rangeParam)) {
      setFilters((f) => ({ ...f, range: rangeParam as any }));
    }
  }, [rangeParam]);

  useEffect(() => {
    if (severityParam && ['minor', 'moderate', 'severe'].includes(severityParam)) {
      setFilters((f) => ({ ...f, severity: severityParam }));
    }
  }, [severityParam]);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLocationForBreakdown, setSelectedLocationForBreakdown] = useState<LocationSummary | null>(null);

  // Auto-open breakdown modal for requested location from notification
  useEffect(() => {
    if (!locationParam || loading || !data?.locations) return;
    const lower = locationParam.toLowerCase();
    const matched = data.locations.find(
      (l) => l.location.toLowerCase() === lower || l.location.toLowerCase().includes(lower)
    );
    if (matched) {
      setSelectedLocationForBreakdown(matched);
    }
  }, [locationParam, loading, data]);

  type StatFilterType = 'total' | 'active' | 'completed' | 'high_priority' | 'overdue' | 'compliance' | null;
  const [statFilter, setStatFilter] = useState<StatFilterType>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [legendAnchorEl, setLegendAnchorEl] = useState<HTMLElement | null>(null);
  const [formulaAnchorEl, setFormulaAnchorEl] = useState<HTMLElement | null>(null);

  type LocationSortKey =
    | 'rank'
    | 'location'
    | 'priority'
    | 'cases'
    | 'cat_3'
    | 'cat_2'
    | 'cat_1'
    | 'followup'
    | 'last_incident'
    | 'trend';
  const [sortKey, setSortKey] = useState<LocationSortKey>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [optionalColumns, setOptionalColumns] = useState<Record<OptionalColumnKey, boolean>>(() =>
    getStoredOptionalColumns()
  );
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLElement | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const toggleOptionalColumn = (col: OptionalColumnKey) => {
    setOptionalColumns((prev) => {
      const next = { ...prev, [col]: !prev[col] };
      try {
        localStorage.setItem('bite_cases_location_columns', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSort = (key: LocationSortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder(key === 'location' ? 'asc' : 'desc');
    }
  };

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

  const statFilterLabel = useMemo(() => {
    switch (statFilter) {
      case 'active':
        return 'Active Cases';
      case 'completed':
        return 'Completed';
      case 'high_priority':
        return 'High-Priority Areas';
      case 'overdue':
        return 'Overdue Doses';
      case 'compliance':
        return 'Low PEP Compliance';
      default:
        return '';
    }
  }, [statFilter]);

  const handleStatFilterToggle = (type: StatFilterType) => {
    if (statFilter === type) {
      setStatFilter(null);
      if (type === 'active' || type === 'completed') {
        update('status', '');
      }
    } else {
      setStatFilter(type);
      if (type === 'total') {
        setStatFilter(null);
        clear();
      } else if (type === 'active') {
        update('status', 'active');
      } else if (type === 'completed') {
        update('status', 'completed');
      } else if (type === 'high_priority') {
        if (tab === 'cases') setTab('risk');
      } else if (type === 'overdue') {
        // Keeps user on current tab, but filters overdue
      } else if (type === 'compliance') {
        if (tab === 'cases') setTab('risk');
      }
    }
  };

  const displayedLocations = useMemo(() => {
    if (!data?.locations) return [];
    let list = data.locations;

    if (statFilter === 'high_priority') {
      list = list.filter((loc) => {
        const b = computePriorityBreakdown(loc, maxCases);
        return b.priorityLevel === 'high';
      });
    } else if (statFilter === 'overdue') {
      list = list.filter((loc) => loc.overdue_doses > 0);
    } else if (statFilter === 'compliance') {
      list = list.filter((loc) => loc.pep_compliance < 100);
    }

    return list;
  }, [data?.locations, statFilter, maxCases]);

  const sortedLocations = useMemo(() => {
    if (!displayedLocations.length) return [];
    const list = [...displayedLocations];

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'priority': {
          const scoreA = computePriorityBreakdown(a, maxCases).compositeScore;
          const scoreB = computePriorityBreakdown(b, maxCases).compositeScore;
          comparison = scoreA - scoreB;
          if (comparison === 0) {
            comparison = a.total_cases - b.total_cases;
          }
          break;
        }
        case 'cases':
          comparison = a.total_cases - b.total_cases;
          break;
        case 'cat_3':
          comparison = a.cat_3 - b.cat_3;
          break;
        case 'cat_2':
          comparison = a.cat_2 - b.cat_2;
          break;
        case 'cat_1':
          comparison = a.cat_1 - b.cat_1;
          break;
        case 'followup':
          comparison = a.pep_compliance - b.pep_compliance;
          if (comparison === 0) {
            comparison = b.overdue_doses - a.overdue_doses;
          }
          break;
        case 'trend':
          comparison = (a.trend_diff ?? 0) - (b.trend_diff ?? 0);
          break;
        case 'last_incident': {
          const daysA = a.last_incident_days_ago !== null ? Math.abs(a.last_incident_days_ago) : 9999;
          const daysB = b.last_incident_days_ago !== null ? Math.abs(b.last_incident_days_ago) : 9999;
          comparison = daysB - daysA;
          break;
        }
        case 'rank':
        default:
          comparison = 0;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [displayedLocations, sortKey, sortOrder, maxCases]);

  const totalRiskColumnCount =
    6 +
    (optionalColumns.cat_3 ? 1 : 0) +
    (optionalColumns.cat_2 ? 1 : 0) +
    (optionalColumns.cat_1 ? 1 : 0) +
    (optionalColumns.animal ? 1 : 0) +
    (optionalColumns.trend ? 1 : 0) +
    1;

  const displayedCases = useMemo(() => {
    if (!data?.cases) return [];
    let list = data.cases;

    if (statFilter === 'high_priority') {
      const highLocNames = new Set(highPriorityLocations.map((l) => l.location));
      list = list.filter((c) => highLocNames.has(c.location));
    } else if (statFilter === 'overdue') {
      list = list.filter((c) => c.status === 'active');
    }

    return list;
  }, [data?.cases, statFilter, highPriorityLocations]);

  const isFiltered = Boolean(
    filters.search ||
    filters.severity ||
    filters.status ||
    filters.animal ||
    filters.range !== 'all' ||
    filters.customFrom ||
    filters.customTo ||
    statFilter !== null
  );

  const handleClearAll = () => {
    setStatFilter(null);
    clear();
  };

  const exportCsv = () => {
    if (tab === 'risk') {
      if (!sortedLocations.length) {
        alert('No locations data to export');
        return;
      }
      exportLocationsToCsv(sortedLocations, 'bite-cases-locations.csv');
    } else {
      if (!displayedCases.length) {
        alert('No cases data to export');
        return;
      }
      exportCasesToCsv(displayedCases, 'bite-cases.csv');
    }
  };

  const handleFilterLocation = (locationName: string) => {
    setFilters((current) => ({ ...current, search: locationName }));
    setTab('cases');
  };

  const handleOpenMap = (locationName?: string) => {
    navigate(ROUTES.BITE_CASES.MAP);
  };

  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const handleOpenBreakdown = (loc: LocationSummary, target?: HTMLElement) => {
    lastFocusedElementRef.current = target || (document.activeElement as HTMLElement);
    setSelectedLocationForBreakdown(loc);
  };

  const handleCloseBreakdown = () => {
    setSelectedLocationForBreakdown(null);
    window.setTimeout(() => {
      lastFocusedElementRef.current?.focus();
    }, 50);
  };

  const riskHeaders = [
    '#',
    'LOCATION',
    'PRIORITY LEVEL',
    'PRIORITY',
    'CASES',
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
    <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 0.75, bgcolor: 'var(--bc-surface-2)', minHeight: '100%' }}>
      {/* ── Page Header ── */}
      <Box sx={{ mb: 2 }}>
        <Typography
          component="h1"
          sx={{ fontSize: 24, fontWeight: 700, color: 'var(--bc-text)', letterSpacing: '-0.02em', mb: 0.5 }}
        >
          Bite Cases Summary
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '13px' }}>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--bc-blue)',
              fontSize: '13px',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Dashboard
          </button>
          <span style={{ color: 'var(--bc-text-secondary)' }}>›</span>
          <span style={{ color: 'var(--bc-text-secondary)' }}>Bite Cases Summary</span>
        </div>
      </Box>

      {/* ── KPI Stat Cards (Clickable Filters) ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(6, minmax(0, 1fr))',
          },
          gap: 1,
          mb: 1.25,
        }}
      >
        <StatCard
          label="TOTAL CASES"
          value={data?.summary.total_cases ?? 0}
          color="#3b82f6"
          icon={<PetsOutlined sx={{ fontSize: 17 }} />}
          loading={loading}
          tooltip="Total recorded animal bite incidents. Click to show all."
          active={statFilter === 'total'}
          onClick={() => handleStatFilterToggle('total')}
        />
        <StatCard
          label="ACTIVE CASES"
          value={data?.summary.active_cases ?? 0}
          color="#1D9E75"
          icon={<WarningAmberOutlined sx={{ fontSize: 17 }} />}
          loading={loading}
          tooltip="Cases undergoing evaluation or vaccination. Click to filter."
          active={statFilter === 'active'}
          onClick={() => handleStatFilterToggle('active')}
        />
        <StatCard
          label="COMPLETED"
          value={data?.summary.completed ?? 0}
          color="#16a34a"
          icon={<CheckCircleOutlined sx={{ fontSize: 17 }} />}
          loading={loading}
          tooltip="Cases with full vaccination course completed. Click to filter."
          active={statFilter === 'completed'}
          onClick={() => handleStatFilterToggle('completed')}
        />
        <StatCard
          label="HIGH-PRIORITY AREAS"
          value={highPriorityLocations.length || (data?.summary.high_risk_zones ?? 0)}
          color="#ef4444"
          icon={<ErrorOutlined sx={{ fontSize: 17 }} />}
          loading={loading}
          tooltip="Areas classified as High Priority (score ≥70). Click to filter."
          active={statFilter === 'high_priority'}
          onClick={() => handleStatFilterToggle('high_priority')}
        />
        <StatCard
          label="OVERDUE DOSES"
          value={data?.summary.overdue_doses ?? 0}
          color="#f59e0b"
          icon={<WarningAmberOutlined sx={{ fontSize: 17 }} />}
          loading={loading}
          tooltip="Patients with missed PEP vaccine doses. Click to filter."
          active={statFilter === 'overdue'}
          onClick={() => handleStatFilterToggle('overdue')}
        />
        <StatCard
          label="PEP COMPLIANCE"
          value={`${data?.summary.pep_compliance ?? 0}%`}
          color="#6b7280"
          icon={<CheckCircleOutlined sx={{ fontSize: 17 }} />}
          loading={loading}
          tooltip="Up-to-date PEP vaccination rate. Click to filter non-compliant."
          active={statFilter === 'compliance'}
          onClick={() => handleStatFilterToggle('compliance')}
        />
      </Box>

      {/* ── Compact Descriptive Surveillance Attention Banner ── */}
      {!bannerDismissed && (highPriorityLocations.length > 0 || (data?.summary.overdue_doses ?? 0) > 0) && (
        <Paper
          elevation={0}
          sx={{
            mb: 1.25,
            borderRadius: '8px',
            border: '2px solid var(--bc-red)',
            bgcolor: 'transparent',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              py: 0.5,
              px: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
              <WarningAmberOutlined sx={{ color: 'var(--bc-red)', fontSize: 16, flexShrink: 0 }} />
              <Typography
                sx={{
                  color: 'var(--bc-red-strong)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  {[
                    (data?.summary.overdue_doses ?? 0) > 0
                      ? `${data?.summary.overdue_doses} patient${(data?.summary.overdue_doses ?? 0) === 1 ? '' : 's'} overdue for PEP`
                      : null,
                    highPriorityLocations.length > 0
                      ? `${highPriorityLocations.length} high-priority area${highPriorityLocations.length === 1 ? '' : 's'}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <Button
                  size="small"
                  onClick={() => setBannerExpanded((prev) => !prev)}
                  sx={{
                    color: 'var(--bc-red)',
                    textTransform: 'none',
                    p: 0,
                    minWidth: 'auto',
                    fontSize: 11.5,
                    fontWeight: 700,
                    textDecoration: 'underline',
                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline', color: 'var(--bc-red-strong)' },
                  }}
                >
                  {bannerExpanded ? '— Hide details' : '— View'}
                </Button>
              </Typography>
            </Box>

            <IconButton
              size="small"
              aria-label="Dismiss surveillance banner"
              onClick={() => setBannerDismissed(true)}
              sx={{ 
                color: 'var(--bc-red-strong)', 
                p: 0.25, 
                '&:hover': { bgcolor: 'var(--bc-red)10' } 
              }}
            >
              <Clear sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>

          <Collapse in={bannerExpanded}>
            <Box
              sx={{
                px: 1.5,
                pb: 1,
                pt: 0.25,
                borderTop: '1px solid var(--bc-red)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              <Typography sx={{ color: 'var(--bc-red-strong)', fontSize: 11 }}>
                The system detected areas with high Category III exposure rates, elevated bite counts, or overdue PEP doses.
                Click an area below to view its clinical breakdown and follow-up recommendations.
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                {highPriorityLocations.map((loc) => (
                  <Chip
                    key={loc.location}
                    icon={<LocationOnOutlined sx={{ fontSize: '13px !important', color: 'var(--bc-red) !important' }} />}
                    label={`${loc.location} (${loc.total_cases} cases · ${loc.cat_3} Cat III)`}
                    size="small"
                    onClick={(e) => handleOpenBreakdown(loc, e.currentTarget)}
                    sx={{
                      bgcolor: 'var(--bc-surface)',
                      color: 'var(--bc-red-strong)',
                      border: '1.5px solid var(--bc-red)',
                      fontWeight: 600,
                      fontSize: 10.5,
                      height: 24,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'var(--bc-red)10' },
                    }}
                  />
                ))}

                {(data?.summary.overdue_doses ?? 0) > 0 && (
                  <Chip
                    icon={<WarningAmberOutlined sx={{ fontSize: '13px !important', color: 'var(--bc-amber) !important' }} />}
                    label={`${data?.summary.overdue_doses} patient(s) overdue for PEP`}
                    size="small"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, status: 'active' }));
                      setTab('cases');
                    }}
                    sx={{
                      bgcolor: 'var(--bc-surface)',
                      color: 'var(--bc-amber)',
                      border: '1.5px solid var(--bc-amber)',
                      fontWeight: 600,
                      fontSize: 10.5,
                      height: 24,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'var(--bc-amber)10' },
                    }}
                  />
                )}
              </Box>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* ── Single-Row Tabs & Filter Controls ── */}
      <Paper
        elevation={0}
        sx={{
          border: BORDER,
          borderRadius: '10px',
          p: '6px 10px',
          mb: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* Tabs: Location Priority vs All Cases */}
        <Box
          sx={{
            display: 'inline-flex',
            p: 0.3,
            bgcolor: 'var(--bc-surface-3)',
            borderRadius: '8px',
            gap: 0.4,
            flexShrink: 0,
          }}
        >
          <Button
            size="small"
            onClick={() => setTab('risk')}
            disableElevation
            sx={{
              bgcolor: tab === 'risk' ? 'var(--bc-brand)' : 'transparent',
              color: tab === 'risk' ? '#fff' : 'var(--bc-text-3)',
              '&:hover': { bgcolor: tab === 'risk' ? 'var(--bc-brand-hover)' : 'var(--bc-track)' },
              textTransform: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: 11.5,
              px: 1.2,
              py: 0.35,
              minHeight: 28,
            }}
          >
            Location Priority
          </Button>
          <Button
            size="small"
            onClick={() => setTab('cases')}
            disableElevation
            sx={{
              bgcolor: tab === 'cases' ? 'var(--bc-brand)' : 'transparent',
              color: tab === 'cases' ? '#fff' : 'var(--bc-text-3)',
              '&:hover': { bgcolor: tab === 'cases' ? 'var(--bc-brand-hover)' : 'var(--bc-track)' },
              textTransform: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: 11.5,
              px: 1.2,
              py: 0.35,
              minHeight: 28,
            }}
          >
            All Cases
          </Button>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search case, patient, location…"
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ color: 'var(--bc-text-secondary)', fontSize: 16 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: { xs: '100%', sm: 190, md: 220 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: 11.5,
              height: 32,
            },
            '& fieldset': { borderColor: 'var(--bc-border)' },
          }}
        />

        {/* Filters */}
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

        {/* Result Count */}
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--bc-text-2)',
            whiteSpace: 'nowrap',
            px: 0.9,
            py: 0.35,
            borderRadius: '6px',
            bgcolor: 'var(--bc-surface-3)',
          }}
        >
          {tab === 'risk'
            ? `${sortedLocations.length} location${sortedLocations.length === 1 ? '' : 's'}`
            : `${displayedCases.length} case${displayedCases.length === 1 ? '' : 's'}`}
        </Typography>

        {/* Active Stat Filter chip with Clear option */}
        {statFilter && (
          <Chip
            size="small"
            label={`Filter: ${statFilterLabel}`}
            onDelete={() => handleStatFilterToggle(statFilter)}
            sx={{
              bgcolor: 'var(--bc-success-bg)',
              color: 'var(--bc-brand-strong)',
              fontWeight: 600,
              fontSize: 10.5,
              border: '1px solid var(--bc-success-border)',
              height: 26,
            }}
          />
        )}

        {/* Clear Button (only shown when any filter is active) */}
        {isFiltered && (
          <Button
            size="small"
            onClick={handleClearAll}
            startIcon={<Clear sx={{ fontSize: 13 }} />}
            sx={{
              color: 'var(--bc-red)',
              textTransform: 'none',
              fontSize: 11,
              fontWeight: 600,
              bgcolor: 'var(--bc-danger-bg)',
              border: '1px solid var(--bc-danger-border)',
              borderRadius: '6px',
              px: 0.9,
              py: 0.2,
              height: 28,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: 'var(--bc-danger-bg-2)' },
            }}
          >
            Clear
          </Button>
        )}

        {/* Bite Map Link */}
        <Button
          onClick={() => handleOpenMap()}
          variant="outlined"
          size="small"
          startIcon={<MapOutlined fontSize="small" />}
          sx={{
            ml: 'auto',
            borderColor: 'var(--bc-border)',
            color: 'var(--bc-text-2)',
            textTransform: 'none',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: '8px',
            height: 30,
            whiteSpace: 'nowrap',
            '&:hover': { borderColor: 'var(--bc-border-strong)', bgcolor: 'var(--bc-surface-2)' },
          }}
        >
          Bite Map
        </Button>
      </Paper>

      {filters.range === 'custom' && (
        <Box sx={{ display: 'flex', gap: 1, mb: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>Custom range:</Typography>
          <TextField
            label="From"
            type="date"
            size="small"
            value={filters.customFrom}
            onChange={(event) => update('customFrom', event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 11, height: 28 },
              '& fieldset': { borderColor: 'var(--bc-border)' },
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
              '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 11, height: 28 },
              '& fieldset': { borderColor: 'var(--bc-border)' },
            }}
          />
        </Box>
      )}

      {/* ── Table Panel ── */}
      <Paper elevation={0} sx={{ border: BORDER, borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Box sx={{ px: 1.5, py: 0.9, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '0.5px solid var(--bc-border-soft)', flexWrap: 'wrap' }}>
          <LocationOnOutlined sx={{ color: 'var(--bc-brand-text)', fontSize: 17 }} />
          <Typography sx={{ color: 'var(--bc-text)', fontSize: 13, fontWeight: 700 }}>
            {tab === 'risk' ? 'Location Priority Summary' : 'All Recorded Bite Cases'}
          </Typography>
          {tab === 'risk' && (
            <>
              <Button
                size="small"
                onClick={(e) => setFormulaAnchorEl(e.currentTarget)}
                startIcon={<HelpOutlineOutlined sx={{ fontSize: 13 }} />}
                sx={{
                  color: 'var(--bc-text-secondary)',
                  textTransform: 'none',
                  fontSize: 11,
                  py: 0.2,
                  px: 0.75,
                  borderRadius: '6px',
                  '&:hover': { color: 'var(--bc-brand-text)', bgcolor: 'var(--bc-success-bg)' },
                }}
              >
                How is this calculated?
              </Button>
              <Button
                size="small"
                onClick={(e) => setColumnsAnchorEl(e.currentTarget)}
                startIcon={<ViewColumnOutlined sx={{ fontSize: 14 }} />}
                variant="outlined"
                sx={{
                  borderColor: 'var(--bc-border-strong)',
                  color: 'var(--bc-text-2)',
                  textTransform: 'none',
                  fontSize: 11,
                  height: 26,
                  py: 0,
                  px: 1,
                  borderRadius: '6px',
                  '&:hover': { borderColor: 'var(--bc-brand)', bgcolor: 'var(--bc-success-bg)', color: 'var(--bc-brand-text)' },
                }}
              >
                Columns
              </Button>
            </>
          )}
          <Button
            onClick={exportCsv}
            disabled={tab === 'risk' ? !sortedLocations.length : !displayedCases.length}
            startIcon={<FileDownloadOutlined fontSize="small" />}
            variant="outlined"
            size="small"
            aria-label={`Export ${tab === 'risk' ? 'location summary' : 'cases'} to CSV file`}
            sx={{ 
              ml: 'auto', 
              minHeight: 44,
              borderColor: 'var(--bc-border-strong)', 
              color: 'var(--bc-text-3)', 
              textTransform: 'none', 
              fontSize: 11,
              py: 0 
            }}
          >
            Export CSV
          </Button>
        </Box>

        {isMobile && tab === 'risk' ? (
          <Box sx={{ p: 1.25 }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1.25, border: BORDER, borderRadius: '10px' }}>
                  <Skeleton width="60%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1, mb: 1 }} />
                  <Skeleton width="40%" height={20} />
                </Paper>
              ))
            ) : sortedLocations.length > 0 ? (
              sortedLocations.map((row, index) => (
                <LocationMobileCard
                  key={row.location}
                  row={row}
                  index={index}
                  maxCases={maxCases}
                  onOpenBreakdown={handleOpenBreakdown}
                  onFilterLocation={handleFilterLocation}
                />
              ))
            ) : (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <SearchOutlined sx={{ fontSize: 40, color: 'var(--bc-text-secondary)', mb: 1 }} />
                <Typography sx={{ fontSize: 13, color: 'var(--bc-text-3)', fontWeight: 600, mb: 1 }}>
                  No bite cases match these filters
                </Typography>
                {isFiltered && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleClearAll}
                    startIcon={<Clear sx={{ fontSize: 14 }} />}
                    sx={{
                      borderColor: 'var(--bc-border-strong)',
                      color: 'var(--bc-text-2)',
                      textTransform: 'none',
                      fontSize: 11.5,
                      borderRadius: '6px',
                      '&:hover': { borderColor: 'var(--bc-brand)', color: 'var(--bc-brand-text)' },
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table
              stickyHeader
              size="small"
              aria-label={tab === 'risk' ? 'Location Priority Summary Table' : 'All Bite Cases Table'}
              sx={{
                minWidth: tab === 'risk' ? { xs: 720, md: '100%' } : 820,
                '& .MuiTableCell-root': { borderBottom: '0.5px solid var(--bc-border-soft)', fontSize: 11.5, py: 0.85, px: 1 },
              }}
            >
              {tab === 'risk' ? (
                <TableHead>
                  <TableRow>
                    {/* # - Sticky Left 0 */}
                    <TableCell
                      component="th"
                      scope="col"
                      align="center"
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 3,
                        bgcolor: 'var(--bc-surface)',
                        width: 44,
                        minWidth: 44,
                        color: 'var(--bc-text-secondary)',
                        fontWeight: 700,
                        fontSize: '10px !important',
                        letterSpacing: '.04em',
                        borderBottom: '0.5px solid var(--bc-border)',
                        py: 0.75,
                        px: 0.5,
                      }}
                    >
                      <TableSortLabel
                        active={sortKey === 'rank'}
                        direction={sortKey === 'rank' ? sortOrder : 'asc'}
                        onClick={() => handleSort('rank')}
                        sx={{ fontSize: '10px !important' }}
                        aria-label={sortKey === 'rank' ? `Sorted by rank ${sortOrder}ending` : 'Sort by rank'}
                      >
                        #
                      </TableSortLabel>
                    </TableCell>

                    {/* LOCATION - Sticky Left 44 */}
                    <TableCell
                      component="th"
                      scope="col"
                      sx={{
                        position: 'sticky',
                        left: 44,
                        zIndex: 3,
                        bgcolor: 'var(--bc-surface)',
                        boxShadow: '3px 0 6px -2px rgba(0,0,0,0.05)',
                        color: 'var(--bc-text-secondary)',
                        fontWeight: 700,
                        fontSize: '10px !important',
                        letterSpacing: '.04em',
                        borderBottom: '0.5px solid var(--bc-border)',
                        py: 0.75,
                        px: 1.25,
                      }}
                    >
                      <TableSortLabel
                        active={sortKey === 'location'}
                        direction={sortKey === 'location' ? sortOrder : 'asc'}
                        onClick={() => handleSort('location')}
                        sx={{ fontSize: '10px !important' }}
                        aria-label={sortKey === 'location' ? `Sorted by location ${sortOrder}ending` : 'Sort by location'}
                      >
                        LOCATION
                      </TableSortLabel>
                    </TableCell>

                    {/* PRIORITY */}
                    <TableCell
                      component="th"
                      scope="col"
                      align="center"
                      sx={{
                        bgcolor: 'var(--bc-surface)',
                        color: 'var(--bc-text-secondary)',
                        fontWeight: 700,
                        fontSize: '10px !important',
                        letterSpacing: '.04em',
                        borderBottom: '0.5px solid var(--bc-border)',
                        py: 0.75,
                        px: 1,
                      }}
                    >
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
                        <TableSortLabel
                          active={sortKey === 'priority'}
                          direction={sortKey === 'priority' ? sortOrder : 'desc'}
                          onClick={() => handleSort('priority')}
                          sx={{ fontSize: '10px !important' }}
                          aria-label={sortKey === 'priority' ? `Sorted by priority ${sortOrder}ending` : 'Sort by priority'}
                        >
                          PRIORITY
                        </TableSortLabel>
                        <Tooltip title="Surveillance Priority Guide" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLegendAnchorEl(e.currentTarget);
                            }}
                            aria-label="Show surveillance priority guide"
                            sx={{ 
                              p: 0.2, 
                              minWidth: 44, 
                              minHeight: 44,
                              color: 'var(--bc-text-secondary)', 
                              '&:hover': { color: 'var(--bc-brand-text)', bgcolor: 'var(--bc-success-bg)' } 
                            }}
                          >
                            <InfoOutlined sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>

                    {/* CASES */}
                    <TableCell
                      component="th"
                      scope="col"
                      align="center"
                      sx={{
                        bgcolor: 'var(--bc-surface)',
                        color: 'var(--bc-text-secondary)',
                        fontWeight: 700,
                        fontSize: '10px !important',
                        letterSpacing: '.04em',
                        borderBottom: '0.5px solid var(--bc-border)',
                        py: 0.75,
                        px: 1,
                      }}
                    >
                      <Tooltip title="Total Cases and Severity breakdown (● Cat III ● Cat II ● Cat I)" arrow>
                        <TableSortLabel
                          active={sortKey === 'cases'}
                          direction={sortKey === 'cases' ? sortOrder : 'desc'}
                          onClick={() => handleSort('cases')}
                          sx={{ fontSize: '10px !important' }}
                          aria-label={sortKey === 'cases' ? `Sorted by cases ${sortOrder}ending` : 'Sort by cases'}
                        >
                          CASES
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>

                    {/* Optional: Severe (Cat III) */}
                    {optionalColumns.cat_3 && (
                      <TableCell
                        component="th"
                        scope="col"
                        align="center"
                        sx={{
                          bgcolor: 'var(--bc-surface)',
                          color: 'var(--bc-red)',
                          fontWeight: 700,
                          fontSize: '10px !important',
                          letterSpacing: '.04em',
                          borderBottom: '0.5px solid var(--bc-border)',
                          py: 0.75,
                          px: 1,
                        }}
                      >
                        <TableSortLabel
                          active={sortKey === 'cat_3'}
                          direction={sortKey === 'cat_3' ? sortOrder : 'desc'}
                          onClick={() => handleSort('cat_3')}
                          sx={{ fontSize: '10px !important' }}
                        >
                          SEVERE (CAT III)
                        </TableSortLabel>
                      </TableCell>
                    )}

                    {/* Optional: Moderate (Cat II) */}
                    {optionalColumns.cat_2 && (
                      <TableCell
                        align="center"
                        sx={{
                          bgcolor: 'var(--bc-surface)',
                          color: 'var(--bc-amber)',
                          fontWeight: 700,
                          fontSize: '10px !important',
                          letterSpacing: '.04em',
                          borderBottom: '0.5px solid var(--bc-border)',
                          py: 0.75,
                          px: 1,
                        }}
                      >
                        <TableSortLabel
                          active={sortKey === 'cat_2'}
                          direction={sortKey === 'cat_2' ? sortOrder : 'desc'}
                          onClick={() => handleSort('cat_2')}
                          sx={{ fontSize: '10px !important' }}
                        >
                          MODERATE (CAT II)
                        </TableSortLabel>
                      </TableCell>
                    )}

                    {/* Optional: Minor (Cat I) */}
                    {optionalColumns.cat_1 && (
                      <TableCell
                        align="center"
                        sx={{
                          bgcolor: 'var(--bc-surface)',
                          color: 'var(--bc-green)',
                          fontWeight: 700,
                          fontSize: '10px !important',
                          letterSpacing: '.04em',
                          borderBottom: '0.5px solid var(--bc-border)',
                          py: 0.75,
                          px: 1,
                        }}
                      >
                        <TableSortLabel
                          active={sortKey === 'cat_1'}
                          direction={sortKey === 'cat_1' ? sortOrder : 'desc'}
                          onClick={() => handleSort('cat_1')}
                          sx={{ fontSize: '10px !important' }}
                        >
                          MINOR (CAT I)
                        </TableSortLabel>
                      </TableCell>
                    )}

                    {/* Optional: Animal Type */}
                    {optionalColumns.animal && (
                      <TableCell
                        align="center"
                        sx={{
                          bgcolor: 'var(--bc-surface)',
                          color: 'var(--bc-text-secondary)',
                          fontWeight: 700,
                          fontSize: '10px !important',
                          letterSpacing: '.04em',
                          borderBottom: '0.5px solid var(--bc-border)',
                          py: 0.75,
                          px: 1,
                        }}
                      >
                        ANIMAL TYPE
                      </TableCell>
                    )}

                    {/* FOLLOW-UP */}
                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: 'var(--bc-surface)',
                        color: 'var(--bc-text-secondary)',
                        fontWeight: 700,
                        fontSize: '10px !important',
                        letterSpacing: '.04em',
                        borderBottom: '0.5px solid var(--bc-border)',
                        py: 0.75,
                        px: 1,
                      }}
                    >
                      <Tooltip title="PEP Compliance % and Overdue dose status" arrow>
                        <TableSortLabel
                          active={sortKey === 'followup'}
                          direction={sortKey === 'followup' ? sortOrder : 'desc'}
                          onClick={() => handleSort('followup')}
                          sx={{ fontSize: '10px !important' }}
                        >
                          FOLLOW-UP
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>

                    {/* Optional: Trend */}
                    {optionalColumns.trend && (
                      <TableCell
                        align="center"
                        sx={{
                          bgcolor: 'var(--bc-surface)',
                          color: 'var(--bc-text-secondary)',
                          fontWeight: 700,
                          fontSize: '10px !important',
                          letterSpacing: '.04em',
                          borderBottom: '0.5px solid var(--bc-border)',
                          py: 0.75,
                          px: 1,
                        }}
                      >
                        <TableSortLabel
                          active={sortKey === 'trend'}
                          direction={sortKey === 'trend' ? sortOrder : 'desc'}
                          onClick={() => handleSort('trend')}
                          sx={{ fontSize: '10px !important' }}
                        >
                          TREND
                        </TableSortLabel>
                      </TableCell>
                    )}

                    {/* LAST INCIDENT */}
                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: 'var(--bc-surface)',
                        color: 'var(--bc-text-secondary)',
                        fontWeight: 700,
                        fontSize: '10px !important',
                        letterSpacing: '.04em',
                        borderBottom: '0.5px solid var(--bc-border)',
                        py: 0.75,
                        px: 1,
                      }}
                    >
                      <TableSortLabel
                        active={sortKey === 'last_incident'}
                        direction={sortKey === 'last_incident' ? sortOrder : 'desc'}
                        onClick={() => handleSort('last_incident')}
                        sx={{ fontSize: '10px !important' }}
                      >
                        LAST INCIDENT
                      </TableSortLabel>
                    </TableCell>

                    {/* ACTIONS - Sticky Right 0 */}
                    <TableCell
                      align="center"
                      sx={{
                        position: 'sticky',
                        right: 0,
                        zIndex: 3,
                        bgcolor: 'var(--bc-surface)',
                        boxShadow: '-3px 0 6px -2px rgba(0,0,0,0.05)',
                        color: 'var(--bc-text-secondary)',
                        fontWeight: 700,
                        fontSize: '10px !important',
                        letterSpacing: '.04em',
                        borderBottom: '0.5px solid var(--bc-border)',
                        py: 0.75,
                        px: 1,
                      }}
                    >
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
              ) : (
                <TableHead>
                  <TableRow>
                    {caseHeaders.map((header) => (
                      <TableCell
                        key={header}
                        align={['#', 'SEVERITY', 'ANIMAL', 'STATUS'].includes(header) ? 'center' : 'left'}
                        sx={{
                          bgcolor: 'var(--bc-surface)',
                          color: 'var(--bc-text-secondary)',
                          fontWeight: 700,
                          fontSize: '10px !important',
                          letterSpacing: '.04em',
                          whiteSpace: 'nowrap',
                          borderBottom: '0.5px solid var(--bc-border)',
                          py: 0.75,
                          px: 1,
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
              )}

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: tab === 'risk' ? totalRiskColumnCount : caseHeaders.length }).map((__, cell) => (
                        <TableCell key={cell} sx={{ py: 1.2 }}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : tab === 'risk' ? (
                  sortedLocations.map((row, index) => (
                    <LocationRow
                      key={row.location}
                      row={row}
                      index={index}
                      maxCases={maxCases}
                      optionalColumns={optionalColumns}
                      onOpenBreakdown={handleOpenBreakdown}
                      onFilterLocation={handleFilterLocation}
                    />
                  ))
                ) : (
                  displayedCases.map((row, index) => <CaseRow key={row.bite_id} row={row} index={index} />)
                )}

                {!loading && !(tab === 'risk' ? sortedLocations.length : displayedCases.length) && (
                  <TableRow>
                    <TableCell
                      colSpan={tab === 'risk' ? totalRiskColumnCount : caseHeaders.length}
                      align="center"
                      sx={{ py: 6 }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <SearchOutlined sx={{ fontSize: 38, color: 'var(--bc-text-secondary)' }} />
                        <Typography sx={{ fontSize: 13, color: 'var(--bc-text-3)', fontWeight: 600 }}>
                          No bite cases match these filters
                        </Typography>
                        {isFiltered && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleClearAll}
                            startIcon={<Clear sx={{ fontSize: 14 }} />}
                            sx={{
                              mt: 0.5,
                              borderColor: 'var(--bc-border-strong)',
                              color: 'var(--bc-text-2)',
                              textTransform: 'none',
                              fontSize: 11.5,
                              borderRadius: '6px',
                              '&:hover': { borderColor: 'var(--bc-brand)', color: 'var(--bc-brand-text)' },
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Surveillance Priority Guide Popover ── */}
      <Popover
        open={Boolean(legendAnchorEl)}
        anchorEl={legendAnchorEl}
        onClose={() => setLegendAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: { p: 2, maxWidth: 360, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
          },
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)', mb: 1 }}>
          Surveillance Priority Guide
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <ErrorOutlined sx={{ fontSize: 16, color: 'var(--bc-red)', mt: 0.2, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-red)' }}>
                High Priority: ≥70
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', lineHeight: 1.4 }}>
                Significant volume, severe Category III exposures, or overdue PEP patients.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <WarningAmberOutlined sx={{ fontSize: 16, color: 'var(--bc-amber)', mt: 0.2, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-amber)' }}>
                Medium Priority: 40–69
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', lineHeight: 1.4 }}>
                Moderate case activity or mixed exposure severity.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <CheckCircleOutlined sx={{ fontSize: 16, color: 'var(--bc-green)', mt: 0.2, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-green)' }}>
                Low Priority: &lt;40
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', lineHeight: 1.4 }}>
                Low volume, mild exposures, and good adherence.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <InfoOutlined sx={{ fontSize: 16, color: 'var(--bc-text-secondary)', mt: 0.2, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>
                Limited Data: &lt;3 Cases
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', lineHeight: 1.4 }}>
                Fewer than 3 cases. Score is shown for reference only to avoid distorting surveillance.
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid var(--bc-border-soft)' }}>
          <Button
            size="small"
            onClick={() => {
              const currentAnchor = legendAnchorEl;
              setLegendAnchorEl(null);
              setFormulaAnchorEl(currentAnchor);
            }}
            sx={{ textTransform: 'none', fontSize: 11, color: 'var(--bc-brand-text)', p: 0, fontWeight: 600 }}
          >
            How is composite priority calculated? →
          </Button>
        </Box>
      </Popover>

      {/* ── Composite Priority Formula Popover ── */}
      <Popover
        open={Boolean(formulaAnchorEl)}
        anchorEl={formulaAnchorEl}
        onClose={() => setFormulaAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: { p: 2, maxWidth: 420, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
          },
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)', mb: 0.75 }}>
          Composite Priority Formula (0–100)
        </Typography>
        <Box sx={{ p: 1.2, bgcolor: 'var(--bc-surface-2)', border: '1px solid var(--bc-border)', borderRadius: '8px', mb: 1.25 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'var(--bc-text)', fontFamily: 'monospace' }}>
            Score = (Burden × 0.35) + (Severity × 0.35) + (Overdue × 0.20) + (Trend × 0.10)
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-3)', mb: 1 }}>
          Weights and clinical indicators:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.6, fontSize: 11 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-2)', fontWeight: 600 }}>1. Relative Burden (35%)</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>Cases normalized against highest area</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-2)', fontWeight: 600 }}>2. Severity Rate (35%)</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>Category III high-risk rabies exposures</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-2)', fontWeight: 600 }}>3. Overdue Doses (20%)</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>Missed PEP vaccine appointments</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-2)', fontWeight: 600 }}>4. Period Velocity (10%)</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>Surge or trend change vs prior period</Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: 10, color: 'var(--bc-text-secondary)', mt: 1.25, fontStyle: 'italic' }}>
          * Areas with fewer than 3 cases are labeled Limited Data to prevent single-incident distortion.
        </Typography>
      </Popover>

      {/* ── Columns Menu ── */}
      <Menu
        anchorEl={columnsAnchorEl}
        open={Boolean(columnsAnchorEl)}
        onClose={() => setColumnsAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              p: 0.5,
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            },
          },
        }}
      >
        <Typography sx={{ px: 1.5, py: 0.5, fontSize: 11, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase' }}>
          Toggle Columns
        </Typography>
        <MenuItem dense onClick={() => toggleOptionalColumn('cat_3')}>
          <Checkbox size="small" checked={optionalColumns.cat_3} sx={{ p: 0.5, mr: 0.5 }} />
          <Typography sx={{ fontSize: 12 }}>Severe (Cat III)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => toggleOptionalColumn('cat_2')}>
          <Checkbox size="small" checked={optionalColumns.cat_2} sx={{ p: 0.5, mr: 0.5 }} />
          <Typography sx={{ fontSize: 12 }}>Moderate (Cat II)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => toggleOptionalColumn('cat_1')}>
          <Checkbox size="small" checked={optionalColumns.cat_1} sx={{ p: 0.5, mr: 0.5 }} />
          <Typography sx={{ fontSize: 12 }}>Minor (Cat I)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => toggleOptionalColumn('animal')}>
          <Checkbox size="small" checked={optionalColumns.animal} sx={{ p: 0.5, mr: 0.5 }} />
          <Typography sx={{ fontSize: 12 }}>Animal Type</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => toggleOptionalColumn('trend')}>
          <Checkbox size="small" checked={optionalColumns.trend} sx={{ p: 0.5, mr: 0.5 }} />
          <Typography sx={{ fontSize: 12 }}>Trend</Typography>
        </MenuItem>
      </Menu>

      {/* ── Area Priority Breakdown Dialog (Explainability) ── */}
      <ExplainabilityModal
        location={selectedLocationForBreakdown}
        maxCases={maxCases}
        cases={data?.cases ?? []}
        open={Boolean(selectedLocationForBreakdown)}
        onClose={handleCloseBreakdown}
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
