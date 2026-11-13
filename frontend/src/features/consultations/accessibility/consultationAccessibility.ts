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

export function findScrollableParent(node: HTMLElement | null): HTMLElement {
  if (!node) {
    return (document.scrollingElement as HTMLElement) || document.documentElement;
  }

  // 1. Direct class check for known modal scroll containers
  const knownContainer = node.closest<HTMLElement>(
    '.fm-body, [data-form-modal-body="true"], .MuiDialogContent-root, [class*="DialogContent"]'
  );
  if (knownContainer) {
    return knownContainer;
  }

  // 2. Walk up parent hierarchy to find first element with actual scrollable overflow-y
  let curr = node.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return curr;
    }
    curr = curr.parentElement;
  }

  // 3. Fallback to window / document scrolling element
  return (document.scrollingElement as HTMLElement) || document.documentElement;
}

export function focusFirstError(root: HTMLElement = document.body, firstErrorKey?: string, fallback?: HTMLElement | null) {
  // If firstErrorKey is provided, try locating by ID or name first to match top-to-bottom priority
  let targetField: HTMLElement | null = null;
  if (firstErrorKey) {
    targetField =
      root.querySelector(`#field-${firstErrorKey}`) ||
      document.getElementById(`field-${firstErrorKey}`) ||
      (root.querySelector(`[name="${firstErrorKey}"]`)?.closest('.fm-field') as HTMLElement | null) ||
      (root.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement | null);
  }

  // Fallback to first invalid control in DOM order
  if (!targetField) {
    const invalidControl = Array.from(
      root.querySelectorAll<HTMLElement>(
        '.fm-field--error, input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]'
      )
    ).find((control) => !control.matches(':disabled') && control.getClientRects().length > 0);
    targetField = invalidControl || fallback || null;
  }

  if (!targetField) return;

  const fieldContainer = targetField.closest<HTMLElement>('.fm-field') || targetField;
  const scrollParent = findScrollableParent(fieldContainer);

  const headerOffset = 70;

  // Calculate top with scroll offset so sticky headers never cover the field
  if (scrollParent && scrollParent !== document.documentElement && scrollParent !== document.body) {
    const targetRect = fieldContainer.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const currentScrollTop = scrollParent.scrollTop;
    const targetScrollTop = currentScrollTop + (targetRect.top - parentRect.top) - headerOffset;

    scrollParent.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  } else {
    const targetRect = fieldContainer.getBoundingClientRect();
    const targetScrollTop = window.scrollY + targetRect.top - headerOffset;
    window.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }

  // Also call native scrollIntoView with smooth behavior
  try {
    fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    // ignore
  }

  // Automatically place the cursor / focus on the first input inside the field
  const focusable =
    fieldContainer.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    ) || targetField;

  if (focusable && typeof focusable.focus === 'function') {
    setTimeout(() => {
      focusable.focus({ preventScroll: true });
      if (focusable instanceof HTMLInputElement && ['text', 'search', 'tel'].includes(focusable.type)) {
        focusable.select?.();
      }
    }, 120);
  }
}
