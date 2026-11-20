import {
  DEFAULT_CANONICAL_FIELD_RULES,
  DEFAULT_CANONICAL_MODULES,
  DEFAULT_CANONICAL_SECTIONS,
  type ClinicModuleConfig,
  type ClinicModuleSections,
  type ClinicStationModules,
  type FieldRules,
  type FieldRuleValue,
} from '../../types';

export type FieldPolicySurface =
  | 'mobile_profile'
  | 'mobile_intake'
  | 'web_form1'
  | 'web_form2'
  | 'web_form3'
  | 'staff_fees';

export const SURFACE_LABELS: Record<FieldPolicySurface, string> = {
  mobile_profile: 'Mobile Profile',
  mobile_intake: 'Mobile Intake',
  web_form1: 'Web Form 1',
  web_form2: 'Clinician Form 2',
  web_form3: 'Clinician Form 3',
  staff_fees: 'Staff Fees',
};

export interface FieldPolicyContext {
  civilStatus?: string | null;
  philhealthMember?: string | boolean | null;
  fourpsMember?: string | boolean | null;
}

export interface EffectiveFieldDecision {
  rule: FieldRuleValue;
  visible: boolean;
  required: boolean;
  enclosingSection: keyof ClinicModuleSections | null;
  stationModule: keyof ClinicStationModules | null;
  blockedBySection: boolean;
  blockedByModule: boolean;
  lockedClinicalSafeguard: boolean;
}

export const ENCLOSING_SECTION_BY_FIELD: Record<
  keyof FieldRules,
  keyof ClinicModuleSections | null
> = {
  // Section 1A: Patient Information (Profile / Registration)
  blood_type: 'patient_registration_enabled',
  mother_maiden_name: 'patient_registration_enabled',
  civil_status: 'patient_registration_enabled',
  spouse_name: 'patient_registration_enabled',

  // Section 1B: Address Details
  address_municipality: 'address_section_enabled',
  address_barangay: 'address_section_enabled',
  address_purok: 'address_section_enabled',
  province: 'address_section_enabled',

  // Section 1C: Socioeconomic & Household
  educational_attainment: 'socioeconomic_section_enabled',
  employment_status: 'socioeconomic_section_enabled',
  family_member: 'socioeconomic_section_enabled',

  // Section 1D: Government Programs & PhilHealth
  philhealth_member: 'gov_programs_section_enabled',
  philhealth_status: 'gov_programs_section_enabled',
  philhealth_no: 'gov_programs_section_enabled',
  philhealth_category: 'gov_programs_section_enabled',
  fourps_member: 'gov_programs_section_enabled',
  dswd_nhts: 'gov_programs_section_enabled',

  // Section 1E: Bite Intake & Exposure Report
  bite_date: 'bite_intake_section_enabled',
  bite_place: 'bite_intake_section_enabled',
  site_washed: 'bite_intake_section_enabled',
  exposure_type: 'bite_intake_section_enabled',
  animal_type: 'bite_intake_section_enabled',
  animal_status: 'bite_intake_section_enabled',
  animal_captured: 'bite_intake_section_enabled',
  wound_location: 'bite_intake_section_enabled',
  patient_description: 'bite_intake_section_enabled',

  // Section 2: Triage & Clinical Assessment
  exposure_category: 'triage_section_enabled',
  bite_site: 'triage_section_enabled',
  animal_observation_status: 'triage_section_enabled',

  // Section 3: Treatment & Vaccination
  treatment_given: 'treatment_section_enabled',
  protocol_type: 'treatment_section_enabled',
  route: 'treatment_section_enabled',
  injection_site: 'treatment_section_enabled',
  dosage_ml: 'treatment_section_enabled',
  vaccine_brand: 'treatment_section_enabled',
  vaccine_generic: 'treatment_section_enabled',
  batch_no: 'treatment_section_enabled',
  tt_status: 'treatment_section_enabled',
  medication_given: 'treatment_section_enabled',
  adverse_reaction: 'treatment_section_enabled',
  cost_recovery: 'treatment_section_enabled',

  // Independent Registration Fees (gated by registration_module_enabled)
  rig_fee: null,
  anti_rabies_fee: null,
  additional_fees: null,
};

/**
 * Maps sections whose availability requires an active clinical station module.
 * Registration profile/intake sections remain configurable independently of
 * `registration_module_enabled` so mobile self-service and edit modals work
 * across triage-only presets (e.g. 010 / 011).
 */
export const STATION_MODULE_BY_SECTION: Record<
  keyof ClinicModuleSections,
  keyof ClinicStationModules | null
