import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../buttons/primary_action_button.dart';
import '../menu/menu_surface.dart';
import 'service_selector.dart';

class BookingSummary extends StatelessWidget {
  const BookingSummary({
    super.key,
    required this.service,
    required this.date,
    required this.time,
    required this.onConfirm,
  });

  final BookingService service;
  final String date;
  final String time;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Appointment summary',
            style: TextStyle(
              color: AppColors.gray900,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 14),
          _SummaryRow(icon: service.icon, label: service.title),
          const SizedBox(height: 10),
          _SummaryRow(icon: Icons.event_outlined, label: date),
          const SizedBox(height: 10),
          _SummaryRow(icon: Icons.schedule_outlined, label: time),
          const SizedBox(height: 18),
          PrimaryActionButton(label: 'CONFIRM BOOKING', onPressed: onConfirm),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primaryDark, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: AppColors.gray700, fontSize: 13),
          ),
        ),
      ],
    );
  }
}
