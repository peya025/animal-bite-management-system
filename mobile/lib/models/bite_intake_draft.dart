class BiteIntakeDraft {
  const BiteIntakeDraft({
    required this.biteDate,
    required this.siteWashed,
    required this.exposureType,
    required this.animalType,
    required this.animalStatus,
    required this.animalCaptured,
    this.bitePlace,
    this.woundLocation,
    this.patientDescription,
  });

  final DateTime biteDate;
  final bool siteWashed;
  final String exposureType;
  final String animalType;
  final String animalStatus;
  final bool animalCaptured;
  final String? bitePlace;
  final String? woundLocation;
  final String? patientDescription;

  Map<String, dynamic> toJson() => {
    'bite_date': biteDate.toIso8601String().split('T').first,
    'site_washed': siteWashed,
    'exposure_type': exposureType,
    'animal_type': animalType,
    'animal_status': animalStatus,
    'animal_captured': animalCaptured,
    'bite_place': bitePlace,
    'wound_location': woundLocation,
    'patient_description': patientDescription,
  };
}
