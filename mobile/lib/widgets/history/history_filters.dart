import 'package:flutter/material.dart';

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
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          for (final filter in HistoryFilter.values) ...[
            GestureDetector(
              onTap: () => onSelected(filter),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: filter == selected
                      ? const Color(0xFF1D9E75)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: filter == selected
                      ? null
                      : Border.all(
                          color: const Color(0xFFE5E7EB),
                          width: 0.5,
                        ),
                ),
                child: Text(
                  filter.label,
                  style: TextStyle(
                    color: filter == selected
                        ? Colors.white
                        : const Color(0xFF6B7280),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            if (filter != HistoryFilter.values.last) const SizedBox(width: 6),
          ],
        ],
      ),
    );
  }
}

