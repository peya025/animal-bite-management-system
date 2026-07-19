import 'package:flutter/material.dart';

import '../app/app_theme.dart';
import '../app/app_routes.dart';
import '../services/mobile_api.dart';
import '../widgets/auth_mode_selector.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/buttons/social_auth_button.dart';
import '../widgets/forms/app_text_field.dart';
import '../widgets/forms/form_error_banner.dart';

class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await MobileApi.instance.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        remember: _rememberMe,
      );
      final patients = await MobileApi.instance.patients();
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Login successful.'),
          backgroundColor: AppColors.primary,
        ),
      );
      Navigator.of(context).pushNamedAndRemoveUntil(
        patients.isEmpty ? AppRoutes.profileSetup : AppRoutes.menu,
        (route) => false,
      );
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
                        selected: AuthMode.login,
                        onChanged: (mode) {
                          if (mode == AuthMode.signUp) {
                            Navigator.of(
                              context,
                            ).pushReplacementNamed(AppRoutes.signUp);
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
                          if (email.isEmpty) {
                            return 'Email is required';
                          }
                          if (!email.contains('@')) {
                            return 'Enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'PASSWORD',
                        controller: _passwordController,
                        enabled: !_isLoading,
                        hintText: 'Enter your password',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.password],
                        validator: (value) => value == null || value.isEmpty
                            ? 'Password is required'
                            : null,
                        onFieldSubmitted: (_) {
                          if (!_isLoading) {
                            _submit();
                          }
                        },
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
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          SizedBox(
                            width: 32,
                            height: 40,
                            child: Checkbox(
                              value: _rememberMe,
                              activeColor: AppColors.primary,
                              onChanged: _isLoading
                                  ? null
                                  : (value) => setState(
                                      () => _rememberMe = value ?? false,
                                    ),
                            ),
                          ),
                          const Text(
                            'Remember Me',
                            style: TextStyle(
                              color: AppColors.gray700,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const Spacer(),
                          Flexible(
                            child: TextButton(
                              onPressed: _isLoading ? null : () {},
                              style: TextButton.styleFrom(
                                minimumSize: const Size(0, 40),
                                padding: const EdgeInsets.only(left: 8),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  'Forgot your password?',
                                  maxLines: 1,
                                  style: TextStyle(
                                    color: AppColors.gray700,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      PrimaryActionButton(
                        label: 'LOGIN',
                        isLoading: _isLoading,
                        onPressed: _submit,
                      ),
                      const SizedBox(height: 14),
                      const _DividerLabel(),
                      const SizedBox(height: 14),
                      SocialAuthButton(
                        provider: SocialAuthProvider.google,
                        onPressed: _isLoading ? null : () {},
                      ),
                      const SizedBox(height: 12),
                      SocialAuthButton(
                        provider: SocialAuthProvider.apple,
                        onPressed: _isLoading ? null : () {},
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

class _DividerLabel extends StatelessWidget {
  const _DividerLabel();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(child: Divider(indent: 45)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 10),
          child: Text('or', style: TextStyle(color: AppColors.gray500)),
        ),
        Expanded(child: Divider(endIndent: 45)),
      ],
    );
  }
}
