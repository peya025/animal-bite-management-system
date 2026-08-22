import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

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
        const Text(
          'QUICK ACTIONS',
          style: TextStyle(
            color: Color(0xFF9CA3AF),
            fontSize: 12,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _QuickActionItem(
              icon: Icons.calendar_month_rounded,
              label: 'Book now',
              isPrimary: true,
              onTap: onBook,
            ),
            _QuickActionItem(
              icon: Icons.badge_outlined,
              label: 'Profiles',
              isPrimary: false,
              onTap: onProfiles,
            ),
            _QuickActionItem(
              icon: Icons.qr_code_2_rounded,
              label: 'Patient',
              isPrimary: false,
              onTap: onPatientCard,
            ),
            _QuickActionItem(
              icon: Icons.history_rounded,
              label: 'Records',
              isPrimary: false,
              onTap: onHistory,
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickActionItem extends StatelessWidget {
  const _QuickActionItem({
    required this.icon,
    required this.label,
    required this.isPrimary,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isPrimary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Column(
        children: [
          // Icon box 54x54, 14px radius
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: isPrimary ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: isPrimary
                  ? null
                  : Border.all(color: Colors.grey.shade200, width: 0.5),
            ),
            child: Icon(
              icon,
              size: 24,
              color: isPrimary ? Colors.white : const Color(0xFF374151),
            ),
          ),
          const SizedBox(height: 6),
          // Label 10px 500 weight
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: isPrimary ? AppColors.primary : const Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }
}
