import { createContext } from 'react';
import type { KeyboardEvent } from 'react';
import type { EnrolmentFormData } from '../../types';
import { buildLegacyMembershipFields, toRecord } from '../../utils/memberships';

export const RegistrationErrors = createContext<Record<string, string>>({});

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

// DOM order is also the row-by-row grid order. Native compound controls keep Enter.
export function advanceOnEnter(event: KeyboardEvent<HTMLElement>, submit: () => void) {
  if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing
    || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)
    || !['text', 'email', 'tel', 'number', 'search', 'url', 'password'].includes(target.type)
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
  target?.scrollIntoView({ block: 'center', behavior: 'auto' });
}

export function registrationServerErrors(error: unknown, data: EnrolmentFormData): Record<string, string> {
  const original = error instanceof Error && error.cause ? error.cause : error;
  const errors = toRecord(toRecord(toRecord(original).response).data).errors;
  const aliases: Record<string, string> = {
    address: 'municipality', gender: 'sex', emergency_contact_number: 'emergency_contact_phone',
    address_municipality: 'municipality', address_barangay: 'barangay', address_purok: 'purok',
    other_membership: 'has_membership', other_membership_name: 'other_membership_custom_name',
    other_membership_no: data.other_memberships?.includes('pwd') ? 'pwd_id' : 'other_membership_custom_id',
  };
  const memberships = buildLegacyMembershipFields(data).memberships;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(toRecord(errors))) {
    const message = Array.isArray(value) ? value.find(item => typeof item === 'string') : value;
    if (typeof message !== 'string') continue;
    let field = aliases[key] || key;
    const nested = key.match(/^memberships\.(\d+)\.(.+)$/);
    if (nested) {
      const type = memberships[Number(nested[1])]?.membership_type;
      const fields: Record<string, Record<string, string>> = {
        philhealth: { membership_id_no: 'philhealth_no', status_value: 'philhealth_status', category: 'philhealth_category' },
        fourps: { category: 'fourps_category', relationship_value: 'fourps_relationship', registered_beneficiary: 'registered_fourps_beneficiary' },
        pwd: { membership_id_no: 'pwd_id' },
        senior_citizen: { membership_id_no: 'senior_citizen_id' },
        indigenous_member: { extra_value: 'indigenous_tribe' },
        other: { membership_id_no: 'other_membership_custom_id', membership_label: 'other_membership_custom_name' },
      };
      field = (type && fields[type]?.[nested[2]]) || 'has_membership';
    }
    result[field] = message;
  }
  return result;
}
