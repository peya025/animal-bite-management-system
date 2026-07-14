import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import 'menu_surface.dart';
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
                color: Color(0xFFE0F4F1),
                iconColor: AppColors.primaryDark,
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _GuidelineTile(
                icon: Icons.local_hospital_outlined,
                label: 'Consult',
                detail: 'Seek care',
                color: Color(0xFFFFF1D6),
                iconColor: Color(0xFFB86A00),
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _GuidelineTile(
                icon: Icons.vaccines_outlined,
                label: 'Vaccinate',
                detail: 'Stay protected',
                color: Color(0xFFE8EEFF),
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
    required this.color,
    required this.iconColor,
  });

  final IconData icon;
  final String label;
  final String detail;
  final Color color;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      height: 116,
      padding: const EdgeInsets.all(12),
      onTap: () {},
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 21),
          ),
          const Spacer(),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.gray900,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            detail,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.gray500, fontSize: 10),
          ),
        ],
      ),
    );
  }
}
