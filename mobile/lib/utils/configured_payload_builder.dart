import '../models/bite_intake_draft.dart';
import 'configured_field_policy.dart';

/// Builds omission-safe profile and intake payloads aligned with [ConfiguredFieldPolicy].
abstract final class ConfiguredPayloadBuilder {
  static String? _clean(String? value) {
    final trimmed = value?.trim();
    return (trimmed == null || trimmed.isEmpty) ? null : trimmed;
  }

  /// Builds a mobile patient create/update payload, omitting hidden or section-disabled fields.
  static Map<String, dynamic> buildProfilePayload({
    required ConfiguredFieldPolicy policy,
    required String relationship,
    required String firstName,
    String? middleName,
    required String lastName,
    String? suffix,
    required String? gender,
    String? dateOfBirth,
    String? contactNumber,
    String? email,
    String? emergencyContactName,
    String? emergencyContactNumber,
    // Configurable Form 1 personal fields
    String? bloodType,
    String? motherMaidenName,
    String? civilStatus,
    String? spouseName,
    // Address fields
    String? derivedFullAddress,
    String? addressMunicipality,
    String? addressBarangay,
    String? addressPurok,
    String? province,
    // Socioeconomic fields
    String? educationalAttainment,
    String? employmentStatus,
    String? familyMember,
    // Government programs & memberships
    String? hasMembership,
    String? philhealthMember,
    String? philhealthStatus,
    String? philhealthNo,
    String? philhealthCategory,
    String? fourpsMember,
    String? fourpsCategory,
    String? fourpsRelationship,
    String? registeredFourpsBeneficiary,
    String? dswdNhts,
    Set<String> otherMemberships = const <String>{},
    String? seniorCitizenId,
    String? pwdId,
    String? indigenousTribe,
    String? otherMembershipCustomName,
    String? otherMembershipCustomId,
  }) {
    final payload = <String, dynamic>{
      'relationship': relationship,
      'first_name': firstName.trim(),
      'middle_name': _clean(middleName),
      'last_name': lastName.trim(),
      'suffix': _clean(suffix),
      'gender': gender,
      'date_of_birth': dateOfBirth,
      'contact_number': _clean(contactNumber),
      'email': _clean(email),
      'emergency_contact_name': _clean(emergencyContactName),
      'emergency_contact_number': _clean(emergencyContactNumber),
    };

    if (policy.isProfileFieldVisible('blood_type')) {
      payload['blood_type'] = _clean(bloodType);
    }
    if (policy.isProfileFieldVisible('mother_maiden_name')) {
      payload['mother_maiden_name'] = _clean(motherMaidenName);
    }
    if (policy.isProfileFieldVisible('civil_status')) {
      payload['civil_status'] = _clean(civilStatus);
    }
    if (policy.isProfileFieldVisible(
      'spouse_name',
      civilStatus: civilStatus,
    )) {
      payload['spouse_name'] = _clean(spouseName);
    } else if (policy.isProfileFieldVisible('civil_status') &&
        policy.isProfileFieldVisible('spouse_name', civilStatus: 'married')) {
      // Visible spouse field cleared when civil status is explicitly not married.
      payload['spouse_name'] = null;
    }

    if (policy.isFullAddressDerivable) {
      payload['address'] = _clean(derivedFullAddress);
    }
    if (policy.isProfileFieldVisible('address_municipality')) {
      payload['address_municipality'] = _clean(addressMunicipality);
    }
    if (policy.isProfileFieldVisible('address_barangay')) {
      payload['address_barangay'] = _clean(addressBarangay);
    }
    if (policy.isProfileFieldVisible('address_purok')) {
      payload['address_purok'] = _clean(addressPurok);
    }
    if (policy.isProfileFieldVisible('province')) {
      payload['province'] = _clean(province);
    }

    if (policy.isProfileFieldVisible('educational_attainment')) {
      payload['educational_attainment'] = _clean(educationalAttainment);
    }
    if (policy.isProfileFieldVisible('employment_status')) {
      payload['employment_status'] = _clean(employmentStatus);
    }
    if (policy.isProfileFieldVisible('family_member')) {
      payload['family_member'] = _clean(familyMember);
    }

    if (policy.isGovProgramsCardVisible) {
      final effectiveNo = hasMembership == 'no';
      final effectivePhilhealth = effectiveNo ? 'no' : philhealthMember;
      final effectiveFourps = effectiveNo ? 'no' : fourpsMember;
      final effectiveDswd = effectiveNo ? 'no' : dswdNhts;

      payload['has_membership'] = _clean(hasMembership);

      if (policy.isProfileFieldVisible('philhealth_member')) {
        payload['philhealth_member'] = _clean(effectivePhilhealth);
        final philhealthYes = effectivePhilhealth == 'yes';
        if (policy.isProfileFieldVisible(
          'philhealth_status',
          philhealthMember: 'yes',
        )) {
          payload['philhealth_status'] = philhealthYes
              ? _clean(philhealthStatus)
              : null;
        }
        if (policy.isProfileFieldVisible(
          'philhealth_no',
          philhealthMember: 'yes',
        )) {
          payload['philhealth_no'] = philhealthYes ? _clean(philhealthNo) : null;
        }
        if (policy.isProfileFieldVisible(
          'philhealth_category',
          philhealthMember: 'yes',
        )) {
          payload['philhealth_category'] = philhealthYes
              ? _clean(philhealthCategory)
              : null;
        }
      }

      if (policy.isProfileFieldVisible('fourps_member')) {
        payload['fourps_member'] = _clean(effectiveFourps);
        final fourpsYes = effectiveFourps == 'yes';
        payload['fourps_category'] = fourpsYes ? _clean(fourpsCategory) : null;
        payload['fourps_relationship'] = fourpsYes
            ? _clean(fourpsRelationship)
            : null;
        payload['registered_fourps_beneficiary'] = fourpsYes
            ? _clean(registeredFourpsBeneficiary)
            : null;
      }

      if (policy.isProfileFieldVisible('dswd_nhts')) {
        payload['dswd_nhts'] = _clean(effectiveDswd);
      }

      payload['memberships'] = buildMembershipPayload(
        policy: policy,
        hasMembership: hasMembership,
        philhealthMember: effectivePhilhealth,
        philhealthStatus: philhealthStatus,
        philhealthNo: philhealthNo,
        philhealthCategory: philhealthCategory,
        fourpsMember: effectiveFourps,
        fourpsCategory: fourpsCategory,
        fourpsRelationship: fourpsRelationship,
        registeredFourpsBeneficiary: registeredFourpsBeneficiary,
        dswdNhts: effectiveDswd,
        otherMemberships: effectiveNo ? const <String>{} : otherMemberships,
        seniorCitizenId: seniorCitizenId,
        pwdId: pwdId,
        indigenousTribe: indigenousTribe,
        otherMembershipCustomName: otherMembershipCustomName,
        otherMembershipCustomId: otherMembershipCustomId,
      );
    }

    return payload;
  }

