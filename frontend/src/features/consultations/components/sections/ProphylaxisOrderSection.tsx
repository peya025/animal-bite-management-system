import { EMPTY_PROPHYLAXIS_ORDERS, getTetanusCategoryFromOrders } from '../../../../shared/types/prophylaxis';
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
    onChange({ ...orders, tetanus_passive: nextAts });
  };

  const handleTtChange = (nextTt: string) => {
    onChange({ ...orders, tetanus_vaccine: nextTt });
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
        <label className="fm-field">
          <span className="fm-label">Tetanus Prophylaxis</span>
          <select
            className="fm-select"
            aria-label="Tetanus prophylaxis assessment"
            value={currentCategory}
            disabled={disabled}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Select tetanus prophylaxis</option>
            <option value="ats">ATS (Anti-Tetanus Serum)</option>
            <option value="tt">Tetanus Vaccine (TT)</option>
            <option value="ats_tt">ATS + TT</option>
            <option value="not_indicated">Not Indicated</option>
          </select>
        </label>

        {/* Conditional ATS Inventory Dropdown */}
        {showAtsField && (
          <label className="fm-field">
            <span className="fm-label">ATS Product / Stock</span>
            <select
              className="fm-select"
              aria-label="ATS product selection"
              value={orders.tetanus_passive && orders.tetanus_passive !== 'none' ? orders.tetanus_passive : ''}
              disabled={disabled || isAtsNoStock}
              onChange={(e) => handleAtsChange(e.target.value)}
            >
              <option value="">[ Select available ATS ▼ ]</option>
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
          </label>
        )}

        {/* Conditional TT Inventory Dropdown */}
        {showTtField && (
          <label className="fm-field">
            <span className="fm-label">TT Product / Stock</span>
            <select
              className="fm-select"
              aria-label="TT vaccine product selection"
              value={orders.tetanus_vaccine && orders.tetanus_vaccine !== 'none' ? orders.tetanus_vaccine : ''}
              disabled={disabled || isTtNoStock}
              onChange={(e) => handleTtChange(e.target.value)}
            >
              <option value="">[ Select available TT vaccine ▼ ]</option>
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
          </label>
        )}

        {/* Last Tetanus Dose (If Known) Date Picker - Unchanged */}
        <label className="fm-field">
          <span className="fm-label">Last tetanus dose (if known)</span>
          <input
            className="fm-input"
            type="date"
            value={orders.tetanus_last_dose || ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...orders, tetanus_last_dose: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
