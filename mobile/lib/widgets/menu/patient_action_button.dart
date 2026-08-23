import 'package:flutter/material.dart';

class PatientActionButton extends StatelessWidget {
  const PatientActionButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        color: const Color(0xFF1D9E75),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF4F6F5), width: 3),
        boxShadow: const [
          BoxShadow(
            color: Color(0x591D9E75),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(14),
          child: const Center(
            child: Icon(
              Icons.person_search,
              color: Colors.white,
              size: 22,
            ),
          ),
        ),
      ),
    );
  }
}
