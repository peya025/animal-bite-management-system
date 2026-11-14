import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ChevronRightOutlined,
  ExpandLessOutlined,
  ExpandMoreOutlined,
  FileDownloadOutlined,
  LocationOnOutlined,
  MapOutlined,
} from '@mui/icons-material';
import type { DescriptiveFinding, DohSummary, LocationSummary } from '../types/biteCasesSummary.types';
import { formatPct } from '../types/biteCasesSummary.types';
import { BC_BORDER, HorizontalDistBar, SemanticChip } from './BiteCasesSharedUi';
import { ROUTES } from '../../../shared/config/routes';

interface BiteCasesOverviewTabProps {
  doh?: DohSummary;
  locations: LocationSummary[];
  insights?: DescriptiveFinding[];
  limitations?: string[];
  totalRecorded: number;
  finalizedCount: number;
  awaitingAssessmentCount: number;
  pepPrescribedCount: number;
  givenPepCount: number;
  noAdminCount: number;
  givenRigCount?: number;
  completedMatureTotal?: number;
  overdueEpisodesCount?: number;
  onDrillDownToStage: (stageKey: string) => void;
  onDrillDownFilter: (next: { status?: string; severity?: string; animal?: string; search?: string }) => void;
  onExportEpisodesCsv: () => void;
}

/* One colour per meaning, reused everywhere on the Overview. */
const C = {
  catI: '#059669',
  catII: '#d97706',
  catIII: '#dc2626',
  pending: '#94a3b8',
  neutral: '#0f766e',
};

const TOP_BARANGAYS = 5;

/* ── Layout primitives ─────────────────────────────────────────── */

function Section({
  title,
  hint,
  action,
  icon,
  children,
  sx,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Paper
      elevation={0}
      component="section"
      aria-label={title}
      sx={{
        border: BC_BORDER,
        borderRadius: '14px',
        p: { xs: 1.75, md: 2 },
        bgcolor: 'var(--bc-surface)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {icon}
            <Typography component="h3" sx={{ fontSize: 14.5, fontWeight: 700, color: 'var(--bc-text)' }}>
              {title}
            </Typography>
          </Box>
          {hint && (
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mt: 0.25 }}>{hint}</Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

/** A single status row inside a pipeline stage. Clickable only when it leads somewhere. */
function StageRow({
  label,
  count,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  tone: 'positive' | 'attention' | 'neutral';
  onClick?: () => void;
}) {
  const color = tone === 'positive' ? 'var(--bc-green-strong)' : tone === 'attention' ? 'var(--bc-amber-strong)' : 'var(--bc-text-2)';
  const interactive = Boolean(onClick) && count > 0;

  return (
    <Box
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={interactive ? `${label}: ${count}. View cases` : undefined}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        px: 1,
        py: 0.75,
        border: 0,
        borderRadius: '8px',
        background: 'transparent',
        textAlign: 'left',
        font: 'inherit',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background-color 0.15s ease',
        '&:hover': interactive ? { bgcolor: 'var(--bc-surface-3)' } : undefined,
        '&:focus-visible': { outline: '2px solid var(--bc-focus-ring)', outlineOffset: '1px' },
      }}
    >
      <Typography sx={{ fontSize: 13, color: 'var(--bc-text-2)' }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: count > 0 ? color : 'var(--bc-text-secondary)' }}>
          {count}
        </Typography>
        {interactive ? (
          <ChevronRightOutlined aria-hidden="true" sx={{ fontSize: 16, color: 'var(--bc-text-secondary)' }} />
        ) : (
          <Box sx={{ width: 16 }} />
        )}
      </Box>
    </Box>
  );
}

function Stage({
  step,
  title,
  value,
  valueLabel,
  children,
}: {
  step: string;
  title: string;
  value: number;
  valueLabel: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: BC_BORDER,
        borderRadius: '12px',
        p: 1.5,
        bgcolor: 'var(--bc-surface-2)',
      }}
    >
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {step}
      </Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'var(--bc-text)', mt: 0.25 }}>{title}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 1, mb: 0.75, px: 1 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, color: 'var(--bc-text)', lineHeight: 1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>{valueLabel}</Typography>
      </Box>
      <Box sx={{ borderTop: BC_BORDER, pt: 0.5 }}>{children}</Box>
    </Box>
  );
}

