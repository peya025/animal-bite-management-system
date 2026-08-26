import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:table_calendar/table_calendar.dart';

import '../app/app_routes.dart';
import '../l10n/app_localizations.dart';
import '../models/appointment_summary.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

class CalendarEvent {
  const CalendarEvent({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.relationship,
    required this.title,
    required this.type,
    required this.date,
    required this.timeSlot,
    required this.status,
    this.caseNumber,
    this.doseLabel,
    this.notes,
  });

  final String id;
  final int patientId;
  final String patientName;
  final String relationship;
  final String title;
  final String type; // 'consultation' | 'vaccination'
  final DateTime date;
  final String timeSlot;
  final String status; // 'completed' | 'scheduled' | 'missed'
  final String? caseNumber;
  final String? doseLabel;
  final String? notes;
}

class ScheduleCalendarView extends StatefulWidget {
  const ScheduleCalendarView({super.key});

  @override
  State<ScheduleCalendarView> createState() => _ScheduleCalendarViewState();
}

class _ScheduleCalendarViewState extends State<ScheduleCalendarView> {
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  CalendarFormat _calendarFormat = CalendarFormat.month;

  List<PatientProfile> _patients = const [];
  int? _selectedPatientId; // null means 'All Profiles'

  List<CalendarEvent> _allEvents = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // 1. Fetch Patients
      final dynamic rawPatients = await api.patients();
      final List<PatientProfile> patientsList = (rawPatients is List)
          ? rawPatients.whereType<PatientProfile>().toList()
          : const <PatientProfile>[];

      // 2. Fetch Appointments
      final dynamic rawApps = await api.appointments();
      final List<AppointmentSummary> appointments = (rawApps is List)
          ? rawApps.whereType<AppointmentSummary>().toList()
          : const <AppointmentSummary>[];

      // 3. Fetch History / Doses
      final dynamic rawHistory = await api.history();
      final Map<String, dynamic> historyData = (rawHistory is Map<String, dynamic>)
          ? rawHistory
          : const {};
      final List<dynamic> rawRecords = (historyData['records'] as List<dynamic>?) ?? const [];

      final events = <CalendarEvent>[];

      // Map Appointments into Events
      for (final app in appointments) {
        final date = DateTime(app.scheduledDate.year, app.scheduledDate.month, app.scheduledDate.day);
        final isCompleted = app.status == 'completed';
        final isMissed = app.status == 'missed' || app.status == 'cancelled';
        final isVac = app.type == 'vaccination' || app.type == 'follow_up_vaccination';

        events.add(
          CalendarEvent(
            id: 'app_${app.id}',
            patientId: app.patientId,
            patientName: app.patientName,
            relationship: app.relationship ?? _findRelationship(app.patientId, patientsList),
            title: app.typeLabel,
            type: isVac ? 'vaccination' : 'consultation',
            date: date,
            timeSlot: 'Morning (8:00 AM - 12:00 PM)',
            status: isCompleted ? 'completed' : (isMissed ? 'missed' : 'scheduled'),
            doseLabel: isVac ? (app.doseName ?? 'Rabies Vaccine') : 'Consultation Visit',
            notes: app.notes,
          ),
        );
      }

      for (final rec in rawRecords) {
        if (rec is! Map<String, dynamic>) continue;
        final type = rec['type']?.toString();
        if (type == 'vaccinations') {
          final rawDateStr = rec['raw_date']?.toString();
          DateTime? parsedDate;
          if (rawDateStr != null && rawDateStr.isNotEmpty) {
            try {
              parsedDate = DateTime.parse(rawDateStr);
            } catch (_) {}
          }
          if (parsedDate == null) continue;

          final statusStr = rec['status']?.toString() ?? 'scheduled';
          final pid = (rec['patient_id'] as int?) ?? _findPatientIdByName(rec['patient_name']?.toString() ?? '', patientsList);
          final pName = rec['patient_name']?.toString() ?? 'Patient';
          final normalizedDate = DateTime(parsedDate.year, parsedDate.month, parsedDate.day);

          // Avoid duplicate entry if appointment already exists on that date
          final exists = events.any((e) =>
              e.patientId == pid &&
              isSameDay(e.date, normalizedDate));

          if (!exists) {
            events.add(
              CalendarEvent(
                id: rec['id']?.toString() ?? 'vac-${events.length}',
                patientId: pid,
                patientName: pName,
                relationship: rec['relationship']?.toString() ?? _findRelationship(pid, patientsList),
                title: rec['title']?.toString() ?? 'Anti-Rabies Vaccine',
                type: 'vaccination',
                date: normalizedDate,
                timeSlot: '10:00 AM',
                status: statusStr,
                caseNumber: rec['case_number']?.toString(),
                doseLabel: rec['dose_label']?.toString(),
              ),
            );
          }
        }
      }

