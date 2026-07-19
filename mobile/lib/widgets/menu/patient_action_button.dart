import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class PatientActionButton extends StatelessWidget {
  const PatientActionButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: const Offset(0, -6),
      child: Container(
        width: 64,
        height: 64,
        padding: const EdgeInsets.all(3),
        decoration: const BoxDecoration(
          color: AppColors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Color(0x2B111827),
              blurRadius: 12,
              offset: Offset(0, 5),
            ),
          ],
        ),
        child: FloatingActionButton(
          tooltip: 'Patient card',
          onPressed: onPressed,
          elevation: 0,
          highlightElevation: 0,
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.white,
          shape: const CircleBorder(),
          child: const Icon(Icons.contact_emergency_outlined),
        ),
      ),
    );
  }
}
