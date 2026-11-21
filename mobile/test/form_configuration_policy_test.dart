import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/bite_intake_draft.dart';
import 'package:mobile/models/form_configuration.dart';
import 'package:mobile/models/patient_profile.dart';
import 'package:mobile/utils/configured_field_policy.dart';
import 'package:mobile/utils/configured_payload_builder.dart';

FormConfiguration buildConfig({
  Map<String, bool> profileSections = const {},
  Map<String, String> profileRules = const {},
  Map<String, bool> intakeSections = const {},
  Map<String, String> intakeRules = const {},
  int revision = 1,
}) {
  return FormConfiguration.fromJson({
    'schema_version': 1,
    'revision': revision,
    'clinic_id': 1,
    'profile': {
      'sections': {
        'patient_registration_enabled': true,
        'address_section_enabled': true,
        'socioeconomic_section_enabled': true,
        'gov_programs_section_enabled': true,
        ...profileSections,
      },
      'field_rules': {
        'blood_type': 'optional',
        'mother_maiden_name': 'optional',
        'civil_status': 'optional',
        'spouse_name': 'optional',
        'address_municipality': 'required',
        'address_barangay': 'required',
        'address_purok': 'optional',
        'province': 'required',
        'educational_attainment': 'optional',
        'employment_status': 'optional',
        'family_member': 'optional',
        'philhealth_member': 'optional',
        'philhealth_status': 'optional',
        'philhealth_no': 'optional',
        'philhealth_category': 'optional',
        'fourps_member': 'optional',
        'dswd_nhts': 'optional',
        ...profileRules,
      },
    },
    'intake': {
      'sections': {
        'bite_intake_section_enabled': true,
        ...intakeSections,
      },
      'field_rules': {
        'bite_date': 'required',
        'bite_place': 'required',
        'site_washed': 'required',
        'exposure_type': 'required',
        'animal_type': 'required',
        'animal_status': 'required',
        'animal_captured': 'optional',
        'wound_location': 'required',
        'patient_description': 'optional',
        ...intakeRules,
      },
      'payload_aliases': {
        'bite_date': 'date_of_exposure',
        'bite_place': 'place_of_exposure',
        'exposure_type': 'reported_mode_of_exposure',
        'animal_type': 'animal_species',
        'animal_status': 'animal_ownership',
        'wound_location': 'body_part_detail',
        'patient_description': 'incident_narrative',
      },
    },
  });
}

