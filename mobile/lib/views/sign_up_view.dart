import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../services/mobile_api.dart';
import '../widgets/auth_mode_selector.dart';
import '../widgets/buttons/account_login_prompt.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/forms/app_text_field.dart';
import '../widgets/forms/form_error_banner.dart';

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
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordConfirmationController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscurePasswordConfirmation = true;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _lastNameController.dispose();
    _firstNameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _passwordConfirmationController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      await MobileApi.instance.register(
        name:
            '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}',
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
        passwordConfirmation: _passwordConfirmationController.text,
      );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account created. Add your patient profile.'),
          backgroundColor: AppColors.primary,
        ),
      );
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.profileSetup, (route) => false);
    } catch (error) {
      if (mounted) setState(() => _errorMessage = error.toString());
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
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: MediaQuery.sizeOf(context).height < 760
                            ? 12
                            : 28,
                      ),
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
                      SizedBox(
                        height: MediaQuery.sizeOf(context).height < 760
                            ? 36
                            : 48,
                      ),
                      if (_errorMessage case final message?) ...[
                        FormErrorBanner(message: message),
                        const SizedBox(height: 20),
                      ],
                      AppTextField(
                        label: 'EMAIL',
                        controller: _emailController,
                        enabled: !_isLoading,
                        hintText: 'you@example.com',
                        prefixIcon: Icons.mail_outline_rounded,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.email],
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          if (email.isEmpty) return 'Email is required';
                          if (!email.contains('@')) return 'Enter a valid email';
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'FIRST NAME',
                        controller: _firstNameController,
                        enabled: !_isLoading,
                        hintText: 'Enter your first name',
                        prefixIcon: Icons.person_outline_rounded,
                        textInputAction: TextInputAction.next,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.givenName],
                        validator: (value) =>
                            value == null || value.trim().isEmpty
                            ? 'FIRST NAME is required'
                            : null,
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'LAST NAME',
                        controller: _lastNameController,
                        enabled: !_isLoading,
                        hintText: 'Enter your last name',
                        prefixIcon: Icons.badge_outlined,
                        textInputAction: TextInputAction.next,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.familyName],
                        validator: (value) =>
                            value == null || value.trim().isEmpty
                            ? 'LAST NAME is required'
                            : null,
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'PHONE',
                        controller: _phoneController,
                        enabled: !_isLoading,
                        hintText: '09XX XXX XXXX',
                        prefixIcon: Icons.phone_outlined,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.telephoneNumber],
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'PASSWORD',
                        controller: _passwordController,
                        enabled: !_isLoading,
                        hintText: 'At least 8 characters',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.newPassword],
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword
                              ? 'Show password'
                              : 'Hide password',
                          onPressed: _isLoading
                              ? null
                              : () => setState(
                                  () => _obscurePassword = !_obscurePassword,
                                ),
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            color: AppColors.gray500,
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.length < 8) {
                            return 'Use at least 8 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'CONFIRM PASSWORD',
                        controller: _passwordConfirmationController,
                        enabled: !_isLoading,
                        hintText: 'Enter the password again',
                        prefixIcon: Icons.lock_reset_rounded,
                        obscureText: _obscurePasswordConfirmation,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.newPassword],
                        suffixIcon: IconButton(
                          tooltip: _obscurePasswordConfirmation
                              ? 'Show password confirmation'
                              : 'Hide password confirmation',
                          onPressed: _isLoading
                              ? null
                              : () => setState(
                                  () => _obscurePasswordConfirmation =
                                      !_obscurePasswordConfirmation,
                                ),
                          icon: Icon(
                            _obscurePasswordConfirmation
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            color: AppColors.gray500,
                          ),
                        ),
                        validator: (value) =>
                            value != _passwordController.text
                            ? 'Passwords do not match'
                            : null,
                        onFieldSubmitted: (_) {
                          if (!_isLoading) _register();
                        },
                      ),
                      const SizedBox(height: 24),
                      PrimaryActionButton(
                        label: 'REGISTER',
                        isLoading: _isLoading,
                        onPressed: _register,
                      ),
                      const SizedBox(height: 16),
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
      ),
    );
  }
}
