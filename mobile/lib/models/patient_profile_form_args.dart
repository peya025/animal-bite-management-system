import 'patient_profile.dart';

class PatientProfileFormArgs {
  const PatientProfileFormArgs({
    this.patient,
    this.initialRelationship,
    this.returnToBooking = false,
  });

  final PatientProfile? patient;
  final String? initialRelationship;
  final bool returnToBooking;
}
