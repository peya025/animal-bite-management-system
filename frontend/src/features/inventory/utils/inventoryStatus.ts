import type { InventoryItem } from '../types';
import { daysUntil, formatDate, formatTime } from '../../../shared/utils';

export type DerivedInventoryStatus = 'Active' | 'Expiring' | 'Expired' | 'Depleted' | 'Discard-Pending';

export interface StatusVisual {
  label: DerivedInventoryStatus;
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  bg: string;
  color: string;
  border: string;
}

export function addMonthsToDate(dateInput: string, months: number): string {
  if (!dateInput || !months) return '';

  const parts = dateInput.split('-');
  if (parts.length !== 3 || parts[0].length !== 4) return '';

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return '';
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return '';

  const totalMonths = month - 1 + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;

  // Clamp day to max days in target month (e.g. Feb 28/29)
  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(day, maxDays);

  if (targetYear < 1000 || targetYear > 9999) return '';

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

export function formatDateInput(dateValue?: string | null): string {
  if (!dateValue) return '';
  return dateValue.split('T')[0];
}

export function describeExpiry(dateValue?: string | null): string {
  if (!dateValue) return 'Expiration pending';

  const days = daysUntil(dateValue);
  if (days < 0) {
    return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  }
  if (days === 0) return 'Expires today';
  if (days < 30) return `Expires in ${days} day${days === 1 ? '' : 's'}`;

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;

  if (remainingDays === 0) {
    return `Expires in ${months} month${months === 1 ? '' : 's'}`;
  }

  return `Expires in ${months} month${months === 1 ? '' : 's'} ${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
}

export function describeOpenVialCountdown(discardAt?: string | null) {
  if (!discardAt) return null;

  const target = new Date(discardAt).getTime();
  if (Number.isNaN(target)) return null;

  const diffMs = target - Date.now();
  const remainingMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const remainingLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  if (diffMs <= 0) {
    return {
      overdue: true,
      label: `Discard overdue by ${remainingLabel}`,
      secondary: `Discard by ${formatTime(discardAt)}`,
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fca5a5',
    };
  }

  const urgent = remainingMinutes <= 120;

  return {
    overdue: false,
    label: `Discard by ${formatTime(discardAt)}`,
    secondary: `Time left: ${remainingLabel}`,
    bg: urgent ? '#fff7ed' : '#eff6ff',
    color: urgent ? '#c2410c' : '#1d4ed8',
    border: urgent ? '#fdba74' : '#bfdbfe',
  };
}

export function deriveInventoryStatus(item: Pick<InventoryItem, 'current_quantity' | 'expiration_date' | 'open_vial_status'>): DerivedInventoryStatus {
  if ((item.current_quantity ?? 0) <= 0) return 'Depleted';
  if (item.open_vial_status === 'opened') return 'Discard-Pending';

  const days = daysUntil(item.expiration_date);
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring';
  return 'Active';
}

export function getStatusVisual(status: DerivedInventoryStatus): StatusVisual {
  switch (status) {
    case 'Discard-Pending':
      return {
        label: status,
        tone: 'info',
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
      };
    case 'Expired':
      return {
        label: status,
        tone: 'danger',
        bg: '#fee2e2',
        color: '#b91c1c',
        border: '#fca5a5',
      };
    case 'Depleted':
      return {
        label: status,
        tone: 'neutral',
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1',
      };
    case 'Expiring':
      return {
        label: status,
        tone: 'warning',
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fcd34d',
      };
    case 'Active':
    default:
      return {
        label: 'Active',
        tone: 'success',
        bg: '#ecfdf5',
        color: '#047857',
        border: '#86efac',
      };
  }
}

export function getExpiryVisual(expirationDate?: string | null) {
  const days = daysUntil(expirationDate);

  if (!expirationDate) {
    return {
      label: 'Expiration pending',
      detail: 'Enter Manufactured Date or Expiration Date',
      bg: '#f8fafc',
      color: '#475569',
      border: '#cbd5e1',
    };
  }

  if (days < 0) {
    return {
      label: formatDate(expirationDate),
      detail: describeExpiry(expirationDate),
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fca5a5',
    };
  }

  if (days <= 30) {
    return {
      label: formatDate(expirationDate),
      detail: describeExpiry(expirationDate),
      bg: '#fef3c7',
      color: '#b45309',
      border: '#fcd34d',
    };
  }

  return {
    label: formatDate(expirationDate),
    detail: describeExpiry(expirationDate),
    bg: '#ecfdf5',
    color: '#047857',
    border: '#86efac',
  };
}

export const VACCINE_CATEGORIES = [
  'Anti-Rabies Vaccines (ARV)',
  'Tetanus & Toxoids',
  'Anti-Tetanus Serum (ATS)',
  'Other Biologicals',
] as const;

export type VaccineCategory = (typeof VACCINE_CATEGORIES)[number];

export function getCategoryBadgeStyle(category?: string | null, isDark: boolean = false) {
  if (!category) {
    return isDark
      ? { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '#334155' }
      : { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
  }

  switch (category) {
    case 'Anti-Rabies Vaccines (ARV)':
      return isDark
        ? { bg: 'rgba(29, 78, 216, 0.15)', color: '#93c5fd', border: '#1e40af' }
        : { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'Rabies Immunoglobulins (RIG)':
      return isDark
        ? { bg: 'rgba(15, 118, 110, 0.15)', color: '#5eead4', border: '#115e59' }
        : { bg: '#ecfeff', color: '#0f766e', border: '#a5f3fc' };
    case 'Tetanus & Toxoids':
      return isDark
        ? { bg: 'rgba(194, 65, 12, 0.15)', color: '#fdba74', border: '#9a3412' }
        : { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' };
    case 'Anti-Tetanus Serum (ATS)':
      return isDark
        ? { bg: 'rgba(153, 27, 27, 0.15)', color: '#fca5a5', border: '#991b1b' }
        : { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' };
    case 'Other Biologicals':
      return isDark
        ? { bg: 'rgba(109, 40, 217, 0.15)', color: '#c4b5fd', border: '#6d28d9' }
        : { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
    default:
      return isDark
        ? { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '#334155' }
        : { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
  }
}

