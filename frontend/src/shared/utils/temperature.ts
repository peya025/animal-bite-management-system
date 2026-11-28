import type React from 'react';

/**
 * Formats live temperature input in °C to enforce the `00.0` format
 * (exactly 2 digits before `.` and max 1 digit after `.`, e.g. `36.5` or `37.0`).
 * Automatically inserts `.` after the first 2 digits when typing forward.
 */
export function formatTemperatureInput(rawValue: string, previousValue = ''): string {
  if (!rawValue) return '';

  const isDeleting = rawValue.length < previousValue.length;
  const cleaned = rawValue.replace(/[^\d.]/g, '').replace(/^\.+/, '');
  if (!cleaned) return '';

  if (cleaned.includes('.')) {
    const [intRaw = '', ...rest] = cleaned.split('.');
    const decRaw = rest.join('').replace(/\./g, '');

    if (intRaw.length >= 2) {
      const intPart = intRaw.slice(0, 2);
      const decPart = decRaw.slice(0, 1);
      return `${intPart}.${decPart}`;
    }

    // Fewer than 2 digits before `.`: treat as digits so `.` only appears after 2 digits
    const digits = `${intRaw}${decRaw}`;
    if (!digits) return '';
    if (digits.length === 1) return digits;
    if (digits.length === 2) return isDeleting ? digits : `${digits}.`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 3)}`;
  }

  if (isDeleting) {
    return cleaned.slice(0, 2);
  }

  if (cleaned.length === 1) {
    return cleaned;
  }

  if (cleaned.length === 2) {
    return `${cleaned}.`;
  }

  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 3)}`;
}

/**
 * Normalizes a temperature value on blur (or initial load) so whole numbers
 * or trailing decimal points become `00.0` (e.g. `37` or `37.` -> `37.0`).
 */
export function normalizeTemperatureOnBlur(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{2}\.$/.test(trimmed)) return `${trimmed}0`;
  if (/^\d{2}$/.test(trimmed)) return `${trimmed}.0`;
  return trimmed;
}

/**
 * Keydown guard for temperature inputs (`00.0` format):
 * allows digits only (max 2 before `.`, max 1 after `.`), a single `.` after 2 digits,
 * and standard navigation/editing keys.
 */
export function handleTemperatureKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'Home', 'End',
  ];
  if (allowedKeys.includes(e.key)) return;

  const input = e.currentTarget;
  const val = input.value;
  const start = input.selectionStart ?? val.length;
  const end = input.selectionEnd ?? val.length;
  const hasSelection = start !== end;

  if (e.key === '.') {
    // Only allow `.` once, and only immediately after 2 integer digits
    if (hasSelection || val.includes('.') || val.length !== 2 || start !== 2) {
      e.preventDefault();
    }
    return;
  }

  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
    return;
  }

  if (hasSelection) return;

  const dotIdx = val.indexOf('.');
  if (dotIdx !== -1) {
    const intPart = val.slice(0, dotIdx);
    const decPart = val.slice(dotIdx + 1);
    if (start <= dotIdx && intPart.length >= 2) {
      e.preventDefault();
      return;
    }
    if (start > dotIdx && decPart.length >= 1) {
      e.preventDefault();
      return;
    }
  } else if (val.length >= 3) {
    e.preventDefault();
  }
}

/**
 * Validates a temperature string (°C) in strict `00.0` format before save/submit.
 * Returns an error message string if invalid, or `null` if valid.
 */
export function validateTemperatureValue(
  rawValue: string | null | undefined,
  options: { required?: boolean } = {},
): string | null {
  const { required = true } = options;
  const trimmed = (rawValue ?? '').trim();

  if (!trimmed) {
    return required ? 'Temperature is required.' : null;
  }

  if (!/^\d{2}\.\d$/.test(trimmed)) {
    return 'Please enter a valid temperature in 00.0 format (e.g. 36.5 or 37.0).';
  }

  const temp = Number(trimmed);
  if (!Number.isFinite(temp) || temp < 30 || temp > 45) {
    return 'Please enter a valid temperature between 30.0°C and 45.0°C.';
  }

  return null;
}
