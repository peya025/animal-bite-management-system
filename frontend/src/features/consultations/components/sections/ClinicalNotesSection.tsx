import React from 'react';
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
              Diagnosis
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
          <span className="registration-field-hint" style={{ marginBottom: 8, display: 'block' }}>
            Check a diagnosis to auto-fill the box — or type manually (maaaring pumili o mag-type)
          </span>

          <div className="fm-grid">
            {/* LEFT: Scrollable checklist */}
            <div
              style={{
                border: '1px solid var(--text-secondary, #6b7280)',
                borderRadius: 8,
                maxHeight: 230,
                overflowY: 'auto',
                backgroundColor: isFormDisabled ? 'var(--bg-secondary, #f1f5f9)' : 'var(--input-bg, #fff)',
              }}
            >
              {ANIMAL_BITE_DIAGNOSES.map((diag, idx) => {
                const isChecked = checkedDiagnoses.includes(diag);
                return (
                  <label
                    key={diag}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderBottom: idx < ANIMAL_BITE_DIAGNOSES.length - 1 ? '1px solid var(--border-glow, #f1f5f9)' : 'none',
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
              })}
            </div>

            {/* RIGHT: Auto-filled + manually editable text box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v6H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Auto-fills when checked · Editable
              </div>
              <textarea
                className="fm-textarea"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={onFieldChange('diagnosis')}
                disabled={isFormDisabled}
                rows={9}
                style={{ minHeight: 190 }}
                placeholder={isFormDisabled ? '—' : 'Checked items appear here.\nYou can also type additional notes…'}
              />
              {!isFormDisabled && (
                <button
                  type="button"
                  onClick={onClearDiagnoses}
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: 11,
                    color: 'var(--text-secondary, #6b7280)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
