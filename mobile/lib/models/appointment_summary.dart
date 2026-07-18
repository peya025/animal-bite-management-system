class AppointmentSummary {
  const AppointmentSummary({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.type,
    required this.scheduledDate,
    required this.status,
    this.cancellationReason,
  });

  final int id;
  final int patientId;
  final String patientName;
  final String type;
  final DateTime scheduledDate;
  final String status;
  final String? cancellationReason;

  bool get canCancel => status == 'scheduled';

  String get typeLabel => type == 'vaccination'
      ? 'Vaccination'
      : 'Bite consultation';

  String get formattedDate {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final date = scheduledDate.toLocal();
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  factory AppointmentSummary.fromJson(Map<String, dynamic> json) {
    final patient = json['patient'] as Map<String, dynamic>;
    return AppointmentSummary(
      id: json['appointment_id'] as int,
      patientId: json['patient_id'] as int,
      patientName: patient['name'] as String,
      type: json['appointment_type'] as String,
      scheduledDate: DateTime.parse(json['scheduled_date'] as String),
      status: json['status'] as String,
      cancellationReason: json['cancellation_reason'] as String?,
    );
  }
}
