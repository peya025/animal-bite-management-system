import React from 'react';
import { NATURE_OF_VISIT_OPTIONS } from '../../constants/consultation.constants';
import { FormField } from '../FormField';

interface NatureOfVisitSectionProps {
  natureOfVisit: string;
  exposureCategory: 'I' | 'II' | 'III' | '';
  isFormDisabled: boolean;
  exposureCategoryError?: string;
  onExposureCategoryChange: (ev: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function NatureOfVisitSection({
  natureOfVisit,
  exposureCategory,
  isFormDisabled,
  exposureCategoryError,
  onExposureCategoryChange,
}: NatureOfVisitSectionProps) {
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">IV. Nature of Visit</h3>

      <div className="fm-grid">
        <FormField
          id="field-nature_of_visit"
          label="Nature of Visit"
          className="fm-grid--full"
          hint="Set by Registration Staff during patient registration (View-only for Doctor)"
        >
          <div className="fm-radio-group" role="radiogroup" aria-label="Nature of Visit">
            {NATURE_OF_VISIT_OPTIONS.map((option) => {
              const isSelected = natureOfVisit === option.value;
              return (
                <label
                  key={option.value}
                  className="fm-radio"
                  style={{
                    cursor: 'default',
                    opacity: isSelected ? 1 : 0.65,
                  }}
                >
                  <input
                    type="radio"
                    name="nature_of_visit"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => {}}
                    disabled={true}
                    readOnly={true}
                    style={{ cursor: 'default' }}
                  />
                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>{option.label}</span>
                </label>
              );
            })}
          </div>
        </FormField>

        <FormField
          id="field-exposure_category"
          label="Exposure Category"
          required
          error={!!exposureCategoryError}
          errorText={exposureCategoryError}
          className="fm-grid--full"
        >
          <div
            role="radiogroup"
            aria-label="Exposure Category"
            aria-required="true"
            className="fm-radio-group"
          >
            {(['I', 'II', 'III'] as const).map((category) => (
              <label key={category} className="fm-radio">
                <input
                  type="radio"
                  name="exposure_category"
                  value={category}
                  checked={exposureCategory === category}
                  onChange={onExposureCategoryChange}
                  disabled={isFormDisabled}
                />
                <span>Category {category}</span>
              </label>
            ))}
          </div>
        </FormField>
      </div>
    </div>
  );
}
