import React from 'react';
import type { ConsultationTypesMap } from '../../types/consultation.types';
import { CONSULTATION_TYPE_ITEMS } from '../../constants/consultation.constants';
import { FormField } from '../FormField';

interface ConsultationTypesSectionProps {
  consultationTypes: ConsultationTypesMap;
  isFormDisabled: boolean;
  error?: string;
  onChange: (
    key: keyof ConsultationTypesMap
  ) => (ev: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ConsultationTypesSection({
  consultationTypes,
  isFormDisabled,
  error,
  onChange,
}: ConsultationTypesSectionProps) {
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">V. Type of Consultation / Purpose of Visit</h3>

      <div className="fm-grid">
        <FormField
          id="field-consultation_types"
          label="Purpose of Visit"
          required
          error={!!error}
          errorText={error}
          className="fm-grid--full"
        >
          <div className="fm-grid fm-grid--2" style={{ gap: '10px 20px', marginTop: 4 }}>
            {CONSULTATION_TYPE_ITEMS.map((type) => (
              <label
                key={type.key}
                className="fm-radio"
                style={{
                  cursor: isFormDisabled ? 'default' : 'pointer',
                  padding: '4px 8px',
                }}
              >
                <input
                  type="checkbox"
                  name={`consultation_types_${type.key}`}
                  checked={consultationTypes[type.key]}
                  onChange={onChange(type.key)}
                  disabled={isFormDisabled}
                  style={{
                    accentColor: '#047857',
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    cursor: isFormDisabled ? 'default' : 'pointer',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text, #374151)' }}>
                  {type.label}
                </span>
              </label>
            ))}
          </div>
        </FormField>
      </div>
    </div>
  );
}
