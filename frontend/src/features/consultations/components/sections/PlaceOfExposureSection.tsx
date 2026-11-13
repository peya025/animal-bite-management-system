import React from 'react';
import type { AddressLocationState } from '../../../patients/hooks/useAddressLocation';

const BORDER_RADIUS = 8;

interface PlaceOfExposureSectionProps {
  expLoc: AddressLocationState;
  purok: string;
  setPurok: (val: string) => void;
  fullAddress?: string;
  error?: string;
  onClearError?: () => void;
  disabled?: boolean;
  required?: boolean;
}

export default function PlaceOfExposureSection({
  expLoc,
  purok,
  setPurok,
  fullAddress,
  error,
  onClearError,
  disabled = false,
  required = true,
}: PlaceOfExposureSectionProps) {
  return (
    <div
      id="field-place_of_exposure"
      className="fm-section"
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--border-light, #e5e7eb)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: error ? '#dc2626' : 'var(--text-h, #374151)',
          }}
        >
          Place of Exposure {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        <button
          type="button"
          onClick={() => {
            expLoc.setUseManual(!expLoc.useManual);
            onClearError?.();
          }}
          disabled={disabled}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 8px',
            color: '#047857',
            fontSize: 12,
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {expLoc.useManual ? 'Switch to Dropdown' : 'Switch to Manual'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color:
                error && (expLoc.useManual ? !expLoc.manualMun.trim() : !expLoc.municipality)
                  ? '#dc2626'
                  : 'var(--text-secondary, #6b7280)',
              marginBottom: 4,
            }}
          >
            Municipality {required && <span style={{ color: '#dc2626' }}>*</span>}
          </label>
          {expLoc.useManual ? (
            <input
              type="text"
              value={expLoc.manualMun}
              onChange={(e) => {
                expLoc.setManualMun(e.target.value);
                if (error) onClearError?.();
              }}
              placeholder="e.g. Tagoloan"
              disabled={disabled}
              style={{
                width: '100%',
                padding: '8px 12px',
                border:
                  error && !expLoc.manualMun.trim()
                    ? '1.5px solid #ef4444'
                    : '1px solid var(--input-border, #d1d5db)',
                borderRadius: BORDER_RADIUS,
                fontSize: 13,
                backgroundColor: disabled ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                color: 'var(--input-text, #111827)',
                boxSizing: 'border-box',
                outline: 'none',
                boxShadow: error && !expLoc.manualMun.trim() ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
              }}
            />
          ) : (
            <select
              value={expLoc.municipality}
              onChange={(e) => {
                expLoc.setMunicipality(e.target.value);
                if (error) onClearError?.();
              }}
              disabled={disabled || expLoc.loadingMun}
              style={{
                width: '100%',
                padding: '8px 12px',
                border:
                  error && !expLoc.municipality
                    ? '1.5px solid #ef4444'
                    : '1px solid var(--input-border, #d1d5db)',
                borderRadius: BORDER_RADIUS,
                fontSize: 13,
                backgroundColor:
                  disabled || expLoc.loadingMun
                    ? 'var(--bg-secondary, #f9fafb)'
                    : 'var(--card-bg-solid, #ffffff)',
                color: 'var(--input-text, #111827)',
                boxSizing: 'border-box',
                outline: 'none',
                boxShadow: error && !expLoc.municipality ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
              }}
            >
              <option value="">{expLoc.loadingMun ? 'Loading…' : '— Select —'}</option>
              {expLoc.municipalities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color:
                error && (expLoc.useManual ? !expLoc.manualBrgy.trim() : !expLoc.barangay)
                  ? '#dc2626'
                  : 'var(--text-secondary, #6b7280)',
              marginBottom: 4,
            }}
          >
            Barangay {required && <span style={{ color: '#dc2626' }}>*</span>}
          </label>
          {expLoc.useManual ? (
            <input
              type="text"
              value={expLoc.manualBrgy}
              onChange={(e) => {
                expLoc.setManualBrgy(e.target.value);
                if (error) onClearError?.();
              }}
              placeholder="e.g. Poblacion"
              disabled={disabled}
              style={{
                width: '100%',
                padding: '8px 12px',
                border:
                  error && !expLoc.manualBrgy.trim()
                    ? '1.5px solid #ef4444'
                    : '1px solid var(--input-border, #d1d5db)',
                borderRadius: BORDER_RADIUS,
                fontSize: 13,
                backgroundColor: disabled ? 'var(--bg-secondary, #f9fafb)' : 'var(--card-bg-solid, #ffffff)',
                color: 'var(--input-text, #111827)',
                boxSizing: 'border-box',
                outline: 'none',
                boxShadow: error && !expLoc.manualBrgy.trim() ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
              }}
            />
          ) : (
            <select
              value={expLoc.barangay}
              onChange={(e) => {
                expLoc.setBarangay(e.target.value);
                if (error) onClearError?.();
              }}
              disabled={disabled || !expLoc.municipality || expLoc.loadingBrgy}
              style={{
                width: '100%',
                padding: '8px 12px',
                border:
                  error && !expLoc.barangay
                    ? '1.5px solid #ef4444'
                    : '1px solid var(--input-border, #d1d5db)',
                borderRadius: BORDER_RADIUS,
                fontSize: 13,
                backgroundColor:
                  disabled || !expLoc.municipality || expLoc.loadingBrgy
                    ? 'var(--bg-secondary, #f9fafb)'
                    : 'var(--card-bg-solid, #ffffff)',
                color: 'var(--input-text, #111827)',
                boxSizing: 'border-box',
                outline: 'none',
                boxShadow: error && !expLoc.barangay ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
              }}
            >
              <option value="">{expLoc.loadingBrgy ? 'Loading…' : '— Select —'}</option>
              {expLoc.barangays.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary, #6b7280)',
              marginBottom: 4,
            }}
          >
            Purok / Zone / Street
          </label>
          <input
            type="text"
            value={purok}
            onChange={(e) => setPurok(e.target.value)}
            placeholder="e.g. Purok 3"
            disabled={disabled || (!expLoc.useManual && !expLoc.barangay)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--input-border, #d1d5db)',
              borderRadius: BORDER_RADIUS,
              fontSize: 13,
              backgroundColor:
                disabled || (!expLoc.useManual && !expLoc.barangay)
                  ? 'var(--bg-secondary, #f9fafb)'
                  : 'var(--card-bg-solid, #ffffff)',
              color: 'var(--input-text, #111827)',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {error && (
        <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500, marginTop: 6, display: 'block' }}>
          {error}
        </span>
      )}

      {fullAddress && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            backgroundColor: 'var(--bg-secondary, #f9fafb)',
            borderRadius: BORDER_RADIUS,
            fontSize: 12,
            color: 'var(--text-secondary, #6b7280)',
          }}
        >
          <strong>Full address:</strong> {fullAddress}
        </div>
      )}
    </div>
  );
}

