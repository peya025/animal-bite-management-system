import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import api from '../../../shared/services/api';
import type {
  RegistrationEncounterData,
  RegistrationFeeData,
  RegistrationFeeItemData,
  RegistrationFeePaymentData,
  FeeStatus,
} from '../../../types';

interface EncounterFeesViewProps {
  patientId: number;
  encounters?: RegistrationEncounterData[];
  canManagePayments?: boolean;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

function formatCurrency(val: string | number | null | undefined, cents?: number | null | undefined): string {
  if (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) {
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (cents !== undefined && cents !== null && !isNaN(Number(cents))) {
    return (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '0.00';
}

export default function EncounterFeesView({
  patientId,
  encounters = [],
  canManagePayments = false,
  isAdmin = false,
  onRefresh,
}: EncounterFeesViewProps) {
  // Select encounter: default to first (latest)
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(
    encounters[0]?.id ?? null
  );

  // Settlement modal state
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState<'cash' | 'other'>('cash');
  const [settleMethodDetails, setSettleMethodDetails] = useState('');
  const [settleReference, setSettleReference] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Void modal state
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState<RegistrationFeePaymentData | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [submittingVoid, setSubmittingVoid] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const activeEncounter =
    encounters.find((e) => e.id === selectedEncounterId) || encounters[0] || null;
  const fee: RegistrationFeeData | null | undefined = activeEncounter?.fee;

  const statusColorMap: Record<FeeStatus, { bg: string; text: string; label: string }> = {
    not_recorded: { bg: '#f1f5f9', text: '#64748b', label: 'Not Recorded' },
    unpaid: { bg: '#fee2e2', text: '#b91c1c', label: 'Unpaid' },
    partially_paid: { bg: '#fef3c7', text: '#b45309', label: 'Partially Paid' },
    paid: { bg: '#dcfce7', text: '#15803d', label: 'Fully Paid' },
    waived: { bg: '#f3e8ff', text: '#7e22ce', label: 'Waived' },
    no_fee: { bg: '#e0f2fe', text: '#0369a1', label: 'No Fee' },
  };

  const handleOpenSettle = () => {
    if (!fee) return;
    const initialBal =
      fee.balance ||
      (fee.balance_cents !== undefined && fee.balance_cents !== null
        ? (fee.balance_cents / 100).toFixed(2)
        : '0.00');
    setSettleAmount(initialBal);
    setSettleMethod('cash');
    setSettleMethodDetails('');
    setSettleReference('');
    setSettleNotes('');
    setPaymentError(null);
    setSettleModalOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!fee) return;
    const amt = parseFloat(settleAmount);
    const bal =
      fee.balance_cents !== undefined && fee.balance_cents !== null
        ? fee.balance_cents / 100
        : parseFloat(fee.balance || '0');

    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    if (amt > bal) {
      setPaymentError(`Payment amount cannot exceed the remaining balance of ₱${formatCurrency(fee.balance, fee.balance_cents)}.`);
      return;
    }
    if (settleMethod === 'other' && !settleMethodDetails.trim()) {
      setPaymentError('Method description is required when Other is selected.');
      return;
    }

    setSubmittingPayment(true);
    setPaymentError(null);

    try {
      await api.post(`/registration-fees/${fee.id}/payments`, {
        amount: amt.toFixed(2),
        payment_method: settleMethod,
        payment_method_details: settleMethod === 'other' ? settleMethodDetails : null,
        reference_number: settleReference.trim() || null,
        notes: settleNotes.trim() || null,
      });
      setSettleModalOpen(false);
      onRefresh?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to record payment.';
      setPaymentError(msg);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenVoid = (payment: RegistrationFeePaymentData) => {
    setTargetPayment(payment);
    setVoidReason('');
    setVoidError(null);
    setVoidModalOpen(true);
  };

  const handleSubmitVoid = async () => {
    if (!fee || !targetPayment) return;
    if (!voidReason.trim()) {
      setVoidError('A reason is required to void a payment.');
      return;
    }

    setSubmittingVoid(true);
    setVoidError(null);

    try {
      await api.post(`/registration-fees/${fee.id}/payments/${targetPayment.id}/void`, {
        void_reason: voidReason.trim(),
      });
      setVoidModalOpen(false);
      setTargetPayment(null);
      onRefresh?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to void payment.';
      setVoidError(msg);
    } finally {
      setSubmittingVoid(false);
    }
  };

  if (!encounters.length || !fee) {
    return (
      <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
          No registration fee recorded for this patient or clinic fee tracking was hidden at registration.
        </Typography>
      </Box>
    );
  }

  const currentStatus = statusColorMap[fee.status] || statusColorMap.not_recorded;
  const balanceNum =
    fee.balance_cents !== undefined && fee.balance_cents !== null
      ? fee.balance_cents / 100
      : parseFloat(fee.balance || '0');
  const currentBalanceStr =
    fee.balance ||
    (fee.balance_cents !== undefined && fee.balance_cents !== null
      ? (fee.balance_cents / 100).toFixed(2)
      : '0.00');

  return (
    <Box sx={{ bgcolor: 'var(--card-bg-solid, #ffffff)', borderRadius: 2.5, border: '1px solid var(--border-glow, #e2e8f0)', overflow: 'hidden', mb: 3 }}>
      {/* Header with encounter selection if multiple */}
      <Box sx={{ px: 3, py: 2, bgcolor: 'var(--card-bg, #f8fafc)', borderBottom: '1px solid var(--border-glow, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h, #334155)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            IV. Registration Fees &amp; Payments
          </Typography>

          {encounters.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {encounters.map((enc, idx) => (
                <Chip
                  key={enc.id}
                  label={`Encounter #${enc.id} (${enc.encounter_type.replace('_', ' ')})`}
                  size="small"
                  onClick={() => setSelectedEncounterId(enc.id)}
                  color={(selectedEncounterId || encounters[0]?.id) === enc.id ? 'primary' : 'default'}
                  variant={(selectedEncounterId || encounters[0]?.id) === enc.id ? 'filled' : 'outlined'}
                  sx={{ fontSize: 11, cursor: 'pointer' }}
                />
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={currentStatus.label}
            size="small"
            sx={{ bgcolor: currentStatus.bg, color: currentStatus.text, fontWeight: 700, fontSize: 11.5 }}
          />
          <Chip
            label={fee.is_complete ? 'Complete' : 'Incomplete — Pending Assessment'}
            size="small"
            sx={{
              bgcolor: fee.is_complete ? '#dcfce7' : '#fef3c7',
              color: fee.is_complete ? '#15803d' : '#b45309',
              fontWeight: 600,
              fontSize: 11,
            }}
          />
        </Box>
      </Box>

      {/* Financial Summary KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, p: 2.5, bgcolor: '#fbfcfd', borderBottom: '1px solid #f1f5f9' }}>
        <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Recorded Fee
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1e293b', fontFamily: 'monospace', mt: 0.5 }}>
            ₱{formatCurrency(fee.total, fee.total_cents)}
          </Typography>
          {!fee.is_complete && (
            <Typography sx={{ fontSize: 10.5, color: '#b45309', fontStyle: 'italic', mt: 0.25 }}>
              *Incomplete (pending doctor assessment)
            </Typography>
          )}
        </Box>

        <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Paid
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#15803d', fontFamily: 'monospace', mt: 0.5 }}>
            ₱{formatCurrency(fee.amount_paid, fee.amount_paid_cents)}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: '#64748b', mt: 0.25 }}>
            {fee.payments.filter((p) => !p.is_voided).length} active receipt(s)
          </Typography>
        </Box>

        <Box sx={{ p: 1.5, bgcolor: balanceNum > 0 ? '#fffbeb' : '#f0fdf4', borderRadius: 2, border: balanceNum > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: 11.5, color: balanceNum > 0 ? '#92400e' : '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
              Remaining Balance
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: balanceNum > 0 ? '#b45309' : '#15803d', fontFamily: 'monospace', mt: 0.5 }}>
              ₱{formatCurrency(fee.balance, fee.balance_cents)}
            </Typography>
          </Box>

          {canManagePayments && balanceNum > 0 && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={handleOpenSettle}
              sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'none', mt: 1, py: 0.5 }}
            >
              Record Payment / Settle
            </Button>
          )}
        </Box>
      </Box>

      {/* Itemized Breakdown Table */}
      <Box sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#334155', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          Itemized Breakdown
        </Typography>

        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Fee Item</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Disposition</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Amount (₱)</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Notes / Assessment Reason</th>
              </tr>
            </thead>
            <tbody>
              {fee.items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    {fee.no_additional_fees ? 'No additional fees recorded' : 'No items recorded'}
                  </td>
                </tr>
              ) : (
                fee.items.map((item: RegistrationFeeItemData) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                      {item.label}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background:
                            item.disposition === 'recorded'
                              ? '#dcfce7'
                              : item.disposition === 'pending_assessment'
                              ? '#fef3c7'
                              : '#f1f5f9',
                          color:
                            item.disposition === 'recorded'
                              ? '#15803d'
                              : item.disposition === 'pending_assessment'
                              ? '#b45309'
                              : '#475569',
                        }}
                      >
                        {item.disposition === 'recorded'
                          ? 'Recorded Amount'
                          : item.disposition === 'pending_assessment'
                          ? 'Pending Assessment'
                          : 'Not Applicable'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {item.disposition === 'recorded'
                        ? `₱${formatCurrency(item.amount, item.amount_cents)}`
                        : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {item.reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>

      {/* Payment History Table */}
      <Box sx={{ px: 2.5, pb: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#334155', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          Payment History
        </Typography>

        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Date / Time</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Amount</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Method</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Reference #</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Recorded By</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Status</th>
                {isAdmin && <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {fee.payments.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    No payments recorded yet for this encounter.
                  </td>
                </tr>
              ) : (
                fee.payments.map((pay: RegistrationFeePaymentData) => (
                  <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: pay.is_voided ? 0.6 : 1 }}>
                    <td style={{ padding: '8px 12px', color: '#1e293b' }}>
                      {new Date(pay.collected_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace', color: pay.is_voided ? '#94a3b8' : '#15803d' }}>
                      ₱{formatCurrency(pay.amount, pay.amount_cents)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {pay.payment_method === 'cash' ? 'Cash' : `Other (${pay.payment_method_details || 'N/A'})`}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {pay.reference_number || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {pay.recorded_by?.name || pay.recorded_by_name || 'Staff'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {pay.is_voided ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c' }} title={`Voided: ${pay.void_reason}`}>
                          Voided
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#dcfce7', color: '#15803d' }}>
                          Active
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        {!pay.is_voided && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleOpenVoid(pay)}
                            sx={{ fontSize: 10.5, py: 0.25, px: 1, textTransform: 'none' }}
                          >
                            Void
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>

      {/* ── Balance Settlement Modal ── */}
      <Dialog open={settleModalOpen} onClose={() => setSettleModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
          Record Payment / Settle Balance
        </DialogTitle>
        <DialogContent dividers>
          {paymentError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
              {paymentError}
            </Alert>
          )}

          <Typography sx={{ fontSize: 12.5, color: '#475569', mb: 2 }}>
            Record a subsequent manual payment received for Encounter #{activeEncounter.id}.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Amount Received (₱) *</Typography>
              <Typography
                sx={{ fontSize: 11, color: '#059669', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setSettleAmount(currentBalanceStr)}
              >
                Pay Full (₱{formatCurrency(fee.balance, fee.balance_cents)})
              </Typography>
            </Box>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              placeholder="0.00"
              slotProps={{ htmlInput: { min: 0.01, max: balanceNum > 0 ? balanceNum : undefined, step: 0.01 } }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Payment Method *</Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={settleMethod}
              onChange={(e) => setSettleMethod(e.target.value as 'cash' | 'other')}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="other">Other (GCash, Maya, Bank Transfer, Check)</MenuItem>
            </TextField>
          </Box>

          {settleMethod === 'other' && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Method Details *</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. GCash / Reference Check"
                value={settleMethodDetails}
                onChange={(e) => setSettleMethodDetails(e.target.value)}
              />
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Reference Number (Optional)</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. manual receipt / acknowledgment #"
              value={settleReference}
              onChange={(e) => setSettleReference(e.target.value)}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Notes (Optional)</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Optional payment notes"
              value={settleNotes}
              onChange={(e) => setSettleNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setSettleModalOpen(false)} disabled={submittingPayment} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmitPayment}
            disabled={submittingPayment}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {submittingPayment ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Void Payment Modal (Admin Only) ── */}
      <Dialog open={voidModalOpen} onClose={() => setVoidModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: '#b91c1c' }}>
          Void Payment Receipt
        </DialogTitle>
        <DialogContent dividers>
          {voidError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
              {voidError}
            </Alert>
          )}

          {targetPayment && (
            <Typography sx={{ fontSize: 12.5, color: '#475569', mb: 2 }}>
              Are you sure you want to void the payment of{' '}
              <strong>₱{formatCurrency(targetPayment.amount, targetPayment.amount_cents)}</strong> received on{' '}
              {new Date(targetPayment.collected_at).toLocaleDateString()}? This action is audited and
              will restore the outstanding balance.
            </Typography>
          )}

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
              Reason for Voiding *
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. Mistaken receipt number / paid under wrong patient"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setVoidModalOpen(false)} disabled={submittingVoid} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitVoid}
            disabled={submittingVoid}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {submittingVoid ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Confirm Void'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
