import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../models/patient_profile.dart';

class ProfileCard extends StatelessWidget {
  const ProfileCard({
    super.key,
    required this.name,
    required this.email,
    required this.onEdit,
    this.accountId,
    this.phone,
    this.patientCount = 0,
    this.patients = const [],
    this.onAddDependent,
    this.onOpenVaccinationCard,
  });

  final int? accountId;
  final String name;
  final String email;
  final String? phone;
  final int patientCount;
  final List<PatientProfile> patients;
  final VoidCallback onEdit;
  final VoidCallback? onAddDependent;
  final VoidCallback? onOpenVaccinationCard;

  String _buildHandle() {
    final emailPrefix = email.contains('@') ? email.split('@').first : name;
    final cleanHandle = emailPrefix
        .replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '')
        .toUpperCase();
    final phoneOrId = (phone != null && phone!.trim().isNotEmpty)
        ? phone!.trim()
        : (accountId != null
            ? 'ID #${accountId.toString().padLeft(4, '0')}'
            : 'PATIENT PORTAL');
    return '@${cleanHandle.isEmpty ? 'PATIENT' : cleanHandle} · $phoneOrId';
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = patients.isNotEmpty
        ? patients.where((p) => p.isActive).length
        : patientCount;
    final verifiedCount = patients.where((p) => p.isVerified).length;

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A111827),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Top clinical identity header (no illustration)
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 16, 18),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFE3F5EE),
                  Color(0xFFF1F9F6),
                ],
              ),
              border: Border(
                bottom: BorderSide(color: Color(0xFFD5EBE2), width: 0.8),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1D9E75)
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.heartPulse,
                                  size: 12,
                                  color: Color(0xFF085041),
                                ),
                                SizedBox(width: 5),
                                Text(
                                  'PATIENT ACCOUNT',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF085041),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF111827),
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          height: 1.15,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Material(
                  color: Colors.white.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    onTap: onEdit,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFCCE5DC),
                          width: 1,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        LucideIcons.settings,
                        color: Color(0xFF085041),
                        size: 19,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 2. Medical metadata, stats row, and action bar
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle & account metadata line
                Text(
                  _buildHandle(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF9CA3AF),
                      fontSize: 11.5,
                    ),
                  ),
                ],
                const SizedBox(height: 16),

                // 3-Column medical info stats
                Row(
                  children: [
                    Expanded(
                      child: _MedicalStatColumn(
                        topWidget: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE1F5EE),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(
                                LucideIcons.shieldPlus,
                                size: 14,
                                color: Color(0xFF1D9E75),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(
                                LucideIcons.fileCheck2,
                                size: 14,
                                color: Color(0xFF2563EB),
                              ),
                            ),
                          ],
                        ),
                        label: 'Care Programs',
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 32,
                      color: const Color(0xFFF3F4F6),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(left: 14),
                        child: _MedicalStatColumn(
                          topWidget: Text(
                            '$activeCount',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF111827),
                              height: 1.1,
                            ),
                          ),
                          label: 'Active Profiles',
                        ),
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 32,
                      color: const Color(0xFFF3F4F6),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(left: 14),
                        child: _MedicalStatColumn(
                          topWidget: Text(
                            '$verifiedCount',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF111827),
                              height: 1.1,
                            ),
                          ),
                          label: 'Clinic Verified',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Primary action button + QR button row
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: OutlinedButton.icon(
                          onPressed: onAddDependent ?? onEdit,
                          icon: Icon(
                            onAddDependent != null
                                ? LucideIcons.userPlus
                                : LucideIcons.userPen,
                            size: 17,
                            color: const Color(0xFF1F2937),
                          ),
                          label: Text(
                            onAddDependent != null
                                ? 'ADD DEPENDENT'
                                : 'EDIT ACCOUNT',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1F2937),
                              letterSpacing: 0.4,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.white,
                            side: const BorderSide(
                              color: Color(0xFFD1D5DB),
                              width: 1.2,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                    ),
                    if (onOpenVaccinationCard != null) ...[
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 46,
                        height: 46,
                        child: OutlinedButton(
                          onPressed: onOpenVaccinationCard,
                          style: OutlinedButton.styleFrom(
                            padding: EdgeInsets.zero,
                            backgroundColor: Colors.white,
                            side: const BorderSide(
                              color: Color(0xFFD1D5DB),
                              width: 1.2,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Icon(
                            LucideIcons.qrCode,
                            size: 20,
                            color: Color(0xFF1D9E75),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MedicalStatColumn extends StatelessWidget {
  const _MedicalStatColumn({
    required this.topWidget,
    required this.label,
  });

  final Widget topWidget;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: 22,
          child: Align(
            alignment: Alignment.centerLeft,
            child: topWidget,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 11.5,
            color: Color(0xFF6B7280),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
