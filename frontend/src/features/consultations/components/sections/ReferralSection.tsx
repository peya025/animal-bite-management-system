import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import { PERTINENT_HISTORY_OPTIONS } from '../../constants/consultation.constants';
import ReferralLocationSelector from '../ReferralLocationSelector';

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
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          color: '#10b981',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 16,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        II. For CHU / RHU Personnel Only (Para sa Kinatawan ng CHU / RHU Lamang)
      </h3>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Mode of Transaction
        </label>
        <div style={{ display: 'flex', gap: 24 }}>
          {(['walk-in', 'visited', 'referral'] as const).map((mode) => (
            <label
              key={mode}
              style={{ display: 'flex', alignItems: 'center', cursor: isFormDisabled ? 'default' : 'pointer' }}
            >
              <input
                type="radio"
                name="mode_of_transaction"
                value={mode}
                checked={formData.mode_of_transaction === mode}
                onChange={onFieldChange('mode_of_transaction')}
                disabled={isFormDisabled}
                style={{ marginRight: 8 }}
              />
              <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>
                {mode.replace('-', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {formData.mode_of_transaction === 'referral' && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: 0 }}>
            For REFERRAL Transaction only.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <ReferralLocationSelector
              label="Referred From"
              value={formData.referred_from}
              onChange={onSetReferredFrom}
              disabled={isFormDisabled}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Referred To
              </label>
              <div style={{ marginTop: 22 }}>
                <input
                  type="text"
                  value="Tagoloan Rural Health Unit (RHU) / ABTC"
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 12,
                    backgroundColor: '#f3f4f6',
                    color: '#1f2937',
                    fontWeight: 600,
                  }}
                />
                <span style={{ display: 'block', fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                  📍 Primary Receiving Facility: Tagoloan RHU
                </span>
              </div>
            </div>
          </div>

          {/* ── 1. PERTINENT HISTORY OF ILLNESS AND FINDINGS ── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Pertinent History of Illness and Findings
              {checkedHistory.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#ecfdf5',
                    color: '#059669',
                    borderRadius: 99,
                    padding: '2px 8px',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  {checkedHistory.length} checked
                </span>
              )}
            </label>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 0' }}>
              Check items to auto-fill the findings box — or write on the side (maaaring pumili o mag-type)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* LEFT: Scrollable checklist */}
              <div
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  maxHeight: 220,
                  overflowY: 'auto',
                  backgroundColor: isFormDisabled ? '#f9fafb' : '#fff',
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
                        padding: '7px 12px',
                        borderBottom:
                          idx < PERTINENT_HISTORY_OPTIONS.length - 1 ? '1px solid #f3f4f6' : 'none',
                        cursor: isFormDisabled ? 'default' : 'pointer',
                        background: isChecked ? '#f0fdf4' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => !isFormDisabled && onToggleHistory(item)}
                        disabled={isFormDisabled}
                        style={{
                          accentColor: '#10b981',
                          width: 14,
                          height: 14,
                          flexShrink: 0,
                          cursor: isFormDisabled ? 'default' : 'pointer',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12.5,
                          color: isChecked ? '#065f46' : '#374151',
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

              {/* RIGHT: Auto-filled + manually editable text box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1v6H2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="7" stroke="#9ca3af" strokeWidth="1.5" />
                  </svg>
                  Auto-fills when checked · Editable
                </div>
                <textarea
                  value={formData.pertinent_history}
                  onChange={onFieldChange('pertinent_history')}
                  disabled={isFormDisabled}
                  rows={8}
                  placeholder={
                    isFormDisabled
                      ? '—'
                      : 'Checked history and findings appear here.\nYou can also type additional clinical notes…'
                  }
                  style={{
                    width: '100%',
                    flex: 1,
                    padding: '10px 12px',
                    border: isFormDisabled ? '1px solid #d1d5db' : '1.5px solid #a7f3d0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    backgroundColor: isFormDisabled ? '#f9fafb' : '#f0fdf4',
                    color: isFormDisabled ? '#374151' : '#065f46',
                    lineHeight: 1.6,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── 2. REASON FOR REFERRAL & ACTION/S TAKEN ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              backgroundColor: '#f9fafb',
              padding: '16px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Reason for Referral (Dahilan ng Referral)
              </label>
              <input
                type="text"
                value={formData.reason_for_referral}
                onChange={onFieldChange('reason_for_referral')}
                disabled={isFormDisabled}
                placeholder="For further evaluation and management."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  outline: 'none',
                  fontWeight: 500,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Action/s Taken (Mga Aksyong Ginawa Bago I-refer)
              </label>
              <textarea
                value={formData.actions_taken}
                onChange={onFieldChange('actions_taken')}
                disabled={isFormDisabled}
                rows={4}
                placeholder={
                  isFormDisabled
                    ? '—'
                    : 'Enter actions taken prior to referral (e.g. Wound washed with soap and water for 15 mins, antiseptic applied, tetanus toxoid given, etc.)'
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  backgroundColor: isFormDisabled ? '#f9fafb' : '#ffffff',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
