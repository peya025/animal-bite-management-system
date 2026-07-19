import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../common/app_page_header.dart';

class BookingHeader extends StatelessWidget {
  const BookingHeader({super.key, required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppPageHeader(
          title: 'Book appointment',
          subtitle: 'Select a patient, service, and date.',
          onBack: onBack,
          centered: true,
        ),
        const SizedBox(height: 18),
        const Row(
          children: [
            Expanded(
              child: _BookingStep(number: '1', label: 'Booking', active: true),
            ),
            SizedBox(width: 8),
            Expanded(
              child: _BookingStep(number: '2', label: 'Details'),
            ),
            SizedBox(width: 8),
            Expanded(
              child: _BookingStep(number: '3', label: 'Confirm'),
            ),
          ],
        ),
      ],
    );
  }
}

class _BookingStep extends StatelessWidget {
  const _BookingStep({
    required this.number,
    required this.label,
    this.active = false,
  });

  final String number;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 4,
          decoration: BoxDecoration(
            color: active ? AppColors.primary : AppColors.border,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$number  $label',
          maxLines: 1,
          style: TextStyle(
            color: active ? AppColors.primaryDark : AppColors.gray500,
            fontSize: 9,
            fontWeight: active ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
