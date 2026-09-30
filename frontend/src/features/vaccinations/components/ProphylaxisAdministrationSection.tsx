import { PROPHYLAXIS_GROUPS, PROPHYLAXIS_LABELS, PROPHYLAXIS_PRODUCTS } from '../../../shared/types/prophylaxis';
import type { ProphylaxisOrders, ProphylaxisAdministration, ProphylaxisStock } from '../../../shared/types/prophylaxis';
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
  dosage_ml?: string;
  dose_iu?: string;
  vaccine_brand?: string;
  batch_no?: string;
  route?: string;
  injection_site?: string;
}

export default function ProphylaxisAdministrationSection({ orders, stock, records, value, onChange, disabled, today }: {
  orders?: ProphylaxisOrders; records: ProphylaxisRecord[];
  stock: ProphylaxisStock | null | undefined;
  value: ProphylaxisAdministration[]; onChange: (value: ProphylaxisAdministration[]) => void;
  disabled: boolean; today: string;
}) {
  const update = (medication: string, field: keyof ProphylaxisAdministration, next: string) =>
    onChange(value.map(item => item.medication === medication ? { ...item, [field]: next } : item));

  return <ConsultationDialog><section className="fm-section" style={{ marginTop: 24 }}>
    <h3 className="fm-section-title">Prescribed Prophylaxis Administration</h3>
    <p>Confirm only injections actually given. Orders do not mark an injection as administered.</p>
    {orders?.notes && <p><strong>Doctor's instructions:</strong> {orders.notes}</p>}
    {PROPHYLAXIS_GROUPS.map(group => {
      const isTetanus = group === 'tetanus_vaccine';
      const orderedProduct = orders?.[group] || '';
      const isOrdered = isTetanus
        ? Boolean(orderedProduct && orderedProduct !== 'none')
        : PROPHYLAXIS_PRODUCTS[group].includes(orderedProduct);
      const product = isTetanus ? (isOrdered ? orderedProduct : 'TT') : orderedProduct;

      const previous = records.filter(record => {
        const med = (record.medication_given || '').toUpperCase();
        return HISTORICAL_GROUP_PRODUCTS[group]?.includes(med) || (isTetanus && isOrdered && med === orderedProduct.toUpperCase());
      });

      // If this group is not ordered and has no previous records, don't display unnecessary assessment section
      if (!isOrdered && previous.length === 0 && !isTetanus) {
        return null;
      }

      const batches = stock?.[product as keyof ProphylaxisStock] || (isTetanus ? stock?.['TT'] : []) || [];
      const item = value.find(record => record.medication === product);

      return <div key={group} style={{ borderTop: '1px solid var(--input-border)', padding: '12px 0' }}>
        <strong>{PROPHYLAXIS_LABELS[group]}: {isOrdered ? product : orderedProduct === 'none' ? 'Not ordered' : 'Awaiting doctor assessment'}</strong>
        {previous.map(record => <p key={record.treatment_id}>
          Recorded: {record.medication_given} — {record.treatment_date?.slice(0, 10)}
          {record.dose_iu && ` · ${record.dose_iu} IU`}{record.dosage_ml && ` · ${record.dosage_ml} mL`}
          {record.vaccine_brand && ` · ${record.vaccine_brand}`}{record.batch_no && ` · Batch ${record.batch_no}`}
          {record.route && ` · ${record.route.replaceAll('_', ' ')}`}{record.injection_site && ` · ${record.injection_site}`}
        </p>)}
        {isOrdered && previous.length === 0 && <>
          {stock === undefined ? <p role="status">Checking clinic inventory.</p> : stock === null ? <p role="status">Inventory is unavailable. Reopen the form to retry before recording administration.</p> : batches.length === 0 && <p role="status">No active {product} inventory batch. Obtain stock or refer the patient before recording administration.</p>}
          {product === 'ATS' && <p className="registration-field-hint">Equine ATS can cause anaphylaxis and serum sickness. Check the doctor's product-specific instructions, allergy history, local protocol and emergency readiness before injection.</p>}
          <label style={{ display: 'block', margin: '8px 0' }}>
            <input type="checkbox" checked={Boolean(item)} disabled={disabled || batches.length === 0} onChange={e => onChange(e.target.checked
              ? [...value, { medication: product, date: today, inventory_id: '', inventory_units_used: '1', route: group === 'rig' ? 'wound_infiltration' : 'IM', injection_site: '', dosage_ml: '', dose_iu: '' }]
              : value.filter(record => record.medication !== product))} /> Record {product} administered
          </label>
          {group === 'rig' && <p className="registration-field-hint">One administration per episode; through day 7 after the first rabies vaccine. Maximum {Number(orders?.rig_weight_kg) * 40} IU. Verify concentration on the selected vial and document actual wound infiltration.</p>}
          {item && <div className="fm-grid">
            <label className="fm-field"><span className="fm-label">Inventory batch</span>
              <select className="fm-select" value={item.inventory_id} disabled={disabled} required onChange={e => update(product, 'inventory_id', e.target.value)}>
                <option value="">Select an active batch</option>
                {batches.map(batch => <option key={batch.inventory_id} value={batch.inventory_id}>
                  {batch.vaccine_type} · {batch.batch_number} · {batch.current_quantity} vial{batch.current_quantity === 1 ? '' : 's'} · expires {batch.expiration_date.slice(0, 10)}
                </option>)}
              </select>
            </label>
            <label className="fm-field"><span className="fm-label">Inventory vials used</span>
              <input className="fm-input" type="number" min="1" step="1" required disabled={disabled}
                max={batches.find(batch => String(batch.inventory_id) === item.inventory_id)?.current_quantity}
                value={item.inventory_units_used} onChange={e => update(product, 'inventory_units_used', e.target.value)} />
              <span className="registration-field-hint">Confirm vial size and strength on the package. Inventory stores vial count; it does not calculate IU from mL.</span>
            </label>
            {([
              ['date', 'Administration date', 'date'], ['dosage_ml', 'Administered volume (mL)', 'number'],
              ...(group !== 'tetanus_vaccine' ? [['dose_iu', 'Administered dose (IU)', 'number']] : []),
              ['injection_site', group === 'rig' ? 'Wound infiltration sites' : 'IM injection site', 'text'],
            ] as [keyof ProphylaxisAdministration, string, string][]).map(([field, label, type]) => <label className="fm-field" key={field}>
              <span className="fm-label">{label}</span>
              <input className="fm-input" type={type} value={item[field]} disabled={disabled} required
                step={type === 'number' ? '0.01' : undefined} min={type === 'number' ? '0.01' : undefined}
                max={type === 'date' ? today : undefined} onChange={e => update(product, field, e.target.value)} />
            </label>)}
            <p>Route: {item.route === 'IM' ? 'Intramuscular (IM)' : 'Wound infiltration'}</p>
          </div>}
        </>}
      </div>;
    })}
  </section></ConsultationDialog>;
}
