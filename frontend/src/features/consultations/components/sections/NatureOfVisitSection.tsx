import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { NATURE_OF_VISIT_OPTIONS } from '../../constants/consultation.constants';

interface NatureOfVisitSectionProps {
  natureOfVisit: string;
  isFormDisabled: boolean;
  error?: string;
  onChange: (ev: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export default function NatureOfVisitSection({
  natureOfVisit,
  isFormDisabled,
  error,
  onChange,
  onBlur,
}: NatureOfVisitSectionProps) {
  return (
    <div
      id="field-nature_of_visit"
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
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 700,
          color: error ? '#dc2626' : '#374151',
          marginBottom: 8,
        }}
      >
        Nature of Visit <span style={{ color: '#ef4444' }}>*</span>
      </label>
      <div style={{ display: 'flex', gap: 24 }}>
        {NATURE_OF_VISIT_OPTIONS.map((option) => (
          <label
            key={option.value}
            style={{ display: 'flex', alignItems: 'center', cursor: isFormDisabled ? 'default' : 'pointer' }}
          >
            <input
              type="radio"
              name="nature_of_visit"
              value={option.value}
              checked={natureOfVisit === option.value}
              onChange={onChange}
              onBlur={onBlur}
              disabled={isFormDisabled}
              style={{ marginRight: 8, accentColor: error ? '#ef4444' : undefined }}
            />
            <span
              style={{
                fontSize: 13,
                color: error ? '#991b1b' : '#374151',
                fontWeight: error ? 600 : 400,
              }}
            >
              {option.label}
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
            marginTop: 8,
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
