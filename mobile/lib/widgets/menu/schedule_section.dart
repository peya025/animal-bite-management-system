import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/appointment_summary.dart';
import '../../services/api.dart';

class ScheduleSection extends StatefulWidget {
  const ScheduleSection({super.key, required this.onOpenAppointments});

  final VoidCallback onOpenAppointments;

  @override
  State<ScheduleSection> createState() => _ScheduleSectionState();
}

class _ScheduleSectionState extends State<ScheduleSection> {
  AppointmentSummary? _next;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final appointments = await api.appointments() as List<AppointmentSummary>;
      final scheduled =
          appointments
              .where((appointment) => appointment.status == 'scheduled')
              .toList()
            ..sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));
      if (mounted) setState(() => _next = scheduled.firstOrNull);
    } catch (_) {
      if (mounted) setState(() => _next = null);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header Row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'UPCOMING SCHEDULES',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 12,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
              ),
            ),
            GestureDetector(
              onTap: widget.onOpenAppointments,
              child: const Text(
                'View all',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        // Appointment Card
        InkWell(
          onTap: widget.onOpenAppointments,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200, width: 0.5),
            ),
            child: Row(
              children: [
                // Left 42x42 icon box (12px radius, #E1F5EE bg)
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE1F5EE),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.event_available_outlined,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                // Center info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _loading
                            ? 'Loading appointments...'
                            : _next?.typeLabel ?? 'No appointments yet',
                        style: const TextStyle(
                          color: Color(0xFF111827),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _next == null
                            ? 'Schedule a consultation or vaccination'
                            : '${_next!.patientName} • ${_next!.formattedDate}',
                        style: const TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF9CA3AF),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
