import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import ReferralLocationSelector from '../ReferralLocationSelector';
import { splitBloodPressure, combineBloodPressure } from '../../utils/consultationHelpers';

interface VitalsConsultationSectionProps {
  formData: TreatmentFormData;
  isFormDisabled: boolean;
  onFieldChange: (
    key: keyof TreatmentFormData
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSetReferredBy: (val: string) => void;
}

export default function VitalsConsultationSection({
  formData,
  isFormDisabled,
  onFieldChange,
  onSetReferredBy,
}: VitalsConsultationSectionProps) {
  const { systolic, diastolic } = splitBloodPressure(formData.blood_pressure);

  const handleSystolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sys = e.target.value;
    const combined = combineBloodPressure(sys, diastolic);
    const synth = { target: { value: combined } } as React.ChangeEvent<HTMLInputElement>;
    onFieldChange('blood_pressure')(synth);
  };

  const handleDiastolicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dia = e.target.value;
    const combined = combineBloodPressure(systolic, dia);
    const synth = { target: { value: combined } } as React.ChangeEvent<HTMLInputElement>;
    onFieldChange('blood_pressure')(synth);
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Date of Consultation
          </label>
          <input
            type="date"
            value={formData.date_of_consultation}
            onChange={onFieldChange('date_of_consultation')}
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
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Consultation Time (AM/PM)
          </label>
          <input
            type="time"
            value={formData.consultation_time}
            onChange={onFieldChange('consultation_time')}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Blood Pressure
          </label>
          {/* Split systolic / diastolic input — stores as "120/80" */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              overflow: 'hidden',
              backgroundColor: isFormDisabled ? '#f9fafb' : '#fff',
            }}
          >
            <input
              type="number"
              min={0}
              max={300}
              value={systolic}
              onChange={handleSystolicChange}
              placeholder="120"
              disabled={isFormDisabled}
              style={{
                width: '45%',
                padding: '8px 10px',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                backgroundColor: 'transparent',
                textAlign: 'center',
                MozAppearance: 'textfield',
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#6b7280', flexShrink: 0, userSelect: 'none' }}>
              /
            </span>
            <input
              type="number"
              min={0}
              max={200}
              value={diastolic}
              onChange={handleDiastolicChange}
              placeholder="80"
              disabled={isFormDisabled}
              style={{
                width: '45%',
                padding: '8px 10px',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                backgroundColor: 'transparent',
                textAlign: 'center',
                MozAppearance: 'textfield',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Systolic / Diastolic (mmHg)</div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Temperature (°C)
          </label>
          <input
            type="text"
            value={formData.temperature}
            onChange={onFieldChange('temperature')}
            placeholder="36.5"
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
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Height (cm)
          </label>
          <input
            type="text"
            value={formData.height}
            onChange={onFieldChange('height')}
            placeholder="170"
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
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Weight (kg)
          </label>
          <input
            type="text"
            value={formData.weight}
            onChange={onFieldChange('weight')}
            placeholder="70"
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

      {/* Provider Details */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Name of Attending Provider
            </label>
            <input
              type="text"
              value={formData.name_of_attending_provider}
              onChange={onFieldChange('name_of_attending_provider')}
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
          <div>
            <ReferralLocationSelector
              label="Referred by"
              value={formData.referred_by}
              onChange={onSetReferredBy}
              disabled={isFormDisabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
