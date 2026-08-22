import 'package:flutter/material.dart';
import '../../app/app_theme.dart';

class BookingSummary extends StatelessWidget {
  const BookingSummary({
    super.key,
    required this.onConfirm,
    this.isLoading = false,
    this.confirmLabel,
  });

  final VoidCallback onConfirm;
  final bool isLoading;
  final String? confirmLabel;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 52,
          child: ElevatedButton(
            onPressed: isLoading ? null : onConfirm,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            child: isLoading
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(confirmLabel ?? 'Confirm booking'),
          ),
        ),
      ],
    );
  }
}
