import 'booking_draft.dart';

class PatientBookingRequest {
  const PatientBookingRequest({
    required this.booking,
    required this.name,
    required this.gender,
    this.dateOfBirth,
    this.address,
    this.contactNumber,
    this.emergencyContactName,
    this.emergencyContactNumber,
  });

  final BookingDraft booking;
  final String name;
  final String gender;
  final DateTime? dateOfBirth;
  final String? address;
  final String? contactNumber;
  final String? emergencyContactName;
  final String? emergencyContactNumber;

  Map<String, dynamic> toPatientJson() {
    return {
      'name': name,
      'gender': gender,
      'date_of_birth': dateOfBirth?.toIso8601String().split('T').first,
      'address': address,
      'contact_number': contactNumber,
      'emergency_contact_name': emergencyContactName,
      'emergency_contact_number': emergencyContactNumber,
    };
  }

  Map<String, dynamic> toAppointmentJson(int patientId) {
    return {
      'patient_id': patientId,
      'scheduled_date': booking.date.toIso8601String(),
    };
  }
}
