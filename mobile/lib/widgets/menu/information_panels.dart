import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class InformationPanels extends StatelessWidget {
  const InformationPanels({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: _WorkingHoursPanel()),
        SizedBox(width: 16),
        Expanded(child: _AwarenessPanel()),
      ],
    );
  }
}

class _WorkingHoursPanel extends StatelessWidget {
  const _WorkingHoursPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 144,
      padding: const EdgeInsets.all(10),
      decoration: _panelDecoration(),
      child: const Column(
        children: [
          Text(
            'WORKING HOURS',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
          SizedBox(height: 7),
          Wrap(
            spacing: 7,
            runSpacing: 5,
            alignment: WrapAlignment.center,
            children: [
              _DayChip('Monday', Color(0xFFFFE7AA)),
              _DayChip('Tuesday', Color(0xFFE4F4A9)),
              _DayChip('Thursday', Color(0xFFBDE7F2)),
              _DayChip('Friday', Color(0xFFFFE7AA)),
            ],
          ),
          SizedBox(height: 8),
          Text('TIME', style: TextStyle(fontSize: 9)),
          SizedBox(height: 4),
          DecoratedBox(
            decoration: BoxDecoration(
              color: Color(0xFFBDEFF2),
              borderRadius: BorderRadius.all(Radius.circular(6)),
            ),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              child: Text('8:00 AM - 4:00 PM', style: TextStyle(fontSize: 11)),
            ),
          ),
        ],
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  const _DayChip(this.label, this.color);
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(label, style: const TextStyle(fontSize: 9)),
      ),
    );
  }
}

class _AwarenessPanel extends StatelessWidget {
  const _AwarenessPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 144,
      padding: const EdgeInsets.all(12),
      decoration: _panelDecoration(),
      child: const Column(
        children: [
          Text(
            'AWARENESS',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
          Spacer(),
          Icon(
            Icons.health_and_safety_outlined,
            color: AppColors.primary,
            size: 42,
          ),
          Spacer(),
        ],
      ),
    );
  }
}

BoxDecoration _panelDecoration() {
  return BoxDecoration(
    color: AppColors.white,
    border: Border.all(color: AppColors.primary),
    borderRadius: BorderRadius.circular(8),
    boxShadow: const [
      BoxShadow(color: Color(0x16000000), blurRadius: 4, offset: Offset(0, 2)),
    ],
  );
}
