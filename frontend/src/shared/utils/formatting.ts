/**
 * Shared formatting utility functions.
 * General-purpose string, number, and display helpers.
 */

/** Capitalise the first letter of a string. */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convert snake_case or kebab-case to Title Case. */
export function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Format a full name from parts, skipping empty/undefined middle names. */
export function formatFullName(
  firstName: string,
  middleName?: string | null,
  lastName?: string,
): string {
  return [firstName, middleName, lastName].filter(Boolean).join(' ');
}

/** Format a Philippine phone number. Returns as-is if it can't be formatted. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `(${digits.slice(0, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Pluralise a word based on count.
 * @example pluralize(1, 'patient') → "1 patient"
 * @example pluralize(3, 'patient') → "3 patients"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Format a number with thousands separator. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Truncate a string to a max length and append an ellipsis if truncated. */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max).trimEnd()}…`;
}

/** Generate initials from a name (up to 2 letters). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
