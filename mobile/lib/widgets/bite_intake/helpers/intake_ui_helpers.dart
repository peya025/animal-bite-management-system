import 'package:flutter/material.dart';

import '../../../app/app_theme.dart';
import '../../../utils/configured_field_policy.dart';
import '../../buttons/primary_action_button.dart';

/// Standard form field label for intake steps.
class IntakeFieldLabel extends StatelessWidget {
  const IntakeFieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: text.endsWith(' *')
                  ? text.substring(0, text.length - 1)
                  : text,
            ),
            if (text.endsWith(' *'))
              const TextSpan(
                text: '*',
                style: TextStyle(color: AppColors.error),
              ),
          ],
        ),
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
  const IntakeReviewRow({super.key, required this.label, required this.value});

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

/// Step progress indicator showing step title, percentage, and active progress segments.
class IntakeStepProgress extends StatelessWidget {
  const IntakeStepProgress({
    super.key,
    required this.currentStep,
    this.activeSteps = const [
      IntakeStepId.patient,
      IntakeStepId.incident,
      IntakeStepId.animal,
      IntakeStepId.history,
      IntakeStepId.review,
    ],
    this.currentStepId,
  });

  final int currentStep;
  final List<IntakeStepId> activeSteps;
  final IntakeStepId? currentStepId;

  @override
  Widget build(BuildContext context) {
    final total = activeSteps.length;
    final resolvedStepId =
        currentStepId ??
        (currentStep >= 0 && currentStep < total
            ? activeSteps[currentStep]
            : activeSteps.first);
    final stepIndex = activeSteps.indexOf(resolvedStepId).clamp(0, total - 1);
    final label = switch (resolvedStepId) {
      IntakeStepId.patient => 'Patient',
      IntakeStepId.incident => 'Incident details',
      IntakeStepId.animal => 'Animal details',
      IntakeStepId.history => 'Previous history',
      IntakeStepId.review => 'Review and book',
    };
    final title = 'Step ${stepIndex + 1} of $total — $label';
    final percent = stepIndex == total - 1
        ? '100%'
        : '${((stepIndex + 1) * 100 ~/ total)}%';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 8),
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
            for (int i = 0; i < total; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: stepIndex >= i
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

/// Step navigation bar providing Back and Next/Submit buttons driven by active step IDs.
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
    this.activeSteps = const [
      IntakeStepId.patient,
      IntakeStepId.incident,
      IntakeStepId.animal,
      IntakeStepId.history,
      IntakeStepId.review,
    ],
    this.currentStepId,
  });

  final int currentStep;
  final bool isSubmitting;
  final VoidCallback onBack;
  final VoidCallback onNextStep0;
  final VoidCallback onNextStep1;
  final VoidCallback onNextStep2;
  final VoidCallback onNextStep3;
  final VoidCallback onSubmitStep4;
  final List<IntakeStepId> activeSteps;
  final IntakeStepId? currentStepId;

  String _nextLabel(IntakeStepId nextId) {
    return switch (nextId) {
      IntakeStepId.patient => 'Next: Patient',
      IntakeStepId.incident => 'Next: Incident details',
      IntakeStepId.animal => 'Next: Animal details',
      IntakeStepId.history => 'Next: Previous history',
      IntakeStepId.review => 'Next: Review and book',
    };
  }

  @override
  Widget build(BuildContext context) {
    final resolvedStepId =
        currentStepId ??
        (currentStep >= 0 && currentStep < activeSteps.length
            ? activeSteps[currentStep]
            : activeSteps.first);
    final idx = activeSteps.indexOf(resolvedStepId);

    if (resolvedStepId == IntakeStepId.review) {
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
              child: const Text(
                'Back',
                style: TextStyle(color: Color(0xFF374151)),
              ),
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
    }

    final nextStepId = (idx >= 0 && idx + 1 < activeSteps.length)
        ? activeSteps[idx + 1]
        : IntakeStepId.review;
    final onNext = switch (resolvedStepId) {
      IntakeStepId.patient => onNextStep0,
      IntakeStepId.incident => onNextStep1,
      IntakeStepId.animal => onNextStep2,
      IntakeStepId.history => onNextStep3,
      IntakeStepId.review => onSubmitStep4,
    };

    if (idx <= 0) {
      return PrimaryActionButton(
        label: _nextLabel(nextStepId),
        onPressed: onNext,
      );
    }

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
            child: const Text(
              'Back',
              style: TextStyle(color: Color(0xFF374151)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: PrimaryActionButton(
            label: _nextLabel(nextStepId),
            onPressed: onNext,
          ),
        ),
      ],
    );
  }
}
