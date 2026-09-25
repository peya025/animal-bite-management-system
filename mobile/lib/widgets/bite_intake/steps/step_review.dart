import 'package:flutter/material.dart';

import '../../../models/bite_intake_contract.dart';
import '../../../models/booking_draft.dart';
import '../../../models/patient_profile.dart';
import '../../menu/menu_surface.dart';
import '../helpers/intake_ui_helpers.dart';

/// Step 5: Review and book summary cards with patient-reported disclaimer and inline edit actions.
class StepReview extends StatelessWidget {
  const StepReview({
    super.key,
    required this.patient,
    required this.booking,
    required this.contract,
    required this.selectedBiteDate,
    required this.incidentTimeValue,
    required this.placeOfExposure,
    required this.exposureType,
    required this.bodyPartGroup,
    required this.bodyPartDetail,
    required this.laterality,
    required this.description,
    required this.isReferred,
    required this.referralFacility,
    required this.referralPhotoName,
    required this.bloodPressure,
    required this.temperature,
    required this.height,
    required this.weight,
    required this.providerName,
    required this.animalType,
    required this.animalTypeOthers,
    required this.animalStatus,
    required this.animalAvailable,
    required this.animalConditionReported,
    required this.pastBiteHistory,
    required this.pastBiteDates,
    required this.priorPepStatus,
    required this.priorVaccinationDate,
    required this.priorVaccinationFacility,
    required this.onStepJump,
    required this.isSubmitting,
  });

  final PatientProfile patient;
  final BookingDraft booking;
  final BiteIntakeContract contract;
  final DateTime selectedBiteDate;
  final String? incidentTimeValue;
  final String? placeOfExposure;
  final String? exposureType;
  final String? bodyPartGroup;
  final String? bodyPartDetail;
  final String? laterality;
  final String? description;
  final bool isReferred;
  final String? referralFacility;
  final String? referralPhotoName;
  final String? bloodPressure;
  final String? temperature;
  final String? height;
  final String? weight;
  final String? providerName;
  final String animalType;
  final String? animalTypeOthers;
  final String? animalStatus;
  final bool? animalAvailable;
  final String? animalConditionReported;
  final String? pastBiteHistory;
  final String? pastBiteDates;
  final String? priorPepStatus;
  final DateTime? priorVaccinationDate;
  final String? priorVaccinationFacility;
  final ValueChanged<int> onStepJump;
  final bool isSubmitting;

