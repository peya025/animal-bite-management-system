import 'booking_draft.dart';
import 'patient_profile.dart';

class BiteIntakeRouteArgs {
  const BiteIntakeRouteArgs({required this.patient, required this.booking});

  final PatientProfile patient;
  final BookingDraft booking;
}
