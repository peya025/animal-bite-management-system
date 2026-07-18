import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../services/mobile_api.dart';
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
  late String _relationship;
  String? _gender;
  DateTime? _selectedBirthDate;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _relationship = widget.initialRelationship;
  }

  @override
  void dispose() {
    _firstName.dispose();
    _middleName.dispose();
    _lastName.dispose();
    _suffix.dispose();
    _birthDate.dispose();
    _contactNumber.dispose();
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
      final patient = await MobileApi.instance.createPatient({
        'relationship': _relationship,
        'first_name': _firstName.text.trim(),
        'middle_name': _optional(_middleName),
        'last_name': _lastName.text.trim(),
        'suffix': _optional(_suffix),
        'gender': _gender,
        'date_of_birth': _selectedBirthDate?.toIso8601String().split('T').first,
        'contact_number': _optional(_contactNumber),
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
                          _field('CONTACT NUMBER', _contactNumber, phone: true),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    PrimaryActionButton(
                      label: 'SAVE PATIENT PROFILE',
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
            validator: required
                ? (value) => value == null || value.trim().isEmpty
                      ? '$label is required'
                      : null
                : null,
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
