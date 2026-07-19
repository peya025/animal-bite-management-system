import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import 'section_header.dart';

class GuidelinesSection extends StatelessWidget {
  const GuidelinesSection({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MenuSectionHeader(title: 'Bite care guide'),
        SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _GuidelineTile(
                icon: Icons.water_drop_outlined,
                label: 'Wash',
                detail: 'Clean wound',
                iconColor: AppColors.white,
                primary: true,
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _GuidelineTile(
                icon: Icons.local_hospital_outlined,
                label: 'Consult',
                detail: 'Seek care',
                iconColor: Color(0xFFB86A00),
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _GuidelineTile(
                icon: Icons.vaccines_outlined,
                label: 'Vaccinate',
                detail: 'Stay protected',
                iconColor: Color(0xFF4867B3),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _GuidelineTile extends StatelessWidget {
  const _GuidelineTile({
    required this.icon,
    required this.label,
    required this.detail,
    required this.iconColor,
    this.primary = false,
  });

  final IconData icon;
  final String label;
  final String detail;
  final Color iconColor;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 116,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: primary ? AppColors.primary : AppColors.white,
        border: primary ? null : Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 22),
          const Spacer(),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: primary ? AppColors.white : AppColors.gray900,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            detail,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: primary
                  ? AppColors.white.withValues(alpha: 0.82)
                  : AppColors.gray500,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
