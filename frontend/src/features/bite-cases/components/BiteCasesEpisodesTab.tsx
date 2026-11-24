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
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined,
  CloseOutlined,
  FileDownloadOutlined,
  LockOutlined,
  OpenInNewOutlined,
  PetsOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import { useState, useMemo, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { BITE_CASE_STATUS_LABELS, formatAnimalConditionLabel, formatAnimalOwnershipLabel } from '../utils/biteCaseUtils';
import { BITE_SUMMARY_AGE_GROUPS } from '../types/biteCasesSummary.types';
import type { CaseSummary, PrivacyMode } from '../types/biteCasesSummary.types';
import { BC_BORDER, DohStatLine, SemanticChip } from './BiteCasesSharedUi';

interface BiteCasesEpisodesTabProps {
  cases: CaseSummary[];
  loading: boolean;
  hasData: boolean;
  privacyMode: PrivacyMode;
  onSwitchToInternalMode: () => void;
  onExportCasesCsv: () => void;
  onCaseUpdated?: () => void;
  onNotify?: (msg: string) => void;
}

export function BiteCasesEpisodesTab({
  cases,
  loading,
  hasData,
  privacyMode,
  onSwitchToInternalMode,
  onExportCasesCsv,
  onCaseUpdated,
  onNotify,
}: BiteCasesEpisodesTabProps) {
  const { user } = useAuth();
  const canLogObservation = ['admin', 'developer', 'triage', 'doctor', 'treatment', 'nurse'].includes(user?.role ?? '');
  const [selectedCase, setSelectedCase] = useState<CaseSummary | null>(null);
  const [savingObs, setSavingObs] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleLogAnimalObservation = async (status: 'healthy' | 'sick' | 'died' | 'unknown') => {
    if (!selectedCase) return;
    setSavingObs(true);
    try {
      await api.patch(`/cases/${selectedCase.bite_id}/animal-observation`, {
        animal_observation_status: status,
      });
      setSelectedCase((prev) =>
        prev
          ? {
              ...prev,
              animal_condition: status,
              animal_observation_date: new Date().toISOString().slice(0, 10),
              animal_observation_due: false,
            }
          : null
      );
      onNotify?.(`Updated 14-day animal observation for ${selectedCase.case_number} to "${status}".`);
      onCaseUpdated?.();
    } catch {
      onNotify?.('Unable to update animal observation status.');
    } finally {
      setSavingObs(false);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [cases.length]);

  const displayedCases = useMemo(() => {
    if (cases.length <= rowsPerPage) return cases;
    return cases.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [cases, page, rowsPerPage]);

  if (privacyMode === 'aggregate_only') {
    return (
      <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 3, textAlign: 'center' }}>
        <LockOutlined aria-hidden="true" sx={{ fontSize: 34, color: 'var(--bc-amber-strong)', mb: 1 }} />
        <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: 'var(--bc-text)', mb: 0.5 }}>
          Conference / Aggregate-Only Privacy Mode Active
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'var(--bc-text-secondary)', maxWidth: 620, mx: 'auto', mb: 1.75 }}>
          Identifiable patient records (names, case numbers, and individual episode rows) are omitted during public or conference presentations to protect patient confidentiality. All DOH counts, 5-stage journey figures, and barangay summaries remain visible in the first three tabs.
        </Typography>
        <Button
          variant="contained"
          disableElevation
          startIcon={<VisibilityOutlined aria-hidden="true" />}
          onClick={onSwitchToInternalMode}
          sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 700, bgcolor: 'var(--bc-green-strong)' }}
        >
          Switch to Authorized Internal Detail Mode
        </Button>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', overflow: 'hidden' }}>
        <Box
          sx={{
            p: 1.5,
            borderBottom: BC_BORDER,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)' }}>
              All Recorded Exposure Episodes
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadOutlined aria-hidden="true" />}
            data-walkthrough="bite-cases-export-csv"
            data-tour="bite-cases-export-csv"
            onClick={onExportCasesCsv}
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
          >
            Export CSV
          </Button>
        </Box>

        <TableContainer
          className="bc-table-scroll-region"
          tabIndex={0}
          role="region"
          aria-label="All Recorded Exposure Episodes"
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Case # &amp; Patient</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Exposure Date &amp; Barangay</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Animal</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Last Completed Stage</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Category</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Treatment Decision</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Administration &amp; Course</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>RIG</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Follow-Up / Review Age</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Inspect</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !hasData ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ py: 4, textAlign: 'center' }}>
                    Loading exposure episodes…
                  </TableCell>
                </TableRow>
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ py: 4, textAlign: 'center', color: 'var(--bc-text-secondary)' }}>
                    No exposure episodes match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                displayedCases.map((c) => {
                  const doseProgress =
                    c.required_doses_count && c.required_doses_count > 0
                      ? ` (${c.completed_doses_count ?? 0}/${c.required_doses_count} doses)`
                      : '';
                  return (
                    <TableRow key={c.bite_id} hover>
                      <TableCell component="th" scope="row" sx={{ minWidth: 165 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)' }}>
                          {c.case_number}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'var(--bc-text-2)' }}>
                          {c.patient_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)', mt: 0.2 }}>
                          <Box component="span" sx={{ fontWeight: 600, color: 'var(--bc-text-2)' }}>
                            {c.age !== null && c.age !== undefined ? `Age: ${c.age} yrs` : 'Age: Not recorded'}
                          </Box>
                          {' • '}
                          {c.gender || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 145 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{c.bite_date || 'Unknown'}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>
                          {c.normalized_barangay && c.normalized_barangay.toLowerCase() !== 'unknown'
                            ? c.normalized_barangay
                            : c.location && c.location.toLowerCase() !== 'unknown'
                              ? c.location
                              : (
                                <Box component="span" sx={{ color: 'var(--bc-amber-strong)', fontWeight: 600, fontStyle: 'italic' }}>
                                  Place not recorded
                                </Box>
                              )}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PetsOutlined aria-hidden="true" sx={{ fontSize: 14, color: 'var(--bc-text-secondary)' }} />
                          <Typography sx={{ fontSize: 12.5, textTransform: 'capitalize', fontWeight: 600 }}>
                            {c.animal_type_detail === 'not_recorded'
                              ? 'Not recorded'
                              : c.animal_type || 'Unknown'}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                          {formatAnimalOwnershipLabel(c.animal_ownership ?? c.animal_status)} · {formatAnimalConditionLabel(c.animal_condition)}
                        </Typography>
                        {c.animal_observation_badge && (
                          <Chip
                            size="small"
                            label={c.animal_observation_badge}
                            sx={{
                              mt: 0.4,
                              height: 19,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor:
                                c.animal_observation_policy === 'high_risk_full_pep'
                                  ? 'var(--bc-danger-bg)'
                                  : c.animal_observation_policy === 'day14_check_due'
                                    ? 'var(--bc-amber-bg)'
                                    : c.animal_observation_policy === 'md_discontinuation_review'
                                      ? 'var(--bc-success-bg)'
                                      : 'var(--bc-surface-3)',
                              color:
                                c.animal_observation_policy === 'high_risk_full_pep'
                                  ? 'var(--bc-red-strong)'
                                  : c.animal_observation_policy === 'day14_check_due'
                                    ? 'var(--bc-amber-strong)'
                                    : c.animal_observation_policy === 'md_discontinuation_review'
                                      ? 'var(--bc-green-strong)'
                                      : 'var(--bc-text-secondary)',
                              border:
                                c.animal_observation_policy === 'high_risk_full_pep'
                                  ? '1px solid var(--bc-danger-border)'
                                  : c.animal_observation_policy === 'day14_check_due'
                                    ? '1px solid var(--bc-amber-border)'
                                    : 'none',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)' }}>
                          {c.stage_label || BITE_CASE_STATUS_LABELS[c.status] || c.status}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <SemanticChip label={c.category || 'Not yet assessed'} />
                      </TableCell>
                      <TableCell>
                        <SemanticChip label={c.treatment_decision_display || 'Not yet determined'} />
                      </TableCell>
                      <TableCell sx={{ minWidth: 185 }}>
                        <SemanticChip
                          label={`${c.administration_display || c.vaccination_display || '—'}${doseProgress}`}
                        />
                        {c.external_treatment_display && c.external_treatment_display !== 'Not applicable' && (
                          <Typography sx={{ fontSize: 11, color: 'var(--bc-amber-strong)', mt: 0.35 }}>
                            External: {c.external_treatment_display}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {c.rig_pending ? (
                          <Chip
                            size="small"
                            label={
                              c.rig_pending_hours !== null && c.rig_pending_hours !== undefined && c.rig_pending_hours <= 48
                                ? `RIG PENDING (${c.rig_pending_hours}h)`
                                : 'RIG PENDING'
                            }
                            sx={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              height: 22,
                              bgcolor: 'var(--bc-danger-bg)',
                              color: 'var(--bc-red-strong)',
                              border: '1px solid var(--bc-danger-border)',
                            }}
                          />
                        ) : c.rig_given && c.rig_given !== 'None' ? (
                          <Chip
                            size="small"
                            label={`RIG: ${c.rig_given}`}
                            sx={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              height: 22,
                              bgcolor: 'var(--bc-success-bg)',
                              color: 'var(--bc-green-strong)',
                              border: '1px solid var(--bc-success-border)',
                            }}
                          />
                        ) : c.category === 'III' && c.encounter_disposition === 'transferred_referred' ? (
                          <Chip
                            size="small"
                            label="RIG REFERRED"
                            sx={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              height: 22,
                              bgcolor: 'var(--bc-amber-bg)',
                              color: 'var(--bc-amber-strong)',
                              border: '1px solid var(--bc-amber-border)',
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                            None
                          </Typography>
                        )}
                        {c.rig_indicated && c.rig_indicated !== 'None' && !c.rig_pending && (
                          <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
                            Indicated: {c.rig_indicated}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        {c.is_overdue ? (
                          <Chip
                            size="small"
                            label={`Overdue ${c.overdue_dose || ''} (${c.days_overdue ?? 0}d)`}
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: 'var(--bc-danger-bg)',
                              color: 'var(--bc-red-strong)',
                            }}
                          />
                        ) : c.course_outcome === 'completed' || c.status === 'completed_no_pep' ? (
                          <Chip
                            size="small"
                            icon={<CheckCircleOutlined aria-hidden="true" sx={{ fontSize: 14 }} />}
                            label="On Track / Done"
                            sx={{ fontSize: 11, fontWeight: 600, bgcolor: 'var(--bc-success-bg)', color: 'var(--bc-green-strong)' }}
                          />
                        ) : c.is_unresolved_review && c.review_age_days !== null && c.review_age_days !== undefined ? (
                          <Chip
                            size="small"
                            label={`Awaiting · ${c.review_age_days}d`}
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: c.review_age_bucket === 'over_30_days' ? 'var(--bc-danger-bg)' : 'var(--bc-amber-bg)',
                              color: c.review_age_bucket === 'over_30_days' ? 'var(--bc-red-strong)' : 'var(--bc-amber-strong)',
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                            {c.vaccination_display || 'Pending'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          endIcon={<OpenInNewOutlined aria-hidden="true" sx={{ fontSize: 13 }} />}
                          onClick={() => setSelectedCase(c)}
                          sx={{ textTransform: 'none', fontSize: 11.5, fontWeight: 600 }}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {cases.length > 10 && (
          <TablePagination
            component="div"
            count={cases.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderTop: BC_BORDER }}
          />
        )}
      </Paper>

      {/* Episode Inspection Modal (BCS-05.3) */}
      <Dialog
        open={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        maxWidth="md"
        fullWidth
        aria-labelledby="bc-episode-dialog-title"
      >
        {selectedCase && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box>
                <Typography id="bc-episode-dialog-title" variant="h6" sx={{ fontWeight: 800, color: 'var(--bc-text)' }}>
                  {selectedCase.case_number} — {selectedCase.patient_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--bc-text-secondary)' }}>
                  {selectedCase.age !== null && selectedCase.age !== undefined ? `${selectedCase.age} yrs` : 'Age Unknown'} • {selectedCase.gender || 'Sex Unknown'} • Barangay: {selectedCase.normalized_barangay || selectedCase.location}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedCase(null)} aria-label="Close episode inspection dialog">
                <CloseOutlined aria-hidden="true" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Alert severity="info" sx={{ mb: 1.75, fontSize: 12.5 }}>
                <strong>Last Completed Stage:</strong> {selectedCase.stage_label || selectedCase.last_completed_stage || selectedCase.status}.{' '}
                <strong>What Can Be Reported:</strong> {selectedCase.what_can_be_reported || 'Recorded registration and clinical state.'}
                {selectedCase.is_unresolved_review && selectedCase.review_age_days !== null && selectedCase.review_age_days !== undefined
                  ? ` Unresolved review age as of cutoff: ${selectedCase.review_age_days} day(s).`
                  : ''}
              </Alert>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                <Paper elevation={0} sx={{ p: 1.25, border: BC_BORDER, borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'var(--bc-green-strong)', mb: 0.75 }}>
                    Form 1: Registration &amp; Exposure
                  </Typography>
                  <DohStatLine
                    label="Age at Exposure"
                    value={
                      selectedCase.age !== null && selectedCase.age !== undefined
                        ? (() => {
                            const matched = BITE_SUMMARY_AGE_GROUPS.find((g) => g.key === selectedCase.age_group);
                            return matched ? `${selectedCase.age} yrs (${matched.label})` : `${selectedCase.age} yrs`;
                          })()
                        : 'Not recorded'
                    }
                  />
                  <DohStatLine label="Exposure Date" value={selectedCase.bite_date || 'Unknown'} />
                  <DohStatLine label="Normalized Barangay" value={selectedCase.normalized_barangay || selectedCase.location} />
                  <DohStatLine label="Raw Location" value={selectedCase.location} />
                  <DohStatLine
                    label="Biting Animal"
                    value={selectedCase.animal_type_detail === 'not_recorded' ? 'Not recorded' : selectedCase.animal_type || 'Unknown'}
                  />
                  <DohStatLine
                    label="Animal Ownership"
                    value={formatAnimalOwnershipLabel(selectedCase.animal_ownership ?? selectedCase.animal_status)}
                  />
                  <DohStatLine
                    label="Animal Condition"
                    value={formatAnimalConditionLabel(selectedCase.animal_condition)}
                  />
                </Paper>

                <Paper elevation={0} sx={{ p: 1.25, border: BC_BORDER, borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'var(--bc-focus-ring)', mb: 0.75 }}>
                    Form 2: Doctor Assessment
                  </Typography>
                  <DohStatLine label="WHO Category" value={selectedCase.category || 'Not yet assessed'} />
                  <DohStatLine label="Treatment Decision" value={selectedCase.treatment_decision_display || 'Not yet determined'} />
                  <DohStatLine label="Disposition" value={selectedCase.encounter_disposition || 'Pending'} />
                  <DohStatLine label="RIG Indicated" value={selectedCase.rig_indicated || 'None'} />
                </Paper>

                <Paper elevation={0} sx={{ p: 1.25, border: BC_BORDER, borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'var(--bc-amber-strong)', mb: 0.75 }}>
                    Form 3: Administration &amp; Outcome
                  </Typography>
                  <DohStatLine label="Vaccine Admin" value={selectedCase.administration_display || 'No administration recorded'} />
                  <DohStatLine
                    label="Doses Recorded"
                    value={
                      selectedCase.required_doses_count
                        ? `${selectedCase.completed_doses_count ?? 0} / ${selectedCase.required_doses_count}`
                        : 'Not applicable / Pending'
                    }
                  />
                  <DohStatLine label="RIG Given" value={selectedCase.rig_given || 'None'} />
                  <DohStatLine label="Course / Vaccination" value={selectedCase.vaccination_display || selectedCase.course_outcome || 'Pending'} />
                  <DohStatLine label="External Care" value={selectedCase.external_treatment_display || 'Not applicable'} />
                </Paper>
              </Box>

              {selectedCase.rig_pending && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Alert severity="error" sx={{ fontSize: 12.5 }}>
                    <strong>RIG Pending (Category III / Indicated):</strong> No verified ERIG/HRIG administration recorded yet
                    {selectedCase.rig_pending_hours !== null && selectedCase.rig_pending_hours !== undefined
                      ? ` (${selectedCase.rig_pending_hours} hour(s) elapsed${selectedCase.rig_pending_hours <= 48 ? ' — within critical 48h window' : ''}).`
                      : '.'}
                  </Alert>
                </>
              )}

              {/* 14-Day Animal Observation Tracker & DOH Decision Support */}
              <Divider sx={{ my: 1.5 }} />
              <Paper elevation={0} sx={{ p: 1.35, border: BC_BORDER, borderRadius: '8px', bgcolor: 'var(--bc-surface-2)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
                  <Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'var(--bc-text)' }}>
                      14-Day Biting Animal Observation Tracking
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>
                      {selectedCase.animal_observation_badge || 'Standard monitoring'}
                      {selectedCase.animal_observation_date ? ` · Last checked: ${selectedCase.animal_observation_date}` : ''}
                    </Typography>
                  </Box>
                  {canLogObservation && (
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      {(['healthy', 'sick', 'died', 'unknown'] as const).map((st) => {
                        const isCurrent = (selectedCase.animal_condition || '').toLowerCase() === st;
                        return (
                          <Button
                            key={st}
                            size="small"
                            disabled={savingObs}
                            variant={isCurrent ? 'contained' : 'outlined'}
                            disableElevation
                            onClick={() => void handleLogAnimalObservation(st)}
                            sx={{
                              textTransform: 'capitalize',
                              fontSize: 11.5,
                              fontWeight: 700,
                              minWidth: 64,
                              py: 0.35,
                              borderRadius: '6px',
                              ...(st === 'died'
                                ? {
                                    borderColor: '#dc2626',
                                    color: isCurrent ? '#fff' : '#dc2626',
                                    bgcolor: isCurrent ? '#dc2626' : 'transparent',
                                  }
                                : st === 'sick'
                                  ? {
                                      borderColor: '#d97706',
                                      color: isCurrent ? '#fff' : '#d97706',
                                      bgcolor: isCurrent ? '#d97706' : 'transparent',
                                    }
                                  : st === 'healthy'
                                    ? {
                                        borderColor: '#059669',
                                        color: isCurrent ? '#fff' : '#059669',
                                        bgcolor: isCurrent ? '#059669' : 'transparent',
                                      }
                                    : {
                                        borderColor: '#94a3b8',
                                        color: isCurrent ? '#fff' : '#475569',
                                        bgcolor: isCurrent ? '#475569' : 'transparent',
                                      }),
                            }}
                          >
                            {st}
                          </Button>
                        );
                      })}
                    </Box>
                  )}
                </Box>

                {selectedCase.animal_observation_policy === 'md_discontinuation_review' && (
                  <Alert severity="success" sx={{ mt: 0.75, fontSize: 12 }}>
                    <strong>DOH Day-14 Clinical Note (Owned/Domestic Animal Healthy):</strong> Implicated domestic animal verified healthy at Day 14+. Attending physician may review PEP discontinuation / conversion to PrEP per DOH NRPCP guidelines.
                  </Alert>
                )}
                {selectedCase.animal_observation_policy === 'full_pep_required' && (
                  <Alert severity="info" sx={{ mt: 0.75, fontSize: 12 }}>
                    <strong>Stray / Unobservable Animal:</strong> Complete the full prescribed PEP course. Do <strong>not</strong> discontinue early based on animal observation.
                  </Alert>
                )}
                {selectedCase.animal_observation_policy === 'high_risk_full_pep' && (
                  <Alert severity="error" sx={{ mt: 0.75, fontSize: 12 }}>
                    <strong>High-Risk Animal (Died / Sick):</strong> Verify mandatory full PEP completion and Category III RIG administration; coordinate veterinary reporting with MAO/PVO.
                  </Alert>
                )}
              </Paper>

              {selectedCase.is_overdue && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Alert severity="warning" sx={{ fontSize: 12.5 }}>
                    Overdue scheduled dose: <strong>{selectedCase.overdue_dose || 'Follow-up'}</strong> ({selectedCase.days_overdue ?? 0} days overdue; {selectedCase.outstanding_dose_slot_count ?? 1} outstanding dose slot(s)).
                  </Alert>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedCase(null)} variant="contained" disableElevation sx={{ textTransform: 'none' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
