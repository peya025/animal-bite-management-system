import type { ClinicModuleConfig } from '../../types';
import {
  isEffectiveFieldVisible,
  isEffectiveSectionEnabled,
  isFullAddressDerivable,
} from './configuredFieldPolicy';

export interface ProfileUpdateFormInput {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  extension_name?: string | null;
  date_of_birth: string;
  age?: number | string | null;
  sex: string;
  contact_number: string;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;

  // Section 1A
  blood_type?: string | null;
  mother_maiden_name?: string | null;
  civil_status?: string | null;
  spouse_name?: string | null;

  // Section 1B
  address?: string | null;
  address_purok?: string | null;
  address_barangay?: string | null;
  address_municipality?: string | null;
  province?: string | null;

  // Section 1C
  educational_attainment?: string | null;
  employment_status?: string | null;
  family_member?: string | null;

  // Section 1D
  philhealth_member?: boolean | string | null;
  philhealth_status?: string | null;
  philhealth_no?: string | null;
  philhealth_category?: string | null;
  fourps_member?: boolean | string | null;
  fourps_category?: string | null;
  fourps_relationship?: string | null;
  registered_fourps_beneficiary?: string | null;
  dswd_nhts?: boolean | string | null;
  other_membership?: boolean | string | null;
  other_membership_specify?: string | null;
  memberships?: string[] | null;
}

const trimOrNull = (val: string | null | undefined): string | null => {
  if (val === undefined || val === null) return null;
  const trimmed = val.trim();
  return trimmed ? trimmed : null;
};

function stripHiddenGovMemberships(
  membershipsValue: unknown,
  showPhilhealth: boolean,
  showFourps: boolean,
  showDswd: boolean
): string[] | undefined {
  if (!Array.isArray(membershipsValue)) return undefined;
  return membershipsValue.filter((entry) => {
    if (entry === 'philhealth' && !showPhilhealth) return false;
    if (entry === 'fourps' && !showFourps) return false;
    if (entry === 'dswd_nhts' && !showDswd) return false;
    return true;
  });
}

