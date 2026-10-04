import { EMPTY_PROPHYLAXIS_ORDERS, getTetanusCategoryFromOrders } from '../../../../shared/types/prophylaxis';
import type { ProphylaxisOrders, ProphylaxisStock } from '../../../../shared/types/prophylaxis';
import { FormField } from '../FormField';

interface ProphylaxisOrderSectionProps {
  value: ProphylaxisOrders;
  stock: ProphylaxisStock | null | undefined;
  tetanusBrands?: string[];
  atsBrands?: string[];
  disabled: boolean;
  errors?: Record<string, string>;
  onChange: (orders: ProphylaxisOrders) => void;
}

export default function ProphylaxisOrderSection({
  value,
  stock,
  tetanusBrands = [],
  atsBrands = [],
  disabled,
  errors,
  onChange,
}: ProphylaxisOrderSectionProps) {
  const orders = { ...EMPTY_PROPHYLAXIS_ORDERS, ...value };

  // Resolve active category: 'ats', 'tt', 'ats_tt', 'not_indicated', or '' (blank)
  const currentCategory = orders.tetanus_category || getTetanusCategoryFromOrders(orders);

  // Available ATS brands from stock / props / current selection
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

  // Available TT brands from stock / props / current selection
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
  const availableTtBrands = Array.from(brandsSet);

  // Calculate total active ATS stock
  const totalAtsStock = availableAtsBrands.reduce((sum, brand) => {
    const batches = stock?.[brand] || stock?.['ATS'] || [];
    return sum + batches.reduce((bSum, b) => bSum + b.current_quantity, 0);
  }, 0);
  const isAtsNoStock = stock !== undefined && stock !== null && totalAtsStock === 0;

  // Calculate total active TT stock
  const totalTtStock = availableTtBrands.reduce((sum, brand) => {
    const batches = stock?.[brand] || [];
    return sum + batches.reduce((bSum, b) => bSum + b.current_quantity, 0);
  }, 0);
  const isTtNoStock = stock !== undefined && stock !== null && totalTtStock === 0;

  // Handler when doctor selects primary Tetanus Prophylaxis category
  const handleCategoryChange = (nextCategory: string) => {
    const nextOrders: ProphylaxisOrders = {
      ...orders,
      tetanus_category: nextCategory,
    };

    if (nextCategory === 'ats') {
      nextOrders.tetanus_vaccine = 'none';
      if (nextOrders.tetanus_passive === 'none') {
        nextOrders.tetanus_passive = '';
      }
    } else if (nextCategory === 'tt') {
      nextOrders.tetanus_passive = 'none';
      if (nextOrders.tetanus_vaccine === 'none') {
        nextOrders.tetanus_vaccine = '';
      }
    } else if (nextCategory === 'ats_tt') {
      if (nextOrders.tetanus_passive === 'none') nextOrders.tetanus_passive = '';
      if (nextOrders.tetanus_vaccine === 'none') nextOrders.tetanus_vaccine = '';
    } else if (nextCategory === 'not_indicated') {
      nextOrders.tetanus_passive = 'none';
      nextOrders.tetanus_vaccine = 'none';
    } else {
      nextOrders.tetanus_passive = '';
      nextOrders.tetanus_vaccine = '';
    }

    onChange(nextOrders);
  };

  const handleAtsChange = (nextAts: string) => {
    onChange({ ...orders, tetanus_category: currentCategory || 'ats', tetanus_passive: nextAts });
  };

  const handleTtChange = (nextTt: string) => {
    onChange({ ...orders, tetanus_category: currentCategory || 'tt', tetanus_vaccine: nextTt });
  };

  const showAtsField = currentCategory === 'ats' || currentCategory === 'ats_tt';
  const showTtField = currentCategory === 'tt' || currentCategory === 'ats_tt';

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">Tetanus Prophylaxis Order</h3>
      <p className="registration-field-hint">
        Record the doctor's tetanus assessment and prescription. The nurse records actual administration in Form 3.
      </p>
      <div className="fm-grid">
        {/* Primary Dropdown: Tetanus Prophylaxis */}
        <FormField
          id="field-tetanus_category"
          label="Tetanus Prophylaxis"
          required
          error={!!errors?.tetanus_category}
          errorText={errors?.tetanus_category}
        >
          <select
            className="fm-select"
            name="tetanus_category"
            aria-label="Tetanus prophylaxis assessment"
            value={currentCategory}
            disabled={disabled}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="" disabled hidden>Select tetanus prophylaxis</option>
            <option value="ats">ATS (Anti-Tetanus Serum)</option>
            <option value="tt">Tetanus Vaccine (TT)</option>
            <option value="ats_tt">ATS + TT</option>
            <option value="not_indicated">Not Indicated</option>
          </select>
        </FormField>

        {/* Conditional ATS Inventory Dropdown */}
        {showAtsField && (
          <FormField
            id="field-tetanus_passive"
            label="ATS Product / Stock"
            required
            error={!!errors?.tetanus_passive}
            errorText={errors?.tetanus_passive}
          >
            <select
              className="fm-select"
              name="tetanus_passive"
              aria-label="ATS product selection"
              value={orders.tetanus_passive && orders.tetanus_passive !== 'none' ? orders.tetanus_passive : ''}
              disabled={disabled}
              onChange={(e) => handleAtsChange(e.target.value)}
            >
              <option value="" disabled hidden>[ Select available ATS ▼ ]</option>
              {availableAtsBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand === 'ATS' ? 'ATS (Anti-Tetanus Serum)' : brand}
                </option>
              ))}
            </select>

            {isAtsNoStock ? (
              <span className="registration-field-hint" style={{ marginTop: 4, display: 'block', color: '#dc2626', fontWeight: 600 }}>
                No available ATS stock
              </span>
            ) : orders.tetanus_passive && orders.tetanus_passive !== 'none' ? (
              (() => {
                const brand = orders.tetanus_passive;
                const batches = stock?.[brand] || stock?.['ATS'] || [];
                const units = batches.reduce((sum, batch) => sum + batch.current_quantity, 0);
                return (
                  <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                    {units} vial{units === 1 ? '' : 's'} available ({batches.length} active batch{batches.length === 1 ? '' : 'es'})
                  </span>
                );
              })()
            ) : (
              <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                {totalAtsStock} vial{totalAtsStock === 1 ? '' : 's'} available in clinic stock
              </span>
            )}
          </FormField>
        )}

        {/* Conditional TT Inventory Dropdown */}
        {showTtField && (
          <FormField
            id="field-tetanus_vaccine"
            label="TT Product / Stock"
            required
            error={!!errors?.tetanus_vaccine}
            errorText={errors?.tetanus_vaccine}
          >
            <select
              className="fm-select"
              name="tetanus_vaccine"
              aria-label="TT vaccine product selection"
              value={orders.tetanus_vaccine && orders.tetanus_vaccine !== 'none' ? orders.tetanus_vaccine : ''}
              disabled={disabled}
              onChange={(e) => handleTtChange(e.target.value)}
            >
              <option value="" disabled hidden>[ Select available TT vaccine ▼ ]</option>
              {availableTtBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            {isTtNoStock ? (
              <span className="registration-field-hint" style={{ marginTop: 4, display: 'block', color: '#dc2626', fontWeight: 600 }}>
                No available TT stock
              </span>
            ) : orders.tetanus_vaccine && orders.tetanus_vaccine !== 'none' ? (
              (() => {
                const brand = orders.tetanus_vaccine;
                const batches = stock?.[brand] || [];
                const units = batches.reduce((sum, batch) => sum + batch.current_quantity, 0);
                return (
                  <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                    {units} vial{units === 1 ? '' : 's'} available ({batches.length} active batch{batches.length === 1 ? '' : 'es'})
                  </span>
                );
              })()
            ) : (
              <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                {totalTtStock} vial{totalTtStock === 1 ? '' : 's'} available in clinic stock
              </span>
            )}
          </FormField>
        )}

        {/* Last Tetanus Dose (If Known) Date Picker */}
        <FormField
          id="field-tetanus_last_dose"
          label="Last tetanus dose (if known)"
          error={!!errors?.tetanus_last_dose}
          errorText={errors?.tetanus_last_dose}
        >
          <input
            className="fm-input"
            type="date"
            id="tetanus_last_dose"
            name="tetanus_last_dose"
            value={orders.tetanus_last_dose || ''}
            disabled={disabled}
            min="1000-01-01"
            max="9999-12-31"
            onChange={(e) => {
              let val = e.target.value;
              if (val) {
                const parts = val.split('-');
                if (parts.length > 0 && parts[0].length > 4) {
                  parts[0] = parts[0].slice(0, 4);
                  val = parts.join('-');
                }
              }
              onChange({ ...orders, tetanus_last_dose: val });
            }}
            onInput={(e) => {
              const target = e.currentTarget;
              if (target.value) {
                const parts = target.value.split('-');
                if (parts.length > 0 && parts[0].length > 4) {
                  parts[0] = parts[0].slice(0, 4);
                  target.value = parts.join('-');
                  onChange({ ...orders, tetanus_last_dose: target.value });
                }
              }
            }}
          />
        </FormField>
      </div>
    </div>
  );
}
