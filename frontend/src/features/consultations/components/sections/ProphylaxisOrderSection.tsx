import { EMPTY_PROPHYLAXIS_ORDERS } from '../../../../shared/types/prophylaxis';
import type { ProphylaxisOrders, ProphylaxisStock } from '../../../../shared/types/prophylaxis';

interface ProphylaxisOrderSectionProps {
  value: ProphylaxisOrders;
  stock: ProphylaxisStock | null | undefined;
  tetanusBrands?: string[];
  atsBrands?: string[];
  disabled: boolean;
  onChange: (orders: ProphylaxisOrders) => void;
}

export default function ProphylaxisOrderSection({
  value,
  stock,
  tetanusBrands = [],
  atsBrands = [],
  disabled,
  onChange,
}: ProphylaxisOrderSectionProps) {
  const orders = { ...EMPTY_PROPHYLAXIS_ORDERS, ...value };
  const change = (key: keyof ProphylaxisOrders, next: string) => onChange({ ...orders, [key]: next });

  // Resolve available tetanus brands from props, live inventory stock, or current selection
  const brandsSet = new Set<string>();
  (tetanusBrands || []).forEach((b) => brandsSet.add(b));
  if (stock) {
    Object.keys(stock).forEach((key) => {
      if (key !== 'ATS' && key !== 'ERIG' && !key.toLowerCase().includes('ats') && !key.toLowerCase().includes('serum') && (stock[key]?.length ?? 0) > 0) {
        brandsSet.add(key);
      }
    });
  }
  if (orders.tetanus_vaccine && orders.tetanus_vaccine !== 'none') {
    brandsSet.add(orders.tetanus_vaccine);
  }
  if (brandsSet.size === 0) {
    brandsSet.add('TT');
  }
  const availableBrands = Array.from(brandsSet);

  const selectedBrand = orders.tetanus_vaccine && orders.tetanus_vaccine !== 'none' ? orders.tetanus_vaccine : '';

  // Resolve available ATS brands from props, live inventory stock, or current selection
  const atsSet = new Set<string>();
  (atsBrands || []).forEach((b) => atsSet.add(b));
  if (stock) {
    Object.keys(stock).forEach((key) => {
      if ((key === 'ATS' || key.toLowerCase().includes('ats') || key.toLowerCase().includes('serum')) && (stock[key]?.length ?? 0) > 0) {
        atsSet.add(key);
      }
    });
  }
  if (orders.tetanus_passive && orders.tetanus_passive !== 'none') {
    atsSet.add(orders.tetanus_passive);
  }
  if (atsSet.size === 0) {
    atsSet.add('ATS');
  }
  const availableAtsBrands = Array.from(atsSet);

  const selectedAtsBrand = orders.tetanus_passive && orders.tetanus_passive !== 'none' ? orders.tetanus_passive : '';

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">Tetanus Prophylaxis Order</h3>
      <p className="registration-field-hint">
        Record the doctor's tetanus assessment and prescription. The nurse records actual administration in Form 3.
      </p>
      <div className="fm-grid">
        <label className="fm-field">
          <span className="fm-label">ATS (Anti-Tetanus Serum)</span>
          <select
            className="fm-select"
            aria-label="Tetanus passive protection"
            value={orders.tetanus_passive}
            disabled={disabled}
            onChange={(e) => change('tetanus_passive', e.target.value)}
          >
            <option value="">Assessment pending</option>
            <option value="none">Not indicated / not ordered</option>
            {availableAtsBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand === 'ATS' ? 'ATS (Anti-Tetanus Serum)' : brand}
              </option>
            ))}
          </select>

          {/* Live inventory stock hint for ATS brands */}
          {selectedAtsBrand ? (
            (() => {
              const batches = stock?.[selectedAtsBrand] || stock?.['ATS'] || [];
              const units = batches.reduce((sum, batch) => sum + batch.current_quantity, 0);
              return (
                <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                  {selectedAtsBrand}:{' '}
                  {stock === undefined ? (
                    'checking clinic stock…'
                  ) : stock === null ? (
                    'inventory unavailable; verify stock before treatment'
                  ) : (
                    <>
                      {units} vial{units === 1 ? '' : 's'} in {batches.length} active batch{batches.length === 1 ? '' : 'es'}
                      {units === 0 ? ' — no clinic stock; arrange supply or referral if ordered' : ''}
                    </>
                  )}
                </span>
              );
            })()
          ) : (
            availableAtsBrands.map((brand) => {
              const batches = stock?.[brand] || stock?.['ATS'] || [];
              const units = batches.reduce((sum, batch) => sum + batch.current_quantity, 0);
              return (
                <span key={brand} className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                  {brand}:{' '}
                  {stock === undefined ? (
                    'checking clinic stock…'
                  ) : stock === null ? (
                    'inventory unavailable'
                  ) : (
                    <>
                      {units} vial{units === 1 ? '' : 's'} in {batches.length} active batch{batches.length === 1 ? '' : 'es'}
                      {units === 0 ? ' — no clinic stock' : ''}
                    </>
                  )}
                </span>
              );
            })
          )}
        </label>

        <label className="fm-field">
          <span className="fm-label">Tetanus vaccine (TT)</span>
          <select
            className="fm-select"
            aria-label="Tetanus vaccine"
            value={orders.tetanus_vaccine}
            disabled={disabled}
            onChange={(e) => change('tetanus_vaccine', e.target.value)}
          >
            <option value="">Assessment pending</option>
            <option value="none">Not indicated / not ordered</option>
            {availableBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>

          {/* Live inventory stock hint for tetanus brands */}
          {selectedBrand ? (
            (() => {
              const batches = stock?.[selectedBrand] || [];
              const units = batches.reduce((sum, batch) => sum + batch.current_quantity, 0);
              return (
                <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                  {selectedBrand}:{' '}
                  {stock === undefined ? (
                    'checking clinic stock…'
                  ) : stock === null ? (
                    'inventory unavailable; verify stock before treatment'
                  ) : (
                    <>
                      {units} vial{units === 1 ? '' : 's'} in {batches.length} active batch{batches.length === 1 ? '' : 'es'}
                      {units === 0 ? ' — no clinic stock; arrange supply or referral if ordered' : ''}
                    </>
                  )}
                </span>
              );
            })()
          ) : (
            availableBrands.map((brand) => {
              const batches = stock?.[brand] || [];
              const units = batches.reduce((sum, batch) => sum + batch.current_quantity, 0);
              return (
                <span key={brand} className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                  {brand}:{' '}
                  {stock === undefined ? (
                    'checking clinic stock…'
                  ) : stock === null ? (
                    'inventory unavailable'
                  ) : (
                    <>
                      {units} vial{units === 1 ? '' : 's'} in {batches.length} active batch{batches.length === 1 ? '' : 'es'}
                      {units === 0 ? ' — no clinic stock' : ''}
                    </>
                  )}
                </span>
              );
            })
          )}
        </label>

        <label className="fm-field">
          <span className="fm-label">Last tetanus dose (if known)</span>
          <input
            className="fm-input"
            type="date"
            value={orders.tetanus_last_dose}
            disabled={disabled}
            onChange={(e) => change('tetanus_last_dose', e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
