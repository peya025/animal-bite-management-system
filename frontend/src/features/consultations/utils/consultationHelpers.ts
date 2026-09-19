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
    const raw = localStorage.getItem('userData');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.name === 'string' ? parsed.name.trim() : '';
  } catch {
    return '';
  }
}

export function getCurrentUserRole(): string {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.role === 'string' ? parsed.role.trim().toLowerCase() : '';
  } catch {
    return '';
  }
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
