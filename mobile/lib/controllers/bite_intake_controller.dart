import 'package:flutter/material.dart';

import '../models/bite_intake_contract.dart';
import '../models/bite_intake_draft.dart';
import '../models/booking_draft.dart';
import '../models/form_configuration.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../services/form_configuration_repository.dart';
import '../services/psgc_service.dart';
import '../utils/configured_field_policy.dart';
import '../utils/configured_payload_builder.dart';
import '../widgets/bite_intake/helpers/vitals_helper.dart';

enum IntakeSubmitOutcome {
  submitted,
  validationFailed,
  policyChanged,
  profileIncomplete,
  error,
}

/// Coordinates bite intake draft, dynamic clinic policy, active steps, and submission.
class BiteIntakeController extends ChangeNotifier {
  BiteIntakeController({
    required PatientProfile initialPatient,
    required this.booking,
    FormConfigurationRepository? configRepository,
    FormConfiguration? initialConfig,
  }) : _patient = initialPatient,
       _configRepository =
           configRepository ?? const FormConfigurationRepository(),
       _config = initialConfig;

  PatientProfile _patient;
  PatientProfile get patient => _patient;
  final BookingDraft booking;
  final FormConfigurationRepository _configRepository;

  final formKey = GlobalKey<FormState>();
  final Set<IntakeStepId> validatedSteps = {};

  final biteDate = TextEditingController();
  final purokController = TextEditingController();
  final bodyPartDetail = TextEditingController();
  final description = TextEditingController();
  final washDurationController = TextEditingController();
  final animalSpeciesOtherController = TextEditingController();

  final referralFacility = TextEditingController();
  final referralSystolic = TextEditingController();
  final referralDiastolic = TextEditingController();
  final referralTemperature = TextEditingController();
  final referralHeight = TextEditingController();
  final referralWeight = TextEditingController();
  final referralProvider = TextEditingController();

  final pastBiteDates = TextEditingController();
  final priorVaccinationFacility = TextEditingController();

  bool isReferred = false;
  String? referralMunicipalityCode;
  String? referralBarangayName;
  String? referralPhotoName;
  String? referralPhotoData;
  bool pickingPhoto = false;

  DateTime? selectedBiteDate;
  TimeOfDay? incidentTime;
  DateTime? priorVaccinationDate;

  List<PsgcLocation> municipalities = [];
  List<PsgcLocation> barangays = [];
  String? selectedMunicipalityCode;
  String? selectedMunicipalityName;
  String? selectedBarangayCode;
  String? selectedBarangayName;
  bool loadingMunicipalities = false;
  bool loadingBarangays = false;

  bool? siteWashed;
  String? washMethod;
  String? exposureType;
  String? bodyPartGroup;
  String? laterality;

  String? animalType;
  String? animalStatus;
  bool? animalCaptured;
  bool? animalAvailable;
  String? animalConditionReported;

  String? pastBiteHistory;
  String? priorPepStatus;

  BiteIntakeContract contract = BiteIntakeContract.fallback;
  FormConfiguration? _config;
  bool _appliedInitialDefaults = false;
  bool loadingConfig = false;
  String? configError;
  bool submitting = false;
  String? error;
  List<String> missingProfileFields = const [];

  IntakeStepId currentStepId = IntakeStepId.patient;
  int _configRequestToken = 0;
  bool _disposed = false;

  FormConfiguration? get config => _config;
  ConfiguredFieldPolicy? get policy =>
      _config == null ? null : ConfiguredFieldPolicy(_config!);

  List<IntakeStepId> get activeSteps =>
      policy?.activeIntakeSteps() ??
      const [
        IntakeStepId.patient,
        IntakeStepId.incident,
        IntakeStepId.animal,
        IntakeStepId.history,
        IntakeStepId.review,
      ];

  int get currentStepIndex {
    final steps = activeSteps;
    final idx = steps.indexOf(currentStepId);
    return idx >= 0 ? idx : 0;
  }

  bool get isFirstStep => currentStepIndex == 0;
  bool get isLastStep => currentStepIndex == activeSteps.length - 1;

  void _notify() {
    if (!_disposed) {
      notifyListeners();
    }
  }

  void initialize() {
    if (_config != null) {
      _applyConfig(_config!);
    }
    loadConfiguration(forceRefresh: true);
    loadContract();
    loadMunicipalities();
  }

  String formatDate(DateTime date) => date.toIso8601String().split('T').first;

  String? optionalText(TextEditingController c) {
    final v = c.text.trim();
    return v.isEmpty ? null : v;
  }

  String? get incidentTimeValue => incidentTime == null
      ? null
      : '${incidentTime!.hour.toString().padLeft(2, '0')}:${incidentTime!.minute.toString().padLeft(2, '0')}';

