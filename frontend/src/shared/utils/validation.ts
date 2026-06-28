/**
 * Shared form validation utilities.
 * Returns an error string on failure, or '' on success.
 */

/** Is the value non-empty after trimming? */
export function required(value: string, label = 'This field'): string {
  return value.trim() ? '' : `${label} is required.`;
}

/** Minimum string length. */
export function minLength(value: string, min: number, label = 'This field'): string {
  return value.trim().length >= min
    ? ''
    : `${label} must be at least ${min} characters.`;
}

/** Maximum string length. */
export function maxLength(value: string, max: number, label = 'This field'): string {
  return value.trim().length <= max
    ? ''
    : `${label} must not exceed ${max} characters.`;
}

/** Valid email address. */
export function email(value: string): string {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value.trim()) ? '' : 'Enter a valid email address.';
}

/** Philippine mobile number (09xxxxxxxxx or +639xxxxxxxxx). */
export function phoneNumber(value: string): string {
  const re = /^(\+?63|0)9\d{9}$/;
  return re.test(value.replace(/\s/g, ''))
    ? ''
    : 'Enter a valid Philippine mobile number (e.g. 09171234567).';
}

/** Password strength: at least 8 characters. */
export function passwordStrength(value: string): string {
  return value.length >= 8 ? '' : 'Password must be at least 8 characters.';
}

/** Passwords match. */
export function passwordMatch(password: string, confirmation: string): string {
  return password === confirmation ? '' : 'Passwords do not match.';
}

/** Date is not in the future. */
export function notFutureDate(dateStr: string, label = 'Date'): string {
  return new Date(dateStr) <= new Date()
    ? ''
    : `${label} cannot be in the future.`;
}

/** Date is not in the past. */
export function notPastDate(dateStr: string, label = 'Date'): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today ? '' : `${label} cannot be in the past.`;
}

/** Positive integer. */
export function positiveInt(value: string | number, label = 'Value'): string {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? '' : `${label} must be a positive whole number.`;
}

/** Non-negative number (≥ 0). */
export function nonNegative(value: string | number, label = 'Value'): string {
  return Number(value) >= 0 ? '' : `${label} must be 0 or greater.`;
}

/**
 * Run multiple validators in sequence and return the first error found.
 * Returns '' if all pass.
 *
 * @example
 * const err = validate(email, [required, emailValidator]);
 */
export function validate(value: string, validators: Array<(v: string) => string>): string {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return '';
}