  /// Builds an editable-only membership array without emitting hidden program types/details.
  static List<Map<String, dynamic>> buildMembershipPayload({
    required ConfiguredFieldPolicy policy,
    String? hasMembership,
    String? philhealthMember,
    String? philhealthStatus,
    String? philhealthNo,
    String? philhealthCategory,
    String? fourpsMember,
    String? fourpsCategory,
    String? fourpsRelationship,
    String? registeredFourpsBeneficiary,
    String? dswdNhts,
    Set<String> otherMemberships = const <String>{},
    String? seniorCitizenId,
    String? pwdId,
    String? indigenousTribe,
    String? otherMembershipCustomName,
    String? otherMembershipCustomId,
  }) {
    final editable = policy.editableMembershipTypes();
    if (editable.isEmpty || hasMembership == 'no') {
      return const <Map<String, dynamic>>[];
    }

    final list = <Map<String, dynamic>>[];

    if (editable.contains('philhealth') && philhealthMember == 'yes') {
      list.add({
        'membership_type': 'philhealth',
        if (policy.isProfileFieldVisible(
          'philhealth_no',
          philhealthMember: 'yes',
        ))
          'membership_id_no': _clean(philhealthNo),
        if (policy.isProfileFieldVisible(
          'philhealth_category',
          philhealthMember: 'yes',
        ))
          'category': _clean(philhealthCategory),
        if (policy.isProfileFieldVisible(
          'philhealth_status',
          philhealthMember: 'yes',
        ))
          'status_value': _clean(philhealthStatus),
      });
    }

    if (editable.contains('fourps') && fourpsMember == 'yes') {
      list.add({
        'membership_type': 'fourps',
        'category': _clean(fourpsCategory),
        'relationship_value': _clean(fourpsRelationship),
        'registered_beneficiary': _clean(registeredFourpsBeneficiary),
      });
    }

    if (editable.contains('dswd_nhts') && dswdNhts == 'yes') {
      list.add({'membership_type': 'dswd_nhts'});
    }

    if (editable.contains('senior_citizen') &&
        otherMemberships.contains('senior_citizen')) {
      list.add({
        'membership_type': 'senior_citizen',
        'membership_id_no': _clean(seniorCitizenId),
      });
    }

    if (editable.contains('pwd') && otherMemberships.contains('pwd')) {
      list.add({
        'membership_type': 'pwd',
        'membership_id_no': _clean(pwdId),
      });
    }

    if (editable.contains('indigenous_member') &&
        otherMemberships.contains('indigenous_member')) {
      list.add({
        'membership_type': 'indigenous_member',
        'extra_value': _clean(indigenousTribe),
      });
    }

    if (editable.contains('other') && otherMemberships.contains('others')) {
      list.add({
        'membership_type': 'other',
        'membership_label': _clean(otherMembershipCustomName),
        'membership_id_no': _clean(otherMembershipCustomId),
      });
    }

    return list;
  }