function StageArrow() {
  return (
    <Box
      aria-hidden="true"
      sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: 'var(--bc-border-strong)' }}
    >
      <ChevronRightOutlined />
    </Box>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)', fontWeight: 500 }}>{label}</Typography>
    </Box>
  );
}

function CategoryRow({
  label,
  count,
  total,
  color,
  onClick,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  onClick?: () => void;
}) {
  const pct = formatPct(count, total);
  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={`${label}: ${count} cases (${pct})`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        py: 0.9,
        px: 1,
        borderRadius: '8px',
        border: 0,
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        font: 'inherit',
        transition: 'all 0.15s ease',
        '&:hover': onClick ? { bgcolor: 'var(--bc-surface-2)' } : undefined,
        '&:focus-visible': { outline: '2px solid var(--bc-focus-ring)', outlineOffset: '1px' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--bc-text)' }}>{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)', minWidth: 20, textAlign: 'right' }}>
          {count}
        </Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'var(--bc-text-secondary)', minWidth: 44, textAlign: 'right' }}>
          {pct}
        </Typography>
      </Box>
    </Box>
  );
}

function ProfileMetricRow({
  label,
  count,
  total,
  color = '#0f766e',
  onClick,
}: {
  label: string;
  count: number;
  total: number;
  color?: string;
  onClick?: () => void;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const formattedPct = formatPct(count, total);
  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={`${label}: ${count} cases (${formattedPct})`}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '90px 1fr 64px', sm: '100px 1fr 70px' },
        alignItems: 'center',
        gap: 1.25,
        width: '100%',
        py: 0.75,
        px: 1,
        borderRadius: '8px',
        border: 0,
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        font: 'inherit',
        transition: 'all 0.15s ease',
        '&:hover': onClick ? { bgcolor: 'var(--bc-surface-2)' } : undefined,
        '&:focus-visible': { outline: '2px solid var(--bc-focus-ring)', outlineOffset: '1px' },
      }}
    >
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: 'var(--bc-text)' }}>
        {label}
      </Typography>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'var(--bc-track)', overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 4,
            bgcolor: color,
            transition: 'width 0.25s ease',
          }}
        />
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {count} <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 500, color: 'var(--bc-text-secondary)' }}>· {formattedPct}</Typography>
      </Typography>
    </Box>
  );
}

/* ── Overview ─────────────────────────────────────────────────── */

