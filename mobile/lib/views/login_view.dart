import 'package:flutter/material.dart';

import '../app/app_theme.dart';
import '../app/app_routes.dart';
import '../services/api.dart';
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
      await api.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        remember: _rememberMe,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Login successful.'),
          backgroundColor: AppColors.primary,
        ),
      );
      Navigator.of(context).pushNamedAndRemoveUntil(
        AppRoutes.menu,
        (route) => false,
      );
    } catch (error) {
      if (mounted) setState(() => _errorMessage = error.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _showForgotPasswordDialog() async {
    final resetEmailController = TextEditingController(text: _emailController.text);
    final formKey = GlobalKey<FormState>();
    bool isSubmittingReset = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.lock_reset, color: AppColors.primary),
              SizedBox(width: 10),
              Text('Reset Password', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Enter your account email address. We will send you instructions to reset your password.',
                  style: TextStyle(fontSize: 13, color: AppColors.gray600),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: resetEmailController,
                  keyboardType: TextInputType.emailAddress,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icon(Icons.email_outlined),
                    border: OutlineInputBorder(),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Email is required';
                    if (!val.contains('@')) return 'Enter a valid email';
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmittingReset ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              onPressed: isSubmittingReset
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDialogState(() => isSubmittingReset = true);
                      try {
                        final msg = await api.requestPasswordReset(
                          email: resetEmailController.text.trim(),
                        );
                        if (!dialogContext.mounted) return;
                        Navigator.pop(dialogContext);
                        ScaffoldMessenger.of(this.context).showSnackBar(
                          SnackBar(
                            content: Text(msg),
                            backgroundColor: AppColors.primary,
                            duration: const Duration(seconds: 4),
                          ),
                        );
                      } catch (e) {
                        setDialogState(() => isSubmittingReset = false);
                        ScaffoldMessenger.of(dialogContext).showSnackBar(
                          SnackBar(
                            content: Text(e.toString()),
                            backgroundColor: Colors.red.shade700,
                          ),
                        );
                      }
                    },
              child: isSubmittingReset
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Send Reset Link'),
            ),
          ],
        ),
      ),
    );
    resetEmailController.dispose();
  }

  void _showSocialAuthNotice(String providerName) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.info_outline, color: AppColors.primary, size: 28),
            ),
            const SizedBox(height: 16),
            Text(
              '$providerName Sign-In Coming Soon',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.gray900),
            ),
            const SizedBox(height: 8),
            Text(
              '$providerName authentication will be available in an upcoming mobile release. Please sign in with your email & password or SMS activation code.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.gray600, height: 1.4),
            ),
            const SizedBox(height: 20),
            PrimaryActionButton(
              label: 'GOT IT',
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
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
                              onPressed: _isLoading ? null : _showForgotPasswordDialog,
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
                        onPressed: _isLoading ? null : () => _showSocialAuthNotice('Google'),
                      ),
                      const SizedBox(height: 18),
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
