// ignore_for_file: deprecated_member_use
import 'package:flutter/material.dart';

import '../../../app/app_theme.dart';
import '../../../services/psgc_service.dart';
import '../../menu/menu_surface.dart';
import '../constants/referral_locations.dart';
import '../helpers/intake_ui_helpers.dart';
import '../helpers/vitals_helper.dart';

/// Step 2: Incident details, location, narrative, and optional facility referral with vitals.
class StepIncident extends StatelessWidget {
  const StepIncident({
    super.key,
    required this.biteDateController,
    required this.onChooseBiteDate,
    required this.incidentTime,
    required this.onChooseIncidentTime,
    required this.purokController,
    required this.municipalities,
    required this.barangays,
    required this.selectedMunicipalityCode,
    required this.selectedBarangayCode,
    required this.loadingMunicipalities,
    required this.loadingBarangays,
    required this.onMunicipalityChanged,
    required this.onBarangayChanged,
    required this.exposureType,
    required this.onExposureTypeChanged,
    required this.exposureModes,
    required this.bodyPartGroup,
    required this.onBodyPartGroupChanged,
    required this.bodyPartGroups,
    required this.bodyPartDetailController,
    required this.laterality,
    required this.onLateralityChanged,
    required this.lateralityOptions,
    required this.descriptionController,
    required this.isReferred,
    required this.onReferredChanged,
    required this.referralMunicipalityCode,
    required this.onReferralMunicipalityChanged,
    required this.referralBarangayName,
    required this.onReferralBarangayChanged,
    required this.referralFacilityController,
    required this.referralPhotoName,
    required this.onAttachPhoto,
    required this.onRemovePhoto,
    required this.referralSystolicController,
    required this.referralDiastolicController,
    required this.referralTemperatureController,
    required this.referralHeightController,
    required this.referralWeightController,
    required this.referralProviderController,
    required this.isSubmitting,
  });

  final TextEditingController biteDateController;
  final VoidCallback onChooseBiteDate;
  final TimeOfDay? incidentTime;
  final VoidCallback onChooseIncidentTime;
  final TextEditingController purokController;
  final List<PsgcLocation> municipalities;
  final List<PsgcLocation> barangays;
  final String? selectedMunicipalityCode;
  final String? selectedBarangayCode;
  final bool loadingMunicipalities;
  final bool loadingBarangays;
  final ValueChanged<String?> onMunicipalityChanged;
  final ValueChanged<String?> onBarangayChanged;
  final String? exposureType;
  final ValueChanged<String?> onExposureTypeChanged;
  final Map<String, String> exposureModes;
  final String? bodyPartGroup;
  final ValueChanged<String?> onBodyPartGroupChanged;
  final Map<String, String> bodyPartGroups;
  final TextEditingController bodyPartDetailController;
  final String? laterality;
  final ValueChanged<String?> onLateralityChanged;
  final Map<String, String> lateralityOptions;
  final TextEditingController descriptionController;
  final bool isReferred;
  final ValueChanged<bool> onReferredChanged;
  final String? referralMunicipalityCode;
  final ValueChanged<String?> onReferralMunicipalityChanged;
  final String? referralBarangayName;
  final ValueChanged<String?> onReferralBarangayChanged;
  final TextEditingController referralFacilityController;
  final String? referralPhotoName;
  final VoidCallback onAttachPhoto;
  final VoidCallback onRemovePhoto;
  final TextEditingController referralSystolicController;
  final TextEditingController referralDiastolicController;
  final TextEditingController referralTemperatureController;
  final TextEditingController referralHeightController;
  final TextEditingController referralWeightController;
  final TextEditingController referralProviderController;
  final bool isSubmitting;

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const IntakeSectionHeader(
            icon: Icons.event_outlined,
            title: 'Incident details',
          ),
          const SizedBox(height: 4),
          const Text(
            'Provide factual information regarding when, where, and how the exposure happened.',
            style: TextStyle(fontSize: 12, color: AppColors.gray600),
          ),
          const SizedBox(height: 14),