export function BiteCasesOverviewTab({
  doh,
  locations,
  insights,
  limitations,
  totalRecorded,
  finalizedCount,
  awaitingAssessmentCount,
  pepPrescribedCount,
  givenPepCount,
  noAdminCount,
  onDrillDownToStage,
  onDrillDownFilter,
  onExportEpisodesCsv,
}: BiteCasesOverviewTabProps) {
  const navigate = useNavigate();
  const [showReportingTable, setShowReportingTable] = useState(false);
  const [showAllPlaces, setShowAllPlaces] = useState(false);

  const catI = doh?.categories.I ?? 0;
  const catII = doh?.categories.II ?? 0;
  const catIII = doh?.categories.III ?? 0;
  const notYetAssessed = doh?.categories.not_yet_assessed ?? awaitingAssessmentCount;
  const catMissing = doh?.categories.assessed_category_missing ?? 0;
  const explicitNoPepCount = doh?.pep_and_biologics.explicit_no_pep ?? 0;
  const transferredCount = doh?.completion_and_outcomes.transferred_referred ?? 0;
  const decisionPendingCount =
    (doh?.form_2_decision_pending_count ?? 0) + (doh?.pep_and_biologics.decision_missing ?? 0);

  const isUnrecordedLoc = (loc: LocationSummary) => {
    const raw = (loc.normalized_barangay || loc.location || '').trim().toLowerCase();
    return raw === 'unknown' || raw === 'not recorded' || raw === 'unrecorded' || raw === '';
  };

  const namedBarangays = [...locations].filter((l) => !isUnrecordedLoc(l)).sort((a, b) => b.total_cases - a.total_cases);
  const unrecordedBarangays = [...locations].filter(isUnrecordedLoc);
  const unrecordedCount = unrecordedBarangays.reduce((sum, l) => sum + l.total_cases, 0);
  const displayedNamedBarangays = showAllPlaces ? namedBarangays : namedBarangays.slice(0, 4);
  const maxNamedCases = Math.max(1, ...namedBarangays.map((l) => l.total_cases));

  const hasNotes = (limitations?.length ?? 0) > 0 || (insights?.length ?? 0) > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── 1. Clinical progression: Form 1 → Form 2 → Form 3 ── */}
      <Section
        title="Clinical progression"
        hint={`Where the ${totalRecorded} recorded case${totalRecorded === 1 ? '' : 's'} are in the Form 1 → Form 2 → Form 3 process.`}
        action={
          <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowReportingTable((v) => !v)}
              endIcon={showReportingTable ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
              aria-expanded={showReportingTable}
              sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 600 }}
            >
              {showReportingTable ? 'Hide reporting table' : 'Reporting table'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadOutlined aria-hidden="true" />}
              onClick={onExportEpisodesCsv}
              data-walkthrough="bite-cases-export-csv"
              data-tour="bite-cases-export-csv"
              sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 600, borderRadius: '8px' }}
            >
              Export CSV
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1, alignItems: 'stretch' }}>
          <Stage step="Form 1" title="Registration and exposure" value={totalRecorded} valueLabel="registered">
            <StageRow
              label="Awaiting assessment"
              count={awaitingAssessmentCount}
              tone="attention"
              onClick={() => onDrillDownToStage('form_1_registration')}
            />
          </Stage>

          <StageArrow />

          <Stage step="Form 2" title="Doctor assessment" value={finalizedCount} valueLabel="assessed">
            <StageRow label="PEP prescribed" count={pepPrescribedCount} tone="neutral" />
            <StageRow
              label="No PEP required"
              count={explicitNoPepCount}
              tone="positive"
              onClick={() => onDrillDownToStage('form_2_no_pep')}
            />
            <StageRow
              label="Transferred / referred"
              count={transferredCount}
              tone="neutral"
              onClick={() => onDrillDownToStage('form_2_transferred')}
            />
            {decisionPendingCount > 0 && (
              <StageRow
                label="Decision not recorded"
                count={decisionPendingCount}
                tone="attention"
                onClick={() => onDrillDownFilter({ status: 'unresolved_review' })}
              />
            )}
          </Stage>

          <StageArrow />

          <Stage step="Form 3" title="Nurse treatment" value={pepPrescribedCount} valueLabel="prescribed PEP">
            <StageRow
              label="Treatment started"
              count={givenPepCount}
              tone="positive"
              onClick={() => onDrillDownToStage('form_3_treatment_recorded')}
            />
            <StageRow
              label="No administration recorded"
              count={noAdminCount}
              tone="attention"
              onClick={() => onDrillDownToStage('form_2_pep_prescribed')}
            />
          </Stage>
        </Box>

        {showReportingTable && (
          <TableContainer
            className="bc-table-scroll-region"
            tabIndex={0}
            role="region"
            aria-label="Reporting table by last completed stage"
            sx={{ mt: 1.5, border: BC_BORDER }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Last completed stage</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>What can be reported</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>How missing information is shown</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Cases</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(doh?.stage_matrix ?? []).map((row) => (
                  <TableRow
                    key={row.stage_key}
                    hover={row.count > 0}
                    onClick={row.count > 0 ? () => onDrillDownToStage(row.stage_key) : undefined}
                    sx={{ cursor: row.count > 0 ? 'pointer' : 'default' }}
                  >
                    <TableCell sx={{ fontSize: 12.5, fontWeight: 600, minWidth: 180 }}>{row.stage}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: 'var(--bc-text-2)', minWidth: 180 }}>{row.what_can_be_reported}</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <SemanticChip label={row.missing_info_display} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700 }}>{row.count}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
                      {formatPct(row.count, totalRecorded)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mt: 1.25 }}>
          “No administration recorded” means no nurse record exists yet. The patient may have been treated elsewhere.
        </Typography>
      </Section>

      {/* ── 2. Exposure category & Place of incident ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '4fr 7fr' }, gap: 2 }}>
        {/* Exposure Category Card */}
        <Section title="Exposure category" hint="Select a category to view its cases.">
          {/* Top Multi-Segmented Proportional Bar */}
          <Box
            sx={{
              width: '100%',
              height: 12,
              borderRadius: '6px',
              bgcolor: 'var(--bc-track)',
              overflow: 'hidden',
              display: 'flex',
              mb: 1.75,
            }}
          >
            {totalRecorded > 0 ? (
              <>
                {catIII > 0 && <Box sx={{ width: `${(catIII / totalRecorded) * 100}%`, height: '100%', bgcolor: C.catIII }} />}
                {catII > 0 && <Box sx={{ width: `${(catII / totalRecorded) * 100}%`, height: '100%', bgcolor: C.catII }} />}
                {catI > 0 && <Box sx={{ width: `${(catI / totalRecorded) * 100}%`, height: '100%', bgcolor: C.catI }} />}
                {notYetAssessed > 0 && <Box sx={{ width: `${(notYetAssessed / totalRecorded) * 100}%`, height: '100%', bgcolor: C.pending }} />}
                {catMissing > 0 && <Box sx={{ width: `${(catMissing / totalRecorded) * 100}%`, height: '100%', bgcolor: '#cbd5e1' }} />}
              </>
            ) : (
              <Box sx={{ width: '100%', height: '100%', bgcolor: C.pending }} />
            )}
          </Box>

          {/* Category List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <CategoryRow
              label="Category III"
              count={catIII}
              total={totalRecorded}
              color={C.catIII}
              onClick={() => onDrillDownFilter({ severity: 'III', status: '' })}
            />
            <CategoryRow
              label="Category II"
              count={catII}
              total={totalRecorded}
              color={C.catII}
              onClick={() => onDrillDownFilter({ severity: 'II', status: '' })}
            />
            <CategoryRow
              label="Category I"
              count={catI}
              total={totalRecorded}
              color={C.catI}
              onClick={() => onDrillDownFilter({ severity: 'I', status: '' })}
            />
            <CategoryRow
              label="Not yet assessed"
              count={notYetAssessed}
              total={totalRecorded}
              color={C.pending}
              onClick={() => onDrillDownFilter({ severity: 'not_yet_assessed', status: '' })}
            />
            {catMissing > 0 && (
              <CategoryRow
                label="Assessed, category not recorded"
                count={catMissing}
                total={totalRecorded}
                color={C.pending}
                onClick={() => onDrillDownFilter({ severity: 'assessed_category_missing', status: '' })}
              />
            )}
          </Box>
        </Section>

        {/* Place of Incident Card */}
        <Section
          title="Place of incident"
          hint="Cases per barangay, split by exposure category. Select a row to filter."
          action={
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(ROUTES.BITE_CASES.MAP)}
              sx={{
                textTransform: 'none',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: '8px',
                borderColor: '#0f766e',
                color: '#0f766e',
                px: 1.5,
                py: 0.4,
                '&:hover': { borderColor: '#0d655e', bgcolor: 'rgba(15, 118, 110, 0.04)' },
              }}
            >
              View on Bite Map
            </Button>
          }
        >
          {displayedNamedBarangays.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'var(--bc-text-secondary)', py: 2 }}>
              No place of exposure matches the current filters.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {displayedNamedBarangays.map((loc, idx) => {
                const rawName = loc.normalized_barangay || loc.location;
                const rank = idx + 1;
                const isHotspot = idx === 0 && loc.total_cases > 0;
                const total = loc.total_cases;
                const suppressed = Boolean(loc.is_small_cell_suppressed);
                const notAssessed = Math.max(0, total - loc.cat_1 - loc.cat_2 - loc.cat_3);
                const barWidth = suppressed ? 100 : (total / maxNamedCases) * 100;
                const pct = formatPct(total, totalRecorded);
                const segments = [
                  { key: 'III', value: loc.cat_3, color: C.catIII },
                  { key: 'II', value: loc.cat_2, color: C.catII },
                  { key: 'I', value: loc.cat_1, color: C.catI },
                  { key: 'NA', value: notAssessed, color: C.pending },
                ];

                return (
                  <Tooltip
                    key={loc.location}
                    arrow
                    placement="top"
                    title={
                      suppressed
                        ? 'Fewer than 5 cases — hidden in conference mode'
                        : `Category III: ${loc.cat_3} · Category II: ${loc.cat_2} · Category I: ${loc.cat_1} · Not assessed: ${notAssessed}`
                    }
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onDrillDownFilter({ search: rawName })}
                      aria-label={`${rawName}: ${suppressed ? 'fewer than 5' : total} cases. View cases`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '20px 110px 1fr 64px', sm: '22px 140px 1fr 76px' },
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        px: 1,
                        py: 0.85,
                        border: 0,
                        borderRadius: '8px',
                        background: 'transparent',
                        textAlign: 'left',
                        font: 'inherit',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: 'var(--bc-surface-2)',
                        },
                        '&:focus-visible': { outline: '2px solid var(--bc-focus-ring)', outlineOffset: '1px' },
                      }}
                    >
                      {/* Rank Number */}
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--bc-text-secondary)' }}>
                        {rank}
                      </Typography>

                      {/* Barangay Name + Hotspot tag */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: 'var(--bc-text)' }}>
                          {rawName}
                        </Typography>
                        {isHotspot && (
                          <Box
                            sx={{
                              px: 0.8,
                              py: 0.1,
                              borderRadius: '10px',
                              fontSize: 10.5,
                              fontWeight: 700,
                              bgcolor: '#0f766e',
                              color: '#ffffff',
                              letterSpacing: '0.02em',
                              flexShrink: 0,
                            }}
                          >
                            Hotspot
                          </Box>
                        )}
                      </Box>

                      {/* Segmented Category Mix Bar */}
                      <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'var(--bc-track)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${barWidth}%`, height: '100%', display: 'flex' }}>
                          {suppressed ? (
                            <Box sx={{ flex: 1, bgcolor: C.pending }} />
                          ) : (
                            segments.map((s) =>
                              s.value > 0 ? (
                                <Box key={s.key} sx={{ flex: s.value, bgcolor: s.color }} />
                              ) : null
                            )
                          )}
                        </Box>
                      </Box>

                      {/* Stat */}
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {suppressed ? '<5' : total}{' '}
                        {!suppressed && (
                          <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 500, color: 'var(--bc-text-secondary)' }}>
                            · {pct}
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          )}

          {/* Legend and Show all places link */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 1.5, px: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.75 }}>
              <LegendDot color={C.catIII} label="Cat III" />
              <LegendDot color={C.catII} label="Cat II" />
              <LegendDot color={C.catI} label="Cat I" />
              <LegendDot color={C.pending} label="Not assessed" />
            </Box>
            {namedBarangays.length > 4 && (
              <Button
                size="small"
                variant="text"
                onClick={() => setShowAllPlaces(!showAllPlaces)}
                sx={{
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f766e',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                {showAllPlaces ? 'Show top 4' : 'Show all places'}
              </Button>
            )}
          </Box>

          {/* Unrecorded Notice Banner */}
          {unrecordedCount > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: '10px',
                bgcolor: 'rgba(254, 243, 199, 0.45)',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>
                <strong style={{ fontWeight: 700 }}>{unrecordedCount} case{unrecordedCount === 1 ? '' : 's'} ({formatPct(unrecordedCount, totalRecorded)})</strong> have no place recorded, so they are not on the map.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onDrillDownFilter({ search: 'not recorded' })}
                sx={{
                  textTransform: 'none',
                  fontSize: 12.5,
                  fontWeight: 600,
                  bgcolor: '#ffffff',
                  borderColor: '#d1d5db',
                  color: '#374151',
                  borderRadius: '8px',
                  px: 1.75,
                  py: 0.4,
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                  '&:hover': { bgcolor: '#f9fafb', borderColor: '#9ca3af' },
                }}
              >
                Review records
              </Button>
            </Box>
          )}
        </Section>
      </Box>

      {/* ── 3. Biting animal, Age group, and Sex ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {/* Card 1: Biting animal */}
        <Section title="Biting animal">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <ProfileMetricRow
              label="Cat"
              count={doh?.animals.cat ?? 0}
              total={totalRecorded}
              color="#0f766e"
              onClick={() => onDrillDownFilter({ animal: 'cat' })}
            />
            <ProfileMetricRow
              label="Dog"
              count={doh?.animals.dog ?? 0}
              total={totalRecorded}
              color="#0f766e"
              onClick={() => onDrillDownFilter({ animal: 'dog' })}
            />
            {(doh?.animals.other ?? 0) > 0 && (
              <ProfileMetricRow
                label="Other animal"
                count={doh?.animals.other ?? 0}
                total={totalRecorded}
                color="#0f766e"
                onClick={() => onDrillDownFilter({ animal: 'other' })}
              />
            )}
            <ProfileMetricRow
              label="Not recorded"
              count={doh?.animals.unknown ?? 0}
              total={totalRecorded}
              color="#94a3b8"
              onClick={() => onDrillDownFilter({ animal: 'unknown' })}
            />
          </Box>
          <Box sx={{ mt: 'auto', pt: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.6 }}>
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
              Ownership: {doh?.animals.owned ?? 0} owned · {doh?.animals.stray ?? 0} stray ·
            </Typography>
            <Box
              component="span"
              sx={{
                px: 0.8,
                py: 0.15,
                borderRadius: '6px',
                bgcolor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {doh?.animals.animal_status_unknown ?? Math.max(0, totalRecorded - (doh?.animals.owned ?? 0) - (doh?.animals.stray ?? 0))} not recorded
            </Box>
          </Box>
        </Section>

        {/* Card 2: Age group */}
        <Section title="Age group">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <ProfileMetricRow
              label="15 and above"
              count={doh?.demographics.age_15_above ?? 0}
              total={totalRecorded}
              color="#0f766e"
            />
            <ProfileMetricRow
              label="Under 15"
              count={doh?.demographics.age_below_15 ?? 0}
              total={totalRecorded}
              color="#0f766e"
            />
            {(doh?.demographics.age_unknown ?? 0) > 0 && (
              <ProfileMetricRow
                label="Not recorded"
                count={doh?.demographics.age_unknown ?? 0}
                total={totalRecorded}
                color="#94a3b8"
              />
            )}
          </Box>
        </Section>

        {/* Card 3: Sex */}
        <Section title="Sex">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <ProfileMetricRow
              label="Female"
              count={doh?.demographics.female ?? 0}
              total={totalRecorded}
              color="#0f766e"
            />
            <ProfileMetricRow
              label="Male"
              count={doh?.demographics.male ?? 0}
              total={totalRecorded}
              color="#0f766e"
            />
            {(doh?.demographics.unknown_sex ?? 0) > 0 && (
              <ProfileMetricRow
                label="Not recorded"
                count={doh?.demographics.unknown_sex ?? 0}
                total={totalRecorded}
                color="#94a3b8"
              />
            )}
          </Box>
        </Section>
      </Box>

      {/* ── 4. Data notes (collapsed) ── */}
      {hasNotes && (
        <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '14px', bgcolor: 'var(--bc-surface)' }}>
          <Box
            component="details"
            sx={{
              '& > summary': {
                listStyle: 'none',
                cursor: 'pointer',
                px: 2,
                py: 1.25,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--bc-text-2)',
                borderRadius: '14px',
                '&::-webkit-details-marker': { display: 'none' },
                '&:focus-visible': { outline: '2px solid var(--bc-focus-ring)', outlineOffset: '2px' },
              },
            }}
          >
            <summary>
              About this data
              {(limitations?.length ?? 0) > 0 ? ` · ${limitations?.length} limitation${limitations?.length === 1 ? '' : 's'}` : ''}
              {(insights?.length ?? 0) > 0 ? ` · ${insights?.length} finding${insights?.length === 1 ? '' : 's'}` : ''}
            </summary>
            <Box sx={{ px: 2, pb: 1.75, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {(insights?.length ?? 0) > 0 && (
                <Box component="ul" sx={{ m: 0, pl: 2.25, '& li': { fontSize: 12.5, color: 'var(--bc-text-2)', lineHeight: 1.55, mb: 0.5 } }}>
                  {insights?.map((ins) => (
                    <li key={ins.finding_key}>
                      <strong>{ins.title}.</strong> {ins.statement}
                    </li>
                  ))}
                </Box>
              )}
              {(limitations?.length ?? 0) > 0 && (
                <Box component="ul" sx={{ m: 0, pl: 2.25, '& li': { fontSize: 12.5, color: 'var(--bc-text-secondary)', lineHeight: 1.55, mb: 0.5 } }}>
                  {limitations?.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
