import 'package:flutter/material.dart';

import '../app/app_theme.dart';
import '../models/appointment_summary.dart';
import '../services/mobile_api.dart';
import '../widgets/appointments/appointment_card.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_surface.dart';

class AppointmentsView extends StatefulWidget {
  const AppointmentsView({super.key});

  @override
  State<AppointmentsView> createState() => _AppointmentsViewState();
}

class _AppointmentsViewState extends State<AppointmentsView> {
  List<AppointmentSummary> _appointments = const [];
  bool _loading = true;
  String? _error;
  bool _scheduledOnly = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Iterable<AppointmentSummary> get _visible => _scheduledOnly
      ? _appointments.where((appointment) => appointment.status == 'scheduled')
      : _appointments;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final appointments = await MobileApi.instance.appointments();
      if (mounted) setState(() => _appointments = appointments);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancel(AppointmentSummary appointment) async {
    final reason = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.event_busy_outlined, color: AppColors.error),
        title: const Text('Cancel appointment?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('${appointment.patientName} - ${appointment.formattedDate}'),
            const SizedBox(height: 14),
            TextField(
              controller: reason,
              maxLines: 3,
              maxLength: 1000,
              decoration: const InputDecoration(
                labelText: 'Reason (optional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep appointment'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Cancel appointment'),
          ),
        ],
      ),
    );
    final cancellationReason = reason.text.trim();
    reason.dispose();
    if (confirmed != true || !mounted) return;

    try {
      final updated = await MobileApi.instance.cancelAppointment(
        appointmentId: appointment.id,
        reason: cancellationReason.isEmpty ? null : cancellationReason,
      );
      if (!mounted) return;
      setState(() {
        _appointments = _appointments
            .map((item) => item.id == updated.id ? updated : item)
            .toList();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Appointment cancelled.')),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString()), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible.toList();
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F7),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
                    sliver: SliverList.list(
                      children: [
                        AppPageHeader(
                          title: 'Appointments',
                          subtitle: 'Family bookings and schedules.',
                          onBack: () => Navigator.of(context).pop(),
                        ),
                        const SizedBox(height: 20),
                        SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(value: true, label: Text('Scheduled')),
                            ButtonSegment(value: false, label: Text('All')),
                          ],
                          selected: {_scheduledOnly},
                          onSelectionChanged: (selection) => setState(
                            () => _scheduledOnly = selection.first,
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (_loading)
                          const Center(child: CircularProgressIndicator())
                        else if (_error case final message?)
                          MenuSurface(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              children: [
                                Text(message, textAlign: TextAlign.center),
                                const SizedBox(height: 8),
                                TextButton(onPressed: _load, child: const Text('RETRY')),
                              ],
                            ),
                          )
                        else if (visible.isEmpty)
                          const MenuSurface(
                            padding: EdgeInsets.all(24),
                            child: Center(child: Text('No appointments found.')),
                          )
                        else
                          for (final appointment in visible) ...[
                            AppointmentCard(
                              appointment: appointment,
                              onCancel: appointment.canCancel
                                  ? () => _cancel(appointment)
                                  : null,
                            ),
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
      ),
    );
  }
}
