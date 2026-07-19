import 'package:flutter/material.dart';

import '../app/app_theme.dart';
import '../models/appointment_summary.dart';
import '../services/mobile_api.dart';
import '../widgets/appointments/appointment_card.dart';
import '../widgets/appointments/appointment_filter.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/common/empty_state.dart';
import '../widgets/forms/app_text_field.dart';

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
  int? _cancellingId;

  int get _scheduledCount => _appointments
      .where((appointment) => appointment.status == 'scheduled')
      .length;

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<AppointmentSummary> get _visible {
    final appointments = _scheduledOnly
        ? _appointments
              .where((appointment) => appointment.status == 'scheduled')
              .toList()
        : [..._appointments];
    appointments.sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));
    return appointments;
  }

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
        backgroundColor: AppColors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        icon: const Icon(Icons.event_busy_outlined, color: AppColors.error),
        title: const Text(
          'Cancel appointment?',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${appointment.patientName}\n${appointment.formattedDate}',
                  style: const TextStyle(
                    color: AppColors.gray700,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'REASON (OPTIONAL)',
                controller: reason,
                hintText: 'Tell the clinic why you need to cancel',
                minLines: 3,
                maxLines: 3,
                maxLength: 1000,
              ),
            ],
          ),
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

    setState(() => _cancellingId = appointment.id);
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
    } finally {
      if (mounted) setState(() => _cancellingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    return Scaffold(
      backgroundColor: AppColors.pageBackground,
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
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
                    sliver: SliverList.list(
                      children: [
                        AppPageHeader(
                          title: 'Appointments',
                          subtitle: 'Family bookings and schedules.',
                          onBack: () => Navigator.of(context).pop(),
                          centered: true,
                        ),
                        const SizedBox(height: 22),
                        AppointmentFilterControl(
                          scheduledOnly: _scheduledOnly,
                          scheduledCount: _scheduledCount,
                          onChanged: (scheduledOnly) => setState(
                            () => _scheduledOnly = scheduledOnly,
                          ),
                        ),
                        const SizedBox(height: 20),
                        if (_loading)
                          Container(
                            height: 160,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceMuted,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const SizedBox.square(
                              dimension: 26,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          )
                        else if (_error case final message?)
                          EmptyState(
                            icon: Icons.sync_problem_rounded,
                            title: 'Could not load appointments',
                            message: message,
                            actionLabel: 'RETRY',
                            onAction: _load,
                          )
                        else if (visible.isEmpty)
                          EmptyState(
                            icon: Icons.event_available_outlined,
                            title: 'No appointments found',
                            message: _scheduledOnly
                                ? 'You have no scheduled visits right now.'
                                : 'Your appointment activity will appear here.',
                          )
                        else
                          for (final appointment in visible) ...[
                            AppointmentCard(
                              appointment: appointment,
                              onCancel: appointment.canCancel
                                  ? () => _cancel(appointment)
                                  : null,
                              isCancelling:
                                  _cancellingId == appointment.id,
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
