import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../widgets/auth_mode_selector.dart';
import '../widgets/buttons/account_login_prompt.dart';
import '../widgets/buttons/primary_action_button.dart';

class SignUpView extends StatefulWidget {
  const SignUpView({super.key});

  @override
  State<SignUpView> createState() => _SignUpViewState();
}

class _SignUpViewState extends State<SignUpView> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _lastNameController.dispose();
    _firstNameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);
    try {
      // The API payload will combine first and last name into `name`.
      await Future<void>.delayed(const Duration(seconds: 2));
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration successful! (Demo)'),
          backgroundColor: AppColors.primary,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 34),
                    AuthModeSelector(
                      selected: AuthMode.signUp,
                      onChanged: (mode) {
                        if (mode == AuthMode.login) {
                          Navigator.of(
                            context,
                          ).pushReplacementNamed(AppRoutes.login);
                        }
                      },
                    ),
                    const SizedBox(height: 56),
                    _SignUpField(
                      label: 'EMAIL',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        if (email.isEmpty) return 'Email is required';
                        if (!email.contains('@')) return 'Enter a valid email';
                        return null;
                      },
                    ),
                    _SignUpField(
                      label: 'LAST NAME',
                      controller: _lastNameController,
                    ),
                    _SignUpField(
                      label: 'FIRST NAME',
                      controller: _firstNameController,
                    ),
                    _SignUpField(
                      label: 'ADDRESS',
                      controller: _addressController,
                      textCapitalization: TextCapitalization.words,
                    ),
                    _SignUpField(
                      label: 'PHONE',
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: PrimaryActionButton(
                        label: 'REGISTER',
                        width: 210,
                        isLoading: _isLoading,
                        onPressed: _register,
                      ),
                    ),
                    const SizedBox(height: 18),
                    AccountLoginPrompt(
                      enabled: !_isLoading,
                      onLogin: () => Navigator.of(
                        context,
                      ).pushReplacementNamed(AppRoutes.login),
                    ),
                    const SizedBox(height: 28),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SignUpField extends StatelessWidget {
  const _SignUpField({
    required this.label,
    required this.controller,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.validator,
  });

  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.gray700,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            enabled: true,
            keyboardType: keyboardType,
            textCapitalization: textCapitalization,
            validator:
                validator ??
                (value) => value == null || value.trim().isEmpty
                    ? '$label is required'
                    : null,
          ),
        ],
      ),
    );
  }
}
