import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (foreground, background) = switch (status.toLowerCase()) {
      'scheduled' => (AppColors.primaryDark, AppColors.primaryLight),
      'completed' => (AppColors.success, const Color(0xFFE8F7ED)),
      'verified' => (AppColors.success, const Color(0xFFE8F7ED)),
      'pending' => (const Color(0xFFA85A00), const Color(0xFFFFE4A8)),
      'cancelled' => (AppColors.errorDark, AppColors.errorLight),
      'follow-up' ||
      'follow_up' => (const Color(0xFFA85A00), const Color(0xFFFFF1D6)),
      _ => (AppColors.gray700, AppColors.gray100),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        maxLines: 1,
        style: TextStyle(
          color: foreground,
          fontSize: 9,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
