import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class QuickActionsSection extends StatelessWidget {
  const QuickActionsSection({
    super.key,
    required this.onCalendar,
    required this.onBook,
    required this.onPatientCard,
    required this.onProfiles,
    required this.onHistory,
  });

  final VoidCallback onCalendar;
  final VoidCallback onBook;
  final VoidCallback onPatientCard;
  final VoidCallback onProfiles;
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
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 10),

        // Horizontally Scrollable Action Items
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              _QuickActionItem(
                icon: Icons.calendar_month_rounded,
                label: 'Calendar',
                isPrimary: true,
                badgeText: 'New',
                onTap: onCalendar,
              ),
              const SizedBox(width: 12),
              _QuickActionItem(
                icon: Icons.add_circle_outline_rounded,
                label: 'Book now',
                isPrimary: false,
                onTap: onBook,
              ),
              const SizedBox(width: 12),
              _QuickActionItem(
                icon: Icons.qr_code_2_rounded,
                label: 'Digital card',
                isPrimary: false,
                onTap: onPatientCard,
              ),
              const SizedBox(width: 12),
              _QuickActionItem(
                icon: Icons.people_outline_rounded,
                label: 'Profiles',
                isPrimary: false,
                onTap: onProfiles,
              ),
              const SizedBox(width: 12),
              _QuickActionItem(
                icon: Icons.history_rounded,
                label: 'Records',
                isPrimary: false,
                onTap: onHistory,
              ),
            ],
          ),
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
    this.badgeText,
  });

  final IconData icon;
  final String label;
  final bool isPrimary;
  final VoidCallback onTap;
  final String? badgeText;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 72,
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon Container 56x56
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: isPrimary ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: isPrimary
                        ? null
                        : Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
                    boxShadow: [
                      BoxShadow(
                        color: isPrimary
                            ? const Color(0xFF1D9E75).withValues(alpha: 0.28)
                            : const Color(0x0A111827),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Icon(
                    icon,
                    size: 26,
                    color: isPrimary ? Colors.white : const Color(0xFF374151),
                  ),
                ),
                if (badgeText != null)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        badgeText!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 7),

            // Label
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isPrimary ? FontWeight.w700 : FontWeight.w500,
                color: isPrimary ? AppColors.primary : const Color(0xFF4B5563),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
