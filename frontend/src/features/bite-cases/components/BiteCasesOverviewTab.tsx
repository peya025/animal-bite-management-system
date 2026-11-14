import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  FileDownloadOutlined,
  InfoOutlined,
  OpenInNewOutlined,
} from '@mui/icons-material';
import type { DohSummary, LocationSummary, DescriptiveFinding } from '../types/biteCasesSummary.types';
import { formatPct } from '../types/biteCasesSummary.types';
import {
  BC_BORDER,
  DohStatLine,
  HorizontalDistBar,
  SemanticChip,
} from './BiteCasesSharedUi';

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
  givenRigCount: number;
  completedMatureTotal: number;
  overdueEpisodesCount: number;
  onDrillDownToStage: (stageKey: string) => void;
  onDrillDownFilter: (next: { status?: string; severity?: string; animal?: string; search?: string }) => void;
  onExportEpisodesCsv: () => void;
}

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
  givenRigCount,
  completedMatureTotal,
  overdueEpisodesCount,
  onDrillDownToStage,
  onDrillDownFilter,
  onExportEpisodesCsv,
}: BiteCasesOverviewTabProps) {
  const catI = doh?.categories.I ?? 0;
  const catII = doh?.categories.II ?? 0;
  const catIII = doh?.categories.III ?? 0;
  const notYetAssessed = doh?.categories.not_yet_assessed ?? awaitingAssessmentCount;
  const catMissing = doh?.categories.assessed_category_missing ?? 0;
  const prioritizedBarangays = [...locations]
    .sort((a, b) => b.total_cases - a.total_cases)
    .slice(0, 6);
  const maxLocCases = Math.max(1, ...prioritizedBarangays.map((l) => l.total_cases));
  const priorRecDelta = doh?.period_comparison?.indicators?.recorded_episodes;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      {/* Executive 3-Item Findings Summary (BCS-05.2) */}
      <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75, bgcolor: 'var(--bc-surface-2)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.9 }}>
          <InfoOutlined aria-hidden="true" sx={{ fontSize: 18, color: 'var(--bc-green-strong)' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)' }}>
            Executive Meeting Findings Summary
          </Typography>
        </Box>
        <Box
          component="ul"
          sx={{
            m: 0,
            pl: 2.25,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            gap: 1.25,
            '& li': { fontSize: 12.5, color: 'var(--bc-text-2)', lineHeight: 1.45 },
          }}
        >
          <li>
            <strong>Exposure &amp; Assessment Progress:</strong> Of{' '}
            <strong>{totalRecorded}</strong> recorded exposure episodes,{' '}
            <strong>{finalizedCount}</strong> ({formatPct(finalizedCount, totalRecorded)}) had a
            finalized doctor assessment and <strong>{awaitingAssessmentCount}</strong> were awaiting
            assessment
            {priorRecDelta
              ? ` (${priorRecDelta.delta >= 0 ? '+' : ''}${priorRecDelta.delta} vs prior period ${doh?.period_comparison?.prior_period_start} to ${doh?.period_comparison?.prior_period_end}).`
              : '.'}
          </li>
          <li>
            <strong>PEP Prescription vs. Administration:</strong> Of{' '}
            <strong>{pepPrescribedCount}</strong> episodes prescribed PEP,{' '}
            <strong>{givenPepCount}</strong> had recorded vaccine initiation and{' '}
            <strong>{noAdminCount}</strong> had <em>no administration recorded</em> as of the
            reporting cutoff (may reflect external care or pending documentation).
          </li>
          <li>
            <strong>Severity, RIG &amp; Mature Completion:</strong>{' '}
            <strong>{catIII}</strong> Category III exposures ({formatPct(catIII, finalizedCount)} of
            assessed) with <strong>{givenRigCount}</strong> verified RIG administrations,{' '}
            <strong>{completedMatureTotal}</strong> mature completed PEP courses (of{' '}
            <strong>{doh?.completion_and_outcomes.matured_courses ?? 0}</strong> mature cohort courses),
            and <strong>{overdueEpisodesCount}</strong> overdue episode(s).
          </li>
        </Box>
      </Paper>

      {/* Section A: 5-Stage Incomplete Journey Matrix */}
      <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography id="stage-matrix-heading" sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)' }}>
              Incomplete Patient Journey Reporting Matrix (Form 1 → Form 2 → Form 3)
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
              Includes patients whose encounter stopped at Form 1 or Form 2 without treating missing stages as zero or treatment failure.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadOutlined aria-hidden="true" />}
            data-walkthrough="bite-cases-export-csv"
            data-tour="bite-cases-export-csv"
            onClick={onExportEpisodesCsv}
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
          >
            Export CSV
          </Button>
        </Box>

        <TableContainer
          className="bc-table-scroll-region"
          tabIndex={0}
          role="region"
          aria-labelledby="stage-matrix-caption"
        >
          <Table size="small" stickyHeader>
            <caption id="stage-matrix-caption" className="bc-table-caption">
              5-stage clinical progression matrix showing reportable fields, how missing information is displayed, and episode counts across Form 1, Form 2, and Form 3.
            </caption>
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>
                  Patient’s Last Completed Stage
                </TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>
                  What Can Be Reported
                </TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>
                  How Missing Information Is Shown
                </TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>
                  Episodes
                </TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>
                  % of Recorded
                </TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>
                  Inspect
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(doh?.stage_matrix ?? []).map((row) => (
                <TableRow key={row.stage_key} hover>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{ fontWeight: 700, fontSize: 12.5, color: 'var(--bc-text)', minWidth: 220 }}
                  >
                    {row.stage}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5, color: 'var(--bc-text-2)', minWidth: 210 }}>
                    {row.what_can_be_reported}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, minWidth: 240 }}>
                    <SemanticChip label={row.missing_info_display} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 13.5 }}>
                    {row.count}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
                    {formatPct(row.count, totalRecorded)}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      endIcon={<OpenInNewOutlined aria-hidden="true" sx={{ fontSize: 14 }} />}
                      onClick={() => onDrillDownToStage(row.stage_key)}
                      disabled={row.count === 0}
                      sx={{ textTransform: 'none', fontSize: 11.5, fontWeight: 600 }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {(doh?.form_2_decision_pending_count ?? 0) > 0 && (
          <Alert severity="info" sx={{ mt: 1, py: 0.4, fontSize: 12 }}>
            {doh?.form_2_decision_pending_count} episode(s) finished doctor assessment with category/location recorded, but PEP decision is still pending completion.
          </Alert>
        )}

        <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)', mt: 1 }}>
          Reporting rule: “No administration recorded” is used instead of “Patient did not receive treatment” because treatment may have occurred elsewhere or awaits documentation.
        </Typography>
      </Paper>

      {/* Section B: Two-Column Exposure Profiles & Leading Barangays Charts (BCS-05.2) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 1.75,
        }}
      >
        {/* Left Card: Exposure Category & Patient Demographics (Form 1) */}
        <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)', mb: 0.25 }}>
            Form 1 Exposure Profile — Categories &amp; Demographics
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mb: 1.25 }}>
            Click any category bar to inspect matching episodes. Unknown and unassessed episodes stay explicit.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
            <HorizontalDistBar
              label="Category III (High Risk / Biologics Indicated)"
              count={catIII}
              total={totalRecorded}
              color="var(--bc-red)"
              onClick={() => onDrillDownFilter({ severity: 'III', status: '' })}
            />
            <HorizontalDistBar
              label="Category II (Moderate Risk)"
              count={catII}
              total={totalRecorded}
              color="var(--bc-amber)"
              onClick={() => onDrillDownFilter({ severity: 'II', status: '' })}
            />
            <HorizontalDistBar
              label="Category I (Low Risk)"
              count={catI}
              total={totalRecorded}
              color="var(--bc-green)"
              onClick={() => onDrillDownFilter({ severity: 'I', status: '' })}
            />
            <HorizontalDistBar
              label="Not Yet Assessed (Form 1 Only)"
              count={notYetAssessed}
              total={totalRecorded}
              color="var(--bc-focus-ring)"
              onClick={() => onDrillDownFilter({ severity: 'not_yet_assessed', status: '' })}
            />
            {catMissing > 0 && (
              <HorizontalDistBar
                label="Assessed – Category Missing (Review Gap)"
                count={catMissing}
                total={totalRecorded}
                color="var(--bc-border-strong)"
                onClick={() => onDrillDownFilter({ severity: 'assessed_category_missing', status: '' })}
              />
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 1, borderTop: BC_BORDER }}>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 0.4 }}>
                Sex Breakdown (Form 1)
              </Typography>
              <DohStatLine label="Male" value={doh?.demographics.male ?? 0} hint={formatPct(doh?.demographics.male ?? 0, totalRecorded)} />
              <DohStatLine label="Female" value={doh?.demographics.female ?? 0} hint={formatPct(doh?.demographics.female ?? 0, totalRecorded)} />
              <DohStatLine label="Sex Unknown / Unspecified" value={doh?.demographics.unknown_sex ?? 0} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 0.4 }}>
                Age Groups (Form 1)
              </Typography>
              <DohStatLine label="Children < 15 years" value={doh?.demographics.age_below_15 ?? 0} hint={formatPct(doh?.demographics.age_below_15 ?? 0, totalRecorded)} />
              <DohStatLine label="Adults ≥ 15 years" value={doh?.demographics.age_15_above ?? 0} hint={formatPct(doh?.demographics.age_15_above ?? 0, totalRecorded)} />
              <DohStatLine label="Age Unknown" value={doh?.demographics.age_unknown ?? 0} />
            </Box>
          </Box>
        </Paper>

        {/* Right Card: Biting Animal Profile & Leading Barangays */}
        <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)', mb: 0.25 }}>
            Biting Animal Profile &amp; Leading Barangays
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mb: 1.25 }}>
            Horizontal bars compare animal types (with Unknown kept explicit) and the top exposure barangays.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.65, mb: 1.5 }}>
            <HorizontalDistBar
              label="Dog Exposures"
              count={doh?.animals.dog ?? 0}
              total={totalRecorded}
              color="var(--bc-green-strong)"
              onClick={() => onDrillDownFilter({ animal: 'dog' })}
            />
            <HorizontalDistBar
              label="Cat Exposures"
              count={doh?.animals.cat ?? 0}
              total={totalRecorded}
              color="#0284c7"
              onClick={() => onDrillDownFilter({ animal: 'cat' })}
            />
            <HorizontalDistBar
              label="Other Animal Exposures"
              count={doh?.animals.other ?? 0}
              total={totalRecorded}
              color="var(--bc-amber)"
              onClick={() => onDrillDownFilter({ animal: 'other' })}
            />
            <HorizontalDistBar
              label="Animal Unknown / Unspecified"
              count={doh?.animals.unknown ?? 0}
              total={totalRecorded}
              color="var(--bc-border-strong)"
              onClick={() => onDrillDownFilter({ animal: 'unknown' })}
            />
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
            <Chip size="small" label={`Stray: ${doh?.animals.stray ?? 0}`} sx={{ fontSize: 11, fontWeight: 700 }} />
            <Chip size="small" label={`Owned: ${doh?.animals.owned ?? 0}`} sx={{ fontSize: 11, fontWeight: 700 }} />
            <Chip size="small" label={`Animal Status Unknown: ${doh?.animals.animal_status_unknown ?? 0}`} sx={{ fontSize: 11, fontWeight: 600 }} />
          </Box>

          <Box sx={{ pt: 1, borderTop: BC_BORDER }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 0.65 }}>
              Leading Barangays by Recorded Exposures (Top {prioritizedBarangays.length})
            </Typography>
            {prioritizedBarangays.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                No barangay exposure data matches the current filters.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {prioritizedBarangays.map((loc) => (
                  <HorizontalDistBar
                    key={loc.location}
                    label={loc.normalized_barangay || loc.location}
                    subLabel={
                      loc.is_small_cell_suppressed
                        ? '<5 cases (Conference Cell Suppressed)'
                        : `Cat III: ${loc.cat_3} • No Admin: ${loc.no_administration_recorded ?? 0}`
                    }
                    count={loc.is_small_cell_suppressed ? 1 : loc.total_cases}
                    total={maxLocCases}
                    color={loc.cat_3 > 0 ? 'var(--bc-red)' : 'var(--bc-green-strong)'}
                    onClick={() => onDrillDownFilter({ search: loc.normalized_barangay || loc.location })}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Collapsible Data Limitations & Scope Notes */}
      {limitations && limitations.length > 0 && (
        <details className="bc-disclosure">
          <summary>
            <span>Report Scope &amp; Methodological Limitations ({limitations.length})</span>
            <span style={{ fontSize: 12, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>Click to expand</span>
          </summary>
          <div className="bc-disclosure-body">
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, lineHeight: 1.6, color: 'var(--bc-text-2)' }}>
              {limitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
            {insights && insights.length > 0 && (
              <Box sx={{ mt: 1.5, pt: 1.25, borderTop: BC_BORDER }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
                  Descriptive Review Findings ({insights.length})
                </Typography>
                {insights.map((ins) => (
                  <Typography key={ins.finding_key} sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mb: 0.4 }}>
                    • <strong>{ins.title} ({ins.supporting_metric}):</strong> {ins.statement}
                  </Typography>
                ))}
              </Box>
            )}
          </div>
        </details>
      )}
    </Box>
  );
}
