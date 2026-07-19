import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import 'section_header.dart';

class QuickActionsSection extends StatelessWidget {
  const QuickActionsSection({
    super.key,
    required this.onBook,
    required this.onProfiles,
    required this.onPatientCard,
    required this.onHistory,
  });

  final VoidCallback onBook;
  final VoidCallback onProfiles;
  final VoidCallback onPatientCard;
  final VoidCallback onHistory;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MenuSectionHeader(title: 'Quick actions'),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _QuickAction(
                icon: Icons.calendar_month_outlined,
                label: 'Book now',
                primary: true,
                onTap: onBook,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _QuickAction(
                icon: Icons.group_outlined,
                label: 'Profiles',
                onTap: onProfiles,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _QuickAction(
                icon: Icons.badge_outlined,
                label: 'Patient',
                onTap: onPatientCard,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _QuickAction(
                icon: Icons.history_rounded,
                label: 'Records',
                onTap: onHistory,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: primary ? AppColors.primary : AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: primary
            ? BorderSide.none
            : const BorderSide(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        customBorder: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: SizedBox(
          height: 90,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  color: primary ? AppColors.white : AppColors.primary,
                  size: 22,
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: primary ? AppColors.white : AppColors.gray900,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