> = {
  patient_registration_enabled: null,
  address_section_enabled: null,
  socioeconomic_section_enabled: null,
  gov_programs_section_enabled: null,
  bite_intake_section_enabled: null,
  triage_section_enabled: 'triage_module_enabled',
  treatment_section_enabled: 'treatment_module_enabled',
};

export const SECTION_SURFACES: Record<
  keyof ClinicModuleSections | 'fees_and_payment',
  FieldPolicySurface[]
> = {
  patient_registration_enabled: ['mobile_profile', 'web_form1'],
  address_section_enabled: ['mobile_profile', 'web_form1'],
  socioeconomic_section_enabled: ['mobile_profile', 'web_form1'],
  gov_programs_section_enabled: ['mobile_profile', 'web_form1'],
  bite_intake_section_enabled: ['mobile_intake', 'web_form1'],
  triage_section_enabled: ['web_form2', 'web_form3'],
  treatment_section_enabled: ['web_form2', 'web_form3'],
  fees_and_payment: ['staff_fees'],
};

export const FIELD_SURFACES: Record<keyof FieldRules, FieldPolicySurface[]> = {
  blood_type: ['mobile_profile', 'web_form1'],
  mother_maiden_name: ['mobile_profile', 'web_form1'],
  civil_status: ['mobile_profile', 'web_form1'],
  spouse_name: ['mobile_profile', 'web_form1'],

  address_municipality: ['mobile_profile', 'web_form1'],
  address_barangay: ['mobile_profile', 'web_form1'],
  address_purok: ['mobile_profile', 'web_form1'],
  province: ['mobile_profile', 'web_form1'],

  educational_attainment: ['mobile_profile', 'web_form1'],
  employment_status: ['mobile_profile', 'web_form1'],
  family_member: ['mobile_profile', 'web_form1'],

  philhealth_member: ['mobile_profile', 'web_form1'],
  philhealth_status: ['mobile_profile', 'web_form1'],
  philhealth_no: ['mobile_profile', 'web_form1'],
  philhealth_category: ['mobile_profile', 'web_form1'],
  fourps_member: ['mobile_profile', 'web_form1'],
  dswd_nhts: ['mobile_profile', 'web_form1'],

  bite_date: ['mobile_intake', 'web_form1'],
  bite_place: ['mobile_intake', 'web_form1'],
  site_washed: ['mobile_intake', 'web_form1'],
  exposure_type: ['mobile_intake', 'web_form1'],
  animal_type: ['mobile_intake', 'web_form1'],
  animal_status: ['mobile_intake', 'web_form1'],
  animal_captured: ['mobile_intake', 'web_form1'],
  wound_location: ['mobile_intake', 'web_form1'],
  patient_description: ['mobile_intake', 'web_form1'],

  exposure_category: ['web_form2'],
  bite_site: ['web_form2'],
  animal_observation_status: ['web_form2', 'web_form3'],

  treatment_given: ['web_form2'],
  protocol_type: ['web_form3'],
  route: ['web_form3'],
  injection_site: ['web_form3'],
  dosage_ml: ['web_form3'],
  vaccine_brand: ['web_form3'],
  vaccine_generic: ['web_form3'],
  batch_no: ['web_form3'],
  tt_status: ['web_form3'],
  medication_given: ['web_form3'],
  adverse_reaction: ['web_form3'],
  cost_recovery: ['web_form3'],

  rig_fee: ['staff_fees'],
  anti_rabies_fee: ['staff_fees'],
  additional_fees: ['staff_fees'],
};

const FEE_FIELDS = new Set<keyof FieldRules>([
  'rig_fee',
  'anti_rabies_fee',
  'additional_fees',
]);

export function isTruthyMembershipValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'yes' || normalized === 'true' || normalized === '1';
  }
  return false;
}

export function getRawFieldRule(
  config: ClinicModuleConfig | null | undefined,
  fieldName: keyof FieldRules
): FieldRuleValue {
  if (fieldName === 'exposure_category') {
    return 'required';
  }
  return (
    config?.field_rules?.[fieldName] ??
    DEFAULT_CANONICAL_FIELD_RULES[fieldName] ??
    'optional'
  );
}

export function isEffectiveStationEnabled(
  config: ClinicModuleConfig | null | undefined,
  moduleName: keyof ClinicStationModules
): boolean {
  if (config && typeof config[moduleName] === 'boolean') {
    return config[moduleName];
  }
  return DEFAULT_CANONICAL_MODULES[moduleName];
}