  String? buildBitePlace() {
    final parts = [
      ?optionalText(purokController),
      ?selectedBarangayName,
      ?selectedMunicipalityName,
    ];
    return parts.isEmpty ? null : parts.join(', ');
  }

  Future<void> loadConfiguration({bool forceRefresh = false}) async {
    final token = ++_configRequestToken;
    loadingConfig = true;
    configError = null;
    _notify();

    try {
      final fetched = await _configRepository.forPatient(
        _patient.id,
        forceRefresh: forceRefresh,
      );
      if (_disposed || token != _configRequestToken) return;
      _applyConfig(fetched);
      loadingConfig = false;
      _notify();
    } catch (err) {
      if (_disposed || token != _configRequestToken) return;
      final fallback = _configRepository.lastKnownForPatient(_patient.id);
      if (fallback != null && _config == null) {
        _applyConfig(fallback);
      }
      loadingConfig = false;
      configError = _config == null ? err.toString() : null;
      _notify();
    }
  }

  void _applyConfig(FormConfiguration next) {
    _config = next;
    _applyConfiguredOptionsToContract();
    final nextPolicy = ConfiguredFieldPolicy(next);
    if (!_appliedInitialDefaults) {
      _appliedInitialDefaults = true;
      if (selectedBiteDate == null &&
          nextPolicy.isIntakeFieldRequired('bite_date')) {
        selectedBiteDate = DateUtils.dateOnly(DateTime.now());
        biteDate.text = formatDate(selectedBiteDate!);
      }
      if (animalType == null &&
          nextPolicy.isIntakeFieldRequired('animal_type')) {
        animalType = 'dog';
      }
    }
    final steps = nextPolicy.activeIntakeSteps();
    if (!steps.contains(currentStepId)) {
      currentStepId = steps.last;
    }
  }

  void _applyConfiguredOptionsToContract() {
    final cfg = _config;
    if (cfg == null) return;
    final configuredExposure = cfg.intake.exposureModeOptions;
    final configuredBodyPart = cfg.intake.bodyPartGroupOptions;
    if ((configuredExposure != null && configuredExposure.isNotEmpty) ||
        (configuredBodyPart != null && configuredBodyPart.isNotEmpty)) {
      contract = contract.copyWith(
        exposureModes: (configuredExposure != null && configuredExposure.isNotEmpty)
            ? configuredExposure
            : null,
        bodyPartGroups: (configuredBodyPart != null && configuredBodyPart.isNotEmpty)
            ? configuredBodyPart
            : null,
      );
    }
  }

  Future<void> loadContract() async {
    try {
      final loaded = await api.biteIntakeContract() as BiteIntakeContract;
      if (_disposed) return;
      contract = loaded;
      _applyConfiguredOptionsToContract();
      _notify();
    } catch (_) {
      // Fallback contract remains in place
    }
  }

  Future<void> loadMunicipalities() async {
    loadingMunicipalities = true;
    _notify();
    try {
      final list = await api.locationMunicipalities() as List<PsgcLocation>;
      if (_disposed) return;
      municipalities = list;
    } catch (_) {
    } finally {
      if (!_disposed) {
        loadingMunicipalities = false;
        _notify();
      }
    }
  }

  Future<void> loadBarangays(String municipalityCode) async {
    loadingBarangays = true;
    barangays = [];
    selectedBarangayCode = null;
    selectedBarangayName = null;
    _notify();
    try {
      final list =
          await api.locationBarangays(municipalityCode: municipalityCode)
              as List<PsgcLocation>;
      if (_disposed) return;
      barangays = list;
    } catch (_) {
    } finally {
      if (!_disposed) {
        loadingBarangays = false;
        _notify();
      }
    }
  }

  void updatePatient(PatientProfile updated) {
    _patient = updated;
    missingProfileFields = const [];
    error = null;
    _notify();
  }

  void updateState(VoidCallback fn) {
    fn();
    _notify();
  }

  void goToStep(IntakeStepId stepId) {
    final steps = activeSteps;
    if (!steps.contains(stepId)) return;
    error = null;
    currentStepId = stepId;
    _notify();
  }

  bool prevStep() {
    final steps = activeSteps;
    final idx = currentStepIndex;
    if (idx > 0) {
      error = null;
      currentStepId = steps[idx - 1];
      _notify();
      return true;
    }
    return false;
  }

  bool nextStep(BuildContext context, {bool validateCurrent = true}) {
    if (validateCurrent && !validateVisibleStep(context)) {
      return false;
    }
    final steps = activeSteps;
    final idx = currentStepIndex;
    if (idx + 1 < steps.length) {
      error = null;
      currentStepId = steps[idx + 1];
      _notify();
      return true;
    }
    return false;
  }

