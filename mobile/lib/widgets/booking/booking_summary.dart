import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/booking_draft.dart';
import '../buttons/primary_action_button.dart';
import '../menu/menu_surface.dart';
import 'service_selector.dart';

class BookingSummary extends StatelessWidget {
  const BookingSummary({
    super.key,
    required this.service,
    required this.date,
    required this.onConfirm,
    this.patientName,
    this.isLoading = false,
  });

  final BookingService service;
  final String date;
  final VoidCallback onConfirm;
  final String? patientName;
  final bool isLoading;

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
          if (patientName case final name?) ...[
            _SummaryRow(icon: Icons.person_outline_rounded, label: name),
            const SizedBox(height: 10),
          ],
          _SummaryRow(icon: service.icon, label: service.label),
          const SizedBox(height: 10),
          _SummaryRow(icon: Icons.event_outlined, label: date),
          const SizedBox(height: 18),
          PrimaryActionButton(
            label: 'BOOK APPOINTMENT',
            isLoading: isLoading,
            onPressed: onConfirm,
          ),
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
