import React, { useMemo } from 'react';
import type { AddressLocationState } from '../../../patients/hooks/useAddressLocation';
import { SearchableSelect } from '../../../../components/forms/SearchableSelect';

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
  const municipalityOptions = useMemo(
    () => expLoc.municipalities.map((item) => ({ value: item.code, label: item.name })),
    [expLoc.municipalities]
  );

  const barangayOptions = useMemo(
    () => expLoc.barangays.map((item) => ({ value: item.code, label: item.name })),
    [expLoc.barangays]
  );

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
              className="fm-input"
              aria-invalid={Boolean(error && !expLoc.manualMun.trim()) || undefined}
              value={expLoc.manualMun}
              onChange={(e) => {
                expLoc.setManualMun(e.target.value);
                if (error) onClearError?.();
              }}
              placeholder="e.g. Tagoloan"
              disabled={disabled}
            />
          ) : (
            <SearchableSelect
              aria-label="Municipality"
              aria-invalid={Boolean(error && !expLoc.municipality) || undefined}
              aria-required={required || undefined}
              value={expLoc.municipality}
              options={municipalityOptions}
              placeholder={expLoc.loadingMun ? 'Loading…' : '— Select —'}
              searchPlaceholder="Search municipality..."
              noResultsText="No municipality found"
              onChange={(val) => {
                expLoc.setMunicipality(val);
                if (error) onClearError?.();
              }}
              disabled={disabled || expLoc.loadingMun}
            />
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
              className="fm-input"
              aria-invalid={Boolean(error && !expLoc.manualBrgy.trim()) || undefined}
              value={expLoc.manualBrgy}
              onChange={(e) => {
                expLoc.setManualBrgy(e.target.value);
                if (error) onClearError?.();
              }}
              placeholder="e.g. Poblacion"
              disabled={disabled}
            />
          ) : (
            <SearchableSelect
              aria-label="Barangay"
              aria-invalid={Boolean(error && !expLoc.barangay) || undefined}
              aria-required={required || undefined}
              value={expLoc.barangay}
              options={barangayOptions}
              placeholder={expLoc.loadingBrgy ? 'Loading…' : '— Select —'}
              searchPlaceholder="Search barangay..."
              noResultsText="No barangay found"
              onChange={(val) => {
                expLoc.setBarangay(val);
                if (error) onClearError?.();
              }}
              disabled={disabled || !expLoc.municipality || expLoc.loadingBrgy}
            />
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
            className="fm-input"
            value={purok}
            onChange={(e) => setPurok(e.target.value)}
            placeholder="e.g. Purok 3"
            disabled={disabled || (!expLoc.useManual && !expLoc.barangay)}
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

