import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

enum NotificationFilter { all, unread }

class NotificationFilterControl extends StatelessWidget {
  const NotificationFilterControl({
    super.key,
    required this.selected,
    required this.unreadCount,
    required this.onSelected,
  });

  final NotificationFilter selected;
  final int unreadCount;
  final ValueChanged<NotificationFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<NotificationFilter>(
      segments: [
        const ButtonSegment(
          value: NotificationFilter.all,
          label: Text('All'),
          icon: Icon(Icons.notifications_none_rounded, size: 18),
        ),
        ButtonSegment(
          value: NotificationFilter.unread,
          label: Text('Unread ($unreadCount)'),
          icon: const Icon(Icons.mark_email_unread_outlined, size: 18),
        ),
      ],
      selected: {selected},
      showSelectedIcon: false,
      onSelectionChanged: (selection) => onSelected(selection.first),
      style: ButtonStyle(
        visualDensity: VisualDensity.compact,
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.primaryDark
              : AppColors.gray500,
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
