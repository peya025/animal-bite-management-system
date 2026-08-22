import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class GuidelinesSection extends StatelessWidget {
  const GuidelinesSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'BITE CARE GUIDE',
          style: TextStyle(
            color: Color(0xFF9CA3AF),
            fontSize: 12,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 10),
        const Row(
          children: [
            Expanded(
              child: _GuideCard(
                cardBg: AppColors.primary,
                iconBg: Color(0x33FFFFFF), // semi-transparent white
                iconColor: Colors.white,
                icon: Icons.water_drop_outlined,
                title: 'Wash',
                description: '15 mins under running water',
                textColor: Colors.white,
                mutedTextColor: Color(0xCCFFFFFF),
                hasBorder: false,
              ),
            ),
            SizedBox(width: 8),
            Expanded(
              child: _GuideCard(
                cardBg: Colors.white,
                iconBg: Color(0xFFE1F5EE),
                iconColor: AppColors.primary,
                icon: Icons.medical_services_outlined,
                title: 'Consult',
                description: 'Visit clinic immediately',
                textColor: Color(0xFF111827),
                mutedTextColor: Color(0xFF6B7280),
                hasBorder: true,
              ),
            ),
            SizedBox(width: 8),
            Expanded(
              child: _GuideCard(
                cardBg: Colors.white,
                iconBg: Color(0xFFEEF2FF),
                iconColor: Color(0xFF4F46E5),
                icon: Icons.vaccines_outlined,
                title: 'Vaccinate',
                description: 'Complete rabies vaccine series',
                textColor: Color(0xFF111827),
                mutedTextColor: Color(0xFF6B7280),
                hasBorder: true,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _GuideCard extends StatelessWidget {
  const _GuideCard({
    required this.cardBg,
    required this.iconBg,
    required this.iconColor,
    required this.icon,
    required this.title,
    required this.description,
    required this.textColor,
    required this.mutedTextColor,
    required this.hasBorder,
  });

  final Color cardBg;
  final Color iconBg;
  final Color iconColor;
  final IconData icon;
  final String title;
  final String description;
  final Color textColor;
  final Color mutedTextColor;
  final bool hasBorder;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 110),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: hasBorder
            ? Border.all(color: Colors.grey.shade200, width: 0.5)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon box 32x32, 10px radius
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: TextStyle(
              color: textColor,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            description,
            style: TextStyle(
              color: mutedTextColor,
              fontSize: 10,
              fontWeight: FontWeight.w400,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}
