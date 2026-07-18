import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/booking_draft.dart';
import '../menu/menu_surface.dart';
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
        for (final service in BookingService.values) ...[
          _ServiceTile(
            service: service,
            selected: selected == service,
            onTap: () => onSelected(service),
          ),
          if (service != BookingService.values.last) const SizedBox(height: 10),
        ],
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
    return Stack(
      children: [
        MenuSurface(
          onTap: onTap,
          padding: const EdgeInsets.all(13),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : AppColors.primaryLight,
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
                        fontWeight: FontWeight.w700,
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
              Icon(
                selected
                    ? Icons.check_circle_rounded
                    : Icons.radio_button_unchecked_rounded,
                color: selected ? AppColors.primary : AppColors.gray500,
              ),
            ],
          ),
        ),
        if (selected)
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.primary, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
