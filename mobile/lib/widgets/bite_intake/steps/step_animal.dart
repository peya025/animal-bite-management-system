import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/app_theme.dart';
import '../../../utils/configured_field_policy.dart';
import '../../menu/menu_surface.dart';
import '../helpers/intake_ui_helpers.dart';
import '../helpers/required_intake_group.dart';

/// Step 3: Animal details (species, ownership, capture, observation availability, condition).
class StepAnimal extends StatelessWidget {
  const StepAnimal({
    super.key,
    required this.policy,
    required this.animalType,
    required this.onAnimalTypeChanged,
    required this.animalSpeciesOtherController,
    required this.animalStatus,
    required this.onAnimalStatusChanged,
    required this.animalOwnershipOptions,
    required this.animalCaptured,
    required this.onAnimalCapturedChanged,
    required this.animalAvailable,
    required this.onAnimalAvailableChanged,
    required this.animalConditionReported,
    required this.onAnimalConditionChanged,
    required this.animalConditionOptions,
    required this.isSubmitting,
  });

  final ConfiguredFieldPolicy policy;
  final String? animalType;
  final ValueChanged<String?> onAnimalTypeChanged;
  final TextEditingController animalSpeciesOtherController;
  final String? animalStatus;
  final ValueChanged<String?> onAnimalStatusChanged;
  final Map<String, String> animalOwnershipOptions;
  final bool? animalCaptured;
  final ValueChanged<bool?> onAnimalCapturedChanged;
  final bool? animalAvailable;
  final ValueChanged<bool?> onAnimalAvailableChanged;
  final String? animalConditionReported;
  final ValueChanged<String?> onAnimalConditionChanged;
  final Map<String, String> animalConditionOptions;
  final bool isSubmitting;

  Widget _animalTypeChip(
    String value,
    String label, {
    IconData? icon,
    required bool allowClear,
  }) {
    final selected = animalType == value;
    return Expanded(
      child: InkWell(
        onTap: isSubmitting
            ? null
            : () => onAnimalTypeChanged(
                selected && allowClear ? null : value,
              ),
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFE1F5EE) : const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? AppColors.primary : const Color(0xFFE5E7EB),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 22,
                color: selected ? AppColors.primary : const Color(0xFF6B7280),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? AppColors.primary : const Color(0xFF374151),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showAnimalType = policy.isIntakeFieldVisible('animal_type');
    final reqAnimalType = policy.isIntakeFieldRequired('animal_type');
    final showAnimalStatus = policy.isIntakeFieldVisible('animal_status');
    final reqAnimalStatus = policy.isIntakeFieldRequired('animal_status');
    final showAnimalCaptured = policy.isIntakeFieldVisible('animal_captured');
    final reqAnimalCaptured = policy.isIntakeFieldRequired('animal_captured');

    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const IntakeSectionHeader(
            icon: Icons.pets_rounded,
            title: 'Animal details',
          ),
          const SizedBox(height: 4),
          const Text(
            'Information regarding the animal that caused the exposure.',
            style: TextStyle(fontSize: 12, color: AppColors.gray600),
          ),
          const SizedBox(height: 16),

          if (showAnimalType) ...[
            RequiredIntakeGroup(
              key: const ValueKey('animal-type-validation'),
              valid: !reqAnimalType || (animalType != null && animalType!.isNotEmpty),
              message: 'Please select the type of animal.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  IntakeFieldLabel(
                    reqAnimalType ? 'Type of animal *' : 'Type of animal',
                  ),
                  Row(
                    children: [
                      _animalTypeChip(
                        'dog',
                        'Dog',
                        icon: LucideIcons.dog,
                        allowClear: !reqAnimalType,
                      ),
                      const SizedBox(width: 8),
                      _animalTypeChip(
                        'cat',
                        'Cat',
                        icon: LucideIcons.cat,
                        allowClear: !reqAnimalType,
                      ),
                    ],
                  ),
                  if (animalType == 'other') ...[
                    const SizedBox(height: 12),
                    const IntakeFieldLabel('Specify animal species *'),
                    TextFormField(
                      controller: animalSpeciesOtherController,
                      enabled: !isSubmitting,
                      validator: (v) =>
                          (v == null || v.trim().isEmpty)
                          ? 'Please specify the animal species.'
                          : null,
                      decoration: const InputDecoration(
                        hintText: 'e.g. Bat, Monkey, Rat',
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],

          if (showAnimalStatus) ...[
            IntakeFieldLabel(
              reqAnimalStatus ? 'Animal ownership *' : 'Animal ownership',
            ),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: animalStatus,
              hint: const Text('Select ownership'),
              items: [
                if (!reqAnimalStatus)
                  const DropdownMenuItem<String>(
                    value: null,
                    child: Text('Not specified'),
                  ),
                ...animalOwnershipOptions.entries.map(
                  (e) => DropdownMenuItem(
                    value: e.key,
                    child: Text(e.value, style: const TextStyle(fontSize: 13)),
                  ),
                ),
              ],
              onChanged: isSubmitting ? null : onAnimalStatusChanged,
              validator: (v) => (reqAnimalStatus && v == null)
                  ? 'Animal ownership is required'
                  : null,
            ),
            const SizedBox(height: 14),
          ],

          if (showAnimalCaptured) ...[
            RequiredIntakeGroup(
              key: const ValueKey('animal-captured-validation'),
              valid: !reqAnimalCaptured || animalCaptured != null,
              message: 'Please indicate whether the animal was captured.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  IntakeFieldLabel(
                    reqAnimalCaptured
                        ? 'Was the animal captured or restrained? *'
                        : 'Was the animal captured or restrained?',
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('Yes'),
                        selected: animalCaptured == true,
                        selectedColor: const Color(0xFFE1F5EE),
                        onSelected: isSubmitting
                            ? null
                            : (selected) => onAnimalCapturedChanged(
                                selected
                                    ? true
                                    : (reqAnimalCaptured ? true : null),
                              ),
                      ),
                      ChoiceChip(
                        label: const Text('No'),
                        selected: animalCaptured == false,
                        selectedColor: const Color(0xFFE1F5EE),
                        onSelected: isSubmitting
                            ? null
                            : (selected) => onAnimalCapturedChanged(
                                selected
                                    ? false
                                    : (reqAnimalCaptured ? false : null),
                              ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                ],
              ),
            ),
          ],

          const IntakeFieldLabel('Is the animal available for observation?'),
          DropdownButtonFormField<bool?>(
            isExpanded: true,
            initialValue: animalAvailable,
            items: const [
              DropdownMenuItem(value: true, child: Text('Yes')),
              DropdownMenuItem(value: false, child: Text('No')),
            ],
            hint: const Text('Unsure / not known'),
            onChanged: isSubmitting ? null : onAnimalAvailableChanged,
          ),
          const SizedBox(height: 14),

          const IntakeFieldLabel('Animal condition as observed or reported'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: animalConditionReported,
            hint: const Text('Select condition'),
            items: animalConditionOptions.entries
                .map(
                  (entry) => DropdownMenuItem(
                    value: entry.key,
                    child: Text(
                      entry.value,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                )
                .toList(),
            onChanged: isSubmitting ? null : onAnimalConditionChanged,
          ),
        ],
      ),
    );
  }
}
