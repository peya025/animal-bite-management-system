import React from 'react';
import type { TreatmentFormData } from '../../types/consultation.types';
import { splitBloodPressure } from '../../utils/consultationHelpers';
import { FormField } from '../FormField';
import VitalStatusIndicator from '../VitalStatusIndicator';
import { getBloodPressureStatus, getTemperatureStatus } from '../../utils/vitalSignStatus';

interface VitalsConsultationSectionProps {
  formData: TreatmentFormData;
  // isFormDisabled and onFieldChange/onSetReferredBy are kept in the interface
  // for backward-compatibility with call sites but are no longer used —
  // Section III is always read-only in Form 2.
  isFormDisabled: boolean;
  onFieldChange: (
    key: keyof TreatmentFormData
  ) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSetReferredBy: (val: string) => void;
}

/** Style for every read-only value cell */
const RO: React.CSSProperties = {
  display: 'block',
  minHeight: 46,
  padding: '11px 12px',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--input-text, #111827)',
  background: 'var(--bg-secondary, #f8fafc)',
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: 8,
  lineHeight: '1.5',
  boxSizing: 'border-box',
};

const EMPTY = (
  <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-muted, #9ca3af)' }}>
    —
  </span>
);

/**
 * III. Consultation Details & Vitals — Form 2 (Doctor view)
 *
 * Always read-only. Values were entered by Registration Staff during patient
 * registration and stored in treatment_records. The Doctor can VIEW but never
 * EDIT these fields from Form 2.
 */
export default function VitalsConsultationSection({
  formData,
}: VitalsConsultationSectionProps) {
  const { systolic, diastolic } = splitBloodPressure(formData.blood_pressure);
  const bloodPressureStatus = getBloodPressureStatus(systolic, diastolic);
  const temperatureStatus = getTemperatureStatus(formData.temperature);

  const formatTime = (t: string) => {
    if (!t) return null;
    if (/(AM|PM)/i.test(t)) return t;
    try {
      const parts = t.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return t;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch {
      return t;
    }
  };

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">III. Consultation Details &amp; Vitals</h3>

      {/* Banner — tells the Doctor these values came from Registration Staff */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          background: 'var(--info-bg, #eff6ff)',
          border: '1px solid var(--info-border, #bfdbfe)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: 'var(--info-text, #1d4ed8)',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
        <span>
          <strong>Entered by Registration Staff during patient registration.</strong>{' '}
          These values are read-only. Only Registration Staff can update them through Patient Registration.
        </span>
      </div>

      <div className="fm-grid">
        {/* Date of Consultation */}
        <FormField label="Date of Consultation">
          <span style={RO}>
            {formData.date_of_consultation
              ? new Date(formData.date_of_consultation + 'T00:00:00').toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })
              : EMPTY}
          </span>
        </FormField>

        {/* Consultation Time */}
        <FormField label="Consultation Time (AM/PM)">
          <span style={RO}>
            {formatTime(formData.consultation_time) || EMPTY}
          </span>
        </FormField>

        {/* Blood Pressure */}
        <FormField label="Blood Pressure (mmHg)" hint="Systolic / Diastolic">
          <span
            style={{
              ...RO,
              borderColor: bloodPressureStatus?.borderColor || RO.borderColor,
              background: bloodPressureStatus?.backgroundColor || RO.background,
            }}
          >
            {formData.blood_pressure
              ? (
                <>
                  {systolic}
                  <span style={{ margin: '0 4px', color: 'var(--text-secondary, #6b7280)' }}>/</span>
                  {diastolic}{' '}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary, #6b7280)' }}>mmHg</span>
                </>
              )
              : EMPTY}
          </span>
          {bloodPressureStatus && formData.blood_pressure && (
            <VitalStatusIndicator status={bloodPressureStatus} />
          )}
        </FormField>

        {/* Temperature */}
        <FormField label="Temperature (°C)">
          <span
            style={{
              ...RO,
              borderColor: (temperatureStatus && formData.temperature) ? temperatureStatus.borderColor : RO.borderColor,
              background: (temperatureStatus && formData.temperature) ? temperatureStatus.backgroundColor : RO.background,
            }}
          >
            {formData.temperature
              ? (
                <>
                  {formData.temperature}{' '}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary, #6b7280)' }}>°C</span>
                </>
              )
              : EMPTY}
          </span>
          {temperatureStatus && formData.temperature && (
            <VitalStatusIndicator status={temperatureStatus} />
          )}
        </FormField>

        {/* Height */}
        <FormField label="Height (cm)">
          <span style={RO}>
            {formData.height
              ? (
                <>
                  {formData.height}{' '}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary, #6b7280)' }}>cm</span>
                </>
              )
              : EMPTY}
          </span>
        </FormField>

        {/* Weight */}
        <FormField label="Weight (kg)">
          <span style={RO}>
            {formData.weight
              ? (
                <>
                  {formData.weight}{' '}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary, #6b7280)' }}>kg</span>
                </>
              )
              : EMPTY}
          </span>
        </FormField>

        {/* Name of Attending Provider */}
        <FormField label="Name of Attending Provider" className="fm-grid--full" hint="From patient's referral paper form">
          <span style={RO}>
            {formData.name_of_attending_provider || EMPTY}
          </span>
        </FormField>

        {/* Referred By — plain text, not a dropdown */}
        <div className="fm-field" style={{ gridColumn: '1 / -1' }}>
          <label className="fm-label">Referred by</label>
          <span style={{ ...RO, display: 'block', marginTop: 4 }}>
            {formData.referred_by || EMPTY}
          </span>
        </div>
      </div>
    </div>
  );
}
