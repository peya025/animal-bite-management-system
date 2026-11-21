// ignore_for_file: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../controllers/bite_intake_controller.dart';
import '../models/bite_intake_route_args.dart';
import '../models/form_configuration.dart';
import '../models/patient_profile.dart';
import '../models/patient_profile_form_args.dart';
import '../models/referral_photo.dart';
import '../services/form_configuration_repository.dart';
import '../utils/configured_field_policy.dart';
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
  const BiteIntakeView({
    super.key,
    required this.args,
    this.pickReferralPhoto,
    this.configRepository,
    this.initialConfig,
  });

  final BiteIntakeRouteArgs args;
  final Future<XFile?> Function()? pickReferralPhoto;
  final FormConfigurationRepository? configRepository;
  final FormConfiguration? initialConfig;

  @override
  State<BiteIntakeView> createState() => _BiteIntakeViewState();
}

class _BiteIntakeViewState extends State<BiteIntakeView> {
  late final BiteIntakeController _controller;

  @override
  void initState() {
    super.initState();
    _controller = BiteIntakeController(
      initialPatient: widget.args.patient,
      booking: widget.args.booking,
      configRepository: widget.configRepository,
      initialConfig: widget.initialConfig,
    )..initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _attachReferralPhoto() async {
    if (_controller.pickingPhoto || _controller.submitting) return;
    _controller.updateState(() => _controller.pickingPhoto = true);
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
      if (!mounted || !_controller.isReferred) return;
      _controller.updateState(() {
        _controller.referralPhotoName = file.name;
        _controller.referralPhotoData = data;
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
          ['photo_access_denied', 'photo_access_restricted']
              .contains(error.code)) {
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
      if (mounted) {
        _controller.updateState(() => _controller.pickingPhoto = false);
      }
    }
  }

  void _onReferralMunicipalityChanged(String? code) {
    _controller.updateState(() {
      _controller.referralMunicipalityCode = code;
      _controller.referralBarangayName = null;
      if (code == 'other') {
        _controller.referralFacility.text = 'Other Medical Facility';
      } else {
        _controller.referralFacility.clear();
      }
    });
  }

  void _onReferralBarangayChanged(String? name) {
    _controller.updateState(() {
      _controller.referralBarangayName = name;
      if (name != null && _controller.referralMunicipalityCode != null) {
        _controller.referralFacility.text = suggestReferralFacility(
          _controller.referralMunicipalityCode!,
          name,
        );
      }
    });
  }

  Future<void> _chooseBiteDate() async {
    final today = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate:
          _controller.selectedBiteDate ?? DateUtils.dateOnly(today),
      firstDate: DateTime(today.year - 1),
      lastDate: DateTime(today.year, today.month, today.day),
    );
    if (date == null || !mounted) return;
    _controller.updateState(() {
      _controller.selectedBiteDate = date;
      _controller.biteDate.text = _controller.formatDate(date);
    });
  }

  Future<void> _chooseIncidentTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _controller.incidentTime ?? TimeOfDay.now(),
    );
    if (time != null && mounted) {
      _controller.updateState(() => _controller.incidentTime = time);
    }
  }

  Future<void> _choosePriorVaccinationDate() async {
    final today = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate:
          _controller.priorVaccinationDate ?? DateUtils.dateOnly(today),
      firstDate: DateTime(today.year - 80),
      lastDate: DateUtils.dateOnly(today),
    );
    if (date != null && mounted) {
      _controller.updateState(() => _controller.priorVaccinationDate = date);
    }
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
    if (date == null || !mounted || _controller.pastBiteHistory != 'yes') return;
    final value = _controller.formatDate(date);
    final dates = _controller.pastBiteDates.text
        .split(',')
        .map((v) => v.trim())
        .where((v) => v.isNotEmpty)
        .toList();
    if (!dates.contains(value)) dates.add(value);
    _controller.updateState(
      () => _controller.pastBiteDates.text = dates.join(', '),
    );
  }

  void _changePastBiteHistory(String? value) {
    _controller.updateState(() {
      _controller.pastBiteHistory = value;
      if (value != 'yes') {
        _controller.pastBiteDates.clear();
        _controller.priorPepStatus = null;
        _controller.priorVaccinationDate = null;
        _controller.priorVaccinationFacility.clear();
      }
    });
  }

  Future<void> _openProfileToComplete() async {
    final updated = await Navigator.of(context).pushNamed(
      AppRoutes.profileSetup,
      arguments: PatientProfileFormArgs(
        patient: _controller.patient,
        returnToBooking: true,
      ),
    );
    if (updated is PatientProfile && mounted) {
      _controller.updatePatient(updated);
    }
  }

  Future<void> _submit() async {
    final outcome = await _controller.submit(context);
    if (!mounted) return;
    if (outcome == IntakeSubmitOutcome.submitted) {
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
            '${_controller.patient.name}\'s consultation has been scheduled for review.',
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
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final policy = _controller.policy;
        return PopScope(
          canPop: _controller.isFirstStep && !_controller.submitting,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop &&
                !_controller.isFirstStep &&
                !_controller.submitting) {
              _controller.prevStep();
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        AppPageHeader(
                          title: 'Bite incident intake',
                          subtitle: _controller.contract.notice,
                          onBack: _controller.submitting
                              ? null
                              : () {
                                  if (!_controller.prevStep()) {
                                    Navigator.of(context).pop();
                                  }
                                },
                        ),
                        const SizedBox(height: 16),
                        if (policy == null && _controller.loadingConfig)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 48),
                            child: Center(
                              child: CircularProgressIndicator(),
                            ),
                          )
                        else if (policy == null &&
                            _controller.configError != null)
                          _buildConfigErrorState(_controller.configError!)
                        else if (policy != null)
                          _buildConfiguredIntake(policy),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildConfigErrorState(String message) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Could not load clinic intake settings',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => _controller.loadConfiguration(forceRefresh: true),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildConfiguredIntake(ConfiguredFieldPolicy policy) {
    final steps = _controller.activeSteps;
    final stepIndex = _controller.currentStepIndex;
    final stepId = _controller.currentStepId;

    return Form(
      key: _controller.formKey,
      autovalidateMode: _controller.validatedSteps.contains(stepId)
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          IntakeStepProgress(
            currentStep: stepIndex,
            activeSteps: steps,
            currentStepId: stepId,
          ),
          const SizedBox(height: 16),
          if (_controller.error case final msg?) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFCA5A5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    msg,
                    style: const TextStyle(
                      color: AppColors.error,
                      fontSize: 13,
                    ),
                  ),
                  if (_controller.missingProfileFields.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton(
                        onPressed: _openProfileToComplete,
                        child: const Text('Update profile'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (stepId == IntakeStepId.patient)
            StepPatient(patient: _controller.patient),
          if (stepId == IntakeStepId.incident)
            StepIncident(
              policy: policy,
              biteDateController: _controller.biteDate,
              onChooseBiteDate: _chooseBiteDate,
              onClearBiteDate: () => _controller.updateState(() {
                _controller.selectedBiteDate = null;
                _controller.biteDate.clear();
              }),
              incidentTime: _controller.incidentTime,
              onChooseIncidentTime: _chooseIncidentTime,
              purokController: _controller.purokController,
              municipalities: _controller.municipalities,
              barangays: _controller.barangays,
              selectedMunicipalityCode: _controller.selectedMunicipalityCode,
              selectedBarangayCode: _controller.selectedBarangayCode,
              loadingMunicipalities: _controller.loadingMunicipalities,
              loadingBarangays: _controller.loadingBarangays,
              onMunicipalityChanged: (code) {
                _controller.updateState(() {
                  _controller.selectedMunicipalityCode = code;
                  _controller.selectedMunicipalityName = _controller
                      .municipalities
                      .firstWhere((m) => m.code == code)
                      .name;
                  _controller.selectedBarangayCode = null;
                  _controller.selectedBarangayName = null;
                });
                if (code != null) {
                  _controller.loadBarangays(code);
                }
              },
              onBarangayChanged: (code) {
                _controller.updateState(() {
                  _controller.selectedBarangayCode = code;
                  _controller.selectedBarangayName = _controller.barangays
                      .firstWhere((b) => b.code == code)
                      .name;
                });
              },
              siteWashed: _controller.siteWashed,
              onSiteWashedChanged: (v) => _controller.updateState(() {
                _controller.siteWashed = v;
                if (v != true) {
                  _controller.washMethod = null;
                  _controller.washDurationController.clear();
                }
              }),
              washMethod: _controller.washMethod,
              onWashMethodChanged: (v) =>
                  _controller.updateState(() => _controller.washMethod = v),
              washMethods: _controller.contract.washMethods,
              washDurationController: _controller.washDurationController,
              exposureType: _controller.exposureType,
              onExposureTypeChanged: (v) =>
                  _controller.updateState(() => _controller.exposureType = v),
              exposureModes: _controller.contract.exposureModes,
              bodyPartGroup: _controller.bodyPartGroup,
              onBodyPartGroupChanged: (v) =>
                  _controller.updateState(() => _controller.bodyPartGroup = v),
              bodyPartGroups: _controller.contract.bodyPartGroups,
              bodyPartDetailController: _controller.bodyPartDetail,
              laterality: _controller.laterality,
              onLateralityChanged: (v) =>
                  _controller.updateState(() => _controller.laterality = v),
              lateralityOptions: _controller.contract.laterality,
              descriptionController: _controller.description,
              isReferred: _controller.isReferred,
              onReferredChanged: (val) {
                _controller.updateState(() {
                  _controller.isReferred = val;
                  if (!val) {
                    _controller.referralFacility.clear();
                    _controller.referralMunicipalityCode = null;
                    _controller.referralBarangayName = null;
                    _controller.referralPhotoName = null;
                    _controller.referralPhotoData = null;
                    _controller.referralSystolic.clear();
                    _controller.referralDiastolic.clear();
                    _controller.referralTemperature.clear();
                    _controller.referralHeight.clear();
                    _controller.referralWeight.clear();
                    _controller.referralProvider.clear();
                  }
                });
              },
              referralMunicipalityCode: _controller.referralMunicipalityCode,
              onReferralMunicipalityChanged: _onReferralMunicipalityChanged,
              referralBarangayName: _controller.referralBarangayName,
              onReferralBarangayChanged: _onReferralBarangayChanged,
              referralFacilityController: _controller.referralFacility,
              referralPhotoName: _controller.referralPhotoName,
              referralPhotoData: _controller.referralPhotoData,
              pickingPhoto: _controller.pickingPhoto,
              onAttachPhoto: _attachReferralPhoto,
              onRemovePhoto: () => _controller.updateState(() {
                _controller.referralPhotoName = null;
                _controller.referralPhotoData = null;
              }),
              referralSystolicController: _controller.referralSystolic,
              referralDiastolicController: _controller.referralDiastolic,
              referralTemperatureController: _controller.referralTemperature,
              referralHeightController: _controller.referralHeight,
              referralWeightController: _controller.referralWeight,
              referralProviderController: _controller.referralProvider,
              isSubmitting: _controller.submitting,
            ),
          if (stepId == IntakeStepId.animal)
            StepAnimal(
              policy: policy,
              animalType: _controller.animalType,
              onAnimalTypeChanged: (value) =>
                  _controller.updateState(() => _controller.animalType = value),
              animalSpeciesOtherController:
                  _controller.animalSpeciesOtherController,
              animalStatus: _controller.animalStatus,
              onAnimalStatusChanged: (v) =>
                  _controller.updateState(() => _controller.animalStatus = v),
              animalOwnershipOptions: _controller.contract.animalOwnership,
              animalCaptured: _controller.animalCaptured,
              onAnimalCapturedChanged: (v) => _controller.updateState(
                () => _controller.animalCaptured = v,
              ),
              animalAvailable: _controller.animalAvailable,
              onAnimalAvailableChanged: (v) => _controller.updateState(
                () => _controller.animalAvailable = v,
              ),
              animalConditionReported: _controller.animalConditionReported,
              onAnimalConditionChanged: (v) => _controller.updateState(
                () => _controller.animalConditionReported = v,
              ),
              animalConditionOptions: _controller.contract.animalConditions,
              isSubmitting: _controller.submitting,
            ),
          if (stepId == IntakeStepId.history)
            StepHistory(
              pastBiteHistory: _controller.pastBiteHistory,
              onPastBiteHistoryChanged: _changePastBiteHistory,
              pastBiteHistoryOptions: _controller.contract.pastBiteHistory,
              pastBiteDatesController: _controller.pastBiteDates,
              onChoosePastBiteDate: _choosePastBiteDate,
              priorPepStatus: _controller.priorPepStatus,
              onPriorPepStatusChanged: (v) => _controller.updateState(() {
                _controller.priorPepStatus = v;
                if (v != 'completed' && v != 'incomplete') {
                  _controller.priorVaccinationDate = null;
                  _controller.priorVaccinationFacility.clear();
                }
              }),
              priorPepStatusOptions: _controller.contract.priorPepStatuses,
              priorVaccinationDate: _controller.priorVaccinationDate,
              onChoosePriorVaccinationDate: _choosePriorVaccinationDate,
              priorVaccinationFacilityController:
                  _controller.priorVaccinationFacility,
              isSubmitting: _controller.submitting,
            ),
          if (stepId == IntakeStepId.review)
            StepReview(
              policy: policy,
              activeSteps: steps,
              patient: _controller.patient,
              booking: _controller.booking,
              contract: _controller.contract,
              selectedBiteDate: _controller.selectedBiteDate,
              incidentTimeValue: _controller.incidentTimeValue,
              placeOfExposure: _controller.buildBitePlace(),
              siteWashed: _controller.siteWashed,
              washMethod: _controller.washMethod,
              washDurationMinutes: int.tryParse(
                _controller.washDurationController.text.trim(),
              ),
              exposureType: _controller.exposureType,
              bodyPartGroup: _controller.bodyPartGroup,
              bodyPartDetail: _controller.optionalText(
                _controller.bodyPartDetail,
              ),
              laterality: _controller.laterality,
              description: _controller.optionalText(_controller.description),
              isReferred: _controller.isReferred,
              referralFacility: _controller.optionalText(
                _controller.referralFacility,
              ),
              referralPhotoName: _controller.referralPhotoName,
              bloodPressure: _controller.isReferred
                  ? formatBloodPressure(
                      _controller.referralSystolic.text,
                      _controller.referralDiastolic.text,
                    )
                  : null,
              temperature: _controller.isReferred
                  ? _controller.optionalText(_controller.referralTemperature)
                  : null,
              height: _controller.isReferred
                  ? _controller.optionalText(_controller.referralHeight)
                  : null,
              weight: _controller.isReferred
                  ? _controller.optionalText(_controller.referralWeight)
                  : null,
              providerName: _controller.isReferred
                  ? _controller.optionalText(_controller.referralProvider)
                  : null,
              animalType: _controller.animalType,
              animalTypeOthers: _controller.optionalText(
                _controller.animalSpeciesOtherController,
              ),
              animalStatus: _controller.animalStatus,
              animalCaptured: _controller.animalCaptured,
              animalAvailable: _controller.animalAvailable,
              animalConditionReported: _controller.animalConditionReported,
              pastBiteHistory: _controller.pastBiteHistory,
              pastBiteDates: _controller.optionalText(
                _controller.pastBiteDates,
              ),
              priorPepStatus: _controller.priorPepStatus,
              priorVaccinationDate: _controller.priorVaccinationDate,
              priorVaccinationFacility: _controller.optionalText(
                _controller.priorVaccinationFacility,
              ),
              onStepJump: _controller.goToStep,
              isSubmitting: _controller.submitting,
            ),
          const SizedBox(height: 20),
          IntakeStepNavigation(
            currentStep: stepIndex,
            activeSteps: steps,
            currentStepId: stepId,
            isSubmitting: _controller.submitting,
            onBack: _controller.prevStep,
            onNextStep0: () =>
                _controller.nextStep(context, validateCurrent: false),
            onNextStep1: () => _controller.nextStep(context),
            onNextStep2: () => _controller.nextStep(context),
            onNextStep3: () =>
                _controller.nextStep(context, validateCurrent: false),
            onSubmitStep4: _submit,
          ),
        ],
      ),
    );
  }
}
