import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/booking_draft.dart';
import '../models/bite_intake_route_args.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../widgets/booking/booking_header.dart';
import '../widgets/booking/booking_summary.dart';
import '../widgets/booking/date_selector.dart';
import '../widgets/booking/service_selector.dart';
import '../widgets/forms/app_dropdown_field.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';

import '../widgets/vaccination/digital_vaccination_card.dart';

class BookingView extends StatefulWidget {
  const BookingView({super.key});

  @override
  State<BookingView> createState() => _BookingViewState();
}

class _BookingViewState extends State<BookingView> {
  BookingService _service = BookingService.consultation;
  DateTime _selectedDate = DateSelector.firstDate;
  List<PatientProfile> _patients = const [];
  PatientProfile? _selectedPatient;
  bool _loadingPatients = true;
  bool _booking = false;
  String? _profileError;

  @override
  void initState() {
    super.initState();
    _loadPatients();
  }

  Future<void> _loadPatients({int? selectPatientId}) async {
    try {
      final patients = await api.patients() as List<PatientProfile>;
      if (!mounted) return;
      setState(() {
        _patients = patients;
        _selectedPatient = patients.isEmpty
            ? null
            : patients.firstWhere(
                (patient) => patient.id == selectPatientId,
                orElse: () => patients.first,
              );
        _profileError = null;
      });
    } catch (error) {
      if (mounted) setState(() => _profileError = error.toString());
    } finally {
      if (mounted) setState(() => _loadingPatients = false);
    }
  }

  Future<void> _addDependent() async {
    final created = await Navigator.of(
      context,
    ).pushNamed(AppRoutes.profileSetup, arguments: 'add-dependent');
    if (created is PatientProfile && mounted) {
      await _loadPatients(selectPatientId: created.id);
    }
  }

  String _patientLabel(PatientProfile patient) {
    final relationship = switch (patient.relationship) {
      'self' => 'Self',
      'child' => 'Child',
      _ => 'Dependent',
    };
    return '${patient.name} - $relationship';
  }

  void _handleNavigation(int index) {
    final route = switch (index) {
      0 => AppRoutes.menu,
      1 => null,
      2 => AppRoutes.history,
      3 => AppRoutes.settings,
      _ => null,
    };
    if (route != null) Navigator.of(context).pushReplacementNamed(route);
  }

  Future<void> _continueBooking() async {
    final patient = _selectedPatient;
    if (patient == null) {
      await _addDependent();
      return;
    }

    final booking = BookingDraft(service: _service, date: _selectedDate);

    if (_service == BookingService.consultation) {
      await Navigator.of(context).pushNamed(
        AppRoutes.biteIntake,
        arguments: BiteIntakeRouteArgs(patient: patient, booking: booking),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.vaccines_outlined, color: AppColors.primary),
        title: const Text('Confirm vaccination booking'),
        content: Text(
          'Book a vaccination appointment for ${patient.name} on ${DateSelector.formatDate(_selectedDate)}?\n\nNo bite incident intake will be required for this booking.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Book vaccination'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _booking = true);
    try {
      await api.book(patient: patient, booking: booking);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(
            Icons.assignment_turned_in_outlined,
            color: AppColors.primary,
          ),
          title: const Text('Vaccination booked'),
          content: Text(
            '${patient.name} has been scheduled for vaccination on ${DateSelector.formatDate(_selectedDate)}.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.menu, (route) => false);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString()),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBackground,
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
                  sliver: SliverList.list(
                    children: [
                      const BookingHeader(),
                      const SizedBox(height: 24),

                      const SizedBox(height: 12),
                      if (_loadingPatients)
                        Container(
                          height: 72,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const SizedBox.square(
                            dimension: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      else if (_patients.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                _profileError ??
                                    'Add a patient profile before booking.',
                                style: const TextStyle(
                                  color: AppColors.gray700,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 12),
                              OutlinedButton.icon(
                                onPressed: _addDependent,
                                icon: const Icon(
                                  Icons.person_add_alt_1_outlined,
                                  size: 18,
                                ),
                                label: const Text('Add patient profile'),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                  side: const BorderSide(
                                    color: AppColors.divider,
                                    width: 0.5,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  foregroundColor: AppColors.textPrimary,
                                  textStyle: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        AppDropdownField<PatientProfile>(
                          label: 'Patient profile',
                          initialValue: _selectedPatient,
                          prefixIcon: Icons.people_outline_rounded,
                          items: _patients
                              .map(
                                (patient) => DropdownMenuItem(
                                  value: patient,
                                  child: Text(
                                    _patientLabel(patient),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (patient) =>
                              setState(() => _selectedPatient = patient),
                        ),
                      if (_patients.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            TextButton.icon(
                              onPressed: _selectedPatient == null
                                  ? null
                                  : () async {
                                      await Navigator.of(context).pushNamed(
                                        AppRoutes.patientProfile,
                                        arguments: _selectedPatient,
                                      );
                                      if (mounted && _selectedPatient != null) {
                                        await _loadPatients(
                                          selectPatientId: _selectedPatient!.id,
                                        );
                                      }
                                    },
                              icon: const Icon(Icons.badge_outlined, size: 16),
                              label: const Text('View profile'),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                textStyle: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: _addDependent,
                              icon: const Icon(
                                Icons.person_add_alt_1_outlined,
                                size: 16,
                              ),
                              label: const Text('Add child or dependent'),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                textStyle: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 24),
                      ServiceSelector(
                        selected: _service,
                        onSelected: (service) {
                          setState(() => _service = service);
                        },
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _service == BookingService.consultation
                              ? 'Consultation bookings require a bite incident intake form before submission.'
                              : 'Vaccination bookings can be submitted directly without filling out a bite incident intake form.',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                            height: 1.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      DateSelector(
                        selectedDate: _selectedDate,
                        onSelected: (date) {
                          setState(() => _selectedDate = date);
                        },
                      ),
                      const SizedBox(height: 24),
                      BookingSummary(
                        service: _service,
                        date: DateSelector.formatDate(_selectedDate),
                        patientName: _selectedPatient?.name,
                        onConfirm: _continueBooking,
                        isLoading: _booking,
                        confirmLabel: _service == BookingService.consultation
                            ? 'Continue to intake'
                            : 'Book vaccination',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: MenuNavigation(
        selectedIndex: 1,
        onSelected: _handleNavigation,
      ),
      floatingActionButton: PatientActionButton(
        onPressed: () => showDigitalVaccinationCard(context),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
