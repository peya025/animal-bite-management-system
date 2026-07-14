import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import 'menu_surface.dart';
import 'section_header.dart';

class InformationPanels extends StatelessWidget {
  const InformationPanels({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MenuSectionHeader(title: 'Clinic information'),
        SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _WorkingHoursPanel()),
            SizedBox(width: 10),
            Expanded(child: _AwarenessPanel()),
          ],
        ),
      ],
    );
  }
}

class _WorkingHoursPanel extends StatelessWidget {
  const _WorkingHoursPanel();

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      height: 156,
      padding: const EdgeInsets.all(13),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PanelIcon(
            icon: Icons.schedule_rounded,
            background: AppColors.primaryLight,
            foreground: AppColors.primaryDark,
          ),
          const Spacer(),
          const Text(
            'Working hours',
            style: TextStyle(
              color: AppColors.gray900,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Mon - Fri',
            style: TextStyle(color: AppColors.gray500, fontSize: 11),
          ),
          const SizedBox(height: 3),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              '8:00 AM - 4:00 PM',
              style: TextStyle(
                color: AppColors.primaryDark,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AwarenessPanel extends StatelessWidget {
  const _AwarenessPanel();

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      height: 156,
      padding: const EdgeInsets.all(13),
      onTap: () {},
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PanelIcon(
            icon: Icons.campaign_outlined,
            background: Color(0xFFFFF1D6),
            foreground: Color(0xFFB86A00),
          ),
          Spacer(),
          Text(
            'Awareness hub',
            style: TextStyle(
              color: AppColors.gray900,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Prevention tips and bite-care resources',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: AppColors.gray500,
              fontSize: 11,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}

class _PanelIcon extends StatelessWidget {
  const _PanelIcon({
    required this.icon,
    required this.background,
    required this.foreground,
  });

  final IconData icon;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: foreground, size: 21),
    );
  }
}
