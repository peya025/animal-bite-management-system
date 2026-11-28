import type React from 'react';

/**
 * Formats live temperature input in °C to automatically handle the decimal point
 * (format `00.0`, e.g. `36.5` or `37.0`), accepting numeric digits and a single `.` only.
 */
export function formatTemperatureInput(rawValue: string, previousValue = ''): string {
  if (!rawValue) return '';

  const isDeleting = rawValue.length < previousValue.length;
  const cleaned = rawValue.replace(/[^\d.]/g, '').replace(/^\.+/, '');
  if (!cleaned) return '';

  if (cleaned.includes('.')) {
    const [intRaw = '', ...rest] = cleaned.split('.');
    const intPart = intRaw.slice(0, 2);
    if (!intPart) return '';
    const decPart = rest.join('').replace(/\./g, '').slice(0, 1);
    return `${intPart}.${decPart}`;
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
 * Keydown guard for temperature inputs: allows digits, a single `.`, and
 * standard navigation/editing keys; blocks invalid characters and extra digits.
 */
export function handleTemperatureKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'Home', 'End',
  ];
  if (allowedKeys.includes(e.key)) return;

  const input = e.currentTarget;
  const hasSelection =
    input.selectionStart !== null &&
    input.selectionEnd !== null &&
    input.selectionStart !== input.selectionEnd;

  if (e.key === '.') {
    if (!input.value || (input.value.includes('.') && !hasSelection)) {
      e.preventDefault();
    }
    return;
  }

  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
    return;
  }

  if (!hasSelection && /^\d{2}\.\d$/.test(input.value)) {
    e.preventDefault();
  }
}

/**
 * Validates a temperature string (°C) before save/submit.
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

  if (!/^\d{2}\.\d{1,2}$/.test(trimmed)) {
    return 'Please enter a valid temperature with a decimal point (e.g. 36.5 or 37.0).';
  }

  const temp = Number(trimmed);
  if (!Number.isFinite(temp) || temp < 30 || temp > 45) {
    return 'Please enter a valid temperature between 30.0°C and 45.0°C.';
  }

  return null;
}
