import {
  Box,
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
import type { DohSummary } from '../types/biteCasesSummary.types';
import { formatPct } from '../types/biteCasesSummary.types';
import { BC_BORDER, DohStatLine } from './BiteCasesSharedUi';

interface BiteCasesTreatmentTabProps {
  doh?: DohSummary;
  totalRecorded: number;
  finalizedCount: number;
  awaitingAssessmentCount: number;
  pepPrescribedCount: number;
  newCoursePrescribedCount: number;
  givenPepCount: number;
  noAdminCount: number;
  explicitNoPepCount: number;
  transferredCount: number;
  givenRigCount: number;
  completedMatureTotal: number;
  overdueEpisodesCount: number;
  overduePatientsCount: number;
  overdueCoursesCount: number;
  outstandingDoseSlotsCount: number;
  onDrillDownFilter: (next: { status?: string; severity?: string }) => void;
}

export function BiteCasesTreatmentTab({
  doh,
  totalRecorded,
  finalizedCount,
  awaitingAssessmentCount,
  pepPrescribedCount,
  newCoursePrescribedCount,
  givenPepCount,
  noAdminCount,
  explicitNoPepCount,
  transferredCount,
  givenRigCount,
  completedMatureTotal,
  overdueEpisodesCount,
  overduePatientsCount,
  overdueCoursesCount,
  outstandingDoseSlotsCount,
  onDrillDownFilter,
}: BiteCasesTreatmentTabProps) {
  const decisionPendingCount = doh?.form_2_decision_pending_count ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      {/* Assessment & Treatment Progress Strip (Appendix C supporting strip) */}
      <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)', mb: 0.25 }}>
          Assessment &amp; Treatment Progress Strip
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mb: 1.25 }}>
          Explicitly labeled clinical measures across Form 1, Form 2, and Form 3. Overlapping operational indicators (Transfers, Overdue) are separated rather than added into journey stages.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 1.1,
            mb: 1.1,
          }}
        >
          {[
            {
              label: '1. No Finalized Assessment',
              value: awaitingAssessmentCount,
              hint: `${formatPct(awaitingAssessmentCount, totalRecorded)} of recorded (Form 1 only)`,
              status: 'awaiting_assessment',
              bg: 'var(--bc-surface-2)',
              accent: 'var(--bc-focus-ring)',
            },
            {
              label: '2. Assessed – Decision Not Recorded',
              value: decisionPendingCount + (doh?.pep_and_biologics.decision_missing ?? 0),
              hint: 'Finalized doctor assessment awaiting recorded PEP plan decision',
              status: 'unresolved_review',
              bg: 'var(--bc-amber-bg)',
              accent: 'var(--bc-amber-strong)',
            },
            {
              label: '3. PEP Prescribed – No Admin Recorded',
              value: noAdminCount,
              hint: `${formatPct(noAdminCount, pepPrescribedCount)} of prescribed (may have care elsewhere)`,
              status: 'no_administration_recorded',
              bg: 'var(--bc-danger-bg-subtle)',
              accent: 'var(--bc-red-strong)',
            },
            {
              label: '4. PEP Started (Given PEP)',
              value: givenPepCount,
              hint: `${formatPct(givenPepCount, newCoursePrescribedCount)} of new courses prescribed • ${explicitNoPepCount} No PEP required`,
              status: 'treatment_recorded',
              bg: 'var(--bc-success-bg)',
              accent: 'var(--bc-green-strong)',
            },
          ].map((step) => (
            <Paper
              key={step.label}
              component="button"
              type="button"
              elevation={0}
              onClick={() => onDrillDownFilter({ status: step.status })}
              sx={{
                p: 1.2,
                textAlign: 'left',
                borderRadius: '8px',
                border: BC_BORDER,
                bgcolor: step.bg,
                cursor: 'pointer',
                '&:hover': { borderColor: step.accent },
                '&:focus-visible': {
                  outline: '2px solid var(--bc-focus-ring)',
                  outlineOffset: '2px',
                },
              }}
            >
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: step.accent }}>
                {step.label}
              </Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'var(--bc-text)', my: 0.25 }}>
                {step.value}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', lineHeight: 1.3 }}>
                {step.hint}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>
            Overlapping Operational Indicators:
          </Typography>
          <Chip
            size="small"
            clickable
            onClick={() => onDrillDownFilter({ status: 'completed_no_pep' })}
            label={`Completed – No PEP Required: ${explicitNoPepCount}`}
            sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: 'var(--bc-success-bg)', color: 'var(--bc-green-strong)' }}
          />
          <Chip
            size="small"
            clickable
            onClick={() => onDrillDownFilter({ status: 'transferred_referred' })}
            label={`Transferred / Referred: ${transferredCount} (external outcome unknown unless verified)`}
            sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: 'var(--bc-amber-bg)', color: 'var(--bc-amber-strong)' }}
          />
          <Chip
            size="small"
            label={`Currently Overdue Follow-up (as of cutoff): ${overdueEpisodesCount} ep / ${outstandingDoseSlotsCount} slots`}
            sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: overdueEpisodesCount > 0 ? 'var(--bc-danger-bg)' : 'var(--bc-surface-3)', color: overdueEpisodesCount > 0 ? 'var(--bc-red-strong)' : 'var(--bc-text-secondary)' }}
          />
        </Box>
      </Paper>

      {/* Form 3 Cohort Breakdown by Category (Primary Treatment View) */}
      <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)', mb: 0.25 }}>
          Form 3 Cohort Outcomes Breakdown by Exposure Category (I, II, III)
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mb: 1.1 }}>
          {(doh?.cohort_by_category.excluded_unassessed_or_missing_cat ?? 0) > 0
            ? `${doh?.cohort_by_category.excluded_unassessed_or_missing_cat} unassessed / category-missing episode(s) are excluded from the I–III rows rather than auto-assigned a category.`
            : 'All recorded episodes have an assigned WHO category.'}
        </Typography>

        <TableContainer
          className="bc-table-scroll-region"
          tabIndex={0}
          role="region"
          aria-labelledby="cohort-table-caption"
        >
          <Table size="small" stickyHeader>
            <caption id="cohort-table-caption" className="bc-table-caption">
              Assessed Category I, II, and III PEP initiation, no-administration gaps, mature completion rates, RIG administration, and transfers.
            </caption>
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>WHO Category</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Assessed Cases</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Given PEP</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>No Admin Recorded</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Completed (Mature)</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Completion % of PEP</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Given RIG (ERIG / HRIG)</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Transferred</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(doh?.cohort_by_category.rows ?? []).map((row) => (
                <TableRow key={row.category} hover>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 700, fontSize: 12.5 }}>
                    Category {row.category}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{row.cases}</TableCell>
                  <TableCell align="right">{row.given_pep}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: row.no_administration_recorded > 0 ? 'var(--bc-red-strong)' : 'inherit',
                      fontWeight: row.no_administration_recorded > 0 ? 700 : 400,
                    }}
                  >
                    {row.no_administration_recorded}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--bc-green-strong)' }}>
                    {row.completed}
                  </TableCell>
                  <TableCell align="right">{formatPct(row.completed, row.given_pep)}</TableCell>
                  <TableCell align="right">{`${row.given_rig} (${row.erig} / ${row.hrig})`}</TableCell>
                  <TableCell align="right">{row.transferred}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Collapsible Disclosure for Detailed Cross-Form Bridge, Unresolved Review Aging & Documentation Gaps */}
      <details className="bc-disclosure">
        <summary>
          <span>
            Cross-Form Denominator Bridge, Overdue Workload &amp; Documentation Quality Details
            {doh?.data_quality_and_aging ? ` (${doh.data_quality_and_aging.unresolved_review_age_buckets.total} Unresolved Reviews)` : ''}
          </span>
          <span style={{ fontSize: 12, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>Click to expand</span>
        </summary>
        <div className="bc-disclosure-body">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 1.75, mb: 1.75 }}>
            <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
                Form 2 &amp; Form 3 Biologics &amp; Course Detail
              </Typography>
              <DohStatLine
                label="Completed – No PEP Required"
                value={doh?.pep_and_biologics.explicit_no_pep ?? 0}
                hint="Vaccination: Not applicable"
              />
              <DohStatLine
                label="Transferred / Referred"
                value={doh?.completion_and_outcomes.transferred_referred ?? 0}
                hint={`${doh?.data_quality_and_aging?.documentation_gaps.external_treatment_unverified ?? 0} external unverified`}
              />
              <DohStatLine label="RIG Indicated (Clinician)" value={doh?.pep_and_biologics.rig_indicated ?? 0} />
              <DohStatLine
                label="Given RIG (ERIG / HRIG)"
                value={`${givenRigCount} (${doh?.pep_and_biologics.erig ?? 0} / ${doh?.pep_and_biologics.hrig ?? 0})`}
              />
              <DohStatLine
                label="RIG Indicated Without Admin Record"
                value={doh?.pep_and_biologics.rig_unverified ?? 0}
              />
              <DohStatLine
                label="Mature Cohort Completed / Total Mature Courses"
                value={`${completedMatureTotal} / ${doh?.completion_and_outcomes.matured_courses ?? 0}`}
              />
              <DohStatLine
                label="Active / Immature Courses (Still in Window)"
                value={doh?.completion_and_outcomes.immature_courses ?? 0}
              />
            </Paper>

            <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
                DOH Cross-Form Denominator Bridge &amp; Overdue Workload
              </Typography>
              {doh?.reconciliation_bridge && (
                <Box sx={{ mb: 1.25 }}>
                  <DohStatLine
                    label="Form 1 Exposure Registry Total"
                    value={doh.reconciliation_bridge.form_1_exposure_registry.recorded_episodes}
                    hint={`${doh.reconciliation_bridge.form_1_exposure_registry.unknown_exposure_date_episodes} unknown date`}
                  />
                  <DohStatLine
                    label="Form 2 Monthly Categorized (I–III)"
                    value={doh.reconciliation_bridge.form_2_abtc_monthly.assessed_categorized_total}
                    hint={`${doh.reconciliation_bridge.form_2_abtc_monthly.excluded_unassessed} awaiting + ${doh.reconciliation_bridge.form_2_abtc_monthly.excluded_category_missing} cat missing`}
                  />
                  <DohStatLine
                    label="Form 3 D0 Cohort Mature Completion"
                    value={`${doh.reconciliation_bridge.form_3_quarterly_cohort.d0_completed_mature_courses} / ${doh.reconciliation_bridge.form_3_quarterly_cohort.d0_mature_started_courses}`}
                    hint={
                      doh.reconciliation_bridge.form_3_quarterly_cohort.d0_completion_rate_pct !== null
                        ? `${doh.reconciliation_bridge.form_3_quarterly_cohort.d0_completion_rate_pct}%`
                        : 'N/A'
                    }
                  />
                </Box>
              )}

              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mt: 0.5, mb: 0.5 }}>
                Current Overdue Follow-Up Workload (Distinct Counts)
              </Typography>
              <DohStatLine label="Overdue Exposure Episodes" value={overdueEpisodesCount} />
              <DohStatLine label="Overdue Distinct Patients" value={overduePatientsCount} />
              <DohStatLine label="Overdue Active Courses" value={overdueCoursesCount} />
              <DohStatLine label="Outstanding Overdue Dose Slots" value={outstandingDoseSlotsCount} />
            </Paper>
          </Box>

          {doh?.data_quality_and_aging && (
            <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
                Unresolved Review Aging &amp; Expected Pending vs. Documentation Gaps
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                {[
                  { key: 'unresolved_review_0_7_days', label: `0–7 Days: ${doh.data_quality_and_aging.unresolved_review_age_buckets['0_7_days']}` },
                  { key: 'unresolved_review_8_30_days', label: `8–30 Days: ${doh.data_quality_and_aging.unresolved_review_age_buckets['8_30_days']}` },
                  { key: 'unresolved_review_over_30_days', label: `>30 Days: ${doh.data_quality_and_aging.unresolved_review_age_buckets.over_30_days}` },
                  { key: 'unresolved_review', label: `All Unresolved Reviews: ${doh.data_quality_and_aging.unresolved_review_age_buckets.total}` },
                ].map((chip) => {
                  const isOver30Alert =
                    chip.key.includes('over_30') &&
                    doh.data_quality_and_aging!.unresolved_review_age_buckets.over_30_days > 0;
                  return (
                    <Chip
                      key={chip.key}
                      size="small"
                      label={chip.label}
                      clickable
                      onClick={() => onDrillDownFilter({ status: chip.key })}
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        bgcolor: isOver30Alert ? 'var(--bc-danger-bg)' : 'var(--bc-amber-bg)',
                        color: isOver30Alert ? 'var(--bc-red-strong)' : 'var(--bc-amber-strong)',
                      }}
                    />
                  );
                })}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 0.4 }}>
                    Expected Pending (Normal Care Progression)
                  </Typography>
                  <DohStatLine label="Form 1 Awaiting Doctor Assessment" value={doh.data_quality_and_aging.expected_pending.awaiting_assessment} />
                  <DohStatLine label="Form 2 PEP Prescribed – Awaiting Initiation" value={doh.data_quality_and_aging.expected_pending.awaiting_treatment_initiation} />
                  <DohStatLine label="Active Courses Within D28 Window" value={doh.data_quality_and_aging.expected_pending.immature_active_courses} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 0.4 }}>
                    Documentation Gaps (Needs Review)
                  </Typography>
                  <DohStatLine label="Provisional / Unknown Exposure Date" value={doh.data_quality_and_aging.documentation_gaps.unknown_exposure_date} />
                  <DohStatLine label="Assessed Without WHO Category" value={doh.data_quality_and_aging.documentation_gaps.assessed_category_missing} />
                  <DohStatLine label="Finalized Without Treatment Decision" value={doh.data_quality_and_aging.documentation_gaps.decision_missing} />
                  <DohStatLine label="RIG Indicated Without Admin Evidence" value={doh.data_quality_and_aging.documentation_gaps.rig_indicated_no_verified_admin} />
                  <DohStatLine label="Transfers Without External Proof" value={doh.data_quality_and_aging.documentation_gaps.external_treatment_unverified} />
                  <DohStatLine label="Unknown Exposure Location" value={doh.data_quality_and_aging.documentation_gaps.unknown_exposure_location} />
                </Box>
              </Box>
            </Paper>
          )}
        </div>
      </details>
    </Box>
  );
}
