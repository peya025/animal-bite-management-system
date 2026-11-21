import 'package:flutter/material.dart';

import '../../../controllers/profile_setup_controller.dart';
import '../../../utils/configured_field_policy.dart';
import 'profile_form_controls.dart';

class ProfileAddressContactSection extends StatelessWidget {
  const ProfileAddressContactSection({
    super.key,
    required this.controller,
    required this.policy,
  });

  final ProfileSetupController controller;
  final ConfiguredFieldPolicy policy;

  @override
  Widget build(BuildContext context) {
    final disabled = controller.isSaving;
    final showMunicipality = policy.isProfileFieldVisible(
      'address_municipality',
    );
    final showBarangay = policy.isProfileFieldVisible('address_barangay');
    final showPurok = policy.isProfileFieldVisible('address_purok');
    final showProvince = policy.isProfileFieldVisible('province');

    final provinceLabel = controller.provinceText.text.trim().isNotEmpty
        ? controller.provinceText.text.trim()
        : (controller.locationContext?.province ?? 'Misamis Oriental');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (policy.isAddressCardVisible)
          profileSectionCard(
            icon: Icons.location_on_outlined,
            title: showProvince
                ? 'Residential address — $provinceLabel'
                : 'Residential address',
            children: [
              if (showMunicipality)
                if (controller.useManualAddressFields)
                  profileInputField(
                    'City / Municipality',
                    controller.municipalityText,
                    hint: 'Select municipality',
                    isDisabled: disabled,
                    required: policy.isProfileFieldRequired(
                      'address_municipality',
                    ),
                  )
                else
                  profileDropdownField<String>(
                    label: 'City / Municipality',
                    selectedValue: controller.selectedMunicipalityCode,
                    isDisabled: disabled || controller.loadingMunicipalities,
                    required: policy.isProfileFieldRequired(
                      'address_municipality',
                    ),
                    allowClear: true,
                    hint: controller.loadingMunicipalities
                        ? 'Loading...'
                        : 'Select municipality',
                    items: controller.municipalities
                        .map(
                          (m) => DropdownMenuItem(
                            value: m.code,
                            child: Text(m.name),
                          ),
                        )
                        .toList(),
                    onChanged: controller.setMunicipality,
                  ),
              if (showBarangay)
                if (controller.useManualAddressFields || !showMunicipality)
                  profileInputField(
                    'Barangay',
                    controller.barangayText,
                    hint: 'Select barangay',
                    isDisabled: disabled,
                    required: policy.isProfileFieldRequired('address_barangay'),
                  )
                else
                  profileDropdownField<String>(
                    label: 'Barangay',
                    selectedValue: controller.selectedBarangayCode,
                    isDisabled: disabled || controller.loadingBarangays,
                    required: policy.isProfileFieldRequired('address_barangay'),
                    allowClear: true,
                    hint: controller.loadingBarangays
                        ? 'Loading...'
                        : controller.selectedMunicipalityCode == null
                        ? 'Select municipality first'
                        : 'Select barangay',
                    items: controller.barangays
                        .map(
                          (b) => DropdownMenuItem(
                            value: b.code,
                            child: Text(b.name),
                          ),
                        )
                        .toList(),
                    onChanged: controller.setBarangay,
                  ),
              if (showPurok)
                profileInputField(
                  'Purok / Zone / Street',
                  controller.purok,
                  hint: 'e.g. Purok 4, Limketkai Drive',
                  isDisabled: disabled,
                  required: policy.isProfileFieldRequired('address_purok'),
                ),
              if (showProvince)
                profileInputField(
                  'Province',
                  controller.provinceText,
                  hint: 'e.g. Misamis Oriental',
                  isDisabled: disabled,
                  required: policy.isProfileFieldRequired('province'),
                ),
            ],
          ),
        profileSectionCard(
          icon: Icons.phone_outlined,
          title: 'Contact information',
          children: [
            profileInputField(
              'Contact number',
              controller.contactNumber,
              hint: '9XX XXX XXXX',
              isDisabled: disabled,
              phone: true,
            ),
            profileInputField(
              'Email address',
              controller.email,
              hint: 'you@example.com',
              isDisabled: disabled,
              email: true,
            ),
          ],
        ),
      ],
    );
  }
}
