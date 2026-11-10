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
    this.idealDate,
    this.scheduleDriftDays,
    this.scheduleAdjustmentReason,
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
  final String? idealDate;
  final int? scheduleDriftDays;
  final String? scheduleAdjustmentReason;

  /// Scheduled follow-up vaccination doses (Day 3, Day 7, Day 14/28, and Booster)
  /// are mandatory clinical treatments and cannot be cancelled online by the patient.
  bool get isFollowUpOrBooster {
    if (type == 'booster' || type == 'follow_up_vaccination') {
      return true;
    }
    if (doseNumber != null && doseNumber! > 0) {
      return true;
    }
    if (doseName != null && doseName!.isNotEmpty) {
      final lower = doseName!.toLowerCase();
      if (lower.contains('day 3') ||
          lower.contains('day 7') ||
          lower.contains('day 14') ||
          lower.contains('day 28') ||
          lower.contains('booster')) {
        return true;
      }
    }
    final n = notes?.toLowerCase() ?? '';
    if (n.contains('day 3') ||
        n.contains('day 7') ||
        n.contains('day 14') ||
        n.contains('day 28') ||
        n.contains('booster')) {
      return true;
    }
    return false;
  }

  /// Initial bite consultations (Day 0 before treatment begins) can be cancelled,
  /// but critical follow-up vaccination doses (Day 3 to booster) cannot.
  bool get canCancel => status == 'scheduled' && !isFollowUpOrBooster;

  /// Returns true when this is an active scheduled follow-up vaccination appointment
  /// that cannot be cancelled by the patient in the mobile app.
  bool get isNonCancellableFollowUp => status == 'scheduled' && isFollowUpOrBooster;

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
      idealDate: json['ideal_date'] as String?,
      scheduleDriftDays: json['schedule_drift_days'] as int?,
      scheduleAdjustmentReason: json['schedule_adjustment_reason'] as String?,
    );
  }
}
