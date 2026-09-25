import 'package:flutter/material.dart';

import '../../../app/app_theme.dart';
import '../../menu/menu_surface.dart';
import '../helpers/intake_ui_helpers.dart';

/// Step 4: Previous animal-bite history and prior rabies vaccinations.
class StepHistory extends StatelessWidget {
  const StepHistory({
    super.key,
    required this.pastBiteHistory,
    required this.onPastBiteHistoryChanged,
    required this.pastBiteHistoryOptions,
    required this.pastBiteDatesController,
    required this.priorPepStatus,
    required this.onPriorPepStatusChanged,
    required this.priorPepStatusOptions,
    required this.priorVaccinationDate,
    required this.onChoosePriorVaccinationDate,
    required this.priorVaccinationFacilityController,
    required this.isSubmitting,
  });

  final String? pastBiteHistory;
  final ValueChanged<String?> onPastBiteHistoryChanged;
  final Map<String, String> pastBiteHistoryOptions;
  final TextEditingController pastBiteDatesController;
  final String? priorPepStatus;
  final ValueChanged<String?> onPriorPepStatusChanged;
  final Map<String, String> priorPepStatusOptions;
  final DateTime? priorVaccinationDate;
  final VoidCallback onChoosePriorVaccinationDate;
  final TextEditingController priorVaccinationFacilityController;
  final bool isSubmitting;

  String _formatDate(DateTime date) => date.toIso8601String().split('T').first;

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const IntakeSectionHeader(
            icon: Icons.history_rounded,
            title: 'Previous history',
          ),
          const SizedBox(height: 4),
          const Text(
            'Past bite incidents and previous rabies vaccinations. Clinic staff will verify prior records.',
            style: TextStyle(fontSize: 12, color: AppColors.gray600),
          ),
          const SizedBox(height: 16),

          const IntakeFieldLabel('Previous animal-bite history'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: pastBiteHistory,
            hint: const Text('Select answer'),
            items: pastBiteHistoryOptions.entries
                .map(
                  (entry) => DropdownMenuItem(
                    value: entry.key,
                    child: Text(entry.value, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
            onChanged: isSubmitting ? null : onPastBiteHistoryChanged,
          ),
          if (pastBiteHistory == 'yes') ...[
            const SizedBox(height: 14),
            const IntakeFieldLabel('Approximate previous bite date or dates'),
            TextFormField(
              controller: pastBiteDatesController,
              enabled: !isSubmitting,
              decoration: const InputDecoration(
                hintText: 'e.g. June 2024',
              ),
            ),
          ],
          const SizedBox(height: 16),

          const IntakeFieldLabel('Previous PEP / rabies vaccination'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: priorPepStatus,
            hint: const Text('Select status'),
            items: priorPepStatusOptions.entries
                .map(
                  (entry) => DropdownMenuItem(
                    value: entry.key,
                    child: Text(entry.value, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
            onChanged: isSubmitting ? null : onPriorPepStatusChanged,
          ),
          if (priorPepStatus == 'completed' || priorPepStatus == 'incomplete') ...[
            const SizedBox(height: 14),
            const IntakeFieldLabel('Approximate date of previous PEP'),
            InkWell(
              onTap: isSubmitting ? null : onChoosePriorVaccinationDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  suffixIcon: Icon(Icons.event_outlined),
                ),
                child: Text(
                  priorVaccinationDate == null
                      ? 'Select date (optional)'
                      : _formatDate(priorVaccinationDate!),
                ),
              ),
            ),
            const SizedBox(height: 14),
            const IntakeFieldLabel('Previous PEP facility'),
            TextFormField(
              controller: priorVaccinationFacilityController,
              enabled: !isSubmitting,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                hintText: 'e.g. Tagoloan RHU, NMMC, etc.',
              ),
            ),
          ],
        ],
      ),
    );
  }
}
