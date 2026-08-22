import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../services/api.dart';
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
      await api.register(
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
          content: Text('Account created successfully.'),
          backgroundColor: AppColors.primary,
        ),
      );
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.menu, (route) => false);
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
                            ? 16
                            : 24,
                      ),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 20),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Registering for the first time? Create your account below. If you were already given a clinic invite code, activate your record instead.',
                                style: TextStyle(fontSize: 12, color: AppColors.gray700, height: 1.35),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
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
                          if (!RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(email)) {
                            return 'Enter a valid email address';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: AppTextField(
                              label: 'LAST NAME',
                              controller: _lastNameController,
                              enabled: !_isLoading,
                              hintText: 'Doe',
                              prefixIcon: Icons.person_outline_rounded,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [AutofillHints.familyName],
                              validator: (value) =>
                                  value == null || value.trim().isEmpty
                                      ? 'Last name is required'
                                      : null,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: AppTextField(
                              label: 'FIRST NAME',
                              controller: _firstNameController,
                              enabled: !_isLoading,
                              hintText: 'Jane',
                              textInputAction: TextInputAction.next,
                              autofillHints: const [AutofillHints.givenName],
                              validator: (value) =>
                                  value == null || value.trim().isEmpty
                                      ? 'First name is required'
                                      : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'MOBILE NUMBER',
                        controller: _phoneController,
                        enabled: !_isLoading,
                        hintText: '09171234567',
                        prefixIcon: Icons.phone_outlined,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(11),
                        ],
                        validator: (value) {
                          final phone = value?.trim() ?? '';
                          if (phone.isEmpty) return 'Mobile number is required';
                          if (phone.length != 11) {
                            return 'Enter a valid 11-digit mobile number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'PASSWORD',
                        controller: _passwordController,
                        enabled: !_isLoading,
                        hintText: '••••••••',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.newPassword],
                        suffixIcon: IconButton(
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            size: 20,
                            color: AppColors.gray500,
                          ),
                        ),
                        validator: (value) {
                          final password = value ?? '';
                          if (password.isEmpty) return 'Password is required';
                          if (password.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'CONFIRM PASSWORD',
                        controller: _passwordConfirmationController,
                        enabled: !_isLoading,
                        hintText: '••••••••',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _obscurePasswordConfirmation,
                        textInputAction: TextInputAction.done,
                        suffixIcon: IconButton(
                          onPressed: () => setState(
                            () => _obscurePasswordConfirmation =
                                !_obscurePasswordConfirmation,
                          ),
                          icon: Icon(
                            _obscurePasswordConfirmation
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            size: 20,
                            color: AppColors.gray500,
                          ),
                        ),
                        validator: (value) {
                          if (value != _passwordController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      PrimaryActionButton(
                        label: 'CREATE ACCOUNT',
                        isLoading: _isLoading,
                        onPressed: _register,
                      ),
                      const SizedBox(height: 20),
                      AccountLoginPrompt(
                        onLogin: () => Navigator.of(
                          context,
                        ).pushReplacementNamed(AppRoutes.login),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: _isLoading
                            ? null
                            : () => Navigator.of(context).pushNamed(AppRoutes.patientActivation),
                        icon: const Icon(Icons.mark_email_read_outlined, color: AppColors.primary),
                        label: const Text(
                          'Have a Clinic Invite Code? Activate Record',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 48),
                          side: const BorderSide(color: AppColors.primary, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 24),
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
