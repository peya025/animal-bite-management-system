import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class MenuSearchHeader extends StatelessWidget {
  const MenuSearchHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: SizedBox(
            height: 44,
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search',
                hintStyle: const TextStyle(color: AppColors.gray500),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                suffixIcon: IconButton(
                  tooltip: 'Search',
                  onPressed: () {},
                  icon: const Icon(Icons.search, color: AppColors.gray700),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          tooltip: 'Notifications',
          onPressed: () {},
          icon: const Icon(Icons.notifications, color: Colors.black),
        ),
      ],
    );
  }
}
