import { FormField } from './FormField';
import type { AddressLocationState } from '../../../hooks/useAddressLocation';

interface AddressSectionProps {
  loc: AddressLocationState;
}

export function AddressSection({ loc }: AddressSectionProps) {
  return (
    <div className="fm-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="fm-section-title" style={{ margin: 0 }}>Residential Address — Misamis Oriental (Tirahan)</p>
        <button
          type="button"
          onClick={() => loc.setUseManual(!loc.useManual)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            background: loc.useManual ? 'var(--primary)' : '#f1f5f9',
            color: loc.useManual ? '#fff' : '#334155',
            border: loc.useManual ? 'none' : '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          {loc.useManual ? '✓ Switch to Dropdown' : '✏️ Switch to Manual Typing'}
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
          }}
        >
          <strong>⚠️ Address API unavailable.</strong> Click "Use Manual Entry" to type addresses manually.
        </div>
      )}

      {!loc.useManual ? (
        <div className="fm-grid fm-grid--3" style={{ marginBottom: 12 }}>
          <FormField label="City / Municipality" required>
            <select
              className="fm-select"
              value={loc.municipality}
              onChange={e => loc.setMunicipality(e.target.value)}
              disabled={loc.loadingMun}
            >
              <option value="">{loc.loadingMun ? 'Loading…' : '— Select —'}</option>
              {loc.municipalities.map(m => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Barangay" required>
            <select
              className="fm-select"
              value={loc.barangay}
              onChange={e => loc.setBarangay(e.target.value)}
              disabled={!loc.municipality || loc.loadingBrgy}
            >
              <option value="">{loc.loadingBrgy ? 'Loading…' : '— Select —'}</option>
              {loc.barangays.map(b => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
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
