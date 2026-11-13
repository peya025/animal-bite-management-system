import 'package:flutter/material.dart';

import '../../../models/patient_profile.dart';
import '../../menu/menu_surface.dart';
import '../helpers/intake_ui_helpers.dart';

/// Step 1: Read-only patient demographics preview retrieved from Form 1 official records.
class StepPatient extends StatelessWidget {
  const StepPatient({super.key, required this.patient});

  final PatientProfile patient;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Icon(
                Icons.info_outline_rounded,
                color: Color(0xFF2563EB),
                size: 18,
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Patient demographic data is retrieved from official registration records (Form 1). If updates are needed, please edit your patient profile.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF1E40AF),
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        MenuSurface(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const IntakeSectionHeader(
                icon: Icons.person_outline_rounded,
                title: 'Patient details',
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: IntakeReadOnlyField(
                      label: 'First name',
                      value: patient.firstName,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: IntakeReadOnlyField(
                      label: 'Last name',
                      value: patient.lastName,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: IntakeReadOnlyField(
                      label: 'Date of birth',
                      value: patient.dateOfBirth,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: IntakeReadOnlyField(
                      label: 'Sex',
                      value: patient.gender,
                    ),
                  ),
                ],
              ),
              IntakeReadOnlyField(
                label: 'Contact number',
                value: patient.contactNumber,
              ),
              IntakeReadOnlyField(
                label: 'Address',
                value: patient.address,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
