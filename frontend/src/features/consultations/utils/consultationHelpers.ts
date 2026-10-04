import { focusFirstError } from '../accessibility/consultationAccessibility';

export function asText(val: unknown): string {
  if (!val) return '';
  if (Array.isArray(val)) return val.join('\n');
  if (typeof val === 'string') {
    try {
      const parsed: unknown = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.join('\n') : val;
    } catch {
      return val;
    }
  }
  return String(val);
}

export function getCurrentUserName(): string {
  try {
    const raw = localStorage.getItem('userData') || localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name === 'string' && parsed.name.trim()) {
      return parsed.name.trim();
    }
    const fullName = [parsed?.first_name, parsed?.last_name].filter(Boolean).join(' ').trim();
    return fullName || '';
  } catch {
    return '';
  }
}

export function getCurrentUserRole(): string {
  try {
    const raw = localStorage.getItem('userData') || localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.role === 'string' ? parsed.role.trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

export function isDoctorRole(role?: string): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return ['doctor', 'triage', 'physician', 'triage_doctor', 'consulting_doctor', 'attending_physician'].includes(normalized);
}

export function getDoctorName(userCandidate?: any): string {
  if (!userCandidate) return '';
  if (typeof userCandidate === 'string' && userCandidate.trim()) {
    return userCandidate.trim();
  }
  if (typeof userCandidate === 'object' && userCandidate !== null) {
    const role = (userCandidate.role || '').toLowerCase();
    // Exclude nurse, registration, admin
    if (
      role &&
      !isDoctorRole(role) &&
      ['treatment', 'treatment_nurse', 'nurse', 'intake_nurse', 'follow_up_nurse', 'registration', 'registration_staff', 'admin', 'super_admin', 'clinic_admin'].includes(role)
    ) {
      return '';
    }
    if (typeof userCandidate.name === 'string' && userCandidate.name.trim()) {
      return userCandidate.name.trim();
    }
    const fullName = [userCandidate.first_name, userCandidate.last_name].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
  }
  return '';
}

export function resolveAttendingProvider(entry?: any, record?: any, fetchedPatient?: any): string {
  // 1. For existing saved Form 2 records, preserve the saved attending provider from referral/doctor
  if (record?.attending_provider && typeof record.attending_provider === 'string' && record.attending_provider.trim()) {
    return record.attending_provider.trim();
  }

  // Name of Attending Provider is free text entered from the referral paper form
  // submitted by the patient. Do not auto-populate with the logged-in user or clinic account.
  return '';
}

export function resolveHealthCareProvider(record?: any): string {
  // 1. For existing saved Form 2 records, preserve the saved Doctor's name
  if (record?.provider_name && typeof record.provider_name === 'string' && record.provider_name.trim()) {
    return record.provider_name.trim();
  }
  if (record?.name_of_provider && typeof record.name_of_provider === 'string' && record.name_of_provider.trim()) {
    return record.name_of_provider.trim();
  }
  if (record?.administered_by_user?.name && isDoctorRole(record?.administered_by_user?.role)) {
    return record.administered_by_user.name.trim();
  }
  if (record?.administered_by?.name && isDoctorRole(record?.administered_by?.role)) {
    return record.administered_by.name.trim();
  }

  // 2. If a Doctor is currently creating/editing Form 2, use their full name
  const currentRole = getCurrentUserRole();
  const currentName = getCurrentUserName();
  if (isDoctorRole(currentRole) && currentName) {
    return currentName;
  }

  // Under NO circumstances should a Nurse, Registration Staff, or Admin name be used
  return '';
}

export function splitBloodPressure(bp: string): { systolic: string; diastolic: string } {
  if (!bp) return { systolic: '', diastolic: '' };
  const parts = bp.split('/');
  return {
    systolic: parts[0] ?? '',
    diastolic: parts[1] ?? '',
  };
}

export function combineBloodPressure(systolic: string, diastolic: string): string {
  if (!systolic && !diastolic) return '';
  return `${systolic}/${diastolic}`;
}

export function syncChecklistWithText(
  item: string,
  currentChecked: string[],
  currentText: string
): { nextChecked: string[]; nextText: string } {
  const isChecked = currentChecked.includes(item);
  const nextChecked = isChecked
    ? currentChecked.filter(d => d !== item)
    : [...currentChecked, item];

  const existingLines = currentText.split('\n').map(l => l.trim()).filter(Boolean);
  let updated: string[];
  if (isChecked) {
    updated = existingLines.filter(l => l !== item);
  } else {
    updated = existingLines.includes(item) ? existingLines : [...existingLines, item];
  }

  return { nextChecked, nextText: updated.join('\n') };
}

export function scrollToFirstError(firstErrorKey: string): void {
  requestAnimationFrame(() => {
    setTimeout(() => {
      focusFirstError(document.body, firstErrorKey);
    }, 40);
  });
}

/**
 * Validates that a date string contains exactly a 4-digit year (YYYY-MM-DD),
 * and is a legitimate calendar date.
 */
export function isValidFourDigitYearDate(dateStr: string | null | undefined): boolean {
  if (!dateStr || !dateStr.trim()) return true;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4,})-(\d{2})-(\d{2})$/);
  if (!match) {
    // Check if it's in another format or invalid year length
    const parts = trimmed.split('-');
    if (parts.length === 3 && parts[0].length !== 4) return false;
    return false;
  }

  const yearStr = match[1];
  if (yearStr.length !== 4) return false;

  const year = parseInt(yearStr, 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (isNaN(year) || year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}
