import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/appointment_summary.dart';
import '../common/status_chip.dart';

class AppointmentCard extends StatelessWidget {
  const AppointmentCard({
    super.key,
    required this.appointment,
    this.onCancel,
    this.isCancelling = false,
  });

  final AppointmentSummary appointment;
  final VoidCallback? onCancel;
  final bool isCancelling;

  @override
  Widget build(BuildContext context) {
    final isCancelled = appointment.status == 'cancelled';
    final isScheduled = appointment.status == 'scheduled';
    final leadingBackground = isCancelled
        ? AppColors.errorLight
        : appointment.type == 'vaccination'
        ? AppColors.primaryLight
        : const Color(0xFFE8EEFF);
    final leadingForeground = isCancelled
        ? AppColors.errorDark
        : appointment.type == 'vaccination'
        ? AppColors.primaryDark
        : const Color(0xFF4867B3);

    return Material(
      color: isScheduled ? const Color(0xFFF0FAF7) : AppColors.white,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(
            color: isScheduled ? const Color(0xFFB8E4DB) : AppColors.border,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: leadingBackground,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    appointment.type == 'vaccination'
                        ? Icons.vaccines_outlined
                        : Icons.medical_information_outlined,
                    color: leadingForeground,
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
                              appointment.typeLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.gray900,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          StatusChip(status: appointment.status),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'Appointment for ${appointment.patientName}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.gray500,
                          fontSize: 11,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Row(
                        children: [
                          const Icon(
                            Icons.calendar_today_outlined,
                            color: AppColors.gray500,
                            size: 13,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            appointment.formattedDate,
                            style: const TextStyle(
                              color: AppColors.gray500,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (appointment.cancellationReason case final reason?) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  reason,
                  style: const TextStyle(
                    color: AppColors.errorDark,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
            if (appointment.canCancel && onCancel != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: isCancelling ? null : onCancel,
                  icon: isCancelling
                      ? const SizedBox.square(
                          dimension: 17,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.event_busy_outlined, size: 18),
                  label: Text(
                    isCancelling ? 'CANCELLING...' : 'CANCEL APPOINTMENT',
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.errorDark,
                    minimumSize: const Size.fromHeight(44),
                    side: const BorderSide(color: Color(0xFFF1B5B5)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
