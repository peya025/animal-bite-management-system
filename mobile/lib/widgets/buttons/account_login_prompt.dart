import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class AccountLoginPrompt extends StatelessWidget {
  const AccountLoginPrompt({
    super.key,
    required this.onLogin,
    this.enabled = true,
  });

  final VoidCallback onLogin;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'Have an account?',
          style: TextStyle(color: AppColors.gray700, fontSize: 13),
        ),
        TextButton(
          onPressed: enabled ? onLogin : null,
          child: const Text(
            'Log in',
            style: TextStyle(
              color: AppColors.primaryDark,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}
