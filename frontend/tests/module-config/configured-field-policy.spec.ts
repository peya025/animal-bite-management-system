import { test, expect } from '@playwright/test';
import { DEFAULT_CANONICAL_FIELD_RULES, DEFAULT_CANONICAL_MODULES, DEFAULT_CANONICAL_SECTIONS } from '../../src/types';
import {
  isEffectiveFieldRequired,
  isEffectiveFieldVisible,
  isFullAddressDerivable,
} from '../../src/shared/forms/configuredFieldPolicy';
import {
  filterConfiguredPatientCreatePayload,
  filterConfiguredPatientUpdatePayload,
} from '../../src/shared/forms/configuredPayload';
import type { ClinicModuleConfig } from '../../src/types';

const cfg = (over: Partial<ClinicModuleConfig>, rules: Record<string, string> = {}): ClinicModuleConfig =>
  ({
    ...DEFAULT_CANONICAL_MODULES,
    ...DEFAULT_CANONICAL_SECTIONS,
    ...over,
    field_rules: { ...DEFAULT_CANONICAL_FIELD_RULES, ...rules },
  }) as ClinicModuleConfig;

test.describe('configuredFieldPolicy', () => {
  test('disabled section hides and un-requires its fields', () => {
    const c = cfg({ address_section_enabled: false });
    expect(isEffectiveFieldVisible(c, 'address_municipality')).toBe(false);
    expect(isEffectiveFieldRequired(c, 'address_municipality')).toBe(false);
  });

  test('exposure_category stays required even if section disabled', () => {
    const c = cfg({ triage_section_enabled: false }, { exposure_category: 'hidden' });
    expect(isEffectiveFieldRequired(c, 'exposure_category')).toBe(true);
  });

  test('fees require registration module', () => {
    const c = cfg({ registration_module_enabled: false }, { rig_fee: 'required' });
    expect(isEffectiveFieldVisible(c, 'rig_fee')).toBe(false);
  });

  test('philhealth_no hidden when member is no', () => {
    expect(isEffectiveFieldVisible(cfg({}), 'philhealth_no', { philhealthMember: 'no' })).toBe(false);
  });

  test('address not derivable with hidden barangay', () => {
    expect(isFullAddressDerivable(cfg({}, { address_barangay: 'hidden' }))).toBe(false);
  });

  test('payload filters drop hidden/disabled keys', () => {
    const c = cfg({ socioeconomic_section_enabled: false }, { address_purok: 'hidden', fourps_member: 'hidden' });
    const out = filterConfiguredPatientCreatePayload(c, {
      employment_status: 'x', address_purok: 'P1', address_municipality: 'M', address_barangay: 'B',
      fourps_member: true, fourps_category: 'a', blood_type: 'O+',
    });
    expect(out.employment_status).toBeUndefined();
    expect(out.address_purok).toBeUndefined();
    expect(out.fourps_member).toBeUndefined();
    expect(out.fourps_category).toBeUndefined();
    expect(out.blood_type).toBe('O+');
  });

  test('update filter omits partial composite address', () => {
    const c = cfg({}, { address_barangay: 'hidden' });
    const out = filterConfiguredPatientUpdatePayload(c, { address: 'partial', address_municipality: 'M' });
    expect(out.address).toBeUndefined();
    expect(out.address_municipality).toBe('M');
  });
});

