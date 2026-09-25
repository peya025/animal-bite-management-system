import 'package:flutter/material.dart';

import '../../../app/app_theme.dart';
import '../../buttons/primary_action_button.dart';

/// Standard form field label for intake steps.
class IntakeFieldLabel extends StatelessWidget {
  const IntakeFieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColors.gray700,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Standardized section header with teal icon container.
class IntakeSectionHeader extends StatelessWidget {
  const IntakeSectionHeader({
    super.key,
    required this.icon,
    required this.title,
  });

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: const Color(0xFFE1F5EE),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
            ),
          ),
        ),
      ],
    );
  }
}

/// Standardized review summary header with optional Edit button.
class IntakeSummaryHeader extends StatelessWidget {
  const IntakeSummaryHeader({
    super.key,
    required this.title,
    required this.icon,
    this.editStep,
    this.onEdit,
    this.isSubmitting = false,
  });

  final String title;
  final IconData icon;
  final int? editStep;
  final ValueChanged<int>? onEdit;
  final bool isSubmitting;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: AppColors.primary),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
              ),
            ),
          ],
        ),
        if (editStep != null && onEdit != null)
          InkWell(
            onTap: isSubmitting ? null : () => onEdit!(editStep!),
            borderRadius: BorderRadius.circular(4),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              child: Text(
                'Edit',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Standardized two-column review row.
class IntakeReviewRow extends StatelessWidget {
  const IntakeReviewRow({
    super.key,
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.gray600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF1F2937),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Standardized read-only field box for Form 1 data.
class IntakeReadOnlyField extends StatelessWidget {
  const IntakeReadOnlyField({
    super.key,
    required this.label,
    required this.value,
  });

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IntakeFieldLabel(label),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Text(
              value ?? '—',
              style: const TextStyle(fontSize: 13, color: Color(0xFF374151)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Step progress indicator showing step title, percentage, and 5 progress segments.
class IntakeStepProgress extends StatelessWidget {
  const IntakeStepProgress({super.key, required this.currentStep});

  final int currentStep;

  @override
  Widget build(BuildContext context) {
    final title = switch (currentStep) {
      0 => 'Step 1 of 5 — Patient',
      1 => 'Step 2 of 5 — Incident details',
      2 => 'Step 3 of 5 — Animal details',
      3 => 'Step 4 of 5 — Previous history',
      4 => 'Step 5 of 5 — Review and book',
      _ => 'Step 1 of 5 — Patient',
    };

    final percent = switch (currentStep) {
      0 => '20%',
      1 => '40%',
      2 => '60%',
      3 => '80%',
      4 => '100%',
      _ => '20%',
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
            Text(
              percent,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (int i = 0; i < 5; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: currentStep >= i
                        ? AppColors.primary
                        : const Color(0xFFE1F5EE),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

/// Step navigation bar providing Back and Next/Submit buttons.
class IntakeStepNavigation extends StatelessWidget {
  const IntakeStepNavigation({
    super.key,
    required this.currentStep,
    required this.isSubmitting,
    required this.onBack,
    required this.onNextStep0,
    required this.onNextStep1,
    required this.onNextStep2,
    required this.onNextStep3,
    required this.onSubmitStep4,
  });

  final int currentStep;
  final bool isSubmitting;
  final VoidCallback onBack;
  final VoidCallback onNextStep0;
  final VoidCallback onNextStep1;
  final VoidCallback onNextStep2;
  final VoidCallback onNextStep3;
  final VoidCallback onSubmitStep4;

  @override
  Widget build(BuildContext context) {
    switch (currentStep) {
      case 0:
        return PrimaryActionButton(
          label: 'Next: Incident details',
          onPressed: onNextStep0,
        );
      case 1:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: onBack,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Next: Animal details',
                onPressed: onNextStep1,
              ),
            ),
          ],
        );
      case 2:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: onBack,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Next: Previous history',
                onPressed: onNextStep2,
              ),
            ),
          ],
        );
      case 3:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: onBack,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Next: Review and book',
                onPressed: onNextStep3,
              ),
            ),
          ],
        );
      case 4:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: isSubmitting ? null : onBack,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text('Back', style: TextStyle(color: Color(0xFF374151))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: PrimaryActionButton(
                label: 'Confirm and book',
                isLoading: isSubmitting,
                onPressed: onSubmitStep4,
              ),
            ),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
