// ignore_for_file: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/bite_intake_contract.dart';
import '../models/bite_intake_draft.dart';
import '../models/bite_intake_route_args.dart';
import '../models/booking_draft.dart';
import '../services/api.dart';
import '../services/psgc_service.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_surface.dart';

typedef HugeiconsIcon = HugeIcon;
// ignore: constant_identifier_names
const CatIcon = HugeIcons.strokeRoundedCat;

class BiteIntakeView extends StatefulWidget {
  const BiteIntakeView({super.key, required this.args});

  final BiteIntakeRouteArgs args;

  @override
  State<BiteIntakeView> createState() => _BiteIntakeViewState();
}

class _BiteIntakeViewState extends State<BiteIntakeView> {
  final _formKey = GlobalKey<FormState>();
  final _biteDate = TextEditingController();
  final _purokController = TextEditingController();
  final _animalTypeOthers = TextEditingController();
  final _bodyPartDetail = TextEditingController();
  final _description = TextEditingController();
  final _priorVaccinationFacility = TextEditingController();
  final _pastBiteDates = TextEditingController();

  // Referral & Pre-arrival vitals
  bool _isReferred = false;
  String? _referralMunicipalityCode;
  String? _referralBarangayName;
  final _referralFacility = TextEditingController();
  final _referralSystolic = TextEditingController();
  final _referralDiastolic = TextEditingController();
  final _referralTemperature = TextEditingController();
  final _referralHeight = TextEditingController();
  final _referralWeight = TextEditingController();
  final _referralProvider = TextEditingController();
  String? _referralPhotoName;

  static const List<Map<String, String>> _referralMunicipalities = [
    {'code': 'tagoloan', 'name': 'Tagoloan'},
    {'code': 'cdo', 'name': 'Cagayan de Oro City'},
    {'code': 'balingasag', 'name': 'Balingasag'},
    {'code': 'jasaan', 'name': 'Jasaan'},
    {'code': 'opol', 'name': 'Opol'},
    {'code': 'other', 'name': 'Other / Outside Misamis Oriental'},
  ];

  static const Map<String, List<String>> _referralBarangaysMap = {
    'tagoloan': [
      'Baluarte', 'Casinglot', 'Gracia', 'Mohon', 'Natumolan',
      'Poblacion', 'Rosario', 'Santa Ana', 'Santa Cruz',
      'Sugbongcogon', 'San Francisco', 'San Isidro', 'Tugatog',
      'Lower Becerril', 'Upper Becerril'
    ],
    'cdo': [
      'Agusan', 'Balulang', 'Bayabas', 'Bonbon', 'Bugo', 'Bulua',
      'Camaman-an', 'Carmen', 'Consolacion', 'Cugman', 'Gusa', 'Iponan',
      'Kauswagan', 'Lapasan', 'Macabalan', 'Macasandig', 'Nazareth',
      'Poblacion', 'Puerto', 'Puntod', 'Tablon'
    ],
    'balingasag': [
      'Baliwagan', 'Binitinan', 'Blanco', 'Calawag', 'Camuayan',
      'Cogon', 'Dansuli', 'Dumarait', 'Hermano', 'Kauswagan',
      'Linabu', 'Linggangao', 'Mambayaan', 'Mandangoa', 'Napaliran',
      'Poblacion', 'San Francisco', 'San Isidro', 'San Juan', 'Talusan', 'Waterfall'
    ],
    'jasaan': [
      'Aplaya', 'Bobontugan', 'Corrales', 'Dana-o', 'Jampason',
      'Kimaya', 'Lower Jasaan', 'Luz Banzon', 'Natubo', 'Poblacion',
      'San Antonio', 'San Isidro', 'San Nicolas', 'Solana', 'Upper Jasaan'
    ],
    'opol': [
      'Barra', 'Bonbon', 'Cauyonan', 'Igpit', 'Limonda',
      'Lower Patag', 'Luyong Bonbon', 'Malanang', 'Nangcaon', 'Patag',
      'Poblacion', 'Taboc', 'Upper Patag'
    ],
  };

  int _currentStep = 0; // 0: Patient, 1: Incident, 2: Animal, 3: Previous history, 4: Review and book

  late DateTime _selectedBiteDate;
  TimeOfDay? _incidentTime;
  DateTime? _priorVaccinationDate;

  // Address (place of incident)
  List<PsgcLocation> _municipalities = [];
  List<PsgcLocation> _barangays = [];
  String? _selectedMunicipalityCode;
  String? _selectedMunicipalityName;
  String? _selectedBarangayCode;
  String? _selectedBarangayName;
  bool _loadingMunicipalities = false;
  bool _loadingBarangays = false;

  // Incident
  String? _exposureType;
  String? _bodyPartGroup;
  String? _laterality;

  // Animal (Dog, Cat, Other)
  String _animalType = 'dog';
  String? _animalStatus;
  bool? _animalAvailable;
  String? _animalConditionReported;

  // History
  String? _pastBiteHistory;
  String? _priorPepStatus;

