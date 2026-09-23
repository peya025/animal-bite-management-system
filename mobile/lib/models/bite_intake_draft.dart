import 'package:flutter/foundation.dart';

@immutable
class BiteIntakeDraft {
  const BiteIntakeDraft({
    required this.biteDate,
    required this.siteWashed,
    required this.exposureType,
    required this.animalType,
    required this.animalStatus,
    this.animalCaptured,
    this.incidentTime,
    this.animalTypeOthers,
    this.bitePlace,
    this.woundLocation,
    this.bodyPartExposed,
    this.patientDescription,
    this.laterality,
    this.washMethod,
    this.washDurationMinutes,
    this.animalAvailable,
    this.animalConditionReported,
    this.careReceived,
    this.referralFacility,
    this.priorRabiesVaccination,
    this.priorVaccinationDate,
    this.priorVaccinationFacility,
  });

  final DateTime biteDate;
  final bool siteWashed;
  final String exposureType;
  final String animalType;
  final String? animalTypeOthers;
  final String animalStatus;
  final bool? animalCaptured;
  final String? incidentTime;
  final String? bitePlace;
  final String? woundLocation;
  final String? bodyPartExposed;
  final String? patientDescription;
  final String? laterality;
  final String? washMethod;
  final int? washDurationMinutes;
  final bool? animalAvailable;
  final String? animalConditionReported;
  final String? careReceived;
  final String? referralFacility;
  final String? priorRabiesVaccination;
  final DateTime? priorVaccinationDate;
  final String? priorVaccinationFacility;

  Map<String, dynamic> toJson() => {
    'bite_date': biteDate.toIso8601String().split('T').first,
    'incident_time': incidentTime,
    'site_washed': siteWashed,
    'exposure_type': exposureType,
    'animal_type': animalType,
    'animal_type_others': animalTypeOthers,
    'animal_status': animalStatus,
    'animal_captured': animalCaptured,
    'bite_place': bitePlace,
    'wound_location': woundLocation,
    'body_part_exposed': bodyPartExposed,
    'patient_description': patientDescription,
    'laterality': laterality,
    'wash_method': washMethod,
    'wash_duration_minutes': washDurationMinutes,
    'animal_available': animalAvailable,
    'animal_condition_reported': animalConditionReported,
    'care_received': careReceived,
    'referral_facility': referralFacility,
    'prior_rabies_vaccination': priorRabiesVaccination,
    'prior_vaccination_date': priorVaccinationDate
        ?.toIso8601String()
        .split('T')
        .first,
    'prior_vaccination_facility': priorVaccinationFacility,
  };
}
