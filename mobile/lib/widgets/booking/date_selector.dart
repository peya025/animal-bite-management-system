import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../app/app_theme.dart';
import '../menu/menu_surface.dart';
import '../menu/section_header.dart';

enum CalendarBookingType { vaccination, followUp, consultation }

extension CalendarBookingStyle on CalendarBookingType {
  String get label => switch (this) {
    CalendarBookingType.vaccination => 'Vaccination',
    CalendarBookingType.followUp => 'Follow-up',
    CalendarBookingType.consultation => 'Consultation',
  };

  Color get color => switch (this) {
    CalendarBookingType.vaccination => const Color(0xFF35A66F),
    CalendarBookingType.followUp => const Color(0xFFE98A32),
    CalendarBookingType.consultation => const Color(0xFF5578C8),
  };
}

class DateSelector extends StatelessWidget {
  const DateSelector({
    super.key,
    required this.selectedDate,
    required this.onSelected,
  });

  static final firstDate = DateTime(2026, 7, 18);
  static final lastDate = DateTime(2027, 7, 18);

  static final demoBookings = <DateTime, List<CalendarBookingType>>{
    DateTime(2026, 7, 20): [CalendarBookingType.vaccination],
    DateTime(2026, 7, 23): [CalendarBookingType.followUp],
    DateTime(2026, 7, 25): [CalendarBookingType.consultation],
    DateTime(2026, 7, 27): [
      CalendarBookingType.vaccination,
      CalendarBookingType.followUp,
    ],
  };

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

  List<CalendarBookingType> _eventsForDay(DateTime day) {
    return demoBookings[DateTime(day.year, day.month, day.day)] ?? const [];
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MenuSectionHeader(title: 'Choose a booking date'),
        const SizedBox(height: 10),
        MenuSurface(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 14),
          showShadow: false,
          child: Column(
            children: [
              TableCalendar<CalendarBookingType>(
                firstDay: firstDate,
                lastDay: lastDate,
                focusedDay: selectedDate,
                calendarFormat: CalendarFormat.month,
                availableCalendarFormats: const {CalendarFormat.month: 'Month'},
                selectedDayPredicate: (day) => isSameDay(day, selectedDate),
                enabledDayPredicate: (day) {
                  return !day.isBefore(firstDate) &&
                      day.weekday != DateTime.sunday;
                },
                eventLoader: _eventsForDay,
                onDaySelected: (selectedDay, focusedDay) {
                  onSelected(selectedDay);
                },
                headerStyle: const HeaderStyle(
                  titleCentered: true,
                  formatButtonVisible: false,
                  leftChevronIcon: Icon(Icons.chevron_left_rounded),
                  rightChevronIcon: Icon(Icons.chevron_right_rounded),
                  titleTextStyle: TextStyle(
                    color: AppColors.gray900,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                daysOfWeekStyle: const DaysOfWeekStyle(
                  weekdayStyle: TextStyle(
                    color: AppColors.gray500,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                  weekendStyle: TextStyle(
                    color: AppColors.gray500,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                calendarStyle: const CalendarStyle(
                  outsideDaysVisible: false,
                  cellMargin: EdgeInsets.all(4),
                  selectedDecoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  todayDecoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  todayTextStyle: TextStyle(color: AppColors.primaryDark),
                  disabledTextStyle: TextStyle(color: Color(0xFFCCD3D1)),
                  defaultTextStyle: TextStyle(
                    color: AppColors.gray700,
                    fontSize: 12,
                  ),
                  weekendTextStyle: TextStyle(
                    color: AppColors.gray700,
                    fontSize: 12,
                  ),
                  markersMaxCount: 3,
                  markersAlignment: Alignment.bottomCenter,
                  markerSize: 5,
                  markerMargin: EdgeInsets.symmetric(horizontal: 1),
                ),
                calendarBuilders: CalendarBuilders(
                  markerBuilder: (context, day, events) {
                    if (events.isEmpty) return null;
                    return Positioned(
                      bottom: 4,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          for (final event in events.take(3))
                            Container(
                              width: 5,
                              height: 5,
                              margin: const EdgeInsets.symmetric(horizontal: 1),
                              decoration: BoxDecoration(
                                color: event.color,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const Divider(height: 20),
              const _CalendarLegend(),
              const SizedBox(height: 12),
              Container(
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
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
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
                'Colored dots are existing bookings. Follow-up dates are added automatically after treatment.',
                style: TextStyle(color: AppColors.gray500, fontSize: 10),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _CalendarLegend extends StatelessWidget {
  const _CalendarLegend();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: [
        for (final type in CalendarBookingType.values)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: type.color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 5),
              Text(
                type.label,
                style: const TextStyle(
                  color: AppColors.gray500,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
      ],
    );
  }
}
