import React from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';

interface ContactSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  errors?: Record<string, string>;
}

export function ContactSection({ data, onChange, errors = {} }: ContactSectionProps) {
  return (
    <div className="fm-section">
      <p className="fm-section-title">Contact Information</p>
      <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
        <FormField
          id="field-contact_number"
          label="Contact Number (Mobile)"
          error={!!errors.contact_number}
          errorText={errors.contact_number}
        >
          <input
            className="fm-input"
            value={data.contact_number}
            onChange={onChange('contact_number')}
            placeholder="09XXXXXXXXX"
            maxLength={11}
            type="tel"
            style={errors.contact_number ? { borderColor: '#ef4444' } : undefined}
          />
        </FormField>
        <FormField label="Email Address (Optional)">
          <input className="fm-input" value={data.email} onChange={onChange('email')} placeholder="patient@example.com" type="email" />
        </FormField>
      </div>
      <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
        <FormField label="Emergency Contact Name">
          <input className="fm-input" value={data.emergency_contact_name} onChange={onChange('emergency_contact_name')} />
        </FormField>
        <FormField
          id="field-emergency_contact_phone"
          label="Emergency Contact Phone"
          error={!!errors.emergency_contact_phone}
          errorText={errors.emergency_contact_phone}
        >
          <input
            className="fm-input"
            value={data.emergency_contact_phone}
            onChange={onChange('emergency_contact_phone')}
            placeholder="09XXXXXXXXX"
            maxLength={11}
            type="tel"
            style={errors.emergency_contact_phone ? { borderColor: '#ef4444' } : undefined}
          />
        </FormField>
      </div>
    </div>
  );
}
