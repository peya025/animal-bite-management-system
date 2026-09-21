import { createContext } from 'react';
import type { KeyboardEvent } from 'react';

export const ConsultationErrors = createContext<Record<string, string>>({});

type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function entryControls(root: HTMLElement): FieldControl[] {
  const controls = Array.from(root.querySelectorAll<FieldControl>('input, select, textarea'))
    .filter(control => !control.disabled && control.tabIndex >= 0
      && !('readOnly' in control && control.readOnly) && control.getClientRects().length > 0);
  return controls.filter(control => {
    if (!(control instanceof HTMLInputElement) || control.type !== 'radio') return true;
    const group = controls.filter(item => item instanceof HTMLInputElement
      && item.type === 'radio' && item.name === control.name) as HTMLInputElement[];
    return control === (group.find(item => item.checked) || group[0]);
  });
}

// DOM order is also the row-by-row grid order (left -> right -> next row).
// Compound controls and multiline textareas keep their default Enter behavior.
export function advanceOnEnter(event: KeyboardEvent<HTMLElement>, submit: () => void) {
  if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing
    || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)
    || !['text', 'email', 'tel', 'number', 'search', 'url', 'password', 'date', 'time'].includes(target.type)
    || target.readOnly || target.disabled || target.list
    || target.closest('[role="combobox"], [aria-haspopup="listbox"], [aria-expanded]')) return;
  event.preventDefault();
  if (event.repeat) return;
  const controls = entryControls(event.currentTarget);
  const index = controls.indexOf(target);
  if (index < 0) return;
  if (index === controls.length - 1) submit();
  else controls[index + 1].focus();
}

export function focusFirstError(root: HTMLElement, fallback?: HTMLElement | null) {
  const invalid = Array.from(root.querySelectorAll<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]'))
    .find(control => !control.matches(':disabled') && control.getClientRects().length > 0);
  const target = invalid || fallback;
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
