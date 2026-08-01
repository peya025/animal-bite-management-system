import React from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from './AddPatientModal.types';

interface ContactSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function ContactSection({ data, onChange }: ContactSectionProps) {
  return (
    <div className="fm-section">
      <p className="fm-section-title">Contact Information</p>
      <div className="fm-grid fm-grid--3" style={{ marginBottom: 14 }}>
        <FormField label="Contact Number">
          <input className="fm-input" value={data.contact_number} onChange={onChange('contact_number')} placeholder="09XXXXXXXXX" />
        </FormField>
        <FormField label="Emergency Contact Name">
          <input className="fm-input" value={data.emergency_contact_name} onChange={onChange('emergency_contact_name')} />
        </FormField>
        <FormField label="Emergency Contact Phone">
          <input className="fm-input" value={data.emergency_contact_phone} onChange={onChange('emergency_contact_phone')} placeholder="09XXXXXXXXX" />
        </FormField>
      </div>
    </div>
  );
}