  /// Builds an omission-safe consultation intake payload from [BiteIntakeDraft].
  static Map<String, dynamic>? buildIntakePayload({
    required ConfiguredFieldPolicy policy,
    required BiteIntakeDraft draft,
  }) {
    if (!policy.isIntakeSectionEnabled) {
      return null;
    }

    final map = <String, dynamic>{'schema_version': draft.schemaVersion};

    void putIfPresent(String key, dynamic value) {
      if (value != null) {
        map[key] = value;
      }
    }

    if (policy.isIntakeFieldVisible('bite_date') &&
        draft.dateOfExposure != null) {
      map[policy.intakePayloadKey('bite_date')] =
          draft.dateOfExposure!.toIso8601String().split('T').first;
    }

    putIfPresent('time_of_exposure', _clean(draft.timeOfExposure));

    if (policy.isIntakeFieldVisible('bite_place')) {
      putIfPresent(
        policy.intakePayloadKey('bite_place'),
        _clean(draft.placeOfExposure),
      );
    }

    if (policy.isIntakeFieldVisible('site_washed') &&
        draft.siteWashed != null) {
      map['site_washed'] = draft.siteWashed;
      if (draft.siteWashed == true) {
        putIfPresent('wash_method', _clean(draft.washMethod));
        putIfPresent('wash_duration_minutes', draft.washDurationMinutes);
      }
    }

    if (policy.isIntakeFieldVisible('exposure_type')) {
      putIfPresent(
        policy.intakePayloadKey('exposure_type'),
        _clean(draft.reportedModeOfExposure),
      );
    }

    if (policy.isIntakeFieldVisible('animal_type')) {
      final species = _clean(draft.animalSpecies);
      if (species != null) {
        map[policy.intakePayloadKey('animal_type')] = species;
        if (species == 'other') {
          putIfPresent(
            'animal_species_other',
            _clean(draft.animalSpeciesOther),
          );
        }
      }
    }

    if (policy.isIntakeFieldVisible('animal_status')) {
      putIfPresent(
        policy.intakePayloadKey('animal_status'),
        _clean(draft.animalOwnership),
      );
    }

    if (policy.isIntakeFieldVisible('animal_captured') &&
        draft.animalCaptured != null) {
      map['animal_captured'] = draft.animalCaptured;
    }

    putIfPresent(
      'animal_available_for_observation',
      draft.animalAvailableForObservation,
    );
    putIfPresent(
      'animal_condition_reported',
      _clean(draft.animalConditionReported),
    );

    if (policy.isIntakeFieldVisible('wound_location')) {
      putIfPresent('body_part_group', _clean(draft.bodyPartGroup));
      putIfPresent(
        policy.intakePayloadKey('wound_location'),
        _clean(draft.bodyPartDetail),
      );
      putIfPresent('laterality', _clean(draft.laterality));
    }

    if (policy.isIntakeFieldVisible('patient_description')) {
      putIfPresent(
        policy.intakePayloadKey('patient_description'),
        _clean(draft.incidentNarrative),
      );
    }

    putIfPresent('care_received', _clean(draft.careReceived));
    putIfPresent('referral_source', _clean(draft.referralSource));
    putIfPresent('referral_facility', _clean(draft.referralFacility));
    putIfPresent(
      'referral_blood_pressure',
      _clean(draft.referralBloodPressure),
    );
    putIfPresent('referral_temperature', _clean(draft.referralTemperature));
    putIfPresent('referral_height', _clean(draft.referralHeight));
    putIfPresent('referral_weight', _clean(draft.referralWeight));
    putIfPresent('referral_provider_name', _clean(draft.referralProviderName));
    putIfPresent('referral_document_photo', draft.referralDocumentPhoto);
    putIfPresent('past_bite_history', _clean(draft.pastBiteHistory));
    putIfPresent('past_bite_dates', _clean(draft.pastBiteDates));
    putIfPresent('prior_pep_status', _clean(draft.priorPepStatus));
    if (draft.priorPepDate != null) {
      map['prior_pep_date'] =
          draft.priorPepDate!.toIso8601String().split('T').first;
    }
    putIfPresent('prior_pep_facility', _clean(draft.priorPepFacility));

    return map;
  }

