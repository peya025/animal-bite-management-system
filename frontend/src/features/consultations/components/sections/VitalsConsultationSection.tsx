import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import ReferralLocationSelector from '../ReferralLocationSelector';
import { splitBloodPressure, combineBloodPressure } from '../../utils/consultationHelpers';
import { FormField } from '../FormField';
import VitalStatusIndicator from '../VitalStatusIndicator';
import { getBloodPressureStatus, getTemperatureStatus } from '../../utils/vitalSignStatus';

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
  const bloodPressureStatus = getBloodPressureStatus(systolic, diastolic);
  const temperatureStatus = getTemperatureStatus(formData.temperature);

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
    <div className="fm-section">
      <h3 className="fm-section-title">III. Consultation Details & Vitals</h3>

      <div className="fm-grid">
        <FormField label="Date of Consultation">
          <input
            className="fm-input"
            type="date"
            name="date_of_consultation"
            value={formData.date_of_consultation}
            onChange={onFieldChange('date_of_consultation')}
            disabled={isFormDisabled}
          />
        </FormField>

        <FormField label="Consultation Time (AM/PM)">
          <input
            className="fm-input"
            type="time"
            name="consultation_time"
            value={formData.consultation_time}
            onChange={onFieldChange('consultation_time')}
            disabled={isFormDisabled}
          />
        </FormField>

        <FormField label="Blood Pressure (mmHg)" hint="Systolic / Diastolic">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${bloodPressureStatus?.borderColor || 'var(--text-secondary, #6b7280)'}`,
              borderRadius: 8,
              minHeight: 46,
              height: 46,
              background: bloodPressureStatus?.backgroundColor || (isFormDisabled ? 'var(--bg-secondary, #f1f5f9)' : 'var(--input-bg, #fff)'),
              overflow: 'hidden',
              boxSizing: 'border-box',
              padding: '0 8px',
            }}
          >
            <input
              type="number"
              min={0}
              max={300}
              name="bp_systolic"
              value={systolic}
              onChange={handleSystolicChange}
              placeholder="120"
              disabled={isFormDisabled}
              style={{
                width: '45%',
                padding: '8px',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                backgroundColor: 'transparent',
                textAlign: 'center',
                color: 'var(--input-text, #111827)',
                fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary, #6b7280)', userSelect: 'none' }}>
              /
            </span>
            <input
              type="number"
              min={0}
              max={200}
              name="bp_diastolic"
              value={diastolic}
              onChange={handleDiastolicChange}
              placeholder="80"
              disabled={isFormDisabled}
              style={{
                width: '45%',
                padding: '8px',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                backgroundColor: 'transparent',
                textAlign: 'center',
                color: 'var(--input-text, #111827)',
                fontFamily: 'inherit',
              }}
            />
          </div>
          {bloodPressureStatus && <VitalStatusIndicator status={bloodPressureStatus} />}
        </FormField>

        <FormField label="Temperature (°C)">
          <input
            className="fm-input"
            type="text"
            name="temperature"
            value={formData.temperature}
            onChange={onFieldChange('temperature')}
            placeholder="36.5"
            disabled={isFormDisabled}
            style={temperatureStatus ? {
              borderColor: temperatureStatus.borderColor,
              backgroundColor: temperatureStatus.backgroundColor,
            } : undefined}
          />
          {temperatureStatus && <VitalStatusIndicator status={temperatureStatus} />}
        </FormField>

        <FormField label="Height (cm)">
          <input
            className="fm-input"
            type="text"
            name="height"
            value={formData.height}
            onChange={onFieldChange('height')}
            placeholder="170"
            disabled={isFormDisabled}
          />
        </FormField>

        <FormField label="Weight (kg)">
          <input
            className="fm-input"
            type="text"
            name="weight"
            value={formData.weight}
            onChange={onFieldChange('weight')}
            placeholder="70"
            disabled={isFormDisabled}
          />
        </FormField>

        <FormField label="Name of Attending Provider" className="fm-grid--full">
          <input
            className="fm-input"
            type="text"
            name="name_of_attending_provider"
            value={formData.name_of_attending_provider}
            readOnly
            disabled
          />
        </FormField>

        <ReferralLocationSelector
          label="Referred by"
          value={formData.referred_by}
          onChange={onSetReferredBy}
          disabled={isFormDisabled}
        />
      </div>
    </div>
  );
}
