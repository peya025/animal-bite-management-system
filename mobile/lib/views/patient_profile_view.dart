import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../l10n/app_localizations.dart';
import '../models/appointment_summary.dart';
import '../models/patient_profile.dart';
import '../models/patient_profile_form_args.dart';
import '../services/api.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/common/app_toast.dart';
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
  bool _archiving = false;

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
      AppToast.success(context, 'Patient profile updated.');
    }
  }

  Future<void> _confirmArchiveProfile() async {
    if (_patient.relationship.toLowerCase() == 'self') return;

    // Check if patient has active upcoming appointments
    try {
      final dynamic rawApps = await api.appointments();
      final List<AppointmentSummary> apps = (rawApps is List)
          ? rawApps.whereType<AppointmentSummary>().toList()
          : const [];

      final hasActiveUpcoming = apps.any(
        (a) => a.patientId == _patient.id && (a.status == 'scheduled' || a.status == 'pending'),
      );

      if (hasActiveUpcoming && mounted) {
        AppToast.error(
          context,
          context.tr('prof_has_active_appointment'),
        );
        return;
      }
    } catch (_) {}

    if (!mounted) return;

    final shouldArchive = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 380),
          padding: const EdgeInsets.fromLTRB(22, 24, 22, 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            boxShadow: const [
              BoxShadow(
                color: Color(0x24000000),
                blurRadius: 28,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon Badge
              Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(
                  color: Color(0xFFFEF2F2),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: const Icon(
                  LucideIcons.archive,
                  color: Color(0xFFEF4444),
                  size: 24,
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                context.tr('prof_archive_confirm_title'),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF111827),
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 8),

              // Description
              Text(
                context.tr('prof_archive_confirm_desc'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF6B7280),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 22),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 44,
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(dialogContext).pop(false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF374151),
                          side: const BorderSide(color: Color(0xFFE5E7EB), width: 1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: Text(
                          context.tr('btn_cancel'),
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: SizedBox(
                      height: 44,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(dialogContext).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          context.tr('prof_archive_btn'),
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (shouldArchive == true && mounted) {
      setState(() => _archiving = true);
      try {
        await api.archivePatient(_patient.id);
        if (!mounted) return;
        final updated = _patient.copyWith(isActive: false);
        AppToast.info(context, '${_patient.name} has been archived.');
        Navigator.of(context).pop(updated);
      } catch (e) {
        if (!mounted) return;
        setState(() => _archiving = false);
        AppToast.error(context, e.toString());
      }
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
                  if (!patient.isActive) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            LucideIcons.archive,
                            color: Color(0xFFD97706),
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              context.tr('prof_archived_banner'),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF92400E),
                                height: 1.35,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
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
                        value: _formatPhilHealth(details?.philhealthNo),
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
                  if (patient.relationship.toLowerCase() != 'self' && patient.isActive) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFFEE2E2), width: 1),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF2F2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                alignment: Alignment.center,
                                child: const Icon(
                                  LucideIcons.archive,
                                  color: Color(0xFFEF4444),
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      context.tr('prof_archive_title'),
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF111827),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      context.tr('prof_archive_desc'),
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        color: Color(0xFF6B7280),
                                        height: 1.3,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            height: 40,
                            child: OutlinedButton(
                              onPressed: _archiving ? null : _confirmArchiveProfile,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFDC2626),
                                side: const BorderSide(color: Color(0xFFFECACA), width: 1),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: _archiving
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Color(0xFFDC2626),
                                      ),
                                    )
                                  : Text(
                                      context.tr('prof_archive_btn'),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
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

String _formatPhilHealth(String? value) {
  if (value == null || value.trim().isEmpty) return '—';
  final digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 11) {
    return '${digits.substring(0, 2)}-${digits.substring(2)}';
  }
  return '${digits.substring(0, 2)}-${digits.substring(2, 11)}-${digits.substring(11, digits.length > 12 ? 12 : digits.length)}';
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
    final idFormatted = membership.membershipType == 'philhealth'
        ? _formatPhilHealth(membership.membershipIdNo)
        : membership.membershipIdNo!;
    parts.add('ID: $idFormatted');
  }
  if (membership.extraValue?.trim().isNotEmpty == true) {
    parts.add('Extra: ${membership.extraValue}');
  }

  if (parts.isEmpty) {
    return 'Saved in structured membership records';
  }

  return parts.join(' • ');
}
