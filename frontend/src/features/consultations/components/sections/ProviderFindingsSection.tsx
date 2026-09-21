import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import { FormField } from '../FormField';

interface ProviderFindingsSectionProps {
  formData: TreatmentFormData;
  isFormDisabled: boolean;
  onFieldChange: (
    key: keyof TreatmentFormData
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function ProviderFindingsSection({
  formData,
  isFormDisabled,
  onFieldChange,
}: ProviderFindingsSectionProps) {
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">VIII. Laboratory Findings & Diagnostic Impression</h3>

      <div className="fm-grid">
        <FormField label="Name of Health Care Provider">
          <input
            className="fm-input"
            type="text"
            name="name_of_provider"
            value={formData.name_of_provider}
            readOnly
            disabled
          />
        </FormField>

        <FormField label="Performed Laboratory Test">
          <input
            className="fm-input"
            type="text"
            name="performed_lab_test"
            value={formData.performed_lab_test}
            onChange={onFieldChange('performed_lab_test')}
            disabled={isFormDisabled}
            placeholder="e.g. Gram Stain, CBC, Culture & Sensitivity"
          />
        </FormField>

        <FormField label="Laboratory Findings / Impression" className="fm-grid--full">
          <textarea
            className="fm-textarea"
            name="laboratory_findings"
            value={formData.laboratory_findings}
            onChange={onFieldChange('laboratory_findings')}
            rows={3}
            disabled={isFormDisabled}
            placeholder="Enter laboratory findings or diagnostic impressions..."
          />
        </FormField>
      </div>
    </div>
  );
}
