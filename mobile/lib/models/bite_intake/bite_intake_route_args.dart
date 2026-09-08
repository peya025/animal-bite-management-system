import 'package:flutter/foundation.dart';

import 'package:mobile/models/booking/booking_draft.dart';
import 'package:mobile/models/patient/patient_profile.dart';

@immutable
class BiteIntakeRouteArgs {
  const BiteIntakeRouteArgs({required this.patient, required this.booking});

  final PatientProfile patient;
  final BookingDraft booking;
}
