import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../menu/section_header.dart';

class TimeSlotSelector extends StatelessWidget {
  const TimeSlotSelector({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  static const slots = ['8:00 AM', '9:30 AM', '11:00 AM', '1:30 PM', '3:00 PM'];

  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MenuSectionHeader(title: 'Available time'),
        const SizedBox(height: 10),
        Wrap(
          spacing: 9,
          runSpacing: 9,
          children: [
            for (final slot in slots)
              ChoiceChip(
                label: Text(slot),
                selected: selected == slot,
                showCheckmark: false,
                onSelected: (_) => onSelected(slot),
                side: BorderSide(
                  color: selected == slot
                      ? AppColors.primary
                      : const Color(0xFFE2E8E6),
                ),
                backgroundColor: AppColors.white,
                selectedColor: AppColors.primaryLight,
                labelStyle: TextStyle(
                  color: selected == slot
                      ? AppColors.primaryDark
                      : AppColors.gray700,
                  fontSize: 12,
                  fontWeight: selected == slot
                      ? FontWeight.w700
                      : FontWeight.w500,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
