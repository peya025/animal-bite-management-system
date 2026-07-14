import 'package:flutter/material.dart';

import '../app/app_theme.dart';

enum AuthMode { login, signUp }

class AuthModeSelector extends StatelessWidget {
  const AuthModeSelector({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final AuthMode selected;
  final ValueChanged<AuthMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 240,
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.gray100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            _ModeButton(
              label: 'LOGIN',
              selected: selected == AuthMode.login,
              onTap: () => onChanged(AuthMode.login),
            ),
            _ModeButton(
              label: 'SIGN UP',
              selected: selected == AuthMode.signUp,
              onTap: () => onChanged(AuthMode.signUp),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: selected ? AppColors.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: selected ? AppColors.white : AppColors.primaryDark,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
