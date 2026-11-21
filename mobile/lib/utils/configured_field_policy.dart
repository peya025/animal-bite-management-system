import '../models/form_configuration.dart';
import '../models/patient_profile.dart';

enum ProfileStepId {
  basicInfo,
  addressAndContact,
  socioeconomicAndProgram,
}

enum IntakeStepId {
  patient,
  incident,
  animal,
  history,
  review,
}

/// Pure policy evaluator matching backend [MobileFormPolicy] semantics.
class ConfiguredFieldPolicy {
  const ConfiguredFieldPolicy(this.config);

  final FormConfiguration config;

  static const profileFields = <String>[
    'blood_type',
    'mother_maiden_name',
    'civil_status',
    'spouse_name',
    'address_municipality',
    'address_barangay',
    'address_purok',
    'province',
    'educational_attainment',
    'employment_status',
    'family_member',
    'philhealth_member',
    'philhealth_status',
    'philhealth_no',
    'philhealth_category',
    'fourps_member',
    'dswd_nhts',
  ];

  static const intakeFields = <String>[
    'bite_date',
    'bite_place',
    'site_washed',
    'exposure_type',
    'animal_type',
    'animal_status',
    'animal_captured',
    'wound_location',
    'patient_description',
  ];

  static const _profileSectionsByField = <String, String>{
    'blood_type': 'patient_registration_enabled',
    'mother_maiden_name': 'patient_registration_enabled',
    'civil_status': 'patient_registration_enabled',
    'spouse_name': 'patient_registration_enabled',
    'address_municipality': 'address_section_enabled',
    'address_barangay': 'address_section_enabled',
    'address_purok': 'address_section_enabled',
    'province': 'address_section_enabled',
    'educational_attainment': 'socioeconomic_section_enabled',
    'employment_status': 'socioeconomic_section_enabled',
    'family_member': 'socioeconomic_section_enabled',
    'philhealth_member': 'gov_programs_section_enabled',
    'philhealth_status': 'gov_programs_section_enabled',
    'philhealth_no': 'gov_programs_section_enabled',
    'philhealth_category': 'gov_programs_section_enabled',
    'fourps_member': 'gov_programs_section_enabled',
    'dswd_nhts': 'gov_programs_section_enabled',
  };

  static const _profileFieldLabels = <String, String>{
    'blood_type': 'Blood type',
    'mother_maiden_name': "Mother's maiden name",
    'civil_status': 'Civil status',
    'spouse_name': "Spouse's name",
    'address_municipality': 'City / Municipality',
    'address_barangay': 'Barangay',
    'address_purok': 'Purok / Zone / Street',
    'province': 'Province',
    'educational_attainment': 'Educational attainment',
    'employment_status': 'Employment status',
    'family_member': 'Family member position',
    'philhealth_member': 'PhilHealth member',
    'philhealth_status': 'PhilHealth status',
    'philhealth_no': 'PhilHealth ID number',
    'philhealth_category': 'PhilHealth category',
    'fourps_member': '4Ps member',
    'dswd_nhts': 'DSWD NHTS',
  };

  static String labelForProfileField(String field) =>
      _profileFieldLabels[field] ?? field;

  bool isProfileSectionEnabled(String sectionKey) =>
      config.profile.isSectionEnabled(sectionKey);

  String rawProfileRule(String field) => config.profile.ruleFor(field);

  bool _isBaseProfileFieldVisible(String field) {
    final section = _profileSectionsByField[field];
    if (section != null && !isProfileSectionEnabled(section)) {
      return false;
    }
    return rawProfileRule(field) != 'hidden';
  }

  /// Evaluates effective profile field visibility including parent conditions.
  bool isProfileFieldVisible(
    String field, {
    String? civilStatus,
    String? philhealthMember,
  }) {
    if (!_isBaseProfileFieldVisible(field)) {
      return false;
    }
    if (field == 'spouse_name') {
      return _isBaseProfileFieldVisible('civil_status') &&
          civilStatus == 'married';
    }
    if (field == 'philhealth_status' ||
        field == 'philhealth_no' ||
        field == 'philhealth_category') {
      return _isBaseProfileFieldVisible('philhealth_member') &&
          philhealthMember == 'yes';
    }
    return true;
  }

  bool isProfileFieldRequired(
    String field, {
    String? civilStatus,
    String? philhealthMember,
  }) {
    if (!isProfileFieldVisible(
      field,
      civilStatus: civilStatus,
      philhealthMember: philhealthMember,
    )) {
      return false;
    }
    return rawProfileRule(field) == 'required';
  }

