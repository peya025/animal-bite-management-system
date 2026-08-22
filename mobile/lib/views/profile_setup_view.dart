import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/patient_account_profile.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../services/psgc_service.dart';
import '../widgets/common/app_page_header.dart';

class ProfileSetupView extends StatefulWidget {
  const ProfileSetupView({
    super.key,
    this.initialRelationship = 'self',
    this.returnToBooking = false,
    this.existingPatient,
  });

  final String initialRelationship;
  final bool returnToBooking;
  final PatientProfile? existingPatient;

  @override
  State<ProfileSetupView> createState() => _ProfileSetupViewState();
}

class _ProfileSetupViewState extends State<ProfileSetupView> {
  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _middleName = TextEditingController();
  final _lastName = TextEditingController();
  final _suffix = TextEditingController();
  final _birthDate = TextEditingController();
  final _contactNumber = TextEditingController();
  final _email = TextEditingController();
  final _emergencyContactName = TextEditingController();
  final _emergencyContactNumber = TextEditingController();
  final _motherMaidenName = TextEditingController();
  final _spouseName = TextEditingController();
  final _purok = TextEditingController();
  final _municipalityText = TextEditingController();
  final _barangayText = TextEditingController();
  final _philhealthNo = TextEditingController();
  final _seniorCitizenId = TextEditingController();
  final _pwdId = TextEditingController();
  final _indigenousTribe = TextEditingController();
  final _otherMembershipCustomName = TextEditingController();
  final _otherMembershipCustomId = TextEditingController();

  int _currentStep = 0; // 0: Step 1, 1: Step 2, 2: Step 3

  late String _relationship;
  String? _gender;
  String? _bloodType;
  String? _civilStatus;
  String? _educationalAttainment;
  String? _employmentStatus;
  String? _familyMember;
  String? _philhealthMember;
  String? _philhealthStatus;
  String? _philhealthCategory;
  String? _fourpsMember;
  String? _fourpsCategory;
  String? _fourpsRelationship;
  String? _registeredFourpsBeneficiary;
  String? _dswdNhts;
  String? _hasMembership;
  final Set<String> _otherMemberships = <String>{};

  DateTime? _selectedBirthDate;
  bool _isLoading = false;
  String? _error;

  // Address (PSGC)
  List<PsgcLocation> _municipalities = [];
  List<PsgcLocation> _barangays = [];
  String? _selectedMunicipalityCode;
  String? _selectedBarangayCode;
  bool _loadingMunicipalities = false;
  bool _loadingBarangays = false;
  bool _didSyncAddressFromExistingPatient = false;
  bool _useManualAddressFields = false;
  ClinicLocationContext? _locationContext;

  bool get _isEditMode => widget.existingPatient != null;

  @override
  void initState() {
    super.initState();
    _relationship =
        widget.existingPatient?.relationship ?? widget.initialRelationship;
    _prefillFromExistingPatient();
    if (!_isEditMode && _relationship == 'self') {
      _autoFillFromAccount();
    }
    _loadMunicipalities();
  }

  Future<void> _autoFillFromAccount() async {
    if (_isEditMode) return;
    try {
      final account = await api.account() as PatientAccountProfile;
      if (!mounted) return;

      setState(() {
        if (_email.text.isEmpty && account.email.isNotEmpty) {
          _email.text = account.email;
        }
        if (_contactNumber.text.isEmpty &&
            account.phone != null &&
            account.phone!.isNotEmpty) {
          _contactNumber.text = account.phone!;
        }

        if (_firstName.text.isEmpty &&
            _lastName.text.isEmpty &&
            account.name.trim().isNotEmpty) {
          final parts = account.name.trim().split(RegExp(r'\s+'));
          if (parts.length == 1) {
            _firstName.text = parts.first;
          } else if (parts.length == 2) {
            _firstName.text = parts.first;
            _lastName.text = parts.last;
          } else if (parts.length >= 3) {
            _firstName.text = parts.first;
            _middleName.text = parts.sublist(1, parts.length - 1).join(' ');
            _lastName.text = parts.last;
          }
        }
      });
    } catch (_) {
      // Ignore if account loading fails
    }
  }

