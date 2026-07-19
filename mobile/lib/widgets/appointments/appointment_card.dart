import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/appointment_summary.dart';
import '../common/status_chip.dart';
import '../menu/menu_surface.dart';

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
    return MenuSurface(
      padding: const EdgeInsets.all(14),
      color: AppColors.surfaceMuted,
      showBorder: false,
      showShadow: false,
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _DateTile(
                date: appointment.scheduledDate,
                cancelled: isCancelled,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          appointment.type == 'vaccination'
                              ? Icons.vaccines_outlined
                              : Icons.medical_information_outlined,
                          color: isCancelled
                              ? AppColors.errorDark
                              : AppColors.primaryDark,
                          size: 18,
                        ),
                        const SizedBox(width: 7),
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
                    const SizedBox(height: 8),
                    Text(
                      appointment.patientName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.gray700,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
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
    );
  }
}

class _DateTile extends StatelessWidget {
  const _DateTile({required this.date, required this.cancelled});

  final DateTime date;
  final bool cancelled;

  @override
  Widget build(BuildContext context) {
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    final localDate = date.toLocal();
    final foreground = cancelled ? AppColors.errorDark : AppColors.primaryDark;

    return Container(
      width: 52,
      height: 62,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            months[localDate.month - 1],
            style: TextStyle(
              color: foreground,
              fontSize: 9,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${localDate.day}',
            style: TextStyle(
              color: foreground,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
