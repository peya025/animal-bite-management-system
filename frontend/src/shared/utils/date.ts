/**
 * Shared date utility functions.
 * Consolidates the inline date formatting scattered across 7+ files.
 */

/** "Jan 5, 2026" — used in patient lists, inventory, vaccinations */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** "January 5, 2026" — used in dialogs and detail views */
export function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Monday, June 28, 2026" — used in dashboard headers */
export function formatDateFull(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "10:45 AM" */
export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Jan 5, 2026, 10:45 AM" */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Human-readable wait time from a check-in timestamp.
 * e.g. "< 1 min", "45 min", "1h 20m"
 */
export function formatWaitTime(checkedInAt: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60_000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

/**
 * Days remaining until a future date (can be negative if already expired).
 * e.g. used for vaccine expiry warnings.
 */
export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

/**
 * Age in years from a date-of-birth string.
 */
export function calcAge(dob: string | null | undefined): number {
  if (!dob) return 0;
  return Math.floor(
    (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
}

/**
 * Time-of-day greeting: "Good morning" / "Good afternoon" / "Good evening"
 */
export function getDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Returns true if the date is within the next `days` days.
 */
export function isExpiringSoon(dateStr: string | null | undefined, days = 30): boolean {
  const d = daysUntil(dateStr);
  return d >= 0 && d <= days;
}
