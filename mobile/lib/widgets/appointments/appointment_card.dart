import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/appointment_summary.dart';
import '../menu/menu_surface.dart';

class AppointmentCard extends StatelessWidget {
  const AppointmentCard({super.key, required this.appointment, this.onCancel});

  final AppointmentSummary appointment;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final isCancelled = appointment.status == 'cancelled';
    return MenuSurface(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isCancelled
                  ? AppColors.errorLight
                  : AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              appointment.type == 'vaccination'
                  ? Icons.vaccines_outlined
                  : Icons.medical_information_outlined,
              color: isCancelled ? AppColors.errorDark : AppColors.primaryDark,
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
                        appointment.typeLabel,
                        style: const TextStyle(
                          color: AppColors.gray900,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    _StatusBadge(status: appointment.status),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  appointment.patientName,
                  style: const TextStyle(
                    color: AppColors.gray700,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  appointment.formattedDate,
                  style: const TextStyle(
                    color: AppColors.gray500,
                    fontSize: 11,
                  ),
                ),
                if (appointment.cancellationReason case final reason?) ...[
                  const SizedBox(height: 5),
                  Text(
                    reason,
                    style: const TextStyle(
                      color: AppColors.errorDark,
                      fontSize: 11,
                    ),
                  ),
                ],
                if (appointment.canCancel && onCancel != null) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: onCancel,
                    icon: const Icon(Icons.event_busy_outlined, size: 18),
                    label: const Text('CANCEL APPOINTMENT'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.errorDark,
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'scheduled' => AppColors.primaryDark,
      'cancelled' => AppColors.errorDark,
      'completed' => const Color(0xFF287A43),
      _ => AppColors.gray500,
    };
    final background = switch (status) {
      'scheduled' => AppColors.primaryLight,
      'cancelled' => AppColors.errorLight,
      'completed' => const Color(0xFFE8F7ED),
      _ => const Color(0xFFF0F2F4),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