function stripDisabledProfileAndAddressFields(
  config: ClinicModuleConfig | null | undefined,
  payload: Record<string, unknown>,
  options: { preserveDirectAddressWhenAddressSectionEnabled?: boolean } = {}
): void {
  // Section 1A: Patient Information
  if (!isEffectiveSectionEnabled(config, 'patient_registration_enabled')) {
    delete payload.blood_type;
    delete payload.mother_maiden_name;
    delete payload.civil_status;
    delete payload.spouse_name;
  } else {
    if (!isEffectiveFieldVisible(config, 'blood_type')) delete payload.blood_type;
    if (!isEffectiveFieldVisible(config, 'mother_maiden_name')) delete payload.mother_maiden_name;
    if (!isEffectiveFieldVisible(config, 'civil_status')) {
      delete payload.civil_status;
      delete payload.spouse_name;
    } else if (
      !isEffectiveFieldVisible(config, 'spouse_name', {
        civilStatus: typeof payload.civil_status === 'string' ? payload.civil_status : undefined,
      })
    ) {
      delete payload.spouse_name;
    }
  }

  // Section 1B: Address
  if (!isEffectiveSectionEnabled(config, 'address_section_enabled')) {
    delete payload.address;
    delete payload.address_municipality;
    delete payload.address_barangay;
    delete payload.address_purok;
    delete payload.province;
  } else {
    if (!isEffectiveFieldVisible(config, 'address_municipality')) delete payload.address_municipality;
    if (!isEffectiveFieldVisible(config, 'address_barangay')) delete payload.address_barangay;
    if (!isEffectiveFieldVisible(config, 'address_purok')) delete payload.address_purok;
    if (!isEffectiveFieldVisible(config, 'province')) delete payload.province;
    if (!options.preserveDirectAddressWhenAddressSectionEnabled && !isFullAddressDerivable(config)) {
      delete payload.address;
    }
  }

  // Section 1C: Socioeconomic
  if (!isEffectiveSectionEnabled(config, 'socioeconomic_section_enabled')) {
    delete payload.educational_attainment;
    delete payload.employment_status;
    delete payload.family_member;
  } else {
    if (!isEffectiveFieldVisible(config, 'educational_attainment')) delete payload.educational_attainment;
    if (!isEffectiveFieldVisible(config, 'employment_status')) delete payload.employment_status;
    if (!isEffectiveFieldVisible(config, 'family_member')) delete payload.family_member;
  }

  // Section 1D: Government Programs
  if (!isEffectiveSectionEnabled(config, 'gov_programs_section_enabled')) {
    delete payload.philhealth_member;
    delete payload.philhealth_status;
    delete payload.philhealth_no;
    delete payload.philhealth_category;
    delete payload.fourps_member;
    delete payload.fourps_category;
    delete payload.fourps_relationship;
    delete payload.registered_fourps_beneficiary;
    delete payload.dswd_nhts;
    delete payload.has_membership;
    delete payload.other_membership;
    delete payload.other_membership_name;
    delete payload.other_membership_no;
    delete payload.other_membership_specify;
    delete payload.memberships;
  } else {
    const showPhilhealth = isEffectiveFieldVisible(config, 'philhealth_member');
    const showFourps = isEffectiveFieldVisible(config, 'fourps_member');
    const showDswd = isEffectiveFieldVisible(config, 'dswd_nhts');
    const philhealthActive = showPhilhealth ? payload.philhealth_member : false;

    if (!showPhilhealth) {
      delete payload.philhealth_member;
      delete payload.philhealth_status;
      delete payload.philhealth_no;
      delete payload.philhealth_category;
    } else {
      if (
        !isEffectiveFieldVisible(config, 'philhealth_status', {
          philhealthMember: philhealthActive as string | boolean | null | undefined,
        })
      ) {
        delete payload.philhealth_status;
      }
      if (
        !isEffectiveFieldVisible(config, 'philhealth_no', {
          philhealthMember: philhealthActive as string | boolean | null | undefined,
        })
      ) {
        delete payload.philhealth_no;
      }
      if (
        !isEffectiveFieldVisible(config, 'philhealth_category', {
          philhealthMember: philhealthActive as string | boolean | null | undefined,
        })
      ) {
        delete payload.philhealth_category;
      }
    }

    if (!showFourps) {
      delete payload.fourps_member;
      delete payload.fourps_category;
      delete payload.fourps_relationship;
      delete payload.registered_fourps_beneficiary;
    }
    if (!showDswd) {
      delete payload.dswd_nhts;
    }

    const filteredMemberships = stripHiddenGovMemberships(
      payload.memberships,
      showPhilhealth,
      showFourps,
      showDswd
    );
    if (filteredMemberships !== undefined) {
      payload.memberships = filteredMemberships;
    }
  }
}

/**
 * Builds an omission-safe payload for patient profile updates (`PUT /patients/{id}`).
 * Disabled sections and hidden fields are omitted instead of being zeroed out,
 * preventing accidental overwrite of hidden historical data.
 */
