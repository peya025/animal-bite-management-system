import { FormField } from './sections/FormField';
import type { AddressLocationState } from '../../hooks/useAddressLocation';

export function RegistrationAddressSection({ loc, errors }: { loc: AddressLocationState; errors: Record<string, string> }) {
  const municipalityError = errors.municipality || (errors.address && !(loc.useManual ? loc.manualMun : loc.municipality) ? errors.address : undefined);
  const barangayError = errors.barangay || (errors.address && !(loc.useManual ? loc.manualBrgy : loc.barangay) ? errors.address : undefined);

  return (
    <section className="fm-section" aria-labelledby="registration-address-title">
      <div className="registration-address-header">
        <h3 id="registration-address-title" className="fm-section-title">Residential Address — Misamis Oriental (Tirahan)</h3>
        <button type="button" className="registration-manual-toggle"
          onClick={() => loc.setUseManual(!loc.useManual)}>
          {loc.useManual ? 'Switch to Dropdown' : 'Switch to Manual Typing'}
        </button>
      </div>
      {loc.apiError && !loc.useManual && (
        <p className="registration-field-hint" role="status">Address service unavailable. You can use the available options or select “Switch to Manual Typing”.</p>
      )}
      <div className="fm-grid fm-grid--2">
        <FormField label="City / Municipality" required errorText={municipalityError}>
          {loc.useManual ? (
            <input className="fm-input" name="municipality" value={loc.manualMun}
              onChange={e => loc.setManualMun(e.target.value)} placeholder="e.g. Tagoloan" />
          ) : (
            <select className="fm-select" name="municipality" value={loc.municipality}
              onChange={e => loc.setMunicipality(e.target.value)} disabled={loc.loadingMun}>
              <option value="">{loc.loadingMun ? 'Loading…' : '— Select —'}</option>
              {loc.municipalities.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          )}
        </FormField>
        <FormField label="Barangay" required errorText={barangayError}
          hint={!loc.useManual && !loc.municipality ? 'Select a city or municipality first.' : undefined}>
          {loc.useManual ? (
            <input className="fm-input" name="barangay" value={loc.manualBrgy}
              onChange={e => loc.setManualBrgy(e.target.value)} placeholder="e.g. Poblacion" />
          ) : (
            <select className="fm-select" name="barangay" value={loc.barangay}
              onChange={e => loc.setBarangay(e.target.value)} disabled={!loc.municipality || loc.loadingBrgy}>
              <option value="">{loc.loadingBrgy ? 'Loading…' : '— Select —'}</option>
              {loc.barangays.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          )}
        </FormField>
        <FormField label="Purok / Zone / Street" errorText={errors.purok}>
          <input className="fm-input" name="purok" value={loc.purok}
            onChange={e => loc.setPurok(e.target.value)} placeholder="e.g. Purok 3, Zone 1"
            disabled={!loc.useManual && !loc.barangay} />
        </FormField>
      </div>
      <output className="apm-address-preview" aria-label="Full Address preview">
        <strong>Full address (read-only)</strong>{loc.full}
      </output>
    </section>
  );
}
