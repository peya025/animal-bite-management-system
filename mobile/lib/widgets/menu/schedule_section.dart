import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/appointment_summary.dart';
import '../../services/mobile_api.dart';
import 'menu_surface.dart';
import 'section_header.dart';

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
      final appointments = await MobileApi.instance.appointments();
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
        MenuSectionHeader(
          title: 'Upcoming schedules',
          actionLabel: 'View all',
          onAction: widget.onOpenAppointments,
        ),
        const SizedBox(height: 8),
        MenuSurface(
          padding: const EdgeInsets.all(14),
          color: AppColors.surfaceMuted,
          showBorder: false,
          showShadow: false,
          onTap: widget.onOpenAppointments,
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.event_available_outlined,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _loading
                          ? 'Loading appointments...'
                          : _next?.typeLabel ?? 'No appointments yet',
                      style: const TextStyle(
                        color: AppColors.gray900,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _next == null
                          ? 'Book a consultation or vaccination request.'
                          : '${_next!.patientName} - ${_next!.formattedDate}',
                      style: const TextStyle(
                        color: AppColors.gray500,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.gray500),
            ],
          ),
        ),
      ],
    );
  }
}
