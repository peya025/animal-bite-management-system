import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../menu/menu_surface.dart';
import '../menu/section_header.dart';

class DateSelector extends StatelessWidget {
  const DateSelector({
    super.key,
    required this.selectedDate,
    required this.onSelected,
  });

  static final firstDate = DateTime(2026, 7, 15);
  static final lastDate = DateTime(2027, 7, 15);

  final DateTime selectedDate;
  final ValueChanged<DateTime> onSelected;

  static String formatDate(DateTime date) {
    const weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MenuSectionHeader(title: 'Choose a date'),
        const SizedBox(height: 10),
        MenuSurface(
          padding: const EdgeInsets.fromLTRB(6, 8, 6, 12),
          child: Column(
            children: [
              Theme(
                data: Theme.of(context).copyWith(
                  colorScheme: Theme.of(context).colorScheme.copyWith(
                    primary: AppColors.primary,
                    onPrimary: AppColors.white,
                    surface: AppColors.white,
                  ),
                  datePickerTheme: const DatePickerThemeData(
                    headerForegroundColor: AppColors.gray900,
                    weekdayStyle: TextStyle(
                      color: AppColors.gray500,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                    dayStyle: TextStyle(color: AppColors.gray700, fontSize: 12),
                    todayBorder: BorderSide(color: AppColors.primary),
                  ),
                ),
                child: CalendarDatePicker(
                  key: ValueKey(selectedDate),
                  initialDate: selectedDate,
                  firstDate: firstDate,
                  lastDate: lastDate,
                  onDateChanged: onSelected,
                  selectableDayPredicate: (date) {
                    return date.weekday != DateTime.sunday;
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.event_available_outlined,
                        color: AppColors.primaryDark,
                        size: 20,
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          formatDate(selectedDate),
                          style: const TextStyle(
                            color: AppColors.primaryDark,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        const Row(
          children: [
            Icon(
              Icons.info_outline_rounded,
              color: AppColors.gray500,
              size: 16,
            ),
            SizedBox(width: 6),
            Expanded(
              child: Text(
                'Sundays are unavailable. Available times appear after choosing a date.',
                style: TextStyle(color: AppColors.gray500, fontSize: 10),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
