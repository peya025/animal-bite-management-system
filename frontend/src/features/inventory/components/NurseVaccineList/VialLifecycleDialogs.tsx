import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  DeleteOutlined as DisposeIcon,
  EventBusy as ExpireIcon,
  ScienceOutlined as VialIcon,
} from '@mui/icons-material';
import { formatDate, formatTime } from '../../../../shared/utils';
import {
  disposeVialRecord,
  getVialDetail,
  markVialExpired,
  type VaccineVialDetail,
} from '../../services/vaccineInventoryService';

const WASTAGE_REASON_PRESETS = [
  'Passed open-vial use-by time',
  'End of clinic session',
  'Cold chain excursion',
  'Contaminated / damaged vial',
];

function formatDateTimeDisplay(value?: string | null): string {
  if (!value) return '—';
  const datePart = formatDate(value);
  const timePart = formatTime(value);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

function getLocalDateTimeInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function getVialStatusMeta(status: VaccineVialDetail['effective_status']) {
  switch (status) {
    case 'opened':
      return { label: 'Open / Available', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' };
    case 'depleted':
      return { label: 'Fully Administered', bg: '#f0fdf4', color: '#15803d', border: '#86efac' };
    case 'expired':
      return { label: 'Expired · Pending Disposal', bg: '#fffbeb', color: '#b45309', border: '#fcd34d' };
    case 'disposed':
      return { label: 'Disposed / Wastage Recorded', bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' };
    default:
      return { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
}

interface VialDetailDialogProps {
  open: boolean;
  vialId: number | null;
  initialVial?: VaccineVialDetail | null;
  canManageVials: boolean;
  onClose: () => void;
  onRequestExpire: (vial: VaccineVialDetail) => void;
  onRequestDispose: (vial: VaccineVialDetail) => void;
}

export function VialDetailDialog({
  open,
  vialId,
  initialVial,
  canManageVials,
  onClose,
  onRequestExpire,
  onRequestDispose,
}: VialDetailDialogProps) {
  const [vial, setVial] = useState<VaccineVialDetail | null>(initialVial || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !vialId) {
      return;
    }
    setVial(initialVial || null);
    setError('');
    setLoading(true);
    void (async () => {
      try {
        const detail = await getVialDetail(vialId);
        setVial(detail);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load vial details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, vialId, initialVial]);

  const statusMeta = vial ? getVialStatusMeta(vial.effective_status) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VialIcon sx={{ color: '#0284c7' }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
              {vial ? `Vial ${vial.vial_code} · ${vial.vaccine_type}` : 'Vial Details'}
            </Typography>
            {vial && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Batch #{vial.batch_number} · Stock deducted once when opened
              </Typography>
            )}
          </Box>
        </Box>
        {statusMeta && (
          <Chip
            label={statusMeta.label}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: 11,
              bgcolor: statusMeta.bg,
              color: statusMeta.color,
              border: `1px solid ${statusMeta.border}`,
            }}
          />
        )}
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {vial && (
          <Stack spacing={2.25}>
            <Alert
              severity={
                vial.effective_status === 'disposed'
                  ? 'error'
                  : vial.effective_status === 'expired'
                  ? 'warning'
                  : vial.effective_status === 'depleted'
                  ? 'success'
                  : 'info'
              }
              sx={{ fontWeight: 600 }}
            >
              {vial.summary_text}
            </Alert>

            {vial.effective_status === 'expired' && vial.undisposed_portions > 0 && (
              <Alert severity="warning" variant="outlined">
                This vial is expired/unavailable and cannot be used for patient administrations.{' '}
                <strong>{vial.undisposed_portions}</strong> unused portion(s) still require physical disposal confirmation.
              </Alert>
            )}

            <Grid container spacing={1.5}>
              {[
                { label: 'Vial Capacity', value: `${vial.total_portions} portions` },
                { label: 'Administered', value: `${vial.administered_portions}` },
                { label: 'Available', value: `${vial.available_portions}` },
                { label: 'Discarded', value: `${vial.discarded_portions}` },
              ].map((stat) => (
                <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
                  <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>
                      {stat.label}
                    </Typography>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, mt: 0.25 }}>
                      {stat.value}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
                Vial Lifecycle &amp; Rules
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Opened At</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {formatDateTimeDisplay(vial.opened_at)}
                    {vial.opened_by_name ? ` · ${vial.opened_by_name}` : ''}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    Applicable Use-By Time {vial.open_vial_hours ? `(${vial.open_vial_hours}h rule)` : ''}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {vial.use_by_at ? formatDateTimeDisplay(vial.use_by_at) : 'Single-use / immediate'}
                  </Typography>
                </Grid>
                {vial.expired_at && (
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography sx={{ fontSize: 11.5, color: '#b45309', fontWeight: 700 }}>
                      Marked Expired / Unavailable
                    </Typography>
                    <Typography sx={{ fontSize: 12.5 }}>
                      {formatDateTimeDisplay(vial.expired_at)}
                      {vial.expired_by_name ? ` by ${vial.expired_by_name}` : ''}
                      {vial.expired_reason ? ` — ${vial.expired_reason}` : ''}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
                Linked Patient Administrations
              </Typography>
              {loading && !vial.administrations ? (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <CircularProgress size={22} />
                </Box>
              ) : vial.administrations && vial.administrations.length > 0 ? (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Portion</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Patient</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Treatment / Route</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Administered At</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Staff</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vial.administrations.map((adm) => (
                        <TableRow key={adm.treatment_id}>
                          <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>
                            Portion {adm.vial_portion_number || 1} of {vial.total_portions}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {adm.patient_name}
                            {adm.case_number ? ` (${adm.case_number})` : ''}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {adm.dose_label} · {adm.route}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {formatDateTimeDisplay(adm.administered_at || adm.treatment_date)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{adm.administered_by_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  No patient administrations linked to this vial yet.
                </Typography>
              )}
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
                Disposal &amp; Wastage Log
              </Typography>
              {vial.wastages && vial.wastages.length > 0 ? (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Discarded Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Wastage Reason</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Disposed At</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Recorded By</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vial.wastages.map((w) => (
                        <TableRow key={w.wastage_id}>
                          <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                            {w.portions_discarded} {w.portions_discarded === 1 ? 'portion' : 'portions'}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{w.reason}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{formatDateTimeDisplay(w.disposed_at)}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{w.disposed_by_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  No physical disposal recorded for this vial.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canManageVials && vial && vial.effective_status === 'opened' && vial.undisposed_portions > 0 && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ExpireIcon />}
              onClick={() => onRequestExpire(vial)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Mark Expired / Unavailable
            </Button>
          )}
          {canManageVials && vial && !vial.is_disposed && vial.undisposed_portions > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DisposeIcon />}
              onClick={() => onRequestDispose(vial)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Record Disposal
            </Button>
          )}
        </Box>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ExpireVialDialogProps {
  open: boolean;
  vial: VaccineVialDetail | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function ExpireVialDialog({ open, vial, onClose, onSuccess }: ExpireVialDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open, vial?.vial_id]);

  const handleConfirm = async () => {
    if (!vial) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await markVialExpired(vial.vial_id, reason);
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark vial expired / unavailable.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
        Mark Vial Expired / Unavailable
      </DialogTitle>
      <DialogContent dividers>
        {vial && (
          <Stack spacing={1.75}>
            <Typography sx={{ fontSize: 13 }}>
              Vial <strong>{vial.vial_code}</strong> ({vial.vaccine_type}, Batch #{vial.batch_number}) has{' '}
              <strong>{vial.undisposed_portions}</strong> unused portion(s).
            </Typography>
            <Alert severity="info">
              Marking this vial expired/unavailable blocks further patient use immediately without deducting additional stock. Physical disposal must still be recorded separately.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Reason (optional)"
              placeholder="e.g., Passed open-vial use-by time"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleConfirm}
          disabled={submitting}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {submitting ? 'Saving…' : 'Mark Expired / Unavailable'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface DisposeVialDialogProps {
  open: boolean;
  vial: VaccineVialDetail | null;
  staffName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function DisposeVialDialog({ open, vial, staffName, onClose, onSuccess }: DisposeVialDialogProps) {
  const [portionsDiscarded, setPortionsDiscarded] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [disposedAt, setDisposedAt] = useState(getLocalDateTimeInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && vial) {
      setPortionsDiscarded(Math.max(1, vial.undisposed_portions));
      setReason(vial.expired_reason || '');
      setDisposedAt(getLocalDateTimeInputValue());
      setError('');
    }
  }, [open, vial]);

  const maxPortions = vial ? Math.max(1, vial.undisposed_portions) : 1;

  const handleConfirm = async () => {
    if (!vial) return;
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please enter a wastage reason (at least 3 characters).');
      return;
    }
    if (portionsDiscarded < 1 || portionsDiscarded > maxPortions) {
      setError(`Discarded portions must be between 1 and ${maxPortions}.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await disposeVialRecord(vial.vial_id, {
        portions_discarded: portionsDiscarded,
        reason: reason.trim(),
        disposed_at: disposedAt ? new Date(disposedAt).toISOString() : undefined,
      });
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.portions_discarded?.[0] ||
          err.response?.data?.errors?.reason?.[0] ||
          'Failed to record disposal.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
        Record Physical Vial Disposal
      </DialogTitle>
      <DialogContent dividers>
        {vial && (
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                Vial {vial.vial_code} · {vial.vaccine_type} (Batch #{vial.batch_number})
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                {vial.administered_portions} of {vial.total_portions} portions administered ·{' '}
                <strong>{vial.undisposed_portions}</strong> unused portion(s) remaining. Recording disposal logs wastage without deducting another sealed vial from stock.
              </Typography>
            </Paper>

            {error && <Alert severity="error">{error}</Alert>}

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="Portions Discarded"
                  type="number"
                  value={portionsDiscarded}
                  onChange={(e) => setPortionsDiscarded(Math.max(1, Number(e.target.value)))}
                  slotProps={{ htmlInput: { min: 1, max: maxPortions } }}
                  fullWidth
                  size="small"
                  helperText={`Max remaining: ${maxPortions}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TextField
                  label="Disposal Time"
                  type="datetime-local"
                  value={disposedAt}
                  onChange={(e) => setDisposedAt(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>

            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
                Quick wastage reasons
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {WASTAGE_REASON_PRESETS.map((preset) => (
                  <Chip
                    key={preset}
                    label={preset}
                    size="small"
                    clickable
                    onClick={() => setReason(preset)}
                    color={reason === preset ? 'error' : 'default'}
                    variant={reason === preset ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              label="Wastage Reason"
              required
              placeholder="Explain why unused portions are being discarded…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />

            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Recording Staff: <strong>{staffName}</strong>
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={submitting}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {submitting ? 'Recording…' : 'Confirm Physical Disposal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
