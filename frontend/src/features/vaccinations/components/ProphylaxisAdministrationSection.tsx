import { useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Medicine01Icon, AlertCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { PROPHYLAXIS_GROUPS, PROPHYLAXIS_LABELS, PROPHYLAXIS_PRODUCTS } from '../../../shared/types/prophylaxis';
import type { ProphylaxisOrders, ProphylaxisAdministration, ProphylaxisStock } from '../../../shared/types/prophylaxis';
import { sanitizeDateInput } from '../../../shared/utils/date';
import { ConsultationDialog } from '../../consultations/styles/ConsultationDialog.styles';

const HISTORICAL_GROUP_PRODUCTS: Record<string, string[]> = {
  tetanus_vaccine: ['TT', 'TD', 'TDAP', 'DTAP'],
  tetanus_passive: ['ATS', 'TIG'],
  rig: ['ERIG', 'HRIG'],
};

export interface ProphylaxisRecord {
  treatment_id: number;
  medication_given: string;
  treatment_date: string;
  scheduled_date?: string;
  status?: string;
  outcome?: string;
  remarks?: string;
  dosage_ml?: string;
  dose_iu?: string;
  vaccine_brand?: string;
  batch_no?: string;
  route?: string;
  injection_site?: string;
  administered_by?: any;
}

interface ProphylaxisAdministrationSectionProps {
  orders?: ProphylaxisOrders;
  records: ProphylaxisRecord[];
  stock: ProphylaxisStock | null | undefined;
  value: ProphylaxisAdministration[];
  onChange: (value: ProphylaxisAdministration[]) => void;
  disabled: boolean;
  today: string;
  icdCode?: string;
  onIcdCodeChange?: (val: string) => void;
}

export default function ProphylaxisAdministrationSection({
  orders,
  stock,
  records,
  value,
  onChange,
  disabled,
  today,
  icdCode,
  onIcdCodeChange,
}: ProphylaxisAdministrationSectionProps) {
  const hasAutoInitializedRef = useRef<Record<string, boolean>>({});

  const update = (medication: string, field: keyof ProphylaxisAdministration, next: string) =>
    onChange(value.map((item) => (item.medication === medication ? { ...item, [field]: next } : item)));

  // Automatically pre-fill doctor recommended prophylaxis (e.g. Tetanus vaccine) with FIFO batch & standard dose
  useEffect(() => {
    if (disabled || !orders || !stock) return;

    PROPHYLAXIS_GROUPS.forEach((group) => {
      const isTetanus = group === 'tetanus_vaccine';
      const orderedProduct = orders?.[group] || '';
      const isOrdered = isTetanus
        ? Boolean(orderedProduct && orderedProduct !== 'none')
        : PROPHYLAXIS_PRODUCTS[group].includes(orderedProduct);
      const product = isTetanus ? (isOrdered ? orderedProduct : 'TT') : orderedProduct;

      if (!isOrdered) return;

      const previous = records.filter((record) => {
        const med = (record.medication_given || '').toUpperCase();
        return HISTORICAL_GROUP_PRODUCTS[group]?.includes(med) || (isTetanus && med === orderedProduct.toUpperCase());
      });

      if (previous.length > 0) return;

      const key = `${group}_${product}`;
      if (hasAutoInitializedRef.current[key]) return;

      const batches = stock?.[product as keyof ProphylaxisStock] || (isTetanus ? stock?.['TT'] : []) || [];
      if (batches.length === 0) return;

      const exists = value.some((item) => item.medication === product);
      if (!exists) {
        hasAutoInitializedRef.current[key] = true;
        const firstBatch = batches[0];
        const newItem: ProphylaxisAdministration = {
          medication: product,
          status: 'administered',
          date: today,
          inventory_id: firstBatch ? String(firstBatch.inventory_id) : '',
          inventory_units_used: '1',
          route: group === 'rig' ? 'wound_infiltration' : 'IM',
          injection_site: group === 'rig' ? 'Wound infiltration sites' : 'Right deltoid',
          dosage_ml: group === 'tetanus_vaccine' ? '0.5' : group === 'rig' ? '' : '1.0',
          dose_iu: group === 'tetanus_passive' ? '1500' : '',
        };
        onChange([...value, newItem]);
      }
    });
  }, [orders, stock, records, disabled, today, value, onChange]);

  // If item exists in value but inventory_id is missing, auto-select FIFO batch when stock arrives
  useEffect(() => {
    if (!stock || !value.length) return;
    let updated = false;
    const nextValue = value.map((item) => {
      if (!item.inventory_id && item.status !== 'not_administered') {
        const batches = stock[item.medication] || stock['TT'] || [];
        if (batches.length > 0) {
          updated = true;
          return {
            ...item,
            inventory_id: String(batches[0].inventory_id),
            dosage_ml: item.dosage_ml || (item.medication !== 'ERIG' ? '0.5' : ''),
            injection_site:
              item.injection_site || (item.route === 'wound_infiltration' ? 'Wound infiltration sites' : 'Right deltoid'),
          };
        }
      }
      return item;
    });
    if (updated) {
      onChange(nextValue);
    }
  }, [stock, value, onChange]);

  return (
    <ConsultationDialog>
      <section className="fm-section" style={{ marginTop: 14 }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: '#e6f4f1',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HugeiconsIcon icon={Medicine01Icon} size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Doctor's Prescription Tetanus
            </h4>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#64748b' }}>
              Confirm only injections actually given — orders do not mark as administered
            </p>
          </div>
        </div>

        {/* Warning Alert Banner */}
        <div
          style={{
            background: '#fffdf2',
            border: '1px solid #fef08a',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#854d0e',
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={16} color="#b45309" style={{ flexShrink: 0 }} />
          <span>Check the box below only after physically administering the vaccine. Inventory will be deducted automatically.</span>
        </div>

        {orders?.notes && (
          <p style={{ fontSize: 12, color: '#334155', marginBottom: 12, background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <strong>Doctor's instructions:</strong> {orders.notes}
          </p>
        )}

        {PROPHYLAXIS_GROUPS.map((group) => {
          const isTetanusVaccine = group === 'tetanus_vaccine';
          const isTetanusPassive = group === 'tetanus_passive';
          const isTetanus = isTetanusVaccine || isTetanusPassive;
          const defaultProduct = isTetanusPassive ? 'ATS' : 'TT';

          const orderedProduct = orders?.[group] || '';
          const isOrdered = isTetanus
            ? Boolean(orderedProduct && orderedProduct !== 'none')
            : PROPHYLAXIS_PRODUCTS[group].includes(orderedProduct);
          const product = isTetanus ? (isOrdered ? orderedProduct : defaultProduct) : orderedProduct;

          const previous = records.filter((record) => {
            const med = (record.medication_given || '').toUpperCase();
            return HISTORICAL_GROUP_PRODUCTS[group]?.includes(med) || (isTetanus && isOrdered && med === orderedProduct.toUpperCase());
          });

          // If this group is not ordered and has no previous records, don't display section
          if (!isOrdered && previous.length === 0 && !isTetanusVaccine) {
            return null;
          }

          const batches = stock?.[product as keyof ProphylaxisStock] || (isTetanus ? stock?.[defaultProduct] : []) || [];
          const item = value.find((record) => record.medication === product);
          const isNotAdministered = item?.status === 'not_administered';
          const isChecked = Boolean(item) && !isNotAdministered;

          return (
            <div
              key={group}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                marginTop: 10,
              }}
            >
              {/* Card Title Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <HugeiconsIcon icon={Medicine01Icon} size={16} color="#0f172a" />
                <strong style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  {PROPHYLAXIS_LABELS[group]}: {isOrdered ? product : orderedProduct === 'none' ? 'Not ordered' : 'Awaiting doctor assessment'}
                </strong>
              </div>

              {previous.map((record) => {
                const prevNotAdmin = record.status === 'cancelled' || record.outcome === 'not_administered';
                return (
                  <p
                    key={record.treatment_id}
                    style={{
                      fontSize: 12,
                      color: prevNotAdmin ? '#92400e' : '#475569',
                      background: prevNotAdmin ? '#fffbeb' : '#f8fafc',
                      border: prevNotAdmin ? '1px solid #fde68a' : undefined,
                      padding: '8px 12px',
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    {prevNotAdmin ? (
                      <>
                        <strong>Not Administered:</strong> {record.medication_given}
                        {(record.scheduled_date || record.treatment_date) && ` — ${(record.scheduled_date || record.treatment_date).slice(0, 10)}`}
                        {record.remarks && ` · Reason: ${record.remarks}`}
                      </>
                    ) : (
                      <>
                        Recorded: {record.medication_given} — {record.treatment_date?.slice(0, 10)}
                        {record.dose_iu && ` · ${record.dose_iu} IU`}
                        {record.dosage_ml && ` · ${record.dosage_ml} mL`}
                        {record.vaccine_brand && ` · ${record.vaccine_brand}`}
                        {record.batch_no && ` · Batch ${record.batch_no}`}
                        {record.route && ` · ${record.route.replaceAll('_', ' ')}`}
                        {record.injection_site && ` · ${record.injection_site}`}
                      </>
                    )}
                  </p>
                );
              })}

              {isOrdered && previous.length === 0 && (
                <>
                  {stock === undefined ? (
                    <p role="status" style={{ fontSize: 12, color: '#64748b' }}>Checking clinic inventory.</p>
                  ) : stock === null ? (
                    <p role="status" style={{ fontSize: 12, color: '#ef4444' }}>Inventory is unavailable. Reopen the form to retry before recording administration.</p>
                  ) : (
                    batches.length === 0 && (
                      <p role="status" style={{ fontSize: 12, color: '#d97706', marginBottom: 8 }}>
                        No active {product} inventory batch. Obtain stock, refer the patient, or document as not administered below.
                      </p>
                    )
                  )}

                  {product === 'ATS' && (
                    <p className="registration-field-hint" style={{ marginBottom: 8, fontSize: 11.5 }}>
                      Equine ATS can cause anaphylaxis and serum sickness. Check doctor's instructions before injection.
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: item ? 12 : 0 }}>
                    {/* Soft Green Administered Checkbox Container */}
                    <div
                      onClick={() => {
                        if (disabled || batches.length === 0) return;
                        const key = `${group}_${product}`;
                        hasAutoInitializedRef.current[key] = true;
                        if (isChecked) {
                          onChange(value.filter((record) => record.medication !== product));
                        } else {
                          const firstBatch = batches[0];
                          const nextItem: ProphylaxisAdministration = {
                            medication: product,
                            status: 'administered',
                            not_administered_reason: '',
                            date: today,
                            inventory_id: firstBatch ? String(firstBatch.inventory_id) : '',
                            inventory_units_used: '1',
                            route: group === 'rig' ? 'wound_infiltration' : 'IM',
                            injection_site: group === 'rig' ? 'Wound infiltration sites' : 'Right deltoid',
                            dosage_ml: group === 'tetanus_vaccine' ? '0.5' : group === 'rig' ? '' : '1.0',
                            dose_iu: group === 'tetanus_passive' ? '1500' : '',
                          };
                          onChange([
                            ...value.filter((record) => record.medication !== product),
                            nextItem,
                          ]);
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: 210,
                        background: isChecked ? '#ecfdf5' : '#f8fafc',
                        border: `1.5px solid ${isChecked ? '#10b981' : '#cbd5e1'}`,
                        borderRadius: 8,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: disabled || batches.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: isChecked ? '#059669' : '#ffffff',
                          border: `1.5px solid ${isChecked ? '#059669' : '#94a3b8'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isChecked ? '#047857' : '#334155' }}>
                        Record {product} as administered
                      </span>
                    </div>

                    {/* Soft Amber Not Administered Checkbox Container */}
                    <div
                      onClick={() => {
                        if (disabled) return;
                        const key = `${group}_${product}`;
                        hasAutoInitializedRef.current[key] = true;
                        if (isNotAdministered) {
                          onChange(value.filter((record) => record.medication !== product));
                        } else {
                          const nextItem: ProphylaxisAdministration = {
                            medication: product,
                            status: 'not_administered',
                            not_administered_reason: item?.not_administered_reason || '',
                            date: item?.date || today,
                            inventory_id: '',
                            inventory_units_used: '0',
                            route: group === 'rig' ? 'wound_infiltration' : 'IM',
                            injection_site: '',
                            dosage_ml: '',
                            dose_iu: '',
                          };
                          onChange([
                            ...value.filter((record) => record.medication !== product),
                            nextItem,
                          ]);
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: 210,
                        background: isNotAdministered ? '#fffbeb' : '#f8fafc',
                        border: `1.5px solid ${isNotAdministered ? '#f59e0b' : '#cbd5e1'}`,
                        borderRadius: 8,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: isNotAdministered ? '#d97706' : '#ffffff',
                          border: `1.5px solid ${isNotAdministered ? '#d97706' : '#94a3b8'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {isNotAdministered && <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isNotAdministered ? '#b45309' : '#334155' }}>
                        Record {product} as not administered
                      </span>
                    </div>
                  </div>

                  {group === 'rig' && (
                    <p className="registration-field-hint" style={{ marginBottom: 12, fontSize: 11.5 }}>
                      One administration per episode; through day 7 after rabies D0. Maximum {Number(orders?.rig_weight_kg) * 40} IU.
                    </p>
                  )}

                  {/* Not Administered Inputs */}
                  {item && isNotAdministered && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <label className="fm-field" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                          Reason not administered / Remarks <span style={{ color: '#ef4444' }}>*</span>
                        </span>
                        <input
                          className="fm-input"
                          type="text"
                          value={item.not_administered_reason || ''}
                          disabled={disabled}
                          required
                          placeholder="e.g. Patient declined, prior TT booster verified, positive ATS skin test, deferred..."
                          onChange={(e) => update(product, 'not_administered_reason', e.target.value)}
                          style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                        />
                      </label>

                      <label className="fm-field" style={{ margin: 0 }}>
                        <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                          Date documented
                        </span>
                        <input
                          className="fm-input"
                          type="date"
                          value={item.date}
                          disabled={disabled}
                          required
                          min="1000-01-01"
                          max={today}
                          onChange={(e) => update(product, 'date', sanitizeDateInput(e.target.value))}
                          style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                        />
                      </label>

                      {onIcdCodeChange ? (
                        <label className="fm-field" style={{ margin: 0 }}>
                          <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                            ICD-10 Code
                          </span>
                          <input
                            className="fm-input"
                            type="text"
                            value={icdCode || ''}
                            disabled={disabled}
                            placeholder="e.g. W54.0"
                            onChange={(e) => onIcdCodeChange(e.target.value)}
                            style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                          />
                        </label>
                      ) : null}
                    </div>
                  )}

                  {/* 2-Column Administered Inputs Grid */}
                  {item && !isNotAdministered && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <label className="fm-field" style={{ margin: 0 }}>
                        <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                          Inventory batch
                        </span>
                        <select
                          className="fm-select"
                          value={item.inventory_id}
                          disabled={disabled}
                          required
                          onChange={(e) => update(product, 'inventory_id', e.target.value)}
                          style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                        >
                          <option value="">Select an active batch</option>
                          {batches.map((batch) => (
                            <option key={batch.inventory_id} value={batch.inventory_id}>
                              {batch.vaccine_type} · {batch.batch_number} · {batch.current_quantity} vials · exp {batch.expiration_date.slice(0, 10)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="fm-field" style={{ margin: 0 }}>
                        <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                          Vials used
                        </span>
                        <input
                          className="fm-input"
                          type="number"
                          min="1"
                          step="1"
                          required
                          disabled={disabled}
                          max={batches.find((batch) => String(batch.inventory_id) === item.inventory_id)?.current_quantity}
                          value={item.inventory_units_used}
                          onChange={(e) => update(product, 'inventory_units_used', e.target.value)}
                          style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                        />
                        <span className="registration-field-hint" style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'block' }}>
                          Confirm vial count on package. System stores vial count, not mL/IU.
                        </span>
                      </label>

                      <label className="fm-field" style={{ margin: 0 }}>
                        <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                          Administration date
                        </span>
                        <input
                          className="fm-input"
                          type="date"
                          value={item.date}
                          disabled={disabled}
                          required
                          min="1000-01-01"
                          max={today}
                          onInput={(e) => {
                            const target = e.currentTarget;
                            const val = sanitizeDateInput(target.value);
                            if (val !== target.value) {
                              target.value = val;
                              update(product, 'date', val);
                            }
                          }}
                          onChange={(e) => update(product, 'date', sanitizeDateInput(e.target.value))}
                          style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                        />
                      </label>

                      {onIcdCodeChange ? (
                        <label className="fm-field" style={{ margin: 0 }}>
                          <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                            ICD-10 Code
                          </span>
                          <input
                            className="fm-input"
                            type="text"
                            value={icdCode || ''}
                            disabled={disabled}
                            placeholder="e.g. W54.0"
                            onChange={(e) => onIcdCodeChange(e.target.value)}
                            style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                          />
                        </label>
                      ) : null}

                      {(group === 'rig' || group === 'tetanus_passive') && (
                        <label className="fm-field" style={{ margin: 0 }}>
                          <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                            Administered dose (IU)
                          </span>
                          <input
                            className="fm-input"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.dose_iu}
                            disabled={disabled}
                            required
                            onChange={(e) => update(product, 'dose_iu', e.target.value)}
                            style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                          />
                        </label>
                      )}

                      {group === 'rig' && (
                        <label className="fm-field" style={{ margin: 0 }}>
                          <span className="fm-label" style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 3, display: 'block' }}>
                            Wound infiltration sites
                          </span>
                          <input
                            className="fm-input"
                            type="text"
                            value={item.injection_site}
                            disabled={disabled}
                            required
                            onChange={(e) => update(product, 'injection_site', e.target.value)}
                            style={{ width: '100%', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, height: 34 }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>
    </ConsultationDialog>
  );
}
