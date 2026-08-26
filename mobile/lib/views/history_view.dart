import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../services/api.dart';
import '../widgets/common/app_toast.dart';
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
  int? _selectedPatientId;
  bool _loading = true;
  String _error = '';
  List<HistoryRecord> _records = const [];
  List<Map<String, dynamic>> _patients = const [];
  Map<String, dynamic> _summary = const {
    'total_visits': 0,
    'total_vaccinations': 0,
    'active_cases': 0,
  };
  Map<String, dynamic>? _activeCase;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await api.history();
      final summaryData = (data['summary'] as Map<String, dynamic>?) ?? const {};
      final patientsData = (summaryData['patients'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .toList() ??
          const [];
      final activeCaseData = data['active_case'] as Map<String, dynamic>?;
      final rawRecords = (data['records'] as List<dynamic>?) ?? const [];

      final parsedRecords = rawRecords
          .whereType<Map<String, dynamic>>()
          .map(HistoryRecord.fromJson)
          .toList();

      if (mounted) {
        setState(() {
          _summary = summaryData;
          _patients = patientsData;
          _activeCase = activeCaseData;
          _records = parsedRecords;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  List<HistoryRecord> get _visibleRecords {
    var list = _records;
    if (_selectedPatientId != null) {
      list = list.where((record) => record.patientId == _selectedPatientId).toList();
    }
    if (_filter != HistoryFilter.all) {
      list = list.where((record) => record.type == _filter).toList();
    }
    // Strict newest to oldest sorting
    list = List<HistoryRecord>.from(list)..sort((a, b) {
      final aSort = a.sortTimestamp ?? 0;
      final bSort = b.sortTimestamp ?? 0;
      if (bSort != aSort) {
        return bSort.compareTo(aSort);
      }
      final aCreated = a.createdTimestamp ?? aSort;
      final bCreated = b.createdTimestamp ?? bSort;
      return bCreated.compareTo(aCreated);
    });
    return list;
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
    _loadHistory();
    AppToast.info(context, 'History updated');
  }

  @override
  Widget build(BuildContext context) {
    final visibleList = _visibleRecords;
    final totalVisits = _summary['total_visits'] ?? _records.length;
    final totalVaccinations = _summary['total_vaccinations'] ?? 0;
    final activeCases = _summary['active_cases'] ?? (_activeCase != null ? 1 : 0);

    final summaryText = '$totalVisits visit${totalVisits == 1 ? '' : 's'} · $totalVaccinations vaccination${totalVaccinations == 1 ? '' : 's'} · $activeCases active case${activeCases == 1 ? '' : 's'}';

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F5),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              children: [
                // 1. Top bar with inline summary subtitle & refresh/filter icon button
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
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'History',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF111827),
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              summaryText,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF9CA3AF),
                                height: 1.2,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Right: Refresh / Filter button
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
                              Icons.refresh_rounded,
                              size: 16,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Main Scrollable Content with Pull-To-Refresh
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _loadHistory,
                    color: const Color(0xFF1D9E75),
                    child: _loading && _records.isEmpty
                        ? const Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFF1D9E75),
                            ),
                          )
                        : SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(14, 14, 14, 90),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (_error.isNotEmpty) ...[
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    margin: const EdgeInsets.only(bottom: 12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF2F2),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: const Color(0xFFFECACA),
                                        width: 0.5,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.error_outline_rounded,
                                          color: Color(0xFFDC2626),
                                          size: 18,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            _error,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Color(0xFFDC2626),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],

                                // 2. Active Case Banner
                                if (_activeCase != null) ...[
                                  ActiveCaseBanner(
                                    caseNumber: _activeCase!['case_number']?.toString() ?? 'Active Case',
                                    nextDoseText: _activeCase!['next_dose_text']?.toString() ?? '',
                                    dueBadgeText: _activeCase!['due_badge_text']?.toString() ?? 'Active',
                                    onTap: () => showDigitalVaccinationCard(context),
                                  ),
                                  const SizedBox(height: 14),
                                ],

                                // 3. Multi-Profile Selector Bar (Rendered when managing multiple profiles)
                                _buildProfileFilterBar(),

                                // 4. Filter Chips (All | Appointments | Vaccinations)
                                HistoryFilters(
                                  selected: _filter,
                                  onSelected: (filter) =>
                                      setState(() => _filter = filter),
                                ),
                                const SizedBox(height: 16),

                                if (visibleList.isEmpty)
                                  Container(
                                    padding: const EdgeInsets.all(32),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: const Color(0xFFE5E7EB),
                                        width: 0.5,
                                      ),
                                    ),
                                    child: Center(
                                      child: Column(
                                        children: [
                                          Icon(
                                            _filter == HistoryFilter.vaccinations
                                                ? Icons.vaccines_outlined
                                                : Icons.calendar_today_outlined,
                                            size: 36,
                                            color: const Color(0xFFD1D5DB),
                                          ),
                                          const SizedBox(height: 10),
                                          Text(
                                            _filter == HistoryFilter.vaccinations
                                                ? 'No vaccination records yet'
                                                : _filter == HistoryFilter.appointments
                                                    ? 'No appointment records yet'
                                                    : 'No records found',
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF6B7280),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          const Text(
                                            'Your clinic visits and administered doses will appear here.',
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Color(0xFF9CA3AF),
                                            ),
                                          ),
                                        ],
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

  Widget _buildProfileFilterBar() {
    if (_patients.length <= 1) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        children: [
          _buildProfileFilterChip(
            id: null,
            name: 'All Profiles',
            relationship: null,
            count: _records.length,
            isSelected: _selectedPatientId == null,
          ),
          const SizedBox(width: 8),
          for (final p in _patients) ...[
            _buildProfileFilterChip(
              id: p['id'] as int?,
              name: p['name']?.toString() ?? 'Profile',
              relationship: p['relationship']?.toString() ?? 'self',
              count: _records.where((r) => r.patientId == p['id']).length,
              isSelected: _selectedPatientId == p['id'],
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _buildProfileFilterChip({
    required int? id,
    required String name,
    required String? relationship,
    required int count,
    required bool isSelected,
  }) {
    final rel = (relationship ?? '').toLowerCase();
    final isSelf = rel == 'self';

    final label = id == null
        ? 'All Profiles'
        : (isSelf
            ? '$name (Self)'
            : '$name (${rel == 'child' ? 'Child' : (rel.isNotEmpty ? rel[0].toUpperCase() + rel.substring(1) : 'Dependent')})');

    final icon = id == null
        ? Icons.people_outline_rounded
        : (isSelf
            ? Icons.person_outline_rounded
            : (rel == 'child' ? Icons.child_care_rounded : Icons.group_outlined));

    return InkWell(
      onTap: () => setState(() => _selectedPatientId = id),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1D9E75) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF1D9E75) : const Color(0xFFE5E7EB),
            width: isSelected ? 1.2 : 0.8,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF1D9E75).withValues(alpha: 0.2),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 13,
              color: isSelected ? Colors.white : const Color(0xFF6B7280),
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF374151),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.25)
                      : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF6B7280),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
