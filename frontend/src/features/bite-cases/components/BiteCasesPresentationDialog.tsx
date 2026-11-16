import React, { useState, useEffect } from 'react';
import { Dialog, Box, Typography, Button, Chip } from '@mui/material';
import {
  ChevronLeftOutlined,
  ChevronRightOutlined,
  CloseOutlined,
  PrintOutlined,
  SlideshowOutlined,
  VerifiedUserOutlined,
} from '@mui/icons-material';
import type { DashboardData, ReportActionItem } from '../types/biteCasesSummary.types';
import { formatPct } from '../types/biteCasesSummary.types';

interface BiteCasesPresentationDialogProps {
  open: boolean;
  onClose: () => void;
  data: DashboardData;
  actions: ReportActionItem[];
  periodLabel: string;
  cutoffDate: string;
  onPrintPack: () => void;
}

const SLIDE_TITLES = [
  '1. Situation Overview',
  '2. Exposure Profile',
  '3. Geographic Distribution',
  '4. Treatment & Follow-up',
  '5. Service Workload & Quality',
  '6. Action Plan & Review',
];

export const BiteCasesPresentationDialog: React.FC<BiteCasesPresentationDialogProps> = ({
  open,
  onClose,
  data,
  actions,
  periodLabel,
  cutoffDate,
  onPrintPack,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setSlideIdx((prev) => Math.min(SLIDE_TITLES.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setSlideIdx((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const doh = data.doh_summary;
  const pep = doh?.pep_and_biologics;
  const cats = doh?.categories;
  const demo = doh?.demographics;
  const animals = doh?.animals;
  const stageMatrix = doh?.stage_matrix || [];
  const recordedTotal = pep?.recorded_exposures ?? data.summary.total_cases ?? 0;
  const assessedTotal = pep?.finalized_assessments ?? 0;
  const awaitingAssessment = pep?.awaiting_assessment ?? data.summary.awaiting_assessment ?? 0;
  const pepPrescribed = pep?.pep_prescribed ?? data.summary.pep_prescribed ?? 0;
  const givenPep = pep?.given_pep ?? data.summary.verified_vaccine_initiation ?? 0;
  const noAdminRecorded = pep?.no_administration_recorded ?? data.summary.no_administration_recorded ?? 0;
  const matureCourses = doh?.completion_and_outcomes?.matured_courses ?? 0;
  const completedMature = doh?.completion_and_outcomes?.completed_total ?? data.summary.completed ?? 0;
  const d0CompletionRate = doh?.reconciliation_bridge?.form_3_quarterly_cohort?.d0_completion_rate_pct;
  const completionPct =
    d0CompletionRate !== null && d0CompletionRate !== undefined
      ? `${d0CompletionRate}%`
      : formatPct(completedMature, matureCourses);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="bc-presentation-dialog-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '14px',
            minHeight: '640px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--bc-surface)',
            border: '1px solid var(--bc-border)',
          },
        },
      }}
    >
      {/* Top Presentation Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid var(--bc-border)',
          bgcolor: 'var(--bc-surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SlideshowOutlined sx={{ fontSize: 22, color: 'var(--bc-green-strong)' }} />
          <Box>
            <Typography
              id="bc-presentation-dialog-title"
              component="h2"
              sx={{ fontSize: 17, fontWeight: 800, color: 'var(--bc-text)', lineHeight: 1.2 }}
            >
              Bite Cases Summary — Conference &amp; Program Review Deck
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>
              Scope: {periodLabel} • Outcome Cutoff: {cutoffDate} • Aggregate-Only Projection (Zero Patient Identifiers)
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            size="small"
            icon={<VerifiedUserOutlined sx={{ fontSize: 14 }} />}
            label={
              data.snapshot
                ? `${data.snapshot.snapshot_code} (${data.snapshot.status.toUpperCase()})`
                : 'Live Review Draft'
            }
            sx={{
              fontWeight: 700,
              fontSize: 11.5,
              bgcolor: 'var(--bc-info-bg)',
              color: 'var(--bc-info-text)',
              border: '1px solid var(--bc-info-border)',
            }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintOutlined sx={{ fontSize: 15 }} />}
            onClick={onPrintPack}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12 }}
          >
            Print A4 Pack
          </Button>
          <button
            type="button"
            aria-label="Close presentation mode"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--bc-border)',
              background: 'var(--bc-surface)',
              color: 'var(--bc-text)',
              cursor: 'pointer',
            }}
          >
            <CloseOutlined sx={{ fontSize: 18 }} />
          </button>
        </Box>
      </Box>

      {/* Slide Step Tabs */}
      <Box
        sx={{
          px: 3,
          py: 1,
          borderBottom: '1px solid var(--bc-border)',
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          bgcolor: 'var(--bc-surface)',
        }}
      >
        {SLIDE_TITLES.map((title, idx) => {
          const active = idx === slideIdx;
          return (
            <button
              key={title}
              type="button"
              onClick={() => setSlideIdx(idx)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: active ? '1px solid var(--bc-green-strong)' : '1px solid transparent',
                background: active ? 'var(--bc-green-strong)' : 'transparent',
                color: active ? '#ffffff' : 'var(--bc-text-secondary)',
                fontWeight: active ? 800 : 600,
                fontSize: 12.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </button>
          );
        })}
      </Box>

      {/* Main Slide Content */}
      <Box sx={{ p: 3.5, flex: 1, overflowY: 'auto' }}>
        {/* SLIDE 1: SITUATION OVERVIEW */}
        {slideIdx === 0 && (
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
              Screen 1: Situation Overview &amp; Headline Indicators
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'var(--bc-text-secondary)', mb: 2.5 }}>
              Summary of recorded exposure episodes, finalized assessments, verified PEP initiation, and mature cohort completion.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2.5, borderRadius: '10px', border: '1px solid var(--bc-border)', bgcolor: 'var(--bc-surface-alt)' }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'var(--bc-text-secondary)', textTransform: 'uppercase' }}>
                  1. Recorded Exposures
                </Typography>
                <Typography sx={{ fontSize: 38, fontWeight: 900, color: 'var(--bc-text)', my: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {recordedTotal}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>
                  Assessed: <strong>{assessedTotal}</strong> • Awaiting Form 2: <strong>{awaitingAssessment}</strong>
                </Typography>
              </Box>

              <Box sx={{ p: 2.5, borderRadius: '10px', border: '1px solid var(--bc-border)', bgcolor: 'var(--bc-surface-alt)' }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'var(--bc-text-secondary)', textTransform: 'uppercase' }}>
                  2. Category III Severe
                </Typography>
                <Typography sx={{ fontSize: 38, fontWeight: 900, color: 'var(--bc-red)', my: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {cats?.III ?? 0}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>
                  {formatPct(cats?.III ?? 0, cats?.categorized_total ?? 0)} of <strong>{cats?.categorized_total ?? 0}</strong> categorized
                </Typography>
              </Box>

              <Box sx={{ p: 2.5, borderRadius: '10px', border: '1px solid var(--bc-border)', bgcolor: 'var(--bc-surface-alt)' }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'var(--bc-text-secondary)', textTransform: 'uppercase' }}>
                  3. PEP Started (Given PEP)
                </Typography>
                <Typography sx={{ fontSize: 38, fontWeight: 900, color: 'var(--bc-green-strong)', my: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {givenPep}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>
                  Of <strong>{pepPrescribed}</strong> prescribed • <strong>{noAdminRecorded}</strong> no admin recorded
                </Typography>
              </Box>

              <Box sx={{ p: 2.5, borderRadius: '10px', border: '1px solid var(--bc-border)', bgcolor: 'var(--bc-surface-alt)' }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'var(--bc-text-secondary)', textTransform: 'uppercase' }}>
                  4. PEP Completion (Mature)
                </Typography>
                <Typography sx={{ fontSize: 38, fontWeight: 900, color: 'var(--bc-green)', my: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {completionPct}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>
                  <strong>{completedMature}</strong> of <strong>{matureCourses}</strong> mature courses completed
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                p: 2.5,
                borderRadius: '10px',
                border: '1px solid var(--bc-info-border)',
                bgcolor: 'var(--bc-info-bg)',
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'var(--bc-info-text)', textTransform: 'uppercase', mb: 0.75 }}>
                Meeting Narrative Statement
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--bc-text)', lineHeight: 1.6 }}>
                “{doh?.meeting_narrative || `Of ${recordedTotal} recorded exposure episodes, ${assessedTotal} had a completed doctor assessment and ${awaitingAssessment} were awaiting assessment.`}”
              </Typography>
            </Box>
          </Box>
        )}

        {/* SLIDE 2: EXPOSURE PROFILE */}
        {slideIdx === 1 && (
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
              Screen 2: Exposure Profile — Categories, Animal Source &amp; Demographics
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'var(--bc-text-secondary)', mb: 2.5 }}>
              Assessed WHO Categories I–III are separated from unassessed episodes. Missing fields are shown explicitly.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <Box sx={{ p: 2.5, borderRadius: '10px', border: '1px solid var(--bc-border)' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)', mb: 1.5 }}>
                  WHO Exposure Categories (Assessed vs Pending)
                </Typography>
                {[
                  { label: 'Category I (No Risk / Touching)', count: cats?.I ?? 0, den: cats?.categorized_total ?? 0, color: 'var(--bc-green)' },
                  { label: 'Category II (Minor Scratches / Abrasions)', count: cats?.II ?? 0, den: cats?.categorized_total ?? 0, color: 'var(--bc-amber)' },
                  { label: 'Category III (Transdermal / Mucous Membrane)', count: cats?.III ?? 0, den: cats?.categorized_total ?? 0, color: 'var(--bc-red)' },
                  { label: 'Not Yet Assessed (Stopped at Form 1)', count: cats?.not_yet_assessed ?? awaitingAssessment, den: recordedTotal, color: 'var(--bc-text-muted)' },
                ].map((item) => (
                  <Box key={item.label} sx={{ mb: 1.75 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'var(--bc-text)' }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'var(--bc-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {item.count} ({formatPct(item.count, item.den)})
                      </Typography>
                    </Box>
                    <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'var(--bc-surface-alt)', overflow: 'hidden', border: '1px solid var(--bc-border)' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${item.den > 0 ? Math.min(100, (item.count / item.den) * 100) : 0}%`,
                          bgcolor: item.color,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box sx={{ p: 2.5, borderRadius: '10px', border: '1px solid var(--bc-border)' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)', mb: 1.5 }}>
                  Biting Animal &amp; Patient Demographics (N = {recordedTotal})
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'var(--bc-surface-alt)' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>Dog vs Cat</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-text)' }}>
                      {animals?.dog ?? 0} Dogs / {animals?.cat ?? 0} Cats
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                      Other: {animals?.other ?? 0} • Unknown: {animals?.unknown ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'var(--bc-surface-alt)' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>Animal Ownership</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-text)' }}>
                      {animals?.stray ?? 0} Stray / {animals?.owned ?? 0} Owned
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                      Unknown status: {animals?.animal_status_unknown ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'var(--bc-surface-alt)' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>Age Distribution</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-text)' }}>
                      {demo?.age_below_15 ?? 0} Children (&lt;15y)
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                      Adults (&ge;15y): {demo?.age_15_above ?? 0} • Unknown: {demo?.age_unknown ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'var(--bc-surface-alt)' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>Sex Distribution</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-text)' }}>
                      {demo?.male ?? 0} Male / {demo?.female ?? 0} Female
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                      Sex Not Recorded: {demo?.unknown_sex ?? 0}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* SLIDE 3: GEOGRAPHIC DISTRIBUTION */}
        {slideIdx === 2 && (
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
              Screen 3: Geographic Distribution by Place of Exposure
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'var(--bc-text-secondary)', mb: 2.5 }}>
              Normalized barangay counts based on place of exposure. Cells with &lt;5 cases are suppressed in Conference Mode.
            </Typography>

            <Box sx={{ borderRadius: '10px', border: '1px solid var(--bc-border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bc-surface-alt)', borderBottom: '1px solid var(--bc-border)' }}>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800 }}>Barangay</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800 }}>Scope</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Recorded Cases</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Cat III Severe</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Given PEP</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>No Admin Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.locations || []).slice(0, 10).map((loc) => {
                    const suppressed = Boolean(loc.is_small_cell_suppressed);
                    return (
                      <tr key={loc.location} style={{ borderBottom: '1px solid var(--bc-border)' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13.5, fontWeight: 700 }}>{loc.normalized_barangay || loc.location}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
                          {loc.geography_scope === 'service_area' ? 'Service Area' : loc.geography_scope === 'outside_jurisdiction' ? 'Outside' : 'Unmapped'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13.5, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {suppressed ? (loc.display_total_cases || '<5') : loc.total_cases}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {suppressed ? '<5' : loc.cat_3}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {suppressed ? '<5' : (loc.given_pep ?? 0)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {suppressed ? '<5' : (loc.no_administration_recorded ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {/* SLIDE 4: TREATMENT & FOLLOW-UP */}
        {slideIdx === 3 && (
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
              Screen 4: Treatment Initiation, Biologics &amp; Cohort Completion
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'var(--bc-text-secondary)', mb: 2.5 }}>
              Treatment measures are calculated only from their valid clinical denominator. Patients awaiting Form 2 assessment are never counted as PEP dropouts.
            </Typography>

            <Box sx={{ borderRadius: '10px', border: '1px solid var(--bc-border)', overflow: 'hidden', mb: 2.5 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bc-surface-alt)', borderBottom: '1px solid var(--bc-border)' }}>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800 }}>Category</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Assessed Cases</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Given PEP</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Completed (Mature)</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Given RIG (ERIG / HRIG)</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>No Admin Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {(doh?.cohort_by_category?.rows || []).map((row) => (
                    <tr key={row.category} style={{ borderBottom: '1px solid var(--bc-border)' }}>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800 }}>Category {row.category}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{row.cases}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{row.given_pep}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{row.completed}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, textAlign: 'right' }}>
                        {row.given_rig} ({row.erig} ERIG / {row.hrig} HRIG)
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, textAlign: 'right' }}>
                        {row.no_administration_recorded}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {/* SLIDE 5: SERVICE WORKLOAD & QUALITY */}
        {slideIdx === 4 && (
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
              Screen 5: Service Workload, 5-Stage Journey &amp; Data Completeness
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'var(--bc-text-secondary)', mb: 2.5 }}>
              Every registered exposure episode is accounted for across the 5 clinical stages (Form 1, Form 2, Form 3).
            </Typography>

            <Box sx={{ borderRadius: '10px', border: '1px solid var(--bc-border)', overflow: 'hidden', mb: 2.5 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bc-surface-alt)', borderBottom: '1px solid var(--bc-border)' }}>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800 }}>Patient’s Last Completed Stage</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>Episodes</th>
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800 }}>How Missing Information Is Shown</th>
                  </tr>
                </thead>
                <tbody>
                  {stageMatrix.map((row) => (
                    <tr key={row.stage_key} style={{ borderBottom: '1px solid var(--bc-border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13.5, fontWeight: 700 }}>{row.stage}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {row.count}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>{row.missing_info_display}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {/* SLIDE 6: ACTION PLAN */}
        {slideIdx === 5 && (
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
              Screen 6: Findings &amp; Action Register
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'var(--bc-text-secondary)', mb: 2 }}>
              Evidence-based descriptive findings and tracked program actions for clinic and LGU follow-up.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {(data.insights || []).map((insight) => (
                <Box
                  key={insight.finding_key}
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    border: '1px solid var(--bc-border)',
                    bgcolor: 'var(--bc-surface-alt)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)' }}>{insight.title}</Typography>
                    <Chip size="small" label={insight.supporting_metric} sx={{ fontWeight: 700, fontSize: 11.5 }} />
                  </Box>
                  <Typography sx={{ fontSize: 13, color: 'var(--bc-text)', mb: 0.5 }}>{insight.statement}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--bc-green-strong)', fontWeight: 700 }}>
                    Recommended Review: {insight.recommended_review}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)', mb: 1 }}>
              Tracked Action Register ({actions.length})
            </Typography>
            {actions.length === 0 ? (
              <Box sx={{ p: 2, borderRadius: '8px', border: '1px dashed var(--bc-border)', color: 'var(--bc-text-secondary)', fontSize: 13 }}>
                No action items recorded yet. Add action items in the “Planning &amp; Actions” tab.
              </Box>
            ) : (
              <Box sx={{ borderRadius: '10px', border: '1px solid var(--bc-border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bc-surface-alt)', borderBottom: '1px solid var(--bc-border)' }}>
                      <th style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 800 }}>Observed Pattern</th>
                      <th style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 800 }}>Proposed Action</th>
                      <th style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 800 }}>Owner &amp; Due</th>
                      <th style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 800 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((act) => (
                      <tr key={act.action_id} style={{ borderBottom: '1px solid var(--bc-border)' }}>
                        <td style={{ padding: '8px 12px', fontSize: 12.5 }}>{act.observed_pattern}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12.5, fontWeight: 700 }}>{act.proposed_action}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12 }}>
                          {act.owner_name || 'Unassigned'} {act.due_date ? `• ${act.due_date}` : ''}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                          {act.status.replace('_', ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Bottom Slide Navigation Bar */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderTop: '1px solid var(--bc-border)',
          bgcolor: 'var(--bc-surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>
          Screen {slideIdx + 1} of {SLIDE_TITLES.length} • Use Left/Right Arrow Keys to Navigate
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ChevronLeftOutlined sx={{ fontSize: 16 }} />}
            disabled={slideIdx === 0}
            onClick={() => setSlideIdx((prev) => Math.max(0, prev - 1))}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="contained"
            endIcon={<ChevronRightOutlined sx={{ fontSize: 16 }} />}
            disabled={slideIdx === SLIDE_TITLES.length - 1}
            onClick={() => setSlideIdx((prev) => Math.min(SLIDE_TITLES.length - 1, prev + 1))}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: 'var(--bc-green-strong)' }}
          >
            Next Screen
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};
