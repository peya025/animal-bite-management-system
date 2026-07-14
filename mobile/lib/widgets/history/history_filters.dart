import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

enum HistoryFilter { all, appointments, vaccinations }

extension HistoryFilterLabel on HistoryFilter {
  String get label => switch (this) {
    HistoryFilter.all => 'All',
    HistoryFilter.appointments => 'Appointments',
    HistoryFilter.vaccinations => 'Vaccinations',
  };
}

class HistoryFilters extends StatelessWidget {
  const HistoryFilters({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final HistoryFilter selected;
  final ValueChanged<HistoryFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final filter in HistoryFilter.values) ...[
            ChoiceChip(
              label: Text(filter.label),
              selected: filter == selected,
              showCheckmark: false,
              onSelected: (_) => onSelected(filter),
              selectedColor: AppColors.primaryLight,
              backgroundColor: AppColors.white,
              side: BorderSide(
                color: filter == selected
                    ? AppColors.primary
                    : const Color(0xFFE2E8E6),
              ),
              labelStyle: TextStyle(
                color: filter == selected
                    ? AppColors.primaryDark
                    : AppColors.gray700,
                fontWeight: filter == selected
                    ? FontWeight.w700
                    : FontWeight.w500,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            if (filter != HistoryFilter.values.last) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}
