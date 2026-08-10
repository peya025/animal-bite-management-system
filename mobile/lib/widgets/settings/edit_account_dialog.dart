import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/app_theme.dart';
import '../../models/patient_account_profile.dart';
import '../forms/app_text_field.dart';
import '../forms/form_error_banner.dart';

class EditAccountDialog extends StatefulWidget {
  const EditAccountDialog({
    super.key,
    required this.account,
    required this.onSave,
  });

  final PatientAccountProfile account;
  final Future<void> Function(String name, String phone) onSave;

  @override
  State<EditAccountDialog> createState() => _EditAccountDialogState();
}

class _EditAccountDialogState extends State<EditAccountDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.account.name);
    _email = TextEditingController(text: widget.account.email);
    _phone = TextEditingController(text: widget.account.phone);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(_name.text.trim(), _phone.text.trim());
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      icon: const Icon(
        Icons.manage_accounts_outlined,
        color: AppColors.primary,
      ),
      title: const Text(
        'Edit account',
        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      ),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: SizedBox(
            width: 360,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_error case final message?) ...[
                  FormErrorBanner(message: message),
                  const SizedBox(height: 16),
                ],
                AppTextField(
                  label: 'ACCOUNT NAME',
                  controller: _name,
                  enabled: !_saving,
                  prefixIcon: Icons.person_outline_rounded,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Account name is required'
                      : null,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'EMAIL',
                  controller: _email,
                  enabled: false,
                  prefixIcon: Icons.mail_outline_rounded,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'PHONE',
                  controller: _phone,
                  enabled: !_saving,
                  prefixIcon: Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.done,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(11),
                  ],
                  validator: (value) {
                    final phone = value?.trim() ?? '';
                    if (phone.isNotEmpty && phone.length != 11) {
                      return 'Phone number must be exactly 11 digits';
                    }
                    return null;
                  },
                  onFieldSubmitted: (_) {
                    if (!_saving) _submit();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: _saving
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Save'),
        ),
      ],
    );
  }
}
