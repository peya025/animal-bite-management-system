import 'package:flutter/foundation.dart';

@immutable
class BiteIntakeDraft {
  const BiteIntakeDraft({
    required this.schemaVersion,
    this.dateOfExposure,
    this.siteWashed,
    this.reportedModeOfExposure,
    this.animalSpecies,
    this.animalOwnership,
    this.animalCaptured,
    this.timeOfExposure,
    this.placeOfExposure,
    this.animalSpeciesOther,
    this.bodyPartGroup,
    this.bodyPartDetail,
    this.incidentNarrative,
    this.laterality,
    this.washMethod,
    this.washDurationMinutes,
    this.animalAvailableForObservation,
    this.animalConditionReported,
    this.careReceived,
    this.referralSource,
    this.referralFacility,
    this.referralBloodPressure,
    this.referralTemperature,
    this.referralHeight,
    this.referralWeight,
    this.referralProviderName,
    this.referralDocumentPhoto,
    this.pastBiteHistory,
    this.pastBiteDates,
    this.priorPepStatus,
    this.priorPepDate,
    this.priorPepFacility,
  });

  final String schemaVersion;
  final DateTime? dateOfExposure;
  final String? timeOfExposure;
  final String? placeOfExposure;
  final bool? siteWashed;
  final String? reportedModeOfExposure;
  final String? animalSpecies;
  final String? animalSpeciesOther;
  final String? animalOwnership;
  final bool? animalCaptured;
  final bool? animalAvailableForObservation;
  final String? animalConditionReported;
  final String? bodyPartGroup;
  final String? bodyPartDetail;
  final String? incidentNarrative;
  final String? laterality;
  final String? washMethod;
  final int? washDurationMinutes;
  final String? careReceived;
  final String? referralSource;
  final String? referralFacility;
  final String? referralBloodPressure;
  final String? referralTemperature;
  final String? referralHeight;
  final String? referralWeight;
  final String? referralProviderName;
  final String? referralDocumentPhoto;
  final String? pastBiteHistory;
  final String? pastBiteDates;
  final String? priorPepStatus;
  final DateTime? priorPepDate;
  final String? priorPepFacility;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'schema_version': schemaVersion};
    void put(String key, dynamic value) {
      if (value != null) {
        map[key] = value;
      }
    }

    if (dateOfExposure != null) {
      map['date_of_exposure'] = dateOfExposure!.toIso8601String().split('T').first;
    }
    put('time_of_exposure', timeOfExposure);
    put('place_of_exposure', placeOfExposure);
    put('site_washed', siteWashed);
    put('wash_method', washMethod);
    put('wash_duration_minutes', washDurationMinutes);
    put('reported_mode_of_exposure', reportedModeOfExposure);
    put('animal_species', animalSpecies);
    put('animal_species_other', animalSpeciesOther);
    put('animal_ownership', animalOwnership);
    put('animal_captured', animalCaptured);
    put('animal_available_for_observation', animalAvailableForObservation);
    put('animal_condition_reported', animalConditionReported);
    put('body_part_group', bodyPartGroup);
    put('body_part_detail', bodyPartDetail);
    put('laterality', laterality);
    put('incident_narrative', incidentNarrative);
    put('care_received', careReceived);
    put('referral_source', referralSource);
    put('referral_facility', referralFacility);
    put('referral_blood_pressure', referralBloodPressure);
    put('referral_temperature', referralTemperature);
    put('referral_height', referralHeight);
    put('referral_weight', referralWeight);
    put('referral_provider_name', referralProviderName);
    put('referral_document_photo', referralDocumentPhoto);
    put('past_bite_history', pastBiteHistory);
    put('past_bite_dates', pastBiteDates);
    put('prior_pep_status', priorPepStatus);
    if (priorPepDate != null) {
      map['prior_pep_date'] = priorPepDate!.toIso8601String().split('T').first;
    }
    put('prior_pep_facility', priorPepFacility);
    return map;
  }
}