  bool validateVisibleStep(BuildContext context, {bool clearError = true}) {
    FocusScope.of(context).unfocus();
    validatedSteps.add(currentStepId);
    if (clearError) {
      error = null;
    }
    _notify();
    final invalid = formKey.currentState?.validateGranularly() ?? const {};
    if (invalid.isEmpty) return true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_disposed) return;
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

  IntakeStepId? _firstInvalidStep(ConfiguredFieldPolicy activePolicy) {
    if (!activePolicy.isIntakeSectionEnabled) {
      return null;
    }
    final today = DateUtils.dateOnly(DateTime.now());
    final invalidDate =
        (activePolicy.isIntakeFieldRequired('bite_date') &&
            selectedBiteDate == null) ||
        (activePolicy.isIntakeFieldVisible('bite_date') &&
            selectedBiteDate != null &&
            DateUtils.dateOnly(selectedBiteDate!).isAfter(today));
    final invalidPlace =
        activePolicy.isIntakeFieldRequired('bite_place') &&
        (buildBitePlace() == null);
    final invalidWash =
        activePolicy.isIntakeFieldRequired('site_washed') &&
        siteWashed == null;
    final invalidExposure =
        activePolicy.isIntakeFieldRequired('exposure_type') &&
        (exposureType == null || exposureType!.isEmpty);
    final invalidWound =
        activePolicy.isIntakeFieldRequired('wound_location') &&
        (bodyPartGroup == null || bodyPartGroup!.isEmpty) &&
        bodyPartDetail.text.trim().isEmpty;
    final invalidDescription =
        activePolicy.isIntakeFieldRequired('patient_description') &&
        description.text.trim().isEmpty;
    final invalidReferral = isReferred && referralFacility.text.trim().isEmpty;

    if (invalidDate ||
        invalidPlace ||
        invalidWash ||
        invalidExposure ||
        invalidWound ||
        invalidDescription ||
        invalidReferral) {
      return IntakeStepId.incident;
    }

    final invalidAnimalType =
        (activePolicy.isIntakeFieldRequired('animal_type') &&
            (animalType == null || animalType!.isEmpty)) ||
        (activePolicy.isIntakeFieldRequired(
              'animal_type_others',
              animalType: animalType,
            ) &&
            animalSpeciesOtherController.text.trim().isEmpty);
    final invalidAnimalStatus =
        activePolicy.isIntakeFieldRequired('animal_status') &&
        (animalStatus == null || animalStatus!.isEmpty);
    final invalidAnimalCaptured =
        activePolicy.isIntakeFieldRequired('animal_captured') &&
        animalCaptured == null;

    if (invalidAnimalType || invalidAnimalStatus || invalidAnimalCaptured) {
      return IntakeStepId.animal;
    }

    return null;
  }

  BiteIntakeDraft buildDraft() {
    final parsedDuration = int.tryParse(washDurationController.text.trim());
    return BiteIntakeDraft(
      schemaVersion: contract.version,
      dateOfExposure: selectedBiteDate,
      timeOfExposure: incidentTimeValue,
      placeOfExposure: buildBitePlace(),
      siteWashed: siteWashed,
      washMethod: siteWashed == true ? washMethod : null,
      washDurationMinutes: siteWashed == true ? parsedDuration : null,
      reportedModeOfExposure: exposureType,
      animalSpecies: animalType,
      animalSpeciesOther: animalType == 'other'
          ? optionalText(animalSpeciesOtherController)
          : null,
      animalOwnership: animalStatus,
      animalCaptured: animalCaptured,
      animalAvailableForObservation: animalAvailable,
      animalConditionReported: animalConditionReported,
      bodyPartGroup: bodyPartGroup,
      bodyPartDetail: optionalText(bodyPartDetail),
      laterality: laterality,
      incidentNarrative: optionalText(description),
      careReceived: null,
      referralSource: isReferred ? optionalText(referralFacility) : null,
      referralFacility: isReferred ? optionalText(referralFacility) : null,
      referralBloodPressure: isReferred
          ? formatBloodPressure(referralSystolic.text, referralDiastolic.text)
          : null,
      referralTemperature: isReferred
          ? optionalText(referralTemperature)
          : null,
      referralHeight: isReferred ? optionalText(referralHeight) : null,
      referralWeight: isReferred ? optionalText(referralWeight) : null,
      referralProviderName: isReferred ? optionalText(referralProvider) : null,
      referralDocumentPhoto: isReferred ? referralPhotoData : null,
      pastBiteHistory: pastBiteHistory,
      pastBiteDates: pastBiteHistory == 'yes'
          ? optionalText(pastBiteDates)
          : null,
      priorPepStatus: pastBiteHistory == 'yes' ? priorPepStatus : null,
      priorPepDate:
          priorPepStatus == 'completed' || priorPepStatus == 'incomplete'
          ? priorVaccinationDate
          : null,
      priorPepFacility:
          priorPepStatus == 'completed' || priorPepStatus == 'incomplete'
          ? optionalText(priorVaccinationFacility)
          : null,
    );
  }

