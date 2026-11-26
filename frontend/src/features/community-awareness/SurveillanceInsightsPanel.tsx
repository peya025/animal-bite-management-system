import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined,
  ExpandLess,
  ExpandMore,
  FactCheckOutlined,
  InfoOutlined,
  PlayArrowRounded,
  RefreshRounded,
} from '@mui/icons-material';
import api from '../../services/api';
import { AdvisoryPatientPreview, type AdvisoryType } from './AdvisoryPatientPreview';

type Signal = {
  id: number;
  version: number;
  state: string;
  priority: string;
  barangay: string;
  municipality: string;
  province: string;
  assigned_to: number | null;
  last_evaluated_cutoff: string;
  metrics: {
    current_count: number;
    baseline_count: number;
    ratio: number | null;
    baseline_adequate: boolean;
    awaiting_assessment: number;
    priority: string | null;
  };
};

type Result = {
  signals: { data: Signal[]; current_page: number; last_page: number };
  can_review: boolean;
  latest_run: null | {
    cutoff: string;
    stale: boolean;
    created_at: string;
    summary: {
      period: { start: string; end: string; baseline_start: string; baseline_end: string };
      exclusions: Record<string, number>;
      unknown_location_pct: number | null;
      possible_duplicate_groups: number;
      suspicious_count_change: boolean;
      baseline_adequate: boolean;
    };
  };
};

type Detail = { title: string; rows: string[]; url: string; page: number; lastPage: number };

const defaultExpiry = () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const STATE_LABELS: Record<string, string> = {
  new: 'Needs review',
  in_review: 'In review',
  verified: 'Verified',
  dismissed: 'Dismissed',
  resolved: 'Resolved',
};

const STATE_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  new: 'warning',
  in_review: 'info',
  verified: 'success',
  dismissed: 'default',
  resolved: 'default',
};

