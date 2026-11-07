// ignore_for_file: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../models/referral_photo.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/bite_intake_contract.dart';
import '../models/bite_intake_draft.dart';
import '../models/bite_intake_route_args.dart';
import '../services/api.dart';
import '../services/psgc_service.dart';
import '../widgets/bite_intake/constants/referral_locations.dart';
import '../widgets/bite_intake/helpers/intake_ui_helpers.dart';
import '../widgets/bite_intake/helpers/vitals_helper.dart';
import '../widgets/bite_intake/steps/step_animal.dart';
import '../widgets/bite_intake/steps/step_history.dart';
import '../widgets/bite_intake/steps/step_incident.dart';
import '../widgets/bite_intake/steps/step_patient.dart';
import '../widgets/bite_intake/steps/step_review.dart';
import '../widgets/common/app_page_header.dart';

/// Screen coordinating patient-reported bite incident intake and pre-booking review.
class BiteIntakeView extends StatefulWidget {
  const BiteIntakeView({super.key, required this.args, this.pickReferralPhoto});

  final BiteIntakeRouteArgs args;
  final Future<XFile?> Function()? pickReferralPhoto;

  @override
  State<BiteIntakeView> createState() => _BiteIntakeViewState();
}

class _BiteIntakeViewState extends State<BiteIntakeView> {
  final _formKey = GlobalKey<FormState>();
  final Set<int> _validatedSteps = {};

