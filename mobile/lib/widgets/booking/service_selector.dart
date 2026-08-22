import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/booking_draft.dart';

extension BookingServiceDetails on BookingService {
  String get description => switch (this) {
    BookingService.consultation => 'Assessment for a new bite or exposure',
    BookingService.vaccination => 'Schedule an anti-rabies vaccine dose',
  };

  IconData get icon => switch (this) {
    BookingService.consultation => Icons.medical_information_outlined,
    BookingService.vaccination => Icons.vaccines_outlined,
  };
}

class ServiceSelector extends StatelessWidget {
  const ServiceSelector({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final BookingService selected;
  final ValueChanged<BookingService> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'SERVICE TYPE',
          style: TextStyle(
            color: Color(0xFF6B7280),
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 8),
        for (final service in BookingService.values) ...[
          _ServiceCard(
            service: service,
            isSelected: selected == service,
            onTap: () => onSelected(service),
          ),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 4),
        // Teal notice box
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFE1F5EE),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.info_outline_rounded,
                size: 16,
                color: Color(0xFF085041),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  selected == BookingService.consultation
                      ? 'Consultation bookings require a bite incident intake form before submission.'
                      : 'Vaccination bookings can be submitted directly without filling out a bite incident intake form.',
                  style: const TextStyle(
                    color: Color(0xFF085041),
                    fontSize: 11,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.service,
    required this.isSelected,
    required this.onTap,
  });

  final BookingService service;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE1F5EE) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey.shade200,
            width: isSelected ? 1.5 : 0.5,
          ),
        ),
        child: Row(
          children: [
            // Left 36x36 icon container
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                service.icon,
                size: 20,
                color: isSelected ? AppColors.primary : const Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(width: 12),
            // Center info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    service.label,
                    style: const TextStyle(
                      color: Color(0xFF111827),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    service.description,
                    style: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            // Right radio button (20px)
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.primary : const Color(0xFFD1D5DB),
                  width: isSelected ? 2 : 1.5,
                ),
              ),
              child: isSelected
                  ? Center(
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                        ),
                      ),
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
