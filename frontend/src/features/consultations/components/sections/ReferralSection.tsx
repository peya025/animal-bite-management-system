import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import { PERTINENT_HISTORY_OPTIONS } from '../../constants/consultation.constants';
import ReferralLocationSelector from '../ReferralLocationSelector';
import { FormField } from '../FormField';

interface ReferralSectionProps {
  formData: TreatmentFormData;
  isFormDisabled: boolean;
  checkedHistory: string[];
  onFieldChange: (
    key: keyof TreatmentFormData
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSetReferredFrom: (val: string) => void;
  onToggleHistory: (item: string) => void;
}

export default function ReferralSection({
  formData,
  isFormDisabled,
  checkedHistory,
  onFieldChange,
  onSetReferredFrom,
  onToggleHistory,
}: ReferralSectionProps) {
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">
        II. For CHU / RHU Personnel Only (Para sa Kinatawan ng CHU / RHU Lamang)
      </h3>

      <div className="fm-grid">
        <FormField label="Mode of Transaction" className="fm-grid--full">
          <div className="fm-radio-group">
            {(['walk-in', 'visited', 'referral'] as const).map((mode) => (
              <label key={mode} className="fm-radio">
                <input
                  type="radio"
                  name="mode_of_transaction"
                  value={mode}
                  checked={formData.mode_of_transaction === mode}
                  onChange={onFieldChange('mode_of_transaction')}
                  disabled={isFormDisabled}
                />
                <span style={{ textTransform: 'capitalize' }}>
                  {mode.replace('-', ' ')}
                </span>
              </label>
            ))}
          </div>
        </FormField>
      </div>

      {formData.mode_of_transaction === 'referral' && (
        <div style={{ marginTop: 20 }}>
          <div className="fm-grid">
            <ReferralLocationSelector
              label="Referred From"
              value={formData.referred_from}
              onChange={onSetReferredFrom}
              disabled={isFormDisabled}
            />

            <FormField label="Referred To" className="fm-grid--full" hint="📍 Primary Receiving Facility: Tagoloan RHU">
              <input
                className="fm-input"
                type="text"
                value="Tagoloan Rural Health Unit (RHU) / ABTC"
                readOnly
                disabled
              />
            </FormField>

            {/* Pertinent History: Checklist + Auto-filled Text Area */}
            <div className="fm-field fm-grid--full" style={{ scrollMarginBlock: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <label className="fm-label">
                  Pertinent History of Illness and Findings
                  {checkedHistory.length > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'var(--nav-item-active-bg, #ecfdf5)',
                        color: 'var(--nav-item-active-color, #047857)',
                        borderRadius: 99,
                        padding: '2px 8px',
                        border: '1px solid var(--input-border, #a7f3d0)',
                      }}
                    >
                      {checkedHistory.length} checked
                    </span>
                  )}
                </label>
              </div>
              <span className="registration-field-hint" style={{ marginBottom: 8, display: 'block' }}>
                Check items to auto-fill the findings box — or write on the side (maaaring pumili o mag-type)
              </span>

              <div className="fm-grid">
                {/* Left: Scrollable checklist */}
                <div
                  style={{
                    border: '1px solid var(--text-secondary, #6b7280)',
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: 'auto',
                    backgroundColor: isFormDisabled ? 'var(--bg-secondary, #f1f5f9)' : 'var(--input-bg, #fff)',
                  }}
                >
                  {PERTINENT_HISTORY_OPTIONS.map((item, idx) => {
                    const isChecked = checkedHistory.includes(item);
                    return (
                      <label
                        key={item}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderBottom: idx < PERTINENT_HISTORY_OPTIONS.length - 1 ? '1px solid var(--border-glow, #f1f5f9)' : 'none',
                          cursor: isFormDisabled ? 'default' : 'pointer',
                          background: isChecked ? 'var(--nav-item-active-bg, #f0fdf4)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => !isFormDisabled && onToggleHistory(item)}
                          disabled={isFormDisabled}
                          style={{
                            accentColor: '#047857',
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            cursor: isFormDisabled ? 'default' : 'pointer',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: isChecked ? 'var(--text-h, #065f46)' : 'var(--text, #374151)',
                            fontWeight: isChecked ? 600 : 400,
                            lineHeight: 1.3,
                          }}
                        >
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Right: Text area */}
                <textarea
                  className="fm-textarea"
                  value={formData.pertinent_history}
                  onChange={onFieldChange('pertinent_history')}
                  disabled={isFormDisabled}
                  rows={8}
                  style={{ minHeight: 220 }}
                  placeholder={
                    isFormDisabled
                      ? '—'
                      : 'Checked history and findings appear here.\nYou can also type additional clinical notes…'
                  }
                />
              </div>
            </div>

            <FormField label="Reason for Referral (Dahilan ng Referral)" className="fm-grid--full">
              <input
                className="fm-input"
                type="text"
                name="reason_for_referral"
                value={formData.reason_for_referral}
                onChange={onFieldChange('reason_for_referral')}
                disabled={isFormDisabled}
                placeholder="For further evaluation and management."
              />
            </FormField>

            <FormField label="Action/s Taken (Mga Aksyong Ginawa Bago I-refer)" className="fm-grid--full">
              <textarea
                className="fm-textarea"
                name="actions_taken"
                value={formData.actions_taken}
                onChange={onFieldChange('actions_taken')}
                disabled={isFormDisabled}
                rows={3}
                placeholder={
                  isFormDisabled
                    ? '—'
                    : 'Enter actions taken prior to referral (e.g. Wound washed with soap and water for 15 mins, antiseptic applied, tetanus toxoid given, etc.)'
                }
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}
