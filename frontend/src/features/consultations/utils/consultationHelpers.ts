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
  // 1. For existing saved Form 2 records, always retrieve and display the Doctor who completed Form 2
  if (record?.attending_provider && typeof record.attending_provider === 'string' && record.attending_provider.trim()) {
    return record.attending_provider.trim();
  }
  if (record?.administered_by_user?.name && isDoctorRole(record?.administered_by_user?.role)) {
    return record.administered_by_user.name.trim();
  }
  if (record?.administered_by?.name && isDoctorRole(record?.administered_by?.role)) {
    return record.administered_by.name.trim();
  }
  if (record?.provider_name && typeof record.provider_name === 'string' && record.provider_name.trim()) {
    return record.provider_name.trim();
  }

  // 2. Check if the patient or queue entry has an assigned / handling doctor
  const p = entry?.patient || fetchedPatient;
  const handledByDoc =
    getDoctorName(entry?.handled_by_user) ||
    getDoctorName(entry?.handled_by) ||
    getDoctorName(entry?.handledBy) ||
    getDoctorName(entry?.doctor) ||
    getDoctorName(entry?.attending_doctor) ||
    getDoctorName(entry?.attending_provider) ||
    getDoctorName(p?.attending_doctor) ||
    getDoctorName(p?.attending_provider) ||
    getDoctorName(p?.assigned_doctor) ||
    getDoctorName(fetchedPatient?.attending_doctor) ||
    getDoctorName(fetchedPatient?.attending_provider) ||
    getDoctorName(fetchedPatient?.assigned_doctor);

  if (handledByDoc) {
    return handledByDoc;
  }

  // 3. For a new Form 2 assessment, only use the currently logged-in user IF they are a Doctor
  const currentRole = getCurrentUserRole();
  const currentName = getCurrentUserName();
  if (isDoctorRole(currentRole) && currentName) {
    return currentName;
  }

  // Under NO circumstances should a Nurse, Registration Staff, or Admin name be used
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
  setTimeout(() => {
    const el = document.getElementById(`field-${firstErrorKey}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const scrollParent = el.closest('[class*="Body"]') || el.closest('.fm-body');
    if (scrollParent) {
      const rect = el.getBoundingClientRect();
      const parentRect = scrollParent.getBoundingClientRect();
      if (rect.top < parentRect.top || rect.bottom > parentRect.bottom) {
        scrollParent.scrollBy({ top: rect.top - parentRect.top - 40, behavior: 'smooth' });
      }
    }
    const focusable = el.querySelector('input, textarea, select') as HTMLElement | null;
    if (focusable) {
      focusable.focus({ preventScroll: true });
    }
  }, 50);
}