void main() {
  test('spouse_name requires married civil_status and hides if parent hidden', () {
    final policy = ConfiguredFieldPolicy(
      buildConfig(profileRules: {'spouse_name': 'required'}),
    );
    expect(
      policy.isProfileFieldRequired('spouse_name', civilStatus: 'single'),
      isFalse,
    );
    expect(
      policy.isProfileFieldVisible('spouse_name', civilStatus: 'single'),
      isFalse,
    );
    expect(
      policy.isProfileFieldRequired('spouse_name', civilStatus: 'married'),
      isTrue,
    );

    final hiddenParentPolicy = ConfiguredFieldPolicy(
      buildConfig(
        profileRules: {'civil_status': 'hidden', 'spouse_name': 'required'},
      ),
    );
    expect(
      hiddenParentPolicy.isProfileFieldVisible(
        'spouse_name',
        civilStatus: 'married',
      ),
      isFalse,
    );
    expect(
      hiddenParentPolicy.isProfileFieldRequired(
        'spouse_name',
        civilStatus: 'married',
      ),
      isFalse,
    );
  });

  test('disabled socioeconomic and gov sections remove empty step and omit payloads', () {
    final policy = ConfiguredFieldPolicy(
      buildConfig(
        profileSections: {
          'socioeconomic_section_enabled': false,
          'gov_programs_section_enabled': false,
        },
        profileRules: {
          'educational_attainment': 'required',
          'philhealth_member': 'required',
        },
      ),
    );

    expect(
      policy.activeProfileSteps(),
      equals([ProfileStepId.basicInfo, ProfileStepId.addressAndContact]),
    );
    expect(policy.editableMembershipTypes(), isEmpty);

    const patient = PatientProfile(
      id: 1,
      name: 'Juan Dela Cruz',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      relationship: 'self',
      status: 'verified',
      details: PatientDetailsProfile(
        addressMunicipality: 'Tagoloan',
        addressBarangay: 'Poblacion',
        province: 'Misamis Oriental',
      ),
    );
    expect(policy.missingRequiredProfileFields(patient), isEmpty);

    final payload = ConfiguredPayloadBuilder.buildProfilePayload(
      policy: policy,
      relationship: 'self',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      gender: 'male',
      educationalAttainment: 'College',
      philhealthMember: 'yes',
      hasMembership: 'yes',
    );
    expect(payload.containsKey('educational_attainment'), isFalse);
    expect(payload.containsKey('philhealth_member'), isFalse);
    expect(payload.containsKey('memberships'), isFalse);
    expect(payload.containsKey('has_membership'), isFalse);
  });

  test('hidden address component omits derived address to preserve full saved address', () {
    final policy = ConfiguredFieldPolicy(
      buildConfig(profileRules: {'address_purok': 'hidden'}),
    );
    expect(policy.isFullAddressDerivable, isFalse);

    final payload = ConfiguredPayloadBuilder.buildProfilePayload(
      policy: policy,
      relationship: 'self',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      gender: 'male',
      derivedFullAddress: 'Poblacion, Tagoloan, Misamis Oriental',
      addressMunicipality: 'Tagoloan',
      addressBarangay: 'Poblacion',
      addressPurok: 'Zone 1',
      province: 'Misamis Oriental',
    );
    expect(payload.containsKey('address'), isFalse);
    expect(payload.containsKey('address_purok'), isFalse);
    expect(payload['address_municipality'], 'Tagoloan');
  });

  test('partial membership edit omits hidden membership types and hidden philhealth detail', () {
    final policy = ConfiguredFieldPolicy(
      buildConfig(
        profileRules: {
          'philhealth_no': 'hidden',
          'fourps_member': 'hidden',
          'dswd_nhts': 'hidden',
        },
      ),
    );

    expect(
      policy.editableMembershipTypes(),
      containsAll(['philhealth', 'senior_citizen', 'pwd', 'indigenous_member', 'other']),
    );
    expect(policy.editableMembershipTypes(), isNot(contains('fourps')));
    expect(policy.editableMembershipTypes(), isNot(contains('dswd_nhts')));

    final payload = ConfiguredPayloadBuilder.buildProfilePayload(
      policy: policy,
      relationship: 'self',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      gender: 'male',
      hasMembership: 'yes',
      philhealthMember: 'yes',
      philhealthStatus: 'member',
      philhealthNo: 'SHOULD_NOT_SEND',
      fourpsMember: 'yes',
      dswdNhts: 'yes',
    );
    expect(payload.containsKey('philhealth_no'), isFalse);
    expect(payload.containsKey('fourps_member'), isFalse);
    expect(payload.containsKey('dswd_nhts'), isFalse);

    final memberships = payload['memberships'] as List<Map<String, dynamic>>;
    expect(memberships.length, 1);
    expect(memberships.first['membership_type'], 'philhealth');
    expect(memberships.first['status_value'], 'member');
    expect(memberships.first.containsKey('membership_id_no'), isFalse);
  });

  test('intake payload preserves explicit false, omits unanswered/hidden fields, and respects disabled section', () {
    final hiddenDatePolicy = ConfiguredFieldPolicy(
      buildConfig(
        intakeRules: {
          'bite_date': 'hidden',
          'site_washed': 'optional',
          'animal_captured': 'optional',
        },
      ),
    );

    final draftFalse = BiteIntakeDraft(
      schemaVersion: '1.0',
      dateOfExposure: DateTime(2026, 11, 17),
      siteWashed: false,
      reportedModeOfExposure: 'transdermal_bite',
      animalSpecies: 'dog',
      animalOwnership: 'owned',
      animalCaptured: true,
      animalAvailableForObservation: false,
      bodyPartGroup: 'upper_extremities',
    );
    final payloadFalse = ConfiguredPayloadBuilder.buildIntakePayload(
      policy: hiddenDatePolicy,
      draft: draftFalse,
    )!;
    expect(payloadFalse.containsKey('date_of_exposure'), isFalse);
    expect(payloadFalse['site_washed'], isFalse);
    expect(payloadFalse['animal_captured'], isTrue);
    expect(payloadFalse['animal_available_for_observation'], isFalse);

    const draftUnanswered = BiteIntakeDraft(
      schemaVersion: '1.0',
      siteWashed: null,
      reportedModeOfExposure: 'transdermal_bite',
      animalSpecies: 'dog',
      animalOwnership: 'owned',
      bodyPartGroup: 'upper_extremities',
    );
    final payloadUnanswered = ConfiguredPayloadBuilder.buildIntakePayload(
      policy: hiddenDatePolicy,
      draft: draftUnanswered,
    )!;
    expect(payloadUnanswered.containsKey('site_washed'), isFalse);
    expect(payloadUnanswered.containsKey('animal_captured'), isFalse);

    final disabledPolicy = ConfiguredFieldPolicy(
      buildConfig(intakeSections: {'bite_intake_section_enabled': false}),
    );
    expect(
      disabledPolicy.activeIntakeSteps(),
      equals([IntakeStepId.patient, IntakeStepId.review]),
    );
    expect(
      ConfiguredPayloadBuilder.buildIntakePayload(
        policy: disabledPolicy,
        draft: draftFalse,
      ),
      isNull,
    );
  });
}