  Future<IntakeSubmitOutcome> submit(BuildContext context) async {
    if (submitting || pickingPhoto) return IntakeSubmitOutcome.error;

    submitting = true;
    error = null;
    missingProfileFields = const [];
    _notify();

    try {
      final previousRevision = _config?.revision;
      final refreshed = await _configRepository.forPatient(
        _patient.id,
        forceRefresh: true,
      );
      if (_disposed) return IntakeSubmitOutcome.error;

      _applyConfig(refreshed);
      final activePolicy = ConfiguredFieldPolicy(refreshed);

      if (previousRevision != null && previousRevision != refreshed.revision) {
        final invalidStep = _firstInvalidStep(activePolicy);
        if (invalidStep != null) {
          currentStepId = invalidStep;
          validatedSteps.add(invalidStep);
        }
        submitting = false;
        error =
            'Clinic form requirements were updated. Please review before submitting.';
        _notify();
        if (invalidStep != null && context.mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!_disposed && context.mounted) {
              validateVisibleStep(context, clearError: false);
            }
          });
        }
        return IntakeSubmitOutcome.policyChanged;
      }

      final invalidStep = _firstInvalidStep(activePolicy);
      if (invalidStep != null) {
        submitting = false;
        currentStepId = invalidStep;
        _notify();
        if (context.mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!_disposed && context.mounted) {
              validateVisibleStep(context);
            }
          });
        }
        return IntakeSubmitOutcome.validationFailed;
      }

      final missingProfile = activePolicy.missingRequiredProfileFields(
        _patient,
      );
      if (missingProfile.isNotEmpty) {
        submitting = false;
        missingProfileFields = missingProfile;
        final labels = missingProfile
            .map(ConfiguredFieldPolicy.labelForProfileField)
            .join(', ');
        error =
            'Please complete required profile details before booking: $labels.';
        _notify();
        return IntakeSubmitOutcome.profileIncomplete;
      }

      final draft = buildDraft();
      final payload = ConfiguredPayloadBuilder.buildIntakePayload(
        policy: activePolicy,
        draft: draft,
      );

      await api.book(
        patient: _patient,
        booking: booking,
        intake: payload == null ? null : draft,
        intakePayload: payload,
        configRevision: refreshed.revision,
      );
      if (_disposed) return IntakeSubmitOutcome.error;
      submitting = false;
      _notify();
      return IntakeSubmitOutcome.submitted;
    } on ApiException catch (err) {
      if (_disposed) return IntakeSubmitOutcome.error;
      submitting = false;
      if (err.isConfigConflict) {
        if (err.updatedConfiguration != null) {
          _applyConfig(err.updatedConfiguration!);
          final updatedPolicy = ConfiguredFieldPolicy(err.updatedConfiguration!);
          final invalidStep = _firstInvalidStep(updatedPolicy);
          if (invalidStep != null) {
            currentStepId = invalidStep;
            validatedSteps.add(invalidStep);
          }
        }
        error = err.message;
        _notify();
        if (context.mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!_disposed && context.mounted) {
              validateVisibleStep(context, clearError: false);
            }
          });
        }
        return IntakeSubmitOutcome.policyChanged;
      }
      if (err.hasProfileErrors) {
        missingProfileFields = err.profileErrors.keys.toList();
        error = err.message;
        _notify();
        return IntakeSubmitOutcome.profileIncomplete;
      }
      error = err.message;
      _notify();
      return IntakeSubmitOutcome.error;
    } catch (err) {
      if (!_disposed) {
        submitting = false;
        error = err.toString();
        _notify();
      }
      return IntakeSubmitOutcome.error;
    }
  }

  @override
  void dispose() {
    _disposed = true;
    biteDate.dispose();
    purokController.dispose();
    bodyPartDetail.dispose();
    description.dispose();
    washDurationController.dispose();
    animalSpeciesOtherController.dispose();
    referralFacility.dispose();
    referralSystolic.dispose();
    referralDiastolic.dispose();
    referralTemperature.dispose();
    referralHeight.dispose();
    referralWeight.dispose();
    referralProvider.dispose();
    priorVaccinationFacility.dispose();
    pastBiteDates.dispose();
    super.dispose();
  }
}
