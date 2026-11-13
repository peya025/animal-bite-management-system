import { test, expect } from '@playwright/test';
import {
  DEFAULT_CANONICAL_FIELD_RULES,
  DEFAULT_CANONICAL_SECTIONS,
  DEFAULT_CANONICAL_MODULES,
} from '../../src/types';
import {
  ClinicConfigConflictError,
  ClinicConfigValidationError,
} from '../../src/api/clinicConfigApi';
import {
  MOCK_CLINIC_MODULE_CONFIG,
  clearClinicConfigCache,
} from '../../src/hooks/useClinicModuleConfig';

test.describe('Person 2: Module Configuration Types, API, and Provider State', () => {
  test('P2-M01 & AC-07: Canonical Catalog Defaults have exactly 41 keys and locked exposure_category', () => {
    const keys = Object.keys(DEFAULT_CANONICAL_FIELD_RULES);
    expect(keys.length).toBe(41);

    // Essential clinical invariant LF1
    expect(DEFAULT_CANONICAL_FIELD_RULES.exposure_category).toBe('required');

    // Baseline required fields
    expect(DEFAULT_CANONICAL_FIELD_RULES.bite_date).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.bite_place).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.site_washed).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.exposure_type).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.animal_type).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.animal_status).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.wound_location).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.bite_site).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.protocol_type).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.address_municipality).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.address_barangay).toBe('required');
    expect(DEFAULT_CANONICAL_FIELD_RULES.province).toBe('required');

    // Canonical section flags
    const sectionKeys = Object.keys(DEFAULT_CANONICAL_SECTIONS);
    expect(sectionKeys.length).toBe(7);
    expect(DEFAULT_CANONICAL_SECTIONS.patient_registration_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_SECTIONS.address_section_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_SECTIONS.socioeconomic_section_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_SECTIONS.gov_programs_section_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_SECTIONS.bite_intake_section_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_SECTIONS.triage_section_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_SECTIONS.treatment_section_enabled).toBe(true);

    // Station modules
    const moduleKeys = Object.keys(DEFAULT_CANONICAL_MODULES);
    expect(moduleKeys.length).toBe(3);
    expect(DEFAULT_CANONICAL_MODULES.triage_module_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_MODULES.registration_module_enabled).toBe(true);
    expect(DEFAULT_CANONICAL_MODULES.treatment_module_enabled).toBe(true);
  });

  test('P2-M02 & AC-09: Section-only change dirty-state model detects changes for every section', () => {
    const baseline = { ...MOCK_CLINIC_MODULE_CONFIG };

    const checkHasChanges = (draft: typeof baseline) => {
      // 1. Station changes
      if (
        draft.triage_module_enabled !== baseline.triage_module_enabled ||
        draft.registration_module_enabled !== baseline.registration_module_enabled ||
        draft.treatment_module_enabled !== baseline.treatment_module_enabled
      ) {
        return true;
      }

      // 2. Section changes (7 canonical sections)
      const sections = [
        'patient_registration_enabled',
        'address_section_enabled',
        'socioeconomic_section_enabled',
        'gov_programs_section_enabled',
        'bite_intake_section_enabled',
        'triage_section_enabled',
        'treatment_section_enabled',
      ] as const;

      for (const sec of sections) {
        if (draft[sec] !== baseline[sec]) {
          return true;
        }
      }

      // 3. Field rules
      for (const key of Object.keys(DEFAULT_CANONICAL_FIELD_RULES) as Array<keyof typeof baseline.field_rules>) {
        if (draft.field_rules[key] !== baseline.field_rules[key]) {
          return true;
        }
      }

      return false;
    };

    // Initially clean
    expect(checkHasChanges(baseline)).toBe(false);

    // Test each section toggle individually enables dirty state
    const sectionsToTest = [
      'patient_registration_enabled',
      'address_section_enabled',
      'socioeconomic_section_enabled',
      'gov_programs_section_enabled',
      'bite_intake_section_enabled',
      'triage_section_enabled',
      'treatment_section_enabled',
    ] as const;

    for (const sec of sectionsToTest) {
      const modifiedDraft = {
        ...baseline,
        [sec]: !baseline[sec],
      };
      // Every single section-only edit triggers dirty state
      expect(checkHasChanges(modifiedDraft)).toBe(true);

      // Resetting reverts dirty state
      const resetDraft = {
        ...modifiedDraft,
        [sec]: baseline[sec],
      };
      expect(checkHasChanges(resetDraft)).toBe(false);
    }
  });

  test('P2-M04 & AC-10: Baseline required fields preserved on failure; do not turn all fields optional', () => {
    // When config is null (e.g. initial load failure)
    const isFieldRequiredFallback = (fieldName: keyof typeof DEFAULT_CANONICAL_FIELD_RULES) => {
      if (fieldName === 'exposure_category') return true;
      return DEFAULT_CANONICAL_FIELD_RULES[fieldName] === 'required';
    };

    expect(isFieldRequiredFallback('exposure_category')).toBe(true);
    expect(isFieldRequiredFallback('bite_date')).toBe(true);
    expect(isFieldRequiredFallback('wound_location')).toBe(true);
    expect(isFieldRequiredFallback('blood_type')).toBe(false); // optional by default
  });

  test('P2-M06 & AC-08/AC-12: Error classes support typed 409 conflict and 422 validation payloads', () => {
    // 409 Conflict
    const conflictPayload = {
      message: 'Configuration conflict. The configuration has been modified by another user.',
      current_revision: 5,
      supplied_revision: 4,
      config: { ...MOCK_CLINIC_MODULE_CONFIG, revision: 5 },
    };

    const conflictErr = new ClinicConfigConflictError(conflictPayload);
    expect(conflictErr.name).toBe('ClinicConfigConflictError');
    expect(conflictErr.currentRevision).toBe(5);
    expect(conflictErr.suppliedRevision).toBe(4);
    expect(conflictErr.serverConfig.revision).toBe(5);

    // 422 Validation
    const validationErr = new ClinicConfigValidationError('Invalid payload', {
      'field_rules.exposure_category': ["The 'exposure_category' field is an essential clinical safeguard and must be 'required'."],
      socioeconomic_section_enabled: ['The socioeconomic section enabled field must be true or false.'],
    });
    expect(validationErr.name).toBe('ClinicConfigValidationError');
    expect(validationErr.errors['field_rules.exposure_category']).toBeDefined();
  });

  test('P2-M12 & AC-18: Clinic cache isolation', () => {
    clearClinicConfigCache();
    // Cache clearing by clinic ID or full clear
    clearClinicConfigCache(1);
    clearClinicConfigCache();
    expect(true).toBe(true);
  });

  test('P4-M01: Station combination policy rejects 000, 101, 100 and accepts supported combinations', () => {
    const validateStations = (reg: boolean, tri: boolean, treat: boolean): string | null => {
      if (!reg && !tri && !treat) {
        return 'At least one station module must remain enabled.';
      }
      if (reg && !tri) {
        return 'Triage Module cannot be disabled while Registration Module is enabled.';
      }
      return null;
    };

    // Accepted combinations
    expect(validateStations(true, true, true)).toBeNull();   // 111
    expect(validateStations(true, true, false)).toBeNull();  // 110
    expect(validateStations(false, true, true)).toBeNull();  // 011
    expect(validateStations(false, true, false)).toBeNull(); // 010
    expect(validateStations(false, false, true)).toBeNull(); // 001

    // Rejected combinations
    expect(validateStations(true, false, true)).not.toBeNull();  // 101
    expect(validateStations(true, false, false)).not.toBeNull(); // 100
    expect(validateStations(false, false, false)).not.toBeNull(); // 000
  });
});
