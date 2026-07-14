import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class ScheduleSection extends StatelessWidget {
  const ScheduleSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'UPCOMING SCHEDULES',
          style: TextStyle(
            color: AppColors.gray700,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          height: 82,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border.all(color: const Color(0xFFE1E5E4)),
            borderRadius: BorderRadius.circular(8),
            boxShadow: const [
              BoxShadow(
                color: Color(0x16000000),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: const Align(
            alignment: Alignment.topLeft,
            child: Text(
              'No schedule at this moment.',
              style: TextStyle(color: AppColors.gray700),
            ),
          ),
        ),
      ],
    );
  }
}