  Future<void> _loadMunicipalities() async {
    setState(() => _loadingMunicipalities = true);
    try {
      final locationContext =
          await api.locationContext() as ClinicLocationContext;
      final municipalities =
          await api.locationMunicipalities() as List<PsgcLocation>;
      if (mounted) {
        setState(() {
          _locationContext = locationContext;
          _municipalities = municipalities;
          _loadingMunicipalities = false;
          _useManualAddressFields = municipalities.isEmpty;
        });
        await _syncAddressSelectionFromExistingPatient();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingMunicipalities = false;
          _useManualAddressFields = true;
        });
        await _syncAddressSelectionFromExistingPatient();
      }
    }
  }

  Future<void> _loadBarangays(String municipalityCode) async {
    setState(() {
      _loadingBarangays = true;
      _barangays = [];
      _selectedBarangayCode = null;
    });
    try {
      final barangays =
          await api.locationBarangays(municipalityCode: municipalityCode)
              as List<PsgcLocation>;
      if (mounted) {
        setState(() {
          _barangays = barangays;
          _loadingBarangays = false;
          _useManualAddressFields = barangays.isEmpty;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingBarangays = false;
          _useManualAddressFields = true;
        });
      }
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

    final details = widget.existingPatient?.details;
    final municipalityName = details?.addressMunicipality?.trim();
    final barangayName = details?.addressBarangay?.trim();

    if (municipalityName == null || municipalityName.isEmpty) return;

    final matchedMunicipality = _findLocationByName(
      _municipalities,
      municipalityName,
    );

    if (matchedMunicipality == null) {
      if (mounted) {
        setState(() {
          _useManualAddressFields = true;
          _municipalityText.text = municipalityName;
          _barangayText.text = barangayName ?? '';
        });
      }
      return;
    }

    if (mounted) {
      setState(() {
        _selectedMunicipalityCode = matchedMunicipality.code;
        _municipalityText.text = matchedMunicipality.name;
      });
    }

    await _loadBarangays(matchedMunicipality.code);
    if (!mounted || barangayName == null || barangayName.isEmpty) return;

    final matchedBarangay = _findLocationByName(_barangays, barangayName);

    if (matchedBarangay != null) {
      setState(() {
        _selectedBarangayCode = matchedBarangay.code;
        _barangayText.text = matchedBarangay.name;
      });
    } else {
      setState(() {
        _useManualAddressFields = true;
        _barangayText.text = barangayName;
      });
    }
  }

  Future<void> _chooseBirthDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedBirthDate ?? DateTime(now.year - 20, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime(now.year, now.month, now.day - 1),
    );
    if (date == null || !mounted) return;
    setState(() {
      _selectedBirthDate = date;
      _birthDate.text = date.toIso8601String().split('T').first;
    });
  }

  String? _optional(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  void _prefillFromExistingPatient() {
    final patient = widget.existingPatient;
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

    _firstName.text = patient.firstName;
    _middleName.text = patient.middleName ?? '';
    _lastName.text = patient.lastName;
    _suffix.text = patient.suffix ?? '';
    _contactNumber.text = patient.contactNumber ?? '';
    _email.text = patient.email ?? '';
    _emergencyContactName.text = patient.emergencyContactName ?? '';
    _emergencyContactNumber.text = patient.emergencyContactNumber ?? '';
    _motherMaidenName.text = details?.motherMaidenName ?? '';
    _spouseName.text = details?.spouseName ?? '';
    _purok.text = details?.addressPurok ?? '';
    _municipalityText.text = details?.addressMunicipality ?? '';
    _barangayText.text = details?.addressBarangay ?? '';
    _philhealthNo.text =
        philhealth?.membershipIdNo ?? details?.philhealthNo ?? '';
    _seniorCitizenId.text = senior?.membershipIdNo ?? '';
    _pwdId.text = pwd?.membershipIdNo ?? '';
    _indigenousTribe.text = indigenous?.extraValue ?? '';
    _otherMembershipCustomName.text = other?.membershipLabel ?? '';
    _otherMembershipCustomId.text = other?.membershipIdNo ?? '';

    _gender = patient.gender;
    _bloodType = details?.bloodType;
    _civilStatus = details?.civilStatus;
    _educationalAttainment = details?.educationalAttainment;
    _employmentStatus = details?.employmentStatus;
    _familyMember = details?.familyMember;
    _philhealthMember = philhealth != null ? 'yes' : details?.philhealthMember;
    _philhealthStatus = philhealth?.statusValue ?? details?.philhealthStatus;
    _philhealthCategory = philhealth?.category ?? details?.philhealthCategory;
    _fourpsMember = fourps != null ? 'yes' : details?.fourpsMember;
    _fourpsCategory = fourps?.category ?? details?.fourpsCategory;
    _fourpsRelationship = fourps?.relationshipValue ?? details?.fourpsRelationship;
    _registeredFourpsBeneficiary =
        fourps?.registeredBeneficiary ?? details?.registeredFourpsBeneficiary;
    _dswdNhts = dswd != null ? 'yes' : details?.dswdNhts;
    _hasMembership = details?.hasMembership ??
        (memberships.isNotEmpty ? 'yes' : null);

    if (senior != null) _otherMemberships.add('senior_citizen');
    if (pwd != null) _otherMemberships.add('pwd');
    if (indigenous != null) _otherMemberships.add('indigenous_member');
    if (other != null) _otherMemberships.add('others');

    if (patient.dateOfBirth != null) {
      final parsed = DateTime.tryParse(patient.dateOfBirth!);
      if (parsed != null) {
        _selectedBirthDate = parsed;
        _birthDate.text = patient.dateOfBirth!;
      }
    }
  }

  List<Map<String, dynamic>> _buildMembershipPayload() {
    final list = <Map<String, dynamic>>[];

    if (_philhealthMember == 'yes') {
      list.add({
        'membership_type': 'philhealth',
        'membership_id_no': _optional(_philhealthNo),
        'category': _optionalController(_philhealthCategory),
        'relationship_type': _optionalController(_philhealthStatus),
      });
    }

    if (_fourpsMember == 'yes') {
      list.add({
        'membership_type': 'fourps',
        'category': _optionalController(_fourpsCategory),
        'relationship_value': _optionalController(_fourpsRelationship),
        'registered_beneficiary':
            _optionalController(_registeredFourpsBeneficiary),
      });
    }

    if (_dswdNhts == 'yes') {
      list.add({'membership_type': 'dswd_nhts'});
    }

    if (_otherMemberships.contains('senior_citizen')) {
      list.add({
        'membership_type': 'senior_citizen',
        'membership_id_no': _optional(_seniorCitizenId),
      });
    }

    if (_otherMemberships.contains('pwd')) {
      list.add({
        'membership_type': 'pwd',
        'membership_id_no': _optional(_pwdId),
      });
    }

    if (_otherMemberships.contains('indigenous_member')) {
      list.add({
        'membership_type': 'indigenous_member',
        'extra_value': _optional(_indigenousTribe),
      });
    }

    if (_otherMemberships.contains('others')) {
      list.add({
        'membership_type': 'other',
        'membership_label': _optional(_otherMembershipCustomName),
        'membership_id_no': _optional(_otherMembershipCustomId),
      });
    }

    return list;
  }

  String? _optionalController(String? value) {
    final trimmed = value?.trim();
    return (trimmed == null || trimmed.isEmpty) ? null : trimmed;
  }

  void _nextStep() {
    setState(() => _error = null);

    if (_currentStep == 0) {
      // Validate Step 1: Basic info
      if (_firstName.text.trim().isEmpty || _lastName.text.trim().isEmpty) {
        setState(() => _error = 'Please enter first name and last name.');
        return;
      }
      if (_gender == null) {
        setState(() => _error = 'Please select a gender.');
        return;
      }
      setState(() => _currentStep = 1);
    } else if (_currentStep == 1) {
      // Validate Step 2: Address & Contact
      if (_useManualAddressFields) {
        if (_municipalityText.text.trim().isEmpty ||
            _barangayText.text.trim().isEmpty) {
          setState(() => _error = 'Please enter municipality and barangay.');
          return;
        }
      } else {
        if (_selectedMunicipalityCode == null ||
            _selectedBarangayCode == null) {
          setState(() => _error = 'Please select municipality and barangay.');
          return;
        }
      }

      final contact = _contactNumber.text.trim();
      if (contact.isNotEmpty && contact.length != 11) {
        setState(() => _error = 'Contact number must be exactly 11 digits.');
        return;
      }

      final emailVal = _email.text.trim();
      final emailPattern = RegExp("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+\$");
      if (emailVal.isNotEmpty && !emailPattern.hasMatch(emailVal)) {
        setState(() => _error = 'Please enter a valid email address.');
        return;
      }

      setState(() => _currentStep = 2);
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _error = null;
        _currentStep--;
      });
    } else {
      Navigator.of(context).maybePop();
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      setState(() => _error = 'Please resolve highlighted form errors.');
      return;
    }

    if (_gender == null) {
      setState(() => _error = 'Gender is required.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final emailValue = _email.text.trim();
      final emailPattern = RegExp("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+\$");
      if (emailValue.isNotEmpty && !emailPattern.hasMatch(emailValue)) {
        setState(() {
          _isLoading = false;
          _error = 'Please enter a valid email address.';
        });
        return;
      }

      if (_philhealthNo.text.trim().isNotEmpty &&
          _philhealthNo.text.replaceAll(RegExp(r'\D'), '').length != 12) {
        setState(() {
          _isLoading = false;
          _error = 'PhilHealth number must contain exactly 12 digits.';
        });
        return;
      }

      final memberships = _buildMembershipPayload();
      if (_hasMembership == 'yes' && memberships.isEmpty) {
        setState(() {
          _isLoading = false;
          _error =
              'Please select at least one membership or government program.';
        });
        return;
      }

      final municipalityName = _useManualAddressFields
          ? (_optional(_municipalityText) ?? '')
          : _municipalities
                .firstWhere(
                  (m) => m.code == _selectedMunicipalityCode,
                  orElse: () => const PsgcLocation(code: '', name: ''),
                )
                .name;
      final barangayName = _useManualAddressFields
          ? (_optional(_barangayText) ?? '')
          : _barangays
                .firstWhere(
                  (b) => b.code == _selectedBarangayCode,
                  orElse: () => const PsgcLocation(code: '', name: ''),
                )
                .name;
      final provinceName =
          _locationContext?.province ??
          widget.existingPatient?.details?.province;

      final fullAddress = PsgcService.formatAddress(
        purok: _optional(_purok),
        barangayName: barangayName.isNotEmpty ? barangayName : null,
        municipalityName: municipalityName.isNotEmpty ? municipalityName : null,
        provinceName: provinceName,
      );

      final payload = {
        'relationship': _relationship,
        'first_name': _firstName.text.trim(),
        'middle_name': _optional(_middleName),
        'last_name': _lastName.text.trim(),
        'suffix': _optional(_suffix),
        'gender': _gender,
        'date_of_birth': _selectedBirthDate?.toIso8601String().split('T').first,
        'contact_number': _optional(_contactNumber),
        'email': _optional(_email),
        'emergency_contact_name': _optional(_emergencyContactName),
        'emergency_contact_number': _optional(_emergencyContactNumber),
        'blood_type': _bloodType,
        'mother_maiden_name': _optional(_motherMaidenName),
        'civil_status': _civilStatus,
        'spouse_name': _optional(_spouseName),
        'address': fullAddress.isNotEmpty ? fullAddress : null,
        'address_municipality': municipalityName.isNotEmpty
            ? municipalityName
            : null,
        'address_barangay': barangayName.isNotEmpty ? barangayName : null,
        'address_purok': _optional(_purok),
        'province': provinceName,
        'educational_attainment': _educationalAttainment,
        'employment_status': _employmentStatus,
        'family_member': _familyMember,
        'philhealth_member': _philhealthMember,
        'philhealth_status': _philhealthStatus,
        'philhealth_no': _optional(_philhealthNo),
        'philhealth_category': _philhealthCategory,
        'fourps_member': _fourpsMember,
        'fourps_category': _fourpsCategory,
        'fourps_relationship': _fourpsRelationship,
        'registered_fourps_beneficiary': _registeredFourpsBeneficiary,
        'dswd_nhts': _dswdNhts,
        'has_membership': _hasMembership,
        'memberships': memberships,
      };

      final patient = _isEditMode
          ? await api.updatePatient(
                  patientId: widget.existingPatient!.id,
                  profile: payload,
                )
                as PatientProfile
          : await api.createPatient(payload) as PatientProfile;
      if (!mounted) return;
      if (_isEditMode || widget.returnToBooking) {
        Navigator.of(context).pop(patient);
        return;
      }
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.menu, (route) => false);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentStep == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _currentStep > 0) {
          _prevStep();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF4F6F5),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AppPageHeader(
                        title: _isEditMode
                            ? 'Edit patient profile'
                            : 'Patient profile',
                        subtitle: _isEditMode
                            ? 'Update the saved Form 1 details for this patient.'
                            : 'Add yourself or a dependent.',
                        onBack: _prevStep,
                      ),
                      const SizedBox(height: 16),
                      // Step Progress Header
                      _buildStepProgressHeader(),
                      const SizedBox(height: 16),
                      if (_error case final message?) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEE2E2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            message,
                            style: const TextStyle(
                              color: Color(0xFFDC2626),
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // STEP 1: Basic Info (Relationship + Personal Info)
                      if (_currentStep == 0) ...[
                        // Card 1: Relationship
                        _sectionCard(
                          icon: Icons.people_outline_rounded,
                          title: 'Relationship',
                          children: [
                            _chipSelector<String>(
                              label: 'Who is this profile for?',
                              selectedValue: _relationship,
                              required: true,
                              options: const [
                                MapEntry('self', 'Myself'),
                                MapEntry('child', 'My child'),
                                MapEntry('dependent', 'Dependent'),
                              ],
                              onSelected: (value) {
                                setState(() => _relationship = value);
                                if (value == 'self') _autoFillFromAccount();
                              },
                            ),
                          ],
                        ),

                        // Card 2: Personal Information
                        _sectionCard(
                          icon: Icons.person_outline_rounded,
                          title: 'Personal information',
                          children: [
                            // 2-Column Row 1: First name & Last name
                            Row(
                              children: [
                                Expanded(
                                  child: _inputField(
                                    'First name',
                                    _firstName,
                                    hint: 'e.g. Juan',
                                    required: true,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _inputField(
                                    'Last name',
                                    _lastName,
                                    hint: 'e.g. Dela Cruz',
                                    required: true,
                                  ),
                                ),
                              ],
                            ),
                            // 2-Column Row 2: Middle name & Suffix
                            Row(
                              children: [
                                Expanded(
                                  child: _inputField(
                                    'Middle name',
                                    _middleName,
                                    hint: 'Optional',
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _inputField(
                                    'Suffix',
                                    _suffix,
                                    hint: 'Jr., Sr.',
                                  ),
                                ),
                              ],
                            ),
                            // Gender Chips
                            _chipSelector<String>(
                              label: 'Gender',
                              selectedValue: _gender,
                              required: true,
                              options: const [
                                MapEntry('male', 'Male'),
                                MapEntry('female', 'Female'),
                                MapEntry('other', 'Other'),
                              ],
                              onSelected: (value) =>
                                  setState(() => _gender = value),
                            ),
                            // 2-Column Row 3: Date of birth & Blood type
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: _inputField(
                                    'Date of birth',
                                    _birthDate,
                                    hint: 'MM / DD / YYYY',
                                    readOnly: true,
                                    onTap: _chooseBirthDate,
                                    suffixIcon: IconButton(
                                      onPressed: _chooseBirthDate,
                                      icon: const Icon(
                                        Icons.calendar_today_outlined,
                                        size: 16,
                                        color: Color(0xFF6B7280),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _dropdownField<String>(
                                    label: 'Blood type',
                                    selectedValue: _bloodType,
                                    hint: 'Select',
                                    items: const [
                                      DropdownMenuItem(
                                        value: 'A+',
                                        child: Text('A+'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'A-',
                                        child: Text('A-'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'B+',
                                        child: Text('B+'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'B-',
                                        child: Text('B-'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'AB+',
                                        child: Text('AB+'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'AB-',
                                        child: Text('AB-'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'O+',
                                        child: Text('O+'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'O-',
                                        child: Text('O-'),
                                      ),
                                    ],
                                    onChanged: (val) =>
                                        setState(() => _bloodType = val),
                                  ),
                                ),
                              ],
                            ),
                            _inputField(
                              'Mother\'s maiden name',
                              _motherMaidenName,
                              hint: 'Full name',
                            ),
                            _dropdownField<String>(
                              label: 'Civil status',
                              selectedValue: _civilStatus,
                              hint: 'Select status',
                              items: const [
                                DropdownMenuItem(
                                  value: 'single',
                                  child: Text('Single'),
                                ),
                                DropdownMenuItem(
                                  value: 'married',
                                  child: Text('Married'),
                                ),
                                DropdownMenuItem(
                                  value: 'widowed',
                                  child: Text('Widowed'),
                                ),
                                DropdownMenuItem(
                                  value: 'separated',
                                  child: Text('Separated'),
                                ),
                                DropdownMenuItem(
                                  value: 'annulled',
                                  child: Text('Annulled'),
                                ),
                                DropdownMenuItem(
                                  value: 'cohabitation',
                                  child: Text('Co-Habitation'),
                                ),
                              ],
                              onChanged: (val) =>
                                  setState(() => _civilStatus = val),
                            ),
                            if (_civilStatus == 'married')
                              _inputField(
                                'Spouse\'s name',
                                _spouseName,
                                hint: 'Full name',
                              ),
                          ],
                        ),
                      ],

                      // STEP 2: Address & Contact (Residential Address + Contact Num)
                      if (_currentStep == 1) ...[
                        // Card 3: Residential Address
                        _sectionCard(
                          icon: Icons.location_on_outlined,
                          title: 'Residential address — Misamis Oriental',
                          children: [
                            if (_useManualAddressFields) ...[
                              _inputField(
                                'City / Municipality',
                                _municipalityText,
                                hint: 'Select municipality',
                                required: true,
                              ),
                              _inputField(
                                'Barangay',
                                _barangayText,
                                hint: 'Select barangay',
                                required: true,
                              ),
                            ] else ...[
                              _dropdownField<String>(
                                label: 'City / Municipality',
                                selectedValue: _selectedMunicipalityCode,
                                required: true,
                                hint: _loadingMunicipalities
                                    ? 'Loading...'
                                    : 'Select municipality',
                                items: _municipalities
                                    .map(
                                      (m) => DropdownMenuItem(
                                        value: m.code,
                                        child: Text(m.name),
                                      ),
                                    )
                                    .toList(),
                                onChanged: _isLoading || _loadingMunicipalities
                                    ? null
                                    : (value) {
                                        setState(() {
                                          _selectedMunicipalityCode = value;
                                          _selectedBarangayCode = null;
                                          _barangayText.clear();
                                          final selectedMunicipality =
                                              _municipalities
                                                  .where((m) => m.code == value)
                                                  .firstOrNull;
                                          _municipalityText.text =
                                              selectedMunicipality?.name ?? '';
                                        });
                                        if (value != null)
                                          _loadBarangays(value);
                                      },
                              ),
                              _dropdownField<String>(
                                label: 'Barangay',
                                selectedValue: _selectedBarangayCode,
                                required: true,
                                hint: _loadingBarangays
                                    ? 'Loading...'
                                    : _selectedMunicipalityCode == null
                                    ? 'Select municipality first'
                                    : 'Select barangay',
                                items: _barangays
                                    .map(
                                      (b) => DropdownMenuItem(
                                        value: b.code,
                                        child: Text(b.name),
                                      ),
                                    )
                                    .toList(),
                                onChanged: _isLoading || _loadingBarangays
                                    ? null
                                    : (value) {
                                        setState(() {
                                          _selectedBarangayCode = value;
                                          final selectedBarangay = _barangays
                                              .where((b) => b.code == value)
                                              .firstOrNull;
                                          _barangayText.text =
                                              selectedBarangay?.name ?? '';
                                        });
                                      },
                              ),
                            ],
                            _inputField(
                              'Purok / Zone / Street',
                              _purok,
                              hint: 'e.g. Purok 4, Limketkai Drive',
                            ),
                          ],
                        ),

                        // Card 4: Contact Information
                        _sectionCard(
                          icon: Icons.phone_outlined,
                          title: 'Contact information',
                          children: [
                            _inputField(
                              'Contact number',
                              _contactNumber,
                              hint: '09XXXXXXXXX',
                              phone: true,
                            ),
                            _inputField(
                              'Email address',
                              _email,
                              hint: 'you@example.com',
                              email: true,
                            ),
                            // Info Callout Box
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE1F5EE),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Row(
                                children: [
                                  Icon(
                                    Icons.info_outline_rounded,
                                    size: 16,
                                    color: Color(0xFF085041),
                                  ),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Emergency contact details will be asked in the next step.',
                                      style: TextStyle(
                                        color: Color(0xFF085041),
                                        fontSize: 11,
                                        height: 1.3,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],

                      // STEP 3: Socioeconomic & Government Program
                      if (_currentStep == 2) ...[
                        // Card 5: Socioeconomic Information
                        _sectionCard(
                          icon: Icons.school_outlined,
                          title: 'Socioeconomic information',
                          children: [
                            _dropdownField<String>(
                              label: 'Educational attainment',
                              selectedValue: _educationalAttainment,
                              hint: 'Select education level',
                              items: const [
                                DropdownMenuItem(
                                  value: 'Elementary',
                                  child: Text('Elementary'),
                                ),
                                DropdownMenuItem(
                                  value: 'High School',
                                  child: Text('High School'),
                                ),
                                DropdownMenuItem(
                                  value: 'College',
                                  child: Text('College'),
                                ),
                                DropdownMenuItem(
                                  value: 'Postgraduate',
                                  child: Text('Postgraduate'),
                                ),
                                DropdownMenuItem(
                                  value: 'None',
                                  child: Text('None'),
                                ),
                              ],
                              onChanged: (val) =>
                                  setState(() => _educationalAttainment = val),
                            ),
                            _dropdownField<String>(
                              label: 'Employment status',
                              selectedValue: _employmentStatus,
                              hint: 'Select employment status',
                              items: const [
                                DropdownMenuItem(
                                  value: 'Employed',
                                  child: Text('Employed'),
                                ),
                                DropdownMenuItem(
                                  value: 'Unemployed',
                                  child: Text('Unemployed'),
                                ),
                                DropdownMenuItem(
                                  value: 'Student',
                                  child: Text('Student'),
                                ),
                                DropdownMenuItem(
                                  value: 'Retired',
                                  child: Text('Retired'),
                                ),
                              ],
                              onChanged: (val) =>
                                  setState(() => _employmentStatus = val),
                            ),
                            _dropdownField<String>(
                              label: 'Family member position',
                              selectedValue: _familyMember,
                              hint: 'Select position',
                              items: const [
                                DropdownMenuItem(
                                  value: 'Head',
                                  child: Text('Head of family'),
                                ),
                                DropdownMenuItem(
                                  value: 'Member',
                                  child: Text('Member'),
                                ),
                              ],
                              onChanged: (val) =>
                                  setState(() => _familyMember = val),
                            ),
                          ],
                        ),

                        // Card 6: Government Program / Membership
                        _sectionCard(
                          icon: Icons.card_membership_outlined,
                          title: 'Government program / membership',
                          children: [
                            _chipSelector<String>(
                              label:
                                  'Any government program or other membership?',
                              selectedValue: _hasMembership,
                              options: const [
                                MapEntry('yes', 'Yes'),
                                MapEntry('no', 'No'),
                              ],
                              onSelected: (val) =>
                                  setState(() => _hasMembership = val),
                            ),
                            if (_hasMembership == 'yes') ...[
                              _chipSelector<String>(
                                label: 'PhilHealth member?',
                                selectedValue: _philhealthMember,
                                options: const [
                                  MapEntry('yes', 'Yes'),
                                  MapEntry('no', 'No'),
                                ],
                                onSelected: (val) =>
                                    setState(() => _philhealthMember = val),
                              ),
                              if (_philhealthMember == 'yes') ...[
                                _inputField(
                                  'PhilHealth ID number',
                                  _philhealthNo,
                                  hint: '12-digit PhilHealth ID',
                                  phone: true,
                                ),
                              ],
                              _chipSelector<String>(
                                label: '4Ps member?',
                                selectedValue: _fourpsMember,
                                options: const [
                                  MapEntry('yes', 'Yes'),
                                  MapEntry('no', 'No'),
                                ],
                                onSelected: (val) =>
                                    setState(() => _fourpsMember = val),
                              ),
                              _chipSelector<String>(
                                label: 'DSWD NHTS?',
                                selectedValue: _dswdNhts,
                                options: const [
                                  MapEntry('yes', 'Yes'),
                                  MapEntry('no', 'No'),
                                ],
                                onSelected: (val) =>
                                    setState(() => _dswdNhts = val),
                              ),
                              const SizedBox(height: 6),
                              _sentenceLabel('Other memberships'),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _membershipChip(
                                    'senior_citizen',
                                    'Senior Citizen',
                                  ),
                                  _membershipChip('pwd', 'PWD'),
                                  _membershipChip(
                                    'indigenous_member',
                                    'Indigenous Member',
                                  ),
                                  _membershipChip('others', 'Others'),
                                ],
                              ),
                              if (_otherMemberships.contains('senior_citizen'))
                                _inputField(
                                  'Senior Citizen ID no.',
                                  _seniorCitizenId,
                                  hint: 'ID number',
                                ),
                              if (_otherMemberships.contains('pwd'))
                                _inputField(
                                  'PWD ID no.',
                                  _pwdId,
                                  hint: 'ID number',
                                ),
                              if (_otherMemberships.contains(
                                'indigenous_member',
                              ))
                                _inputField(
                                  'Tribe / Ethnicity',
                                  _indigenousTribe,
                                  hint: 'Specify tribe',
                                ),
                              if (_otherMemberships.contains('others')) ...[
                                _inputField(
                                  'Membership name',
                                  _otherMembershipCustomName,
                                  hint: 'Name of program',
                                ),
                                _inputField(
                                  'Membership ID / Certificate no.',
                                  _otherMembershipCustomId,
                                  hint: 'ID number',
                                ),
                              ],
                            ],
                          ],
                        ),
                      ],

                      const SizedBox(height: 16),

                      // Action Buttons for Multi-Step Navigation
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_currentStep == 0) ...[
                            SizedBox(
                              height: 48,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _nextStep,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  textStyle: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text('Continue'),
                                    SizedBox(width: 6),
                                    Icon(
                                      Icons.arrow_forward_rounded,
                                      size: 16,
                                      color: Colors.white,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ] else ...[
                            Row(
                              children: [
                                Expanded(
                                  child: SizedBox(
                                    height: 48,
                                    child: OutlinedButton.icon(
                                      onPressed: _isLoading ? null : _prevStep,
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: const Color(0xFF374151),
                                        side: BorderSide(
                                          color: Colors.grey.shade300,
                                          width: 0.5,
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        textStyle: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      icon: const Icon(
                                        Icons.arrow_back_rounded,
                                        size: 16,
                                      ),
                                      label: const Text('Back'),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  flex: 2,
                                  child: SizedBox(
                                    height: 48,
                                    child: ElevatedButton(
                                      onPressed: _isLoading
                                          ? null
                                          : (_currentStep == 2
                                                ? _save
                                                : _nextStep),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        textStyle: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      child: _isLoading
                                          ? const SizedBox.square(
                                              dimension: 18,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Colors.white,
                                              ),
                                            )
                                          : Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              children: [
                                                Text(
                                                  _currentStep == 2
                                                      ? (_isEditMode
                                                            ? 'Save changes'
                                                            : 'Save profile')
                                                      : 'Continue',
                                                ),
                                                const SizedBox(width: 6),
                                                Icon(
                                                  _currentStep == 2
                                                      ? Icons
                                                          .check_circle_outline_rounded
                                                      : Icons
                                                          .arrow_forward_rounded,
                                                  size: 16,
                                                  color: Colors.white,
                                                ),
                                              ],
                                            ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 42,
                            child: TextButton(
                              onPressed: _isLoading
                                  ? null
                                  : () {
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        const SnackBar(
                                          content: Text(
                                            'Draft saved successfully.',
                                          ),
                                        ),
                                      );
                                      Navigator.of(context).pop();
                                    },
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFF6B7280),
                                textStyle: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              child: const Text('Save as draft'),
                            ),
                          ),
                        ],
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

  Widget _buildStepProgressHeader() {
    final title = switch (_currentStep) {
      1 => 'Step 2 of 3 — Address & contact',
      2 => 'Step 3 of 3 — Socioeconomic & program',
      _ => 'Step 1 of 3 — Basic info',
    };

    final percent = switch (_currentStep) {
      1 => '66%',
      2 => '100%',
      _ => '33%',
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
            Expanded(
              child: Container(
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Container(
                height: 4,
                decoration: BoxDecoration(
                  color: _currentStep >= 1
                      ? AppColors.primary
                      : const Color(0xFFE1F5EE),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Container(
                height: 4,
                decoration: BoxDecoration(
                  color: _currentStep >= 2
                      ? AppColors.primary
                      : const Color(0xFFE1F5EE),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _sectionCard({
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _chipSelector<T>({
    required String label,
    required T? selectedValue,
    required List<MapEntry<T, String>> options,
    required ValueChanged<T> onSelected,
    bool required = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sentenceLabel(label, required: required),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options.map((option) {
            final isSelected = selectedValue == option.key;
            return ChoiceChip(
              label: Text(option.value),
              selected: isSelected,
              selectedColor: const Color(0xFFE1F5EE),
              backgroundColor: Colors.white,
              side: BorderSide(
                color: isSelected ? AppColors.primary : Colors.grey.shade300,
                width: isSelected ? 1.5 : 0.5,
              ),
              labelStyle: TextStyle(
                color: isSelected
                    ? const Color(0xFF085041)
                    : const Color(0xFF374151),
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
              onSelected: _isLoading ? null : (_) => onSelected(option.key),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _inputField(
    String label,
    TextEditingController controller, {
    String? hint,
    bool required = false,
    bool phone = false,
    bool email = false,
    Widget? suffixIcon,
    VoidCallback? onTap,
    bool readOnly = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sentenceLabel(label, required: required),
          TextFormField(
            controller: controller,
            enabled: !_isLoading,
            readOnly: readOnly,
            onTap: onTap,
            keyboardType: phone
                ? TextInputType.phone
                : email
                ? TextInputType.emailAddress
                : TextInputType.name,
            textCapitalization: phone || email
                ? TextCapitalization.none
                : TextCapitalization.words,
            inputFormatters: phone
                ? [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(11),
                  ]
                : null,
            style: const TextStyle(fontSize: 13, color: Color(0xFF111827)),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(
                fontSize: 12,
                color: Color(0xFF9CA3AF),
              ),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(
                  color: AppColors.primary,
                  width: 1.5,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
              suffixIcon: suffixIcon,
            ),
            validator: (value) {
              final trimmed = value?.trim() ?? '';
              if (required && trimmed.isEmpty) {
                return '$label is required';
              }
              if (phone && trimmed.isNotEmpty && trimmed.length != 11) {
                return 'Phone number must be 11 digits';
              }
              final emailPattern = RegExp("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+\$");
              if (email &&
                  trimmed.isNotEmpty &&
                  !emailPattern.hasMatch(trimmed)) {
                return 'Please enter a valid email address';
              }
              return null;
            },
          ),
        ],
      ),
    );
  }

  Widget _dropdownField<T>({
    required String label,
    required T? selectedValue,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?>? onChanged,
    String? hint,
    bool required = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sentenceLabel(label, required: required),
          DropdownButtonFormField<T>(
            initialValue: selectedValue,
            hint: hint != null
                ? Text(
                    hint,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF9CA3AF),
                    ),
                  )
                : null,
            items: items,
            onChanged: _isLoading ? null : onChanged,
            style: const TextStyle(fontSize: 13, color: Color(0xFF111827)),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
            ),
            validator: (value) =>
                (required && value == null) ? '$label is required' : null,
          ),
        ],
      ),
    );
  }

  Widget _sentenceLabel(String text, {bool required = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          text: text,
          style: const TextStyle(
            color: Color(0xFF374151),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
          children: [
            if (required)
              const TextSpan(
                text: ' *',
                style: TextStyle(color: AppColors.error),
              ),
          ],
        ),
      ),
    );
  }

  Widget _membershipChip(String key, String label) {
    final selected = _otherMemberships.contains(key);
    return FilterChip(
      label: Text(label),
      selected: selected,
      selectedColor: const Color(0xFFE1F5EE),
      backgroundColor: Colors.white,
      side: BorderSide(
        color: selected ? AppColors.primary : Colors.grey.shade300,
        width: selected ? 1.5 : 0.5,
      ),
      labelStyle: TextStyle(
        color: selected ? const Color(0xFF085041) : const Color(0xFF374151),
        fontSize: 12,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
      ),
      onSelected: _isLoading
          ? null
          : (value) {
              setState(() {
                if (value) {
                  _otherMemberships.add(key);
                } else {
                  _otherMemberships.remove(key);
                  if (key == 'senior_citizen') _seniorCitizenId.clear();
                  if (key == 'pwd') _pwdId.clear();
                  if (key == 'indigenous_member') _indigenousTribe.clear();
                  if (key == 'others') {
                    _otherMembershipCustomName.clear();
                    _otherMembershipCustomId.clear();
                  }
                }
              });
            },
    );
  }
}
