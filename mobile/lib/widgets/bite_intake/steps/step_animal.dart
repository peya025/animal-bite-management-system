import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/app_theme.dart';
import '../../menu/menu_surface.dart';
import '../helpers/intake_ui_helpers.dart';

/// Step 3: Animal details (species, ownership, observation availability, condition).
class StepAnimal extends StatelessWidget {
  const StepAnimal({
    super.key,
    required this.animalType,
    required this.onAnimalTypeChanged,
    required this.animalStatus,
    required this.onAnimalStatusChanged,
    required this.animalOwnershipOptions,
    required this.animalAvailable,
    required this.onAnimalAvailableChanged,
    required this.animalConditionReported,
    required this.onAnimalConditionChanged,
    required this.animalConditionOptions,
    required this.isSubmitting,
  });

  final String animalType;
  final ValueChanged<String> onAnimalTypeChanged;
  final String? animalStatus;
  final ValueChanged<String?> onAnimalStatusChanged;
  final Map<String, String> animalOwnershipOptions;
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
    Widget? customIcon,
  }) {
    final selected = animalType == value;
    return Expanded(
      child: InkWell(
        onTap: isSubmitting ? null : () => onAnimalTypeChanged(value),
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
              customIcon ??
                  Icon(
                    icon,
                    size: 22,
                    color: selected
                        ? AppColors.primary
                        : const Color(0xFF6B7280),
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

          const IntakeFieldLabel('Type of animal *'),
          Row(
            children: [
              _animalTypeChip('dog', 'Dog', icon: LucideIcons.dog),
              const SizedBox(width: 8),
              _animalTypeChip('cat', 'Cat', icon: LucideIcons.cat),
            ],
          ),
          const SizedBox(height: 16),

          const IntakeFieldLabel('Animal ownership *'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: animalStatus,
            hint: const Text('Select ownership'),
            items: animalOwnershipOptions.entries
                .map(
                  (e) => DropdownMenuItem(
                    value: e.key,
                    child: Text(e.value, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
            onChanged: isSubmitting ? null : onAnimalStatusChanged,
            validator: (v) => v == null ? 'Animal ownership is required' : null,
          ),
          const SizedBox(height: 14),

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
