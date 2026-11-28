import { FormField } from './sections/FormField';
import { SearchableSelect } from '../../../../components/forms/SearchableSelect';
import type { AddressLocationState } from '../../hooks/useAddressLocation';
import { useClinicModuleConfig } from '../../../../hooks/useClinicModuleConfig';

export function RegistrationAddressSection({ loc, errors }: { loc: AddressLocationState; errors: Record<string, string> }) {
  const { isFieldVisible, isFieldRequired, isSectionEnabled } = useClinicModuleConfig();
  const addressSectionEnabled = isSectionEnabled('address_section_enabled');

  if (!addressSectionEnabled) {
    return null;
  }

  const municipalityVisible = isFieldVisible('address_municipality');
  const barangayVisible = isFieldVisible('address_barangay');
  const municipalityRequired = isFieldRequired('address_municipality');
  const barangayRequired = isFieldRequired('address_barangay');
  const purokRequired = isFieldRequired('address_purok');
  const purokVisible = isFieldVisible('address_purok');
  const provinceVisible = isFieldVisible('province');

  if (!municipalityVisible && !barangayVisible && !purokVisible && !provinceVisible) {
    return null;
  }

  const municipalityError = errors.municipality || (errors.address && !loc.municipality ? errors.address : undefined);
  const barangayError = errors.barangay || (errors.address && !loc.barangay ? errors.address : undefined);

  return (
    <section className="fm-section" aria-labelledby="registration-address-title">
      <div className="registration-address-header">
        <h3 id="registration-address-title" className="fm-section-title">
          {provinceVisible ? 'Residential Address — Misamis Oriental (Tirahan)' : 'Residential Address (Tirahan)'}
        </h3>
      </div>
      {loc.apiError && (municipalityVisible || barangayVisible) && (
        <p className="registration-field-hint" role="status">Address service unavailable. Using built-in Misamis Oriental address options.</p>
      )}
      <div className="fm-grid fm-grid--2">
        {municipalityVisible && (
          <FormField label="City / Municipality" required={municipalityRequired} errorText={municipalityError}>
            <SearchableSelect
              name="municipality"
              value={loc.municipality}
              options={loc.municipalities.map(item => ({ value: item.code, label: item.name }))}
              placeholder={loc.loadingMun ? 'Loading…' : '— Select —'}
              searchPlaceholder="Search city / municipality..."
              onChange={val => loc.setMunicipality(val)}
              disabled={loc.loadingMun}
            />
          </FormField>
        )}
        {barangayVisible && (
          <FormField label="Barangay" required={barangayRequired} errorText={barangayError}
            hint={!loc.municipality ? 'Select a city or municipality first.' : undefined}>
            <SearchableSelect
              name="barangay"
              value={loc.barangay}
              options={loc.barangays.map(item => ({ value: item.code, label: item.name }))}
              placeholder={loc.loadingBrgy ? 'Loading…' : '— Select —'}
              searchPlaceholder="Search barangay..."
              onChange={val => loc.setBarangay(val)}
              disabled={!loc.municipality || loc.loadingBrgy}
            />
          </FormField>
        )}
        {purokVisible && (
          <FormField label="Purok / Zone / Street" required={purokRequired} errorText={errors.purok}>
            <input className="fm-input" name="purok" value={loc.purok}
              onChange={e => loc.setPurok(e.target.value)} placeholder="e.g. Purok 3, Zone 1"
              disabled={barangayVisible && !loc.barangay} />
          </FormField>
        )}
      </div>
      {municipalityVisible && barangayVisible && (
        <output className="apm-address-preview" aria-label="Full Address preview">
          <strong>Full address (read-only)</strong>{loc.full}
        </output>
      )}
    </section>
  );
}
