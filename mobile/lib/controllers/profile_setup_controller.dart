import 'package:flutter/material.dart';

import '../models/form_configuration.dart';
import '../models/patient_account_profile.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../services/form_configuration_repository.dart';
import '../services/mobile_api.dart';
import '../services/psgc_service.dart';
import '../utils/app_validators.dart';
import '../utils/configured_field_policy.dart';
import '../utils/configured_payload_builder.dart';
import '../widgets/profile_setup/sections/profile_form_controls.dart';

enum ProfileSaveOutcome {
  saved,
  validationFailed,
  policyChanged,
  error,
}

/// Coordinates Form 1 profile setup draft state, clinic policy loading/refresh, and submission.
class ProfileSetupController extends ChangeNotifier {
  ProfileSetupController({
    this.existingPatient,
    this.initialRelationship = 'self',
    FormConfigurationRepository? configRepository,
    FormConfiguration? initialConfig,
  }) : _configRepository =
           configRepository ?? const FormConfigurationRepository(),
       _config = initialConfig {
    relationship = existingPatient?.relationship ?? initialRelationship;
    _prefillFromExistingPatient();
  }

  final PatientProfile? existingPatient;
  final String initialRelationship;
  final FormConfigurationRepository _configRepository;

  final formKey = GlobalKey<FormState>();
  final scrollController = ScrollController();

  final firstName = TextEditingController();
  final middleName = TextEditingController();
  final lastName = TextEditingController();
  final suffix = TextEditingController();
  final birthDate = TextEditingController();
  final contactNumber = TextEditingController();
  final email = TextEditingController();
  final emergencyContactName = TextEditingController();
  final emergencyContactNumber = TextEditingController();
  final motherMaidenName = TextEditingController();
  final spouseName = TextEditingController();
  final purok = TextEditingController();
  final municipalityText = TextEditingController();
  final barangayText = TextEditingController();
  final provinceText = TextEditingController();
  final philhealthNo = TextEditingController();
  final seniorCitizenId = TextEditingController();
  final pwdId = TextEditingController();
  final indigenousTribe = TextEditingController();
  final otherMembershipCustomName = TextEditingController();
  final otherMembershipCustomId = TextEditingController();

  late String relationship;
  String? gender;
  String? bloodType;
  String? civilStatus;
  String? educationalAttainment;
  String? employmentStatus;
  String? familyMember;
  String? philhealthMember;
  String? philhealthStatus;
  String? philhealthCategory;
  String? fourpsMember;
  String? fourpsCategory;
  String? fourpsRelationship;
  String? registeredFourpsBeneficiary;
  String? dswdNhts;
  String? hasMembership;
  final Set<String> otherMemberships = <String>{};

  DateTime? selectedBirthDate;

  // PSGC state
  List<PsgcLocation> municipalities = [];
  List<PsgcLocation> barangays = [];
  String? selectedMunicipalityCode;
  String? selectedBarangayCode;
  bool loadingMunicipalities = false;
  bool loadingBarangays = false;
  bool _didSyncAddressFromExistingPatient = false;
  bool useManualAddressFields = false;
  ClinicLocationContext? locationContext;

  // Config & lifecycle state
  FormConfiguration? _config;
  bool loadingConfig = false;
  String? configError;
  bool isSaving = false;
  String? error;
  AutovalidateMode autoValidateMode = AutovalidateMode.disabled;

  ProfileStepId currentStepId = ProfileStepId.basicInfo;
  int _configRequestToken = 0;
  bool _disposed = false;

  bool get isEditMode => existingPatient != null;
  FormConfiguration? get config => _config;
  ConfiguredFieldPolicy? get policy =>
      _config == null ? null : ConfiguredFieldPolicy(_config!);

  List<ProfileStepId> get activeSteps =>
      policy?.activeProfileSteps() ??
      const [
        ProfileStepId.basicInfo,
        ProfileStepId.addressAndContact,
        ProfileStepId.socioeconomicAndProgram,
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
    if (!isEditMode && relationship == 'self') {
      autoFillFromAccount();
    }
    loadConfiguration(forceRefresh: true);
    loadMunicipalities();
  }

