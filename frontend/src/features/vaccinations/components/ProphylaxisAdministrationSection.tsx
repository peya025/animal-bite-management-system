import { useEffect, useMemo, useRef } from 'react';
import { useClinicModuleConfig } from '../../../hooks/useClinicModuleConfig';
import { HugeiconsIcon } from '@hugeicons/react';
import { Medicine01Icon, AlertCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { PROPHYLAXIS_GROUPS, PROPHYLAXIS_LABELS, PROPHYLAXIS_PRODUCTS } from '../../../shared/types/prophylaxis';
import type { ProphylaxisOrders, ProphylaxisAdministration, ProphylaxisStock } from '../../../shared/types/prophylaxis';
import { sanitizeDateInput } from '../../../shared/utils/date';
import { SearchableSelect } from '../../../shared/components';
import { buildIcd10Options } from '../../../shared/constants/icd10Codes';
import { formatVaccineDisplayName } from '../../inventory/components/StockLevelIndicator/StockLevelIndicator';
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
  defaultInfiltrationSite?: string;
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
  defaultInfiltrationSite,
}: ProphylaxisAdministrationSectionProps) {
  const { isFieldVisible } = useClinicModuleConfig();
  const hasAutoInitializedRef = useRef<Record<string, boolean>>({});

  const rigWeightKg = Number(orders?.rig_weight_kg || 0);
  const rigMaxIu = rigWeightKg > 0 ? Math.round(rigWeightKg * 40) : 0;
  const computeRigVials = (doseIuValue: number | string, maxStock?: number): string => {
    const iu = Number(doseIuValue || 0);
    const needed = iu > 0 ? Math.max(1, Math.ceil(iu / 1000)) : 1;
    if (maxStock && maxStock > 0) {
      return String(Math.min(needed, maxStock));
    }
    return String(needed);
  };
  const resolvedInfiltrationSite = (defaultInfiltrationSite || '').trim() || 'Around bite wound';

  const update = (medication: string, field: keyof ProphylaxisAdministration, next: string) =>
    onChange(value.map((item) => (item.medication === medication ? { ...item, [field]: next } : item)));

  // Automatically pre-fill doctor recommended prophylaxis (e.g. Tetanus vaccine) with FIFO batch & standard dose
  useEffect(() => {
    if (disabled || !orders || !stock) return;

    PROPHYLAXIS_GROUPS.forEach((group) => {
      const isTetanusVaccine = group === 'tetanus_vaccine';
      const isTetanusPassive = group === 'tetanus_passive';
      const isRig = group === 'rig';
      const isTetanus = isTetanusVaccine || isTetanusPassive;
      const defaultProduct = isTetanusPassive ? 'ATS' : isRig ? 'ERIG' : 'TT';

      const orderedProduct = orders?.[group] || '';
      const isOrdered = Boolean(orderedProduct && orderedProduct !== 'none');
      const product = isOrdered ? orderedProduct : defaultProduct;

      if (!isOrdered) return;

      const previous = records.filter((record) => {
        const med = (record.medication_given || '').toUpperCase();
        return HISTORICAL_GROUP_PRODUCTS[group]?.includes(med) || (isOrdered && med === orderedProduct.toUpperCase());
      });

      if (previous.length > 0) return;

      const key = `${group}_${product}`;
      if (hasAutoInitializedRef.current[key]) return;

      const batches = stock?.[product as keyof ProphylaxisStock] || stock?.[defaultProduct] || [];
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
          inventory_units_used:
            group === 'rig'
              ? computeRigVials(rigMaxIu, Number(firstBatch?.current_quantity || 0))
              : '1',
          route: group === 'rig' ? 'wound_infiltration' : 'IM',
          injection_site: group === 'rig' ? resolvedInfiltrationSite : 'Right deltoid',
          dosage_ml: group === 'tetanus_vaccine' ? '0.5' : group === 'rig' ? '' : '1.0',
          dose_iu:
            group === 'tetanus_passive'
              ? '1500'
              : group === 'rig' && rigMaxIu > 0
              ? String(rigMaxIu)
              : '',
        };
        onChange([...value, newItem]);
      }
    });
  }, [orders, stock, records, disabled, today, value, onChange, rigMaxIu, resolvedInfiltrationSite]);

  // If item exists in value but inventory_id is missing, auto-select FIFO batch when stock arrives
  useEffect(() => {
    if (!stock || !value.length) return;
    let updated = false;
    const nextValue = value.map((item) => {
      if (!item.inventory_id && item.status !== 'not_administered') {
        const isRigItem = item.route === 'wound_infiltration' || item.medication === 'ERIG';
        const batches = stock[item.medication] || (isRigItem ? stock['ERIG'] : stock['TT']) || [];
        if (batches.length > 0) {
          updated = true;
          return {
            ...item,
            inventory_id: String(batches[0].inventory_id),
            dosage_ml: item.dosage_ml || (!isRigItem ? '0.5' : ''),
            injection_site:
              item.injection_site || (isRigItem ? 'Wound infiltration sites' : 'Right deltoid'),
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
        {/* Compact Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HugeiconsIcon icon={Medicine01Icon} size={14} />
            </div>
            <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
              Prescribed Prophylaxis
            </h4>
          </div>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            Confirm injections actually given · stock auto-deducts
          </span>
        </div>

        {orders?.notes && (
          <p style={{ fontSize: 12, color: '#334155', margin: '0 0 8px', background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong>Notes:</strong> {orders.notes}
          </p>
        )}

        {PROPHYLAXIS_GROUPS.map((group) => {
          const isTetanusVaccine = group === 'tetanus_vaccine';
          const isTetanusPassive = group === 'tetanus_passive';
          const isRig = group === 'rig';
          const isTetanus = isTetanusVaccine || isTetanusPassive;
          const defaultProduct = isTetanusPassive ? 'ATS' : isRig ? 'ERIG' : 'TT';

          const orderedProduct = orders?.[group] || '';
          const isOrdered = Boolean(orderedProduct && orderedProduct !== 'none');
          const product = isOrdered ? orderedProduct : defaultProduct;

          const previous = records.filter((record) => {
            const med = (record.medication_given || '').toUpperCase();
            return HISTORICAL_GROUP_PRODUCTS[group]?.includes(med) || (isOrdered && med === orderedProduct.toUpperCase());
          });

          // If this group is not ordered and has no previous records, don't display section
          if (!isOrdered && previous.length === 0 && !isTetanusVaccine) {
            return null;
          }

          const batches = stock?.[product as keyof ProphylaxisStock] || stock?.[defaultProduct] || [];
          const totalVials = batches.reduce((sum, b) => sum + Number(b.current_quantity || 0), 0);
          const displayProduct = formatVaccineDisplayName(product);
          const item = value.find((record) => record.medication === product);
          const isNotAdministered = item?.status === 'not_administered';
          const isChecked = Boolean(item) && !isNotAdministered;

          return (
            <div
              key={group}
              className="prophylaxis-minimal"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '10px 14px',
                marginTop: 8,
              }}
            >
              {/* Compact Card Header: Title + Stock + Inline Administered / Not Administered Pills */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: (item || previous.length > 0) ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {PROPHYLAXIS_LABELS[group]}: {isOrdered ? displayProduct : orderedProduct === 'none' ? 'Not ordered' : 'Awaiting doctor assessment'}
                  </strong>
                  {isOrdered && stock !== undefined && stock !== null && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f8fafc', padding: '2px 8px', borderRadius: 999, border: '1px solid #e2e8f0' }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: totalVials === 0 ? '#dc2626' : totalVials <= 10 ? '#d97706' : '#16a34a',
                          flexShrink: 0,
                        }}
                      />
                      <span>{totalVials} {totalVials === 1 ? 'vial' : 'vials'}</span>
                    </span>
                  )}
                </div>

                {isOrdered && previous.length === 0 && (
                  <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={disabled || batches.length === 0}
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
                            inventory_units_used:
                              group === 'rig'
                                ? computeRigVials(rigMaxIu, Number(firstBatch?.current_quantity || 0))
                                : '1',
                            route: group === 'rig' ? 'wound_infiltration' : 'IM',
                            injection_site: group === 'rig' ? resolvedInfiltrationSite : 'Right deltoid',
                            dosage_ml: group === 'tetanus_vaccine' ? '0.5' : group === 'rig' ? '' : '1.0',
                            dose_iu:
                              group === 'tetanus_passive'
                                ? '1500'
                                : group === 'rig' && rigMaxIu > 0
                                ? String(rigMaxIu)
                                : '',
                          };
                          onChange([
                            ...value.filter((record) => record.medication !== product),
                            nextItem,
                          ]);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 12px',
                        minHeight: 30,
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: isChecked ? '#ecfdf5' : '#f8fafc',
                        border: `1.5px solid ${isChecked ? '#10b981' : '#cbd5e1'}`,
                        color: isChecked ? '#047857' : '#475569',
                        cursor: disabled || batches.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isChecked && <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />}
                      <span>Administered</span>
                    </button>

                    <button
                      type="button"
                      disabled={disabled}
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 12px',
                        minHeight: 30,
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: isNotAdministered ? '#fffbeb' : '#f8fafc',
                        border: `1.5px solid ${isNotAdministered ? '#f59e0b' : '#cbd5e1'}`,
                        color: isNotAdministered ? '#b45309' : '#475569',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isNotAdministered && <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />}
                      <span>Not administered</span>
                    </button>
                  </div>
                )}
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
                    <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#b45309' }}>
                      Equine ATS: check skin test &amp; doctor instructions before injection.
                    </p>
                  )}

                  {/* Not Administered Inputs */}
                  {item && isNotAdministered && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                      <label className="fm-field" style={{ margin: 0 }}>
                        <span className="fm-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 2, display: 'block' }}>
                          Reason <span style={{ color: '#ef4444' }}>*</span>
                        </span>
                        <input
                          className="fm-input"
                          type="text"
                          value={item.not_administered_reason || ''}
                          disabled={disabled}
                          required
                          placeholder="Reason not administered..."
                          onChange={(e) => update(product, 'not_administered_reason', e.target.value)}
                        />
                      </label>

                      <label className="fm-field" style={{ margin: 0 }}>
                        <span className="fm-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 2, display: 'block' }}>
                          Date
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
                        />
                      </label>
                    </div>
                  )}

                  {/* Compact Administered Inputs Grid */}
                  {item && !isNotAdministered && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 78px', gap: 10 }}>
                        <label className="fm-field" style={{ margin: 0 }}>
                          <span className="fm-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 2, display: 'block' }}>
                            Batch
                          </span>
                          <select
                            className="fm-select"
                            value={item.inventory_id}
                            disabled={disabled}
                            required
                            onChange={(e) => update(product, 'inventory_id', e.target.value)}
                          >
                            <option value="">Select batch</option>
                            {batches.map((batch) => (
                              <option key={batch.inventory_id} value={batch.inventory_id}>
                                {batch.vaccine_type} · {batch.batch_number} ({batch.current_quantity}) · exp {batch.expiration_date.slice(0, 10)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="fm-field" style={{ margin: 0 }}>
                          <span className="fm-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 2, display: 'block' }}>
                            Date
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
                          />
                        </label>

                        <label className="fm-field" style={{ margin: 0 }}>
                          <span className="fm-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 2, display: 'block' }}>
                            Vials
                          </span>
                          <input
                            className="fm-input"
                            type="number"
                            min={1}
                            max={
                              group === 'rig'
                                ? Math.max(
                                    1,
                                    Number(
                                      batches.find((b) => String(b.inventory_id) === String(item.inventory_id))
                                        ?.current_quantity || 10
                                    )
                                  )
                                : 1
                            }
                            readOnly={group !== 'rig'}
                            disabled={disabled || group !== 'rig'}
                            value={item.inventory_units_used || '1'}
                            onChange={(e) => {
                              if (group !== 'rig') return;
                              update(product, 'inventory_units_used', e.target.value);
                            }}
                            style={
                              group !== 'rig'
                                ? { textAlign: 'center', backgroundColor: '#f8fafc', color: '#475569', cursor: 'not-allowed' }
                                : { textAlign: 'center' }
                            }
                          />
                        </label>
                      </div>

                      {((group === 'rig' || group === 'tetanus_passive') || (group === 'rig' && isFieldVisible('injection_site'))) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 10 }}>
                          {(group === 'rig' || group === 'tetanus_passive') && (
                            <label className="fm-field" style={{ margin: 0 }}>
                              <span className="fm-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 2, display: 'block' }}>
                                Dose (IU){group === 'rig' && rigMaxIu > 0 ? ` · max ${rigMaxIu}` : ''}
                              </span>
                              <input
                                className="fm-input"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={group === 'rig' && rigMaxIu > 0 ? rigMaxIu : undefined}
                                placeholder="IU"
                                value={item.dose_iu}
                                disabled={disabled}
                                required
                                onChange={(e) => {
                                  const nextIu = e.target.value;
                                  if (group === 'rig') {
                                    const selectedBatch = batches.find(
                                      (b) => String(b.inventory_id) === String(item.inventory_id)
                                    );
                                    const autoVials = computeRigVials(
                                      nextIu,
                                      Number(selectedBatch?.current_quantity || 0)
                                    );
                                    onChange(
                                      value.map((r) =>
                                        r.medication === product
                                          ? { ...r, dose_iu: nextIu, inventory_units_used: autoVials }
                                          : r
                                      )
                                    );
                                  } else {
                                    update(product, 'dose_iu', nextIu);
                                  }
                                }}
                              />
                            </label>
                          )}

                          {group === 'rig' && isFieldVisible('injection_site') && (
                            <label className="fm-field" style={{ margin: 0 }}>
                              <span className="fm-label" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 2, display: 'block' }}>
                                Infiltration site
                              </span>
                              <input
                                className="fm-input"
                                type="text"
                                placeholder="e.g. Around wound margins"
                                value={item.injection_site}
                                disabled={disabled}
                                required
                                onChange={(e) => update(product, 'injection_site', e.target.value)}
                              />
                            </label>
                          )}
                        </div>
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
