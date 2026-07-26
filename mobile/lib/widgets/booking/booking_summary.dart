import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/booking_draft.dart';
import '../buttons/primary_action_button.dart';
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Minimalist summary with hairline dividers
        Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border.all(
              color: AppColors.divider,
              width: 0.5,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'BOOKING SUMMARY',
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              const Divider(height: 0.5, thickness: 0.5),
              if (patientName case final name?) ...[
                _SummaryRow(
                  icon: Icons.person_outline_rounded,
                  label: 'Patient',
                  value: name,
                ),
                const Divider(height: 0.5, thickness: 0.5),
              ],
              _SummaryRow(
                icon: service.icon,
                label: 'Service',
                value: service.label,
              ),
              const Divider(height: 0.5, thickness: 0.5),
              _SummaryRow(
                icon: Icons.event_outlined,
                label: 'Date',
                value: date,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        PrimaryActionButton(
          label: 'Book appointment',
          isLoading: isLoading,
          onPressed: onConfirm,
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(
            icon,
            color: AppColors.textSecondary,
            size: 18,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
