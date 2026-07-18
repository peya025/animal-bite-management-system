import 'patient_profile.dart';

class PatientAccountProfile {
  const PatientAccountProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.patients,
    this.phone,
  });

  final int id;
  final String name;
  final String email;
  final String? phone;
  final List<PatientProfile> patients;

  factory PatientAccountProfile.fromJson(Map<String, dynamic> json) {
    final patientData = json['patients'] as List<dynamic>? ?? const [];
    return PatientAccountProfile(
      id: json['id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      patients: patientData
          .map(
            (item) => PatientProfile.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}
