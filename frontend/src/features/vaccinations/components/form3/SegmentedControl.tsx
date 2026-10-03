import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string = string> {
  label?: string;
  name?: string;
  options: readonly SegmentOption<T>[] | SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  error?: string;
  ariaLabel?: string;
}

const BORDER_RADIUS = 8;

export function SegmentedControl<T extends string = string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  error,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {label && (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h, #374151)' }}>
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={ariaLabel || label}
        style={{
          display: 'inline-flex',
          background: 'var(--bg-secondary, #f1f5f9)',
          border: error ? '1px solid #ef4444' : '1px solid var(--border-color, #e2e8f0)',
          borderRadius: BORDER_RADIUS,
          padding: 3,
          gap: 2,
          width: 'fit-content',
          maxWidth: '100%',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              style={{
                border: 'none',
                borderRadius: BORDER_RADIUS,
                background: isSelected ? '#047857' : 'transparent',
                color: isSelected ? '#ffffff' : 'var(--text-secondary, #475569)',
                fontWeight: isSelected ? 600 : 500,
                fontSize: 13,
                padding: '7px 16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                whiteSpace: 'nowrap',
                outline: 'none',
              }}
              onFocus={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.3)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
