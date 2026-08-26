import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Formatter that automatically chunks Philippine mobile numbers (e.g., 0917 123 4567 or 917 123 4567).
class PhPhoneNumberFormatter extends TextInputFormatter {
  const PhPhoneNumberFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text;
    final digitsOnly = text.replaceAll(RegExp(r'\D'), '');

    // Max 11 digits for 09XXXXXXXXX, or 10 digits for 9XXXXXXXXX
    final maxLen = digitsOnly.startsWith('0') ? 11 : 10;
    final limitedDigits = digitsOnly.length > maxLen
        ? digitsOnly.substring(0, maxLen)
        : digitsOnly;

    final buffer = StringBuffer();
    for (int i = 0; i < limitedDigits.length; i++) {
      // Chunking: 09XX XXX XXXX or 9XX XXX XXXX
      if (limitedDigits.startsWith('0')) {
        if (i == 4 || i == 7) buffer.write(' ');
      } else {
        if (i == 3 || i == 6) buffer.write(' ');
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

/// Philippine Flag and Prefix Pill Widget displayed inside phone text inputs.
class PhPhonePrefixPill extends StatelessWidget {
  const PhPhonePrefixPill({
    super.key,
    this.prefix = '+63',
    this.showArrow = true,
  });

  final String prefix;
  final bool showArrow;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 8, right: 10, top: 6, bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            '🇵🇭',
            style: TextStyle(fontSize: 15),
          ),
          const SizedBox(width: 5),
          Text(
            prefix,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF374151),
            ),
          ),
          if (showArrow) ...[
            const SizedBox(width: 3),
            const Icon(
              Icons.keyboard_arrow_down_rounded,
              size: 15,
              color: Color(0xFF6B7280),
            ),
          ],
        ],
      ),
    );
  }
}
