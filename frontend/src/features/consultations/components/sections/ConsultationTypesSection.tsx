import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import type { ConsultationTypesMap } from '../../types/consultation.types';
import { CONSULTATION_TYPE_ITEMS } from '../../constants/consultation.constants';

interface ConsultationTypesSectionProps {
  consultationTypes: ConsultationTypesMap;
  isFormDisabled: boolean;
  error?: string;
  onChange: (
    key: keyof ConsultationTypesMap
  ) => (ev: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ConsultationTypesSection({
  consultationTypes,
  isFormDisabled,
  error,
  onChange,
}: ConsultationTypesSectionProps) {
  return (
    <div
      id="field-consultation_types"
      style={{
        marginBottom: 32,
        padding: error ? '16px' : '0px',
        border: error ? '2px solid #ef4444' : 'none',
        borderRadius: '10px',
        backgroundColor: error ? '#fef2f2' : 'transparent',
        boxShadow: error ? '0 0 0 4px rgba(239, 68, 68, 0.12)' : 'none',
        transition: 'all 0.25s ease',
      }}
    >
      <h3
        style={{
          color: error ? '#dc2626' : '#10b981',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 16,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Type of Consultation / Purpose of Visit <span style={{ color: '#ef4444' }}>*</span>
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}>
        {CONSULTATION_TYPE_ITEMS.map((type) => (
          <label
            key={type.key}
            style={{ display: 'flex', alignItems: 'center', cursor: isFormDisabled ? 'default' : 'pointer' }}
          >
            <input
              type="checkbox"
              checked={consultationTypes[type.key]}
              onChange={onChange(type.key)}
              disabled={isFormDisabled}
              style={{ marginRight: 8, accentColor: error ? '#ef4444' : undefined }}
            />
            <span
              style={{
                fontSize: 13,
                color: error ? '#991b1b' : '#374151',
              }}
            >
              {type.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <div
          style={{
            color: '#dc2626',
            fontSize: 12,
            fontWeight: 600,
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={14} strokeWidth={2} /> {error}
        </div>
      )}
    </div>
  );
}
