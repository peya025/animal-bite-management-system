import { HugeiconsIcon } from '@hugeicons/react';
import { Stethoscope02Icon, LockIcon as HugeLockIcon } from '@hugeicons/core-free-icons';
import type { VaccineStockMap } from '../../types/consultation.types';
import { FormField } from '../FormField';

interface PrescribedVaccineSectionProps {
  prescribedVaccineType: string;
  medicationTreatment: string;
  isFormDisabled: boolean;
  vaccineNames: string[];
  vaccineStockMap: VaccineStockMap;
  onChange: (vaccineType: string) => void;
}

export default function PrescribedVaccineSection({
  prescribedVaccineType,
  medicationTreatment,
  isFormDisabled,
  vaccineNames,
  vaccineStockMap,
  onChange,
}: PrescribedVaccineSectionProps) {
  const stock = prescribedVaccineType ? vaccineStockMap[prescribedVaccineType] : undefined;

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">VII. Prescribed PEP Vaccine & Treatment Order</h3>

      <div className="fm-grid">
        <div className="fm-field fm-grid--full">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <label className="fm-label" style={{ margin: 0 }}>
              Prescribed PEP Vaccine
            </label>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--nav-item-active-bg, #ecfdf5)',
                color: 'var(--nav-item-active-color, #047857)',
                borderRadius: 99,
                padding: '2px 8px',
                border: '1px solid var(--input-border, #a7f3d0)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <HugeiconsIcon icon={Stethoscope02Icon} size={12} strokeWidth={2.2} /> Rx — Doctor's Order
            </span>
            {isFormDisabled && prescribedVaccineType && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: 99,
                  padding: '2px 8px',
                  border: '1px solid #fde68a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <HugeiconsIcon icon={HugeLockIcon} size={12} strokeWidth={2.2} /> Locked
              </span>
            )}
          </div>
          <span className="registration-field-hint" style={{ marginBottom: 8, display: 'block' }}>
            Select the vaccine to prescribe for PEP. This will pre-fill and lock the nurse's Form 3 vaccine selection.
          </span>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <select
              className="fm-select"
              name="prescribed_vaccine_type"
              value={prescribedVaccineType}
              onChange={(e) => onChange(e.target.value)}
              disabled={isFormDisabled}
              style={{ flex: 1, minWidth: 260 }}
            >
              <option value="">— No PEP vaccine prescribed (Category I only) —</option>
              {vaccineNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Inline stock chip */}
            {prescribedVaccineType && stock && (() => {
              const isOut = stock.total_stock === 0 && (stock.open_doses_remaining ?? 0) === 0;
              const isLow = stock.total_stock > 0 && stock.total_stock <= 5;
              const chipColor = isOut ? '#dc2626' : isLow ? '#b45309' : '#047857';
              const chipBg = isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#ecfdf5';
              const chipBorder = isOut ? '#fecaca' : isLow ? '#fde68a' : '#a7f3d0';
              return (
                <div
                  style={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: chipColor,
                    background: chipBg,
                    border: `1px solid ${chipBorder}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    lineHeight: 1.5,
                    minWidth: 170,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      display: 'inline-block',
                      marginRight: 6,
                      backgroundColor: chipColor,
                    }}
                  />
                  {isOut ? 'Out of Stock' : `${stock.total_stock} sealed vial${stock.total_stock === 1 ? '' : 's'}`}
                  {!isOut && stock.doses_per_vial > 1 && (
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#0284c7', marginTop: 2 }}>
                      ≈ {stock.patient_capacity} patients ({stock.doses_per_vial}/vial)
                    </div>
                  )}
                  {stock.open_vials_count > 0 && stock.open_fraction_used && (
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#0e7490',
                        marginTop: 4,
                        background: '#ecfeff',
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #a5f3fc',
                      }}
                    >
                      • Open vial: <strong>{stock.open_fraction_used} used</strong> ({stock.open_fraction_remaining} left)
                    </div>
                  )}
                  {isOut && <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>Notify Admin</div>}
                </div>
              );
            })()}
          </div>
        </div>

        <FormField label="Medication / Treatment" className="fm-grid--full" hint="Automatically populated from the Prescribed PEP Vaccine above.">
          <input
            className="fm-input"
            type="text"
            name="medication_treatment"
            value={medicationTreatment}
            readOnly
            disabled
            placeholder="No PEP vaccine prescribed"
          />
        </FormField>
      </div>
    </div>
  );
}