export function isEffectiveSectionEnabled(
  config: ClinicModuleConfig | null | undefined,
  sectionName: keyof ClinicModuleSections
): boolean {
  const stationModule = STATION_MODULE_BY_SECTION[sectionName];
  if (stationModule && !isEffectiveStationEnabled(config, stationModule)) {
    return false;
  }
  if (config && typeof config[sectionName] === 'boolean') {
    return config[sectionName];
  }
  return DEFAULT_CANONICAL_SECTIONS[sectionName];
}

export function evaluateFieldPolicy(
  config: ClinicModuleConfig | null | undefined,
  fieldName: keyof FieldRules,
  context?: FieldPolicyContext
): EffectiveFieldDecision {
  const enclosingSection = ENCLOSING_SECTION_BY_FIELD[fieldName];
  const stationModule: keyof ClinicStationModules | null = enclosingSection
    ? STATION_MODULE_BY_SECTION[enclosingSection]
    : FEE_FIELDS.has(fieldName)
      ? 'registration_module_enabled'
      : null;

  // Clinical safeguard invariant (LF1): exposure_category is permanently required.
  if (fieldName === 'exposure_category') {
    return {
      rule: 'required',
      visible: true,
      required: true,
      enclosingSection,
      stationModule,
      blockedBySection: false,
      blockedByModule: false,
      lockedClinicalSafeguard: true,
    };
  }

  const rule = getRawFieldRule(config, fieldName);
  const blockedByModule = stationModule
    ? !isEffectiveStationEnabled(config, stationModule)
    : false;
  const sectionRawEnabled = enclosingSection
    ? config && typeof config[enclosingSection] === 'boolean'
      ? config[enclosingSection]
      : DEFAULT_CANONICAL_SECTIONS[enclosingSection]
    : true;
  const blockedBySection = blockedByModule || !sectionRawEnabled;

  if (blockedByModule || blockedBySection || rule === 'hidden') {
    return {
      rule,
      visible: false,
      required: false,
      enclosingSection,
      stationModule,
      blockedBySection,
      blockedByModule,
      lockedClinicalSafeguard: false,
    };
  }

  // Conditional parent-dependent rules when context is explicitly provided.
  if (fieldName === 'spouse_name' && context?.civilStatus !== undefined) {
    const isMarried = (context.civilStatus ?? '').trim().toLowerCase() === 'married';
    if (!isMarried) {
      return {
        rule,
        visible: false,
        required: false,
        enclosingSection,
        stationModule,
        blockedBySection: false,
        blockedByModule: false,
        lockedClinicalSafeguard: false,
      };
    }
  }

  if (
    fieldName === 'philhealth_status' ||
    fieldName === 'philhealth_no' ||
    fieldName === 'philhealth_category'
  ) {
    const parentRule = getRawFieldRule(config, 'philhealth_member');
    if (parentRule === 'hidden') {
      return {
        rule,
        visible: false,
        required: false,
        enclosingSection,
        stationModule,
        blockedBySection: false,
        blockedByModule: false,
        lockedClinicalSafeguard: false,
      };
    }
    if (context?.philhealthMember !== undefined && !isTruthyMembershipValue(context.philhealthMember)) {
      return {
        rule,
        visible: false,
        required: false,
        enclosingSection,
        stationModule,
        blockedBySection: false,
        blockedByModule: false,
        lockedClinicalSafeguard: false,
      };
    }
  }

  return {
    rule,
    visible: true,
    required: rule === 'required',
    enclosingSection,
    stationModule,
    blockedBySection: false,
    blockedByModule: false,
    lockedClinicalSafeguard: false,
  };
}

export function isEffectiveFieldVisible(
  config: ClinicModuleConfig | null | undefined,
  fieldName: keyof FieldRules,
  context?: FieldPolicyContext
): boolean {
  return evaluateFieldPolicy(config, fieldName, context).visible;
}

export function isEffectiveFieldRequired(
  config: ClinicModuleConfig | null | undefined,
  fieldName: keyof FieldRules,
  context?: FieldPolicyContext
): boolean {
  return evaluateFieldPolicy(config, fieldName, context).required;
}

/**
 * True only when the Address section and its primary components
 * (municipality + barangay) are visible, so synthesizing a composite
 * `address` string does not overwrite partial/hidden fields.
 */
export function isFullAddressDerivable(
  config: ClinicModuleConfig | null | undefined
): boolean {
  return (
    isEffectiveSectionEnabled(config, 'address_section_enabled') &&
    isEffectiveFieldVisible(config, 'address_municipality') &&
    isEffectiveFieldVisible(config, 'address_barangay')
  );
}