  String _formatDate(DateTime date) => date.toIso8601String().split('T').first;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Disclaimer Banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Patient-Reported Intake · Verification Required',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF92400E),
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'All details below are patient-reported. Exposure category, physical wound evaluation, and vaccination plan are strictly determined by the clinic physician during your visit.',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFFB45309),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Appointment summary card
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const IntakeSummaryHeader(
                title: 'Appointment details',
                icon: Icons.calendar_today_outlined,
              ),
              const SizedBox(height: 8),
              IntakeReviewRow(label: 'Service', value: booking.service.label),
              IntakeReviewRow(
                label: 'Scheduled date',
                value: _formatDate(booking.date),
              ),
              if (booking.notes != null && booking.notes!.trim().isNotEmpty)
                IntakeReviewRow(
                  label: 'Booking notes',
                  value: booking.notes!.trim(),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 1. Patient summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IntakeSummaryHeader(
                title: '1. Patient',
                icon: Icons.person_outline_rounded,
                editStep: 0,
                onEdit: onStepJump,
                isSubmitting: isSubmitting,
              ),
              const SizedBox(height: 8),
              IntakeReviewRow(label: 'Patient name', value: patient.name),
              IntakeReviewRow(
                label: 'Date of birth',
                value: patient.dateOfBirth ?? '—',
              ),
              IntakeReviewRow(label: 'Sex', value: patient.gender ?? '—'),
              IntakeReviewRow(
                label: 'Contact',
                value: patient.contactNumber ?? '—',
              ),
              IntakeReviewRow(label: 'Address', value: patient.address ?? '—'),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. Incident summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IntakeSummaryHeader(
                title: '2. Incident details',
                icon: Icons.event_outlined,
                editStep: 1,
                onEdit: onStepJump,
                isSubmitting: isSubmitting,
              ),
              const SizedBox(height: 8),
              IntakeReviewRow(
                label: 'Date of incident',
                value: _formatDate(selectedBiteDate),
              ),
              if (incidentTimeValue != null)
                IntakeReviewRow(
                  label: 'Approximate time',
                  value: incidentTimeValue!,
                ),
              IntakeReviewRow(
                label: 'Place of incident',
                value: placeOfExposure ?? '—',
              ),
              IntakeReviewRow(
                label: 'Mode of exposure',
                value: contract.exposureModes[exposureType] ?? exposureType ?? '—',
              ),
              IntakeReviewRow(
                label: 'Body-part group',
                value: contract.bodyPartGroups[bodyPartGroup] ?? bodyPartGroup ?? '—',
              ),
              if (bodyPartDetail != null && bodyPartDetail!.isNotEmpty)
                IntakeReviewRow(
                  label: 'Specific location',
                  value: bodyPartDetail!,
                ),
              if (laterality != null)
                IntakeReviewRow(
                  label: 'Side of body',
                  value: contract.laterality[laterality] ?? laterality!,
                ),
              if (description != null && description!.isNotEmpty)
                IntakeReviewRow(
                  label: 'Description',
                  value: description!,
                ),
              if (isReferred) ...[
                if (referralFacility != null && referralFacility!.isNotEmpty)
                  IntakeReviewRow(
                    label: 'Facility referral',
                    value: referralFacility!,
                  ),
                if (referralPhotoName != null)
                  const IntakeReviewRow(
                    label: 'Referral slip photo',
                    value: 'Attached',
                  ),
                if (bloodPressure != null)
                  IntakeReviewRow(
                    label: 'Pre-arrival BP',
                    value: '$bloodPressure mmHg',
                  ),
                if (temperature != null && temperature!.isNotEmpty)
                  IntakeReviewRow(
                    label: 'Pre-arrival Temp',
                    value: '$temperature °C',
                  ),
                if (height != null && height!.isNotEmpty)
                  IntakeReviewRow(
                    label: 'Height',
                    value: '$height cm',
                  ),
                if (weight != null && weight!.isNotEmpty)
                  IntakeReviewRow(
                    label: 'Weight',
                    value: '$weight kg',
                  ),
                if (providerName != null && providerName!.isNotEmpty)
                  IntakeReviewRow(
                    label: 'Attending provider',
                    value: providerName!,
                  ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 3. Animal summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IntakeSummaryHeader(
                title: '3. Animal details',
                icon: Icons.pets_rounded,
                editStep: 2,
                onEdit: onStepJump,
                isSubmitting: isSubmitting,
              ),
              const SizedBox(height: 8),
              IntakeReviewRow(
                label: 'Type of animal',
                value: animalType == 'other'
                    ? 'Other (${animalTypeOthers ?? ''})'
                    : (animalType == 'dog' ? 'Dog' : 'Cat'),
              ),
              IntakeReviewRow(
                label: 'Ownership',
                value: contract.animalOwnership[animalStatus] ?? animalStatus ?? '—',
              ),
              IntakeReviewRow(
                label: 'Available for observation',
                value: animalAvailable == null
                    ? 'Unsure / not known'
                    : (animalAvailable! ? 'Yes' : 'No'),
              ),
              if (animalConditionReported != null)
                IntakeReviewRow(
                  label: 'Reported condition',
                  value: contract.animalConditions[animalConditionReported] ??
                      animalConditionReported!,
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 4. Previous history summary
        MenuSurface(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IntakeSummaryHeader(
                title: '4. Previous history',
                icon: Icons.history_rounded,
                editStep: 3,
                onEdit: onStepJump,
                isSubmitting: isSubmitting,
              ),
              const SizedBox(height: 8),
              IntakeReviewRow(
                label: 'Past bite history',
                value: contract.pastBiteHistory[pastBiteHistory] ??
                    pastBiteHistory ??
                    'Not reported',
              ),
              if (pastBiteHistory == 'yes' &&
                  pastBiteDates != null &&
                  pastBiteDates!.isNotEmpty)
                IntakeReviewRow(
                  label: 'Past bite date(s)',
                  value: pastBiteDates!,
                ),
              IntakeReviewRow(
                label: 'Prior PEP vaccination',
                value: contract.priorPepStatuses[priorPepStatus] ??
                    priorPepStatus ??
                    'Not reported',
              ),
              if (priorVaccinationDate != null)
                IntakeReviewRow(
                  label: 'Prior PEP date',
                  value: _formatDate(priorVaccinationDate!),
                ),
              if (priorVaccinationFacility != null &&
                  priorVaccinationFacility!.isNotEmpty)
                IntakeReviewRow(
                  label: 'Prior PEP facility',
                  value: priorVaccinationFacility!,
                ),
            ],
          ),
        ),
      ],
    );
  }
}