export function buildConfiguredProfileUpdatePayload(
  config: ClinicModuleConfig | null | undefined,
  input: ProfileUpdateFormInput
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    first_name: input.first_name.trim(),
    middle_name: trimOrNull(input.middle_name),
    last_name: input.last_name.trim(),
    extension_name: trimOrNull(input.extension_name),
    date_of_birth: input.date_of_birth,
    age: input.age !== undefined && input.age !== null && input.age !== '' ? Number(input.age) : undefined,
    sex: input.sex,
    contact_number: input.contact_number.trim(),
    emergency_contact_name: trimOrNull(input.emergency_contact_name),
    emergency_contact_phone: trimOrNull(input.emergency_contact_phone),
    emergency_contact_relationship: trimOrNull(input.emergency_contact_relationship),
  };

  if (payload.age === undefined) {
    delete payload.age;
  }

  // Section 1A: Patient Additional Info
  if (isEffectiveSectionEnabled(config, 'patient_registration_enabled')) {
    if (isEffectiveFieldVisible(config, 'blood_type')) {
      payload.blood_type = trimOrNull(input.blood_type);
    }
    if (isEffectiveFieldVisible(config, 'mother_maiden_name')) {
      payload.mother_maiden_name = trimOrNull(input.mother_maiden_name);
    }
    if (isEffectiveFieldVisible(config, 'civil_status')) {
      payload.civil_status = trimOrNull(input.civil_status);
    }
    if (
      isEffectiveFieldVisible(config, 'spouse_name', {
        civilStatus: input.civil_status ?? undefined,
      })
    ) {
      payload.spouse_name = trimOrNull(input.spouse_name);
    }
  }

  // Section 1B: Address
  if (isEffectiveSectionEnabled(config, 'address_section_enabled')) {
    const showMun = isEffectiveFieldVisible(config, 'address_municipality');
    const showBrgy = isEffectiveFieldVisible(config, 'address_barangay');
    const showPurok = isEffectiveFieldVisible(config, 'address_purok');
    const showProv = isEffectiveFieldVisible(config, 'province');

    if (showMun) {
      payload.address_municipality = trimOrNull(input.address_municipality);
    }
    if (showBrgy) {
      payload.address_barangay = trimOrNull(input.address_barangay);
    }
    if (showPurok) {
      payload.address_purok = trimOrNull(input.address_purok);
    }
    if (showProv) {
      payload.province = trimOrNull(input.province);
    }

    if (isFullAddressDerivable(config)) {
      const derivedParts = [
        showPurok ? trimOrNull(input.address_purok) : null,
        showBrgy ? trimOrNull(input.address_barangay) : null,
        showMun ? trimOrNull(input.address_municipality) : null,
        showProv ? trimOrNull(input.province) : null,
      ].filter((part): part is string => Boolean(part));

      if (derivedParts.length > 0) {
        payload.address = derivedParts.join(', ');
      } else if (trimOrNull(input.address)) {
        payload.address = trimOrNull(input.address);
      }
    }
  }

  // Section 1C: Socioeconomic & Household
  if (isEffectiveSectionEnabled(config, 'socioeconomic_section_enabled')) {
    if (isEffectiveFieldVisible(config, 'educational_attainment')) {
      payload.educational_attainment = trimOrNull(input.educational_attainment);
    }
    if (isEffectiveFieldVisible(config, 'employment_status')) {
      payload.employment_status = trimOrNull(input.employment_status);
    }
    if (isEffectiveFieldVisible(config, 'family_member')) {
      payload.family_member = trimOrNull(input.family_member);
    }
  }

  // Section 1D: Government Programs & PhilHealth
  if (isEffectiveSectionEnabled(config, 'gov_programs_section_enabled')) {
    const showPhilhealth = isEffectiveFieldVisible(config, 'philhealth_member');
    const showFourps = isEffectiveFieldVisible(config, 'fourps_member');
    const showDswdNhts = isEffectiveFieldVisible(config, 'dswd_nhts');

    const philhealthBool = Boolean(
      input.philhealth_member === true ||
        input.philhealth_member === 'yes' ||
        input.philhealth_member === 'true' ||
        input.philhealth_member === '1'
    );
    const fourpsBool = Boolean(
      input.fourps_member === true ||
        input.fourps_member === 'yes' ||
        input.fourps_member === 'true' ||
        input.fourps_member === '1'
    );
    const dswdNhtsBool = Boolean(
      input.dswd_nhts === true ||
        input.dswd_nhts === 'yes' ||
        input.dswd_nhts === 'true' ||
        input.dswd_nhts === '1'
    );

    if (showPhilhealth) {
      payload.philhealth_member = philhealthBool;

      if (
        isEffectiveFieldVisible(config, 'philhealth_status', {
          philhealthMember: philhealthBool,
        })
      ) {
        payload.philhealth_status = trimOrNull(input.philhealth_status);
      }
      if (
        isEffectiveFieldVisible(config, 'philhealth_no', {
          philhealthMember: philhealthBool,
        })
      ) {
        payload.philhealth_no = trimOrNull(input.philhealth_no);
      }
      if (
        isEffectiveFieldVisible(config, 'philhealth_category', {
          philhealthMember: philhealthBool,
        })
      ) {
        payload.philhealth_category = trimOrNull(input.philhealth_category);
      }
    }

    if (showFourps) {
      payload.fourps_member = fourpsBool;
      if (fourpsBool) {
        payload.fourps_category = trimOrNull(input.fourps_category);
        payload.fourps_relationship = trimOrNull(input.fourps_relationship);
        payload.registered_fourps_beneficiary = trimOrNull(input.registered_fourps_beneficiary);
      } else {
        payload.fourps_category = null;
        payload.fourps_relationship = null;
        payload.registered_fourps_beneficiary = null;
      }
    }

    if (showDswdNhts) {
      payload.dswd_nhts = dswdNhtsBool;
    }

    const otherMemberBool = Boolean(
      input.other_membership === true ||
        input.other_membership === 'yes' ||
        input.other_membership === 'true' ||
        input.other_membership === '1'
    );
    payload.other_membership = otherMemberBool;
    payload.other_membership_specify = otherMemberBool ? trimOrNull(input.other_membership_specify) : null;

    if (Array.isArray(input.memberships) || showPhilhealth || showFourps || showDswdNhts) {
      const nextMemberships: string[] = [];
      if (showPhilhealth && philhealthBool) nextMemberships.push('PhilHealth');
      if (showFourps && fourpsBool) nextMemberships.push('4Ps');
      if (showDswdNhts && dswdNhtsBool) nextMemberships.push('DSWD-NHTS');
      if (otherMemberBool) nextMemberships.push('Others');
      if (nextMemberships.length > 0 || showPhilhealth || showFourps || showDswdNhts) {
        payload.memberships = nextMemberships;
      }
    }
  }

  return payload;
}