export function SurveillanceInsightsPanel({ onDraftCreated }: { onDraftCreated?: () => void }) {
  const [loaded, setLoaded] = useState<{ key: string; value: Result } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [reload, setReload] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState<Signal | null>(null);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [expiry, setExpiry] = useState('');
  const [draftType, setDraftType] = useState<AdvisoryType>('community_awareness');
  const [draftTitle, setDraftTitle] = useState('Community Bite Safety Update');
  const [sourceAuthority, setSourceAuthority] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [sourceIssuedOn, setSourceIssuedOn] = useState('');
  const [sourceGeoNote, setSourceGeoNote] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);

  const queryKey = `${page}|${filter}|${reload}`;
  const data = loaded?.key === queryKey ? loaded.value : null;

  useEffect(() => {
    let active = true;
    api
      .get<Result>('/reports/surveillance/signals', { params: { page, state: filter || undefined } })
      .then(({ data: result }) => {
        if (active) {
          setLoaded({ key: queryKey, value: result });
          setError('');
        }
      })
      .catch(() => {
        if (active) {
          setError('Surveillance is unavailable. This does not mean there are no reports.');
        }
      });
    return () => {
      active = false;
    };
  }, [page, filter, queryKey]);

  const failure = (err: unknown) => {
    const response = err as { response?: { status?: number; data?: { message?: string } } };
    if (response.response?.status === 429) {
      setError('Analysis was just run. Please wait a minute before running it again.');
      return;
    }
    setError(response.response?.data?.message || 'Unable to complete this action. Refresh and try again.');
  };

  const evaluate = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post('/reports/surveillance/evaluate');
      setReload(v => v + 1);
      setNotice('Completed 7-day bite case check updated.');
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
    }
  };

  const choose = (item: Signal, next: string) => {
    setSelected(item);
    setAction(next);
    setReason('');
    setExpiry(defaultExpiry());
    setDraftType('community_awareness');
    setDraftTitle('Community Bite Safety Update');
    setSourceAuthority('');
    setSourceReference('');
    setSourceIssuedOn('');
    setSourceGeoNote('');
    setError('');
  };

  const act = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (action === 'draft') {
        await api.post('/community-advisories', {
          advisory_type: draftType,
          title: draftTitle,
          body: reason,
          expires_on: expiry,
          ...(draftType === 'official_health_advisory'
            ? {
                source_authority: sourceAuthority,
                source_reference: sourceReference,
                source_issued_on: sourceIssuedOn,
                source_geography_note: sourceGeoNote,
              }
            : {}),
        });
        onDraftCreated?.();
        setNotice('Private advisory draft created and sent to the review queue below.');
      } else {
        await api.post(`/reports/surveillance/signals/${selected.id}/reviews`, {
          version: selected.version,
          action,
          reason,
        });
        setNotice('Signal review status updated.');
      }
      setSelected(null);
      setReload(v => v + 1);
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
    }
  };

  const showDetail = async (url: string, title: string, requestedPage = 1) => {
    try {
      const { data: response } = await api.get(url, { params: { page: requestedPage } });
      const result = response.cases ?? response;
      const rows = result.data.map(
        (row: { bite_id?: number; bite_date?: string; version?: number; action?: string; reason?: string }) =>
          row.bite_id
            ? `Incident #${row.bite_id} · Exposure date: ${row.bite_date}`
            : `Revision ${row.version}: ${row.action} · ${row.reason ?? 'Scheduled analysis'}`
      );
      setDetail({ title, rows, url, page: result.current_page, lastPage: result.last_page });
    } catch (err) {
      failure(err);
    }
  };

  const summary = data?.latest_run?.summary;
  const totalExcluded = Object.values(summary?.exclusions ?? {}).reduce((sum, count) => sum + count, 0);
  const isOfficialDraft = action === 'draft' && draftType === 'official_health_advisory';
  const draftIncomplete =
    action === 'draft' &&
    (!draftTitle.trim() ||
      !expiry ||
      (isOfficialDraft && (!sourceAuthority.trim() || !sourceReference.trim() || !sourceIssuedOn || !sourceGeoNote.trim())));

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, md: 2.5 }, my: 2, borderRadius: 2.5, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}
      aria-label="Surveillance Insights"
    >
      {/* Header & Plain-Language Purpose */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ maxWidth: 740 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <FactCheckOutlined sx={{ color: '#0f766e', fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>
              Surveillance Insights
            </Typography>
            <Chip size="small" label="Internal staff review" sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600 }} />
          </Box>
          <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
            Checks the last 7 completed days of bite cases for unusual clusters in any barangay so staff can verify records before deciding whether to draft a community safety advisory.
          </Typography>
        </Box>

        {/* Primary Controls */}
        {data && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="Review state"
              value={filter}
              onChange={e => {
                setFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All states</MenuItem>
              {['new', 'in_review', 'verified', 'dismissed', 'resolved'].map(state => (
                <MenuItem key={state} value={state}>
                  {STATE_LABELS[state] ?? state}
                </MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshRounded />}
              onClick={() => setReload(v => v + 1)}
              disabled={busy}
              sx={{ textTransform: 'none', borderColor: '#cbd5e1', color: '#334155' }}
            >
              Refresh signals
            </Button>
            {data.can_review && (
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrowRounded />}
                disabled={busy}
                onClick={evaluate}
                sx={{ textTransform: 'none', bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
              >
                Analyze completed days
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Simple 3-step workflow guide for new users */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          flexWrap: 'wrap',
          mt: 1.5,
          mb: 2,
          px: 1.5,
          py: 1,
          borderRadius: 1.5,
          bgcolor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <Typography variant="caption" sx={{ color: '#334155' }}>
          <strong>How it works:</strong> 1. Daily check flags barangays with 3+ cases (or 2+ Cat III) in 7 days → 2. Staff inspects records & verifies data → 3. If needed, draft an advisory for independent doctor approval.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {!data && !error && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Loading surveillance insights…
        </Typography>
      )}

      {data && (
        <>
          {!data.latest_run ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No completed analysis is available yet. Click <strong>Analyze completed days</strong> to run the first check.
            </Alert>
          ) : (
            <>
              {data.latest_run.stale && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  Analysis is stale. Click <strong>Analyze completed days</strong> before making a decision.
                </Alert>
              )}

              {/* Compact 3-metric summary strip */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 1.5,
                  mb: 1.5,
                }}
              >
                <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', bgcolor: '#fcfcfd' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    7-DAY CHECK WINDOW
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.25 }}>
                    {summary?.period.start} to {summary?.period.end}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated {new Date(data.latest_run.created_at).toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', bgcolor: '#fcfcfd' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    AREAS FLAGGED IN THIS VIEW
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.25 }}>
                    {data.signals.data.length} {data.signals.data.length === 1 ? 'area' : 'areas'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reviewing a signal never publishes publicly
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', bgcolor: '#fcfcfd' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      DATA QUALITY & RULES
                    </Typography>
                    <Button
                      size="small"
                      endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                      onClick={() => setShowDetails(v => !v)}
                      sx={{ textTransform: 'none', minWidth: 0, py: 0, fontSize: '0.75rem' }}
                    >
                      {showDetails ? 'Hide' : 'Details'}
                    </Button>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.25 }}>
                    {totalExcluded} excluded {totalExcluded === 1 ? 'record' : 'records'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Unknown location:{' '}
                    {summary?.unknown_location_pct == null ? 'Not available' : `${summary.unknown_location_pct}%`}
                  </Typography>
                </Box>
              </Box>

              {/* Important quality/data warnings stay visible when triggered */}
              {!summary?.baseline_adequate && (
                <Alert icon={<InfoOutlined fontSize="small" />} severity="info" sx={{ mb: 1.5, py: 0.25 }}>
                  Baseline coverage or location/date quality is incomplete. Ratio-based review is suppressed (absolute count rules still apply).
                </Alert>
              )}
              {!!summary?.possible_duplicate_groups && (
                <Alert severity="warning" sx={{ mb: 1.5, py: 0.25 }}>
                  {summary.possible_duplicate_groups} possible repeat-record groups need review. Separate exposures are not automatically merged.
                </Alert>
              )}
              {summary?.suspicious_count_change && (
                <Alert severity="warning" sx={{ mb: 1.5, py: 0.25 }}>
                  Recorded volume changed by at least 3 since the previous run. Check imports, corrections and reporting coverage before interpreting the change.
                </Alert>
              )}

              {/* Collapsible technical breakdown (keeps UI clean while preserving full transparency) */}
              <Collapse in={showDetails}>
                <Box
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: 1.5,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gap: 0.75,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    <strong>Comparison baseline:</strong> {summary?.period.baseline_start} to {summary?.period.baseline_end} (completed Manila days).
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Review thresholds:</strong> 3 recorded incidents or 2 finalized Category III exposures in 7 days; otherwise at least 2 incidents and 2× the preceding 30-day weekly average when baseline coverage is confirmed.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Excluded records breakdown:</strong>{' '}
                    {Object.entries(summary?.exclusions ?? {})
                      .map(([key, count]) => `${key.replaceAll('_', ' ')}: ${count}`)
                      .join(' · ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Note:</strong> Facility-recorded bite reports only — not an outbreak declaration or rabies diagnosis.
                  </Typography>
                </Box>
              </Collapse>
            </>
          )}

          {/* Signal list or calm empty state */}
          {!data.signals.data.length ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                px: 2,
                borderRadius: 2,
                border: '1px dashed #cbd5e1',
                bgcolor: '#f8fafc',
              }}
            >
              <CheckCircleOutlined sx={{ color: '#64748b', fontSize: 32, mb: 0.75 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                No review signals match this view.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                This is not a statement of community safety. New signals appear automatically whenever 7-day bite records cross review thresholds.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {data.signals.data.map(item => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, borderColor: '#cbd5e1', bgcolor: '#ffffff' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {item.barangay}, {item.municipality}, {item.province}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#334155', mt: 0.25 }}>
                        <strong>{item.metrics.current_count}</strong> unique incidents in 7 days ·{' '}
                        <strong>{item.metrics.baseline_count}</strong> in preceding 30 days · Ratio:{' '}
                        {item.metrics.ratio == null ? 'Unavailable' : `${item.metrics.ratio.toFixed(2)}× weekly baseline`}{' '}
                        · Awaiting assessment: {item.metrics.awaiting_assessment}
                      </Typography>
                      {!item.metrics.priority && (
                        <Typography variant="caption" color="text.secondary">
                          Currently below review threshold; retained for review history.
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        color={item.priority === 'priority_review' ? 'warning' : 'info'}
                        variant="outlined"
                        label={item.priority === 'priority_review' ? 'Priority review' : 'Trend for review'}
                      />
                      <Chip
                        size="small"
                        color={STATE_COLORS[item.state] ?? 'default'}
                        label={`${STATE_LABELS[item.state] ?? item.state.replaceAll('_', ' ')} · Rev ${item.version}`}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        showDetail(`/reports/surveillance/signals/${item.id}/evidence`, 'Current-window incident evidence')
                      }
                      sx={{ textTransform: 'none' }}
                    >
                      Review incident evidence
                    </Button>
                    <Button
                      size="small"
                      onClick={() => showDetail(`/reports/surveillance/signals/${item.id}/history`, 'Signal review history')}
                      sx={{ textTransform: 'none' }}
                    >
                      History
                    </Button>
                    {data.can_review && (
                      <>
                        {['new', 'in_review', 'verified'].includes(item.state) && (
                          <Button size="small" onClick={() => choose(item, 'assign')} sx={{ textTransform: 'none' }}>
                            Assign to me
                          </Button>
                        )}
                        {['new', 'in_review'].includes(item.state) && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => choose(item, 'verify')}
                              sx={{ textTransform: 'none', bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
                            >
                              Verify data
                            </Button>
                            <Button
                              size="small"
                              color="inherit"
                              onClick={() => choose(item, 'dismiss')}
                              sx={{ textTransform: 'none' }}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}
                        {['verified', 'dismissed', 'resolved'].includes(item.state) && (
                          <Button size="small" onClick={() => choose(item, 'reopen')} sx={{ textTransform: 'none' }}>
                            Reopen review
                          </Button>
                        )}
                        {item.state === 'verified' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => choose(item, 'draft')}
                            sx={{ textTransform: 'none' }}
                          >
                            Create private awareness draft
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {data.signals.last_page > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button size="small" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>
                Previous signals
              </Button>
              <Button size="small" disabled={page >= data.signals.last_page} onClick={() => setPage(v => v + 1)}>
                Next signals
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Action / Draft Dialog */}
      <Dialog open={!!selected} onClose={() => !busy && setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>{action === 'draft' ? 'Create a private awareness draft' : `Confirm ${action}`}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <Typography variant="body2" sx={{ mb: 1 }}>
            {selected?.barangay}, {selected?.municipality}. Verification means records were reviewed, not that rabies was confirmed.
          </Typography>
          {action === 'draft' && (
            <>
              <TextField
                select
                fullWidth
                margin="dense"
                label="Advisory type"
                value={draftType}
                onChange={e => setDraftType(e.target.value as AdvisoryType)}
              >
                <MenuItem value="community_awareness">Community awareness</MenuItem>
                <MenuItem value="routine_education">Routine education</MenuItem>
                <MenuItem value="official_health_advisory">Official health advisory</MenuItem>
              </TextField>
              <TextField
                fullWidth
                required
                margin="dense"
                label="Title"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
              />
            </>
          )}
          <TextField
            fullWidth
            required
            multiline
            minRows={3}
            margin="dense"
            label={action === 'draft' ? 'Patient-facing guidance (no identifying details)' : 'Review reason (internal only)'}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          {action === 'draft' && (
            <>
              <TextField
                fullWidth
                margin="dense"
                type="date"
                label="Valid through (Manila)"
                slotProps={{ inputLabel: { shrink: true } }}
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
              />
              {isOfficialDraft && (
                <>
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    label="Official authority name"
                    value={sourceAuthority}
                    onChange={e => setSourceAuthority(e.target.value)}
                  />
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    label="Official reference or HTTPS URL"
                    value={sourceReference}
                    onChange={e => setSourceReference(e.target.value)}
                  />
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    type="date"
                    label="Official issue date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={sourceIssuedOn}
                    onChange={e => setSourceIssuedOn(e.target.value)}
                  />
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    label="Geographical relevance note"
                    value={sourceGeoNote}
                    onChange={e => setSourceGeoNote(e.target.value)}
                  />
                </>
              )}
              <AdvisoryPatientPreview
                advisory={{
                  advisory_type: draftType,
                  state: 'draft',
                  title: draftTitle,
                  body: reason,
                  expires_on: expiry,
                  source_authority: sourceAuthority,
                  source_reference: sourceReference,
                  source_issued_on: sourceIssuedOn,
                  source_geography_note: sourceGeoNote,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                The draft requires independent doctor approval. It will not publish or send notifications.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setSelected(null)}>
            Cancel
          </Button>
          <Button disabled={busy || !reason.trim() || draftIncomplete} onClick={act}>
            Confirm {action}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Evidence / History Dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle>{detail?.title}</DialogTitle>
        <DialogContent>
          {detail?.rows.map((row, i) => (
            <Typography key={i} variant="body2" sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
              {row}
            </Typography>
          ))}
          {!detail?.rows.length && <Typography variant="body2">No accessible records on this page.</Typography>}
        </DialogContent>
        <DialogActions>
          {detail && detail.lastPage > 1 && (
            <>
              <Button disabled={detail.page <= 1} onClick={() => showDetail(detail.url, detail.title, detail.page - 1)}>
                Previous records
              </Button>
              <Button
                disabled={detail.page >= detail.lastPage}
                onClick={() => showDetail(detail.url, detail.title, detail.page + 1)}
              >
                Next records
              </Button>
            </>
          )}
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