  bool _validateVisibleStep() {
    FocusScope.of(context).unfocus();
    setState(() {
      _validatedSteps.add(_currentStep);
      _error = null;
    });
    final invalid = _formKey.currentState!.validateGranularly();
    if (invalid.isEmpty) return true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final fields = invalid.where((field) => field.mounted).toList();
      fields.sort((a, b) {
        final aBox = a.context.findRenderObject() as RenderBox;
        final bBox = b.context.findRenderObject() as RenderBox;
        return aBox
            .localToGlobal(Offset.zero)
            .dy
            .compareTo(bBox.localToGlobal(Offset.zero).dy);
      });
      if (fields.isNotEmpty) {
        Scrollable.ensureVisible(
          fields.first.context,
          alignment: 0.1,
          duration: const Duration(milliseconds: 300),
        );
      }
    });
    return false;
  }

  // Incident & demographics controllers
  final _biteDate = TextEditingController();
  final _purokController = TextEditingController();
  final _bodyPartDetail = TextEditingController();
  final _description = TextEditingController();

  // Referral controllers & state
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
  String? _referralPhotoData;
  bool _pickingPhoto = false;

  Future<void> _attachReferralPhoto() async {
    if (_pickingPhoto || _submitting) return;
    setState(() => _pickingPhoto = true);
    try {
      final file =
          await (widget.pickReferralPhoto?.call() ??
              ImagePicker().pickImage(
                source: ImageSource.gallery,
                requestFullMetadata: false,
              ));
      if (file == null) return;
      if (await file.length() > ReferralPhoto.maxBytes) {
        throw const FormatException(ReferralPhoto.sizeError);
      }
      final data = ReferralPhoto.encode(await file.readAsBytes());
      if (!mounted || !_isReferred) return;
      setState(() {
        _referralPhotoName = file.name;
        _referralPhotoData = data;
      });
    } catch (error) {
      if (!mounted) return;
      final String message;
      if (error is FormatException) {
        message = error.message;
      } else if (error is MissingPluginException ||
          (error is PlatformException && error.code == 'channel-error')) {
        message =
            'The photo picker is not available in this app session. '
            'Fully stop and rebuild the app, then try again.';
      } else if (error is PlatformException &&
          [
            'photo_access_denied',
            'photo_access_restricted',
          ].contains(error.code)) {
        message =
            'Photo access is disabled. Allow photo access for ABTCare '
            'in your phone settings, then try again.';
      } else if (error is PlatformException && error.code == 'already_active') {
        message = 'The photo picker is already open. Close it and try again.';
      } else if (error is PlatformException) {
        message =
            'The photo picker could not open this photo (${error.code}). '
            'Try a JPG or PNG saved on your phone.';
      } else {
        message =
            'Could not read this photo. Try a JPG or PNG saved on your phone.';
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _pickingPhoto = false);
    }
  }

  // History controllers
  final _pastBiteDates = TextEditingController();
  final _priorVaccinationFacility = TextEditingController();

  // Stepper state
  int _currentStep =
      0; // 0: Patient, 1: Incident, 2: Animal, 3: Previous history, 4: Review and book

  late DateTime _selectedBiteDate;
  TimeOfDay? _incidentTime;
  DateTime? _priorVaccinationDate;

  // PSGC location state (incident place)
  List<PsgcLocation> _municipalities = [];
  List<PsgcLocation> _barangays = [];
  String? _selectedMunicipalityCode;
  String? _selectedMunicipalityName;
  String? _selectedBarangayCode;
  String? _selectedBarangayName;
  bool _loadingMunicipalities = false;
  bool _loadingBarangays = false;

  // Clinical exposure state
  String? _exposureType;
  String? _bodyPartGroup;
  String? _laterality;

  // Animal state
  String _animalType = 'dog';
  String? _animalStatus;
  bool? _animalAvailable;
  String? _animalConditionReported;

  // History state
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
        _referralFacility.text = suggestReferralFacility(
          _referralMunicipalityCode!,
          name,
        );
      }
    });
  }

  Future<void> _loadContract() async {
    try {
      final contract = await api.biteIntakeContract() as BiteIntakeContract;
      if (!mounted) return;
      setState(() => _contract = contract);
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

  Future<void> _choosePastBiteDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final date = await showDatePicker(
      context: context,
      helpText: 'Choose approximate previous bite date',
      initialDate: today,
      firstDate: DateTime(1900),
      lastDate: today,
    );
    if (date == null || !mounted || _pastBiteHistory != 'yes') return;
    final value = _formatDate(date);
    final dates = _pastBiteDates.text.split(',').map((v) => v.trim())
        .where((v) => v.isNotEmpty).toList();
    if (!dates.contains(value)) dates.add(value);
    setState(() => _pastBiteDates.text = dates.join(', '));
  }

  void _changePastBiteHistory(String? value) {
    setState(() {
      _pastBiteHistory = value;
      if (value != 'yes') {
        _pastBiteDates.clear();
        _priorPepStatus = null;
        _priorVaccinationDate = null;
        _priorVaccinationFacility.clear();
      }
    });
  }

  String? get _incidentTimeValue => _incidentTime == null
      ? null
      : '${_incidentTime!.hour.toString().padLeft(2, '0')}:${_incidentTime!.minute.toString().padLeft(2, '0')}';

  // ── Step Navigation & Validation ───────────────────────────────────────────

  void _validateAndProceedFromIncident() {
    if (!_validateVisibleStep()) return;
    setState(() {
      _error = null;
      _currentStep = 2;
    });
  }

  void _validateAndProceedFromAnimal() {
    if (!_validateVisibleStep()) return;
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
    if (_submitting || _pickingPhoto) return;

    final today = DateUtils.dateOnly(DateTime.now());
    final invalidIncident =
        DateUtils.dateOnly(_selectedBiteDate).isAfter(today) ||
        _exposureType == null ||
        _bodyPartGroup == null ||
        (_isReferred &&
            [
              _referralFacility,
              _referralSystolic,
              _referralDiastolic,
              _referralTemperature,
              _referralHeight,
              _referralWeight,
              _referralProvider,
            ].any((controller) => controller.text.trim().isEmpty));
    final invalidAnimal = _animalStatus == null;
    if (invalidIncident || invalidAnimal) {
      setState(() => _currentStep = invalidIncident ? 1 : 2);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _validateVisibleStep();
      });
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
      referralBloodPressure: _isReferred
          ? formatBloodPressure(_referralSystolic.text, _referralDiastolic.text)
          : null,
      referralTemperature: _isReferred ? _optional(_referralTemperature) : null,
      referralHeight: _isReferred ? _optional(_referralHeight) : null,
      referralWeight: _isReferred ? _optional(_referralWeight) : null,
      referralProviderName: _isReferred ? _optional(_referralProvider) : null,
      referralDocumentPhoto: _isReferred ? _referralPhotoData : null,
      pastBiteHistory: _pastBiteHistory,
      pastBiteDates: _pastBiteHistory == 'yes'
          ? _optional(_pastBiteDates)
          : null,
      priorPepStatus: _pastBiteHistory == 'yes' ? _priorPepStatus : null,
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
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
                child: Form(
                  key: _formKey,
                  autovalidateMode: _validatedSteps.contains(_currentStep)
                      ? AutovalidateMode.always
                      : AutovalidateMode.disabled,
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
                      IntakeStepProgress(currentStep: _currentStep),
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
                      if (_currentStep == 0)
                        StepPatient(patient: widget.args.patient),
                      if (_currentStep == 1)
                        StepIncident(
                          biteDateController: _biteDate,
                          onChooseBiteDate: _chooseBiteDate,
                          incidentTime: _incidentTime,
                          onChooseIncidentTime: _chooseIncidentTime,
                          purokController: _purokController,
                          municipalities: _municipalities,
                          barangays: _barangays,
                          selectedMunicipalityCode: _selectedMunicipalityCode,
                          selectedBarangayCode: _selectedBarangayCode,
                          loadingMunicipalities: _loadingMunicipalities,
                          loadingBarangays: _loadingBarangays,
                          onMunicipalityChanged: (code) {
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
                          onBarangayChanged: (code) {
                            setState(() {
                              _selectedBarangayCode = code;
                              _selectedBarangayName = _barangays
                                  .firstWhere((b) => b.code == code)
                                  .name;
                            });
                          },
                          exposureType: _exposureType,
                          onExposureTypeChanged: (v) =>
                              setState(() => _exposureType = v),
                          exposureModes: _contract.exposureModes,
                          bodyPartGroup: _bodyPartGroup,
                          onBodyPartGroupChanged: (v) =>
                              setState(() => _bodyPartGroup = v),
                          bodyPartGroups: _contract.bodyPartGroups,
                          bodyPartDetailController: _bodyPartDetail,
                          laterality: _laterality,
                          onLateralityChanged: (v) =>
                              setState(() => _laterality = v),
                          lateralityOptions: _contract.laterality,
                          descriptionController: _description,
                          isReferred: _isReferred,
                          onReferredChanged: (val) {
                            setState(() {
                              _isReferred = val;
                              if (!val) {
                                _referralFacility.clear();
                                _referralMunicipalityCode = null;
                                _referralBarangayName = null;
                                _referralPhotoName = null;
                                _referralPhotoData = null;
                                _referralSystolic.clear();
                                _referralDiastolic.clear();
                                _referralTemperature.clear();
                                _referralHeight.clear();
                                _referralWeight.clear();
                                _referralProvider.clear();
                              }
                            });
                          },
                          referralMunicipalityCode: _referralMunicipalityCode,
                          onReferralMunicipalityChanged:
                              _onReferralMunicipalityChanged,
                          referralBarangayName: _referralBarangayName,
                          onReferralBarangayChanged: _onReferralBarangayChanged,
                          referralFacilityController: _referralFacility,
                          referralPhotoName: _referralPhotoName,
                          referralPhotoData: _referralPhotoData,
                          pickingPhoto: _pickingPhoto,
                          onAttachPhoto: _attachReferralPhoto,
                          onRemovePhoto: () => setState(() {
                            _referralPhotoName = null;
                            _referralPhotoData = null;
                          }),
                          referralSystolicController: _referralSystolic,
                          referralDiastolicController: _referralDiastolic,
                          referralTemperatureController: _referralTemperature,
                          referralHeightController: _referralHeight,
                          referralWeightController: _referralWeight,
                          referralProviderController: _referralProvider,
                          isSubmitting: _submitting,
                        ),
                      if (_currentStep == 2)
                        StepAnimal(
                          animalType: _animalType,
                          onAnimalTypeChanged: (value) {
                            setState(() {
                              _animalType = value;
                            });
                          },
                          animalStatus: _animalStatus,
                          onAnimalStatusChanged: (v) =>
                              setState(() => _animalStatus = v),
                          animalOwnershipOptions: _contract.animalOwnership,
                          animalAvailable: _animalAvailable,
                          onAnimalAvailableChanged: (v) =>
                              setState(() => _animalAvailable = v),
                          animalConditionReported: _animalConditionReported,
                          onAnimalConditionChanged: (v) =>
                              setState(() => _animalConditionReported = v),
                          animalConditionOptions: _contract.animalConditions,
                          isSubmitting: _submitting,
                        ),
                      if (_currentStep == 3)
                        StepHistory(
                          pastBiteHistory: _pastBiteHistory,
                          onPastBiteHistoryChanged: _changePastBiteHistory,
                          pastBiteHistoryOptions: _contract.pastBiteHistory,
                          pastBiteDatesController: _pastBiteDates,
                          onChoosePastBiteDate: _choosePastBiteDate,
                          priorPepStatus: _priorPepStatus,
                          onPriorPepStatusChanged: (v) => setState(() {
                            _priorPepStatus = v;
                            if (v != 'completed' && v != 'incomplete') {
                              _priorVaccinationDate = null;
                              _priorVaccinationFacility.clear();
                            }
                          }),
                          priorPepStatusOptions: _contract.priorPepStatuses,
                          priorVaccinationDate: _priorVaccinationDate,
                          onChoosePriorVaccinationDate:
                              _choosePriorVaccinationDate,
                          priorVaccinationFacilityController:
                              _priorVaccinationFacility,
                          isSubmitting: _submitting,
                        ),
                      if (_currentStep == 4)
                        StepReview(
                          patient: widget.args.patient,
                          booking: widget.args.booking,
                          contract: _contract,
                          selectedBiteDate: _selectedBiteDate,
                          incidentTimeValue: _incidentTimeValue,
                          placeOfExposure: _buildBitePlace(),
                          exposureType: _exposureType,
                          bodyPartGroup: _bodyPartGroup,
                          bodyPartDetail: _optional(_bodyPartDetail),
                          laterality: _laterality,
                          description: _optional(_description),
                          isReferred: _isReferred,
                          referralFacility: _optional(_referralFacility),
                          referralPhotoName: _referralPhotoName,
                          bloodPressure: _isReferred
                              ? formatBloodPressure(
                                  _referralSystolic.text,
                                  _referralDiastolic.text,
                                )
                              : null,
                          temperature: _isReferred
                              ? _optional(_referralTemperature)
                              : null,
                          height: _isReferred
                              ? _optional(_referralHeight)
                              : null,
                          weight: _isReferred
                              ? _optional(_referralWeight)
                              : null,
                          providerName: _isReferred
                              ? _optional(_referralProvider)
                              : null,
                          animalType: _animalType,
                          animalTypeOthers: null,
                          animalStatus: _animalStatus,
                          animalAvailable: _animalAvailable,
                          animalConditionReported: _animalConditionReported,
                          pastBiteHistory: _pastBiteHistory,
                          pastBiteDates: _optional(_pastBiteDates),
                          priorPepStatus: _priorPepStatus,
                          priorVaccinationDate: _priorVaccinationDate,
                          priorVaccinationFacility: _optional(
                            _priorVaccinationFacility,
                          ),
                          onStepJump: (step) =>
                              setState(() => _currentStep = step),
                          isSubmitting: _submitting,
                        ),

                      const SizedBox(height: 20),

                      // Stepper action buttons
                      IntakeStepNavigation(
                        currentStep: _currentStep,
                        isSubmitting: _submitting,
                        onBack: () {
                          if (_currentStep > 0) {
                            setState(() {
                              _error = null;
                              _currentStep--;
                            });
                          }
                        },
                        onNextStep0: () => setState(() {
                          _error = null;
                          _currentStep = 1;
                        }),
                        onNextStep1: _validateAndProceedFromIncident,
                        onNextStep2: _validateAndProceedFromAnimal,
                        onNextStep3: _validateAndProceedFromHistory,
                        onSubmitStep4: _submit,
                      ),
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
}
