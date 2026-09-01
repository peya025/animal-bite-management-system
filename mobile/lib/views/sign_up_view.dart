import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../services/api.dart';
import '../utils/app_validators.dart';
import '../widgets/auth_mode_selector.dart';
import '../widgets/buttons/account_login_prompt.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/common/app_toast.dart';
import '../widgets/forms/app_text_field.dart';
import '../widgets/forms/form_error_banner.dart';
import '../widgets/forms/ph_phone_prefix.dart';

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

  final _emailFocusNode = FocusNode();
  final _lastNameFocusNode = FocusNode();
  final _firstNameFocusNode = FocusNode();
  final _phoneFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  final _passwordConfirmationFocusNode = FocusNode();

  bool _emailBlurred = false;
  bool _phoneBlurred = false;
  bool _passwordBlurred = false;
  bool _confirmPasswordBlurred = false;

  bool _emailHadFocus = false;
  bool _phoneHadFocus = false;
  bool _passwordHadFocus = false;
  bool _confirmPasswordHadFocus = false;

  bool _submitted = false;
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscurePasswordConfirmation = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _emailFocusNode.addListener(_onFocusChange);
    _phoneFocusNode.addListener(_onFocusChange);
    _passwordFocusNode.addListener(_onFocusChange);
    _passwordConfirmationFocusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    bool changed = false;

    if (_emailFocusNode.hasFocus) {
      _emailHadFocus = true;
    } else if (_emailHadFocus && !_emailBlurred) {
      _emailBlurred = true;
      changed = true;
    }

    if (_phoneFocusNode.hasFocus) {
      _phoneHadFocus = true;
    } else if (_phoneHadFocus && !_phoneBlurred) {
      _phoneBlurred = true;
      changed = true;
    }

    if (_passwordFocusNode.hasFocus) {
      _passwordHadFocus = true;
    } else if (_passwordHadFocus && !_passwordBlurred) {
      _passwordBlurred = true;
      changed = true;
    }

    if (_passwordConfirmationFocusNode.hasFocus) {
      _confirmPasswordHadFocus = true;
    } else if (_confirmPasswordHadFocus && !_confirmPasswordBlurred) {
      _confirmPasswordBlurred = true;
      changed = true;
    }

    if (changed && mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _emailFocusNode.removeListener(_onFocusChange);
    _phoneFocusNode.removeListener(_onFocusChange);
    _passwordFocusNode.removeListener(_onFocusChange);
    _passwordConfirmationFocusNode.removeListener(_onFocusChange);

    _emailFocusNode.dispose();
    _lastNameFocusNode.dispose();
    _firstNameFocusNode.dispose();
    _phoneFocusNode.dispose();
    _passwordFocusNode.dispose();
    _passwordConfirmationFocusNode.dispose();

    _emailController.dispose();
    _lastNameController.dispose();
    _firstNameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _passwordConfirmationController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_isLoading) return;

    setState(() {
      _submitted = true;
      _emailBlurred = true;
      _phoneBlurred = true;
      _passwordBlurred = true;
      _confirmPasswordBlurred = true;
    });

    if (!(_formKey.currentState?.validate() ?? false)) {
      setState(() {
        _errorMessage = 'Please check the highlighted boxes and enter the required details.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      await api.register(
        name:
            '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}',
        email: _emailController.text.trim(),
        phone: AppValidators.normalizePhMobile(_phoneController.text),
        password: _passwordController.text,
        passwordConfirmation: _passwordConfirmationController.text,
      );
      if (!mounted) return;

      AppToast.success(context, 'Account created successfully.');
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
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
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
                        focusNode: _emailFocusNode,
                        enabled: !_isLoading,
                        hintText: 'you@example.com',
                        prefixIcon: Icons.mail_outline_rounded,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.email],
                        autovalidateMode: (_emailBlurred || _submitted)
                            ? AutovalidateMode.onUserInteraction
                            : AutovalidateMode.disabled,
                        onChanged: (val) {
                          if (_emailBlurred && mounted) {
                            setState(() {});
                          }
                        },
                        validator: (value) {
                          if (!_emailBlurred && !_submitted) return null;
                          return AppValidators.email(value, required: true);
                        },
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: AppTextField(
                              label: 'LAST NAME',
                              controller: _lastNameController,
                              focusNode: _lastNameFocusNode,
                              enabled: !_isLoading,
                              hintText: 'Doe',
                              textCapitalization: TextCapitalization.words,
                              prefixIcon: Icons.person_outline_rounded,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [AutofillHints.familyName],
                              autovalidateMode: _submitted
                                  ? AutovalidateMode.onUserInteraction
                                  : AutovalidateMode.disabled,
                              validator: (value) {
                                if (!_submitted) return null;
                                return AppValidators.name(value, 'Last name', required: true);
                              },
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: AppTextField(
                              label: 'FIRST NAME',
                              controller: _firstNameController,
                              focusNode: _firstNameFocusNode,
                              enabled: !_isLoading,
                              hintText: 'Jane',
                              textCapitalization: TextCapitalization.words,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [AutofillHints.givenName],
                              autovalidateMode: _submitted
                                  ? AutovalidateMode.onUserInteraction
                                  : AutovalidateMode.disabled,
                              validator: (value) {
                                if (!_submitted) return null;
                                return AppValidators.name(value, 'First name', required: true);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'MOBILE NUMBER',
                        controller: _phoneController,
                        focusNode: _phoneFocusNode,
                        enabled: !_isLoading,
                        hintText: '9XX XXX XXXX',
                        prefixWidget: const PhPhonePrefixPill(prefix: '+63'),
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        inputFormatters: const [PhPhoneNumberFormatter()],
                        autovalidateMode: (_phoneBlurred || _submitted)
                            ? AutovalidateMode.onUserInteraction
                            : AutovalidateMode.disabled,
                        onChanged: (val) {
                          if (_phoneBlurred && mounted) {
                            setState(() {});
                          }
                        },
                        validator: (value) {
                          if (!_phoneBlurred && !_submitted) return null;
                          return AppValidators.phMobile(value, required: true);
                        },
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'PASSWORD',
                        controller: _passwordController,
                        focusNode: _passwordFocusNode,
                        enabled: !_isLoading,
                        hintText: '••••••••',
                        helperText: 'Must be at least 8 characters long',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.newPassword],
                        autovalidateMode: (_passwordBlurred || _submitted)
                            ? AutovalidateMode.onUserInteraction
                            : AutovalidateMode.disabled,
                        onChanged: (val) {
                          if (_passwordBlurred && mounted) {
                            setState(() {});
                          }
                        },
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
                          if (!_passwordBlurred && !_submitted) return null;
                          return AppValidators.password(value, required: true, minLength: 8);
                        },
                      ),
                      const SizedBox(height: 18),
                      AppTextField(
                        label: 'CONFIRM PASSWORD',
                        controller: _passwordConfirmationController,
                        focusNode: _passwordConfirmationFocusNode,
                        enabled: !_isLoading,
                        hintText: '••••••••',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _obscurePasswordConfirmation,
                        textInputAction: TextInputAction.done,
                        autovalidateMode: (_confirmPasswordBlurred || _submitted)
                            ? AutovalidateMode.onUserInteraction
                            : AutovalidateMode.disabled,
                        onChanged: (val) {
                          if (_confirmPasswordBlurred && mounted) {
                            setState(() {});
                          }
                        },
                        onFieldSubmitted: (_) => _register(),
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
                          if (!_confirmPasswordBlurred && !_submitted) return null;
                          return AppValidators.confirmPassword(
                            value,
                            _passwordController.text,
                          );
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
