import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../menu/section_header.dart';

class BookingDate {
  const BookingDate(this.day, this.date, this.fullLabel);
  final String day;
  final String date;
  final String fullLabel;
}

class DateSelector extends StatelessWidget {
  const DateSelector({
    super.key,
    required this.selectedIndex,
    required this.onSelected,
  });

  static const dates = [
    BookingDate('MON', '16', 'Monday, March 16'),
    BookingDate('TUE', '17', 'Tuesday, March 17'),
    BookingDate('WED', '18', 'Wednesday, March 18'),
    BookingDate('THU', '19', 'Thursday, March 19'),
    BookingDate('FRI', '20', 'Friday, March 20'),
  ];

  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MenuSectionHeader(title: 'Choose a date'),
        const SizedBox(height: 10),
        SizedBox(
          height: 78,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: dates.length,
            separatorBuilder: (_, _) => const SizedBox(width: 9),
            itemBuilder: (context, index) {
              final selected = selectedIndex == index;
              return InkWell(
                onTap: () => onSelected(index),
                borderRadius: BorderRadius.circular(8),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 62,
                  decoration: BoxDecoration(
                    color: selected ? AppColors.primary : AppColors.white,
                    border: Border.all(
                      color: selected
                          ? AppColors.primary
                          : const Color(0xFFE2E8E6),
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        dates[index].day,
                        style: TextStyle(
                          color: selected ? AppColors.white : AppColors.gray500,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        dates[index].date,
                        style: TextStyle(
                          color: selected ? AppColors.white : AppColors.gray900,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
