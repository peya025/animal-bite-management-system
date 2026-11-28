import React from 'react';

export interface ChipOption {
  key: string;
  label: string;
}

interface ChipGroupProps {
  label?: string;
  options: readonly ChipOption[] | ChipOption[];
  selectedKeys: Record<string, boolean>;
  onToggle: (key: string) => void;
  disabled?: boolean;
  error?: string;
  ariaLabel?: string;
}

const BORDER_RADIUS = 8;

export function ChipGroup({
  label,
  options,
  selectedKeys,
  onToggle,
  disabled = false,
  error,
  ariaLabel,
}: ChipGroupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {label && (
        <span style={{ fontSize: 13, fontWeight: 600, color: error ? '#dc2626' : 'var(--text-h, #374151)' }}>
          {label}
        </span>
      )}
      <div
        role="group"
        aria-label={ariaLabel || label}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          padding: error ? 4 : 0,
          border: error ? '1.5px solid #ef4444' : '1px solid transparent',
          borderRadius: BORDER_RADIUS,
          boxShadow: error ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {options.map((opt) => {
          const isSelected = Boolean(selectedKeys[opt.key]);
          return (
            <button
              key={opt.key}
              type="button"
              role="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onToggle(opt.key)}
              style={{
                borderRadius: BORDER_RADIUS,
                border: isSelected
                  ? '1.5px solid #10b981'
                  : error
                  ? '1px solid #fca5a5'
                  : '1px solid var(--border-color, #e2e8f0)',
                background: isSelected
                  ? 'var(--chip-selected-bg, #ecfdf5)'
                  : 'var(--card-bg-solid, #ffffff)',
                color: isSelected
                  ? '#065f46'
                  : error
                  ? '#991b1b'
                  : 'var(--text-secondary, #475569)',
                fontWeight: isSelected ? 600 : 400,
                fontSize: 13,
                padding: '6px 14px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onFocus={(e) => {
                if (error) {
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';
                } else {
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
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
      {error && (
        <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500, marginTop: 2, display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}