          // Date of incident
          const IntakeFieldLabel('Date of incident *'),
          TextFormField(
            controller: biteDateController,
            readOnly: true,
            onTap: isSubmitting ? null : onChooseBiteDate,
            decoration: InputDecoration(
              suffixIcon: IconButton(
                tooltip: 'Choose incident date',
                onPressed: isSubmitting ? null : onChooseBiteDate,
                icon: const Icon(Icons.event_outlined),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Time of incident
          const IntakeFieldLabel('Approximate time of incident'),
          InkWell(
            onTap: isSubmitting ? null : onChooseIncidentTime,
            child: InputDecorator(
              decoration: const InputDecoration(
                suffixIcon: Icon(Icons.schedule_outlined),
              ),
              child: Text(
                incidentTime?.format(context) ?? 'Select time (optional)',
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Place of incident (PSGC)
          const IntakeFieldLabel('Place of incident'),
          const SizedBox(height: 4),

          // Municipality
          const IntakeFieldLabel('Municipality *'),
          municipalities.isEmpty && !loadingMunicipalities
              ? TextFormField(
                  controller: purokController,
                  enabled: !isSubmitting,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Barangay 5, Tagoloan',
                  ),
                  textCapitalization: TextCapitalization.words,
                )
              : DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: selectedMunicipalityCode,
                  hint: Text(
                    loadingMunicipalities
                        ? 'Loading municipalities...'
                        : 'Select municipality',
                  ),
                  items: municipalities
                      .map(
                        (m) => DropdownMenuItem(
                          value: m.code,
                          child: Text(
                            m.name,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: isSubmitting || loadingMunicipalities
                      ? null
                      : onMunicipalityChanged,
                ),
          const SizedBox(height: 10),

          // Barangay
          if (municipalities.isNotEmpty) ...[
            const IntakeFieldLabel('Barangay'),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: selectedBarangayCode,
              hint: Text(
                loadingBarangays
                    ? 'Loading barangays...'
                    : selectedMunicipalityCode == null
                        ? 'Select municipality first'
                        : 'Select barangay',
              ),
              items: barangays
                  .map(
                    (b) => DropdownMenuItem(
                      value: b.code,
                      child: Text(
                        b.name,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: isSubmitting ||
                      loadingBarangays ||
                      selectedMunicipalityCode == null
                  ? null
                  : onBarangayChanged,
            ),
            const SizedBox(height: 10),
          ],

          // Purok / street
          const IntakeFieldLabel('Purok / Zone / Street'),
          TextFormField(
            controller: purokController,
            enabled: !isSubmitting,
            decoration: const InputDecoration(
              hintText: 'e.g. Purok 3, Rizal St.',
            ),
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 16),

          // Mode of exposure
          const IntakeFieldLabel('Mode of exposure *'),
          ...exposureModes.entries.map(
            (opt) => RadioListTile<String>(
              value: opt.key,
              groupValue: exposureType,
              title: Text(
                opt.value,
                style: const TextStyle(fontSize: 13),
              ),
              contentPadding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
              activeColor: AppColors.primary,
              onChanged: isSubmitting ? null : onExposureTypeChanged,
            ),
          ),
          const SizedBox(height: 16),

          // Body-part group
          const IntakeFieldLabel('Body-part group *'),
          ...bodyPartGroups.entries.map(
            (opt) => RadioListTile<String>(
              value: opt.key,
              groupValue: bodyPartGroup,
              title: Text(
                opt.value,
                style: const TextStyle(fontSize: 13),
              ),
              contentPadding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
              activeColor: AppColors.primary,
              onChanged: isSubmitting ? null : onBodyPartGroupChanged,
            ),
          ),
          const SizedBox(height: 16),

          // Specific body part
          const IntakeFieldLabel('Specific body part or wound location'),
          TextFormField(
            controller: bodyPartDetailController,
            enabled: !isSubmitting,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'e.g. palm, index finger, lower leg',
            ),
          ),
          const SizedBox(height: 16),

          // Laterality
          const IntakeFieldLabel('Side of body'),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: laterality,
            hint: const Text('Select side'),
            items: lateralityOptions.entries
                .map(
                  (e) => DropdownMenuItem(
                    value: e.key,
                    child: Text(
                      e.value,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                )
                .toList(),
            onChanged: isSubmitting ? null : onLateralityChanged,
          ),
          const SizedBox(height: 18),

          const IntakeFieldLabel('Patient description of the incident'),
          TextFormField(
            controller: descriptionController,
            enabled: !isSubmitting,
            minLines: 3,
            maxLines: 5,
            maxLength: 2000,
            decoration: const InputDecoration(
              hintText: 'Describe what happened and any visible signs.',
            ),
          ),
          const SizedBox(height: 18),

          // Referral section
          const IntakeSectionHeader(
            icon: Icons.local_hospital_outlined,
            title: 'Facility referral & pre-arrival vitals',
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Referred from another facility?',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Barangay Health Station (BHS), RHU, or clinic',
                        style: TextStyle(fontSize: 12, color: AppColors.gray600),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: isReferred,
                  activeColor: AppColors.primary,
                  onChanged: isSubmitting ? null : onReferredChanged,
                ),
              ],
            ),
          ),

          if (isReferred) ...[
            const SizedBox(height: 14),
            // 3-tier Referral Location
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Referred by Location',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // 1. City / Municipality
                  const IntakeFieldLabel('1. City / Municipality *'),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: referralMunicipalityCode,
                    hint: const Text('— Select Municipality —'),
                    items: referralMunicipalities
                        .map(
                          (m) => DropdownMenuItem(
                            value: m['code'],
                            child: Text(m['name']!),
                          ),
                        )
                        .toList(),
                    onChanged: isSubmitting ? null : onReferralMunicipalityChanged,
                  ),
                  const SizedBox(height: 12),

                  // 2. Barangay
                  const IntakeFieldLabel('2. Barangay'),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: referralBarangayName,
                    hint: Text(
                      referralMunicipalityCode == null
                          ? '— Select Municipality First —'
                          : (referralMunicipalityCode == 'other'
                              ? 'Outside Misamis Oriental'
                              : '— Select Barangay —'),
                    ),
                    items: (referralMunicipalityCode != null &&
                            referralBarangaysMap.containsKey(referralMunicipalityCode))
                        ? referralBarangaysMap[referralMunicipalityCode]!
                            .map(
                              (b) => DropdownMenuItem(
                                value: b,
                                child: Text(b),
                              ),
                            )
                            .toList()
                        : const [],
                    onChanged: (isSubmitting ||
                            referralMunicipalityCode == null ||
                            referralMunicipalityCode == 'other')
                        ? null
                        : onReferralBarangayChanged,
                  ),
                  const SizedBox(height: 12),

                  // 3. Health Center / Facility Name
                  const IntakeFieldLabel('3. Health Center / Facility Name *'),
                  TextFormField(
                    controller: referralFacilityController,
                    enabled: !isSubmitting,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Barangay Kimalok Health Station (BHS)',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Referral Slip Photo
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Referral Slip Photo (Optional)',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Attach photo of the paper referral form received from the health station.',
                    style: TextStyle(fontSize: 11.5, color: AppColors.gray600),
                  ),
                  const SizedBox(height: 10),

                  if (referralPhotoName != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_rounded,
                            color: Color(0xFF059669),
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              referralPhotoName!,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF065F46),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.close_rounded,
                              size: 18,
                              color: Color(0xFF991B1B),
                            ),
                            onPressed: isSubmitting ? null : onRemovePhoto,
                            tooltip: 'Remove photo',
                            visualDensity: VisualDensity.compact,
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    OutlinedButton.icon(
                      icon: const Icon(Icons.camera_alt_outlined, size: 18),
                      label: const Text('Attach referral paper form photo'),
                      onPressed: isSubmitting ? null : onAttachPhoto,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Pre-arrival Vitals from Referral Form
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.monitor_heart_outlined,
                        color: AppColors.primary,
                        size: 18,
                      ),
                      const SizedBox(width: 6),
                      const Expanded(
                        child: Text(
                          'Pre-Arrival Vitals from Referral Form',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Optional — doctor will re-check and confirm these onsite.',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: AppColors.gray600,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Blood Pressure (mmHg)
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      const IntakeFieldLabel('Blood Pressure (mmHg)'),
                      ListenableBuilder(
                        listenable: Listenable.merge([
                          referralSystolicController,
                          referralDiastolicController,
                        ]),
                        builder: (context, _) => BpStatusBadge(
                          systolicText: referralSystolicController.text,
                          diastolicText: referralDiastolicController.text,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: referralSystolicController,
                          enabled: !isSubmitting,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            hintText: '120',
                            labelText: 'Systolic',
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          '/',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF9CA3AF),
                          ),
                        ),
                      ),
                      Expanded(
                        child: TextFormField(
                          controller: referralDiastolicController,
                          enabled: !isSubmitting,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            hintText: '80',
                            labelText: 'Diastolic',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Temperature (°C)
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      const IntakeFieldLabel('Temperature (°C)'),
                      ListenableBuilder(
                        listenable: referralTemperatureController,
                        builder: (context, _) => TempStatusBadge(
                          temperatureText: referralTemperatureController.text,
                        ),
                      ),
                    ],
                  ),
                  TextFormField(
                    controller: referralTemperatureController,
                    enabled: !isSubmitting,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      hintText: 'e.g. 36.5',
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Height & Weight side by side
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const IntakeFieldLabel('Height (cm)'),
                            TextFormField(
                              controller: referralHeightController,
                              enabled: !isSubmitting,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(hintText: 'e.g. 150'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const IntakeFieldLabel('Weight (kg)'),
                            TextFormField(
                              controller: referralWeightController,
                              enabled: !isSubmitting,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(hintText: 'e.g. 50'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Attending Provider Name
                  const IntakeFieldLabel('Name of Attending Provider'),
                  TextFormField(
                    controller: referralProviderController,
                    enabled: !isSubmitting,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Triage Doctor from referral paper form',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
