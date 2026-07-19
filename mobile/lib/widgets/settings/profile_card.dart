import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class ProfileCard extends StatelessWidget {
  const ProfileCard({
    super.key,
    required this.name,
    required this.email,
    required this.patientCount,
    required this.onEdit,
    this.phone,
  });

  final String name;
  final String email;
  final String? phone;
  final int patientCount;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: AppColors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.person_outline_rounded,
              color: AppColors.primaryDark,
              size: 30,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.gray900,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.gray500,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        phone?.isNotEmpty == true ? phone! : 'No phone number',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.gray500,
                          fontSize: 11,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$patientCount ${patientCount == 1 ? 'patient' : 'patients'}',
                        style: const TextStyle(
                          color: AppColors.primaryDark,
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            tooltip: 'Edit profile',
            onPressed: onEdit,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.white,
              foregroundColor: AppColors.primaryDark,
              minimumSize: const Size(40, 40),
            ),
            icon: const Icon(Icons.edit_outlined, size: 19),
          ),
        ],
      ),
    );
  }
}
