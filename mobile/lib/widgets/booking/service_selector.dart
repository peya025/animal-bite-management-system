import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/booking_draft.dart';
import '../menu/section_header.dart';

extension BookingServiceDetails on BookingService {
  String get description => switch (this) {
    BookingService.consultation => 'Assessment for a new bite or exposure',
    BookingService.vaccination => 'Schedule an anti-rabies vaccination',
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
        const MenuSectionHeader(title: 'Service type'),
        const SizedBox(height: 12),
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
            children: [
              for (var index = 0; index < BookingService.values.length; index++) ...[
                _ServiceRow(
                  service: BookingService.values[index],
                  selected: selected == BookingService.values[index],
                  onTap: () => onSelected(BookingService.values[index]),
                ),
                if (index != BookingService.values.length - 1)
                  const Divider(height: 0.5, thickness: 0.5),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ServiceRow extends StatelessWidget {
  const _ServiceRow({
    required this.service,
    required this.selected,
    required this.onTap,
  });

  final BookingService service;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: [
              Icon(
                service.icon,
                color: selected ? AppColors.primary : AppColors.textSecondary,
                size: 20,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.label,
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      service.description,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Selection indicator - simple checkmark circle
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? AppColors.primary : Colors.transparent,
                  border: Border.all(
                    color: selected ? AppColors.primary : AppColors.divider,
                    width: selected ? 0 : 1.5,
                  ),
                ),
                child: selected
                    ? const Icon(
                        Icons.check,
                        color: AppColors.white,
                        size: 14,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
