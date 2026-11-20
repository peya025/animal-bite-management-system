import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app_theme.dart';
import '../../../utils/app_validators.dart';
import '../../forms/ph_phone_prefix.dart';

class PhilHealthNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text;
    final digitsOnly = text.replaceAll(RegExp(r'\D'), '');
    final limitedDigits = digitsOnly.length > 12
        ? digitsOnly.substring(0, 12)
        : digitsOnly;

    final buffer = StringBuffer();
    for (int i = 0; i < limitedDigits.length; i++) {
      if (i == 2 || i == 11) {
        buffer.write('-');
      }
      buffer.write(limitedDigits[i]);
    }

    final formattedText = buffer.toString();
    return TextEditingValue(
      text: formattedText,
      selection: TextSelection.collapsed(offset: formattedText.length),
    );
  }
}

String formatPhilHealthNumber(String? value) {
  if (value == null || value.trim().isEmpty) return '';
  final digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 11) {
    return '${digits.substring(0, 2)}-${digits.substring(2)}';
  }
  return '${digits.substring(0, 2)}-${digits.substring(2, 11)}-${digits.substring(11, digits.length > 12 ? 12 : digits.length)}';
}

Widget profileSectionCard({
  required IconData icon,
  required String title,
  required List<Widget> children,
}) {
  return Container(
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Colors.grey.shade200, width: 0.5),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF111827),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ...children,
      ],
    ),
  );
}

Widget profileSentenceLabel(String text, {bool required = false}) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text.rich(
      TextSpan(
        text: text,
        style: const TextStyle(
          color: Color(0xFF374151),
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
        children: [
          if (required)
            const TextSpan(
              text: ' *',
              style: TextStyle(color: AppColors.error),
            ),
        ],
      ),
    ),
  );
}

Widget profileChipSelector<T>({
  required String label,
  required T? selectedValue,
  required List<MapEntry<T, String>> options,
  required ValueChanged<T> onSelected,
  bool isDisabled = false,
  bool required = false,
  String? Function(T?)? validator,
}) {
  return FormField<T>(
    key: ValueKey(selectedValue),
    initialValue: selectedValue,
    validator:
        validator ??
        (value) {
          final current = selectedValue ?? value;
          if (required && current == null) {
            return '$label is required.';
          }
          return null;
        },
    builder: (state) {
      final hasError = state.hasError;
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            profileSentenceLabel(label, required: required),
            const SizedBox(height: 6),
            Container(
              decoration: hasError
                  ? BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.error,
                        width: 1.5,
                      ),
                    )
                  : null,
              padding: hasError ? const EdgeInsets.all(8) : EdgeInsets.zero,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: options.map((option) {
                  final isSelected = selectedValue == option.key;
                  return ChoiceChip(
                    label: Text(option.value),
                    selected: isSelected,
                    selectedColor: const Color(0xFFE1F5EE),
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: isSelected
                          ? AppColors.primary
                          : (hasError ? AppColors.error : Colors.grey.shade300),
                      width: isSelected ? 1.5 : (hasError ? 1.0 : 0.5),
                    ),
                    labelStyle: TextStyle(
                      color: isSelected
                          ? const Color(0xFF085041)
                          : (hasError
                                ? AppColors.error
                                : const Color(0xFF374151)),
                      fontSize: 12,
                      fontWeight: isSelected
                          ? FontWeight.w600
                          : FontWeight.w400,
                    ),
                    onSelected: isDisabled
                        ? null
                        : (_) {
                            state.didChange(option.key);
                            onSelected(option.key);
                          },
                  );
                }).toList(),
              ),
            ),
            if (hasError) ...[
              const SizedBox(height: 6),
              Text(
                state.errorText ?? '',
                style: const TextStyle(
                  color: AppColors.error,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      );
    },
  );
}

