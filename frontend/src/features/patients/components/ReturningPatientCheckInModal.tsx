import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import FormModal from '../../../components/forms/FormModal';
import '../../../components/forms/SearchableSelect/SearchableSelect.css';
import { ALL_HEALTH_FACILITIES } from '../../../shared/constants/healthFacilities';
import api from '../../../shared/services/api';
import type { Patient } from '../types';

interface ReturningPatientCheckInModalProps {
  open: boolean;
  mode?: 'reassess' | 'checkin' | 'nurse';
  patient: Patient | null;
  customEndpoint?: string;
  onClose: () => void;
  onSuccess: (data: {
    patientName: string;
    patientNumber: string;
    queueNumber: number | string;
    station: string;
    alreadyInQueue?: boolean;
    message?: string;
  }) => void;
}

function getManilaDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getManilaTimeString(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function formatPatientName(patient: Patient | null): string {
  if (!patient) return '';
  return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
}

function sanitizeDecimalInput(value: string, maxDecimals = 2): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).join('').slice(0, maxDecimals)}`;
}

const REFERRAL_FACILITY_OPTIONS = ALL_HEALTH_FACILITIES.filter(
  (name) => !/\(Specify\)$/i.test(name.trim())
);

interface EditableFacilityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}

function EditableFacilityCombobox({
  value,
  onChange,
  options,
  placeholder = 'Search or type facility...',
  disabled = false,
}: EditableFacilityComboboxProps) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [filterByQuery, setFilterByQuery] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxListHeight: number;
    openAbove: boolean;
  } | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!filterByQuery || !q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, value, filterByQuery]);

  const updateMenuPosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const gap = 4;
    const margin = 8;

    const width = Math.min(Math.max(rect.width, 280), viewportW - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, viewportW - width - margin));

    const spaceBelow = viewportH - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    const openAbove = spaceBelow < 210 && spaceAbove > spaceBelow;
    const availableSpace = openAbove ? spaceAbove : spaceBelow;
    const maxListHeight = Math.max(110, Math.min(240, availableSpace - 16));

    setMenuPos({
      top: openAbove ? undefined : rect.bottom + gap,
      bottom: openAbove ? viewportH - rect.top + gap : undefined,
      left,
      width,
      maxListHeight,
      openAbove,
    });
  }, []);

  const openMenu = useCallback(
    (shouldFilter: boolean) => {
      if (disabled) return;
      setFilterByQuery(shouldFilter);
      const muiModalRoot = rootRef.current?.closest<HTMLElement>('.MuiModal-root') ?? null;
      setPortalContainer(muiModalRoot || document.body);
      updateMenuPosition();
      setIsOpen(true);
    },
    [disabled, updateMenuPosition]
  );

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
  }, [isOpen, updateMenuPosition, filteredOptions.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) {
        return;
      }
      updateMenuPosition();
    };
    const handleResize = () => updateMenuPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (filteredOptions.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const exactIdx = filteredOptions.findIndex(
      (opt) => opt.toLowerCase() === value.trim().toLowerCase()
    );
    setHighlightedIndex(exactIdx >= 0 ? exactIdx : 0);
  }, [filteredOptions, isOpen, value]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const optionEl = listRef.current?.querySelector<HTMLElement>(
      `#${CSS.escape(`${uid}-opt-${highlightedIndex}`)}`
    );
    optionEl?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen, uid]);

  const handleSelectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setFilterByQuery(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        openMenu(Boolean(value.trim()) && !options.includes(value));
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openMenu(Boolean(value.trim()) && !options.includes(value));
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      }
    } else if (event.key === 'Enter' && isOpen) {
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      event.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="ss-root">
      <div
        className={`ss-trigger${isOpen ? ' ss-trigger--open' : ''}`}
        style={{
          borderRadius: 9999,
          minHeight: 46,
          height: 46,
          padding: '0 12px 0 18px',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          if (!isOpen) {
            const isExactPreset = options.includes(value);
            openMenu(Boolean(value.trim()) && !isExactPreset);
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-autocomplete="list"
          aria-label="Referred By / Referring Facility"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onFocus={() => {
            if (!isOpen) {
              const isExactPreset = options.includes(value);
              openMenu(Boolean(value.trim()) && !isExactPreset);
            }
          }}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) {
              openMenu(true);
            } else {
              setFilterByQuery(true);
            }
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--input-text, #111827)',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.5,
            padding: 0,
          }}
        />
        <span className="ss-trigger-actions">
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="ss-trigger-clear"
              aria-label="Clear facility"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
                setFilterByQuery(false);
                inputRef.current?.focus();
              }}
              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label={isOpen ? 'Close facility options' : 'Show facility options'}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (disabled) return;
              if (isOpen) {
                setIsOpen(false);
              } else {
                openMenu(false);
                inputRef.current?.focus();
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              padding: 2,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              className="ss-trigger-chevron"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </span>
      </div>

      {isOpen &&
        menuPos &&
        portalContainer &&
        createPortal(
          <div
            ref={menuRef}
            data-combobox-menu="true"
            className={`ss-menu${menuPos.openAbove ? ' ss-menu--above' : ''}`}
            style={{
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              width: menuPos.width,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Referring Facilities"
              className="ss-list"
              style={{ maxHeight: menuPos.maxListHeight }}
            >
              {filteredOptions.length === 0 ? (
                <div className="ss-empty" role="status" aria-live="polite">
                  {value.trim()
                    ? `Using custom facility: "${value.trim()}"`
                    : 'No facility found'}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.toLowerCase() === value.trim().toLowerCase();
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={opt}
                      id={`${uid}-opt-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`ss-option${isSelected ? ' ss-option--selected' : ''}${isHighlighted ? ' ss-option--highlighted' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelectOption(opt)}
                    >
                      <span className="ss-option-label">{opt}</span>
                      {isSelected && (
                        <svg
                          className="ss-option-check"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          portalContainer
        )}
    </div>
  );
}

export default function ReturningPatientCheckInModal({
  open,
  mode = 'reassess',
  patient,
  customEndpoint,
  onClose,
  onSuccess,
}: ReturningPatientCheckInModalProps) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const systolicRef = useRef<HTMLInputElement>(null);
  const diastolicRef = useRef<HTMLInputElement>(null);
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [isEditingHeight, setIsEditingHeight] = useState(false);
  const weightRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const [modeOfTransaction, setModeOfTransaction] = useState<'walk-in' | 'referral'>('walk-in');
  const [referredBy, setReferredBy] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isReassess = mode === 'reassess';
  const isNurse = mode === 'nurse';
  const lockPriorAnthropometrics = isReassess || isNurse;

  useEffect(() => {
    if (open && patient) {
      const summary = (patient as any).pending_treatment_summary;
      const latestConsult = (patient as any).latest_consultation_record || (patient as any).latestConsultationRecord;
      const latestRecord = (patient as any).latest_treatment_record || (patient as any).latestTreatmentRecord;

      const priorWeight = summary?.weight ?? latestConsult?.weight ?? latestRecord?.weight ?? '';
      const priorHeight = summary?.height ?? latestConsult?.height ?? latestRecord?.height ?? '';
      const priorReferredBy = latestConsult?.referred_by ?? latestRecord?.referred_by ?? '';
      const priorMode = latestConsult?.mode_of_transaction ?? latestRecord?.mode_of_transaction;

      setSystolic('');
      setDiastolic('');
      setTemperature('');
      setWeight(priorWeight ? String(priorWeight) : '');
      setHeight(priorHeight ? String(priorHeight) : '');
      setIsEditingWeight(!lockPriorAnthropometrics || !priorWeight);
      setIsEditingHeight(!lockPriorAnthropometrics || !priorHeight);
      setReferredBy(priorReferredBy ? String(priorReferredBy) : '');
      setModeOfTransaction(
        priorMode === 'referral' || Boolean(priorReferredBy)
          ? 'referral'
          : 'walk-in'
      );
      setError('');
      setSubmitting(false);
    }
  }, [open, patient, mode]);

  if (!open || !patient) return null;

  const summary = (patient as any).pending_treatment_summary;
  const patientDisplayName = formatPatientName(patient);
  const pendingItems: string[] = summary?.pending_items || [];
  const consultationDate = summary?.consultation_date || '—';
  const exposureCategory = summary?.exposure_category ? `Category ${summary.exposure_category}` : '—';
  const treatmentStatus = (patient as any).treatment_status === 'not_administered'
    ? 'Not Administered on Previous Visit'
    : 'Pending Administration (Left Before Nurse Administration)';

  const handleSystolicChange = (value: string) => {
    if (value.includes('/') || value.includes('\\')) {
      const [rawSys = '', rawDia = ''] = value.split(/[\/\\]/);
      setSystolic(rawSys.replace(/\D/g, '').slice(0, 3));
      if (rawDia) {
        setDiastolic(rawDia.replace(/\D/g, '').slice(0, 3));
      }
      diastolicRef.current?.focus();
      return;
    }
    setSystolic(value.replace(/\D/g, '').slice(0, 3));
  };

  const handleDiastolicChange = (value: string) => {
    setDiastolic(value.replace(/\D/g, '').slice(0, 3));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    const sysTrim = systolic.trim();
    const diaTrim = diastolic.trim();

    if (!sysTrim || !diaTrim || !temperature.trim() || !weight.trim() || !height.trim()) {
      setError(
        isReassess
          ? 'Updated vital signs (Blood Pressure, Temperature, Weight, and Height) are required before checking in a returning patient for Doctor Reassessment.'
          : isNurse
          ? 'Updated vital signs (Blood Pressure, Temperature, Weight, and Height) are required before checking in the patient for Follow-up / Treatment.'
          : 'Updated vital signs (Blood Pressure, Temperature, Weight, and Height) are required before checking in the patient for Doctor Triage.'
      );
      return;
    }

    const finalBloodPressure = `${sysTrim}/${diaTrim}`;
    if (!/^\d{2,3}\/\d{2,3}$/.test(finalBloodPressure)) {
      setError('Blood Pressure must be formatted as systolic/diastolic (e.g. 120/80).');
      return;
    }

    const tempNum = Number(temperature.trim());
    if (isNaN(tempNum) || tempNum < 30 || tempNum > 45) {
      setError('Temperature must be a valid number between 30 and 45 °C.');
      return;
    }

    const weightNum = Number(weight.trim());
    if (isNaN(weightNum) || weightNum < 0.5 || weightNum > 300) {
      setError('Weight must be a valid number between 0.5 and 300 kg.');
      return;
    }

    const heightNum = Number(height.trim());
    if (isNaN(heightNum) || heightNum < 20 || heightNum > 250) {
      setError('Height must be a valid number between 20 and 250 cm.');
      return;
    }

    const patientId = patient.patient_id || (patient as any).id;
    if (!patientId) {
      setError('The patient record could not be identified. Please refresh the page and try again.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const endpoint = customEndpoint || (isNurse ? `/patients/${patientId}/check-in-nurse` : `/patients/${patientId}/check-in`);
      const payload: Record<string, any> = {
        blood_pressure: finalBloodPressure,
        temperature: temperature.trim(),
        weight: weight.trim(),
        height: height.trim(),
        mode_of_transaction: modeOfTransaction,
        referred_by: referredBy.trim() || null,
        consultation_date: getManilaDateString(),
        consultation_time: getManilaTimeString(),
      };
      if (!isNurse) {
        payload.is_reassessment = isReassess;
      }

      const response = await api.post(endpoint, payload);

      const queue = response.data?.queue;
      onSuccess({
        patientName: patientDisplayName,
        patientNumber: patient.patient_number || '',
        queueNumber: response.data?.queue_number || queue?.queue_number || '',
        station: isNurse
          ? (response.data?.station || 'Treatment Room (Station 2)')
          : isReassess
          ? 'Doctor Reassessment Queue'
          : 'Doctor Assessment',
        alreadyInQueue: response.data?.code === 'ALREADY_IN_QUEUE' || Boolean(response.data?.already_checked_in),
        message: response.data?.message,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        (isReassess
          ? 'Unable to check in this returning patient for Doctor Reassessment. Please try again.'
          : isNurse
          ? 'Unable to check in this patient for the Nurse / Treatment queue. Please try again.'
          : 'Unable to check in this patient for Doctor Triage. Please try again.')
      );
      setSubmitting(false);
    }
  };

  const pillInputStyle: React.CSSProperties = {
    borderRadius: 9999,
    minHeight: 46,
    height: 46,
    padding: '10px 18px',
  };

  return (
    <FormModal
      title={
        isReassess
          ? 'Patient Reassessment — Vital Signs & Referral'
          : isNurse
          ? 'Follow-Up / Treatment Check-In — Vital Signs'
          : 'Patient Check-In — Vital Signs & Referral'
      }
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <button
            type="button"
            className="fm-btn fm-btn--cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fm-btn fm-btn--submit"
            onClick={() => handleSubmit()}
            disabled={submitting}
          >
            {submitting
              ? 'Checking In…'
              : isReassess
              ? 'Check In to Doctor Reassessment'
              : isNurse
              ? 'Check In to Treatment Queue'
              : 'Check In to Doctor Triage'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {isReassess ? (
          /* Previous Consultation & Pending Treatment Summary Box */
          <div
            style={{
              backgroundColor: 'var(--amber-50, #fffbeb)',
              border: '1px solid var(--amber-200, #fde68a)',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '13px',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: '#92400e',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span>Previous Consultation &amp; Pending Treatment</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>
                {patientDisplayName} • {patient.patient_number || 'P-Record'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px 16px',
                color: '#334155',
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                  Previous Consultation Date
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{consultationDate}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                  Exposure Category
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{exposureCategory}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                  Previous Prescribed Treatment
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {pendingItems.length > 0 ? pendingItems.join(' • ') : 'Pending Doctor Order'}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                  Treatment Status
                </span>
                <span style={{ fontWeight: 600, color: '#b45309' }}>
                  {treatmentStatus}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Returning Triage Check-In Summary Box */
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span style={{ fontWeight: 700, color: '#166534' }}>
              {isNurse ? 'Follow-Up / Treatment Queue Check-In' : 'Doctor Triage Check-In'}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
              {patientDisplayName} • {patient.patient_number || 'P-Record'}
            </span>
          </div>
        )}

        {/* Updated Vital Signs Section */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-h, #0f172a)',
              marginBottom: '12px',
            }}
          >
            {isReassess
              ? 'Updated Vital Signs (Required Before Doctor Reassessment)'
              : isNurse
              ? 'Current Vital Signs (Required Before Treatment / Follow-Up)'
              : 'Current Vital Signs (Required Before Doctor Triage)'}
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px 14px',
            }}
          >
            <div className="fm-field">
              <label className="fm-label">
                Blood Pressure (mmHg) <span>*</span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--input-border, #e5e7eb)',
                  borderRadius: 9999,
                  minHeight: 46,
                  height: 46,
                  background: 'var(--input-bg, #fff)',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  width: '100%',
                  padding: '0 14px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    e.currentTarget.style.borderColor = 'var(--input-border, #e5e7eb)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <input
                  ref={systolicRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={systolic}
                  onChange={(e) => handleSystolicChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === '/' || e.key === '\\') {
                      e.preventDefault();
                      diastolicRef.current?.focus();
                    }
                  }}
                  placeholder="120"
                  aria-label="Systolic Blood Pressure"
                  disabled={submitting}
                  autoFocus
                  style={{
                    flex: 1,
                    width: '45%',
                    padding: '9px 4px',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    backgroundColor: 'transparent',
                    textAlign: 'center',
                    color: 'var(--input-text, #111827)',
                    fontFamily: 'inherit',
                  }}
                />
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-secondary, #6b7280)',
                    padding: '0 6px',
                    userSelect: 'none',
                  }}
                >
                  /
                </span>
                <input
                  ref={diastolicRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={diastolic}
                  onChange={(e) => handleDiastolicChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !diastolic) {
                      systolicRef.current?.focus();
                    }
                  }}
                  placeholder="80"
                  aria-label="Diastolic Blood Pressure"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    width: '45%',
                    padding: '9px 4px',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    backgroundColor: 'transparent',
                    textAlign: 'center',
                    color: 'var(--input-text, #111827)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div className="fm-field">
              <label className="fm-label">
                Temperature (°C) <span>*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="fm-input"
                placeholder="e.g. 36.8"
                value={temperature}
                onChange={(e) => setTemperature(sanitizeDecimalInput(e.target.value))}
                disabled={submitting}
                style={pillInputStyle}
              />
            </div>

            <div className="fm-field">
              <label className="fm-label">
                Weight (kg) <span>*</span>
              </label>
              <input
                ref={weightRef}
                type="text"
                inputMode="decimal"
                className="fm-input"
                placeholder="e.g. 62"
                value={weight}
                readOnly={lockPriorAnthropometrics && !isEditingWeight}
                onChange={(e) => {
                  if (lockPriorAnthropometrics && !isEditingWeight) return;
                  setWeight(sanitizeDecimalInput(e.target.value));
                }}
                disabled={submitting}
                style={
                  lockPriorAnthropometrics && !isEditingWeight
                    ? {
                        ...pillInputStyle,
                        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                        color: 'var(--text-secondary, #64748b)',
                        cursor: 'not-allowed',
                      }
                    : pillInputStyle
                }
              />
              {lockPriorAnthropometrics && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>
                    {!isEditingWeight ? 'Locked from previous record' : 'Editing weight'}
                  </span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      const next = !isEditingWeight;
                      setIsEditingWeight(next);
                      if (next) {
                        setTimeout(() => weightRef.current?.focus(), 0);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#059669',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {!isEditingWeight ? 'Edit' : 'Done'}
                  </button>
                </div>
              )}
            </div>

            <div className="fm-field">
              <label className="fm-label">
                Height (cm) <span>*</span>
              </label>
              <input
                ref={heightRef}
                type="text"
                inputMode="decimal"
                className="fm-input"
                placeholder="e.g. 165"
                value={height}
                readOnly={lockPriorAnthropometrics && !isEditingHeight}
                onChange={(e) => {
                  if (lockPriorAnthropometrics && !isEditingHeight) return;
                  setHeight(sanitizeDecimalInput(e.target.value));
                }}
                disabled={submitting}
                style={
                  lockPriorAnthropometrics && !isEditingHeight
                    ? {
                        ...pillInputStyle,
                        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                        color: 'var(--text-secondary, #64748b)',
                        cursor: 'not-allowed',
                      }
                    : pillInputStyle
                }
              />
              {lockPriorAnthropometrics && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>
                    {!isEditingHeight ? 'Locked from previous record' : 'Editing height'}
                  </span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      const next = !isEditingHeight;
                      setIsEditingHeight(next);
                      if (next) {
                        setTimeout(() => heightRef.current?.focus(), 0);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#059669',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {!isEditingHeight ? 'Edit' : 'Done'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referral & Mode of Transaction Section */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-h, #0f172a)',
              marginBottom: '10px',
            }}
          >
            Referral Information (Optional)
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px 14px',
            }}
          >
            <div className="fm-field">
              <label className="fm-label">Mode of Transaction</label>
              <select
                className="fm-input"
                value={modeOfTransaction}
                disabled={submitting}
                onChange={(e) => {
                  const next = e.target.value as 'walk-in' | 'referral';
                  setModeOfTransaction(next);
                  if (next === 'walk-in') {
                    setReferredBy('');
                  }
                }}
                style={pillInputStyle}
              >
                <option value="walk-in">Walk-in</option>
                <option value="referral">Referral</option>
              </select>
            </div>

            <div className="fm-field">
              <label className="fm-label">Referred By / Referring Facility</label>
              <EditableFacilityCombobox
                value={referredBy}
                options={REFERRAL_FACILITY_OPTIONS}
                placeholder="Search or type facility..."
                disabled={submitting}
                onChange={(val) => {
                  setReferredBy(val);
                  if (val.trim() && modeOfTransaction === 'walk-in') {
                    setModeOfTransaction('referral');
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Informational Guidance Note */}
        <div
          style={{
            fontSize: '11.5px',
            color: 'var(--text-secondary, #64748b)',
            lineHeight: 1.45,
            backgroundColor: 'var(--card-bg-subtle, #f8fafc)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <strong style={{ color: '#334155' }}>Workflow Note:</strong>{' '}
          {isReassess
            ? "This check-in links to the existing bite case without creating a duplicate bite incident, updates today's vital signs and referral details, and routes the patient directly to the Doctor Triage / Reassessment Queue."
            : isNurse
            ? "This check-in records today's vital signs (BP, temperature, weight, height) for this follow-up visit and places the patient in the Nurse / Treatment queue."
            : "This check-in records today's vital signs and referral details and queues the patient for Doctor Triage assessment."}
        </div>
      </form>
    </FormModal>
  );
}
