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

  const base = new Date(dateInput);
  if (Number.isNaN(base.getTime())) return '';

  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().split('T')[0];
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
