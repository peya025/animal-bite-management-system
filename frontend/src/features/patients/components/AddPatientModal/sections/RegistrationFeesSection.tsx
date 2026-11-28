import React, { useId } from 'react';
import { useClinicModuleConfig } from '../../../../../hooks/useClinicModuleConfig';
import { SearchableSelect } from '../../../../../components/forms/SearchableSelect';
import type {
  RegistrationFeePayload,
  RegistrationFeeItemInput,
  FeeDisposition,
} from '../../../types';

const FEE_DISPOSITION_OPTIONS = [
  { value: 'recorded', label: 'Recorded Amount' },
  { value: 'pending_assessment', label: 'Pending Assessment' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

const ADDITIONAL_FEE_DISPOSITION_OPTIONS = [
  { value: 'recorded', label: 'Amount' },
  { value: 'pending_assessment', label: 'Pending' },
  { value: 'not_applicable', label: 'N/A' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other (GCash, Check, Bank Transfer)' },
];

export interface RegistrationFeesSectionProps {
  data?: RegistrationFeePayload;
  onChange: (fee: RegistrationFeePayload | undefined) => void;
  errors?: Record<string, string>;
}

interface AdditionalRow extends RegistrationFeeItemInput {
  _id: string;
}

export function RegistrationFeesSection({
  data,
  onChange,
  errors = {},
}: RegistrationFeesSectionProps) {
  const { getFieldRule, config } = useClinicModuleConfig();
  const uid = useId();

  const rigRule = config?.field_rules?.rig_fee ?? getFieldRule('rig_fee') ?? 'hidden';
  const arRule = config?.field_rules?.anti_rabies_fee ?? getFieldRule('anti_rabies_fee') ?? 'hidden';
  const addRule = config?.field_rules?.additional_fees ?? getFieldRule('additional_fees') ?? 'hidden';

  // If all three items are configured as Hidden, omit the entire section
  if (rigRule === 'hidden' && arRule === 'hidden' && addRule === 'hidden') {
    return null;
  }

  const feeData: RegistrationFeePayload = data || {};
  const rigFee: RegistrationFeeItemInput = feeData.rig_fee || {
    disposition: 'recorded',
    amount: '',
    reason: '',
  };
  const arFee: RegistrationFeeItemInput = feeData.anti_rabies_fee || {
    disposition: 'recorded',
    amount: '',
    reason: '',
  };
  const additionalItems: RegistrationFeeItemInput[] = feeData.additional_fees || [];
  const noAdditional = Boolean(feeData.no_additional_fees);
  const recordPayment = Boolean(feeData.record_payment);
  const payment = feeData.payment || {
    amount: '',
    payment_method: 'cash',
    payment_method_details: '',
    reference_number: '',
    notes: '',
  };

  const updateFee = (updates: Partial<RegistrationFeePayload>) => {
    const next = { ...feeData, ...updates };
    onChange(next);
  };

  // ── Calculation ─────────────────────────────────────────────────────────────
  const parseAmount = (val: string | number | null | undefined): number => {
    if (val === null || val === undefined || val === '') return 0;
    const n = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(n) || n < 0 ? 0 : Math.round(n * 100) / 100;
  };

  let totalRecorded = 0;
  let hasIncomplete = false;

  // RIG Fee check
  if (rigRule !== 'hidden') {
    if (rigFee.disposition === 'recorded') {
      const amtStr = String(rigFee.amount ?? '').trim();
      if (amtStr !== '') {
        totalRecorded += parseAmount(rigFee.amount);
      } else if (rigRule === 'optional') {
        hasIncomplete = true; // Visible optional left blank is incomplete
      }
    } else if (rigFee.disposition === 'pending_assessment') {
      hasIncomplete = true;
    }
  }

  // Anti-Rabies Vaccine Fee check
  if (arRule !== 'hidden') {
    if (arFee.disposition === 'recorded') {
      const amtStr = String(arFee.amount ?? '').trim();
      if (amtStr !== '') {
        totalRecorded += parseAmount(arFee.amount);
      } else if (arRule === 'optional') {
        hasIncomplete = true;
      }
    } else if (arFee.disposition === 'pending_assessment') {
      hasIncomplete = true;
    }
  }

  // Additional Fees check
  if (addRule !== 'hidden') {
    if (!noAdditional && additionalItems.length > 0) {
      for (const item of additionalItems) {
        if (item.disposition === 'recorded') {
          totalRecorded += parseAmount(item.amount);
        } else if (item.disposition === 'pending_assessment') {
          hasIncomplete = true;
        }
      }
    }
  }

  const paymentAmountNum = parseAmount(payment.amount);
  const remainingBalance = Math.max(0, Math.round((totalRecorded - paymentAmountNum) * 100) / 100);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRigChange = (updates: Partial<RegistrationFeeItemInput>) => {
    updateFee({ rig_fee: { ...rigFee, ...updates } });
  };

  const handleArChange = (updates: Partial<RegistrationFeeItemInput>) => {
    updateFee({ anti_rabies_fee: { ...arFee, ...updates } });
  };

  const handleAddAdditionalRow = (labelPreset = '') => {
    const nextList: RegistrationFeeItemInput[] = [
      ...additionalItems,
      {
        fee_type: 'additional',
        label: labelPreset,
        disposition: 'recorded',
        amount: '',
        reason: '',
      },
    ];
    updateFee({ additional_fees: nextList, no_additional_fees: false });
  };

  const handleUpdateAdditionalRow = (index: number, updates: Partial<RegistrationFeeItemInput>) => {
    const nextList = [...additionalItems];
    nextList[index] = { ...nextList[index], ...updates };
    updateFee({ additional_fees: nextList });
  };

  const handleRemoveAdditionalRow = (index: number) => {
    const nextList = additionalItems.filter((_, i) => i !== index);
    updateFee({ additional_fees: nextList });
  };

  const handlePaymentChange = (updates: Partial<typeof payment>) => {
    updateFee({
      record_payment: true,
      payment: { ...payment, ...updates },
    });
  };

  const bothTopVisible = rigRule !== 'hidden' && arRule !== 'hidden';

  return (
    <div className="fm-section" style={{ borderTop: '2px dashed var(--border-glow, #e2e8f0)', paddingTop: 20, marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="fm-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Fees and Payment</span>
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-m, #64748b)', fontStyle: 'italic' }}>
          Registration financial records · Not a prescription or stock deduction
        </span>
      </div>

      {/* ── Row 1: RIG & Anti-Rabies Vaccine Fees (Side-by-side or reflows) ── */}
      <div className={`fm-grid ${bothTopVisible ? 'fm-grid--2' : 'fm-grid--1'}`} style={{ marginBottom: 18 }}>
        {/* RIG Fee */}
        {rigRule !== 'hidden' && (
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              border: errors['registration_fee.rig_fee'] ? '1px solid #ef4444' : '1px solid var(--border-glow, #e2e8f0)',
              background: 'var(--card-bg, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label htmlFor={`${uid}-rig-amount`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-h, #1e293b)' }}>
                RIG Fee (PHP) {rigRule === 'required' && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <SearchableSelect
                id={`${uid}-rig-disp`}
                value={rigFee.disposition}
                options={FEE_DISPOSITION_OPTIONS}
                onChange={(val) => handleRigChange({ disposition: val as FeeDisposition })}
                size="compact"
                aria-label="RIG Fee disposition"
                searchPlaceholder="Search status..."
              />
            </div>

            {rigFee.disposition === 'recorded' ? (
              <div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: 8, color: '#64748b', fontWeight: 600 }}>₱</span>
                  <input
                    id={`${uid}-rig-amount`}
                    name="registration_fee.rig_fee.amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999.99"
                    placeholder="0.00"
                    value={rigFee.amount ?? ''}
                    onChange={(e) => handleRigChange({ amount: e.target.value })}
                    className="fm-input"
                    style={{ paddingLeft: 26 }}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                  {rigRule === 'required' ? 'Required (enter 0.00 if explicitly free of charge)' : 'Optional (leave blank for Not Recorded)'}
                </span>
              </div>
            ) : (
              <div>
                <input
                  id={`${uid}-rig-reason`}
                  type="text"
                  placeholder={rigFee.disposition === 'pending_assessment' ? 'Reason (e.g. Weight & dosage pending doctor assessment)' : 'Reason (e.g. No deep wound / Cat II)'}
                  value={rigFee.reason ?? ''}
                  onChange={(e) => handleRigChange({ reason: e.target.value })}
                  className="fm-input"
                />
                <span style={{ fontSize: 11, color: '#d97706', display: 'block', marginTop: 4 }}>
                  {rigFee.disposition === 'pending_assessment' ? 'Will be marked incomplete until assessed by doctor' : 'Exempt / Not applicable for this encounter'}
                </span>
              </div>
            )}
            {errors['registration_fee.rig_fee'] && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, margin: 0 }}>{errors['registration_fee.rig_fee']}</p>
            )}
          </div>
        )}

        {/* Anti-Rabies Vaccine Fee */}
        {arRule !== 'hidden' && (
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              border: errors['registration_fee.anti_rabies_fee'] ? '1px solid #ef4444' : '1px solid var(--border-glow, #e2e8f0)',
              background: 'var(--card-bg, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label htmlFor={`${uid}-ar-amount`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-h, #1e293b)' }}>
                Anti-Rabies Vaccine Fee (PHP) {arRule === 'required' && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <SearchableSelect
                id={`${uid}-ar-disp`}
                value={arFee.disposition}
                options={FEE_DISPOSITION_OPTIONS}
                onChange={(val) => handleArChange({ disposition: val as FeeDisposition })}
                size="compact"
                aria-label="Anti-Rabies Vaccine Fee disposition"
                searchPlaceholder="Search status..."
              />
            </div>

            {arFee.disposition === 'recorded' ? (
              <div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: 8, color: '#64748b', fontWeight: 600 }}>₱</span>
                  <input
                    id={`${uid}-ar-amount`}
                    name="registration_fee.anti_rabies_fee.amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999.99"
                    placeholder="0.00"
                    value={arFee.amount ?? ''}
                    onChange={(e) => handleArChange({ amount: e.target.value })}
                    className="fm-input"
                    style={{ paddingLeft: 26 }}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                  {arRule === 'required' ? 'Required (enter 0.00 if explicitly free of charge)' : 'Optional (leave blank for Not Recorded)'}
                </span>
              </div>
            ) : (
              <div>
                <input
                  id={`${uid}-ar-reason`}
                  type="text"
                  placeholder={arFee.disposition === 'pending_assessment' ? 'Reason (e.g. Regimen pending doctor assessment)' : 'Reason (e.g. Patient already completed PEP)'}
                  value={arFee.reason ?? ''}
                  onChange={(e) => handleArChange({ reason: e.target.value })}
                  className="fm-input"
                />
                <span style={{ fontSize: 11, color: '#d97706', display: 'block', marginTop: 4 }}>
                  {arFee.disposition === 'pending_assessment' ? 'Will be marked incomplete until assessed by doctor' : 'Exempt / Not applicable for this encounter'}
                </span>
              </div>
            )}
            {errors['registration_fee.anti_rabies_fee'] && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, margin: 0 }}>{errors['registration_fee.anti_rabies_fee']}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Row 2: Additional Fees (Repeatable rows) ── */}
      {addRule !== 'hidden' && (
        <div
          style={{
            padding: 14,
            borderRadius: 8,
            border: errors['registration_fee.additional_fees'] ? '1px solid #ef4444' : '1px solid var(--border-glow, #e2e8f0)',
            background: 'var(--card-bg, #f8fafc)',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-h, #1e293b)' }}>
                Additional Fees &amp; Supplies (Anti-Tetanus, ATS, Syringes, etc.) {addRule === 'required' && <span style={{ color: '#ef4444' }}>*</span>}
              </span>
            </div>

            {addRule === 'required' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={noAdditional}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateFee({
                      no_additional_fees: checked,
                      additional_fees: checked ? [] : additionalItems,
                    });
                  }}
                />
                <span style={{ fontWeight: 500 }}>No additional fees for this encounter</span>
              </label>
            )}
          </div>

          {!noAdditional && (
            <div>
              {additionalItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                    background: '#ffffff',
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Description (e.g. Anti-Tetanus Serum)"
                    value={item.label ?? ''}
                    onChange={(e) => handleUpdateAdditionalRow(index, { label: e.target.value })}
                    className="fm-input"
                    style={{ flex: '1 1 180px', minWidth: 140 }}
                  />

                  <SearchableSelect
                    value={item.disposition}
                    options={ADDITIONAL_FEE_DISPOSITION_OPTIONS}
                    onChange={(val) => handleUpdateAdditionalRow(index, { disposition: val as FeeDisposition })}
                    size="compact"
                    aria-label={`Additional fee item #${index + 1} disposition`}
                    searchPlaceholder="Search status..."
                  />

                  {item.disposition === 'recorded' ? (
                    <div style={{ position: 'relative', width: 120 }}>
                      <span style={{ position: 'absolute', left: 8, top: 7, color: '#64748b', fontSize: 13 }}>₱</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.amount ?? ''}
                        onChange={(e) => handleUpdateAdditionalRow(index, { amount: e.target.value })}
                        className="fm-input"
                        style={{ paddingLeft: 22, height: 34 }}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Reason for pending or N/A"
                      value={item.reason ?? ''}
                      onChange={(e) => handleUpdateAdditionalRow(index, { reason: e.target.value })}
                      className="fm-input"
                      style={{ flex: '1 1 120px' }}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalRow(index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 16,
                      padding: '4px 8px',
                      borderRadius: 4,
                    }}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleAddAdditionalRow('')}
                  style={{
                    fontSize: 12,
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px dashed #10b981',
                    background: '#ecfdf5',
                    color: '#059669',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add Fee Item
                </button>
                <span style={{ fontSize: 11, color: '#64748b' }}>Quick add:</span>
                <button
                  type="button"
                  onClick={() => handleAddAdditionalRow('Anti-Tetanus Serum (ATS)')}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  + ATS
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAdditionalRow('Tetanus Toxoid (TT)')}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  + TT
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAdditionalRow('Syringes / Needles')}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  + Syringes
                </button>
              </div>
            </div>
          )}

          {errors['registration_fee.additional_fees'] && (
            <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, margin: 0 }}>{errors['registration_fee.additional_fees']}</p>
          )}
        </div>
      )}

      {/* ── Summary & Completeness Notice ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: 8,
          background: hasIncomplete ? '#fffbeb' : '#f0fdf4',
          border: hasIncomplete ? '1px solid #fde68a' : '1px solid #bbf7d0',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: hasIncomplete ? '#92400e' : '#166534' }}>
              {hasIncomplete ? 'Recorded Total (Incomplete)' : 'Recorded Total'}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                background: hasIncomplete ? '#fef3c7' : '#dcfce7',
                color: hasIncomplete ? '#b45309' : '#15803d',
              }}
            >
              {hasIncomplete ? 'Pending Assessment' : 'Finalized Items'}
            </span>
          </div>
          {hasIncomplete && (
            <span style={{ fontSize: 12, color: '#92400e', display: 'block', marginTop: 3 }}>
              Applicability or price of one or more items is pending doctor assessment. Patient may proceed to triage without a finalized fee.
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: hasIncomplete ? '#b45309' : '#15803d', fontFamily: 'monospace' }}>
            ₱{totalRecorded.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Payment Controls (Optional) ── */}
      <div
        style={{
          padding: 14,
          borderRadius: 8,
          border: '1px solid var(--border-glow, #e2e8f0)',
          background: 'var(--card-bg-solid, #ffffff)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: recordPayment ? 12 : 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text-h, #1e293b)' }}>
            <input
              type="checkbox"
              checked={recordPayment}
              onChange={(e) => {
                const checked = e.target.checked;
                updateFee({
                  record_payment: checked,
                  payment: checked
                    ? {
                        amount: totalRecorded > 0 ? totalRecorded.toFixed(2) : '',
                        payment_method: 'cash',
                        payment_method_details: '',
                        reference_number: '',
                        notes: '',
                      }
                    : undefined,
                });
              }}
            />
            <span>Record manual payment received now</span>
          </label>

          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            Recording payment is optional · Patient can continue with unpaid balance
          </span>
        </div>

        {recordPayment && (
          <div style={{ paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
            <div className="fm-grid fm-grid--2" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label htmlFor={`${uid}-pay-amt`} style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                    Amount Received (₱) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {totalRecorded > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePaymentChange({ amount: totalRecorded.toFixed(2) })}
                      style={{ fontSize: 11, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Pay Full (₱{totalRecorded.toFixed(2)})
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: 8, color: '#64748b', fontWeight: 600 }}>₱</span>
                  <input
                    id={`${uid}-pay-amt`}
                    name="registration_fee.payment.amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalRecorded}
                    placeholder="0.00"
                    value={payment.amount ?? ''}
                    onChange={(e) => handlePaymentChange({ amount: e.target.value })}
                    className="fm-input"
                    style={{ paddingLeft: 26 }}
                  />
                </div>
                {errors['registration_fee.payment.amount'] && (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, margin: 0 }}>{errors['registration_fee.payment.amount']}</p>
                )}
              </div>

              <div>
                <label htmlFor={`${uid}-pay-method`} style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Payment Method <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  id={`${uid}-pay-method`}
                  value={payment.payment_method}
                  options={PAYMENT_METHOD_OPTIONS}
                  onChange={(val) => handlePaymentChange({ payment_method: val as 'cash' | 'other' })}
                  searchPlaceholder="Search payment method..."
                />

                {payment.payment_method === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Specify method (e.g. GCash / Check)"
                      value={payment.payment_method_details ?? ''}
                      onChange={(e) => handlePaymentChange({ payment_method_details: e.target.value })}
                      className="fm-input"
                    />
                    {errors['registration_fee.payment.payment_method_details'] && (
                      <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, margin: 0 }}>
                        {errors['registration_fee.payment.payment_method_details']}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="fm-grid fm-grid--2" style={{ marginBottom: 12 }}>
              <div>
                <label htmlFor={`${uid}-pay-ref`} style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Reference Number (Optional)
                </label>
                <input
                  id={`${uid}-pay-ref`}
                  type="text"
                  placeholder="e.g. manual receipt / acknowledgment #"
                  value={payment.reference_number ?? ''}
                  onChange={(e) => handlePaymentChange({ reference_number: e.target.value })}
                  className="fm-input"
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Manual external reference. System does not issue official receipts.
                </span>
              </div>

              <div>
                <label htmlFor={`${uid}-pay-notes`} style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Payment Notes (Optional)
                </label>
                <input
                  id={`${uid}-pay-notes`}
                  type="text"
                  placeholder="Notes regarding this payment"
                  value={payment.notes ?? ''}
                  onChange={(e) => handlePaymentChange({ notes: e.target.value })}
                  className="fm-input"
                />
              </div>
            </div>

            {/* Balance & Status Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 6,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: '#475569' }}>Remaining Balance: </span>
                <strong style={{ color: remainingBalance > 0 ? '#b45309' : '#15803d', fontFamily: 'monospace', fontSize: 13 }}>
                  ₱{remainingBalance.toFixed(2)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#475569' }}>Status: </span>
                <span
                  style={{
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: remainingBalance === 0 && paymentAmountNum > 0 ? '#dcfce7' : '#e0f2fe',
                    color: remainingBalance === 0 && paymentAmountNum > 0 ? '#15803d' : '#0369a1',
                  }}
                >
                  {remainingBalance === 0 && paymentAmountNum > 0 ? 'Fully Paid' : 'Partially Paid'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
