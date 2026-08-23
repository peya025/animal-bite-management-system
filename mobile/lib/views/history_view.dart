import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../widgets/history/history_filters.dart';
import '../widgets/history/history_record_card.dart';
import '../widgets/history/history_summary.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

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
      dateTime: 'March 10, 2026 · 9:30 AM',
      caseNumber: 'BC-2026-0018',
      status: HistoryStatus.completed,
      icon: Icons.medical_information_outlined,
    ),
    HistoryRecord(
      type: HistoryFilter.vaccinations,
      title: 'Anti-rabies vaccine · Day 3',
      dateTime: 'March 13, 2026 · 10:00 AM',
      status: HistoryStatus.completed,
      icon: Icons.vaccines_outlined,
      completedDoses: 2,
      totalDoses: 4,
      doseLabel: '2 of 4 done',
    ),
    HistoryRecord(
      type: HistoryFilter.vaccinations,
      title: 'Anti-rabies vaccine · Day 7',
      dateTime: 'March 17, 2026 · 10:00 AM',
      status: HistoryStatus.scheduled,
      icon: Icons.calendar_today_outlined,
      completedDoses: 2,
      totalDoses: 4,
      doseLabel: '3 of 4 · upcoming',
    ),
  ];

  List<HistoryRecord> get _visibleRecords {
    if (_filter == HistoryFilter.all) return _records;
    return _records.where((record) => record.type == _filter).toList();
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

  void _showFilterMenu() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Filter settings opened'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visibleList = _visibleRecords;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F5),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              children: [
                // 1. Top bar with inline summary subtitle & tune filter icon button
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(
                      bottom: BorderSide(
                        color: Color(0xFFE5E7EB),
                        width: 0.5,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Left: Title + Inline Summary Subtitle
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'History',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF111827),
                                height: 1.2,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              '3 visits · 2 vaccinations · 1 active case',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF9CA3AF),
                                height: 1.2,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Right: Filter icon button (32x32, 10px radius, 0.5px border, white bg)
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _showFilterMenu,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: const Color(0xFFE5E7EB),
                                width: 0.5,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.tune,
                              size: 16,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Main Scrollable Content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 90),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 2. Active Case Banner
                        ActiveCaseBanner(
                          caseNumber: 'Case BC-2026-0018',
                          nextDoseText: 'Next: Day 7 dose · March 17, 2026',
                          dueBadgeText: 'Due in 4 days',
                          onTap: () => showDigitalVaccinationCard(context),
                        ),
                        const SizedBox(height: 14),

                        // 3. Filter Chips (All | Appointments | Vaccinations)
                        HistoryFilters(
                          selected: _filter,
                          onSelected: (filter) =>
                              setState(() => _filter = filter),
                        ),
                        const SizedBox(height: 16),

                        // 4. Timeline
                        const Padding(
                          padding: EdgeInsets.only(left: 2, bottom: 8),
                          child: Text(
                            'March 2026',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF9CA3AF),
                              letterSpacing: 0.04,
                            ),
                          ),
                        ),

                        if (visibleList.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFE5E7EB),
                                width: 0.5,
                              ),
                            ),
                            child: const Center(
                              child: Text(
                                'No records found for this filter.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF9CA3AF),
                                ),
                              ),
                            ),
                          )
                        else
                          for (var i = 0; i < visibleList.length; i++)
                            HistoryTimelineItem(
                              record: visibleList[i],
                              isLast: i == visibleList.length - 1,
                              onTap: () => showDigitalVaccinationCard(context),
                            ),
                      ],
                    ),
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
      floatingActionButton: PatientActionButton(
        onPressed: () => showDigitalVaccinationCard(context),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
