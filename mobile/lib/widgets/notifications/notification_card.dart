import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

enum DemoNotificationType { vaccination, appointment, awareness, system }

class DemoNotification {
  const DemoNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.time,
  });

  final int id;
  final DemoNotificationType type;
  final String title;
  final String message;
  final String time;
}

extension DemoNotificationStyle on DemoNotificationType {
  IconData get icon => switch (this) {
    DemoNotificationType.vaccination => Icons.vaccines_outlined,
    DemoNotificationType.appointment => Icons.event_available_outlined,
    DemoNotificationType.awareness => Icons.campaign_outlined,
    DemoNotificationType.system => Icons.security_outlined,
  };

  Color get background => switch (this) {
    DemoNotificationType.vaccination => AppColors.primaryLight,
    DemoNotificationType.appointment => const Color(0xFFE8EEFF),
    DemoNotificationType.awareness => const Color(0xFFFFF1D6),
    DemoNotificationType.system => const Color(0xFFF0E9FA),
  };

  Color get foreground => switch (this) {
    DemoNotificationType.vaccination => AppColors.primaryDark,
    DemoNotificationType.appointment => const Color(0xFF4867B3),
    DemoNotificationType.awareness => const Color(0xFFB86A00),
    DemoNotificationType.system => const Color(0xFF72519A),
  };
}

class NotificationCard extends StatelessWidget {
  const NotificationCard({
    super.key,
    required this.notification,
    required this.isRead,
    required this.onTap,
  });

  final DemoNotification notification;
  final bool isRead;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isRead ? AppColors.white : const Color(0xFFF0FAF7),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(
              color: isRead ? const Color(0xFFE5EAE8) : const Color(0xFFB8E4DB),
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: notification.type.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  notification.type.icon,
                  color: notification.type.foreground,
                  size: 21,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              color: AppColors.gray900,
                              fontSize: 13,
                              fontWeight: isRead
                                  ? FontWeight.w600
                                  : FontWeight.w800,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      notification.message,
                      style: const TextStyle(
                        color: AppColors.gray500,
                        fontSize: 11,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      notification.time,
                      style: const TextStyle(
                        color: AppColors.gray500,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
