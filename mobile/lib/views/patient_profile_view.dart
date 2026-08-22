import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/patient_profile.dart';
import '../models/patient_profile_form_args.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/common/status_chip.dart';
import '../widgets/menu/menu_surface.dart';

class PatientProfileView extends StatefulWidget {
  const PatientProfileView({super.key, required this.patient});

  final PatientProfile patient;

  @override
  State<PatientProfileView> createState() => _PatientProfileViewState();
}

class _PatientProfileViewState extends State<PatientProfileView> {
  late PatientProfile _patient;

  @override
  void initState() {
    super.initState();
    _patient = widget.patient;
  }

  Future<void> _editProfile() async {
    final updated = await Navigator.of(context).pushNamed(
      AppRoutes.profileSetup,
      arguments: PatientProfileFormArgs(patient: _patient),
    );

    if (updated is PatientProfile && mounted) {
      setState(() => _patient = updated);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Patient profile updated.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final patient = _patient;
    final details = patient.details;

    return Scaffold(
      backgroundColor: AppColors.pageBackground,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppPageHeader(
                    title: patient.name,
                    subtitle: 'Patient profile and Form 1 details.',
                    onBack: () => Navigator.of(context).pop(patient),
                    centered: true,
                    trailing: IconButton(
                      tooltip: 'Edit profile',
                      onPressed: _editProfile,
                      icon: const Icon(
                        Icons.edit_outlined,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  MenuSurface(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    patient.name,
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _relationshipLabel(patient.relationship),
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                  if (patient.patientNumber
                                      case final number?) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      number,
                                      style: const TextStyle(
                                        color: AppColors.textMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            StatusChip(status: patient.status),
                          ],
                        ),
                        if (patient.memberships.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: patient.memberships
                                .map(
                                  (membership) => Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryLight,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      _membershipTitle(membership),
                                      style: const TextStyle(
                                        color: AppColors.primaryDark,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _SectionCard(
                    title: 'Patient information',
                    children: [
                      _InfoRow(label: 'First name', value: patient.firstName),
                      _InfoRow(label: 'Middle name', value: patient.middleName),
                      _InfoRow(label: 'Last name', value: patient.lastName),
                      _InfoRow(label: 'Suffix', value: patient.suffix),
                      _InfoRow(
                        label: 'Gender',
                        value: _titleCase(patient.gender),
                      ),
                      _InfoRow(
                        label: 'Date of birth',
                        value: patient.dateOfBirth,
                      ),
                      _InfoRow(label: 'Blood type', value: details?.bloodType),
                      _InfoRow(
                        label: 'Mother\'s maiden name',
                        value: details?.motherMaidenName,
                      ),
                      _InfoRow(
                        label: 'Civil status',
                        value: _titleCase(details?.civilStatus),
                      ),
                      _InfoRow(
                        label: 'Spouse name',
                        value: details?.spouseName,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SectionCard(
                    title: 'Address and contact',
                    children: [
                      _InfoRow(label: 'Address', value: patient.address),
                      _InfoRow(
                        label: 'Municipality',
                        value: details?.addressMunicipality,
                      ),
                      _InfoRow(
                        label: 'Barangay',
                        value: details?.addressBarangay,
                      ),
                      _InfoRow(
                        label: 'Purok / street',
                        value: details?.addressPurok,
                      ),
                      _InfoRow(label: 'Province', value: details?.province),
                      _InfoRow(
                        label: 'Contact number',
                        value: patient.contactNumber,
                      ),
                      _InfoRow(label: 'Email', value: patient.email),
                      _InfoRow(
                        label: 'Emergency contact',
                        value: patient.emergencyContactName,
                      ),
                      _InfoRow(
                        label: 'Emergency contact number',
                        value: patient.emergencyContactNumber,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SectionCard(
                    title: 'Socioeconomic information',
                    children: [
                      _InfoRow(
                        label: 'Educational attainment',
                        value: _titleCase(details?.educationalAttainment),
                      ),
                      _InfoRow(
                        label: 'Employment status',
                        value: _titleCase(details?.employmentStatus),
                      ),
                      _InfoRow(
                        label: 'Family member position',
                        value: _titleCase(details?.familyMember),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SectionCard(
                    title: 'Government programs and memberships',
                    children: [
                      _InfoRow(
                        label: 'Has membership',
                        value: _yesNo(
                          details?.hasMembership ??
                              (patient.memberships.isNotEmpty ? 'yes' : null),
                        ),
                      ),
                      _InfoRow(
                        label: 'PhilHealth member',
                        value: _yesNo(details?.philhealthMember),
                      ),
                      _InfoRow(
                        label: 'PhilHealth status',
                        value: _titleCase(details?.philhealthStatus),
                      ),
                      _InfoRow(
                        label: 'PhilHealth no.',
                        value: details?.philhealthNo,
                      ),
                      _InfoRow(
                        label: 'PhilHealth category',
                        value: _titleCase(details?.philhealthCategory),
                      ),
                      _InfoRow(
                        label: '4Ps member',
                        value: _yesNo(details?.fourpsMember),
                      ),
                      _InfoRow(
                        label: '4Ps category',
                        value: details?.fourpsCategory,
                      ),
                      _InfoRow(
                        label: '4Ps relationship',
                        value: details?.fourpsRelationship,
                      ),
                      _InfoRow(
                        label: 'Registered 4Ps beneficiary',
                        value: details?.registeredFourpsBeneficiary,
                      ),
                      _InfoRow(
                        label: 'DSWD NHTS',
                        value: _yesNo(details?.dswdNhts),
                      ),
                      if (patient.memberships.isEmpty)
                        const _InfoRow(
                          label: 'Structured memberships',
                          value: 'No structured memberships saved yet',
                        )
                      else
                        ...patient.memberships.map(
                          (membership) => _InfoRow(
                            label: _membershipTitle(membership),
                            value: _membershipDetails(membership),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return MenuSurface(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _displayValue(value),
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _displayValue(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? '—' : trimmed;
}

String _relationshipLabel(String relationship) {
  return switch (relationship) {
    'self' => 'Self',
    'child' => 'Child',
    _ => 'Dependent',
  };
}

String _titleCase(String? value) {
  final text = value?.trim();
  if (text == null || text.isEmpty) return '—';
  return text
      .replaceAll('_', ' ')
      .split(' ')
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

String _yesNo(String? value) {
  return switch (value?.toLowerCase()) {
    'yes' => 'Yes',
    'no' => 'No',
    _ => '—',
  };
}

String _membershipTitle(PatientMembership membership) {
  switch (membership.membershipType) {
    case 'philhealth':
      return 'PhilHealth';
    case 'fourps':
      return '4Ps';
    case 'dswd_nhts':
      return 'DSWD NHTS';
    case 'senior_citizen':
      return 'Senior Citizen';
    case 'pwd':
      return 'PWD';
    case 'indigenous_member':
      return 'Indigenous Member';
    case 'other':
      return membership.membershipLabel?.trim().isNotEmpty == true
          ? membership.membershipLabel!
          : 'Other Membership';
    default:
      return _titleCase(membership.membershipType);
  }
}

String _membershipDetails(PatientMembership membership) {
  final parts = <String>[];

  if (membership.statusValue?.trim().isNotEmpty == true) {
    parts.add('Status: ${membership.statusValue}');
  }
  if (membership.category?.trim().isNotEmpty == true) {
    parts.add('Category: ${membership.category}');
  }
  if (membership.relationshipValue?.trim().isNotEmpty == true) {
    parts.add('Relationship: ${membership.relationshipValue}');
  }
  if (membership.registeredBeneficiary?.trim().isNotEmpty == true) {
    parts.add('Beneficiary: ${membership.registeredBeneficiary}');
  }
  if (membership.membershipIdNo?.trim().isNotEmpty == true) {
    parts.add('ID: ${membership.membershipIdNo}');
  }
  if (membership.extraValue?.trim().isNotEmpty == true) {
    parts.add('Extra: ${membership.extraValue}');
  }

  if (parts.isEmpty) {
    return 'Saved in structured membership records';
  }

  return parts.join(' • ');
}
