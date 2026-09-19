import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Stethoscope02Icon, LockIcon as HugeLockIcon } from '@hugeicons/core-free-icons';
import type { VaccineStockMap } from '../../types/consultation.types';

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
    <div style={{ marginBottom: 20 }}>
      {/* ── 🩺 Prescribed PEP Vaccine (Doctor's Order → locks Nurse Form 3) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>
          Prescribed PEP Vaccine
        </label>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: '#dcfce7',
            color: '#166534',
            borderRadius: 99,
            padding: '2px 8px',
            border: '1px solid #86efac',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <HugeiconsIcon icon={Stethoscope02Icon} size={11} strokeWidth={2.2} /> Rx — Doctor's Order
        </span>
        {isFormDisabled && prescribedVaccineType && (
          <span
            style={{
              fontSize: 10,
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
            <HugeiconsIcon icon={HugeLockIcon} size={11} strokeWidth={2.2} /> Locked
          </span>
        )}
      </div>
      <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 0' }}>
        Select the vaccine to prescribe for PEP. This will pre-fill and lock the nurse's Form 3 vaccine selection.
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <select
          value={prescribedVaccineType}
          onChange={(e) => onChange(e.target.value)}
          disabled={isFormDisabled}
          style={{
            flex: 1,
            padding: '9px 12px',
            border: '1.5px solid #86efac',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: prescribedVaccineType ? 600 : 400,
            backgroundColor: isFormDisabled ? '#f9fafb' : '#f0fdf4',
            color: prescribedVaccineType ? '#166534' : '#64748b',
            cursor: isFormDisabled ? 'not-allowed' : 'pointer',
            outline: 'none',
          }}
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
          const chipColor = isOut ? '#dc2626' : isLow ? '#b45309' : '#166534';
          const chipBg = isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#dcfce7';
          const chipBorder = isOut ? '#fecaca' : isLow ? '#fde68a' : '#86efac';
          return (
            <div
              style={{
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 600,
                color: chipColor,
                background: chipBg,
                border: `1.5px solid ${chipBorder}`,
                borderRadius: 8,
                padding: '8px 12px',
                lineHeight: 1.5,
                minWidth: 170,
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

      {/* ── Medication / Treatment: automatically mirrors the prescribed vaccine ── */}
      <div style={{ marginTop: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
          Medication / Treatment
        </label>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 0' }}>
          Automatically populated from the Prescribed PEP Vaccine above.
        </p>
        <input
          type="text"
          value={medicationTreatment}
          readOnly
          disabled
          placeholder="No PEP vaccine prescribed"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1.5px solid #bfdbfe',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'inherit',
            backgroundColor: '#f9fafb',
            color: medicationTreatment ? '#1d4ed8' : '#9ca3af',
            lineHeight: 1.6,
            cursor: 'not-allowed',
          }}
        />
      </div>
    </div>
  );
}
