import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../services/api';
import { useAuth } from '../../shared/contexts/AuthContext';
import { AdvisoryPatientPreview, type AdvisoryType } from './AdvisoryPatientPreview';

export interface Advisory {
  id: number;
  author_id: number;
  version: number;
  state: string;
  advisory_type?: AdvisoryType;
  title: string;
  body: string;
  expires_on: string;
  source_authority?: string | null;
  source_reference?: string | null;
  source_issued_on?: string | null;
  source_geography_note?: string | null;
  scheduled_for?: string | null;
}

interface HistoryEvent {
  version: number;
  action: string;
  reason: string | null;
  created_at: string;
}

export function AdvisoryReviewPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const { user } = useAuth();
  const isDoctor = user?.role !== 'developer' && !!user?.roles?.some(role => role.slug === 'doctor');
  const allowed = user?.role === 'admin' || isDoctor;
  const [items, setItems] = useState<Advisory[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Advisory | null>(null);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sourceVerified, setSourceVerified] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);

  const load = async () => {
    setError('');
    try {
      const { data } = await api.get<{ data: Advisory[]; last_page: number }>('/community-advisories', { params: { page } });
      setItems(data.data);
      setLastPage(data.last_page);
    } catch {
      setError('Unable to load surveillance advisory drafts. Refresh to try again.');
    }
  };

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    api.get<{ data: Advisory[]; last_page: number }>('/community-advisories', { params: { page } })
      .then(({ data }) => {
        if (active) {
          setItems(data.data);
          setLastPage(data.last_page);
        }
      })
      .catch(() => {
        if (active) setError('Unable to load surveillance advisory drafts.');
      });
    return () => {
      active = false;
    };
  }, [allowed, page, refreshKey]);

  if (!allowed) return null;

  const isOfficial = (selected?.advisory_type ?? 'community_awareness') === 'official_health_advisory';

  const contentPayload = (item: Advisory) => {
    const type: AdvisoryType = item.advisory_type ?? 'community_awareness';
    const base = {
      advisory_type: type,
      title: item.title,
      body: item.body,
      expires_on: item.expires_on,
    };
    if (type !== 'official_health_advisory') return base;
    return {
      ...base,
      source_authority: item.source_authority ?? '',
      source_reference: item.source_reference ?? '',
      source_issued_on: item.source_issued_on ?? '',
      source_geography_note: item.source_geography_note ?? '',
    };
  };

  const run = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/community-advisories/${selected.id}/${action}`, {
        version: selected.version,
        reason: reason || undefined,
        ...(action === 'approve' ? { review_confirmed: confirmed, ...(isOfficial ? { source_verified: sourceVerified } : {}) } : {}),
        ...(action === 'schedule' ? { scheduled_for: scheduledFor } : {}),
        ...(action === 'edit' ? contentPayload(selected) : {}),
      });
      setSelected(null);
      await load();
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message || 'The action failed. Refresh before retrying.');
    } finally {
      setBusy(false);
    }
  };

  const choose = (item: Advisory, next: string) => {
    setSelected({ ...item, advisory_type: item.advisory_type ?? 'community_awareness' });
    setAction(next);
    setReason('');
    setConfirmed(false);
    setSourceVerified(false);
    setScheduledFor('');
    setError('');
  };

  const confirmDisabled =
    busy ||
    (action === 'approve' && (!confirmed || (isOfficial && !sourceVerified))) ||
    (action === 'schedule' && !scheduledFor) ||
    (['return', 'withdraw'].includes(action) && !reason.trim());

  // Stay compact when no surveillance-originated advisory drafts exist.
  if (!items.length && !error && page === 1) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.75, my: 1, border: '1px dashed #cbd5e1', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          No surveillance advisory drafts pending review. Drafts created from verified Surveillance Insights will appear here for independent doctor approval.
        </Typography>
        <Button size="small" onClick={load} disabled={busy}>Refresh</Button>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">Surveillance advisory review queue</Typography>
        <Button onClick={load} disabled={busy}>Refresh drafts</Button>
      </Box>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Independent doctor approval is required before publishing surveillance-driven advisories. General clinic notices remain in Announcements.
      </Typography>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {items.map(item => (
        <Box key={item.id} sx={{ borderTop: '1px solid #ddd', py: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
          <Typography variant="body2">
            {item.state} · {(item.advisory_type ?? 'community_awareness').replace(/_/g, ' ')} · Revision {item.version} · Valid through {item.expires_on} (Manila)
            {item.state === 'scheduled' && item.scheduled_for ? ` · Scheduled for ${item.scheduled_for}` : ''}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', my: 1 }}>{item.body}</Typography>
          {item.advisory_type === 'official_health_advisory' && (
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#334155' }}>
              Official source: {item.source_authority} ({item.source_issued_on}) · {item.source_reference} · {item.source_geography_note}
            </Typography>
          )}
          {item.state === 'draft' && (
            <>
              {Number(user?.id) === item.author_id && <Button onClick={() => choose(item, 'edit')}>Edit draft</Button>}
              <Button onClick={() => choose(item, 'submit')}>Submit for review</Button>
            </>
          )}
          {item.state === 'submitted' && isDoctor && Number(user?.id) !== item.author_id && (
            <>
              <Button onClick={() => choose(item, 'approve')}>Review and approve</Button>
              <Button onClick={() => choose(item, 'return')}>Return for changes</Button>
            </>
          )}
          {item.state === 'approved' && user?.role === 'admin' && (
            <>
              <Button onClick={() => choose(item, 'publish')}>Publish approved advisory</Button>
              <Button onClick={() => choose(item, 'schedule')}>Schedule publication</Button>
            </>
          )}
          {['scheduled', 'published'].includes(item.state) && (
            <Button onClick={() => choose(item, 'withdraw')}>Withdraw</Button>
          )}
          <Button
            onClick={async () => {
              try {
                const { data } = await api.get<{ data: HistoryEvent[] }>(`/community-advisories/${item.id}/history`);
                setHistory(data.data);
              } catch {
                setError('Unable to load review history.');
              }
            }}
          >
            Recent history
          </Button>
        </Box>
      ))}
      <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <Button disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</Button>

      <Dialog open={!!selected} onClose={() => !busy && setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {action === 'approve'
            ? 'Review the patient-facing content'
            : action === 'schedule'
              ? 'Schedule approved publication'
              : `Confirm ${action}`}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {action === 'edit' && selected && (
            <>
              <TextField
                select
                fullWidth
                margin="dense"
                label="Advisory type"
                value={selected.advisory_type ?? 'community_awareness'}
                onChange={e => setSelected(v => v && { ...v, advisory_type: e.target.value as AdvisoryType })}
              >
                <MenuItem value="community_awareness">Community awareness</MenuItem>
                <MenuItem value="routine_education">Routine education</MenuItem>
                <MenuItem value="official_health_advisory">Official health advisory</MenuItem>
              </TextField>
              <TextField
                fullWidth
                margin="dense"
                label="Title"
                value={selected.title}
                onChange={e => setSelected(v => v && { ...v, title: e.target.value })}
              />
              <TextField
                fullWidth
                margin="dense"
                multiline
                minRows={4}
                label="Patient-facing guidance"
                value={selected.body}
                onChange={e => setSelected(v => v && { ...v, body: e.target.value })}
              />
              <TextField
                fullWidth
                margin="dense"
                type="date"
                label="Valid through (Manila)"
                slotProps={{ inputLabel: { shrink: true } }}
                value={selected.expires_on}
                onChange={e => setSelected(v => v && { ...v, expires_on: e.target.value })}
              />
              {isOfficial && (
                <>
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    label="Official authority name"
                    value={selected.source_authority ?? ''}
                    onChange={e => setSelected(v => v && { ...v, source_authority: e.target.value })}
                  />
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    label="Official reference or HTTPS URL"
                    value={selected.source_reference ?? ''}
                    onChange={e => setSelected(v => v && { ...v, source_reference: e.target.value })}
                  />
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    type="date"
                    label="Official issue date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={selected.source_issued_on ?? ''}
                    onChange={e => setSelected(v => v && { ...v, source_issued_on: e.target.value })}
                  />
                  <TextField
                    required
                    fullWidth
                    margin="dense"
                    label="Geographical relevance note"
                    value={selected.source_geography_note ?? ''}
                    onChange={e => setSelected(v => v && { ...v, source_geography_note: e.target.value })}
                  />
                </>
              )}
            </>
          )}

          {selected && <AdvisoryPatientPreview advisory={selected} />}

          {action === 'schedule' && (
            <TextField
              required
              fullWidth
              margin="dense"
              type="datetime-local"
              label="Publish at (Asia/Manila)"
              slotProps={{ inputLabel: { shrink: true } }}
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
            />
          )}

          {action === 'approve' && (
            <>
              <FormControlLabel
                control={<Checkbox checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />}
                label="I reviewed the evidence, wording, validity and disclosure risk. This contains no patient details or unsupported rabies/outbreak claims."
              />
              {isOfficial && (
                <FormControlLabel
                  control={<Checkbox checked={sourceVerified} onChange={e => setSourceVerified(e.target.checked)} />}
                  label="I verified the official authority, reference, issue date, and local geographical relevance."
                />
              )}
            </>
          )}

          {['return', 'withdraw'].includes(action) && (
            <TextField
              required
              fullWidth
              margin="dense"
              label="Reason (internal only)"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setSelected(null)}>Cancel</Button>
          <Button disabled={confirmDisabled} onClick={run}>Confirm {action}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={history !== null} onClose={() => setHistory(null)}>
        <DialogTitle>Recent review history</DialogTitle>
        <DialogContent>
          {history?.map(event => (
            <Typography key={event.version}>
              Revision {event.version}: {event.action} · {event.created_at} {event.reason && `— ${event.reason}`}
            </Typography>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistory(null)}>Close</Button></DialogActions>
      </Dialog>
    </Paper>
  );
}
