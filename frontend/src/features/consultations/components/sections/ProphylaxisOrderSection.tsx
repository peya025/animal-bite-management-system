import { useMemo } from 'react';
import { EMPTY_PROPHYLAXIS_ORDERS, getTetanusCategoryFromOrders } from '../../../../shared/types/prophylaxis';
import type { ProphylaxisOrders, ProphylaxisStock } from '../../../../shared/types/prophylaxis';
import { FormField } from '../FormField';

interface ProphylaxisOrderSectionProps {
  value: ProphylaxisOrders;
  stock: ProphylaxisStock | null | undefined;
  tetanusBrands?: string[];
  atsBrands?: string[];
  rigBrands?: string[];
  recordedWeight?: string | number;
  disabled: boolean;
  errors?: Record<string, string>;
  onChange: (orders: ProphylaxisOrders) => void;
}

export default function ProphylaxisOrderSection({
  value,
  stock,
  tetanusBrands = [],
  atsBrands = [],
  rigBrands = [],
  recordedWeight,
  disabled,
  errors,
  onChange,
}: ProphylaxisOrderSectionProps) {
  const orders = { ...EMPTY_PROPHYLAXIS_ORDERS, ...value };

  // Resolve active category: 'ats', 'tt', 'ats_tt', 'not_indicated', or '' (blank)
  const currentCategory = orders.tetanus_category || getTetanusCategoryFromOrders(orders);

  // Available ATS brands from stock / props / current selection
  const atsSet = new Set<string>();
  (atsBrands || []).forEach((b) => {
    if ((stock?.[b]?.length ?? 0) > 0 || (stock?.['ATS']?.length ?? 0) > 0 || b === orders.tetanus_passive) {
      atsSet.add(b);
    }
  });
  if (orders.tetanus_passive && orders.tetanus_passive !== 'none') {
    atsSet.add(orders.tetanus_passive);
  }
  if (atsSet.size === 0) {
    atsSet.add('ATS');
  }
  const availableAtsBrands = Array.from(atsSet);

  // Available TT brands from stock / props / current selection
  const brandsSet = new Set<string>();
  (tetanusBrands || []).forEach((b) => {
    if ((stock?.[b]?.length ?? 0) > 0 || (stock?.['TT']?.length ?? 0) > 0 || b === orders.tetanus_vaccine) {
      brandsSet.add(b);
    }
  });
  if (orders.tetanus_vaccine && orders.tetanus_vaccine !== 'none') {
    brandsSet.add(orders.tetanus_vaccine);
  }
  if (brandsSet.size === 0) {
    brandsSet.add('TT');
  }
  const availableTtBrands = Array.from(brandsSet);

  // Available RIG brands from stock / props / current selection
  const rigSet = new Set<string>();
  const customRigBrands = (rigBrands || []).filter((b) => b && b.trim() !== '' && b.toUpperCase() !== 'ERIG');
  const brandsToUse = customRigBrands.length > 0 ? customRigBrands : (rigBrands || []);

  brandsToUse.forEach((b) => {
    if ((stock?.[b]?.length ?? 0) > 0 || (stock?.['ERIG']?.length ?? 0) > 0 || b === orders.rig) {
      rigSet.add(b);
    }
  });
  if (orders.rig && orders.rig !== 'none') {
    rigSet.add(orders.rig);
  }
  if (rigSet.size === 0) {
    rigSet.add('ERIG');
  }
  let availableRigBrands = Array.from(rigSet);
  if (availableRigBrands.some((b) => b.toUpperCase() !== 'ERIG') && orders.rig !== 'ERIG') {
    availableRigBrands = availableRigBrands.filter((b) => b.toUpperCase() !== 'ERIG');
  }

  // Calculate total active ATS stock
  const totalAtsStock = useMemo(() => {
    if (!stock) return 0;
    const seen = new Set<number>();
    let sum = 0;
    availableAtsBrands.forEach((brand) => {
      const batches = stock[brand] || (brand === 'ATS' ? stock['ATS'] : []) || [];
      batches.forEach((b) => {
        if (!seen.has(b.inventory_id)) {
          seen.add(b.inventory_id);
          sum += b.current_quantity;
        }
      });
    });
    return sum;
  }, [stock, availableAtsBrands]);
  const isAtsNoStock = stock !== undefined && stock !== null && totalAtsStock === 0;

  // Calculate total active TT stock
  const totalTtStock = useMemo(() => {
    if (!stock) return 0;
    const seen = new Set<number>();
    let sum = 0;
    availableTtBrands.forEach((brand) => {
      const batches = stock[brand] || (brand === 'TT' ? stock['TT'] : []) || [];
      batches.forEach((b) => {
        if (!seen.has(b.inventory_id)) {
          seen.add(b.inventory_id);
          sum += b.current_quantity;
        }
      });
    });
    return sum;
  }, [stock, availableTtBrands]);
  const isTtNoStock = stock !== undefined && stock !== null && totalTtStock === 0;

  // Calculate total active RIG stock
  const totalRigStock = useMemo(() => {
    if (!stock) return 0;
    const seen = new Set<number>();
    let sum = 0;
    availableRigBrands.forEach((brand) => {
      const batches = stock[brand] || (brand === 'ERIG' ? stock['ERIG'] : []) || [];
      batches.forEach((b) => {
        if (!seen.has(b.inventory_id)) {
          seen.add(b.inventory_id);
          sum += b.current_quantity;
        }
      });
    });
    return sum;
  }, [stock, availableRigBrands]);
  const isRigNoStock = stock !== undefined && stock !== null && totalRigStock === 0;

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
      if (!nextOrders.notes || !nextOrders.notes.trim()) {
        nextOrders.notes = 'ATS 1500 IU IM after negative skin test';
      }
    } else if (nextCategory === 'tt') {
      nextOrders.tetanus_passive = 'none';
      if (nextOrders.tetanus_vaccine === 'none') {
        nextOrders.tetanus_vaccine = '';
      }
      if (nextOrders.notes === 'ATS 1500 IU IM after negative skin test') {
        nextOrders.notes = '';
      }
    } else if (nextCategory === 'ats_tt') {
      if (nextOrders.tetanus_passive === 'none') nextOrders.tetanus_passive = '';
      if (nextOrders.tetanus_vaccine === 'none') nextOrders.tetanus_vaccine = '';
      if (!nextOrders.notes || !nextOrders.notes.trim()) {
        nextOrders.notes = 'ATS 1500 IU IM after negative skin test';
      }
    } else if (nextCategory === 'not_indicated') {
      nextOrders.tetanus_passive = 'none';
      nextOrders.tetanus_vaccine = 'none';
      if (nextOrders.notes === 'ATS 1500 IU IM after negative skin test') {
        nextOrders.notes = '';
      }
    } else {
      nextOrders.tetanus_passive = '';
      nextOrders.tetanus_vaccine = '';
    }

    onChange(nextOrders);
  };

  const handleAtsChange = (nextAts: string) => {
    const nextNotes = (!orders.notes || !orders.notes.trim())
      ? 'ATS 1500 IU IM after negative skin test'
      : orders.notes;
    onChange({ ...orders, tetanus_category: currentCategory || 'ats', tetanus_passive: nextAts, notes: nextNotes });
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

        {/* Conditional ATS Dose & Precaution Instructions */}
        {showAtsField && (
          <FormField
            id="field-tetanus_notes"
            label="ATS Dose & Precaution Instructions"
            className="fm-grid--full"
            required
            error={!!errors?.tetanus_notes || !!errors?.notes || (Boolean(errors?.prophylaxis) && String(errors?.prophylaxis).includes('ATS'))}
            errorText={errors?.tetanus_notes || errors?.notes || (Boolean(errors?.prophylaxis) && String(errors?.prophylaxis).includes('ATS') ? errors?.prophylaxis : undefined)}
          >
            <input
              type="text"
              className="fm-input"
              name="tetanus_notes"
              id="tetanus_notes"
              aria-label="ATS dose and precaution instructions"
              placeholder="e.g. ATS 1500 IU IM after negative skin test"
              value={orders.notes || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...orders, notes: e.target.value })}
            />
            <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
              Required for ATS: Equine ATS requires product-specific dose (e.g. 1500 IU IM) and precautions (e.g. negative skin test / ANST prior to injection).
            </span>
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
                  {brand === 'TT' ? 'TT (Tetanus Toxoid)' : brand}
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
                const batches = stock?.[brand] || (brand === 'TT' ? stock?.['TT'] : []) || [];
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

        <FormField id="field-rig" label="Rabies immunoglobulin (RIG)">
          <select className="fm-select" aria-label="RIG order" value={orders.rig || 'none'} disabled={disabled}
            onChange={e => {
              const nextRig = e.target.value;
              const nextOrders = { ...orders, rig: nextRig };
              if (nextRig && nextRig !== 'none' && !nextOrders.rig_weight_kg && Number(recordedWeight) > 0) {
                nextOrders.rig_weight_kg = String(recordedWeight);
              }
              onChange(nextOrders);
            }}>
            <option value="none">No RIG order</option>
            {availableRigBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          {isRigNoStock ? (
            <span className="registration-field-hint" style={{ marginTop: 4, display: 'block', color: '#dc2626', fontWeight: 600 }}>
              No available RIG stock
            </span>
          ) : orders.rig && orders.rig !== 'none' ? (
            (() => {
              const brand = orders.rig;
              const batches = stock?.[brand] || stock?.['ERIG'] || [];
              const units = batches.reduce((sum, batch) => sum + batch.current_quantity, 0);
              return (
                <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
                  {units} vial{units === 1 ? '' : 's'} available ({batches.length} active batch{batches.length === 1 ? '' : 'es'})
                </span>
              );
            })()
          ) : (
            <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
              {totalRigStock} vial{totalRigStock === 1 ? '' : 's'} available in clinic stock
            </span>
          )}
        </FormField>
        {Boolean(orders.rig && orders.rig !== 'none') && (
          <FormField id="field-rig_weight_kg" label="Verified weight for RIG (kg)" required
            error={!!errors?.rig_weight_kg} errorText={errors?.rig_weight_kg}>
            <input className="fm-input" type="number" aria-label="Verified weight for RIG (kg)" min="0.01" max="700" step="any"
              value={orders.rig_weight_kg || ''} disabled={disabled}
              onChange={e => onChange({ ...orders, rig_weight_kg: e.target.value })} />
            {Number(recordedWeight) > 0 && Number(recordedWeight) <= 700 && (
              String(orders.rig_weight_kg || '').trim() === String(recordedWeight).trim() ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 6,
                    padding: '4px 10px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 6,
                    color: '#065f46',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Registration weight confirmed ({recordedWeight} kg)</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="fm-btn fm-btn-secondary"
                  disabled={disabled}
                  style={{ marginTop: 6 }}
                  onClick={() => onChange({ ...orders, rig_weight_kg: String(recordedWeight) })}
                >
                  Use recorded weight: {recordedWeight} kg
                </button>
              )
            )}
            <span className="registration-field-hint" style={{ marginTop: 4, display: 'block' }}>
              Verify the weight recorded at Registration or on the referral before prescribing RIG.
            </span>
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