  bool get isAddressCardVisible =>
      isProfileSectionEnabled('address_section_enabled') &&
      (isProfileFieldVisible('address_municipality') ||
          isProfileFieldVisible('address_barangay') ||
          isProfileFieldVisible('address_purok') ||
          isProfileFieldVisible('province'));

  /// Full `address` string may only be recomposed when all 4 components are visible.
  bool get isFullAddressDerivable =>
      isProfileSectionEnabled('address_section_enabled') &&
      isProfileFieldVisible('address_municipality') &&
      isProfileFieldVisible('address_barangay') &&
      isProfileFieldVisible('address_purok') &&
      isProfileFieldVisible('province');

  bool get isSocioeconomicCardVisible =>
      isProfileSectionEnabled('socioeconomic_section_enabled') &&
      (isProfileFieldVisible('educational_attainment') ||
          isProfileFieldVisible('employment_status') ||
          isProfileFieldVisible('family_member'));

  bool get isGovProgramsCardVisible =>
      isProfileSectionEnabled('gov_programs_section_enabled');

  bool get hasAnyRequiredGovProgramToggle =>
      isGovProgramsCardVisible &&
      (isProfileFieldRequired('philhealth_member') ||
          isProfileFieldRequired('fourps_member') ||
          isProfileFieldRequired('dswd_nhts'));

  List<ProfileStepId> activeProfileSteps() => [
    ProfileStepId.basicInfo,
    ProfileStepId.addressAndContact,
    if (isSocioeconomicCardVisible || isGovProgramsCardVisible)
      ProfileStepId.socioeconomicAndProgram,
  ];

  Set<String> editableMembershipTypes() {
    if (!isGovProgramsCardVisible) {
      return const <String>{};
    }
    return <String>{
      'senior_citizen',
      'pwd',
      'indigenous_member',
      'other',
      if (_isBaseProfileFieldVisible('philhealth_member')) 'philhealth',
      if (_isBaseProfileFieldVisible('fourps_member')) 'fourps',
      if (_isBaseProfileFieldVisible('dswd_nhts')) 'dswd_nhts',
    };
  }

  /// Mirrors backend `StoreMobileAppointmentRequest` profile completeness check.
  List<String> missingRequiredProfileFields(PatientProfile patient) {
    final details = patient.details;
    final civilStatus = details?.civilStatus;
    final philhealthMember = details?.philhealthMember;
    final values = <String, String?>{
      'blood_type': details?.bloodType,
      'mother_maiden_name': details?.motherMaidenName,
      'civil_status': details?.civilStatus,
      'spouse_name': details?.spouseName,
      'address_municipality': details?.addressMunicipality,
      'address_barangay': details?.addressBarangay,
      'address_purok': details?.addressPurok,
      'province': details?.province,
      'educational_attainment': details?.educationalAttainment,
      'employment_status': details?.employmentStatus,
      'family_member': details?.familyMember,
      'philhealth_member': details?.philhealthMember,
      'philhealth_status': details?.philhealthStatus,
      'philhealth_no': details?.philhealthNo,
      'philhealth_category': details?.philhealthCategory,
      'fourps_member': details?.fourpsMember,
      'dswd_nhts': details?.dswdNhts,
    };

    final missing = <String>[];
    for (final field in profileFields) {
      if (isProfileFieldRequired(
        field,
        civilStatus: civilStatus,
        philhealthMember: philhealthMember,
      )) {
        final value = values[field];
        if (value == null || value.trim().isEmpty) {
          missing.add(field);
        }
      }
    }
    return missing;
  }

  bool get isIntakeSectionEnabled =>
      config.intake.isSectionEnabled('bite_intake_section_enabled');

  String rawIntakeRule(String field) => config.intake.ruleFor(field);

  bool isIntakeFieldVisible(String field) =>
      isIntakeSectionEnabled && rawIntakeRule(field) != 'hidden';

  bool isIntakeFieldRequired(String field, {String? animalType}) {
    if (!isIntakeFieldVisible(field)) {
      return false;
    }
    if (field == 'animal_type_others') {
      return isIntakeFieldVisible('animal_type') && animalType == 'other';
    }
    return rawIntakeRule(field) == 'required';
  }

  String intakePayloadKey(String canonicalField) =>
      config.intake.aliasFor(canonicalField);

  List<IntakeStepId> activeIntakeSteps() => [
    IntakeStepId.patient,
    if (isIntakeSectionEnabled) ...[
      IntakeStepId.incident,
      IntakeStepId.animal,
      IntakeStepId.history,
    ],
    IntakeStepId.review,
  ];
}
