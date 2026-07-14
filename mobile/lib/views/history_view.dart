import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/history/history_filters.dart';
import '../widgets/history/history_record_card.dart';
import '../widgets/history/history_summary.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/menu_surface.dart';
import '../widgets/menu/patient_action_button.dart';

class HistoryView extends StatefulWidget {
  const HistoryView({super.key});

  @override
  State<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends State<HistoryView> {
  HistoryFilter _filter = HistoryFilter.all;

  static const _records = [
    HistoryRecord(
      type: HistoryFilter.appointments,
      title: 'Bite consultation',
      date: 'March 10, 2026 at 9:30 AM',
      reference: 'Case BC-2026-0018',
      status: 'COMPLETED',
      icon: Icons.medical_information_outlined,
    ),
    HistoryRecord(
      type: HistoryFilter.vaccinations,
      title: 'Anti-rabies vaccine - Day 3',
      date: 'March 13, 2026 at 10:00 AM',
      reference: 'Dose 2 of 4',
      status: 'COMPLETED',
      icon: Icons.vaccines_outlined,
    ),
    HistoryRecord(
      type: HistoryFilter.vaccinations,
      title: 'Anti-rabies vaccine - Day 7',
      date: 'March 17, 2026 at 10:00 AM',
      reference: 'Dose 3 of 4',
      status: 'SCHEDULED',
      icon: Icons.event_available_outlined,
    ),
  ];

  Iterable<HistoryRecord> get _visibleRecords {
    if (_filter == HistoryFilter.all) return _records;
    return _records.where((record) => record.type == _filter);
  }

  void _navigate(int index) {
    final route = switch (index) {
      0 => AppRoutes.menu,
      1 => AppRoutes.booking,
      2 => null,
      3 => AppRoutes.settings,
      _ => null,
    };
    if (route != null) Navigator.of(context).pushReplacementNamed(route);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F7),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
                  sliver: SliverList.list(
                    children: [
                      const AppPageHeader(
                        title: 'History',
                        subtitle: 'Appointments and vaccination activity.',
                      ),
                      const SizedBox(height: 22),
                      const HistorySummary(),
                      const SizedBox(height: 22),
                      HistoryFilters(
                        selected: _filter,
                        onSelected: (filter) =>
                            setState(() => _filter = filter),
                      ),
                      const SizedBox(height: 14),
                      if (_visibleRecords.isEmpty)
                        const MenuSurface(
                          padding: EdgeInsets.all(24),
                          child: Center(child: Text('No history found.')),
                        )
                      else
                        for (final record in _visibleRecords) ...[
                          HistoryRecordCard(record: record),
                          const SizedBox(height: 10),
                        ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: MenuNavigation(
        selectedIndex: 2,
        onSelected: _navigate,
      ),
      floatingActionButton: PatientActionButton(onPressed: () {}),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
