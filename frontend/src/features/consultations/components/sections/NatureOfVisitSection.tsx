import React from 'react';
import { NATURE_OF_VISIT_OPTIONS } from '../../constants/consultation.constants';
import { FormField } from '../FormField';

interface NatureOfVisitSectionProps {
  natureOfVisit: string;
  isFormDisabled: boolean;
  isAutomaticallySet?: boolean;
  error?: string;
  onChange: (ev: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export default function NatureOfVisitSection({
  natureOfVisit,
  isFormDisabled,
  isAutomaticallySet = false,
  error,
  onChange,
  onBlur,
}: NatureOfVisitSectionProps) {
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">IV. Nature of Visit</h3>

      <div className="fm-grid">
        <FormField
          id="field-nature_of_visit"
          label="Nature of Visit"
          required
          error={!!error}
          errorText={error}
          className="fm-grid--full"
        >
          {isAutomaticallySet ? (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: 'fit-content',
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--nav-item-active-bg, #ecfdf5)',
                border: '1px solid var(--input-border, #a7f3d0)',
                color: 'var(--text-h, #065f46)',
                fontSize: 13,
              }}
            >
              <strong>New Consultation</strong>
              <span style={{ color: 'var(--nav-item-active-color, #047857)' }}>
                Set automatically for this new or re-exposure episode.
              </span>
            </div>
          ) : (
            <div className="fm-radio-group">
              {NATURE_OF_VISIT_OPTIONS.map((option) => (
                <label key={option.value} className="fm-radio">
                  <input
                    type="radio"
                    name="nature_of_visit"
                    value={option.value}
                    checked={natureOfVisit === option.value}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={isFormDisabled}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </FormField>
      </div>
    </div>
  );
}