/**
 * Strips disabled sections and hidden configured fields from an update payload
 * (`PUT /patients/{id}`), preserving legacy membership array/string shapes for
 * visible toggles while preventing hidden subfields from overwriting saved data.
 */
export function filterConfiguredPatientUpdatePayload(
  config: ClinicModuleConfig | null | undefined,
  rawPayload: Record<string, unknown>,
  options: { preserveDirectAddressWhenAddressSectionEnabled?: boolean } = {}
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...rawPayload };
  stripDisabledProfileAndAddressFields(config, payload, options);
  return payload;
}

/**
 * Strips hidden/disabled configured keys from a flat patient+incident creation
 * payload (`POST /patients`) before submitting so hidden subfields never sneak
 * defaults or stale values onto new registrations.
 */
export function filterConfiguredPatientCreatePayload(
  config: ClinicModuleConfig | null | undefined,
  rawPayload: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...rawPayload };
  stripDisabledProfileAndAddressFields(config, payload);

  // Section 1E: Bite Intake & Exposure Report
  if (!isEffectiveSectionEnabled(config, 'bite_intake_section_enabled')) {
    delete payload.bite_date;
    delete payload.bite_place;
    delete payload.site_washed;
    delete payload.washing_of_bite_site;
    delete payload.exposure_type;
    delete payload.animal_type;
    delete payload.animal_type_others;
    delete payload.animal_status;
    delete payload.animal_captured;
    delete payload.animal_available;
    delete payload.wound_location;
    delete payload.patient_description;
  } else {
    if (!isEffectiveFieldVisible(config, 'bite_date')) delete payload.bite_date;
    if (!isEffectiveFieldVisible(config, 'bite_place')) delete payload.bite_place;
    if (!isEffectiveFieldVisible(config, 'site_washed')) {
      delete payload.site_washed;
      delete payload.washing_of_bite_site;
    }
    if (!isEffectiveFieldVisible(config, 'exposure_type')) delete payload.exposure_type;
    if (!isEffectiveFieldVisible(config, 'animal_type')) {
      delete payload.animal_type;
      delete payload.animal_type_others;
    }
    if (!isEffectiveFieldVisible(config, 'animal_status')) delete payload.animal_status;
    if (!isEffectiveFieldVisible(config, 'animal_captured')) {
      delete payload.animal_captured;
      delete payload.animal_available;
    }
    if (!isEffectiveFieldVisible(config, 'wound_location')) delete payload.wound_location;
    if (!isEffectiveFieldVisible(config, 'patient_description')) delete payload.patient_description;
  }

  return payload;
}