  Future<void> loadConfiguration({bool forceRefresh = false}) async {
    final requestToken = ++_configRequestToken;
    loadingConfig = true;
    configError = null;
    _notify();

    try {
      final fetched = isEditMode
          ? await _configRepository.forPatient(
              existingPatient!.id,
              forceRefresh: forceRefresh,
            )
          : await _configRepository.forNewProfile(
              MobileApi.clinicId,
              forceRefresh: forceRefresh,
            );
      if (_disposed || requestToken != _configRequestToken) return;
      _applyConfig(fetched);
      loadingConfig = false;
      _notify();
    } catch (err) {
      if (_disposed || requestToken != _configRequestToken) return;
      final fallback = isEditMode
          ? _configRepository.lastKnownForPatient(existingPatient!.id)
          : _configRepository.lastKnownForNewProfile(MobileApi.clinicId);
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
    final steps = ConfiguredFieldPolicy(next).activeProfileSteps();
    if (!steps.contains(currentStepId)) {
      currentStepId = steps.last;
    }
  }

  Future<void> autoFillFromAccount() async {
    if (isEditMode) return;
    try {
      final account = await api.account() as PatientAccountProfile;
      if (_disposed) return;

      if (email.text.isEmpty && account.email.isNotEmpty) {
        email.text = account.email;
      }
      if (contactNumber.text.isEmpty &&
          account.phone != null &&
          account.phone!.isNotEmpty) {
        contactNumber.text = account.phone!;
      }

      if (firstName.text.isEmpty &&
          lastName.text.isEmpty &&
          account.name.trim().isNotEmpty) {
        final parts = account.name.trim().split(RegExp(r'\s+'));
        if (parts.length == 1) {
          firstName.text = parts.first;
        } else if (parts.length == 2) {
          firstName.text = parts.first;
          lastName.text = parts.last;
        } else if (parts.length >= 3) {
          firstName.text = parts.first;
          middleName.text = parts.sublist(1, parts.length - 1).join(' ');
          lastName.text = parts.last;
        }
      }
      _notify();
    } catch (_) {
      // Ignore if account loading fails
    }
  }

  Future<void> loadMunicipalities() async {
    loadingMunicipalities = true;
    _notify();
    try {
      final ctx = await api.locationContext() as ClinicLocationContext;
      final list = await api.locationMunicipalities() as List<PsgcLocation>;
      if (_disposed) return;
      locationContext = ctx;
      municipalities = list;
      loadingMunicipalities = false;
      useManualAddressFields = list.isEmpty;
      final ctxProvince = ctx.province?.trim() ?? '';
      if (provinceText.text.trim().isEmpty && ctxProvince.isNotEmpty) {
        provinceText.text = ctxProvince;
      }
      _notify();
      await _syncAddressSelectionFromExistingPatient();
    } catch (_) {
      if (_disposed) return;
      loadingMunicipalities = false;
      useManualAddressFields = true;
      _notify();
      await _syncAddressSelectionFromExistingPatient();
    }
  }

  Future<void> loadBarangays(String municipalityCode) async {
    loadingBarangays = true;
    barangays = [];
    selectedBarangayCode = null;
    _notify();
    try {
      final list =
          await api.locationBarangays(municipalityCode: municipalityCode)
              as List<PsgcLocation>;
      if (_disposed) return;
      barangays = list;
      loadingBarangays = false;
      useManualAddressFields = list.isEmpty;
      _notify();
    } catch (_) {
      if (_disposed) return;
      loadingBarangays = false;
      useManualAddressFields = true;
      _notify();
    }
  }

  PsgcLocation? _findLocationByName(
    List<PsgcLocation> locations,
    String name,
  ) {
    final cleanName = name.trim().toLowerCase();
    return locations
        .where((loc) => loc.name.trim().toLowerCase() == cleanName)
        .firstOrNull;
  }

  Future<void> _syncAddressSelectionFromExistingPatient() async {
    if (_didSyncAddressFromExistingPatient) return;
    _didSyncAddressFromExistingPatient = true;

    final details = existingPatient?.details;
    final municipalityName = details?.addressMunicipality?.trim();
    final barangayName = details?.addressBarangay?.trim();

    if (municipalityName == null || municipalityName.isEmpty) return;

    final matchedMunicipality = _findLocationByName(
      municipalities,
      municipalityName,
    );

    if (matchedMunicipality == null) {
      useManualAddressFields = true;
      municipalityText.text = municipalityName;
      barangayText.text = barangayName ?? '';
      _notify();
      return;
    }

    selectedMunicipalityCode = matchedMunicipality.code;
    municipalityText.text = matchedMunicipality.name;
    _notify();

    await loadBarangays(matchedMunicipality.code);
    if (_disposed || barangayName == null || barangayName.isEmpty) return;

    final matchedBarangay = _findLocationByName(barangays, barangayName);
    if (matchedBarangay != null) {
      selectedBarangayCode = matchedBarangay.code;
      barangayText.text = matchedBarangay.name;
    } else {
      useManualAddressFields = true;
      barangayText.text = barangayName;
    }
    _notify();
  }

  void _prefillFromExistingPatient() {
    final patient = existingPatient;
    if (patient == null) return;

    final details = patient.details;
    final memberships = patient.memberships;

    PatientMembership? membershipOf(String type) {
      for (final membership in memberships) {
        if (membership.membershipType == type) return membership;
      }
      return null;
    }

    final philhealth = membershipOf('philhealth');
    final fourps = membershipOf('fourps');
    final dswd = membershipOf('dswd_nhts');
    final senior = membershipOf('senior_citizen');
    final pwd = membershipOf('pwd');
    final indigenous = membershipOf('indigenous_member');
    final other = membershipOf('other');

    firstName.text = patient.firstName;
    middleName.text = patient.middleName ?? '';
    lastName.text = patient.lastName;
    suffix.text = patient.suffix ?? '';
    contactNumber.text = patient.contactNumber ?? '';
    email.text = patient.email ?? '';
    emergencyContactName.text = patient.emergencyContactName ?? '';
    emergencyContactNumber.text = patient.emergencyContactNumber ?? '';
    motherMaidenName.text = details?.motherMaidenName ?? '';
    spouseName.text = details?.spouseName ?? '';
    purok.text = details?.addressPurok ?? '';
    municipalityText.text = details?.addressMunicipality ?? '';
    barangayText.text = details?.addressBarangay ?? '';
    provinceText.text = details?.province ?? '';
    philhealthNo.text = formatPhilHealthNumber(
      philhealth?.membershipIdNo ?? details?.philhealthNo ?? '',
    );
    seniorCitizenId.text = senior?.membershipIdNo ?? '';
    pwdId.text = pwd?.membershipIdNo ?? '';
    indigenousTribe.text = indigenous?.extraValue ?? '';
    otherMembershipCustomName.text = other?.membershipLabel ?? '';
    otherMembershipCustomId.text = other?.membershipIdNo ?? '';

    gender = patient.gender;
    bloodType = details?.bloodType;
    civilStatus = details?.civilStatus;
    educationalAttainment = details?.educationalAttainment;
    employmentStatus = details?.employmentStatus;
    familyMember = details?.familyMember;
    philhealthMember = philhealth != null ? 'yes' : details?.philhealthMember;
    philhealthStatus = philhealth?.statusValue ?? details?.philhealthStatus;
    philhealthCategory = philhealth?.category ?? details?.philhealthCategory;
    fourpsMember = fourps != null ? 'yes' : details?.fourpsMember;
    fourpsCategory = fourps?.category ?? details?.fourpsCategory;
    fourpsRelationship =
        fourps?.relationshipValue ?? details?.fourpsRelationship;
    registeredFourpsBeneficiary =
        fourps?.registeredBeneficiary ?? details?.registeredFourpsBeneficiary;
    dswdNhts = dswd != null ? 'yes' : details?.dswdNhts;
    hasMembership =
        details?.hasMembership ?? (memberships.isNotEmpty ? 'yes' : null);

    if (senior != null) otherMemberships.add('senior_citizen');
    if (pwd != null) otherMemberships.add('pwd');
    if (indigenous != null) otherMemberships.add('indigenous_member');
    if (other != null) otherMemberships.add('others');

    if (patient.dateOfBirth != null) {
      final parsed = DateTime.tryParse(patient.dateOfBirth!);
      if (parsed != null) {
        selectedBirthDate = parsed;
        birthDate.text = patient.dateOfBirth!;
      }
    }
  }

  void setError(String? message) {
    isSaving = false;
    error = message;
    _notify();
    if (message != null) {
      scrollToTop();
    }
  }

  void scrollToTop() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_disposed) return;
      if (scrollController.hasClients) {
        scrollController.animateTo(
          0.0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void setRelationship(String value) {
    relationship = value;
    _notify();
    if (value == 'self') {
      autoFillFromAccount();
    }
  }

  void setBirthDate(DateTime date) {
    selectedBirthDate = date;
    birthDate.text = date.toIso8601String().split('T').first;
    _notify();
  }

  void setMunicipality(String? code) {
    selectedMunicipalityCode = code;
    selectedBarangayCode = null;
    barangayText.clear();
    final matched = municipalities.where((m) => m.code == code).firstOrNull;
    municipalityText.text = matched?.name ?? '';
    _notify();
    if (code != null) {
      loadBarangays(code);
    }
  }

  void setBarangay(String? code) {
    selectedBarangayCode = code;
    final matched = barangays.where((b) => b.code == code).firstOrNull;
    barangayText.text = matched?.name ?? '';
    _notify();
  }

  void toggleOtherMembership(String key, bool selected) {
    if (selected) {
      otherMemberships.add(key);
    } else {
      otherMemberships.remove(key);
      if (key == 'senior_citizen') seniorCitizenId.clear();
      if (key == 'pwd') pwdId.clear();
      if (key == 'indigenous_member') indigenousTribe.clear();
      if (key == 'others') {
        otherMembershipCustomName.clear();
        otherMembershipCustomId.clear();
      }
    }
    _notify();
  }

  void updateState(VoidCallback fn) {
    fn();
    _notify();
  }

  bool validateCurrentForm() {
    error = null;
    final formState = formKey.currentState;
    if (formState == null) return true;
    final invalid = formState.validateGranularly();
    if (invalid.isNotEmpty) {
      autoValidateMode = AutovalidateMode.onUserInteraction;
      final firstError =
          invalid.first.errorText ?? 'Please resolve highlighted form errors.';
      setError(firstError);
      return false;
    }
    _notify();
    return true;
  }

  bool nextStep() {
    if (!validateCurrentForm()) return false;
    final steps = activeSteps;
    final idx = currentStepIndex;
    if (idx + 1 < steps.length) {
      error = null;
      currentStepId = steps[idx + 1];
      autoValidateMode = AutovalidateMode.disabled;
      _notify();
      scrollToTop();
      return true;
    }
    return false;
  }

  bool prevStep() {
    final steps = activeSteps;
    final idx = currentStepIndex;
    if (idx > 0) {
      error = null;
      currentStepId = steps[idx - 1];
      autoValidateMode = AutovalidateMode.disabled;
      _notify();
      scrollToTop();
      return true;
    }
    return false;
  }

  String _resolvedMunicipalityName() {
    final activePolicy = policy;
    if (activePolicy == null ||
        !activePolicy.isProfileFieldVisible('address_municipality')) {
      return '';
    }
    if (useManualAddressFields) {
      return municipalityText.text.trim();
    }
    return municipalities
        .firstWhere(
          (m) => m.code == selectedMunicipalityCode,
          orElse: () => const PsgcLocation(code: '', name: ''),
        )
        .name;
  }

  String _resolvedBarangayName() {
    final activePolicy = policy;
    if (activePolicy == null ||
        !activePolicy.isProfileFieldVisible('address_barangay')) {
      return '';
    }
    if (useManualAddressFields ||
        !activePolicy.isProfileFieldVisible('address_municipality')) {
      return barangayText.text.trim();
    }
    return barangays
        .firstWhere(
          (b) => b.code == selectedBarangayCode,
          orElse: () => const PsgcLocation(code: '', name: ''),
        )
        .name;
  }

  String? _resolvedProvinceName() {
    final activePolicy = policy;
    if (activePolicy == null ||
        !activePolicy.isProfileFieldVisible('province')) {
      return null;
    }
    final typed = provinceText.text.trim();
    if (typed.isNotEmpty) return typed;
    return locationContext?.province ?? existingPatient?.details?.province;
  }

  Map<String, dynamic> buildPayload(ConfiguredFieldPolicy activePolicy) {
    final municipalityName = _resolvedMunicipalityName();
    final barangayName = _resolvedBarangayName();
    final provinceName = _resolvedProvinceName();
    final fullAddress = activePolicy.isFullAddressDerivable
        ? PsgcService.formatAddress(
            purok: purok.text.trim().isEmpty ? null : purok.text.trim(),
            barangayName: barangayName.isNotEmpty ? barangayName : null,
            municipalityName:
                municipalityName.isNotEmpty ? municipalityName : null,
            provinceName: provinceName,
          )
        : null;

    return ConfiguredPayloadBuilder.buildProfilePayload(
      policy: activePolicy,
      relationship: relationship,
      firstName: firstName.text,
      middleName: middleName.text,
      lastName: lastName.text,
      suffix: suffix.text,
      gender: gender,
      dateOfBirth: selectedBirthDate?.toIso8601String().split('T').first,
      contactNumber: contactNumber.text.trim().isNotEmpty
          ? AppValidators.normalizePhMobile(contactNumber.text)
          : null,
      email: email.text,
      emergencyContactName: emergencyContactName.text,
      emergencyContactNumber: emergencyContactNumber.text.trim().isNotEmpty
          ? AppValidators.normalizePhMobile(emergencyContactNumber.text)
          : null,
      bloodType: bloodType,
      motherMaidenName: motherMaidenName.text,
      civilStatus: civilStatus,
      spouseName: spouseName.text,
      derivedFullAddress: fullAddress,
      addressMunicipality: municipalityName,
      addressBarangay: barangayName,
      addressPurok: purok.text,
      province: provinceName,
      educationalAttainment: educationalAttainment,
      employmentStatus: employmentStatus,
      familyMember: familyMember,
      hasMembership: hasMembership,
      philhealthMember: philhealthMember,
      philhealthStatus: philhealthStatus,
      philhealthNo: philhealthNo.text,
      philhealthCategory: philhealthCategory,
      fourpsMember: fourpsMember,
      fourpsCategory: fourpsCategory,
      fourpsRelationship: fourpsRelationship,
      registeredFourpsBeneficiary: registeredFourpsBeneficiary,
      dswdNhts: dswdNhts,
      otherMemberships: otherMemberships,
      seniorCitizenId: seniorCitizenId.text,
      pwdId: pwdId.text,
      indigenousTribe: indigenousTribe.text,
      otherMembershipCustomName: otherMembershipCustomName.text,
      otherMembershipCustomId: otherMembershipCustomId.text,
    );
  }

  ProfileStepId? _firstMissingRequiredStep(ConfiguredFieldPolicy activePolicy) {
    if (firstName.text.trim().isEmpty ||
        lastName.text.trim().isEmpty ||
        gender == null ||
        gender!.isEmpty ||
        (activePolicy.isProfileFieldRequired('blood_type') &&
            (bloodType == null || bloodType!.isEmpty)) ||
        (activePolicy.isProfileFieldRequired('mother_maiden_name') &&
            motherMaidenName.text.trim().isEmpty) ||
        (activePolicy.isProfileFieldRequired('civil_status') &&
            (civilStatus == null || civilStatus!.isEmpty)) ||
        (activePolicy.isProfileFieldRequired(
              'spouse_name',
              civilStatus: civilStatus,
            ) &&
            spouseName.text.trim().isEmpty)) {
      return ProfileStepId.basicInfo;
    }

    if ((activePolicy.isProfileFieldRequired('address_municipality') &&
            _resolvedMunicipalityName().isEmpty) ||
        (activePolicy.isProfileFieldRequired('address_barangay') &&
            _resolvedBarangayName().isEmpty) ||
        (activePolicy.isProfileFieldRequired('address_purok') &&
            purok.text.trim().isEmpty) ||
        (activePolicy.isProfileFieldRequired('province') &&
            (_resolvedProvinceName() ?? '').trim().isEmpty)) {
      return ProfileStepId.addressAndContact;
    }

    if (activePolicy.activeProfileSteps().contains(
      ProfileStepId.socioeconomicAndProgram,
    )) {
      final effectiveNo = hasMembership == 'no';
      final effectivePh = effectiveNo ? 'no' : philhealthMember;
      final effectiveFourps = effectiveNo ? 'no' : fourpsMember;
      final effectiveDswd = effectiveNo ? 'no' : dswdNhts;
      if ((activePolicy.isProfileFieldRequired('educational_attainment') &&
              (educationalAttainment == null ||
                  educationalAttainment!.isEmpty)) ||
          (activePolicy.isProfileFieldRequired('employment_status') &&
              (employmentStatus == null || employmentStatus!.isEmpty)) ||
          (activePolicy.isProfileFieldRequired('family_member') &&
              (familyMember == null || familyMember!.isEmpty)) ||
          (activePolicy.isProfileFieldRequired('philhealth_member') &&
              (effectivePh == null || effectivePh.isEmpty)) ||
          (activePolicy.isProfileFieldRequired(
                'philhealth_status',
                philhealthMember: effectivePh,
              ) &&
              (philhealthStatus == null || philhealthStatus!.isEmpty)) ||
          (activePolicy.isProfileFieldRequired(
                'philhealth_no',
                philhealthMember: effectivePh,
              ) &&
              philhealthNo.text.trim().isEmpty) ||
          (activePolicy.isProfileFieldRequired(
                'philhealth_category',
                philhealthMember: effectivePh,
              ) &&
              (philhealthCategory == null || philhealthCategory!.isEmpty)) ||
          (activePolicy.isProfileFieldRequired('fourps_member') &&
              (effectiveFourps == null || effectiveFourps.isEmpty)) ||
          (activePolicy.isProfileFieldRequired('dswd_nhts') &&
              (effectiveDswd == null || effectiveDswd.isEmpty))) {
        return ProfileStepId.socioeconomicAndProgram;
      }
    }

    return null;
  }

  Future<({ProfileSaveOutcome outcome, PatientProfile? patient})> save() async {
    if (isSaving) {
      return (outcome: ProfileSaveOutcome.error, patient: null);
    }
    if (!validateCurrentForm()) {
      return (outcome: ProfileSaveOutcome.validationFailed, patient: null);
    }
    if (gender == null || gender!.isEmpty) {
      setError('Gender is required.');
      return (outcome: ProfileSaveOutcome.validationFailed, patient: null);
    }

    final emailValue = email.text.trim();
    final emailPattern = RegExp(r"^[^@\s]+@[^@\s]+\.[^@\s]+$");
    if (emailValue.isNotEmpty && !emailPattern.hasMatch(emailValue)) {
      setError('Please enter a valid email address.');
      return (outcome: ProfileSaveOutcome.validationFailed, patient: null);
    }

    isSaving = true;
    error = null;
    _notify();

    try {
      final previousRevision = _config?.revision;
      final refreshed = isEditMode
          ? await _configRepository.forPatient(
              existingPatient!.id,
              forceRefresh: true,
            )
          : await _configRepository.forNewProfile(
              MobileApi.clinicId,
              forceRefresh: true,
            );
      if (_disposed) {
        return (outcome: ProfileSaveOutcome.error, patient: null);
      }

      _applyConfig(refreshed);
      final activePolicy = ConfiguredFieldPolicy(refreshed);

      if (previousRevision != null && previousRevision != refreshed.revision) {
        final missingStep = _firstMissingRequiredStep(activePolicy);
        if (missingStep != null) {
          currentStepId = missingStep;
        }
        autoValidateMode = AutovalidateMode.onUserInteraction;
        isSaving = false;
        error =
            'Clinic form requirements were updated. Please review the highlighted fields before saving.';
        _notify();
        scrollToTop();
        WidgetsBinding.instance.addPostFrameCallback((_) {
          formKey.currentState?.validateGranularly();
        });
        return (outcome: ProfileSaveOutcome.policyChanged, patient: null);
      }

      final missingStep = _firstMissingRequiredStep(activePolicy);
      if (missingStep != null) {
        currentStepId = missingStep;
        autoValidateMode = AutovalidateMode.onUserInteraction;
        isSaving = false;
        error = 'Please complete all required fields before saving.';
        _notify();
        scrollToTop();
        WidgetsBinding.instance.addPostFrameCallback((_) {
          formKey.currentState?.validateGranularly();
        });
        return (outcome: ProfileSaveOutcome.validationFailed, patient: null);
      }

      if (activePolicy.isProfileFieldVisible(
            'philhealth_no',
            philhealthMember: philhealthMember,
          ) &&
          philhealthMember == 'yes') {
        final phRequired = activePolicy.isProfileFieldRequired(
          'philhealth_no',
          philhealthMember: philhealthMember,
        );
        if (phRequired || philhealthNo.text.trim().isNotEmpty) {
          final phError = AppValidators.philHealth(
            philhealthNo.text,
            isMember: phRequired,
          );
          if (phError != null) {
            setError(phError);
            return (
              outcome: ProfileSaveOutcome.validationFailed,
              patient: null,
            );
          }
        }
      }

      if (activePolicy.isGovProgramsCardVisible && hasMembership == 'yes') {
        final memberships = ConfiguredPayloadBuilder.buildMembershipPayload(
          policy: activePolicy,
          hasMembership: hasMembership,
          philhealthMember: philhealthMember,
          philhealthStatus: philhealthStatus,
          philhealthNo: philhealthNo.text,
          philhealthCategory: philhealthCategory,
          fourpsMember: fourpsMember,
          fourpsCategory: fourpsCategory,
          fourpsRelationship: fourpsRelationship,
          registeredFourpsBeneficiary: registeredFourpsBeneficiary,
          dswdNhts: dswdNhts,
          otherMemberships: otherMemberships,
          seniorCitizenId: seniorCitizenId.text,
          pwdId: pwdId.text,
          indigenousTribe: indigenousTribe.text,
          otherMembershipCustomName: otherMembershipCustomName.text,
          otherMembershipCustomId: otherMembershipCustomId.text,
        );
        if (memberships.isEmpty &&
            activePolicy.editableMembershipTypes().isNotEmpty) {
          setError(
            'Please select at least one membership or government program.',
          );
          return (
            outcome: ProfileSaveOutcome.validationFailed,
            patient: null,
          );
        }
      }

      final payload = buildPayload(activePolicy);
      final saved = isEditMode
          ? await api.updatePatient(
                  patientId: existingPatient!.id,
                  profile: payload,
                  configRevision: refreshed.revision,
                )
                as PatientProfile
          : await api.createPatient(
                  payload,
                  configRevision: refreshed.revision,
                )
                as PatientProfile;

      if (_disposed) {
        return (outcome: ProfileSaveOutcome.error, patient: null);
      }
      isSaving = false;
      _notify();
      return (outcome: ProfileSaveOutcome.saved, patient: saved);
    } on ApiException catch (err) {
      if (_disposed) {
        return (outcome: ProfileSaveOutcome.error, patient: null);
      }
      if (err.isConfigConflict) {
        if (err.updatedConfiguration != null) {
          _applyConfig(err.updatedConfiguration!);
          final updatedPolicy = ConfiguredFieldPolicy(err.updatedConfiguration!);
          final missingStep = _firstMissingRequiredStep(updatedPolicy);
          if (missingStep != null) {
            currentStepId = missingStep;
          }
        }
        autoValidateMode = AutovalidateMode.onUserInteraction;
        isSaving = false;
        error = err.message;
        _notify();
        scrollToTop();
        WidgetsBinding.instance.addPostFrameCallback((_) {
          formKey.currentState?.validateGranularly();
        });
        return (outcome: ProfileSaveOutcome.policyChanged, patient: null);
      }
      setError(err.message);
      return (outcome: ProfileSaveOutcome.error, patient: null);
    } catch (err) {
      if (!_disposed) {
        setError(err.toString());
      }
      return (outcome: ProfileSaveOutcome.error, patient: null);
    }
  }

  @override
  void dispose() {
    _disposed = true;
    scrollController.dispose();
    firstName.dispose();
    middleName.dispose();
    lastName.dispose();
    suffix.dispose();
    birthDate.dispose();
    contactNumber.dispose();
    email.dispose();
    emergencyContactName.dispose();
    emergencyContactNumber.dispose();
    motherMaidenName.dispose();
    spouseName.dispose();
    purok.dispose();
    municipalityText.dispose();
    barangayText.dispose();
    provinceText.dispose();
    philhealthNo.dispose();
    seniorCitizenId.dispose();
    pwdId.dispose();
    indigenousTribe.dispose();
    otherMembershipCustomName.dispose();
    otherMembershipCustomId.dispose();
    super.dispose();
  }
}
