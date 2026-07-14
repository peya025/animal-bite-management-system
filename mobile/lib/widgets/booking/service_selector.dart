import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../menu/menu_surface.dart';
import '../menu/section_header.dart';

enum BookingService { consultation, vaccination, followUp }

extension BookingServiceDetails on BookingService {
  String get title => switch (this) {
    BookingService.consultation => 'Bite consultation',
    BookingService.vaccination => 'Vaccination',
    BookingService.followUp => 'Follow-up visit',
  };

  String get duration => switch (this) {
    BookingService.consultation => '30 min',
    BookingService.vaccination => '20 min',
    BookingService.followUp => '15 min',
  };

  IconData get icon => switch (this) {
    BookingService.consultation => Icons.medical_information_outlined,
    BookingService.vaccination => Icons.vaccines_outlined,
    BookingService.followUp => Icons.monitor_heart_outlined,
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
                      service.title,
                      style: const TextStyle(
                        color: AppColors.gray900,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      service.duration,
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
