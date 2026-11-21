import 'package:flutter/material.dart';

/// Formats systolic and diastolic string inputs into a standardized blood pressure string.
String? formatBloodPressure(String sysInput, String diaInput) {
  final sys = sysInput.trim();
  final dia = diaInput.trim();
  if (sys.isEmpty && dia.isEmpty) return null;
  if (sys.isNotEmpty && dia.isNotEmpty) return '$sys/$dia';
  return sys.isNotEmpty ? sys : dia;
}

/// A status badge widget that displays AHA/DOH clinical category based on systolic and diastolic values.
class BpStatusBadge extends StatelessWidget {
  const BpStatusBadge({
    super.key,
    required this.systolicText,
    required this.diastolicText,
  });

  final String systolicText;
  final String diastolicText;

  @override
  Widget build(BuildContext context) {
    final sys = int.tryParse(systolicText.trim());
    final dia = int.tryParse(diastolicText.trim());
    if (sys == null && dia == null) return const SizedBox.shrink();

    final String label;
    final Color bgColor;
    final Color textColor;

    if ((sys != null && sys >= 140) || (dia != null && dia >= 90)) {
      label = 'High BP (Stage 2)';
      bgColor = const Color(0xFFFEE2E2);
      textColor = const Color(0xFF991B1B);
    } else if ((sys != null && sys >= 130) || (dia != null && dia >= 80)) {
      label = 'High BP (Stage 1)';
      bgColor = const Color(0xFFFEF3C7);
      textColor = const Color(0xFF92400E);
    } else if (sys != null && sys >= 120 && (dia == null || dia < 80)) {
      label = 'Elevated BP';
      bgColor = const Color(0xFFFEF9C3);
      textColor = const Color(0xFF854D0E);
    } else if ((sys == null || sys >= 90) && (dia == null || dia >= 60)) {
      label = 'Normal BP';
      bgColor = const Color(0xFFDCFCE7);
      textColor = const Color(0xFF166534);
    } else {
      label = 'Low BP';
      bgColor = const Color(0xFFE0F2FE);
      textColor = const Color(0xFF075985);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: textColor.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

/// A status badge widget that displays fever and temperature categorization.
class TempStatusBadge extends StatelessWidget {
  const TempStatusBadge({
    super.key,
    required this.temperatureText,
  });

  final String temperatureText;

  @override
  Widget build(BuildContext context) {
    final temp = double.tryParse(temperatureText.trim());
    if (temp == null) return const SizedBox.shrink();

    final String label;
    final Color bgColor;
    final Color textColor;

    if (temp >= 38.5) {
      label = 'High Fever';
      bgColor = const Color(0xFFFEE2E2);
      textColor = const Color(0xFF991B1B);
    } else if (temp >= 37.6) {
      label = 'Low-grade Fever';
      bgColor = const Color(0xFFFEF3C7);
      textColor = const Color(0xFF92400E);
    } else if (temp >= 36.0 && temp <= 37.5) {
      label = 'Normal (36.0–37.5°C)';
      bgColor = const Color(0xFFDCFCE7);
      textColor = const Color(0xFF166534);
    } else {
      label = 'Low Temperature';
      bgColor = const Color(0xFFE0F2FE);
      textColor = const Color(0xFF075985);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: textColor.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}
