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
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined,
  ExpandLess,
  ExpandMore,
  PlayArrowRounded,
  VisibilityOutlined,
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
  verified: 'Ready to post',
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
      setNotice('Checked the last 7 days of bite records.');
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
    }
  };

  const choose = (item: Signal, next: string) => {
    setSelected(item);
    setAction(next);
    setExpiry(defaultExpiry());
    setDraftType('community_awareness');
    if (next === 'draft') {
      setDraftTitle(`Community Bite Safety Update — ${item.municipality}`);
      setReason(
        `The clinic has shared a bite-prevention reminder for the ${item.municipality} community. If bitten or scratched by an animal, wash the wound immediately with soap and running water for at least 15 minutes and visit the clinic for assessment.`
      );
    } else {
      setDraftTitle('Community Bite Safety Update');
      setReason('');
    }
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
        setNotice('Draft saved — submit it for doctor approval in the review queue below.');
      } else {
        await api.post(`/reports/surveillance/signals/${selected.id}/reviews`, {
          version: selected.version,
          action,
          reason,
        });
        setNotice(action === 'verify' ? 'Cases verified! You can now click Review & draft post.' : 'Signal updated.');
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
    <Box sx={{ my: 2 }} aria-label="Surveillance Insights">
      {/* Clean, minimal top bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
            Suggested Mobile Advisories
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Review flagged 7-day bite activity below before sharing a safety update to the mobile app.
          </Typography>
        </Box>

        {data && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="Filter"
              value={filter}
              onChange={e => {
                setFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 145, bgcolor: '#fff' }}
            >
              <MenuItem value="">All</MenuItem>
              {['new', 'in_review', 'verified', 'dismissed', 'resolved'].map(state => (
                <MenuItem key={state} value={state}>
                  {STATE_LABELS[state] ?? state}
                </MenuItem>
              ))}
            </TextField>
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

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {!data && !error && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
          Checking recent bite activity…
        </Typography>
      )}

      {data && (
        <>
          {/* Memory-style cards right up front */}
          {!data.signals.data.length ? (
            <Paper
              variant="outlined"
              sx={{
                textAlign: 'center',
                py: 5,
                px: 3,
                borderRadius: 3,
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
              }}
            >
              <CheckCircleOutlined sx={{ color: '#0f766e', fontSize: 36, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                No review signals match this view.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 460, mx: 'auto' }}>
                When a barangay records 3 or more bite cases in 7 days, a ready-to-review card will appear here so you can check the records and post a calm safety update to mobile. This is not a statement of community safety.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 2 }}>
              {data.signals.data.map(item => {
                const isVerified = item.state === 'verified';
                return (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      borderColor: isVerified ? '#99f6e4' : '#e2e8f0',
                      bgcolor: '#ffffff',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    }}
                  >
                    {/* Soft "Memories-style" highlight banner */}
                    <Box
                      sx={{
                        px: 2.5,
                        py: 2,
                        background: isVerified
                          ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)'
                          : 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.02rem', lineHeight: 1.3 }}>
                          Higher bite reports in {item.barangay}, {item.municipality}
                        </Typography>
                        <Chip
                          size="small"
                          color={STATE_COLORS[item.state] ?? 'default'}
                          label={STATE_LABELS[item.state] ?? item.state.replaceAll('_', ' ')}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
                        {item.barangay}, {item.municipality}, {item.province} ·{' '}
                        <strong>{item.metrics.current_count} cases</strong> in the last 7 days
                        {item.metrics.baseline_count > 0 ? ` (vs ${item.metrics.baseline_count} in prior 30 days)` : ''}
                      </Typography>
                    </Box>

                    {/* Quick post-preview teaser */}
                    <Box sx={{ px: 2.5, py: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block' }}>
                          Suggested mobile safety post
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem', mt: 0.25 }}>
                          “Community Bite Safety Update — {item.municipality}: Wash any animal bite wound immediately with soap and running water and visit the clinic for assessment.”
                        </Typography>
                      </Box>

                      {/* Simple Facebook-style action row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {data.can_review && ['new', 'in_review'].includes(item.state) && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => choose(item, 'verify')}
                              sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
                            >
                              Verify data
                            </Button>
                          )}
                          {data.can_review && isVerified && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => choose(item, 'draft')}
                              sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
                            >
                              Review &amp; draft post
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityOutlined sx={{ fontSize: 16 }} />}
                            onClick={() =>
                              showDetail(`/reports/surveillance/signals/${item.id}/evidence`, 'Current-window incident evidence')
                            }
                            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#cbd5e1', color: '#334155' }}
                          >
                            Review incident evidence
                          </Button>
                        </Box>

                        {data.can_review && ['new', 'in_review'].includes(item.state) && (
                          <Button size="small" color="inherit" onClick={() => choose(item, 'dismiss')} sx={{ textTransform: 'none', color: '#64748b' }}>
                            Dismiss
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
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

          {/* Quiet footer for technical details & data-quality notes (out of the way!) */}
          {data.latest_run && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Last checked {summary?.period.start} to {summary?.period.end} · {totalExcluded} excluded records
                  {!summary?.baseline_adequate && ' · Ratio-based review is suppressed (incomplete baseline)'}
                  {!!summary?.possible_duplicate_groups && ` · ${summary.possible_duplicate_groups} possible repeat-record groups`}
                  {data.latest_run.stale && ' · Stale — click Analyze completed days'}
                </Typography>
                <Button
                  size="small"
                  endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setShowDetails(v => !v)}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#64748b', minWidth: 0, py: 0 }}
                >
                  {showDetails ? 'Hide details' : 'Details'}
                </Button>
              </Box>
              <Collapse in={showDetails}>
                <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Updated:</strong> {new Date(data.latest_run.created_at).toLocaleString()} ·{' '}
                    <strong>Baseline:</strong> {summary?.period.baseline_start} to {summary?.period.baseline_end}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Exclusions:</strong>{' '}
                    {Object.entries(summary?.exclusions ?? {})
                      .map(([key, count]) => `${key.replaceAll('_', ' ')}: ${count}`)
                      .join(' · ')}{' '}
                    · Unknown location: {summary?.unknown_location_pct == null ? 'Not available' : `${summary.unknown_location_pct}%`}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          )}
        </>
      )}

      {/* Action / Draft Dialog */}
      <Dialog open={!!selected} onClose={() => !busy && setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>{action === 'draft' ? 'Review & draft mobile post' : `Confirm ${action}`}</DialogTitle>
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
                Requires independent doctor approval before publishing to the mobile app.
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
    </Box>
  );
}
