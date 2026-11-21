import React, { useState } from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import {
  COMMON_REFERRAL_FACILITIES,
  COMMON_REFERRAL_REASONS,
} from '../../constants/consultation.constants';
import { FormField } from '../FormField';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PrinterIcon,
  Share01Icon,
  CheckmarkCircle02Icon,
  Hospital02Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';

interface TransferReferralSectionProps {
  formData: TreatmentFormData;
  isFormDisabled: boolean;
  saving: boolean;
  fieldErrors?: Record<string, string>;
  isReferralCompleted?: boolean;
  onFieldChange: (
    key: keyof TreatmentFormData
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onToggleReferral: (enabled: boolean) => void;
  onSelectFacility: (facility: string) => void;
  onSelectReason: (reason: string) => void;
  onPrintSlip: () => void;
  onSaveAndPrint?: () => void;
  onCompleteReferral: () => void;
}

export default function TransferReferralSection({
  formData,
  isFormDisabled,
  saving,
  fieldErrors = {},
  isReferralCompleted = false,
  onFieldChange,
  onToggleReferral,
  onSelectFacility,
  onSelectReason,
  onPrintSlip,
  onSaveAndPrint,
  onCompleteReferral,
}: TransferReferralSectionProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isEnabled = Boolean(formData.is_referral || isReferralCompleted || formData.transferred_to_facility);
  const facilityVal = (formData.transferred_to_facility ?? '').trim();

  const handleFacilitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val && val !== 'custom') {
      onSelectFacility(val);
    }
  };

  const handleReasonClick = (reason: string) => {
    onSelectReason(reason);
  };

  return (
    <div
      className="fm-section"
      style={{
        marginTop: 16,
        marginBottom: 20,
        border: isEnabled ? '1.5px solid #059669' : '1px solid var(--border-glow, #e2e8f0)',
        borderRadius: 12,
        padding: '16px 18px',
        backgroundColor: isEnabled ? 'rgba(236, 253, 245, 0.5)' : 'var(--card-bg-solid, #ffffff)',
        boxShadow: isEnabled ? '0 1px 3px rgba(5, 150, 105, 0.08)' : 'none',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {/* Header and Toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: isEnabled ? '#d1fae5' : '#f1f5f9',
              color: isEnabled ? '#047857' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HugeiconsIcon icon={Hospital02Icon} size={18} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: isEnabled ? '#065f46' : 'var(--text-h, #0f172a)',
                }}
              >
                Transfer Out / Referral Slip
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 99,
                  backgroundColor: isReferralCompleted ? '#dcfce7' : isEnabled ? '#d1fae5' : '#f1f5f9',
                  color: isReferralCompleted ? '#15803d' : isEnabled ? '#047857' : '#64748b',
                }}
              >
                {isReferralCompleted ? 'Transferred / Referred' : isEnabled ? 'Referral Active' : 'Optional'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
              Refer or transfer patient to an external hospital (e.g. for RIG, wound surgery, or PEP continuity)
            </p>
          </div>
        </div>

        {/* Toggle Checkbox */}
        {!isFormDisabled && !isReferralCompleted && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: isEnabled ? '#047857' : 'var(--text, #374151)',
              backgroundColor: isEnabled ? '#ffffff' : '#f8fafc',
              border: isEnabled ? '1px solid #10b981' : '1px solid #cbd5e1',
              padding: '6px 12px',
              borderRadius: 8,
            }}
          >
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onToggleReferral(e.target.checked)}
              disabled={isFormDisabled || isReferralCompleted}
              style={{
                accentColor: '#059669',
                width: 16,
                height: 16,
                cursor: 'pointer',
              }}
            />
            <span>Refer / Transfer Patient</span>
          </label>
        )}
      </div>

      {/* Completed Referral Banner */}
      {isReferralCompleted && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color="#16a34a" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                Patient Transferred / Referred
              </div>
              <div style={{ fontSize: 12, color: '#15803d' }}>
                Destination: <strong>{formData.transferred_to_facility || 'External Facility'}</strong>
                {formData.transfer_date ? ` · Date: ${formData.transfer_date}` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onPrintSlip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #059669',
              borderRadius: 6,
              color: '#047857',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <HugeiconsIcon icon={PrinterIcon} size={14} />
            Reprint Referral Slip
          </button>
        </div>
      )}

      {/* Active Form Fields (When Enabled and Not Completed) */}
      {isEnabled && !isReferralCompleted && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row 1: Destination Facility */}
          <div className="fm-grid">
            <FormField
              id="field-transferred_to_facility"
              label="Receiving Hospital / Facility *"
              required
              hint="Select a common hospital or type specific receiving facility"
              error={Boolean(fieldErrors?.transferred_to_facility)}
              errorText={fieldErrors?.transferred_to_facility}
              className="fm-grid--full"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  className="fm-select"
                  value={
                    formData.transferred_to_facility && COMMON_REFERRAL_FACILITIES.includes(formData.transferred_to_facility)
                      ? formData.transferred_to_facility
                      : (formData.transferred_to_facility ? 'custom' : '')
                  }
                  onChange={handleFacilitySelect}
                  disabled={isFormDisabled}
                  style={{
                    fontWeight: formData.transferred_to_facility ? 600 : 400,
                    color: formData.transferred_to_facility ? '#065f46' : 'inherit',
                  }}
                >
                  <option value="">— Select Receiving Hospital / Facility —</option>
                  {COMMON_REFERRAL_FACILITIES.map((fac) => (
                    <option key={fac} value={fac}>
                      🏥 {fac}
                    </option>
                  ))}
                  <option value="custom">Other / Custom Health Facility…</option>
                </select>

                <input
                  className="fm-input"
                  type="text"
                  placeholder="Or enter receiving hospital name..."
                  value={formData.transferred_to_facility || ''}
                  onChange={onFieldChange('transferred_to_facility')}
                  disabled={isFormDisabled}
                  style={{
                    fontWeight: 500,
                  }}
                />
              </div>
            </FormField>
          </div>

          {/* Row 2: Transfer Date */}
          <div className="fm-grid">
            <FormField
              id="field-transfer_date"
              label="Transfer Date"
              hint="Effective referral or transfer date"
            >
              <input
                className="fm-input"
                type="date"
                value={formData.transfer_date || ''}
                onChange={onFieldChange('transfer_date')}
                disabled={isFormDisabled}
              />
            </FormField>
          </div>

          {/* Row 3: Reason for Referral */}
          <FormField
            id="field-transfer_reason"
            label="Reason for Referral / Clinical Justification"
            hint="Click a quick reason chip or enter detailed clinical findings"
            error={Boolean(fieldErrors?.transfer_reason)}
            errorText={fieldErrors?.transfer_reason}
            className="fm-grid--full"
          >
            {/* Quick reason chips */}
            {!isFormDisabled && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {COMMON_REFERRAL_REASONS.map((r, i) => {
                  const isSelected = Boolean(formData.transfer_reason?.includes(r));
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleReasonClick(r)}
                      disabled={isFormDisabled}
                      style={{
                        textAlign: 'left',
                        fontSize: 11.5,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: isSelected ? '1px solid #059669' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#d1fae5' : '#ffffff',
                        color: isSelected ? '#065f46' : '#334155',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '}{r}
                    </button>
                  );
                })}
              </div>
            )}

            <textarea
              className="fm-textarea"
              rows={3}
              placeholder="Clinical reason for transfer (e.g., Patient requires RIG/HRIG not available on site, ICU evaluation, severe facial laceration, etc.)"
              value={formData.transfer_reason || ''}
              onChange={onFieldChange('transfer_reason')}
              disabled={isFormDisabled}
            />
          </FormField>

          {/* Action Bar & Informational Helper */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <HugeiconsIcon icon={AlertCircleIcon} size={16} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                <strong>Important:</strong> Printing the referral slip alone will <em>not</em> complete the encounter.
                Review or print the slip anytime. When you are ready to refer the patient to the hospital, click{' '}
                <strong>Complete Referral</strong> to mark this visit as Transferred/Referred and complete the queue ticket without forwarding to Form 3.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                paddingTop: 8,
                borderTop: '1px solid #f1f5f9',
              }}
            >
              {/* Left Buttons: Print and Save & Print */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onPrintSlip}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #059669',
                    borderRadius: 6,
                    color: '#047857',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Preview and print the official DOH Referral Certificate"
                >
                  <HugeiconsIcon icon={PrinterIcon} size={15} />
                  Print Referral Slip
                </button>

                {onSaveAndPrint && !isFormDisabled && (
                  <button
                    type="button"
                    onClick={onSaveAndPrint}
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #10b981',
                      borderRadius: 6,
                      color: '#065f46',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                    title="Save referral details and open the printable slip"
                  >
                    <HugeiconsIcon icon={Share01Icon} size={14} />
                    Save & Print Slip
                  </button>
                )}
              </div>

              {/* Right Button: Complete Referral */}
              {!isFormDisabled && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={saving || !facilityVal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 18px',
                    backgroundColor: !facilityVal ? '#94a3b8' : '#059669',
                    border: 'none',
                    borderRadius: 6,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: saving || !facilityVal ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                  title="Finalize referral and mark current queue ticket completed"
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                  Complete Referral
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Complete Referral */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <HugeiconsIcon icon={Share01Icon} size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Complete Patient Referral?
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Finalize transfer to external receiving facility
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 12,
                fontSize: 12.5,
                color: '#334155',
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              <div>🏥 <strong>Receiving Facility:</strong> {formData.transferred_to_facility}</div>
              {formData.transfer_reason && (
                <div style={{ marginTop: 4 }}>📋 <strong>Reason:</strong> {formData.transfer_reason}</div>
              )}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', color: '#047857', fontWeight: 600 }}>
                • Current visit status will be set to: <strong>Transferred/Referred</strong><br />
                • Active queue encounter will be marked completed (removed from queue)<br />
                • Will <strong>not</strong> forward to Form 3 / nurse treatment queue<br />
                • Vaccines will <strong>not</strong> be marked administered or deducted
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  onCompleteReferral();
                }}
                disabled={saving}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                Yes, Complete Referral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