  BiteIntakeContract _contract = BiteIntakeContract.fallback;

  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedBiteDate = DateUtils.dateOnly(DateTime.now());
    _biteDate.text = _formatDate(_selectedBiteDate);
    _loadContract();
    _loadMunicipalities();
  }

  @override
  void dispose() {
    _biteDate.dispose();
    _purokController.dispose();
    _animalTypeOthers.dispose();
    _bodyPartDetail.dispose();
    _description.dispose();
    _referralFacility.dispose();
    _referralSystolic.dispose();
    _referralDiastolic.dispose();
    _referralTemperature.dispose();
    _referralHeight.dispose();
    _referralWeight.dispose();
    _referralProvider.dispose();
    _priorVaccinationFacility.dispose();
    _pastBiteDates.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) => date.toIso8601String().split('T').first;

  String? _optional(TextEditingController c) {
    final v = c.text.trim();
    return v.isEmpty ? null : v;
  }

  void _onReferralMunicipalityChanged(String? code) {
    setState(() {
      _referralMunicipalityCode = code;
      _referralBarangayName = null;
      if (code == 'other') {
        _referralFacility.text = 'Other Medical Facility';
      } else {
        _referralFacility.clear();
      }
    });
  }

  void _onReferralBarangayChanged(String? name) {
    setState(() {
      _referralBarangayName = name;
      if (name != null && _referralMunicipalityCode != null) {
        final munObj = _referralMunicipalities.firstWhere(
          (m) => m['code'] == _referralMunicipalityCode,
          orElse: () => {'code': '', 'name': 'Tagoloan'},
        );
        final munName = munObj['name']!;
        if (name.toLowerCase() == 'poblacion') {
          _referralFacility.text = '$munName Rural Health Unit (RHU) / BHS';
        } else {
          _referralFacility.text = 'Barangay $name Health Station (BHS)';
        }
      }
    });
  }

  String? _buildBloodPressure() {
    final sys = _referralSystolic.text.trim();
    final dia = _referralDiastolic.text.trim();
    if (sys.isEmpty && dia.isEmpty) return null;
    if (sys.isNotEmpty && dia.isNotEmpty) return '$sys/$dia';
    return sys.isNotEmpty ? sys : dia;
  }

  Widget? _buildBpStatusBadge() {
    final sys = int.tryParse(_referralSystolic.text.trim());
    final dia = int.tryParse(_referralDiastolic.text.trim());
    if (sys == null && dia == null) return null;

    String label;
    Color bgColor;
    Color textColor;

    if ((sys != null && sys >= 140) || (dia != null && dia >= 90)) {
      label = 'High BP (Stage 2)';
      bgColor = const Color(0xFFFEE2E2);
      textColor = const Color(0xFF991B1B);
    } else if ((sys != null && sys >= 130) || (dia != null && dia >= 80)) {
      label = 'High BP (Stage 1)';
      bgColor = const Color(0xFFFEF3C7);
      textColor = const Color(0xFF92400E);
    } else if (sys != null && sys >= 120 && (dia == null || dia < 80)) {
      label = 'Elevated BP';
      bgColor = const Color(0xFFFEF9C3);
      textColor = const Color(0xFF854D0E);
    } else if ((sys == null || sys >= 90) && (dia == null || dia >= 60)) {
      label = 'Normal BP';
      bgColor = const Color(0xFFDCFCE7);
      textColor = const Color(0xFF166534);
    } else {
      label = 'Low BP';
      bgColor = const Color(0xFFE0F2FE);
      textColor = const Color(0xFF075985);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: textColor.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: textColor),
      ),
    );
  }

  Widget? _buildTempStatusBadge() {
    final temp = double.tryParse(_referralTemperature.text.trim());
    if (temp == null) return null;

    String label;
    Color bgColor;
    Color textColor;

    if (temp >= 38.5) {
      label = 'High Fever';
      bgColor = const Color(0xFFFEE2E2);
      textColor = const Color(0xFF991B1B);
    } else if (temp >= 37.6) {
      label = 'Low-grade Fever';
      bgColor = const Color(0xFFFEF3C7);
      textColor = const Color(0xFF92400E);
    } else if (temp >= 36.0 && temp <= 37.5) {
      label = 'Normal (36.0–37.5°C)';
      bgColor = const Color(0xFFDCFCE7);
      textColor = const Color(0xFF166534);
    } else {
      label = 'Low Temperature';
      bgColor = const Color(0xFFE0F2FE);
      textColor = const Color(0xFF075985);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: textColor.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: textColor),
      ),
    );
  }

  Future<void> _loadContract() async {
    try {
      final contract = await api.biteIntakeContract() as BiteIntakeContract;
      if (!mounted) return;
      setState(() {
        _contract = contract;
      });
    } catch (_) {
      // Fallback contract remains in place
    }
  }

  Future<void> _loadMunicipalities() async {
    setState(() => _loadingMunicipalities = true);
    try {
      final list = await api.locationMunicipalities() as List<PsgcLocation>;
      if (mounted) setState(() => _municipalities = list);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingMunicipalities = false);
    }
  }

  Future<void> _loadBarangays(String municipalityCode) async {
    setState(() {
      _loadingBarangays = true;
      _barangays = [];
      _selectedBarangayCode = null;
      _selectedBarangayName = null;
    });
    try {
      final list =
          await api.locationBarangays(municipalityCode: municipalityCode)
              as List<PsgcLocation>;
      if (mounted) setState(() => _barangays = list);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingBarangays = false);
    }
  }

  String? _buildBitePlace() {
    final parts = [
      ?_optional(_purokController),
      ?_selectedBarangayName,
      ?_selectedMunicipalityName,
    ];
    return parts.isEmpty ? null : parts.join(', ');
  }

  Future<void> _chooseBiteDate() async {
    final today = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedBiteDate,
      firstDate: DateTime(today.year - 1),
      lastDate: DateTime(today.year, today.month, today.day),
    );
    if (date == null || !mounted) return;
    setState(() {
      _selectedBiteDate = date;
      _biteDate.text = _formatDate(date);
    });
  }

  Future<void> _chooseIncidentTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _incidentTime ?? TimeOfDay.now(),
    );
    if (time != null && mounted) setState(() => _incidentTime = time);
  }

  Future<void> _choosePriorVaccinationDate() async {
    final today = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _priorVaccinationDate ?? DateUtils.dateOnly(today),
      firstDate: DateTime(today.year - 80),
      lastDate: DateUtils.dateOnly(today),
    );
    if (date != null && mounted) setState(() => _priorVaccinationDate = date);
  }

  String? get _incidentTimeValue => _incidentTime == null
      ? null
      : '${_incidentTime!.hour.toString().padLeft(2, '0')}:${_incidentTime!.minute.toString().padLeft(2, '0')}';

  // ── Step Navigation & Validation ───────────────────────────────────────────

  void _validateAndProceedFromIncident() {
    final today = DateUtils.dateOnly(DateTime.now());
    if (DateUtils.dateOnly(_selectedBiteDate).isAfter(today)) {
      setState(() => _error = 'The incident date must be today or earlier.');
      return;
    }
    if (_exposureType == null) {
      setState(() => _error = 'Please select the mode of exposure.');
      return;
    }
    if (_bodyPartGroup == null) {
      setState(() => _error = 'Please select the body-part group.');
      return;
    }
    if (_isReferred && _referralFacility.text.trim().isEmpty) {
      setState(() => _error = 'Please enter or select the referring health facility.');
      return;
    }
    setState(() {
      _error = null;
      _currentStep = 2;
    });
  }

  void _validateAndProceedFromAnimal() {
    if (_animalType.isEmpty) {
      setState(() => _error = 'Please select the type of animal.');
      return;
    }
    if (_animalType == 'other' && _animalTypeOthers.text.trim().isEmpty) {
      setState(() => _error = 'Please specify the other animal species.');
      return;
    }
    if (_animalStatus == null) {
      setState(() => _error = 'Please select animal ownership.');
      return;
    }
    setState(() {
      _error = null;
      _currentStep = 3;
    });
  }

  void _validateAndProceedFromHistory() {
    setState(() {
      _error = null;
      _currentStep = 4;
    });
  }

  // ── Submit Booking ──────────────────────────────────────────────────────────

  Future<void> _submit() async {
    if (_submitting) return;

    final today = DateUtils.dateOnly(DateTime.now());
    if (DateUtils.dateOnly(_selectedBiteDate).isAfter(today)) {
      setState(() => _error = 'The incident date must be today or earlier.');
      return;
    }
    if (_exposureType == null) {
      setState(() => _error = 'Please select the mode of exposure.');
      return;
    }
    if (_animalStatus == null) {
      setState(() => _error = 'Please select the animal ownership.');
      return;
    }
    if (_bodyPartGroup == null) {
      setState(() => _error = 'Please select the body-part group.');
      return;
    }
    if (_animalType == 'other' && _animalTypeOthers.text.trim().isEmpty) {
      setState(() => _error = 'Please specify the other animal species.');
      return;
    }
    final draft = BiteIntakeDraft(
      schemaVersion: _contract.version,
      dateOfExposure: _selectedBiteDate,
      timeOfExposure: _incidentTimeValue,
      placeOfExposure: _buildBitePlace(),
      siteWashed: false,
      washMethod: null,
      washDurationMinutes: null,
      reportedModeOfExposure: _exposureType!,
      animalSpecies: _animalType,
      animalSpeciesOther: _animalType == 'other'
          ? _optional(_animalTypeOthers)
          : null,
      animalOwnership: _animalStatus!,
      animalAvailableForObservation: _animalAvailable,
      animalConditionReported: _animalConditionReported,
      bodyPartGroup: _bodyPartGroup,
      bodyPartDetail: _optional(_bodyPartDetail),
      laterality: _laterality,
      incidentNarrative: _optional(_description),
      careReceived: null,
      referralSource: _isReferred ? _optional(_referralFacility) : null,
      referralFacility: _isReferred ? _optional(_referralFacility) : null,
      referralBloodPressure: _isReferred ? _buildBloodPressure() : null,
      referralTemperature: _isReferred ? _optional(_referralTemperature) : null,
      referralHeight: _isReferred ? _optional(_referralHeight) : null,
      referralWeight: _isReferred ? _optional(_referralWeight) : null,
      referralProviderName: _isReferred ? _optional(_referralProvider) : null,
      referralDocumentPhoto: _isReferred ? _referralPhotoName : null,
      pastBiteHistory: _pastBiteHistory,
      pastBiteDates: _pastBiteHistory == 'yes'
          ? _optional(_pastBiteDates)
          : null,
      priorPepStatus: _priorPepStatus,
      priorPepDate:
          _priorPepStatus == 'completed' || _priorPepStatus == 'incomplete'
              ? _priorVaccinationDate
              : null,
      priorPepFacility:
          _priorPepStatus == 'completed' || _priorPepStatus == 'incomplete'
              ? _optional(_priorVaccinationFacility)
              : null,
    );

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await api.book(
        patient: widget.args.patient,
        booking: widget.args.booking,
        intake: draft,
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(
            Icons.assignment_turned_in_outlined,
            color: AppColors.primary,
            size: 36,
          ),
          title: const Text('Consultation booked'),
          content: Text(
            '${widget.args.patient.name}\'s intake was sent to the clinic for review.',
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
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ── Build UI ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentStep == 0 && !_submitting,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _currentStep > 0 && !_submitting) {
          setState(() {
            _error = null;
            _currentStep--;
          });
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F8F7),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AppPageHeader(
                        title: 'Bite incident intake',
                        subtitle: _contract.notice,
                        onBack: _submitting
                            ? null
                            : () {
                                if (_currentStep > 0) {
                                  setState(() {
                                    _error = null;
                                    _currentStep--;
                                  });
                                } else {
                                  Navigator.of(context).pop();
                                }
                              },
                      ),
                      const SizedBox(height: 16),

                      // Step progress header
                      _buildStepProgressHeader(),
                      const SizedBox(height: 16),

                      // Error banner
                      if (_error case final msg?) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFFCA5A5)),
                          ),
                          child: Text(
                            msg,
                            style: const TextStyle(
                              color: AppColors.error,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Step contents
                      if (_currentStep == 0) _buildPatientStep(),
                      if (_currentStep == 1) _buildIncidentStep(),
                      if (_currentStep == 2) _buildAnimalStep(),
                      if (_currentStep == 3) _buildPreviousHistoryStep(),
                      if (_currentStep == 4) _buildReviewStep(),

                      const SizedBox(height: 20),

                      // Stepper action buttons
                      _buildStepNavigation(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Step Progress Indicator ────────────────────────────────────────────────

  Widget _buildStepProgressHeader() {
    final title = switch (_currentStep) {
      0 => 'Step 1 of 5 — Patient',
      1 => 'Step 2 of 5 — Incident details',
      2 => 'Step 3 of 5 — Animal details',
      3 => 'Step 4 of 5 — Previous history',
      4 => 'Step 5 of 5 — Review and book',
      _ => 'Step 1 of 5 — Patient',
    };

    final percent = switch (_currentStep) {
      0 => '20%',
      1 => '40%',
      2 => '60%',
      3 => '80%',
      4 => '100%',
      _ => '20%',
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
            Text(
              percent,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (int i = 0; i < 5; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: _currentStep >= i
                        ? AppColors.primary
                        : const Color(0xFFE1F5EE),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  // ── Step 1: Patient (Read-only Form 1) ───────────────────────────────────────

  Widget _buildPatientStep() {
    final patient = widget.args.patient;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Icon(Icons.info_outline_rounded, color: Color(0xFF2563EB), size: 18),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Patient demographic data is retrieved from official registration records (Form 1). If updates are needed, please edit your patient profile.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF1E40AF), height: 1.35),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        MenuSurface(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _sectionHeader(Icons.person_outline_rounded, 'Patient details'),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(child: _readField('First name', patient.firstName)),
                  const SizedBox(width: 12),
                  Expanded(child: _readField('Last name', patient.lastName)),
                ],
              ),
              Row(
                children: [
                  Expanded(child: _readField('Date of birth', patient.dateOfBirth)),
                  const SizedBox(width: 12),
                  Expanded(child: _readField('Sex', patient.gender)),
                ],
              ),
              _readField('Contact number', patient.contactNumber),
              _readField('Address', patient.address),
            ],
          ),
        ),
      ],
    );
  }

  // ── Step 2: Incident Details ───────────────────────────────────────────────

  Widget _buildIncidentStep() {
    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _sectionHeader(Icons.event_outlined, 'Incident details'),
          const SizedBox(height: 4),
          const Text(
            'Provide factual information regarding when, where, and how the exposure happened.',
            style: TextStyle(fontSize: 12, color: AppColors.gray600),
          ),
          const SizedBox(height: 14),

          // Date of incident
          _label('Date of incident *'),
          TextFormField(
            controller: _biteDate,
            readOnly: true,
            onTap: _submitting ? null : _chooseBiteDate,
            decoration: InputDecoration(
              suffixIcon: IconButton(
                tooltip: 'Choose incident date',
                onPressed: _submitting ? null : _chooseBiteDate,
                icon: const Icon(Icons.event_outlined),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Time of incident
          _label('Approximate time of incident'),
          InkWell(
            onTap: _submitting ? null : _chooseIncidentTime,
            child: InputDecorator(
              decoration: const InputDecoration(
                suffixIcon: Icon(Icons.schedule_outlined),
              ),
              child: Text(
                _incidentTime?.format(context) ?? 'Select time (optional)',
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Place of incident (PSGC)
          _label('Place of incident'),
          const SizedBox(height: 4),

          // Municipality
          _label('Municipality *'),
          _municipalities.isEmpty && !_loadingMunicipalities
              ? TextFormField(
                  controller: _purokController,
                  enabled: !_submitting,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Barangay 5, Tagoloan',
                  ),
                  textCapitalization: TextCapitalization.words,
                )
              : DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: _selectedMunicipalityCode,
                  hint: Text(
                    _loadingMunicipalities
                        ? 'Loading municipalities...'
                        : 'Select municipality',
                  ),
                  items: _municipalities
                      .map(
                        (m) => DropdownMenuItem(
                          value: m.code,
                          child: Text(
                            m.name,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: _submitting || _loadingMunicipalities
                      ? null
                      : (code) {
                          setState(() {
                            _selectedMunicipalityCode = code;
                            _selectedMunicipalityName = _municipalities
                                .firstWhere((m) => m.code == code)
                                .name;
                            _selectedBarangayCode = null;
                            _selectedBarangayName = null;
                          });
                          if (code != null) {
                            _loadBarangays(code);
                          }
                        },
                ),
          const SizedBox(height: 10),

          // Barangay
          if (_municipalities.isNotEmpty) ...[
            _label('Barangay'),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: _selectedBarangayCode,
              hint: Text(
                _loadingBarangays
                    ? 'Loading barangays...'
                    : _selectedMunicipalityCode == null
                    ? 'Select municipality first'
                    : 'Select barangay',
              ),
              items: _barangays
                  .map(
                    (b) => DropdownMenuItem(
                      value: b.code,
                      child: Text(
                        b.name,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: _submitting ||
                      _loadingBarangays ||
                      _selectedMunicipalityCode == null
                  ? null
                  : (code) {
                      setState(() {
                        _selectedBarangayCode = code;
                        _selectedBarangayName = _barangays
                            .firstWhere((b) => b.code == code)
                            .name;
                      });
                    },
            ),
            const SizedBox(height: 10),
          ],

          // Purok / street
          _label('Purok / Zone / Street'),
          TextFormField(
            controller: _purokController,
            enabled: !_submitting,
            decoration: const InputDecoration(
              hintText: 'e.g. Purok 3, Rizal St.',
            ),
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 16),

          // Mode of exposure
          _label('Mode of exposure *'),
          ..._contract.exposureModes.entries.map(
            (opt) => RadioListTile<String>(
              value: opt.key,
              groupValue: _exposureType,
              title: Text(
                opt.value,
                style: const TextStyle(fontSize: 13),
              ),
              contentPadding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
              activeColor: AppColors.primary,
              onChanged: _submitting
                  ? null
                  : (v) => setState(() => _exposureType = v),
            ),
          ),
          const SizedBox(height: 16),

          // Body-part group
          _label('Body-part group *'),
          ..._contract.bodyPartGroups.entries.map(
            (opt) => RadioListTile<String>(
              value: opt.key,
              groupValue: _bodyPartGroup,
              title: Text(
                opt.value,
                style: const TextStyle(fontSize: 13),
              ),
              contentPadding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
              activeColor: AppColors.primary,
              onChanged: _submitting
                  ? null
                  : (v) => setState(() => _bodyPartGroup = v),
            ),
          ),
          const SizedBox(height: 16),

          // Specific body part
          _label('Specific body part or wound location'),
          TextFormField(
            controller: _bodyPartDetail,
            enabled: !_submitting,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'e.g. palm, index finger, lower leg',
            ),
          ),
          const SizedBox(height: 16),

          // Laterality
          _label('Side of body'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _laterality,
            hint: const Text('Select side'),
            items: _contract.laterality.entries
                .map(
                  (e) => DropdownMenuItem(
                    value: e.key,
                    child: Text(
                      e.value,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                )
                .toList(),
            onChanged: _submitting
                ? null
                : (v) => setState(() => _laterality = v),
          ),
          const SizedBox(height: 18),

          _label('Patient description of the incident'),
          TextFormField(
            controller: _description,
            enabled: !_submitting,
            minLines: 3,
            maxLines: 5,
            maxLength: 2000,
            decoration: const InputDecoration(
              hintText: 'Describe what happened and any visible signs.',
            ),
          ),
          const SizedBox(height: 18),

          // Referral section
          _sectionHeader(
            Icons.local_hospital_outlined,
            'Facility referral & pre-arrival vitals',
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Referred from another facility?',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Barangay Health Station (BHS), RHU, or clinic',
                        style: TextStyle(fontSize: 12, color: AppColors.gray600),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _isReferred,
                  activeColor: AppColors.primary,
                  onChanged: _submitting
                      ? null
                      : (val) {
                          setState(() {
                            _isReferred = val;
                            if (!val) {
                              _referralFacility.clear();
                              _referralMunicipalityCode = null;
                              _referralBarangayName = null;
                              _referralPhotoName = null;
                              _referralSystolic.clear();
                              _referralDiastolic.clear();
                              _referralTemperature.clear();
                              _referralHeight.clear();
                              _referralWeight.clear();
                              _referralProvider.clear();
                            }
                          });
                        },
                ),
              ],
            ),
          ),

          if (_isReferred) ...[
            const SizedBox(height: 14),
            // 3-tier Referral Location
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Referred by Location',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // 1. City / Municipality
                  _label('1. City / Municipality *'),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _referralMunicipalityCode,
                    hint: const Text('— Select Municipality —'),
                    items: _referralMunicipalities
                        .map(
                          (m) => DropdownMenuItem(
                            value: m['code'],
                            child: Text(m['name']!),
                          ),
                        )
                        .toList(),
                    onChanged: _submitting ? null : _onReferralMunicipalityChanged,
                  ),
                  const SizedBox(height: 12),

                  // 2. Barangay
                  _label('2. Barangay'),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _referralBarangayName,
                    hint: Text(
                      _referralMunicipalityCode == null
                          ? '— Select Municipality First —'
                          : (_referralMunicipalityCode == 'other'
                              ? 'Outside Misamis Oriental'
                              : '— Select Barangay —'),
                    ),
                    items: (_referralMunicipalityCode != null &&
                            _referralBarangaysMap.containsKey(_referralMunicipalityCode))
                        ? _referralBarangaysMap[_referralMunicipalityCode]!
                            .map(
                              (b) => DropdownMenuItem(
                                value: b,
                                child: Text(b),
                              ),
                            )
                            .toList()
                        : const [],
                    onChanged: (_submitting ||
                            _referralMunicipalityCode == null ||
                            _referralMunicipalityCode == 'other')
                        ? null
                        : _onReferralBarangayChanged,
                  ),
                  const SizedBox(height: 12),

                  // 3. Health Center / Facility Name
                  _label('3. Health Center / Facility Name *'),
                  TextFormField(
                    controller: _referralFacility,
                    enabled: !_submitting,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Barangay Kimalok Health Station (BHS)',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Referral Slip Photo
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Referral Slip Photo (Optional)',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Attach photo of the paper referral form received from the health station.',
                    style: TextStyle(fontSize: 11.5, color: AppColors.gray600),
                  ),
                  const SizedBox(height: 10),

                  if (_referralPhotoName != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _referralPhotoName!,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF065F46)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF991B1B)),
                            onPressed: _submitting ? null : () => setState(() => _referralPhotoName = null),
                            tooltip: 'Remove photo',
                            visualDensity: VisualDensity.compact,
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    OutlinedButton.icon(
                      icon: const Icon(Icons.camera_alt_outlined, size: 18),
                      label: const Text('Attach referral paper form photo'),
                      onPressed: _submitting
                          ? null
                          : () {
                              setState(() {
                                _referralPhotoName = 'referral_slip_${DateTime.now().millisecondsSinceEpoch}.jpg';
                              });
                            },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Pre-arrival Vitals from Referral Form (Optional - Doctor will confirm onsite)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.monitor_heart_outlined, color: AppColors.primary, size: 18),
                      const SizedBox(width: 6),
                      const Expanded(
                        child: Text(
                          'Pre-Arrival Vitals from Referral Form',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Optional — doctor will re-check and confirm these onsite.',
                    style: TextStyle(fontSize: 11.5, color: AppColors.gray600, fontStyle: FontStyle.italic),
                  ),
                  const SizedBox(height: 12),

                  // Blood Pressure (mmHg)
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      _label('Blood Pressure (mmHg)'),
                      if (_buildBpStatusBadge() != null) _buildBpStatusBadge()!,
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _referralSystolic,
                          enabled: !_submitting,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            hintText: '120',
                            labelText: 'Systolic',
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text('/', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF9CA3AF))),
                      ),
                      Expanded(
                        child: TextFormField(
                          controller: _referralDiastolic,
                          enabled: !_submitting,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            hintText: '80',
                            labelText: 'Diastolic',
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Temperature (°C)
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      _label('Temperature (°C)'),
                      if (_buildTempStatusBadge() != null) _buildTempStatusBadge()!,
                    ],
                  ),
                  TextFormField(
                    controller: _referralTemperature,
                    enabled: !_submitting,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      hintText: 'e.g. 36.5',
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 12),

                  // Height & Weight side by side
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label('Height (cm)'),
                            TextFormField(
                              controller: _referralHeight,
                              enabled: !_submitting,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(hintText: 'e.g. 150'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label('Weight (kg)'),
                            TextFormField(
                              controller: _referralWeight,
                              enabled: !_submitting,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(hintText: 'e.g. 50'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Attending Provider Name
                  _label('Name of Attending Provider'),
                  TextFormField(
                    controller: _referralProvider,
                    enabled: !_submitting,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Triage Doctor from referral paper form',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Step 3: Animal Details ─────────────────────────────────────────────────

  Widget _buildAnimalStep() {
    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _sectionHeader(Icons.pets_rounded, 'Animal details'),
          const SizedBox(height: 4),
          const Text(
            'Information regarding the animal that caused the exposure.',
            style: TextStyle(fontSize: 12, color: AppColors.gray600),
          ),
          const SizedBox(height: 16),

          _label('Type of animal *'),
          Row(
            children: [
              _animalTypeChip('dog', 'Dog', icon: LucideIcons.dog),
              const SizedBox(width: 8),
              _animalTypeChip(
                'cat',
                'Cat',
                customIcon: HugeiconsIcon(
                  icon: CatIcon,
                  size: 22,
                  color: _animalType == 'cat' ? AppColors.primary : const Color(0xFF6B7280),
                ),
              ),
              const SizedBox(width: 8),
              _animalTypeChip('other', 'Other', icon: LucideIcons.helpCircle),
            ],
          ),
          if (_animalType == 'other') ...[
            const SizedBox(height: 12),
            _label('Specify animal species *'),
            TextFormField(
              controller: _animalTypeOthers,
              enabled: !_submitting,
              decoration: const InputDecoration(
                hintText: 'e.g. Bat, Monkey, Pig, etc.',
              ),
              textCapitalization: TextCapitalization.sentences,
              validator: (v) {
                if (_animalType == 'other' && (v == null || v.trim().isEmpty)) {
                  return 'Please specify the animal species';
                }
                return null;
              },
            ),
          ],
          const SizedBox(height: 16),

          _label('Animal ownership *'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _animalStatus,
            hint: const Text('Select ownership'),
            items: _contract.animalOwnership.entries
                .map(
                  (e) => DropdownMenuItem(
                    value: e.key,
                    child: Text(e.value, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
            onChanged: _submitting ? null : (v) => setState(() => _animalStatus = v),
            validator: (v) => v == null ? 'Animal ownership is required' : null,
          ),
          const SizedBox(height: 14),

          _label('Is the animal available for observation?'),
          DropdownButtonFormField<bool?>(
            isExpanded: true,
            initialValue: _animalAvailable,
            items: const [
              DropdownMenuItem(value: true, child: Text('Yes')),
              DropdownMenuItem(value: false, child: Text('No')),
            ],
            hint: const Text('Unsure / not known'),
            onChanged: _submitting ? null : (v) => setState(() => _animalAvailable = v),
          ),
          const SizedBox(height: 14),

          _label('Animal condition as observed or reported'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _animalConditionReported,
            hint: const Text('Select condition'),
            items: _contract.animalConditions.entries
                .map(
                  (entry) => DropdownMenuItem(
                    value: entry.key,
                    child: Text(entry.value, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
            onChanged: _submitting
                ? null
                : (v) => setState(() => _animalConditionReported = v),
          ),
        ],
      ),
    );
  }

  Widget _animalTypeChip(String value, String label, {IconData? icon, Widget? customIcon}) {
    final selected = _animalType == value;
    return Expanded(
      child: InkWell(
        onTap: _submitting
            ? null
            : () => setState(() {
                _animalType = value;
                if (value != 'other') {
                  _animalTypeOthers.clear();
                }
              }),
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFE1F5EE) : const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? AppColors.primary : const Color(0xFFE5E7EB),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              customIcon ??
                  Icon(
                    icon,
                    size: 22,
                    color: selected ? AppColors.primary : const Color(0xFF6B7280),
                  ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? AppColors.primary : const Color(0xFF374151),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Step 4: Previous History ───────────────────────────────────────────────

  Widget _buildPreviousHistoryStep() {
    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _sectionHeader(Icons.history_rounded, 'Previous history'),
          const SizedBox(height: 4),
          const Text(
            'Past bite incidents and previous rabies vaccinations. Clinic staff will verify prior records.',
            style: TextStyle(fontSize: 12, color: AppColors.gray600),
          ),
          const SizedBox(height: 16),

          _label('Previous animal-bite history'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _pastBiteHistory,
            hint: const Text('Select answer'),
            items: _contract.pastBiteHistory.entries
                .map(
                  (entry) => DropdownMenuItem(
                    value: entry.key,
                    child: Text(entry.value, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
            onChanged: _submitting ? null : (v) => setState(() => _pastBiteHistory = v),
          ),
          if (_pastBiteHistory == 'yes') ...[
            const SizedBox(height: 14),
            _label('Approximate previous bite date or dates'),
            TextFormField(
              controller: _pastBiteDates,
              enabled: !_submitting,
              decoration: const InputDecoration(
                hintText: 'e.g. June 2024',
              ),
            ),
          ],
          const SizedBox(height: 16),

          _label('Previous PEP / rabies vaccination'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _priorPepStatus,
            hint: const Text('Select status'),
            items: _contract.priorPepStatuses.entries
                .map(
                  (entry) => DropdownMenuItem(
                    value: entry.key,
                    child: Text(entry.value, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
            onChanged: _submitting ? null : (v) => setState(() => _priorPepStatus = v),
          ),
          if (_priorPepStatus == 'completed' || _priorPepStatus == 'incomplete') ...[
            const SizedBox(height: 14),
            _label('Approximate date of previous PEP'),
            InkWell(
              onTap: _submitting ? null : _choosePriorVaccinationDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  suffixIcon: Icon(Icons.event_outlined),
                ),
                child: Text(
                  _priorVaccinationDate == null
                      ? 'Select date (optional)'
                      : _formatDate(_priorVaccinationDate!),
                ),
              ),
            ),
            const SizedBox(height: 14),
            _label('Previous PEP facility'),
            TextFormField(
              controller: _priorVaccinationFacility,
              enabled: !_submitting,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                hintText: 'e.g. Tagoloan RHU, NMMC, etc.',
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Step 5: Review and Book ────────────────────────────────────────────────

  Widget _buildReviewStep() {
    final patient = widget.args.patient;
    final booking = widget.args.booking;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Disclaimer Banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Patient-Reported Intake · Verification Required',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF92400E),
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'All details below are patient-reported. Exposure category, physical wound evaluation, and vaccination plan are strictly determined by the clinic physician during your visit.',
                      style: TextStyle(fontSize: 11.5, color: Color(0xFFB45309), height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Appointment summary card
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _summaryHeader('Appointment details', Icons.calendar_today_outlined, null),
              const SizedBox(height: 8),
              _reviewRow('Service', booking.service.label),
              _reviewRow('Scheduled date', _formatDate(booking.date)),
              if (booking.notes != null && booking.notes!.trim().isNotEmpty)
                _reviewRow('Booking notes', booking.notes!.trim()),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 1. Patient summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _summaryHeader('1. Patient', Icons.person_outline_rounded, 0),
              const SizedBox(height: 8),
              _reviewRow('Patient name', patient.name),
              _reviewRow('Date of birth', patient.dateOfBirth ?? '—'),
              _reviewRow('Sex', patient.gender ?? '—'),
              _reviewRow('Contact', patient.contactNumber ?? '—'),
              _reviewRow('Address', patient.address ?? '—'),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. Incident summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _summaryHeader('2. Incident details', Icons.event_outlined, 1),
              const SizedBox(height: 8),
              _reviewRow('Date of incident', _formatDate(_selectedBiteDate)),
              if (_incidentTimeValue != null)
                _reviewRow('Approximate time', _incidentTimeValue!),
              _reviewRow('Place of incident', _buildBitePlace() ?? '—'),
              _reviewRow('Mode of exposure', _contract.exposureModes[_exposureType] ?? _exposureType ?? '—'),
              _reviewRow('Body-part group', _contract.bodyPartGroups[_bodyPartGroup] ?? _bodyPartGroup ?? '—'),
              if (_bodyPartDetail.text.trim().isNotEmpty)
                _reviewRow('Specific location', _bodyPartDetail.text.trim()),
              if (_laterality != null)
                _reviewRow('Side of body', _contract.laterality[_laterality] ?? _laterality!),
              if (_description.text.trim().isNotEmpty)
                _reviewRow('Description', _description.text.trim()),
              if (_isReferred) ...[
                _reviewRow('Facility referral', _referralFacility.text.trim()),
                if (_referralPhotoName != null)
                  _reviewRow('Referral slip photo', 'Attached'),
                if (_buildBloodPressure() != null)
                  _reviewRow('Pre-arrival BP', '${_buildBloodPressure()} mmHg'),
                if (_referralTemperature.text.trim().isNotEmpty)
                  _reviewRow('Pre-arrival Temp', '${_referralTemperature.text.trim()} °C'),
                if (_referralHeight.text.trim().isNotEmpty)
                  _reviewRow('Height', '${_referralHeight.text.trim()} cm'),
                if (_referralWeight.text.trim().isNotEmpty)
                  _reviewRow('Weight', '${_referralWeight.text.trim()} kg'),
                if (_referralProvider.text.trim().isNotEmpty)
                  _reviewRow('Attending provider', _referralProvider.text.trim()),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 3. Animal summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _summaryHeader('3. Animal details', Icons.pets_rounded, 2),
              const SizedBox(height: 8),
              _reviewRow(
                'Type of animal',
                _animalType == 'other'
                    ? 'Other (${_animalTypeOthers.text.trim()})'
                    : (_animalType == 'dog' ? 'Dog' : 'Cat'),
              ),
              _reviewRow('Ownership', _contract.animalOwnership[_animalStatus] ?? _animalStatus ?? '—'),
              _reviewRow(
                'Available for observation',
                _animalAvailable == null
                    ? 'Unsure / not known'
                    : (_animalAvailable! ? 'Yes' : 'No'),
              ),
              if (_animalConditionReported != null)
                _reviewRow(
                  'Reported condition',
                  _contract.animalConditions[_animalConditionReported] ?? _animalConditionReported!,
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 4. Previous history summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _summaryHeader('4. Previous history', Icons.history_rounded, 3),
              const SizedBox(height: 8),
              _reviewRow(
                'Past bite history',
                _contract.pastBiteHistory[_pastBiteHistory] ?? _pastBiteHistory ?? 'Not reported',
              ),
              if (_pastBiteHistory == 'yes' && _pastBiteDates.text.trim().isNotEmpty)
                _reviewRow('Past bite date(s)', _pastBiteDates.text.trim()),
              _reviewRow(
                'Prior PEP vaccination',
                _contract.priorPepStatuses[_priorPepStatus] ?? _priorPepStatus ?? 'Not reported',
              ),
              if (_priorVaccinationDate != null)
                _reviewRow('Prior PEP date', _formatDate(_priorVaccinationDate!)),
              if (_priorVaccinationFacility.text.trim().isNotEmpty)
                _reviewRow('Prior PEP facility', _priorVaccinationFacility.text.trim()),
            ],
          ),
        ),
      ],
    );
  }

  // ── Step Navigation Bar ────────────────────────────────────────────────────

  Widget _buildStepNavigation() {
    switch (_currentStep) {
      case 0:
        return PrimaryActionButton(
          label: 'Next: Incident details',
          onPressed: () => setState(() {
            _error = null;
            _currentStep = 1;
          }),
        );
      case 1:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() {
                  _error = null;
                  _currentStep = 0;
                }),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Next: Animal details',
                onPressed: _validateAndProceedFromIncident,
              ),
            ),
          ],
        );
      case 2:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() {
                  _error = null;
                  _currentStep = 1;
                }),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Next: Previous history',
                onPressed: _validateAndProceedFromAnimal,
              ),
            ),
          ],
        );
      case 3:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() {
                  _error = null;
                  _currentStep = 2;
                }),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Next: Review and book',
                onPressed: _validateAndProceedFromHistory,
              ),
            ),
          ],
        );
      case 4:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _submitting
                    ? null
                    : () => setState(() {
                        _error = null;
                        _currentStep = 3;
                      }),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Confirm and book',
                isLoading: _submitting,
                onPressed: _submit,
              ),
            ),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Widget _sectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: const Color(0xFFE1F5EE),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
            ),
          ),
        ),
      ],
    );
  }

  Widget _summaryHeader(String title, IconData icon, int? editStep) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: AppColors.primary),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
              ),
            ),
          ],
        ),
        if (editStep != null)
          InkWell(
            onTap: _submitting ? null : () => setState(() => _currentStep = editStep),
            borderRadius: BorderRadius.circular(4),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              child: Text(
                'Edit',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.gray600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF1F2937),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text,
          style: const TextStyle(
            color: AppColors.gray700,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      );

  Widget _readField(String label, String? value) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _label(label),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Text(
                value ?? '—',
                style: const TextStyle(fontSize: 13, color: Color(0xFF374151)),
              ),
            ),
          ],
        ),
      );
}
