import 'package:flutter/foundation.dart';

@immutable
class BiteIntakeDraft {
  const BiteIntakeDraft({
    required this.schemaVersion,
    required this.dateOfExposure,
    required this.siteWashed,
    required this.reportedModeOfExposure,
    required this.animalSpecies,
    required this.animalOwnership,
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
    this.pastBiteHistory,
    this.pastBiteDates,
    this.priorPepStatus,
    this.priorPepDate,
    this.priorPepFacility,
  });

  final String schemaVersion;
  final DateTime dateOfExposure;
  final String? timeOfExposure;
  final String? placeOfExposure;
  final bool siteWashed;
  final String reportedModeOfExposure;
  final String animalSpecies;
  final String? animalSpeciesOther;
  final String animalOwnership;
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
  final String? pastBiteHistory;
  final String? pastBiteDates;
  final String? priorPepStatus;
  final DateTime? priorPepDate;
  final String? priorPepFacility;

  Map<String, dynamic> toJson() => {
    'schema_version': schemaVersion,
    'date_of_exposure': dateOfExposure.toIso8601String().split('T').first,
    'time_of_exposure': timeOfExposure,
    'place_of_exposure': placeOfExposure,
    'site_washed': siteWashed,
    'wash_method': washMethod,
    'wash_duration_minutes': washDurationMinutes,
    'reported_mode_of_exposure': reportedModeOfExposure,
    'animal_species': animalSpecies,
    'animal_species_other': animalSpeciesOther,
    'animal_ownership': animalOwnership,
    'animal_available_for_observation': animalAvailableForObservation,
    'animal_condition_reported': animalConditionReported,
    'body_part_group': bodyPartGroup,
    'body_part_detail': bodyPartDetail,
    'laterality': laterality,
    'incident_narrative': incidentNarrative,
    'care_received': careReceived,
    'referral_source': referralSource,
    'past_bite_history': pastBiteHistory,
    'past_bite_dates': pastBiteDates,
    'prior_pep_status': priorPepStatus,
    'prior_pep_date': priorPepDate?.toIso8601String().split('T').first,
    'prior_pep_facility': priorPepFacility,
  };
}
