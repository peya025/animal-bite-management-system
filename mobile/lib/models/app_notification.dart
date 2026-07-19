import 'package:flutter/material.dart';

import '../app/app_theme.dart';

enum AppNotificationKind { vaccination, appointment, awareness, system }

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.message,
    required this.status,
    required this.createdAt,
    required this.patientName,
  });

  final int id;
  final String type;
  final String message;
  final String status;
  final DateTime createdAt;
  final String patientName;

  bool get isRead => status == 'read';

  AppNotificationKind get kind => switch (type) {
    'vaccination_reminder' => AppNotificationKind.vaccination,
    'booking_confirmation' || 'booking_cancelled' =>
      AppNotificationKind.appointment,
    'awareness' => AppNotificationKind.awareness,
    _ => AppNotificationKind.system,
  };

  String get title => switch (type) {
    'booking_confirmation' => 'Appointment confirmed',
    'booking_cancelled' => 'Appointment cancelled',
    'vaccination_reminder' => 'Vaccination reminder',
    'digital_card_updated' => 'Vaccination card updated',
    'awareness' => 'Clinic health advisory',
    _ => 'Clinic update',
  };

  String get relativeTime {
    final difference = DateTime.now().difference(createdAt.toLocal());
    if (difference.inMinutes < 1) return 'Just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    if (difference.inDays < 7) return '${difference.inDays}d ago';
    final date = createdAt.toLocal();
    return '${date.month}/${date.day}/${date.year}';
  }

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final patient = json['patient'] as Map<String, dynamic>?;
    return AppNotification(
      id: json['notification_id'] as int,
      type: json['type'] as String,
      message: json['message'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      patientName: patient?['name'] as String? ?? 'Patient',
    );
  }

  AppNotification copyWith({String? status}) {
    return AppNotification(
      id: id,
      type: type,
      message: message,
      status: status ?? this.status,
      createdAt: createdAt,
      patientName: patientName,
    );
  }
}

extension AppNotificationStyle on AppNotificationKind {
  IconData get icon => switch (this) {
    AppNotificationKind.vaccination => Icons.vaccines_outlined,
    AppNotificationKind.appointment => Icons.event_available_outlined,
    AppNotificationKind.awareness => Icons.campaign_outlined,
    AppNotificationKind.system => Icons.security_outlined,
  };

  Color get background => switch (this) {
    AppNotificationKind.vaccination => AppColors.primaryLight,
    AppNotificationKind.appointment => const Color(0xFFE8EEFF),
    AppNotificationKind.awareness => const Color(0xFFFFF1D6),
    AppNotificationKind.system => const Color(0xFFF0E9FA),
  };

  Color get foreground => switch (this) {
    AppNotificationKind.vaccination => AppColors.primaryDark,
    AppNotificationKind.appointment => const Color(0xFF4867B3),
    AppNotificationKind.awareness => const Color(0xFFB86A00),
    AppNotificationKind.system => const Color(0xFF72519A),
  };
}
