import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class PatientActionButton extends StatelessWidget {
  const PatientActionButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x401D9E75),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(16),
          child: const Center(
            child: Icon(
              Icons.person_search,
              color: Colors.white,
              size: 26,
            ),
          ),
        ),
      ),
    );
  }
}