Widget profileInputField(
  String label,
  TextEditingController controller, {
  String? hint,
  bool isDisabled = false,
  bool required = false,
  bool phone = false,
  bool email = false,
  bool philhealth = false,
  bool isPhilhealthMember = false,
  Widget? suffixIcon,
  VoidCallback? onTap,
  bool readOnly = false,
  String? Function(String?)? validator,
}) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        profileSentenceLabel(label, required: required),
        TextFormField(
          controller: controller,
          enabled: !isDisabled,
          readOnly: readOnly,
          onTap: onTap,
          keyboardType: (phone || philhealth)
              ? TextInputType.phone
              : email
              ? TextInputType.emailAddress
              : TextInputType.name,
          textCapitalization: (phone || email || philhealth)
              ? TextCapitalization.none
              : TextCapitalization.words,
          inputFormatters: philhealth
              ? [PhilHealthNumberFormatter()]
              : phone
              ? const [PhPhoneNumberFormatter()]
              : null,
          style: const TextStyle(fontSize: 13, color: Color(0xFF111827)),
          decoration: InputDecoration(
            hintText: phone ? (hint ?? '9XX XXX XXXX') : hint,
            hintStyle: const TextStyle(
              fontSize: 12,
              color: Color(0xFF9CA3AF),
            ),
            prefixIcon: phone ? const PhPhonePrefixPill(prefix: '+63') : null,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 1.5,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: AppColors.error,
                width: 1.5,
              ),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: AppColors.error,
                width: 1.5,
              ),
            ),
            errorStyle: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: AppColors.error,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
            suffixIcon: suffixIcon,
          ),
          validator:
              validator ??
              (value) {
                final trimmed = value?.trim() ?? '';
                if (required && trimmed.isEmpty) {
                  return '$label is required.';
                }
                if (phone && trimmed.isNotEmpty) {
                  return AppValidators.phMobile(trimmed, required: required);
                }
                if (philhealth && (required || trimmed.isNotEmpty)) {
                  return AppValidators.philHealth(
                    trimmed,
                    isMember: isPhilhealthMember && required,
                  );
                }
                if (email && trimmed.isNotEmpty) {
                  return AppValidators.email(trimmed, required: required);
                }
                return null;
              },
        ),
      ],
    ),
  );
}

Widget profileDropdownField<T>({
  required String label,
  required T? selectedValue,
  required List<DropdownMenuItem<T>> items,
  required ValueChanged<T?>? onChanged,
  String? hint,
  bool isDisabled = false,
  bool required = false,
  bool allowClear = false,
  String? Function(T?)? validator,
}) {
  final hasMatchingValue =
      selectedValue != null &&
      items.any((item) => item.value == selectedValue);
  final effectiveItems = <DropdownMenuItem<T>>[
    if (allowClear && !required)
      DropdownMenuItem<T>(
        value: null,
        child: Text(
          '— Not specified —',
          style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
        ),
      ),
    ...items,
    if (selectedValue != null && !hasMatchingValue)
      DropdownMenuItem<T>(
        value: selectedValue,
        child: Text(selectedValue.toString()),
      ),
  ];

  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        profileSentenceLabel(label, required: required),
        DropdownButtonFormField<T>(
          key: ValueKey(selectedValue),
          isExpanded: true,
          initialValue: selectedValue,
          hint: hint != null
              ? Text(
                  hint,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF9CA3AF),
                  ),
                )
              : null,
          items: effectiveItems,
          onChanged: isDisabled ? null : onChanged,
          style: const TextStyle(fontSize: 13, color: Color(0xFF111827)),
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade200, width: 0.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 1.5,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: AppColors.error,
                width: 1.5,
              ),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: AppColors.error,
                width: 1.5,
              ),
            ),
            errorStyle: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: AppColors.error,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
          ),
          validator:
              validator ??
              (value) =>
                  (required &&
                      (value == null || (value is String && value.isEmpty)))
                  ? '$label is required.'
                  : null,
        ),
      ],
    ),
  );
}
