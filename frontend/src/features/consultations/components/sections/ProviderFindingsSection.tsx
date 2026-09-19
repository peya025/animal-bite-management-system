import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';

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
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Name of Health Care Provider
          </label>
          <input
            type="text"
            value={formData.name_of_provider}
            readOnly
            disabled
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              cursor: 'not-allowed',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Performed Laboratory Test
          </label>
          <input
            type="text"
            value={formData.performed_lab_test}
            onChange={onFieldChange('performed_lab_test')}
            disabled={isFormDisabled}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: isFormDisabled ? '#f9fafb' : undefined,
            }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          Laboratory Findings / Impression
        </label>
        <textarea
          value={formData.laboratory_findings}
          onChange={onFieldChange('laboratory_findings')}
          rows={3}
          disabled={isFormDisabled}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
            backgroundColor: isFormDisabled ? '#f9fafb' : undefined,
          }}
        />
      </div>
    </div>
  );
}
