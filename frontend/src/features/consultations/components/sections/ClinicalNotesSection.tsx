import React, { useMemo, useRef, useState } from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import { ANIMAL_BITE_DIAGNOSES } from '../../constants/consultation.constants';
import { FormField } from '../FormField';

interface ClinicalNotesSectionProps {
  formData: TreatmentFormData;
  isFormDisabled: boolean;
  checkedDiagnoses: string[];
  fieldErrors: Record<string, string>;
  onFieldChange: (
    key: keyof TreatmentFormData
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onFieldBlur: (key: string) => () => void;
  onToggleDiagnosis: (item: string) => void;
  onClearDiagnoses: () => void;
}

export default function ClinicalNotesSection({
  formData,
  isFormDisabled,
  checkedDiagnoses,
  fieldErrors,
  onFieldChange,
  onFieldBlur,
  onToggleDiagnosis,
  onClearDiagnoses,
}: ClinicalNotesSectionProps) {
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredDiagnoses = useMemo(() => {
    const q = diagnosisSearch.trim().toLowerCase();
    if (!q) return ANIMAL_BITE_DIAGNOSES;
    return ANIMAL_BITE_DIAGNOSES.filter((diag) => diag.toLowerCase().includes(q));
  }, [diagnosisSearch]);

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">VI. Clinical Notes & Assessment</h3>

      <div className="fm-grid">
        {/* Chief Complaints (Required) */}
        <FormField
          id="field-chief_complaints"
          label="Chief Complaints"
          required
          error={!!fieldErrors.chief_complaints}
          errorText={fieldErrors.chief_complaints}
          className="fm-grid--full"
        >
          <textarea
            className="fm-textarea"
            name="chief_complaints"
            value={formData.chief_complaints}
            onChange={onFieldChange('chief_complaints')}
            onBlur={onFieldBlur('chief_complaints')}
            rows={3}
            disabled={isFormDisabled}
            placeholder="Enter chief complaints (e.g. Dog bite over right leg with active bleeding)"
          />
        </FormField>

        {/* Diagnosis: Checklist (left) + Text Box (right) */}
        <div className="fm-field fm-grid--full" style={{ scrollMarginBlock: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <label className="fm-label">
              Doctor's Diagnosis
              {checkedDiagnoses.length > 0 && (
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
                  {checkedDiagnoses.length} checked
                </span>
              )}
            </label>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px 12px',
              marginBottom: 8,
            }}
          >
            <span className="registration-field-hint" style={{ marginTop: 0 }}>
              Check a diagnosis to auto-fill the box — or type manually (maaaring pumili o mag-type)
            </span>
            <span
              style={{
                fontSize: 11.5,
                color: 'var(--text-secondary, #6b7280)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1v6H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Auto-fills when checked · Editable
            </span>
          </div>

          <div className="diagnosis-panels-grid">
            {/* LEFT: Checklist container with integrated search bar at top */}
            <div
              className={`diagnosis-checklist-box${isFormDisabled ? ' diagnosis-checklist-box--disabled' : ''}`}
            >
              <div className="diagnosis-search-header">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ color: 'var(--text-secondary, #6b7280)', flexShrink: 0, pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="ss-search-input diagnosis-search-input"
                  value={diagnosisSearch}
                  onChange={(e) => setDiagnosisSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (e.key === 'Escape' && diagnosisSearch) {
                      e.preventDefault();
                      e.stopPropagation();
                      setDiagnosisSearch('');
                    }
                  }}
                  disabled={isFormDisabled}
                  placeholder="Search diagnosis..."
                  aria-label="Search doctor's diagnosis checklist"
                  autoComplete="off"
                />
                {diagnosisSearch && !isFormDisabled && (
                  <button
                    type="button"
                    className="diagnosis-search-clear"
                    aria-label="Clear diagnosis search"
                    onClick={() => {
                      setDiagnosisSearch('');
                      searchInputRef.current?.focus();
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="diagnosis-checklist-list">
                {filteredDiagnoses.length === 0 ? (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--text-secondary, #6b7280)',
                    }}
                  >
                    No matching diagnosis found
                  </div>
                ) : (
                  filteredDiagnoses.map((diag, idx) => {
                    const isChecked = checkedDiagnoses.includes(diag);
                    return (
                      <label
                        key={diag}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 14px',
                          borderBottom: idx < filteredDiagnoses.length - 1 ? '1px solid var(--border-glow, #f1f5f9)' : 'none',
                          cursor: isFormDisabled ? 'default' : 'pointer',
                          background: isChecked ? 'var(--nav-item-active-bg, #f0fdf4)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => !isFormDisabled && onToggleDiagnosis(diag)}
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
                          {diag}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: Auto-filled + manually editable text box */}
            <textarea
              className="fm-textarea diagnosis-textarea"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={onFieldChange('diagnosis')}
              disabled={isFormDisabled}
              placeholder={isFormDisabled ? '—' : 'Checked items appear here.\nYou can also type additional notes…'}
            />
          </div>

          {!isFormDisabled && (
            <div className="diagnosis-clear-wrap">
              <button
                type="button"
                className="diagnosis-clear-btn"
                onClick={onClearDiagnoses}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
