import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';

interface PatientInfoSectionProps {
  formData: TreatmentFormData;
}

export default function PatientInfoSection({ formData }: PatientInfoSectionProps) {
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
        I. Patient Information (Impormasyon ng Pasyente)
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Last Name (Apelyido)
          </label>
          <input
            type="text"
            value={formData.last_name}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            First Name (Pangalan)
          </label>
          <input
            type="text"
            value={formData.first_name}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Middle Name (Gitnang Pangalan)
          </label>
          <input
            type="text"
            value={formData.middle_name}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Suffix (e.g. Jr., Sr., II, III)
          </label>
          <input
            type="text"
            value={formData.suffix}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Age (Edad)
          </label>
          <input
            type="text"
            value={formData.age}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Residential Address (Tirahan) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.address}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
        </div>
      </div>
    </div>
  );
}
