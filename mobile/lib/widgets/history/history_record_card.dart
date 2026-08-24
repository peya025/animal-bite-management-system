import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'history_filters.dart';

enum HistoryStatus { completed, scheduled, missed }

class HistoryRecord {
  const HistoryRecord({
    required this.type,
    required this.title,
    required this.dateTime,
    required this.status,
    required this.icon,
    this.caseNumber,
    this.completedDoses,
    this.totalDoses = 4,
    this.doseLabel,
  });

  final HistoryFilter type;
  final String title;
  final String dateTime;
  final HistoryStatus status;
  final IconData icon;
  final String? caseNumber;
  final int? completedDoses;
  final int totalDoses;
  final String? doseLabel;

  factory HistoryRecord.fromJson(Map<String, dynamic> json) {
    final typeStr = json['type'] as String? ?? 'appointments';
    final filterType = typeStr == 'vaccinations'
        ? HistoryFilter.vaccinations
        : HistoryFilter.appointments;

    final statusStr = json['status'] as String? ?? 'scheduled';
    final status = switch (statusStr) {
      'completed' => HistoryStatus.completed,
      'missed' => HistoryStatus.missed,
      _ => HistoryStatus.scheduled,
    };

    final icon = filterType == HistoryFilter.vaccinations
        ? (status == HistoryStatus.completed
            ? LucideIcons.syringe
            : LucideIcons.calendar)
        : LucideIcons.contact;

    return HistoryRecord(
      type: filterType,
      title: json['title'] as String? ?? 'Record',
      dateTime: json['date_time'] as String? ?? '',
      status: status,
      icon: icon,
      caseNumber: json['case_number'] as String?,
      completedDoses: json['completed_doses'] as int?,
      totalDoses: json['total_doses'] as int? ?? 4,
      doseLabel: json['dose_label'] as String?,
    );
  }
}

class HistoryTimelineItem extends StatelessWidget {
  const HistoryTimelineItem({
    super.key,
    required this.record,
    required this.isLast,
    this.onTap,
  });

  final HistoryRecord record;
  final bool isLast;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final iconColors = switch (record.status) {
      HistoryStatus.completed => (
        bg: const Color(0xFFE1F5EE),
        icon: const Color(0xFF1D9E75),
      ),
      HistoryStatus.scheduled => (
        bg: const Color(0xFFEFF6FF),
        icon: const Color(0xFF3B82F6),
      ),
      HistoryStatus.missed => (
        bg: const Color(0xFFFEF2F2),
        icon: const Color(0xFFEF4444),
      ),
    };

    final cardBorderColor = switch (record.status) {
      HistoryStatus.completed => const Color(0xFFE5E7EB),
      HistoryStatus.scheduled => const Color(0xFFBFDBFE),
      HistoryStatus.missed => const Color(0xFFFECACA),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left column (34px fixed width) with Icon Box + Connector Line
            SizedBox(
              width: 34,
              child: Column(
                children: [
                  // Icon box (34x34, 10px radius)
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: iconColors.bg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: Icon(
                      record.icon,
                      color: iconColors.icon,
                      size: 16,
                    ),
                  ),

                  // Vertical connecting line
                  if (!isLast)
                    Expanded(
                      child: Container(
                        width: 1.5,
                        margin: const EdgeInsets.symmetric(vertical: 3),
                        color: const Color(0xFFE5E7EB),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 10),

            // Right column (Card with details)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onTap,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: cardBorderColor,
                        width: 0.5,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header row: Title + Status badge
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                record.title,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF111827),
                                  height: 1.2,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            _TimelineStatusBadge(status: record.status),
                          ],
                        ),
                        const SizedBox(height: 3),

                        // Date / Time
                        Text(
                          record.dateTime,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF9CA3AF),
                            height: 1.5,
                          ),
                        ),

                        // Consultation cards only: Case Number Chip
                        if (record.caseNumber != null) ...[
                          const SizedBox(height: 5),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE1F5EE),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text(
                                  '# ',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF1D9E75),
                                  ),
                                ),
                                Text(
                                  record.caseNumber!,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF1D9E75),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        // Vaccination cards only: Dose progress section
                        if (record.completedDoses != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.only(top: 8),
                            decoration: const BoxDecoration(
                              border: Border(
                                top: BorderSide(
                                  color: Color(0xFFF3F4F6),
                                  width: 0.5,
                                ),
                              ),
                            ),
                            child: Column(
                              children: [
                                // Label row: "Dose progress" left + "2 of 4 done" right
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Dose progress',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF9CA3AF),
                                      ),
                                    ),
                                    Text(
                                      record.doseLabel ??
                                          '${record.completedDoses} of ${record.totalDoses} done',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF9CA3AF),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 5),

                                // Progress bar: Row of equal segments
                                Row(
                                  children: [
                                    for (var i = 0;
                                        i < record.totalDoses;
                                        i++) ...[
                                      Expanded(
                                        child: Container(
                                          height: 4,
                                          decoration: BoxDecoration(
                                            color: i < record.completedDoses!
                                                ? const Color(0xFF1D9E75)
                                                : (i == record.completedDoses &&
                                                        record.status ==
                                                            HistoryStatus
                                                                .scheduled)
                                                    ? const Color(0xFFBBF7D0)
                                                    : const Color(0xFFE5E7EB),
                                            borderRadius:
                                                BorderRadius.circular(2),
                                          ),
                                        ),
                                      ),
                                      if (i != record.totalDoses - 1)
                                        const SizedBox(width: 3),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimelineStatusBadge extends StatelessWidget {
  const _TimelineStatusBadge({required this.status});

  final HistoryStatus status;

  @override
  Widget build(BuildContext context) {
    final style = switch (status) {
      HistoryStatus.completed => (
        bg: const Color(0xFFE1F5EE),
        text: const Color(0xFF085041),
        label: 'Completed',
      ),
      HistoryStatus.scheduled => (
        bg: const Color(0xFFEFF6FF),
        text: const Color(0xFF1D4ED8),
        label: 'Scheduled',
      ),
      HistoryStatus.missed => (
        bg: const Color(0xFFFEF2F2),
        text: const Color(0xFFB91C1C),
        label: 'Missed',
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: style.bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        style.label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w500,
          color: style.text,
        ),
      ),
    );
  }
}

