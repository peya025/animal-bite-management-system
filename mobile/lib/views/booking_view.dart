import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../models/booking_draft.dart';
import '../models/bite_intake_route_args.dart';
import '../models/patient_profile.dart';
import '../services/mobile_api.dart';
import '../app/app_theme.dart';
import '../widgets/booking/booking_header.dart';
import '../widgets/booking/booking_summary.dart';
import '../widgets/booking/date_selector.dart';
import '../widgets/booking/service_selector.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';
import '../widgets/menu/menu_surface.dart';

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
  String? _profileError;

  @override
  void initState() {
    super.initState();
    _loadPatients();
  }

  Future<void> _loadPatients({int? selectPatientId}) async {
    try {
      final patients = await MobileApi.instance.patients();
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

  void _openHome() {
    Navigator.of(context).pushReplacementNamed(AppRoutes.menu);
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
    await Navigator.of(context).pushNamed(
      AppRoutes.biteIntake,
      arguments: BiteIntakeRouteArgs(patient: patient, booking: booking),
    );
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
                      BookingHeader(onBack: _openHome),
                      const SizedBox(height: 26),
                      const Text(
                        'Who is this appointment for?',
                        style: TextStyle(
                          color: AppColors.gray900,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      MenuSurface(
                        padding: const EdgeInsets.all(14),
                        child: _loadingPatients
                            ? const Center(child: CircularProgressIndicator())
                            : _patients.isEmpty
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    _profileError ??
                                        'Add a patient profile before booking.',
                                    style: const TextStyle(
                                      color: AppColors.gray700,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  OutlinedButton.icon(
                                    onPressed: _addDependent,
                                    icon: const Icon(
                                      Icons.person_add_alt_1_outlined,
                                    ),
                                    label: const Text('ADD PATIENT PROFILE'),
                                  ),
                                ],
                              )
                            : DropdownButtonFormField<PatientProfile>(
                                initialValue: _selectedPatient,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(
                                    Icons.people_outline_rounded,
                                  ),
                                ),
                                items: _patients
                                    .map(
                                      (patient) => DropdownMenuItem(
                                        value: patient,
                                        child: Text(
                                          '${patient.name} - ${patient.relationship}',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (patient) => setState(
                                  () => _selectedPatient = patient,
                                ),
                              ),
                      ),
                      if (_patients.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton.icon(
                            onPressed: _addDependent,
                            icon: const Icon(Icons.person_add_alt_1_outlined),
                            label: const Text('ADD CHILD OR DEPENDENT'),
                          ),
                        ),
                      ],
                      const SizedBox(height: 26),
                      ServiceSelector(
                        selected: _service,
                        onSelected: (service) {
                          setState(() => _service = service);
                        },
                      ),
                      const SizedBox(height: 26),
                      DateSelector(
                        selectedDate: _selectedDate,
                        onSelected: (date) {
                          setState(() => _selectedDate = date);
                        },
                      ),
                      const SizedBox(height: 26),
                      BookingSummary(
                        service: _service,
                        date: DateSelector.formatDate(_selectedDate),
                        patientName: _selectedPatient?.name,
                        onConfirm: _continueBooking,
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
