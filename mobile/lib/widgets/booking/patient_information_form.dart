import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/booking_draft.dart';
import '../../models/patient_booking_request.dart';
import '../buttons/primary_action_button.dart';
import '../menu/menu_surface.dart';
import '../menu/section_header.dart';

class PatientInformationForm extends StatefulWidget {
  const PatientInformationForm({
    super.key,
    required this.booking,
    required this.onSubmitted,
  });

  final BookingDraft booking;
  final ValueChanged<PatientBookingRequest> onSubmitted;

  @override
  State<PatientInformationForm> createState() => _PatientInformationFormState();
}

class _PatientInformationFormState extends State<PatientInformationForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _dateOfBirthController = TextEditingController();
  final _addressController = TextEditingController();
  final _contactController = TextEditingController();
  final _emergencyNameController = TextEditingController();
  final _emergencyNumberController = TextEditingController();
  String? _gender;
  DateTime? _dateOfBirth;

  @override
  void dispose() {
    _nameController.dispose();
    _dateOfBirthController.dispose();
    _addressController.dispose();
    _contactController.dispose();
    _emergencyNameController.dispose();
    _emergencyNumberController.dispose();
    super.dispose();
  }

  String? _optionalValue(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  Future<void> _selectDateOfBirth() async {
    final today = DateTime.now();
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime(today.year, today.month, today.day - 1),
    );
    if (pickedDate == null || !mounted) return;

    setState(() {
      _dateOfBirth = pickedDate;
      _dateOfBirthController.text = pickedDate
          .toIso8601String()
          .split('T')
          .first;
    });
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    widget.onSubmitted(
      PatientBookingRequest(
        booking: widget.booking,
        name: _nameController.text.trim(),
        gender: _gender!,
        dateOfBirth: _dateOfBirth,
        address: _optionalValue(_addressController),
        contactNumber: _optionalValue(_contactController),
        emergencyContactName: _optionalValue(_emergencyNameController),
        emergencyContactNumber: _optionalValue(_emergencyNumberController),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const MenuSectionHeader(title: 'Patient basic information'),
          const SizedBox(height: 4),
          const Text(
            'Fields marked with * are required. Other details match the Laravel patient record and may be completed later.',
            style: TextStyle(
              color: AppColors.gray500,
              fontSize: 11,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),
          MenuSurface(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _FieldLabel('FULL NAME *'),
                TextFormField(
                  controller: _nameController,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.name],
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Full name is required';
                    }
                    if (value.trim().length > 255) {
                      return 'Full name must not exceed 255 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _FieldLabel('GENDER *'),
                DropdownButtonFormField<String>(
                  initialValue: _gender,
                  hint: const Text('Select gender'),
                  items: const [
                    DropdownMenuItem(value: 'male', child: Text('Male')),
                    DropdownMenuItem(value: 'female', child: Text('Female')),
                  ],
                  onChanged: (value) => setState(() => _gender = value),
                  validator: (value) =>
                      value == null ? 'Gender is required' : null,
                ),
                const SizedBox(height: 16),
                _FieldLabel('DATE OF BIRTH'),
                TextFormField(
                  controller: _dateOfBirthController,
                  readOnly: true,
                  onTap: _selectDateOfBirth,
                  decoration: InputDecoration(
                    hintText: 'YYYY-MM-DD',
                    suffixIcon: IconButton(
                      tooltip: 'Choose date of birth',
                      onPressed: _selectDateOfBirth,
                      icon: const Icon(Icons.calendar_today_outlined),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _FieldLabel('CONTACT NUMBER'),
                TextFormField(
                  controller: _contactController,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.telephoneNumber],
                  validator: (value) => value != null && value.length > 50
                      ? 'Contact number must not exceed 50 characters'
                      : null,
                ),
                const SizedBox(height: 16),
                _FieldLabel('ADDRESS'),
                TextFormField(
                  controller: _addressController,
                  textCapitalization: TextCapitalization.words,
                  keyboardType: TextInputType.streetAddress,
                  minLines: 2,
                  maxLines: 3,
                  autofillHints: const [AutofillHints.fullStreetAddress],
                ),
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 12),
                const Text(
                  'Emergency contact',
                  style: TextStyle(
                    color: AppColors.gray900,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 14),
                _FieldLabel('CONTACT NAME'),
                TextFormField(
                  controller: _emergencyNameController,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  validator: (value) => value != null && value.length > 255
                      ? 'Name must not exceed 255 characters'
                      : null,
                ),
                const SizedBox(height: 16),
                _FieldLabel('CONTACT NUMBER'),
                TextFormField(
                  controller: _emergencyNumberController,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.done,
                  validator: (value) => value != null && value.length > 50
                      ? 'Contact number must not exceed 50 characters'
                      : null,
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          PrimaryActionButton(label: 'SUBMIT BOOKING', onPressed: _submit),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.gray700,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
