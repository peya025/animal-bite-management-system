import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class AppDropdownField<T> extends StatelessWidget {
  const AppDropdownField({
    super.key,
    required this.label,
    required this.items,
    required this.onChanged,
    this.initialValue,
    this.hintText,
    this.prefixIcon,
    this.enabled = true,
  });

  final String label;
  final T? initialValue;
  final String? hintText;
  final IconData? prefixIcon;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.gray700,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 7),
        DropdownButtonFormField<T>(
          initialValue: initialValue,
          isExpanded: true,
          items: items,
          onChanged: enabled ? onChanged : null,
          style: const TextStyle(
            color: AppColors.gray900,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            hintText: hintText,
            prefixIcon: prefixIcon == null
                ? null
                : Icon(prefixIcon, color: AppColors.gray500, size: 21),
          ),
        ),
      ],
    );
  }
}
