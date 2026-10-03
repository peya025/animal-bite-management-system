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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h, #374151)' }}>
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
                  : '1px solid var(--border-color, #e2e8f0)',
                background: isSelected
                  ? 'var(--chip-selected-bg, #ecfdf5)'
                  : 'var(--card-bg-solid, #ffffff)',
                color: isSelected
                  ? '#065f46'
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
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
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
