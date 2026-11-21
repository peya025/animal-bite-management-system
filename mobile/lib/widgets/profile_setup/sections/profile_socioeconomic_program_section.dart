import 'package:flutter/material.dart';

import '../../../app/app_theme.dart';
import '../../../controllers/profile_setup_controller.dart';
import '../../../utils/configured_field_policy.dart';
import 'profile_form_controls.dart';

class ProfileSocioeconomicProgramSection extends StatelessWidget {
  const ProfileSocioeconomicProgramSection({
    super.key,
    required this.controller,
    required this.policy,
  });

  final ProfileSetupController controller;
  final ConfiguredFieldPolicy policy;

  @override
  Widget build(BuildContext context) {
    final disabled = controller.isSaving;
    final showEducation = policy.isProfileFieldVisible(
      'educational_attainment',
    );
    final showEmployment = policy.isProfileFieldVisible('employment_status');
    final showFamilyMember = policy.isProfileFieldVisible('family_member');

    final showPhilhealthMember = policy.isProfileFieldVisible(
      'philhealth_member',
    );
    final showPhilhealthStatus = policy.isProfileFieldVisible(
      'philhealth_status',
      philhealthMember: controller.philhealthMember,
    );
    final showPhilhealthNo = policy.isProfileFieldVisible(
      'philhealth_no',
      philhealthMember: controller.philhealthMember,
    );
    final showPhilhealthCategory = policy.isProfileFieldVisible(
      'philhealth_category',
      philhealthMember: controller.philhealthMember,
    );
    final showFourpsMember = policy.isProfileFieldVisible('fourps_member');
    final showDswdNhts = policy.isProfileFieldVisible('dswd_nhts');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (policy.isSocioeconomicCardVisible)
          profileSectionCard(
            icon: Icons.school_outlined,
            title: 'Socioeconomic information',
            children: [
              if (showEducation)
                profileDropdownField<String>(
                  label: 'Educational attainment',
                  selectedValue: controller.educationalAttainment,
                  hint: 'Select education level',
                  isDisabled: disabled,
                  required: policy.isProfileFieldRequired(
                    'educational_attainment',
                  ),
                  allowClear: true,
                  items: const [
                    DropdownMenuItem(
                      value: 'Elementary',
                      child: Text('Elementary'),
                    ),
                    DropdownMenuItem(
                      value: 'High School',
                      child: Text('High School'),
                    ),
                    DropdownMenuItem(value: 'College', child: Text('College')),
                    DropdownMenuItem(
                      value: 'Postgraduate',
                      child: Text('Postgraduate'),
                    ),
                    DropdownMenuItem(value: 'None', child: Text('None')),
                  ],
                  onChanged: (val) => controller.updateState(
                    () => controller.educationalAttainment = val,
                  ),
                ),
              if (showEmployment)
                profileDropdownField<String>(
                  label: 'Employment status',
                  selectedValue: controller.employmentStatus,
                  hint: 'Select employment status',
                  isDisabled: disabled,
                  required: policy.isProfileFieldRequired('employment_status'),
                  allowClear: true,
                  items: const [
                    DropdownMenuItem(
                      value: 'Employed',
                      child: Text('Employed'),
                    ),
                    DropdownMenuItem(
                      value: 'Unemployed',
                      child: Text('Unemployed'),
                    ),
                    DropdownMenuItem(value: 'Student', child: Text('Student')),
                    DropdownMenuItem(value: 'Retired', child: Text('Retired')),
                  ],
                  onChanged: (val) => controller.updateState(
                    () => controller.employmentStatus = val,
                  ),
                ),
              if (showFamilyMember)
                profileDropdownField<String>(
                  label: 'Family member position',
                  selectedValue: controller.familyMember,
                  hint: 'Select position',
                  isDisabled: disabled,
                  required: policy.isProfileFieldRequired('family_member'),
                  allowClear: true,
                  items: const [
                    DropdownMenuItem(
                      value: 'Head',
                      child: Text('Head of family'),
                    ),
                    DropdownMenuItem(value: 'Member', child: Text('Member')),
                  ],
                  onChanged: (val) => controller.updateState(
                    () => controller.familyMember = val,
                  ),
                ),
            ],
          ),
        if (policy.isGovProgramsCardVisible)
          profileSectionCard(
            icon: Icons.card_membership_outlined,
            title: 'Government program / membership',
            children: [
              profileChipSelector<String>(
                label: 'Any government program or other membership?',
                selectedValue: controller.hasMembership,
                isDisabled: disabled,
                required: policy.hasAnyRequiredGovProgramToggle,
                options: const [
                  MapEntry('yes', 'Yes'),
                  MapEntry('no', 'No'),
                ],
                onSelected: (val) =>
                    controller.updateState(() => controller.hasMembership = val),
              ),
              if (controller.hasMembership == 'yes') ...[
                if (showPhilhealthMember) ...[
                  profileChipSelector<String>(
                    label: 'PhilHealth member?',
                    selectedValue: controller.philhealthMember,
                    isDisabled: disabled,
                    required: policy.isProfileFieldRequired(
                      'philhealth_member',
                    ),
                    options: const [
                      MapEntry('yes', 'Yes'),
                      MapEntry('no', 'No'),
                    ],
                    onSelected: (val) => controller.updateState(
                      () => controller.philhealthMember = val,
                    ),
                  ),
                  if (controller.philhealthMember == 'yes') ...[
                    if (showPhilhealthStatus)
                      profileDropdownField<String>(
                        label: 'PhilHealth status',
                        selectedValue: controller.philhealthStatus,
                        hint: 'Select status type',
                        isDisabled: disabled,
                        required: policy.isProfileFieldRequired(
                          'philhealth_status',
                          philhealthMember: controller.philhealthMember,
                        ),
                        allowClear: true,
                        items: const [
                          DropdownMenuItem(
                            value: 'member',
                            child: Text('Member'),
                          ),
                          DropdownMenuItem(
                            value: 'dependent',
                            child: Text('Dependent'),
                          ),
                        ],
                        onChanged: (val) => controller.updateState(
                          () => controller.philhealthStatus = val,
                        ),
                      ),
                    if (showPhilhealthNo)
                      profileInputField(
                        'PhilHealth ID number',
                        controller.philhealthNo,
                        hint: 'XX-XXXXXXXXX-X',
                        isDisabled: disabled,
                        philhealth: true,
                        isPhilhealthMember: controller.philhealthMember == 'yes',
                        required: policy.isProfileFieldRequired(
                          'philhealth_no',
                          philhealthMember: controller.philhealthMember,
                        ),
                      ),
                    if (showPhilhealthCategory)
                      profileDropdownField<String>(
                        label: 'PhilHealth category',
                        selectedValue: controller.philhealthCategory,
                        hint: 'Select category',
                        isDisabled: disabled,
                        required: policy.isProfileFieldRequired(
                          'philhealth_category',
                          philhealthMember: controller.philhealthMember,
                        ),
                        allowClear: true,
                        items: const [
                          DropdownMenuItem(
                            value: 'fe_private',
                            child: Text('FE – Private'),
                          ),
                          DropdownMenuItem(
                            value: 'fe_government',
                            child: Text('FE – Government'),
                          ),
                          DropdownMenuItem(value: 'ie', child: Text('IE')),
                          DropdownMenuItem(
                            value: 'others',
                            child: Text('Others'),
                          ),
                        ],
                        onChanged: (val) => controller.updateState(
                          () => controller.philhealthCategory = val,
                        ),
                      ),
                  ],
                ],
                if (showFourpsMember) ...[
                  profileChipSelector<String>(
                    label: '4Ps member?',
                    selectedValue: controller.fourpsMember,
                    isDisabled: disabled,
                    required: policy.isProfileFieldRequired('fourps_member'),
                    options: const [
                      MapEntry('yes', 'Yes'),
                      MapEntry('no', 'No'),
                    ],
                    onSelected: (val) => controller.updateState(
                      () => controller.fourpsMember = val,
                    ),
                  ),
                  if (controller.fourpsMember == 'yes') ...[
                    profileDropdownField<String>(
                      label: '4Ps membership category',
                      selectedValue: controller.fourpsCategory,
                      hint: 'Select category (optional)',
                      isDisabled: disabled,
                      allowClear: true,
                      items: const [
                        DropdownMenuItem(
                          value: 'Beneficiary',
                          child: Text('Beneficiary'),
                        ),
                        DropdownMenuItem(
                          value: 'Member of Beneficiary',
                          child: Text('Member of Beneficiary'),
                        ),
                      ],
                      onChanged: (val) => controller.updateState(() {
                        controller.fourpsCategory = val;
                        if (val != 'Member of Beneficiary') {
                          controller.fourpsRelationship = null;
                          controller.registeredFourpsBeneficiary = null;
                        }
                      }),
                    ),
                    if (controller.fourpsCategory == 'Member of Beneficiary') ...[
                      profileDropdownField<String>(
                        label: 'Registered 4Ps beneficiary',
                        selectedValue: controller.registeredFourpsBeneficiary,
                        hint: 'Select (optional)',
                        isDisabled: disabled,
                        allowClear: true,
                        items: const [
                          DropdownMenuItem(
                            value: 'Mother',
                            child: Text('Mother'),
                          ),
                          DropdownMenuItem(
                            value: 'Father',
                            child: Text('Father'),
                          ),
                        ],
                        onChanged: (val) => controller.updateState(
                          () => controller.registeredFourpsBeneficiary = val,
                        ),
                      ),
                      profileDropdownField<String>(
                        label: 'Relationship to beneficiary',
                        selectedValue: controller.fourpsRelationship,
                        hint: 'Select (optional)',
                        isDisabled: disabled,
                        allowClear: true,
                        items: const [
                          DropdownMenuItem(
                            value: 'Daughter',
                            child: Text('Daughter'),
                          ),
                          DropdownMenuItem(value: 'Son', child: Text('Son')),
                        ],
                        onChanged: (val) => controller.updateState(
                          () => controller.fourpsRelationship = val,
                        ),
                      ),
                    ],
                  ],
                ],
                if (showDswdNhts)
                  profileChipSelector<String>(
                    label: 'DSWD NHTS?',
                    selectedValue: controller.dswdNhts,
                    isDisabled: disabled,
                    required: policy.isProfileFieldRequired('dswd_nhts'),
                    options: const [
                      MapEntry('yes', 'Yes'),
                      MapEntry('no', 'No'),
                    ],
                    onSelected: (val) =>
                        controller.updateState(() => controller.dswdNhts = val),
                  ),
                const SizedBox(height: 6),
                profileSentenceLabel('Other memberships'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _membershipChip('senior_citizen', 'Senior Citizen'),
                    _membershipChip('pwd', 'PWD'),
                    _membershipChip('indigenous_member', 'Indigenous Member'),
                    _membershipChip('others', 'Others'),
                  ],
                ),
                if (controller.otherMemberships.contains('senior_citizen'))
                  profileInputField(
                    'Senior Citizen ID no.',
                    controller.seniorCitizenId,
                    hint: 'ID number',
                    isDisabled: disabled,
                  ),
                if (controller.otherMemberships.contains('pwd'))
                  profileInputField(
                    'PWD ID no.',
                    controller.pwdId,
                    hint: 'ID number',
                    isDisabled: disabled,
                  ),
                if (controller.otherMemberships.contains('indigenous_member'))
                  profileInputField(
                    'Tribe / Ethnicity',
                    controller.indigenousTribe,
                    hint: 'Specify tribe',
                    isDisabled: disabled,
                  ),
                if (controller.otherMemberships.contains('others')) ...[
                  profileInputField(
                    'Membership name',
                    controller.otherMembershipCustomName,
                    hint: 'Name of program',
                    isDisabled: disabled,
                  ),
                  profileInputField(
                    'Membership ID / Certificate no.',
                    controller.otherMembershipCustomId,
                    hint: 'ID number',
                    isDisabled: disabled,
                  ),
                ],
              ],
            ],
          ),
      ],
    );
  }

  Widget _membershipChip(String key, String label) {
    final selected = controller.otherMemberships.contains(key);
    return FilterChip(
      label: Text(label),
      selected: selected,
      selectedColor: const Color(0xFFE1F5EE),
      backgroundColor: Colors.white,
      side: BorderSide(
        color: selected ? AppColors.primary : Colors.grey.shade300,
        width: selected ? 1.5 : 0.5,
      ),
      labelStyle: TextStyle(
        color: selected ? const Color(0xFF085041) : const Color(0xFF374151),
        fontSize: 12,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
      ),
      onSelected: controller.isSaving
          ? null
          : (value) => controller.toggleOtherMembership(key, value),
    );
  }
}
