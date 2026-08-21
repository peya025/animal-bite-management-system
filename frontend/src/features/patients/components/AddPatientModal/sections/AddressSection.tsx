import { FormField } from './FormField';
import type { AddressLocationState } from '../../../hooks/useAddressLocation';

interface AddressSectionProps {
  loc: AddressLocationState;
  errors?: Record<string, string>;
}

export function AddressSection({ loc, errors = {} }: AddressSectionProps) {
  return (
    <div
      id="field-address"
      className="fm-section"
      style={errors.address ? {
        padding: '12px',
        border: '2px solid #ef4444',
        borderRadius: '10px',
        backgroundColor: '#fef2f2',
        marginBottom: '16px',
        boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.12)',
        transition: 'all 0.25s ease',
      } : undefined}
    >
      {errors.address && (
        <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚠</span> {errors.address}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: 12,
        }}
      >
        <p className="fm-section-title" style={{ margin: 0, flex: '1 1 320px', minWidth: 0 }}>
          Residential Address — Misamis Oriental (Tirahan)
        </p>
        <button
          type="button"
          onClick={() => loc.setUseManual(!loc.useManual)}
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 600,
            background: '#f8fbff',
            color: '#475569',
            border: '1px solid #cfd8e3',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {loc.useManual ? (
              <>
                <path d="M8 6h12" />
                <path d="M8 12h12" />
                <path d="M8 18h12" />
                <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
                <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
                <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
              </>
            ) : (
              <>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
              </>
            )}
          </svg>
          <span>{loc.useManual ? 'Switch to Dropdown' : 'Switch to Manual Typing'}</span>
        </button>
      </div>

      {loc.apiError && !loc.useManual && (
        <div
          style={{
            padding: '10px 14px',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '12px',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span><strong>Address API unavailable.</strong> Click "Use Manual Entry" to type addresses manually.</span>
        </div>
      )}

      {!loc.useManual ? (
        <div className="fm-grid fm-grid--3" style={{ marginBottom: 12 }}>
          <FormField label="City / Municipality" required>
            <div style={{ position: 'relative' }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
                <path d="M9 7v10" />
                <path d="M15 7v10" />
              </svg>
              <select
                className="fm-select"
                value={loc.municipality}
                onChange={e => loc.setMunicipality(e.target.value)}
                disabled={loc.loadingMun}
                style={{ paddingLeft: '36px' }}
              >
                <option value="">{loc.loadingMun ? 'Loading…' : '— Select —'}</option>
                {loc.municipalities.map(m => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
            </div>
          </FormField>
          <FormField label="Barangay" required>
            <div style={{ position: 'relative' }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
                <path d="M9 7v10" />
                <path d="M15 7v10" />
              </svg>
              <select
                className="fm-select"
                value={loc.barangay}
                onChange={e => loc.setBarangay(e.target.value)}
                disabled={!loc.municipality || loc.loadingBrgy}
                style={{ paddingLeft: '36px' }}
              >
                <option value="">{loc.loadingBrgy ? 'Loading…' : '— Select —'}</option>
                {loc.barangays.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
          </FormField>
          <FormField label="Purok / Zone / Street">
            <input
              className="fm-input"
              value={loc.purok}
              onChange={e => loc.setPurok(e.target.value)}
              placeholder="e.g. Purok 3, Zone 1"
              disabled={!loc.barangay}
            />
          </FormField>
        </div>
      ) : (
        <div className="fm-grid fm-grid--3" style={{ marginBottom: 12 }}>
          <FormField label="City / Municipality" required>
            <input
              className="fm-input"
              value={loc.manualMun}
              onChange={e => loc.setManualMun(e.target.value)}
              placeholder="e.g. Tagoloan"
            />
          </FormField>
          <FormField label="Barangay" required>
            <input
              className="fm-input"
              value={loc.manualBrgy}
              onChange={e => loc.setManualBrgy(e.target.value)}
              placeholder="e.g. Poblacion"
            />
          </FormField>
          <FormField label="Purok / Zone / Street">
            <input
              className="fm-input"
              value={loc.purok}
              onChange={e => loc.setPurok(e.target.value)}
              placeholder="e.g. Purok 3, Zone 1"
            />
          </FormField>
        </div>
      )}

      {loc.full && (
        <div className="apm-address-preview">
          <strong>Full address:</strong> {loc.full}
        </div>
      )}
    </div>
  );
}
