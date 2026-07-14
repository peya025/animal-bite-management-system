import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class PatientActionButton extends StatelessWidget {
  const PatientActionButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      tooltip: 'Patient card',
      onPressed: onPressed,
      elevation: 3,
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.white,
      shape: const CircleBorder(),
      child: const Icon(Icons.contact_emergency_outlined),
    );
  }
}
