import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/patient_profile.dart';
import '../services/api.dart';
import '../services/psgc_service.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_surface.dart';

class ProfileSetupView extends StatefulWidget {
  const ProfileSetupView({
    super.key,
    this.initialRelationship = 'self',
    this.returnToBooking = false,
  });

  final String initialRelationship;
  final bool returnToBooking;

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
  final _philhealthNo = TextEditingController();
  final _seniorCitizenId = TextEditingController();
  final _pwdId = TextEditingController();
  final _indigenousTribe = TextEditingController();
  final _otherMembershipCustomName = TextEditingController();
  final _otherMembershipCustomId = TextEditingController();

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

  @override
  void initState() {
    super.initState();
    _relationship = widget.initialRelationship;
    _loadMunicipalities();
  }

  Future<void> _loadMunicipalities() async {
    setState(() => _loadingMunicipalities = true);
    try {
      final municipalities = await PsgcService.getMunicipalities();
      if (mounted) {
        setState(() {
          _municipalities = municipalities;
          _loadingMunicipalities = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingMunicipalities = false);
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
      final barangays = await PsgcService.getBarangays(municipalityCode);
      if (mounted) {
        setState(() {
          _barangays = barangays;
          _loadingBarangays = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingBarangays = false);
      }
    }
  }

  @override
  void dispose() {
    _firstName.dispose();
    _middleName.dispose();
    _lastName.dispose();
    _suffix.dispose();
    _birthDate.dispose();
    _contactNumber.dispose();
    _email.dispose();
    _emergencyContactName.dispose();
    _emergencyContactNumber.dispose();
    _motherMaidenName.dispose();
    _spouseName.dispose();
    _purok.dispose();
    _philhealthNo.dispose();
    _seniorCitizenId.dispose();
    _pwdId.dispose();
    _indigenousTribe.dispose();
    _otherMembershipCustomName.dispose();
    _otherMembershipCustomId.dispose();
    super.dispose();
  }

  Future<void> _chooseBirthDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedBirthDate ?? DateTime(2000),
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

  List<Map<String, dynamic>> _buildMembershipPayload() {
    final memberships = <Map<String, dynamic>>[];

    if (_philhealthMember == 'yes') {
      memberships.add({
        'membership_type': 'philhealth',
        'is_active': true,
        'status_value': _philhealthStatus,
        'category': _philhealthCategory,
        'membership_id_no': _optional(_philhealthNo),
      });
    }

    if (_fourpsMember == 'yes') {
      memberships.add({
        'membership_type': 'fourps',
        'is_active': true,
        'status_value': 'yes',
        'category': _fourpsCategory,
        'relationship_value': _fourpsRelationship,
        'registered_beneficiary': _registeredFourpsBeneficiary,
      });
    }

    if (_dswdNhts == 'yes') {
      memberships.add({
        'membership_type': 'dswd_nhts',
        'is_active': true,
        'status_value': 'yes',
      });
    }

    if (_otherMemberships.contains('senior_citizen')) {
      memberships.add({
        'membership_type': 'senior_citizen',
        'is_active': true,
        'membership_id_no': _optional(_seniorCitizenId),
      });
    }

    if (_otherMemberships.contains('pwd')) {
      memberships.add({
        'membership_type': 'pwd',
        'is_active': true,
        'membership_id_no': _optional(_pwdId),
      });
    }

    if (_otherMemberships.contains('indigenous_member')) {
      memberships.add({
        'membership_type': 'indigenous_member',
        'is_active': true,
        'extra_value': _optional(_indigenousTribe),
      });
    }

    if (_otherMemberships.contains('others')) {
      memberships.add({
        'membership_type': 'other',
        'is_active': true,
        'membership_label': _optional(_otherMembershipCustomName),
        'membership_id_no': _optional(_otherMembershipCustomId),
      });
    }

    return memberships;
  }

  void _clearMembershipFields() {
    _philhealthMember = 'no';
    _philhealthStatus = null;
    _philhealthCategory = null;
    _philhealthNo.clear();
    _fourpsMember = 'no';
    _fourpsCategory = null;
    _fourpsRelationship = null;
    _registeredFourpsBeneficiary = null;
    _dswdNhts = 'no';
    _otherMemberships.clear();
    _seniorCitizenId.clear();
    _pwdId.clear();
    _indigenousTribe.clear();
    _otherMembershipCustomName.clear();
    _otherMembershipCustomId.clear();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final emailPattern = RegExp("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+\$");
      if (_email.text.trim().isNotEmpty &&
          !emailPattern.hasMatch(_email.text.trim())) {
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

      // Get municipality and barangay names
      final municipalityName = _municipalities
          .firstWhere(
            (m) => m.code == _selectedMunicipalityCode,
            orElse: () => const PsgcLocation(code: '', name: ''),
          )
          .name;
      final barangayName = _barangays
          .firstWhere(
            (b) => b.code == _selectedBarangayCode,
            orElse: () => const PsgcLocation(code: '', name: ''),
          )
          .name;

      // Format full address
      final fullAddress = PsgcService.formatAddress(
        purok: _optional(_purok),
        barangayName: barangayName.isNotEmpty ? barangayName : null,
        municipalityName: municipalityName.isNotEmpty ? municipalityName : null,
      );

      final patient =
          await api.createPatient({
                'relationship': _relationship,
                'first_name': _firstName.text.trim(),
                'middle_name': _optional(_middleName),
                'last_name': _lastName.text.trim(),
                'suffix': _optional(_suffix),
                'gender': _gender,
                'date_of_birth': _selectedBirthDate
                    ?.toIso8601String()
                    .split('T')
                    .first,
                'contact_number': _optional(_contactNumber),
                'email': _optional(_email),
                'emergency_contact_name': _optional(_emergencyContactName),
                'emergency_contact_number': _optional(_emergencyContactNumber),
                // Form 1 extended fields
                'blood_type': _bloodType,
                'mother_maiden_name': _optional(_motherMaidenName),
                'civil_status': _civilStatus,
                'spouse_name': _optional(_spouseName),
                'address': fullAddress.isNotEmpty ? fullAddress : null,
                'address_municipality': municipalityName.isNotEmpty
                    ? municipalityName
                    : null,
                'address_barangay': barangayName.isNotEmpty
                    ? barangayName
                    : null,
                'address_purok': _optional(_purok),
                'province': 'Misamis Oriental',
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
              })
              as PatientProfile;
      if (!mounted) return;
      if (widget.returnToBooking) {
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
    return Scaffold(
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
                      title: 'Patient profile',
                      subtitle: 'Add yourself or a dependent.',
                      onBack: () => Navigator.of(context).maybePop(),
                    ),
                    const SizedBox(height: 20),
                    if (_error case final message?) ...[
                      Text(
                        message,
                        style: const TextStyle(color: AppColors.error),
                      ),
                      const SizedBox(height: 12),
                    ],
                    MenuSurface(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _label('RELATIONSHIP'),
                          DropdownButtonFormField<String>(
                            initialValue: _relationship,
                            items: const [
                              DropdownMenuItem(
                                value: 'self',
                                child: Text('Myself'),
                              ),
                              DropdownMenuItem(
                                value: 'child',
                                child: Text('My child'),
                              ),
                              DropdownMenuItem(
                                value: 'dependent',
                                child: Text('Dependent'),
                              ),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) =>
                                      setState(() => _relationship = value!),
                          ),
                          const SizedBox(height: 14),
                          _field('FIRST NAME *', _firstName, required: true),
                          _field('MIDDLE NAME', _middleName),
                          _field('LAST NAME *', _lastName, required: true),
                          _field('SUFFIX', _suffix),
                          _label('GENDER *'),
                          DropdownButtonFormField<String>(
                            initialValue: _gender,
                            hint: const Text('Select gender'),
                            items: const [
                              DropdownMenuItem(
                                value: 'male',
                                child: Text('Male'),
                              ),
                              DropdownMenuItem(
                                value: 'female',
                                child: Text('Female'),
                              ),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _gender = value),
                            validator: (value) =>
                                value == null ? 'Gender is required' : null,
                          ),
                          const SizedBox(height: 14),
                          _label('DATE OF BIRTH'),
                          TextFormField(
                            controller: _birthDate,
                            readOnly: true,
                            onTap: _chooseBirthDate,
                            decoration: InputDecoration(
                              hintText: 'YYYY-MM-DD',
                              suffixIcon: IconButton(
                                tooltip: 'Choose birth date',
                                onPressed: _chooseBirthDate,
                                icon: const Icon(Icons.calendar_today_outlined),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          _label('BLOOD TYPE'),
                          DropdownButtonFormField<String>(
                            value: _bloodType,
                            hint: const Text('Select blood type'),
                            items: const [
                              DropdownMenuItem(value: 'A+', child: Text('A+')),
                              DropdownMenuItem(value: 'A-', child: Text('A-')),
                              DropdownMenuItem(value: 'B+', child: Text('B+')),
                              DropdownMenuItem(value: 'B-', child: Text('B-')),
                              DropdownMenuItem(
                                value: 'AB+',
                                child: Text('AB+'),
                              ),
                              DropdownMenuItem(
                                value: 'AB-',
                                child: Text('AB-'),
                              ),
                              DropdownMenuItem(value: 'O+', child: Text('O+')),
                              DropdownMenuItem(value: 'O-', child: Text('O-')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _bloodType = value),
                          ),
                          const SizedBox(height: 14),
                          _field('MOTHER\'S MAIDEN NAME', _motherMaidenName),
                          _label('CIVIL STATUS'),
                          DropdownButtonFormField<String>(
                            value: _civilStatus,
                            hint: const Text('Select civil status'),
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
                            onChanged: _isLoading
                                ? null
                                : (value) =>
                                      setState(() => _civilStatus = value),
                          ),
                          if (_civilStatus == 'married') ...[
                            const SizedBox(height: 14),
                            _field('SPOUSE\'S NAME', _spouseName),
                          ],

                          // Address Section
                          const Padding(
                            padding: EdgeInsets.only(top: 20, bottom: 8),
                            child: Text(
                              'RESIDENTIAL ADDRESS — MISAMIS ORIENTAL',
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          _label('CITY / MUNICIPALITY *'),
                          DropdownButtonFormField<String>(
                            value: _selectedMunicipalityCode,
                            hint: Text(
                              _loadingMunicipalities
                                  ? 'Loading...'
                                  : 'Select municipality',
                            ),
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
                                    setState(
                                      () => _selectedMunicipalityCode = value,
                                    );
                                    if (value != null) _loadBarangays(value);
                                  },
                            validator: (value) => value == null
                                ? 'Municipality is required'
                                : null,
                          ),
                          const SizedBox(height: 14),
                          _label('BARANGAY *'),
                          DropdownButtonFormField<String>(
                            value: _selectedBarangayCode,
                            hint: Text(
                              _loadingBarangays
                                  ? 'Loading...'
                                  : _selectedMunicipalityCode == null
                                  ? 'Select municipality first'
                                  : 'Select barangay',
                            ),
                            items: _barangays
                                .map(
                                  (b) => DropdownMenuItem(
                                    value: b.code,
                                    child: Text(b.name),
                                  ),
                                )
                                .toList(),
                            onChanged:
                                _isLoading ||
                                    _loadingBarangays ||
                                    _selectedMunicipalityCode == null
                                ? null
                                : (value) => setState(
                                    () => _selectedBarangayCode = value,
                                  ),
                            validator: (value) =>
                                value == null ? 'Barangay is required' : null,
                          ),
                          const SizedBox(height: 14),
                          _field('PUROK / ZONE / STREET', _purok),

                          // Contact Section
                          const Padding(
                            padding: EdgeInsets.only(top: 16, bottom: 8),
                            child: Text(
                              'CONTACT INFORMATION',
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          _field('CONTACT NUMBER', _contactNumber, phone: true),
                          _field('EMAIL ADDRESS', _email, email: true),

                          // Emergency Contact Section
                          const Padding(
                            padding: EdgeInsets.only(top: 16, bottom: 8),
                            child: Text(
                              'EMERGENCY CONTACT',
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          _field(
                            'Emergency contact name',
                            _emergencyContactName,
                          ),
                          _field(
                            'Emergency contact phone',
                            _emergencyContactNumber,
                            phone: true,
                          ),

                          // Socioeconomic Section
                          const Padding(
                            padding: EdgeInsets.only(top: 16, bottom: 8),
                            child: Text(
                              'SOCIOECONOMIC INFORMATION',
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          _label('EDUCATIONAL ATTAINMENT'),
                          DropdownButtonFormField<String>(
                            value: _educationalAttainment,
                            hint: const Text('Select education level'),
                            items: const [
                              DropdownMenuItem(
                                value: 'no_formal',
                                child: Text('No Formal Education'),
                              ),
                              DropdownMenuItem(
                                value: 'elementary',
                                child: Text('Elementary'),
                              ),
                              DropdownMenuItem(
                                value: 'high_school',
                                child: Text('High School'),
                              ),
                              DropdownMenuItem(
                                value: 'vocational',
                                child: Text('Vocational'),
                              ),
                              DropdownMenuItem(
                                value: 'college',
                                child: Text('College'),
                              ),
                              DropdownMenuItem(
                                value: 'post_graduate',
                                child: Text('Post Graduate'),
                              ),
                              DropdownMenuItem(
                                value: 'student',
                                child: Text('Student'),
                              ),
                              DropdownMenuItem(
                                value: 'unknown',
                                child: Text('Unknown'),
                              ),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(
                                    () => _educationalAttainment = value,
                                  ),
                          ),
                          const SizedBox(height: 14),
                          _label('EMPLOYMENT STATUS'),
                          DropdownButtonFormField<String>(
                            value: _employmentStatus,
                            hint: const Text('Select employment status'),
                            items: const [
                              DropdownMenuItem(
                                value: 'employed',
                                child: Text('Employed'),
                              ),
                              DropdownMenuItem(
                                value: 'unemployed',
                                child: Text('None/Unemployed'),
                              ),
                              DropdownMenuItem(
                                value: 'self_employed',
                                child: Text('Self-Employed'),
                              ),
                              DropdownMenuItem(
                                value: 'retired',
                                child: Text('Retired'),
                              ),
                              DropdownMenuItem(
                                value: 'student',
                                child: Text('Student'),
                              ),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) =>
                                      setState(() => _employmentStatus = value),
                          ),
                          const SizedBox(height: 14),
                          _label('FAMILY MEMBER POSITION'),
                          DropdownButtonFormField<String>(
                            value: _familyMember,
                            hint: const Text('Select position'),
                            items: const [
                              DropdownMenuItem(
                                value: 'father',
                                child: Text('Father (Ama)'),
                              ),
                              DropdownMenuItem(
                                value: 'mother',
                                child: Text('Mother (Ina)'),
                              ),
                              DropdownMenuItem(
                                value: 'son',
                                child: Text('Son (Anak na Lalaki)'),
                              ),
                              DropdownMenuItem(
                                value: 'daughter',
                                child: Text('Daughter (Anak na Babae)'),
                              ),
                              DropdownMenuItem(
                                value: 'others',
                                child: Text('Others'),
                              ),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) =>
                                      setState(() => _familyMember = value),
                          ),

                          // Government Programs Section
                          const Padding(
                            padding: EdgeInsets.only(top: 20, bottom: 8),
                            child: Text(
                              'GOVERNMENT PROGRAM INFORMATION',
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          _label('ANY GOVERNMENT PROGRAM / OTHER MEMBERSHIP?'),
                          DropdownButtonFormField<String>(
                            value: _hasMembership,
                            hint: const Text('Select'),
                            items: const [
                              DropdownMenuItem(
                                value: 'yes',
                                child: Text('Yes'),
                              ),
                              DropdownMenuItem(value: 'no', child: Text('No')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() {
                                    _hasMembership = value;
                                    if (value == 'no') {
                                      _clearMembershipFields();
                                    }
                                  }),
                          ),
                          if (_hasMembership == 'yes') ...[
                            const SizedBox(height: 14),
                            _label('PHILHEALTH MEMBER?'),
                            DropdownButtonFormField<String>(
                              value: _philhealthMember,
                              hint: const Text('Select'),
                              items: const [
                                DropdownMenuItem(
                                  value: 'yes',
                                  child: Text('Yes'),
                                ),
                                DropdownMenuItem(
                                  value: 'no',
                                  child: Text('No'),
                                ),
                              ],
                              onChanged: _isLoading
                                  ? null
                                  : (value) => setState(() {
                                      _philhealthMember = value;
                                      if (value != 'yes') {
                                        _philhealthStatus = null;
                                        _philhealthCategory = null;
                                        _philhealthNo.clear();
                                      }
                                    }),
                            ),
                            if (_philhealthMember == 'yes') ...[
                              const SizedBox(height: 14),
                              _label('STATUS TYPE'),
                              DropdownButtonFormField<String>(
                                value: _philhealthStatus,
                                hint: const Text('Select status'),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'member',
                                    child: Text('Member'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'dependent',
                                    child: Text('Dependent'),
                                  ),
                                ],
                                onChanged: _isLoading
                                    ? null
                                    : (value) => setState(
                                        () => _philhealthStatus = value,
                                      ),
                              ),
                              const SizedBox(height: 14),
                              _field('PHILHEALTH NO.', _philhealthNo),
                              _label('CATEGORY'),
                              DropdownButtonFormField<String>(
                                value: _philhealthCategory,
                                hint: const Text('Select category'),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'fe_private',
                                    child: Text('FE – Private'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'fe_government',
                                    child: Text('FE – Government'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'ie',
                                    child: Text('IE'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'others',
                                    child: Text('Others'),
                                  ),
                                ],
                                onChanged: _isLoading
                                    ? null
                                    : (value) => setState(
                                        () => _philhealthCategory = value,
                                      ),
                              ),
                            ],
                            const SizedBox(height: 14),
                            _label('4PS MEMBER?'),
                            DropdownButtonFormField<String>(
                              value: _fourpsMember,
                              hint: const Text('Select'),
                              items: const [
                                DropdownMenuItem(
                                  value: 'yes',
                                  child: Text('Yes'),
                                ),
                                DropdownMenuItem(
                                  value: 'no',
                                  child: Text('No'),
                                ),
                              ],
                              onChanged: _isLoading
                                  ? null
                                  : (value) => setState(() {
                                      _fourpsMember = value;
                                      if (value != 'yes') {
                                        _fourpsCategory = null;
                                        _fourpsRelationship = null;
                                        _registeredFourpsBeneficiary = null;
                                      }
                                    }),
                            ),
                            if (_fourpsMember == 'yes') ...[
                              const SizedBox(height: 14),
                              _label('4PS MEMBERSHIP CATEGORY'),
                              DropdownButtonFormField<String>(
                                value: _fourpsCategory,
                                hint: const Text('Select category'),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'Beneficiary',
                                    child: Text('Beneficiary'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'Member of Beneficiary',
                                    child: Text('Member of Beneficiary'),
                                  ),
                                ],
                                onChanged: _isLoading
                                    ? null
                                    : (value) => setState(() {
                                        _fourpsCategory = value;
                                        if (value != 'Member of Beneficiary') {
                                          _fourpsRelationship = null;
                                          _registeredFourpsBeneficiary = null;
                                        }
                                      }),
                              ),
                              if (_fourpsCategory ==
                                  'Member of Beneficiary') ...[
                                const SizedBox(height: 14),
                                _label('REGISTERED 4PS BENEFICIARY'),
                                DropdownButtonFormField<String>(
                                  value: _registeredFourpsBeneficiary,
                                  hint: const Text('Select beneficiary'),
                                  items: const [
                                    DropdownMenuItem(
                                      value: 'Mother',
                                      child: Text('Mother'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Father',
                                      child: Text('Father'),
                                    ),
                                  ],
                                  onChanged: _isLoading
                                      ? null
                                      : (value) => setState(
                                          () => _registeredFourpsBeneficiary =
                                              value,
                                        ),
                                ),
                                const SizedBox(height: 14),
                                _label(
                                  'RELATIONSHIP TO REGISTERED 4PS BENEFICIARY',
                                ),
                                DropdownButtonFormField<String>(
                                  value: _fourpsRelationship,
                                  hint: const Text('Select relationship'),
                                  items: const [
                                    DropdownMenuItem(
                                      value: 'Daughter',
                                      child: Text('Daughter'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Son',
                                      child: Text('Son'),
                                    ),
                                  ],
                                  onChanged: _isLoading
                                      ? null
                                      : (value) => setState(
                                          () => _fourpsRelationship = value,
                                        ),
                                ),
                              ],
                            ],
                            const SizedBox(height: 14),
                            _label('DSWD NHTS?'),
                            DropdownButtonFormField<String>(
                              value: _dswdNhts,
                              hint: const Text('Select'),
                              items: const [
                                DropdownMenuItem(
                                  value: 'yes',
                                  child: Text('Yes'),
                                ),
                                DropdownMenuItem(
                                  value: 'no',
                                  child: Text('No'),
                                ),
                              ],
                              onChanged: _isLoading
                                  ? null
                                  : (value) =>
                                        setState(() => _dswdNhts = value),
                            ),
                            const SizedBox(height: 16),
                            _label('OTHER MEMBERSHIPS'),
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
                            if (_otherMemberships.contains(
                              'senior_citizen',
                            )) ...[
                              const SizedBox(height: 14),
                              _field('SENIOR CITIZEN ID NO.', _seniorCitizenId),
                            ],
                            if (_otherMemberships.contains('pwd')) ...[
                              const SizedBox(height: 14),
                              _field('PWD ID NO.', _pwdId),
                            ],
                            if (_otherMemberships.contains(
                              'indigenous_member',
                            )) ...[
                              const SizedBox(height: 14),
                              _field('TRIBE / ETHNICITY', _indigenousTribe),
                            ],
                            if (_otherMemberships.contains('others')) ...[
                              const SizedBox(height: 14),
                              _field(
                                'SPECIFY MEMBERSHIP NAME',
                                _otherMembershipCustomName,
                              ),
                              _field(
                                'MEMBERSHIP ID / CERTIFICATE NO.',
                                _otherMembershipCustomId,
                              ),
                            ],
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    PrimaryActionButton(
                      label: 'Save patient profile',
                      isLoading: _isLoading,
                      onPressed: _save,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _membershipChip(String key, String label) {
    final selected = _otherMemberships.contains(key);
    return FilterChip(
      label: Text(label),
      selected: selected,
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

  Widget _field(
    String label,
    TextEditingController controller, {
    bool required = false,
    bool phone = false,
    bool email = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _label(label),
          TextFormField(
            controller: controller,
            enabled: !_isLoading,
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
            validator: (value) {
              final trimmed = value?.trim() ?? '';
              if (required && trimmed.isEmpty) {
                return '$label is required';
              }
              if (phone && trimmed.isNotEmpty && trimmed.length != 11) {
                return 'Phone number must be exactly 11 digits';
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

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColors.gray700,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
