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
import { BITE_CASE_STATUS_LABELS } from '../utils/biteCaseUtils';
import type { CaseSummary, PrivacyMode } from '../types/biteCasesSummary.types';
import { BC_BORDER, DohStatLine, SemanticChip } from './BiteCasesSharedUi';

interface BiteCasesEpisodesTabProps {
  cases: CaseSummary[];
  loading: boolean;
  hasData: boolean;
  privacyMode: PrivacyMode;
  onSwitchToInternalMode: () => void;
  onExportCasesCsv: () => void;
}

export function BiteCasesEpisodesTab({
  cases,
  loading,
  hasData,
  privacyMode,
  onSwitchToInternalMode,
  onExportCasesCsv,
}: BiteCasesEpisodesTabProps) {
  const [selectedCase, setSelectedCase] = useState<CaseSummary | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

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
              All Recorded Exposure Episodes (Form 1, Form 2 &amp; Form 3)
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
              Includes patients whose encounter stopped at Form 1 or Form 2, keeping unknown/pending fields explicit. Click any episode to inspect full stage evidence.
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
          aria-labelledby="cases-table-caption"
        >
          <Table size="small" stickyHeader>
            <caption id="cases-table-caption" className="bc-table-caption">
              Authorized clinical drill-down of recorded exposure episodes with Form 1 exposure details, Form 2 assessment decision, Form 3 vaccine/RIG administration, and follow-up age.
            </caption>
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
                        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                          {c.age !== null && c.age !== undefined ? `${c.age}y` : 'Age Unk'} • {c.gender || 'Unknown'}
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
                      <TableCell sx={{ minWidth: 110 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PetsOutlined aria-hidden="true" sx={{ fontSize: 14, color: 'var(--bc-text-secondary)' }} />
                          <Typography sx={{ fontSize: 12.5, textTransform: 'capitalize', fontWeight: 600 }}>
                            {c.animal_type || 'Unknown'}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', textTransform: 'capitalize' }}>
                          {c.animal_status || 'unassessed'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 175 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-text)' }}>
                          {c.stage_label || BITE_CASE_STATUS_LABELS[c.status] || c.status}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                          {c.what_can_be_reported || '—'}
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
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                          {c.rig_given && c.rig_given !== 'None' ? `Given: ${c.rig_given}` : 'Given: None'}
                        </Typography>
                        {c.rig_indicated && c.rig_indicated !== 'None' && (
                          <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
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
                  <DohStatLine label="Exposure Date" value={selectedCase.bite_date || 'Unknown'} />
                  <DohStatLine label="Normalized Barangay" value={selectedCase.normalized_barangay || selectedCase.location} />
                  <DohStatLine label="Raw Location" value={selectedCase.location} />
                  <DohStatLine label="Biting Animal" value={selectedCase.animal_type || 'Unknown'} />
                  <DohStatLine label="Animal Status" value={selectedCase.animal_status || 'Unassessed'} />
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
