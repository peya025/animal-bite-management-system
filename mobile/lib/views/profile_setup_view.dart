import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../controllers/profile_setup_controller.dart';
import '../models/form_configuration.dart';
import '../models/patient_profile.dart';
import '../services/form_configuration_repository.dart';
import '../utils/configured_field_policy.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/common/app_toast.dart';
import '../widgets/profile_setup/sections/profile_address_contact_section.dart';
import '../widgets/profile_setup/sections/profile_basic_info_section.dart';
import '../widgets/profile_setup/sections/profile_socioeconomic_program_section.dart';

class ProfileSetupView extends StatefulWidget {
  const ProfileSetupView({
    super.key,
    this.initialRelationship = 'self',
    this.returnToBooking = false,
    this.existingPatient,
    this.configRepository,
    this.initialConfig,
  });

  final String initialRelationship;
  final bool returnToBooking;
  final PatientProfile? existingPatient;
  final FormConfigurationRepository? configRepository;
  final FormConfiguration? initialConfig;

  @override
  State<ProfileSetupView> createState() => _ProfileSetupViewState();
}

class _ProfileSetupViewState extends State<ProfileSetupView> {
  late final ProfileSetupController _controller;

  @override
  void initState() {
    super.initState();
    _controller = ProfileSetupController(
      existingPatient: widget.existingPatient,
      initialRelationship: widget.initialRelationship,
      configRepository: widget.configRepository,
      initialConfig: widget.initialConfig,
    )..initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _chooseBirthDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate:
          _controller.selectedBirthDate ?? DateTime(now.year - 20, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime(now.year, now.month, now.day - 1),
    );
    if (date == null || !mounted) return;
    _controller.setBirthDate(date);
  }

  void _handleBack() {
    if (!_controller.prevStep()) {
      Navigator.of(context).maybePop();
    }
  }

  Future<void> _handleSave() async {
    final result = await _controller.save();
    if (!mounted) return;
    if (result.outcome == ProfileSaveOutcome.saved && result.patient != null) {
      if (_controller.isEditMode || widget.returnToBooking) {
        Navigator.of(context).pop(result.patient);
        return;
      }
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.menu, (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final policy = _controller.policy;
        return PopScope(
          canPop: _controller.isFirstStep,
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop && !_controller.isFirstStep) {
              _controller.prevStep();
            }
          },
          child: Scaffold(
            backgroundColor: const Color(0xFFF4F6F5),
            body: SafeArea(
              child: Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: SingleChildScrollView(
                    controller: _controller.scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        AppPageHeader(
                          title: _controller.isEditMode
                              ? 'Edit patient profile'
                              : 'Patient profile',
                          subtitle: _controller.isEditMode
                              ? 'Update the saved Form 1 details for this patient.'
                              : 'Add yourself or a dependent.',
                          onBack: _handleBack,
                        ),
                        const SizedBox(height: 16),
                        if (policy == null && _controller.loadingConfig)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 48),
                            child: Center(
                              child: CircularProgressIndicator(),
                            ),
                          )
                        else if (policy == null && _controller.configError != null)
                          _buildConfigErrorState(_controller.configError!)
                        else if (policy != null)
                          _buildConfiguredForm(policy),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildConfigErrorState(String message) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Could not load clinic form settings',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => _controller.loadConfiguration(forceRefresh: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildConfiguredForm(ConfiguredFieldPolicy policy) {
    final steps = _controller.activeSteps;
    final stepIndex = _controller.currentStepIndex;
    final stepId = _controller.currentStepId;

    return Form(
      key: _controller.formKey,
      autovalidateMode: _controller.autoValidateMode,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildStepProgressHeader(steps, stepIndex, stepId),
          const SizedBox(height: 16),
          if (_controller.error case final message?) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                message,
                style: const TextStyle(
                  color: Color(0xFFDC2626),
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],
          if (stepId == ProfileStepId.basicInfo)
            ProfileBasicInfoSection(
              controller: _controller,
              policy: policy,
              onChooseBirthDate: _chooseBirthDate,
            ),
          if (stepId == ProfileStepId.addressAndContact)
            ProfileAddressContactSection(
              controller: _controller,
              policy: policy,
            ),
          if (stepId == ProfileStepId.socioeconomicAndProgram)
            ProfileSocioeconomicProgramSection(
              controller: _controller,
              policy: policy,
            ),
          const SizedBox(height: 16),
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    final isLoading = _controller.isSaving;
    final isFirst = _controller.isFirstStep;
    final isLast = _controller.isLastStep;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (isFirst && !isLast)
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: isLoading ? null : _controller.nextStep,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                textStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Continue'),
                  SizedBox(width: 6),
                  Icon(
                    Icons.arrow_forward_rounded,
                    size: 16,
                    color: Colors.white,
                  ),
                ],
              ),
            ),
          )
        else
          Row(
            children: [
              if (!isFirst) ...[
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton.icon(
                      onPressed: isLoading ? null : _handleBack,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF374151),
                        side: BorderSide(
                          color: Colors.grey.shade300,
                          width: 0.5,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        textStyle: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      icon: const Icon(Icons.arrow_back_rounded, size: 16),
                      label: const Text('Back'),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isLoading
                        ? null
                        : (isLast ? _handleSave : _controller.nextStep),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    child: isLoading
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                isLast
                                    ? (_controller.isEditMode
                                          ? 'Save changes'
                                          : 'Save profile')
                                    : 'Continue',
                              ),
                              const SizedBox(width: 6),
                              Icon(
                                isLast
                                    ? Icons.check_circle_outline_rounded
                                    : Icons.arrow_forward_rounded,
                                size: 16,
                                color: Colors.white,
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ],
          ),
        const SizedBox(height: 10),
        SizedBox(
          height: 42,
          child: TextButton(
            onPressed: isLoading
                ? null
                : () {
                    AppToast.success(context, 'Draft saved successfully.');
                    Navigator.of(context).pop();
                  },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF6B7280),
              textStyle: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
            child: const Text('Save as draft'),
          ),
        ),
      ],
    );
  }

  Widget _buildStepProgressHeader(
    List<ProfileStepId> steps,
    int stepIndex,
    ProfileStepId stepId,
  ) {
    final total = steps.length;
    final stepName = switch (stepId) {
      ProfileStepId.basicInfo => 'Basic info',
      ProfileStepId.addressAndContact => 'Address & contact',
      ProfileStepId.socioeconomicAndProgram => 'Socioeconomic & program',
    };
    final title = 'Step ${stepIndex + 1} of $total — $stepName';
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
