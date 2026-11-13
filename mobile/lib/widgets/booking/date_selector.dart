import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../app/app_theme.dart';

class DateSelector extends StatefulWidget {
  const DateSelector({
    super.key,
    required this.selectedDate,
    required this.onSelected,
    this.openDaysOfWeek,
    this.exceptions,
  });

  final DateTime selectedDate;
  final ValueChanged<DateTime> onSelected;
  final List<int>? openDaysOfWeek; // 0=Sun..6=Sat
  final Map<String, dynamic>? exceptions;

  static DateTime get firstDate => DateUtils.dateOnly(DateTime.now());
  static DateTime get lastDate => DateUtils.dateOnly(DateTime.now()).add(const Duration(days: 365));

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
  State<DateSelector> createState() => _DateSelectorState();
}

class _DateSelectorState extends State<DateSelector> {
  late DateTime _focusedDay;

  @override
  void initState() {
    super.initState();
    _focusedDay = widget.selectedDate;
  }

  @override
  void didUpdateWidget(covariant DateSelector oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!isSameDay(oldWidget.selectedDate, widget.selectedDate)) {
      _focusedDay = widget.selectedDate;
    }
  }

  static const _months = [
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

  bool _isDayEnabled(DateTime day, DateTime today) {
    final cleanDay = DateTime(day.year, day.month, day.day);
    if (cleanDay.isBefore(today)) return false;

    final dateKey =
        "${cleanDay.year.toString().padLeft(4, '0')}-${cleanDay.month.toString().padLeft(2, '0')}-${cleanDay.day.toString().padLeft(2, '0')}";
    if (widget.exceptions != null && widget.exceptions!.containsKey(dateKey)) {
      final exc = widget.exceptions![dateKey];
      if (exc is Map && exc.containsKey('is_open')) {
        return exc['is_open'] == true;
      }
      if (exc is bool) return exc;
    }

    if (widget.openDaysOfWeek != null && widget.openDaysOfWeek!.isNotEmpty) {
      final dow = day.weekday == 7 ? 0 : day.weekday;
      return widget.openDaysOfWeek!.contains(dow);
    }

    return true;
  }

  bool _isHoliday(DateTime day) {
    final cleanDay = DateTime(day.year, day.month, day.day);
    final dateKey =
        "${cleanDay.year.toString().padLeft(4, '0')}-${cleanDay.month.toString().padLeft(2, '0')}-${cleanDay.day.toString().padLeft(2, '0')}";
    if (widget.exceptions != null && widget.exceptions!.containsKey(dateKey)) {
      final exc = widget.exceptions![dateKey];
      if (exc is Map && exc.containsKey('is_open')) {
        return exc['is_open'] == false;
      }
      if (exc is bool) return exc == false;
    }
    return false;
  }

  String? _getHolidayReason(DateTime day) {
    final cleanDay = DateTime(day.year, day.month, day.day);
    final dateKey =
        "${cleanDay.year.toString().padLeft(4, '0')}-${cleanDay.month.toString().padLeft(2, '0')}-${cleanDay.day.toString().padLeft(2, '0')}";
    if (widget.exceptions != null && widget.exceptions!.containsKey(dateKey)) {
      final exc = widget.exceptions![dateKey];
      if (exc is Map && exc['reason'] != null) {
        final reason = exc['reason'].toString().trim();
        if (reason.isNotEmpty) return reason;
      }
    }
    return null;
  }

  Widget _buildHolidayDay(DateTime day) {
    final reason = _getHolidayReason(day);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.event_busy, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    reason != null && reason.isNotEmpty
                        ? 'Clinic closed: $reason'
                        : 'Clinic closed (Holiday / Special Closure)',
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFFDC2626),
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.all(3),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: const Color(0xFFFEE2E2),
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFFCA5A5), width: 1),
        ),
        child: Text(
          '${day.day}',
          style: const TextStyle(
            color: Color(0xFFDC2626),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'CHOOSE A DATE',
          style: TextStyle(
            color: Color(0xFF6B7280),
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200, width: 0.5),
          ),
          child: Column(
            children: [
              // Custom Header Row with 28x28 chevron buttons and centered Month/Year
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _NavButton(
                    icon: Icons.chevron_left_rounded,
                    onTap: () {
                      setState(() {
                        _focusedDay = DateTime(
                          _focusedDay.year,
                          _focusedDay.month - 1,
                        );
                      });
                    },
                  ),
                  Text(
                    '${_months[_focusedDay.month - 1]} ${_focusedDay.year}',
                    style: const TextStyle(
                      color: Color(0xFF111827),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  _NavButton(
                    icon: Icons.chevron_right_rounded,
                    onTap: () {
                      setState(() {
                        _focusedDay = DateTime(
                          _focusedDay.year,
                          _focusedDay.month + 1,
                        );
                      });
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Table Calendar Grid
              TableCalendar(
                firstDay: DateTime(2025, 1, 1),
                lastDay: DateTime(2030, 12, 31),
                focusedDay: _focusedDay,
                calendarFormat: CalendarFormat.month,
                headerVisible: false, // We use custom header above
                startingDayOfWeek: StartingDayOfWeek.sunday,
                availableCalendarFormats: const {
                  CalendarFormat.month: 'Month',
                },
                selectedDayPredicate: (day) =>
                    isSameDay(day, widget.selectedDate),
                enabledDayPredicate: (day) => _isDayEnabled(day, today),
                onDaySelected: (selectedDay, focusedDay) {
                  if (!_isDayEnabled(selectedDay, today)) return;
                  setState(() => _focusedDay = focusedDay);
                  widget.onSelected(selectedDay);
                },
                daysOfWeekStyle: const DaysOfWeekStyle(
                  weekdayStyle: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                  weekendStyle: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                  dowTextFormatter: _formatDow,
                ),
                calendarStyle: CalendarStyle(
                  outsideDaysVisible: false,
                  cellMargin: const EdgeInsets.all(3),
                  selectedDecoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  selectedTextStyle: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  todayDecoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  todayTextStyle: const TextStyle(
                    color: AppColors.primaryDark,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  disabledTextStyle: const TextStyle(
                    color: Color(0xFFD1D5DB),
                    fontSize: 12,
                  ),
                  defaultTextStyle: const TextStyle(
                    color: Color(0xFF111827),
                    fontSize: 12,
                  ),
                  weekendTextStyle: const TextStyle(
                    color: Color(0xFF111827),
                    fontSize: 12,
                  ),
                ),
                calendarBuilders: CalendarBuilders(
                  disabledBuilder: (context, day, focusedDay) {
                    if (_isHoliday(day)) {
                      return _buildHolidayDay(day);
                    }
                    return null;
                  },
                  todayBuilder: (context, day, focusedDay) {
                    if (_isHoliday(day)) {
                      return _buildHolidayDay(day);
                    }
                    return null;
                  },
                  defaultBuilder: (context, day, focusedDay) {
                    if (_isHoliday(day)) {
                      return _buildHolidayDay(day);
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(height: 12),
              // Holiday Legend
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFDC2626), width: 1.5),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Holiday / Clinic Closure (Unavailable)',
                    style: TextStyle(
                      color: Color(0xFFDC2626),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  static String _formatDow(DateTime date, dynamic locale) {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return days[date.weekday % 7];
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade200, width: 0.5),
        ),
        child: Icon(icon, size: 18, color: const Color(0xFF6B7280)),
      ),
    );
  }
}
