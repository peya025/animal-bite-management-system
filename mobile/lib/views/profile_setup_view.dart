import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../services/mobile_api.dart';
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
  final _emergencyContactName = TextEditingController();
  final _emergencyContactNumber = TextEditingController();
  final _motherMaidenName = TextEditingController();
  final _spouseName = TextEditingController();
  final _purok = TextEditingController();
  final _philhealthNo = TextEditingController();
  
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
  String? _dswdNhts;
  
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
    _emergencyContactName.dispose();
    _emergencyContactNumber.dispose();
    _motherMaidenName.dispose();
    _spouseName.dispose();
    _purok.dispose();
    _philhealthNo.dispose();
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

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Get municipality and barangay names
      final municipalityName = _municipalities
          .firstWhere((m) => m.code == _selectedMunicipalityCode, orElse: () => const PsgcLocation(code: '', name: ''))
          .name;
      final barangayName = _barangays
          .firstWhere((b) => b.code == _selectedBarangayCode, orElse: () => const PsgcLocation(code: '', name: ''))
          .name;
      
      // Format full address
      final fullAddress = PsgcService.formatAddress(
        purok: _optional(_purok),
        barangayName: barangayName.isNotEmpty ? barangayName : null,
        municipalityName: municipalityName.isNotEmpty ? municipalityName : null,
      );
      
      final patient = await MobileApi.instance.createPatient({
        'relationship': _relationship,
        'first_name': _firstName.text.trim(),
        'middle_name': _optional(_middleName),
        'last_name': _lastName.text.trim(),
        'suffix': _optional(_suffix),
        'gender': _gender,
        'date_of_birth': _selectedBirthDate?.toIso8601String().split('T').first,
        'contact_number': _optional(_contactNumber),
        'emergency_contact_name': _optional(_emergencyContactName),
        'emergency_contact_number': _optional(_emergencyContactNumber),
        // Form 1 extended fields
        'blood_type': _bloodType,
        'mother_maiden_name': _optional(_motherMaidenName),
        'civil_status': _civilStatus,
        'spouse_name': _optional(_spouseName),
        'address': fullAddress.isNotEmpty ? fullAddress : null,
        'address_municipality': municipalityName.isNotEmpty ? municipalityName : null,
        'address_barangay': barangayName.isNotEmpty ? barangayName : null,
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
        'dswd_nhts': _dswdNhts,
      });
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
                              DropdownMenuItem(value: 'AB+', child: Text('AB+')),
                              DropdownMenuItem(value: 'AB-', child: Text('AB-')),
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
                              DropdownMenuItem(value: 'single', child: Text('Single')),
                              DropdownMenuItem(value: 'married', child: Text('Married')),
                              DropdownMenuItem(value: 'widowed', child: Text('Widowed')),
                              DropdownMenuItem(value: 'separated', child: Text('Separated')),
                              DropdownMenuItem(value: 'annulled', child: Text('Annulled')),
                              DropdownMenuItem(value: 'cohabitation', child: Text('Co-Habitation')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _civilStatus = value),
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
                            hint: Text(_loadingMunicipalities ? 'Loading...' : 'Select municipality'),
                            items: _municipalities
                                .map((m) => DropdownMenuItem(
                                      value: m.code,
                                      child: Text(m.name),
                                    ))
                                .toList(),
                            onChanged: _isLoading || _loadingMunicipalities
                                ? null
                                : (value) {
                                    setState(() => _selectedMunicipalityCode = value);
                                    if (value != null) _loadBarangays(value);
                                  },
                            validator: (value) => value == null ? 'Municipality is required' : null,
                          ),
                          const SizedBox(height: 14),
                          _label('BARANGAY *'),
                          DropdownButtonFormField<String>(
                            value: _selectedBarangayCode,
                            hint: Text(_loadingBarangays ? 'Loading...' : _selectedMunicipalityCode == null ? 'Select municipality first' : 'Select barangay'),
                            items: _barangays
                                .map((b) => DropdownMenuItem(
                                      value: b.code,
                                      child: Text(b.name),
                                    ))
                                .toList(),
                            onChanged: _isLoading || _loadingBarangays || _selectedMunicipalityCode == null
                                ? null
                                : (value) => setState(() => _selectedBarangayCode = value),
                            validator: (value) => value == null ? 'Barangay is required' : null,
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
                          _field('Emergency contact name', _emergencyContactName),
                          _field('Emergency contact phone', _emergencyContactNumber, phone: true),
                          
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
                              DropdownMenuItem(value: 'no_formal', child: Text('No Formal Education')),
                              DropdownMenuItem(value: 'elementary', child: Text('Elementary')),
                              DropdownMenuItem(value: 'high_school', child: Text('High School')),
                              DropdownMenuItem(value: 'vocational', child: Text('Vocational')),
                              DropdownMenuItem(value: 'college', child: Text('College')),
                              DropdownMenuItem(value: 'post_graduate', child: Text('Post Graduate')),
                              DropdownMenuItem(value: 'student', child: Text('Student')),
                              DropdownMenuItem(value: 'unknown', child: Text('Unknown')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _educationalAttainment = value),
                          ),
                          const SizedBox(height: 14),
                          _label('EMPLOYMENT STATUS'),
                          DropdownButtonFormField<String>(
                            value: _employmentStatus,
                            hint: const Text('Select employment status'),
                            items: const [
                              DropdownMenuItem(value: 'employed', child: Text('Employed')),
                              DropdownMenuItem(value: 'unemployed', child: Text('None/Unemployed')),
                              DropdownMenuItem(value: 'self_employed', child: Text('Self-Employed')),
                              DropdownMenuItem(value: 'retired', child: Text('Retired')),
                              DropdownMenuItem(value: 'student', child: Text('Student')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _employmentStatus = value),
                          ),
                          const SizedBox(height: 14),
                          _label('FAMILY MEMBER POSITION'),
                          DropdownButtonFormField<String>(
                            value: _familyMember,
                            hint: const Text('Select position'),
                            items: const [
                              DropdownMenuItem(value: 'father', child: Text('Father (Ama)')),
                              DropdownMenuItem(value: 'mother', child: Text('Mother (Ina)')),
                              DropdownMenuItem(value: 'son', child: Text('Son (Anak na Lalaki)')),
                              DropdownMenuItem(value: 'daughter', child: Text('Daughter (Anak na Babae)')),
                              DropdownMenuItem(value: 'others', child: Text('Others')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _familyMember = value),
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
                          _label('PHILHEALTH MEMBER?'),
                          DropdownButtonFormField<String>(
                            value: _philhealthMember,
                            hint: const Text('Select'),
                            items: const [
                              DropdownMenuItem(value: 'yes', child: Text('Yes')),
                              DropdownMenuItem(value: 'no', child: Text('No')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _philhealthMember = value),
                          ),
                          if (_philhealthMember == 'yes') ...[
                            const SizedBox(height: 14),
                            _label('STATUS TYPE'),
                            DropdownButtonFormField<String>(
                              value: _philhealthStatus,
                              hint: const Text('Select status'),
                              items: const [
                                DropdownMenuItem(value: 'member', child: Text('Member')),
                                DropdownMenuItem(value: 'dependent', child: Text('Dependent')),
                              ],
                              onChanged: _isLoading
                                  ? null
                                  : (value) => setState(() => _philhealthStatus = value),
                            ),
                            const SizedBox(height: 14),
                            _field('PHILHEALTH NO.', _philhealthNo),
                            _label('CATEGORY'),
                            DropdownButtonFormField<String>(
                              value: _philhealthCategory,
                              hint: const Text('Select category'),
                              items: const [
                                DropdownMenuItem(value: 'fe_private', child: Text('FE – Private')),
                                DropdownMenuItem(value: 'fe_government', child: Text('FE – Government')),
                                DropdownMenuItem(value: 'ie', child: Text('IE')),
                                DropdownMenuItem(value: 'others', child: Text('Others')),
                              ],
                              onChanged: _isLoading
                                  ? null
                                  : (value) => setState(() => _philhealthCategory = value),
                            ),
                          ],
                          const SizedBox(height: 14),
                          _label('4PS MEMBER?'),
                          DropdownButtonFormField<String>(
                            value: _fourpsMember,
                            hint: const Text('Select'),
                            items: const [
                              DropdownMenuItem(value: 'yes', child: Text('Yes')),
                              DropdownMenuItem(value: 'no', child: Text('No')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _fourpsMember = value),
                          ),
                          const SizedBox(height: 14),
                          _label('DSWD NHTS?'),
                          DropdownButtonFormField<String>(
                            value: _dswdNhts,
                            hint: const Text('Select'),
                            items: const [
                              DropdownMenuItem(value: 'yes', child: Text('Yes')),
                              DropdownMenuItem(value: 'no', child: Text('No')),
                            ],
                            onChanged: _isLoading
                                ? null
                                : (value) => setState(() => _dswdNhts = value),
                          ),
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

  Widget _field(
    String label,
    TextEditingController controller, {
    bool required = false,
    bool phone = false,
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
            keyboardType: phone ? TextInputType.phone : TextInputType.name,
            textCapitalization: phone
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
