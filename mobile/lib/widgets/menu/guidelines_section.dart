import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class GuidelinesSection extends StatelessWidget {
  const GuidelinesSection({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionLabel('CAT OR DOG BITE GUIDELINES'),
        SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _GuidelineTile(
                icon: Icons.clean_hands_outlined,
                label: 'Wash wound',
                color: Color(0xFFE6F6F1),
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _GuidelineTile(
                icon: Icons.medical_services_outlined,
                label: 'Seek care',
                color: Color(0xFFFFF2D8),
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _GuidelineTile(
                icon: Icons.vaccines_outlined,
                label: 'Get vaccine',
                color: Color(0xFFE8F0FA),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        color: AppColors.gray700,
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _GuidelineTile extends StatelessWidget {
  const _GuidelineTile({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 92,
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: const Color(0xFFD8DEDC)),
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x16000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            backgroundColor: color,
            child: Icon(icon, color: AppColors.primaryDark),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }
}
