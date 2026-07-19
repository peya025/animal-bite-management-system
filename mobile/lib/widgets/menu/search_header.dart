import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class MenuSearchHeader extends StatelessWidget {
  const MenuSearchHeader({
    super.key,
    required this.onSearchPressed,
    required this.onNotificationsPressed,
  });

  final VoidCallback onSearchPressed;
  final VoidCallback onNotificationsPressed;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.health_and_safety_outlined,
            color: AppColors.primaryDark,
          ),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Good morning',
                style: TextStyle(color: AppColors.gray500, fontSize: 11),
              ),
              SizedBox(height: 2),
              Text(
                'Animal Bite Center',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: AppColors.gray900,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        IconButton.filledTonal(
          tooltip: 'Search',
          onPressed: onSearchPressed,
          style: IconButton.styleFrom(
            backgroundColor: AppColors.surfaceMuted,
            foregroundColor: AppColors.gray700,
          ),
          icon: const Icon(Icons.search_rounded),
        ),
        const SizedBox(width: 6),
        IconButton.filledTonal(
          tooltip: 'Notifications',
          onPressed: onNotificationsPressed,
          style: IconButton.styleFrom(
            backgroundColor: AppColors.surfaceMuted,
            foregroundColor: AppColors.gray700,
          ),
          icon: const Icon(Icons.notifications_none_rounded),
        ),
      ],
    );
  }
}
