import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../menu/menu_surface.dart';

class ProfileCard extends StatelessWidget {
  const ProfileCard({super.key, required this.onEdit});

  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.person_outline_rounded,
              color: AppColors.primaryDark,
              size: 30,
            ),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Juan Dela Cruz',
                  style: TextStyle(
                    color: AppColors.gray900,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'juan@example.com',
                  style: TextStyle(color: AppColors.gray500, fontSize: 12),
                ),
                SizedBox(height: 3),
                Text(
                  'Patient ID: P-2026-0042',
                  style: TextStyle(color: AppColors.gray500, fontSize: 11),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Edit profile',
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined),
          ),
        ],
      ),
    );
  }
}
