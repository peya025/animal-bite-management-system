import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class AppointmentFilterControl extends StatelessWidget {
  const AppointmentFilterControl({
    super.key,
    required this.scheduledOnly,
    required this.scheduledCount,
    required this.onChanged,
  });

  final bool scheduledOnly;
  final int scheduledCount;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<bool>(
      segments: [
        ButtonSegment(
          value: true,
          label: Text('Scheduled ($scheduledCount)'),
          icon: const Icon(Icons.event_available_outlined, size: 18),
        ),
        const ButtonSegment(
          value: false,
          label: Text('All'),
          icon: Icon(Icons.event_note_outlined, size: 18),
        ),
      ],
      selected: {scheduledOnly},
      showSelectedIcon: false,
      onSelectionChanged: (selection) => onChanged(selection.first),
      style: ButtonStyle(
        visualDensity: VisualDensity.compact,
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.primaryDark
              : AppColors.gray700,
        ),
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.primaryLight
              : AppColors.white,
        ),
      ),
    );
  }
}
