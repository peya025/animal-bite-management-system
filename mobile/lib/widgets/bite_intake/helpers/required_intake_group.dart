import 'package:flutter/material.dart';

/// Gives choice groups the same validation behavior as text fields.
class RequiredIntakeGroup extends StatelessWidget {
  const RequiredIntakeGroup({
    super.key,
    required this.valid,
    required this.message,
    required this.child,
  });
  final bool valid;
  final String message;
  final Widget child;

  @override
  Widget build(BuildContext context) => FormField<bool>(
    autovalidateMode:
        Form.maybeOf(context)?.widget.autovalidateMode ??
        AutovalidateMode.disabled,
    validator: (_) => valid ? null : message,
    builder: (field) => Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: field.hasError ? Colors.red.shade700 : Colors.transparent,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          child,
          if (field.errorText != null)
            Text(
              field.errorText!,
              style: TextStyle(color: Colors.red.shade700, fontSize: 12),
            ),
        ],
      ),
    ),
  );
}