      if (mounted) {
        setState(() {
          _patients = patientsList;
          _allEvents = events;
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

  String _findRelationship(int patientId, List<PatientProfile> patients) {
    for (final p in patients) {
      if (p.id == patientId) {
        final rel = p.relationship.toLowerCase();
        if (rel == 'self') return 'Self';
        return rel[0].toUpperCase() + rel.substring(1);
      }
    }
    return 'Self';
  }

  int _findPatientIdByName(String name, List<PatientProfile> patients) {
    for (final p in patients) {
      if (p.name.toLowerCase() == name.toLowerCase()) {
        return p.id;
      }
    }
    return patients.isNotEmpty ? patients.first.id : 1;
  }

  List<CalendarEvent> get _filteredEvents {
    if (_selectedPatientId == null) return _allEvents;
    return _allEvents.where((e) => e.patientId == _selectedPatientId).toList();
  }

  List<CalendarEvent> _getEventsForDay(DateTime day) {
    final dayOnly = DateTime(day.year, day.month, day.day);
    return _filteredEvents.where((e) => isSameDay(e.date, dayOnly)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final eventsForSelectedDay = _getEventsForDay(_selectedDay);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF111827)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('cal_title'),
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
              ),
            ),
            Text(
              context.tr('cal_subtitle'),
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(LucideIcons.refreshCw, color: Color(0xFF1D9E75), size: 18),
            onPressed: _loadData,
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 540),
            child: RefreshIndicator(
              onRefresh: _loadData,
              color: const Color(0xFF1D9E75),
              child: _loading && _allEvents.isEmpty
                  ? const Center(
                      child: CircularProgressIndicator(color: Color(0xFF1D9E75)),
                    )
                  : SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 32),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_error != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Text(
                                _error!,
                                style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12),
                              ),
                            ),
                          ],

                          // ─── 1. Multi-Profile Filter Strip ───
                          _buildProfileSelector(),
                          const SizedBox(height: 14),

                          // ─── 2. Interactive Calendar Card ───
                          _buildCalendarCard(),
                          const SizedBox(height: 16),

                          // ─── 3. Selected Day Header ───
                          _buildSelectedDayHeader(eventsForSelectedDay.length),
                          const SizedBox(height: 10),

                          // ─── 4. Selected Day Events List ───
                          if (eventsForSelectedDay.isEmpty)
                            _buildEmptyDayState()
                          else
                            for (final event in eventsForSelectedDay) ...[
                              _buildEventCard(event),
                              const SizedBox(height: 10),
                            ],

                          const SizedBox(height: 16),

                          // ─── 5. Upcoming Schedule Summary ───
                          _buildAllUpcomingSection(),
                        ],
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  // ─── Profile Selector ───
  Widget _buildProfileSelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          // All Profiles chip
          _buildFilterChip(
            label: context.tr('cal_all_profiles'),
            isSelected: _selectedPatientId == null,
            count: _allEvents.length,
            onTap: () => setState(() => _selectedPatientId = null),
          ),
          const SizedBox(width: 8),

          // Individual Profiles
          for (final p in _patients) ...[
            _buildFilterChip(
              label: '${p.name} (${p.relationship.toLowerCase() == 'self' ? 'Self' : p.relationship})',
              isSelected: _selectedPatientId == p.id,
              count: _allEvents.where((e) => e.patientId == p.id).length,
              onTap: () => setState(() => _selectedPatientId = p.id),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required int count,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1D9E75) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF1D9E75) : const Color(0xFFE5E7EB),
            width: 0.8,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF1D9E75).withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? Colors.white : const Color(0xFF374151),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white24 : const Color(0xFFE1F5EE),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF085041),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ─── TableCalendar Card ───
  Widget _buildCalendarCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A111827),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TableCalendar<CalendarEvent>(
            firstDay: DateTime.utc(2024, 1, 1),
            lastDay: DateTime.utc(2035, 12, 31),
            focusedDay: _focusedDay,
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            calendarFormat: _calendarFormat,
            eventLoader: _getEventsForDay,
            startingDayOfWeek: StartingDayOfWeek.sunday,
            headerStyle: HeaderStyle(
              formatButtonVisible: true,
              formatButtonShowsNext: false,
              formatButtonDecoration: BoxDecoration(
                color: const Color(0xFFE1F5EE),
                borderRadius: BorderRadius.circular(12),
              ),
              formatButtonTextStyle: const TextStyle(
                color: Color(0xFF085041),
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
              titleCentered: true,
              titleTextStyle: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
              ),
              leftChevronIcon: const Icon(LucideIcons.chevronLeft, color: Color(0xFF374151), size: 16),
              rightChevronIcon: const Icon(LucideIcons.chevronRight, color: Color(0xFF374151), size: 16),
            ),
            calendarStyle: CalendarStyle(
              outsideDaysVisible: false,
              todayDecoration: const BoxDecoration(
                color: Color(0xFFBBF7D0),
                shape: BoxShape.circle,
              ),
              todayTextStyle: const TextStyle(
                color: Color(0xFF065F46),
                fontWeight: FontWeight.w700,
              ),
              selectedDecoration: const BoxDecoration(
                color: Color(0xFF1D9E75),
                shape: BoxShape.circle,
              ),
              selectedTextStyle: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
              markersMaxCount: 3,
              markerDecoration: const BoxDecoration(
                color: Color(0xFF3B82F6),
                shape: BoxShape.circle,
              ),
            ),
            calendarBuilders: CalendarBuilders(
              markerBuilder: (context, date, events) {
                if (events.isEmpty) return const SizedBox.shrink();
                return Positioned(
                  bottom: 4,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: events.take(3).map((event) {
                      final color = switch (event.status) {
                        'completed' => const Color(0xFF10B981),
                        'missed' => const Color(0xFFEF4444),
                        _ => const Color(0xFF3B82F6),
                      };
                      return Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.symmetric(horizontal: 1),
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      );
                    }).toList(),
                  ),
                );
              },
            ),
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDay = selectedDay;
                _focusedDay = focusedDay;
              });
            },
            onFormatChanged: (format) {
              setState(() {
                _calendarFormat = format;
              });
            },
            onPageChanged: (focusedDay) {
              setState(() {
                _focusedDay = focusedDay;
              });
            },
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, thickness: 0.6, color: Color(0xFFF3F4F6)),
          const SizedBox(height: 10),

          // ─── Color Guide / Legend Bar ───
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Wrap(
              alignment: WrapAlignment.spaceEvenly,
              spacing: 12,
              runSpacing: 6,
              children: [
                _buildLegendItem(
                  color: const Color(0xFF10B981),
                  label: context.tr('cal_completed'),
                ),
                _buildLegendItem(
                  color: const Color(0xFF3B82F6),
                  label: context.tr('cal_scheduled'),
                ),
                _buildLegendItem(
                  color: const Color(0xFFEF4444),
                  label: context.tr('cal_missed'),
                ),
                _buildLegendItem(
                  color: const Color(0xFF065F46),
                  bgColor: const Color(0xFFBBF7D0),
                  label: context.tr('cal_today'),
                  isBordered: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem({
    required Color color,
    required String label,
    Color? bgColor,
    bool isBordered = false,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: bgColor ?? color,
            border: isBordered ? Border.all(color: color, width: 1.2) : null,
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: Color(0xFF4B5563),
          ),
        ),
      ],
    );
  }

  // ─── Selected Day Header ───
  Widget _buildSelectedDayHeader(int eventCount) {
    final now = DateTime.now();
    final isToday = isSameDay(_selectedDay, now);
    final monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    final dateString = '${monthNames[_selectedDay.month - 1]} ${_selectedDay.day}, ${_selectedDay.year}';

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(
              dateString,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
              ),
            ),
            if (isToday) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFE1F5EE),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Today',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF085041),
                  ),
                ),
              ),
            ],
          ],
        ),
        Text(
          eventCount == 0 ? 'No events' : '$eventCount schedule${eventCount > 1 ? 's' : ''}',
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF6B7280),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  // ─── Empty Day State ───
  Widget _buildEmptyDayState() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
      ),
      child: Column(
        children: [
          const Icon(
            LucideIcons.calendar,
            size: 32,
            color: Color(0xFF9CA3AF),
          ),
          const SizedBox(height: 8),
          const Text(
            'No schedules on this date',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF374151),
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'You have no consultation or vaccination scheduled for this day.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              color: Color(0xFF9CA3AF),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).pushNamed(AppRoutes.booking),
            icon: const Icon(LucideIcons.plus, size: 14),
            label: const Text('Book an appointment', style: TextStyle(fontSize: 12)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF1D9E75),
              side: const BorderSide(color: Color(0xFF1D9E75), width: 0.8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Event Card ───
  Widget _buildEventCard(CalendarEvent event) {
    final statusConfig = switch (event.status) {
      'completed' => (
        bg: const Color(0xFFE1F5EE),
        text: const Color(0xFF085041),
        border: const Color(0xFFBBF7D0),
        label: 'Completed',
        icon: LucideIcons.checkCircle,
      ),
      'missed' => (
        bg: const Color(0xFFFEF2F2),
        text: const Color(0xFFDC2626),
        border: const Color(0xFFFECACA),
        label: 'Missed / Cancelled',
        icon: LucideIcons.alertCircle,
      ),
      _ => (
        bg: const Color(0xFFEFF6FF),
        text: const Color(0xFF1D4ED8),
        border: const Color(0xFFBFDBFE),
        label: 'Scheduled',
        icon: LucideIcons.clock,
      ),
    };

    final isVaccination = event.type == 'vaccination';

    return InkWell(
      onTap: () {
        setState(() {
          _selectedDay = event.date;
          _focusedDay = event.date;
        });
        if (isVaccination) {
          showDigitalVaccinationCard(context, initialPatientId: event.patientId);
        }
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06111827),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Patient badge + Status chip
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.user, size: 12, color: Color(0xFF4B5563)),
                          const SizedBox(width: 4),
                          Text(
                            '${event.patientName} · ${event.relationship}',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF374151),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusConfig.bg,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: statusConfig.border, width: 0.5),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusConfig.icon, size: 11, color: statusConfig.text),
                      const SizedBox(width: 4),
                      Text(
                        statusConfig.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: statusConfig.text,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Title & Dose info
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isVaccination ? const Color(0xFFE1F5EE) : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isVaccination ? LucideIcons.syringe : LucideIcons.contact,
                    color: isVaccination ? const Color(0xFF1D9E75) : const Color(0xFF3B82F6),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.title,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF111827),
                        ),
                      ),
                      if (event.doseLabel != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          event.doseLabel!,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: Color(0xFFF3F4F6)),
            const SizedBox(height: 8),

            // Bottom row: Time slot & quick link
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.clock, size: 13, color: Color(0xFF6B7280)),
                    const SizedBox(width: 4),
                    Text(
                      event.timeSlot,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                if (isVaccination)
                  const Row(
                    children: [
                      Text(
                        'Digital Card',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D9E75),
                        ),
                      ),
                      SizedBox(width: 2),
                      Icon(LucideIcons.chevronRight, size: 12, color: Color(0xFF1D9E75)),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── All Upcoming Section ───
  Widget _buildAllUpcomingSection() {
    final now = DateTime.now();
    final todayOnly = DateTime(now.year, now.month, now.day);
    final upcomingList = _filteredEvents
        .where((e) => e.status == 'scheduled' && (e.date.isAfter(todayOnly) || isSameDay(e.date, todayOnly)))
        .toList()
      ..sort((a, b) => a.date.compareTo(b.date));

    if (upcomingList.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ALL UPCOMING VISITS',
          style: TextStyle(
            color: Color(0xFF9CA3AF),
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        for (final event in upcomingList.take(5)) ...[
          _buildEventCard(event),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}
