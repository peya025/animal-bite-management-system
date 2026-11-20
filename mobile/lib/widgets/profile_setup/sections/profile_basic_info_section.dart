import 'package:flutter/material.dart';

import '../../../controllers/profile_setup_controller.dart';
import '../../../utils/app_validators.dart';
import '../../../utils/configured_field_policy.dart';
import 'profile_form_controls.dart';

class ProfileBasicInfoSection extends StatelessWidget {
  const ProfileBasicInfoSection({
    super.key,
    required this.controller,
    required this.policy,
    required this.onChooseBirthDate,
  });

  final ProfileSetupController controller;
  final ConfiguredFieldPolicy policy;
  final VoidCallback onChooseBirthDate;

  @override
  Widget build(BuildContext context) {
    final disabled = controller.isSaving;
    final showBloodType = policy.isProfileFieldVisible('blood_type');
    final showMotherMaiden = policy.isProfileFieldVisible('mother_maiden_name');
    final showCivilStatus = policy.isProfileFieldVisible('civil_status');
    final showSpouse = policy.isProfileFieldVisible(
      'spouse_name',
      civilStatus: controller.civilStatus,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        profileSectionCard(
          icon: Icons.people_outline_rounded,
          title: 'Relationship',
          children: [
            profileChipSelector<String>(
              label: 'Who is this profile for?',
              selectedValue: controller.relationship,
              isDisabled: disabled,
              required: true,
              options: const [
                MapEntry('self', 'Myself'),
                MapEntry('child', 'My child'),
                MapEntry('dependent', 'Dependent'),
              ],
              onSelected: controller.setRelationship,
            ),
          ],
        ),
        profileSectionCard(
          icon: Icons.person_outline_rounded,
          title: 'Personal information',
          children: [
            Row(
              children: [
                Expanded(
                  child: profileInputField(
                    'First name',
                    controller.firstName,
                    hint: 'e.g. Juan',
                    isDisabled: disabled,
                    required: true,
                    validator: (v) =>
                        AppValidators.name(v, 'First name', required: true),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: profileInputField(
                    'Last name',
                    controller.lastName,
                    hint: 'e.g. Dela Cruz',
                    isDisabled: disabled,
                    required: true,
                    validator: (v) =>
                        AppValidators.name(v, 'Last name', required: true),
                  ),
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: profileInputField(
                    'Middle name',
                    controller.middleName,
                    hint: 'Optional',
                    isDisabled: disabled,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: profileInputField(
                    'Suffix',
                    controller.suffix,
                    hint: 'Jr., Sr.',
                    isDisabled: disabled,
                  ),
                ),
              ],
            ),
            profileChipSelector<String>(
              label: 'Gender',
              selectedValue: controller.gender,
              isDisabled: disabled,
              required: true,
              validator: (v) =>
                  (controller.gender == null || controller.gender!.isEmpty)
                  ? 'Please select a gender.'
                  : null,
              options: const [
                MapEntry('male', 'Male'),
                MapEntry('female', 'Female'),
              ],
              onSelected: (value) =>
                  controller.updateState(() => controller.gender = value),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: profileInputField(
                    'Date of birth',
                    controller.birthDate,
                    hint: 'MM / DD / YYYY',
                    isDisabled: disabled,
                    readOnly: true,
                    onTap: onChooseBirthDate,
                    validator: (v) => AppValidators.dateOfBirth(
                      controller.selectedBirthDate,
                      required: false,
                    ),
                    suffixIcon: IconButton(
                      onPressed: onChooseBirthDate,
                      icon: const Icon(
                        Icons.calendar_today_outlined,
                        size: 16,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ),
                ),
                if (showBloodType) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: profileDropdownField<String>(
                      label: 'Blood type',
                      selectedValue: controller.bloodType,
                      hint: 'Select',
                      isDisabled: disabled,
                      required: policy.isProfileFieldRequired('blood_type'),
                      allowClear: true,
                      items: const [
                        DropdownMenuItem(value: 'A+', child: Text('A+')),
                        DropdownMenuItem(value: 'A-', child: Text('A-')),
                        DropdownMenuItem(value: 'B+', child: Text('B+')),
                        DropdownMenuItem(value: 'B-', child: Text('B-')),
                        DropdownMenuItem(value: 'AB+', child: Text('AB+')),
                        DropdownMenuItem(value: 'AB-', child: Text('AB-')),
                        DropdownMenuItem(value: 'O+', child: Text('O+')),
                        DropdownMenuItem(value: 'O-', child: Text('O-')),
                      ],
                      onChanged: (val) =>
                          controller.updateState(() => controller.bloodType = val),
                    ),
                  ),
                ],
              ],
            ),
            if (showCivilStatus)
              profileDropdownField<String>(
                label: 'Civil status',
                selectedValue: controller.civilStatus,
                hint: 'Select status',
                isDisabled: disabled,
                required: policy.isProfileFieldRequired('civil_status'),
                allowClear: true,
                items: const [
                  DropdownMenuItem(value: 'single', child: Text('Single')),
                  DropdownMenuItem(value: 'married', child: Text('Married')),
                  DropdownMenuItem(value: 'widowed', child: Text('Widowed')),
                  DropdownMenuItem(
                    value: 'separated',
                    child: Text('Separated'),
                  ),
                  DropdownMenuItem(value: 'annulled', child: Text('Annulled')),
                  DropdownMenuItem(
                    value: 'cohabitation',
                    child: Text('Co-Habitation'),
                  ),
                ],
                onChanged: (val) =>
                    controller.updateState(() => controller.civilStatus = val),
              ),
            if (showSpouse)
              profileInputField(
                'Spouse\'s name',
                controller.spouseName,
                hint: 'Full name',
                isDisabled: disabled,
                required: policy.isProfileFieldRequired(
                  'spouse_name',
                  civilStatus: controller.civilStatus,
                ),
              ),
            if (showMotherMaiden)
              profileInputField(
                'Mother\'s maiden name',
                controller.motherMaidenName,
                hint: 'Full name',
                isDisabled: disabled,
                required: policy.isProfileFieldRequired('mother_maiden_name'),
              ),
          ],
        ),
      ],
    );
  }
}
