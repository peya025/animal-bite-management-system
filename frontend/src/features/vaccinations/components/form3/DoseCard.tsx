import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Hospital02Icon,
  Share01Icon,
  PackageIcon,
  SignatureIcon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { SegmentedControl } from './SegmentedControl';
import SignatureImage from '../../../../shared/components/SignatureImage';

interface DoseCardProps {
  dose: any;
  index: number;
  isToday: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  prescribedVaccineType: string;
  availableVaccineTypes: string[];
  fifoError?: string;
  readOnly: boolean;
  currentUser: any;
  applySignature: boolean;
  signatureReady: boolean;
  signatureVersion?: string | null;
  signatureLoadError?: boolean;
  onDoseChange: (index: number, field: any, value: any) => void;
  onDoseVaccineTypeChange: (index: number, vaccineType: string) => void;
  onToggleSignature?: (apply: boolean) => void;
  onSignatureReady?: (ready: boolean) => void;
  onRefreshSignature?: () => void;
}

const BORDER_RADIUS = 8;

export function DoseCard({
  dose,
  index,
  isToday,
  isCompleted,
  isLocked,
  prescribedVaccineType,
  availableVaccineTypes,
  fifoError,
  readOnly: _readOnly,
  currentUser,
  applySignature,
  signatureReady,
  signatureVersion,
  signatureLoadError,
  onDoseChange,
  onDoseVaccineTypeChange,
  onToggleSignature,
  onSignatureReady,
  onRefreshSignature,
}: DoseCardProps) {
  const isExternal = Boolean(dose.is_external);
  const routeOptions = [
    { value: 'ID', label: 'ID' },
    { value: 'IM', label: 'IM' },
  ] as const;

  return (
    <div
      style={{
        background: 'var(--dose-card-bg, #f0fdf4)',
        border: '1px solid var(--dose-card-border, #bbf7d0)',
        borderRadius: BORDER_RADIUS,
        padding: '16px 20px',
        marginBottom: 12,
        boxSizing: 'border-box',
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
            {dose.period} · {isToday ? 'Today' : dose.date || 'Today'}
          </strong>
        </div>

        <div>
          {isCompleted ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#15803d',
                background: '#dcfce7',
                padding: '3px 10px',
                borderRadius: BORDER_RADIUS,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="#15803d" />
              <span>Administered</span>
            </span>
          ) : isExternal ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#0369a1',
                background: '#e0f2fe',
                padding: '3px 10px',
                borderRadius: BORDER_RADIUS,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <HugeiconsIcon icon={Hospital02Icon} size={14} color="#0369a1" />
              <span>External</span>
            </span>
          ) : (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#166534',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Ready to give
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Route, Date, Vaccine */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        {/* 1. Route */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-h, #374151)', marginBottom: 6 }}>
            Route
          </label>
          <SegmentedControl
            options={routeOptions}
            value={dose.route || 'ID'}
            onChange={(val) => onDoseChange(index, 'route', val)}
            disabled={isLocked}
            ariaLabel={`Route for ${dose.period}`}
          />
        </div>

        {/* 2. Date */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-h, #374151)', marginBottom: 6 }}>
            Date
          </label>
          <input
            type="date"
            value={dose.date || ''}
            onChange={(e) => onDoseChange(index, 'date', e.target.value)}
            disabled={isLocked}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--input-border, #d1d5db)',
              borderRadius: BORDER_RADIUS,
              fontSize: 13,
              backgroundColor: isCompleted ? 'var(--card-bg-nested, #f8fafc)' : 'var(--card-bg-solid, #ffffff)',
              color: 'var(--input-text, #111827)',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* 3. Vaccine */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-h, #374151)', marginBottom: 6 }}>
            Vaccine {prescribedVaccineType && <span style={{ fontWeight: 400, color: '#047857' }}>(doctor's order: {prescribedVaccineType})</span>}
          </label>
          <select
            value={dose.vaccine_type || ''}
            onChange={(e) => onDoseVaccineTypeChange(index, e.target.value)}
            disabled={isLocked || Boolean(prescribedVaccineType && !isCompleted)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: prescribedVaccineType && !isCompleted ? '1.5px solid #86efac' : '1px solid var(--input-border, #d1d5db)',
              borderRadius: BORDER_RADIUS,
              fontSize: 13,
              backgroundColor: isCompleted ? 'var(--card-bg-nested, #f8fafc)' : 'var(--card-bg-solid, #ffffff)',
              color: 'var(--input-text, #111827)',
              boxSizing: 'border-box',
              outline: 'none',
              cursor: (isCompleted || Boolean(prescribedVaccineType && !isCompleted)) ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">— Select Vaccine —</option>
            {availableVaccineTypes.map((vType) => (
              <option key={vType} value={vType}>
                {vType}
              </option>
            ))}
          </select>

          {/* Transferred-in toggle */}
          <div style={{ marginTop: 6 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#0369a1', cursor: isLocked ? 'default' : 'pointer', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={isExternal}
                disabled={isLocked}
                onChange={(e) => onDoseChange(index, 'is_external', e.target.checked)}
              />
              <span>Transferred-in (External Clinic)</span>
            </label>
            {isExternal && (
              <input
                type="text"
                value={dose.external_facility_name || ''}
                placeholder="External hospital / clinic name"
                disabled={isLocked}
                onChange={(e) => onDoseChange(index, 'external_facility_name', e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  borderRadius: BORDER_RADIUS,
                  border: '1px solid #7dd3fc',
                  backgroundColor: '#f0f9ff',
                  color: '#0c4a6e',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* FIFO Batch Preview & Multi-Dose Vial Progress block */}
      <div style={{ marginBottom: 14 }}>
        {isExternal ? (
          <div style={{ fontSize: 12, color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: BORDER_RADIUS, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <HugeiconsIcon icon={Hospital02Icon} size={14} color="#0284c7" />
            <span>Transferred-in dose ({dose.external_facility_name || 'External facility'}) · 0 local stock deducted</span>
          </div>
        ) : isCompleted ? (
          <div
            style={{
              background: 'var(--card-bg-solid, #ffffff)',
              border: '1px solid #e2e8f0',
              borderRadius: BORDER_RADIUS,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: dose.inventory_units_used === '0' ? '#0e7490' : '#15803d',
                    background: dose.inventory_units_used === '0' ? '#ecfeff' : '#dcfce7',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {dose.inventory_units_used === '0' ? 'Shared Vial (0 deducted)' : `${dose.inventory_units_used || 1} vial deducted`}
                </span>
                {Number(dose.total_doses) > 1 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    {dose.next_dose_index || 1}/{dose.total_doses} of 1 vial
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                Batch: {dose.batch_number || 'Administered'} · Exp: {dose.expiration_date || 'N/A'}
              </span>
            </div>
            {Number(dose.total_doses) > 1 && (
              <div
                style={{
                  width: '100%',
                  height: 6,
                  backgroundColor: '#e2e8f0',
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.round(((Number(dose.next_dose_index) || 1) / Number(dose.total_doses)) * 100))}%`,
                    height: '100%',
                    backgroundColor: '#15803d',
                    borderRadius: 4,
                  }}
                />
              </div>
            )}
          </div>
        ) : dose.vaccine_type ? (
          dose.batch_number ? (
            <div
              style={{
                background: 'var(--card-bg-solid, #ffffff)',
                border: '1px solid #cbd5e1',
                borderRadius: BORDER_RADIUS,
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* Row 1: Stock allocation type, multi-dose fraction, and stock units */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {dose.is_open_vial ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0e7490',
                        background: '#cffafe',
                        padding: '2px 8px',
                        borderRadius: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <HugeiconsIcon icon={Share01Icon} size={12} color="#0e7490" />
                      <span>Auto-Shared Vial · 0 stock deducted</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#1e40af',
                        background: '#dbeafe',
                        padding: '2px 8px',
                        borderRadius: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <HugeiconsIcon icon={PackageIcon} size={12} color="#1e40af" />
                      <span>Opens New Vial · 1 vial deducted</span>
                    </span>
                  )}

                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                    {Number(dose.total_doses) > 1
                      ? `Dose ${dose.next_dose_index || 1} of ${dose.total_doses} (${dose.next_dose_index || 1}/${dose.total_doses} of 1 vial)`
                      : '1 vial (single dose)'}
                  </span>
                </div>

                {dose.available_stock !== undefined && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: dose.available_stock > 5 ? '#047857' : '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <HugeiconsIcon icon={PackageIcon} size={13} color={dose.available_stock > 5 ? '#047857' : '#b45309'} />
                    <span>{dose.available_stock} vials in stock</span>
                  </span>
                )}
              </div>

              {/* Row 2: Multi-dose progress bar if total_doses > 1 */}
              {Number(dose.total_doses) > 1 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                    <span>
                      Vial Progress: <strong>{dose.next_dose_index || 1}/{dose.total_doses} of 1 vial</strong>
                    </span>
                    <span>
                      {Math.min(100, Math.round(((Number(dose.next_dose_index) || 1) / Number(dose.total_doses)) * 100))}% used
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      backgroundColor: '#e2e8f0',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.round(((Number(dose.next_dose_index) || 1) / Number(dose.total_doses)) * 100))}%`,
                        height: '100%',
                        backgroundColor: dose.is_open_vial ? '#0891b2' : '#047857',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Row 3: Batch and expiry details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748b', flexWrap: 'wrap', gap: 6, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                <span>
                  Batch: <strong style={{ color: '#1e293b' }}>{dose.batch_number}</strong>
                </span>
                {dose.expiration_date && (
                  <span>
                    Expires: <strong style={{ color: '#1e293b' }}>{dose.expiration_date}</strong>
                  </span>
                )}
              </div>
            </div>
          ) : fifoError ? (
            <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: BORDER_RADIUS, padding: '8px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HugeiconsIcon icon={AlertCircleIcon} size={14} color="#dc2626" />
              <span>{fifoError}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, fontStyle: 'italic', color: '#64748b' }}>
              Fetching FIFO stock allocation…
            </span>
          )
        ) : (
          <span style={{ fontSize: 12, fontStyle: 'italic', color: '#94a3b8' }}>
            Select vaccine to preview FIFO batch &amp; multi-dose vial stock progress
          </span>
        )}
      </div>

      {/* Staff & Signature Sub-grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          paddingTop: 14,
          borderTop: '1px solid rgba(16, 185, 129, 0.2)',
          alignItems: 'start',
        }}
      >
        {/* Given by */}
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, letterSpacing: '0.02em' }}>
            GIVEN BY / ATTENDED BY
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h, #1e293b)' }}>
            {currentUser?.name || dose.given_by || 'Staff Nurse'}
          </span>
          {(currentUser?.professional_license_no || dose.license_no) && (
            <span style={{ fontSize: 11, color: '#047857', display: 'block', marginTop: 2, fontWeight: 500 }}>
              PRC License: {currentUser?.professional_license_no || dose.license_no}
            </span>
          )}
        </div>

        {/* Signature */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.02em' }}>
              SIGNATURE
            </span>
            {!isCompleted && !isExternal && onRefreshSignature && (
              <button
                type="button"
                onClick={onRefreshSignature}
                title="Reload signature from profile"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 11,
                  color: '#047857',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Refresh
              </button>
            )}
          </div>

          {isCompleted ? (
            dose.signature_path && dose.treatment_id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '4px 8px',
                    maxHeight: 52,
                    maxWidth: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <SignatureImage endpoint={`/vaccination-records/${dose.treatment_id}/signature`} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#15803d',
                    background: '#dcfce7',
                    padding: '2px 8px',
                    borderRadius: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} color="#15803d" />
                  <span>Digitally Signed</span>
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <HugeiconsIcon icon={SignatureIcon} size={13} color="#64748b" />
                <span>{dose.signature && dose.signature !== 'On File' ? dose.signature : 'Signed on file'}</span>
              </span>
            )
          ) : isExternal ? (
            <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <HugeiconsIcon icon={Hospital02Icon} size={13} color="#0369a1" />
              <span>External clinic record</span>
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {signatureVersion && currentUser?.id ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {/* Visual Signature Preview Box */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '3px 8px',
                        maxHeight: 48,
                        maxWidth: 160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <SignatureImage
                        key={signatureVersion}
                        endpoint={`/users/${currentUser.id}/signature?version=${encodeURIComponent(signatureVersion)}`}
                        onReady={onSignatureReady}
                      />
                    </div>

                    {/* Interactive Checkbox */}
                    {onToggleSignature && (
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: applySignature ? '#15803d' : '#475569',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={applySignature}
                          onChange={(e) => onToggleSignature(e.target.checked)}
                          style={{
                            width: 15,
                            height: 15,
                            accentColor: '#047857',
                            cursor: 'pointer',
                          }}
                        />
                        <span>{applySignature ? 'Apply digital signature' : 'Do not sign electronically'}</span>
                      </label>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: applySignature ? '#15803d' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {applySignature ? (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} color="#15803d" />
                        <span>Signature will be stamped on official treatment record and card upon save</span>
                      </>
                    ) : (
                      <span>Hand-sign printed record if digital signature is not applied</span>
                    )}
                  </span>
                </>
              ) : signatureLoadError ? (
                <div style={{ fontSize: 11.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <HugeiconsIcon icon={AlertCircleIcon} size={13} color="#dc2626" />
                  <span>Could not load signature preview. You can hand-sign the printed record.</span>
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <HugeiconsIcon icon={SignatureIcon} size={13} color="#64748b" />
                  <span>No digital signature in profile. Hand-sign printout, or upload in profile.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