  /// Builds an omission-safe partial intake update payload for appointment intake edits.
  static Map<String, dynamic> buildIntakeUpdatePayload({
    required ConfiguredFieldPolicy policy,
    DateTime? dateOfExposure,
    String? placeOfExposure,
    bool? siteWashed,
    String? reportedModeOfExposure,
    String? animalSpecies,
    String? animalSpeciesOther,
    String? animalOwnership,
    bool? animalCaptured,
    String? bodyPartGroup,
    String? bodyPartDetail,
    String? incidentNarrative,
  }) {
    if (!policy.isIntakeSectionEnabled) {
      return const <String, dynamic>{};
    }

    final map = <String, dynamic>{};
    if (policy.isIntakeFieldVisible('bite_date') && dateOfExposure != null) {
      map[policy.intakePayloadKey('bite_date')] =
          dateOfExposure.toIso8601String().split('T').first;
    }
    if (policy.isIntakeFieldVisible('bite_place')) {
      map[policy.intakePayloadKey('bite_place')] = _clean(placeOfExposure);
    }
    if (policy.isIntakeFieldVisible('site_washed') && siteWashed != null) {
      map['site_washed'] = siteWashed;
    }
    if (policy.isIntakeFieldVisible('exposure_type') &&
        _clean(reportedModeOfExposure) != null) {
      map[policy.intakePayloadKey('exposure_type')] =
          _clean(reportedModeOfExposure);
    }
    if (policy.isIntakeFieldVisible('animal_type') &&
        _clean(animalSpecies) != null) {
      final species = _clean(animalSpecies)!;
      map[policy.intakePayloadKey('animal_type')] = species;
      if (species == 'other') {
        map['animal_species_other'] = _clean(animalSpeciesOther);
      }
    }
    if (policy.isIntakeFieldVisible('animal_status') &&
        _clean(animalOwnership) != null) {
      map[policy.intakePayloadKey('animal_status')] = _clean(animalOwnership);
    }
    if (policy.isIntakeFieldVisible('animal_captured') &&
        animalCaptured != null) {
      map['animal_captured'] = animalCaptured;
    }
    if (policy.isIntakeFieldVisible('wound_location')) {
      if (_clean(bodyPartGroup) != null) {
        map['body_part_group'] = _clean(bodyPartGroup);
      }
      map[policy.intakePayloadKey('wound_location')] = _clean(bodyPartDetail);
    }
    if (policy.isIntakeFieldVisible('patient_description')) {
      map[policy.intakePayloadKey('patient_description')] =
          _clean(incidentNarrative);
    }
    return map;
  }
}
