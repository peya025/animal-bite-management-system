import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import { ANIMAL_BITE_DIAGNOSES } from '../../constants/consultation.constants';

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
        Clinical Notes
      </h3>

      {/* Chief Complaints */}
      <div
        id="field-chief_complaints"
        style={{
          marginBottom: 16,
          padding: fieldErrors.chief_complaints ? '16px' : '0px',
          border: fieldErrors.chief_complaints ? '2px solid #ef4444' : 'none',
          borderRadius: '10px',
          backgroundColor: fieldErrors.chief_complaints ? '#fef2f2' : 'transparent',
          boxShadow: fieldErrors.chief_complaints ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 700,
            color: fieldErrors.chief_complaints ? '#dc2626' : '#374151',
            marginBottom: 6,
          }}
        >
          Chief Complaints <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          value={formData.chief_complaints}
          onChange={onFieldChange('chief_complaints')}
          onBlur={onFieldBlur('chief_complaints')}
          rows={3}
          disabled={isFormDisabled}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: fieldErrors.chief_complaints ? '2px solid #ef4444' : '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
            backgroundColor: isFormDisabled ? '#f9fafb' : fieldErrors.chief_complaints ? '#ffffff' : undefined,
            boxShadow: fieldErrors.chief_complaints ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
            outline: 'none',
          }}
        />
        {fieldErrors.chief_complaints && (
          <div
            style={{
              color: '#dc2626',
              fontSize: 12,
              fontWeight: 600,
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>⚠</span> {fieldErrors.chief_complaints}
          </div>
        )}
      </div>

      {/* Diagnosis: Checklist (left) + Text Box (right) */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
          Diagnosis
          {checkedDiagnoses.length > 0 && (
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
              {checkedDiagnoses.length} checked
            </span>
          )}
        </label>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 0' }}>
          Check a diagnosis to auto-fill the box — or type manually (maaaring pumili o mag-type)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* LEFT: Scrollable checklist */}
          <div
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              maxHeight: 230,
              overflowY: 'auto',
              backgroundColor: isFormDisabled ? '#f9fafb' : '#fff',
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
                    padding: '7px 12px',
                    borderBottom: idx < ANIMAL_BITE_DIAGNOSES.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: isFormDisabled ? 'default' : 'pointer',
                    background: isChecked ? '#f0fdf4' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => !isFormDisabled && onToggleDiagnosis(diag)}
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
                    {diag}
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
              value={formData.diagnosis}
              onChange={onFieldChange('diagnosis')}
              disabled={isFormDisabled}
              rows={9}
              placeholder={isFormDisabled ? '—' : 'Checked items appear here.\nYou can also type additional notes…'}
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
            {!isFormDisabled && (
              <button
                type="button"
                onClick={onClearDiagnoses}
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 11,
                  color: '#9ca3af',
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
  );
}
