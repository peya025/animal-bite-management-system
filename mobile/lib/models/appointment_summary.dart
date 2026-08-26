class AppointmentSummary {
  const AppointmentSummary({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.type,
    required this.scheduledDate,
    required this.status,
    this.cancellationReason,
    this.typeLabelOverride,
    this.doseName,
    this.doseNumber,
    this.relationship,
    this.notes,
  });

  final int id;
  final int patientId;
  final String patientName;
  final String type;
  final DateTime scheduledDate;
  final String status;
  final String? cancellationReason;
  final String? typeLabelOverride;
  final String? doseName;
  final int? doseNumber;
  final String? relationship;
  final String? notes;

  bool get canCancel => status == 'scheduled';

  String get typeLabel {
    if (typeLabelOverride != null && typeLabelOverride!.isNotEmpty) {
      return typeLabelOverride!;
    }
    if (doseName != null && doseName!.isNotEmpty) {
      return 'Anti-rabies vaccine · $doseName';
    }
    return type == 'vaccination' || type == 'follow_up_vaccination'
        ? 'Vaccination'
        : 'Bite consultation';
  }

  String get formattedDate {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final date = scheduledDate.toLocal();
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  factory AppointmentSummary.fromJson(Map<String, dynamic> json) {
    final patient = json['patient'] as Map<String, dynamic>?;
    final pName = json['patient_name'] as String? ??
        (patient?['name'] as String?) ??
        (patient?['first_name'] != null
            ? '${patient!['first_name']} ${patient['last_name'] ?? ''}'.trim()
            : 'Patient');

    final rawDateStr = json['scheduled_date'] ?? json['appointment_date'] ?? DateTime.now().toIso8601String();
    final parsedDate = DateTime.tryParse(rawDateStr.toString()) ?? DateTime.now();

    final rel = json['relationship'] as String? ?? patient?['relationship'] as String? ?? 'self';

    return AppointmentSummary(
      id: json['appointment_id'] as int? ?? 0,
      patientId: json['patient_id'] as int? ?? patient?['patient_id'] as int? ?? 0,
      patientName: pName,
      type: json['appointment_type'] as String? ?? json['type'] as String? ?? 'consultation',
      scheduledDate: parsedDate,
      status: json['status'] as String? ?? 'scheduled',
      cancellationReason: json['cancellation_reason'] as String?,
      typeLabelOverride: json['type_label'] as String?,
      doseName: json['dose_name'] as String?,
      doseNumber: json['dose_number'] as int?,
      relationship: rel,
      notes: json['notes'] as String?,
    );
  }
}
