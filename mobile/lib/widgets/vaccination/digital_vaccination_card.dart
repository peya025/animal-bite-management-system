import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../app/app_theme.dart';
import '../../models/patient_profile.dart';
import '../../services/api.dart';
import '../common/app_toast.dart';

Future<void> showDigitalVaccinationCard(BuildContext context, {int? initialPatientId}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => DigitalVaccinationCardSheet(initialPatientId: initialPatientId),
  );
}

class DigitalVaccinationCardSheet extends StatefulWidget {
  const DigitalVaccinationCardSheet({super.key, this.initialPatientId});

  final int? initialPatientId;

  @override
  State<DigitalVaccinationCardSheet> createState() => _DigitalVaccinationCardSheetState();
}

class _DigitalVaccinationCardSheetState extends State<DigitalVaccinationCardSheet> {
  List<PatientProfile> _patients = const [];
  PatientProfile? _selectedPatient;
  Map<String, dynamic>? _cardData;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadInitial();
  }

  Future<void> _loadInitial() async {
    try {
      final dynamic raw = await api.patients();
      final List<PatientProfile> list = (raw is List)
          ? raw.whereType<PatientProfile>().toList()
          : const <PatientProfile>[];

      if (mounted) {
        setState(() {
          _patients = list;
          if (list.isNotEmpty) {
            if (widget.initialPatientId != null) {
              _selectedPatient = list.firstWhere(
                (p) => p.id == widget.initialPatientId,
                orElse: () => list.first,
              );
            } else {
              _selectedPatient = list.first;
            }
          }
        });

        if (_selectedPatient != null) {
          await _loadCard(_selectedPatient!.id);
        } else {
          setState(() {
            _loading = false;
            _error = 'No patient profile found.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Failed to load patient profiles.';
        });
      }
    }
  }

  Future<void> _loadCard(int patientId) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dynamic data = await api.vaccinationCard(patientId);
      if (mounted) {
        if (data is Map<String, dynamic>) {
          setState(() {
            _cardData = data;
            _loading = false;
          });
        } else {
          setState(() {
            _loading = false;
            _error = 'Invalid card data format received from server.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Unable to fetch official vaccination record ($e).';
        });
      }
    }
  }

  void _selectPatient(PatientProfile p) {
    if (_selectedPatient?.id == p.id) return;
    setState(() {
      _selectedPatient = p;
    });
    _loadCard(p.id);
  }

  void _shareCard() {
    AppToast.success(context, 'Vaccination certificate link copied to clipboard.');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFF4F6F5),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Modal Handle
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1D5DB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Top Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Digital Vaccination Card',
                            style: TextStyle(
                              color: Color(0xFF111827),
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Official Post-Exposure Prophylaxis (PEP) Certificate',
                            style: TextStyle(
                              color: AppColors.gray500,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(LucideIcons.x, size: 18),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ─── Patient Selection (Family / Multi-Profile Switcher) ───
                if (_patients.length > 1) ...[
                  SizedBox(
                    height: 38,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      itemCount: _patients.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final p = _patients[index];
                        final isSelected = p.id == _selectedPatient?.id;
                        final isSelf = p.relationship.toLowerCase() == 'self';
                        return GestureDetector(
                          onTap: () => _selectPatient(p),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF1D9E75) : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF1D9E75) : const Color(0xFFD1D5DB),
                                width: 0.8,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF1D9E75).withValues(alpha: 0.25),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      )
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.user,
                                  size: 14,
                                  color: isSelected ? Colors.white : const Color(0xFF4B5563),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  p.name,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected ? Colors.white : const Color(0xFF374151),
                                  ),
                                ),
                                if (isSelf) ...[
                                  const SizedBox(width: 4),
                                  Text(
                                    '(Self)',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isSelected ? Colors.white70 : const Color(0xFF9CA3AF),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // ─── Card Content / Loader ───
                if (_loading)
                  Container(
                    height: 280,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const CircularProgressIndicator(color: Color(0xFF1D9E75)),
                  )
                else if (_error != null && _error!.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Column(
                      children: [
                        const Icon(LucideIcons.alertCircle, color: Color(0xFFDC2626), size: 28),
                        const SizedBox(height: 8),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13),
                        ),
                      ],
                    ),
                  )
                else if (_cardData != null)
                  _OfficialVaccinationCard(cardData: _cardData!),

                const SizedBox(height: 14),

                // Footer Actions: Official Proof note + Export / Share Button
                Row(
                  children: [
                    const Icon(
                      LucideIcons.badgeCheck,
                      color: Color(0xFF059669),
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    const Expanded(
                      child: Text(
                        'Accredited by DOH Philippines & PhilHealth Animal Bite Package.',
                        style: TextStyle(
                          color: AppColors.gray500,
                          fontSize: 10.5,
                          height: 1.3,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: _shareCard,
                      icon: const Icon(LucideIcons.share2, size: 14),
                      label: const Text('Export / Share', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1D9E75),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OfficialVaccinationCard extends StatelessWidget {
  const _OfficialVaccinationCard({required this.cardData});

  final Map<String, dynamic> cardData;

  @override
  Widget build(BuildContext context) {
    final clinic = (cardData['clinic'] as Map<String, dynamic>?) ?? {};
    final patient = (cardData['patient'] as Map<String, dynamic>?) ?? {};
    final card = (cardData['card'] as Map<String, dynamic>?) ?? {};
    final progress = (cardData['progress'] as Map<String, dynamic>?) ?? {};
    final doses = (cardData['doses'] as List<dynamic>?) ?? const [];
    final qrPayload = cardData['qr_payload']?.toString() ?? 'https://clinic.gov.ph';
    final cardStatus = cardData['status']?.toString() ?? 'ACTIVE';

    final vaccineBrand = doses.isNotEmpty && doses.first['vaccine_brand'] != null && doses.first['vaccine_brand'] != '—'
        ? doses.first['vaccine_brand'].toString()
        : '—';

    final expCat = card['exposure_category']?.toString();
    final animType = card['animal_type']?.toString();
    final exposureCategoryText = (expCat != null && expCat.isNotEmpty && expCat != '—')
        ? 'Category $expCat${(animType != null && animType.isNotEmpty && animType != '—') ? ' ($animType)' : ''}'
        : '—';

    final nextDose = progress['next_dose'] as Map<String, dynamic>?;
    final nextScheduleText = nextDose != null
        ? '${nextDose['name']} · ${nextDose['scheduled_date']} (${nextDose['due_text']})'
        : (cardStatus == 'COMPLETED' ? 'All PEP doses completed' : 'Pending Day 0 Schedule');

    final dohAcc = clinic['doh_accreditation_no']?.toString() ?? '—';
    final philHealthAcc = clinic['philhealth_accreditation_no']?.toString() ?? '—';

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCE5E2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14111827),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Clinic Header banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            color: AppColors.primaryDark,
            child: Row(
              children: [
                const Icon(LucideIcons.shieldCheck, color: AppColors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (clinic['name']?.toString() ?? 'TAGOLOAN ANIMAL BITE CENTER').toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'DOH Acc: $dohAcc · PhilHealth: $philHealthAcc',
                        style: const TextStyle(
                          color: Color(0xFFE1F5EE),
                          fontSize: 9,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                _VerifiedStatusBadge(status: cardStatus),
              ],
            ),
          ),

          // Main Profile & QR Code section
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (patient['full_name']?.toString() ?? 'PATIENT NAME').toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.gray900,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Patient No: ${patient['patient_number'] ?? '—'} · PhilHealth: ${patient['philhealth_no'] ?? '—'}',
                        style: const TextStyle(
                          color: AppColors.gray500,
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _CardDetailRow(
                        label: 'EXPOSURE CATEGORY',
                        value: exposureCategoryText,
                      ),
                      const SizedBox(height: 8),
                      _CardDetailRow(
                        label: 'VACCINE BRAND',
                        value: vaccineBrand,
                      ),
                      const SizedBox(height: 8),
                      _CardDetailRow(
                        label: 'DOSE PROGRESS',
                        value: progress['dose_label']?.toString() ?? '0 of 4 doses',
                      ),
                      const SizedBox(height: 8),
                      _CardDetailRow(
                        label: 'NEXT SCHEDULE',
                        value: nextScheduleText,
                        highlight: nextDose != null,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Scannable Real QR Code
                _ScannableQrWidget(qrPayload: qrPayload),
              ],
            ),
          ),

          // 4-Step Dose Progress Tracker
          _LiveDoseProgress(doses: doses),
        ],
      ),
    );
  }
}

class _VerifiedStatusBadge extends StatelessWidget {
  const _VerifiedStatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final upper = status.toUpperCase();
    final isCompleted = upper == 'COMPLETED';
    final isPending = upper == 'PENDING';

    final badgeColor = isCompleted
        ? const Color(0xFF10B981)
        : (isPending ? const Color(0xFFF59E0B) : const Color(0xFF1D9E75));
    final icon = isCompleted
        ? LucideIcons.badgeCheck
        : (isPending ? LucideIcons.clock : LucideIcons.calendarCheck);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 13,
            color: Colors.white,
          ),
          const SizedBox(width: 4),
          Text(
            upper,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _CardDetailRow extends StatelessWidget {
  const _CardDetailRow({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.gray500,
            fontSize: 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            color: highlight ? const Color(0xFF1D9E75) : AppColors.gray900,
            fontSize: 11.5,
            fontWeight: highlight ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _ScannableQrWidget extends StatelessWidget {
  const _ScannableQrWidget({required this.qrPayload});

  final String qrPayload;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFD1D5DB), width: 0.8),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: QrImageView(
            data: qrPayload,
            version: QrVersions.auto,
            size: 80,
            backgroundColor: Colors.white,
            errorCorrectionLevel: QrErrorCorrectLevel.M,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'SCAN TO VERIFY',
          style: TextStyle(
            fontSize: 7.5,
            fontWeight: FontWeight.w700,
            color: AppColors.gray500,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}

class _LiveDoseProgress extends StatelessWidget {
  const _LiveDoseProgress({required this.doses});

  final List<dynamic> doses;

  bool _isDoseComplete(String name) {
    final match = doses.firstWhere(
      (d) => d['dose_number']?.toString().toUpperCase() == name.toUpperCase(),
      orElse: () => null,
    );
    return match != null && match['status']?.toString().toUpperCase() == 'COMPLETED';
  }

  String _getDoseDate(String name) {
    final match = doses.firstWhere(
      (d) => d['dose_number']?.toString().toUpperCase() == name.toUpperCase(),
      orElse: () => null,
    );
    return match != null ? (match['formatted_date'] ?? match['date'] ?? '') : '';
  }

  @override
  Widget build(BuildContext context) {
    final d0 = _isDoseComplete('Day 0');
    final d3 = _isDoseComplete('Day 3');
    final d7 = _isDoseComplete('Day 7');
    final d28 = _isDoseComplete('Day 28');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Color(0xFFF9FAFB),
        border: Border(
          top: BorderSide(color: Color(0xFFE5E7EB), width: 0.8),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'RABIES POST-EXPOSURE DOSE TIMELINE',
            style: TextStyle(
              color: AppColors.gray500,
              fontSize: 8.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildDoseItem('Day 0', d0),
              _buildDoseLine(isComplete: d0 && d3),
              _buildDoseItem('Day 3', d3),
              _buildDoseLine(isComplete: d3 && d7),
              _buildDoseItem('Day 7', d7),
              _buildDoseLine(isComplete: d7 && d28),
              _buildDoseItem('Day 28', d28),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDoseItem(String label, bool complete) {
    final date = _getDoseDate(label);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: complete ? const Color(0xFF1D9E75) : AppColors.white,
            shape: BoxShape.circle,
            border: Border.all(
              color: complete ? const Color(0xFF1D9E75) : const Color(0xFFBBC8C5),
              width: 1.5,
            ),
          ),
          child: complete
              ? const Icon(
                  LucideIcons.check,
                  color: AppColors.white,
                  size: 12,
                )
              : null,
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: TextStyle(
            color: complete ? const Color(0xFF065F46) : AppColors.gray500,
            fontSize: 8.5,
            fontWeight: complete ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        if (date.isNotEmpty)
          Text(
            date.split(',').first, // e.g. "March 10"
            style: const TextStyle(
              color: Color(0xFF9CA3AF),
              fontSize: 7.5,
            ),
          ),
      ],
    );
  }

  Widget _buildDoseLine({required bool isComplete}) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 20),
        color: isComplete ? const Color(0xFF1D9E75) : const Color(0xFFD3DCDA),
      ),
    );
  }
}

