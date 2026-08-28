import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/bite_intake_route_args.dart';
import '../models/booking_draft.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../widgets/booking/booking_header.dart';
import '../widgets/booking/booking_summary.dart';
import '../widgets/booking/date_selector.dart';
import '../widgets/booking/service_selector.dart';
import '../widgets/common/app_toast.dart';
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
  late DateTime _selectedDate;
  BookingTimeSlot _timeSlot = BookingTimeSlot.morning;
  final _notesController = TextEditingController();
  List<PatientProfile> _patients = const [];
  PatientProfile? _selectedPatient;
  bool _loadingPatients = true;
  bool _booking = false;
  String? _profileError;
  List<int> _openDaysOfWeek = const [1, 2, 3, 4, 5];
  Map<String, dynamic> _scheduleExceptions = const {};
  Map<String, dynamic>? _urgentPolicy;

  @override
  void initState() {
    super.initState();
    // Always initialise to today when screen opens — avoids stale date if app ran past midnight
    _selectedDate = DateUtils.dateOnly(DateTime.now());
    _loadPatients();
    _loadScheduleSummary();
  }

  Future<void> _loadScheduleSummary() async {
    try {
      final summary = await api.scheduleSummary() as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        if (summary['open_days_of_week'] is List) {
          _openDaysOfWeek = (summary['open_days_of_week'] as List).cast<int>();
        }
        if (summary['exceptions'] is Map) {
          _scheduleExceptions = summary['exceptions'] as Map<String, dynamic>;
        }
        if (summary['urgent_policy'] is Map) {
          _urgentPolicy = summary['urgent_policy'] as Map<String, dynamic>;
        }
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  PatientProfile _findSelfOrFirst(List<PatientProfile> list) {
    return list.firstWhere(
      (patient) => patient.relationship == 'self',
      orElse: () => list.first,
    );
  }

  Future<void> _loadPatients({int? selectPatientId}) async {
    try {
      final rawPatients = await api.patients() as List<PatientProfile>;
      final patients = rawPatients.where((p) => p.isActive).toList();
      if (!mounted) return;
      setState(() {
        _patients = patients;
        if (patients.isEmpty) {
          _selectedPatient = null;
        } else if (selectPatientId != null) {
          _selectedPatient = patients.firstWhere(
            (patient) => patient.id == selectPatientId,
            orElse: () => _findSelfOrFirst(patients),
          );
        } else {
          _selectedPatient = _findSelfOrFirst(patients);
        }
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

  String _relationshipLabel(String rel) {
    return switch (rel) {
      'self' => 'Self',
      'child' => 'Child',
      _ => 'Dependent',
    };
  }

  String _patientInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return 'P';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }

  void _openPatientPickerModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text(
                    'Select patient profile',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF111827),
                    ),
                  ),
                ),
                const Divider(height: 1, color: Color(0xFFE5E7EB)),
                for (final p in _patients)
                  ListTile(
                    leading: CircleAvatar(
                      radius: 18,
                      backgroundColor: const Color(0xFFE1F5EE),
                      child: Text(
                        _patientInitials(p.name),
                        style: const TextStyle(
                          color: Color(0xFF085041),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    title: Text(
                      p.name,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    subtitle: Text(
                      _relationshipLabel(p.relationship),
                      style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                    ),
                    trailing: p.id == _selectedPatient?.id
                        ? const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
                        : null,
                    onTap: () {
                      setState(() => _selectedPatient = p);
                      Navigator.of(context).pop();
                    },
                  ),
                const Divider(height: 1, color: Color(0xFFE5E7EB)),
                ListTile(
                  leading: const CircleAvatar(
                    radius: 18,
                    backgroundColor: Color(0xFFF3F4F6),
                    child: Icon(Icons.person_add_alt_1_outlined, size: 18, color: Color(0xFF374151)),
                  ),
                  title: const Text(
                    'Add child or dependent',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.primary),
                  ),
                  onTap: () {
                    Navigator.of(context).pop();
                    _addDependent();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
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
    if (_booking) return;
    final patient = _selectedPatient;
    if (patient == null) {
      await _addDependent();
      return;
    }

    final today = DateUtils.dateOnly(DateTime.now());
    final safeDate = _selectedDate.isBefore(today) ? today : _selectedDate;

    final booking = BookingDraft(
      service: _service,
      date: safeDate,
      timeSlot: _timeSlot,
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
    );

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
        AppToast.error(context, error.toString());
      }
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final patient = _selectedPatient;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              children: [
                const BookingHeader(),
                Expanded(
                  child: CustomScrollView(
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                        sliver: SliverList.list(
                          children: [
                      // ─── 2. PATIENT PROFILE SECTION ───
                      const Text(
                        'PATIENT PROFILE',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (_loadingPatients)
                        Container(
                          height: 60,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200, width: 0.5),
                          ),
                          child: const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      else if (_patients.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200, width: 0.5),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                _profileError ?? 'Add a patient profile before booking.',
                                style: const TextStyle(color: Color(0xFF6B7280), fontSize: 12),
                              ),
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                onPressed: _addDependent,
                                icon: const Icon(Icons.person_add_alt_1_outlined, size: 16),
                                label: const Text('Add patient profile'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  side: BorderSide(color: Colors.grey.shade300, width: 0.5),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        )
                      else ...[
                        // Patient Card
                        InkWell(
                          onTap: _openPatientPickerModal,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.shade200, width: 0.5),
                            ),
                            child: Row(
                              children: [
                                // Left 36px circular avatar
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFE1F5EE),
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    patient != null ? _patientInitials(patient.name) : 'P',
                                    style: const TextStyle(
                                      color: Color(0xFF085041),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Center info
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        patient?.name ?? 'Select patient',
                                        style: const TextStyle(
                                          color: Color(0xFF111827),
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        patient != null ? _relationshipLabel(patient.relationship) : 'No profile selected',
                                        style: const TextStyle(
                                          color: Color(0xFF6B7280),
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  color: Color(0xFF6B7280),
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Below card: Inline row of two text links
                        Row(
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            GestureDetector(
                              onTap: patient == null
                                  ? null
                                  : () async {
                                      await Navigator.of(context).pushNamed(
                                        AppRoutes.patientProfile,
                                        arguments: patient,
                                      );
                                      if (mounted) {
                                        await _loadPatients(selectPatientId: patient.id);
                                      }
                                    },
                              child: const Row(
                                children: [
                                  Icon(Icons.badge_outlined, size: 14, color: AppColors.primary),
                                  SizedBox(width: 4),
                                  Text(
                                    'View profile',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 10),
                              child: SizedBox(
                                height: 12,
                                child: VerticalDivider(
                                  width: 1,
                                  thickness: 1,
                                  color: Color(0xFFD1D5DB),
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: _addDependent,
                              child: const Row(
                                children: [
                                  Icon(Icons.person_add_alt_1_outlined, size: 14, color: AppColors.primary),
                                  SizedBox(width: 4),
                                  Text(
                                    'Add dependent',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],

                      const SizedBox(height: 20),

                      // ─── 3. SERVICE TYPE SECTION ───
                      ServiceSelector(
                        selected: _service,
                        onSelected: (service) {
                          setState(() => _service = service);
                        },
                      ),

                      if (_service == BookingService.consultation && _urgentPolicy != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFDE68A), width: 0.8),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('🚨', style: TextStyle(fontSize: 16)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'URGENT DAY 0 EXPOSURE ADVISORY',
                                      style: TextStyle(
                                        color: Color(0xFF92400E),
                                        fontWeight: FontWeight.w700,
                                        fontSize: 11,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _urgentPolicy!['urgent_access_policy'] == 'refer_to_alternate_facility'
                                          ? 'Animal bite exposure is an emergency. For immediate Day-0 rabies PEP outside operating hours, proceed directly to ${_urgentPolicy!['facility_name'] ?? 'the nearest Emergency Hospital'}${_urgentPolicy!['facility_contact'] != null ? ' (${_urgentPolicy!['facility_contact']})' : ''}.'
                                          : 'Animal bite exposure is an emergency. Emergency walk-ins are accepted 24/7 at the ER Triage counter outside regular clinic hours.',
                                      style: const TextStyle(
                                        color: Color(0xFF78350F),
                                        fontSize: 11.5,
                                        height: 1.35,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 20),

                      // ─── 4. DATE PICKER SECTION ───
                      DateSelector(
                        selectedDate: _selectedDate,
                        openDaysOfWeek: _openDaysOfWeek,
                        exceptions: _scheduleExceptions,
                        onSelected: (date) {
                          setState(() => _selectedDate = date);
                        },
                      ),

                      const SizedBox(height: 20),

                      // ─── PREFERRED TIME SLOT & REASON SECTION ───
                      const Text(
                        'PREFERRED TIME SLOT',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: _TimeSlotChip(
                              label: 'Morning (8 AM – 12 PM)',
                              isSelected: _timeSlot == BookingTimeSlot.morning,
                              onTap: () => setState(() => _timeSlot = BookingTimeSlot.morning),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _TimeSlotChip(
                              label: 'Afternoon (1 PM – 5 PM)',
                              isSelected: _timeSlot == BookingTimeSlot.afternoon,
                              onTap: () => setState(() => _timeSlot = BookingTimeSlot.afternoon),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      const Text(
                        'REASON FOR VISIT / NOTES (OPTIONAL)',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _notesController,
                        maxLines: 2,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'e.g. Follow-up dose, rabies exposure concern, etc.',
                          hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                          fillColor: Colors.white,
                          filled: true,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
                          ),
                          contentPadding: const EdgeInsets.all(12),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // ─── 5. BOTTOM CTA ───
                      BookingSummary(
                        onConfirm: _continueBooking,
                        isLoading: _booking,
                        confirmLabel: _service == BookingService.consultation
                            ? 'Continue to intake'
                            : 'Confirm booking',
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
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
        showFabNotch: true,
      ),
      floatingActionButton: PatientActionButton(
        onPressed: () => showDigitalVaccinationCard(context),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}

class _TimeSlotChip extends StatelessWidget {
  const _TimeSlotChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE1F5EE) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey.shade200,
            width: isSelected ? 1.5 : 0.5,
          ),
        ),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: isSelected ? const Color(0xFF085041) : const Color(0xFF374151),
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
