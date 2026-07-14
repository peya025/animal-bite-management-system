import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class MenuSearchHeader extends StatelessWidget {
  const MenuSearchHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
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
                    style: TextStyle(color: AppColors.gray500, fontSize: 12),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Animal Bite Center',
                    style: TextStyle(
                      color: AppColors.gray900,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            Badge(
              smallSize: 8,
              child: IconButton.filledTonal(
                tooltip: 'Notifications',
                onPressed: () {},
                icon: const Icon(Icons.notifications_none_rounded),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 48,
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search services or schedules',
              hintStyle: const TextStyle(
                color: AppColors.gray500,
                fontSize: 14,
              ),
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: IconButton(
                tooltip: 'Filters',
                onPressed: () {},
                icon: const Icon(Icons.tune_rounded, size: 20),
              ),
              filled: true,
              fillColor: AppColors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
        ),
      ],
    );
  }
}
