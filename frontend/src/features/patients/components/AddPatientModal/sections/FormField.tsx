import React from 'react';

interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, required, error, errorText, children }: FormFieldProps) {
  return (
    <div
      id={id}
      className={`fm-field ${error ? 'fm-field--error' : ''}`}
      style={error ? {
        padding: '8px',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)',
        transition: 'all 0.25s ease',
      } : undefined}
    >
      <label className="fm-label" style={error ? { color: '#dc2626', fontWeight: 700 } : undefined}>
        {label}
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && errorText && (
        <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚠</span> {errorText}
        </div>
      )}
    </div>
  );
}
