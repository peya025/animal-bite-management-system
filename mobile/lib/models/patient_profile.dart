class PatientProfile {
  const PatientProfile({
    required this.id,
    required this.name,
    required this.relationship,
    required this.status,
  });

  final int id;
  final String name;
  final String relationship;
  final String status;

  bool get isVerified => status == 'verified';

  factory PatientProfile.fromJson(Map<String, dynamic> json) {
    final pivot = json['pivot'] as Map<String, dynamic>? ?? const {};
    return PatientProfile(
      id: json['patient_id'] as int,
      name: json['name'] as String,
      relationship: pivot['relationship'] as String? ?? 'dependent',
      status: pivot['status'] as String? ?? 'pending',
    );
  }
}
