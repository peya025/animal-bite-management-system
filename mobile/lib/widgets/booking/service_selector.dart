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
        const MenuSectionHeader(title: 'Select a service'),
        const SizedBox(height: 10),
        Material(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(8),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (
                var index = 0;
                index < BookingService.values.length;
                index++
              ) ...[
                _ServiceTile(
                  service: BookingService.values[index],
                  selected: selected == BookingService.values[index],
                  onTap: () => onSelected(BookingService.values[index]),
                ),
                if (index != BookingService.values.length - 1)
                  const Divider(height: 1, indent: 70, color: AppColors.border),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({
    required this.service,
    required this.selected,
    required this.onTap,
  });

  final BookingService service;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        color: selected ? AppColors.primaryLight : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: selected ? AppColors.primary : AppColors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                service.icon,
                color: selected ? AppColors.white : AppColors.primaryDark,
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    service.label,
                    style: const TextStyle(
                      color: AppColors.gray900,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    service.description,
                    style: const TextStyle(
                      color: AppColors.gray500,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Icon(
              selected
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              color: selected ? AppColors.primary : AppColors.gray500,
            ),
          ],
        ),
      ),
    );
  }
}
