import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

enum SocialAuthProvider { google, apple }

class SocialAuthButton extends StatelessWidget {
  const SocialAuthButton({
    super.key,
    required this.provider,
    required this.onPressed,
  });

  final SocialAuthProvider provider;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final isGoogle = provider == SocialAuthProvider.google;

    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: isGoogle
          ? const _GoogleMark()
          : const Icon(Icons.apple, color: AppColors.gray700, size: 28),
      label: Text(
        isGoogle ? 'Sign in with Google' : 'Sign in with Apple',
        style: const TextStyle(
          color: AppColors.gray700,
          fontWeight: FontWeight.w600,
        ),
      ),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 48),
        side: const BorderSide(color: Color(0xFFD8DEDC)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 26,
      height: 26,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: AppColors.white,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: Color(0x22000000), blurRadius: 4)],
      ),
      child: const Text(
        'G',
        style: TextStyle(
          color: Color(0xFF4285F4),
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
