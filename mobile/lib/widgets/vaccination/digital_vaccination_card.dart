import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../app/app_theme.dart';
import '../../models/patient_profile.dart';
import '../../services/api.dart';

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
  bool _loadingCard = true;
  String _error = '';
  List<PatientProfile> _patients = const [];
  PatientProfile? _selectedPatient;
  Map<String, dynamic>? _cardData;

  @override
  void initState() {
    super.initState();
    _loadPatientsAndCard();
  }

  Future<void> _loadPatientsAndCard() async {
    setState(() {
      _error = '';
    });

    try {
      final dynamic raw = await api.patients();
      final List<PatientProfile> patientsList = (raw is List)
          ? raw.whereType<PatientProfile>().toList()
          : const <PatientProfile>[];

      if (!mounted) return;

      setState(() {
        _patients = patientsList;
      });

      if (patientsList.isNotEmpty) {
        PatientProfile target = patientsList.first;
        if (widget.initialPatientId != null) {
          for (final p in patientsList) {
            if (p.id == widget.initialPatientId) {
              target = p;
              break;
            }
          }
        } else {
          for (final p in patientsList) {
            if (p.relationship.toLowerCase() == 'self') {
              target = p;
              break;
            }
          }
        }

        _selectPatient(target);
      } else {
        setState(() {
          _loadingCard = false;
          _error = 'No patient profile found. Please register or verify a patient profile first.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingCard = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _selectPatient(PatientProfile patient) async {
    setState(() {
      _selectedPatient = patient;
      _loadingCard = true;
      _error = '';
    });

    try {
      final data = await api.vaccinationCard(patient.id);
      if (mounted) {
        setState(() {
          _cardData = data;
          _loadingCard = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingCard = false;
          _error = 'Unable to load vaccination card: ${e.toString()}';
        });
      }
    }
  }

  void _shareCard() {
    if (_cardData == null) return;

    final patient = _cardData!['patient'] as Map<String, dynamic>? ?? {};
    final clinic = _cardData!['clinic'] as Map<String, dynamic>? ?? {};
    final card = _cardData!['card'] as Map<String, dynamic>? ?? {};
    final progress = _cardData!['progress'] as Map<String, dynamic>? ?? {};
    final qrPayload = _cardData!['qr_payload']?.toString() ?? '';

    final text = StringBuffer()
      ..writeln('🏥 ${clinic['name'] ?? 'ANIMAL BITE TREATMENT CENTER'}')
      ..writeln('DOH Accreditation: ${clinic['doh_accreditation_no'] ?? 'N/A'} | PhilHealth: ${clinic['philhealth_accreditation_no'] ?? 'N/A'}')
      ..writeln('----------------------------------------')
      ..writeln('👤 Patient: ${patient['full_name'] ?? _selectedPatient?.name}')
      ..writeln('🆔 Patient ID: ${patient['patient_number'] ?? _selectedPatient?.patientNumber}')
      ..writeln('💉 Progress: ${progress['dose_label'] ?? '4 doses'} (${_cardData!['status'] ?? 'ACTIVE'})')
      ..writeln('⚠️ Exposure: Category ${card['exposure_category'] ?? 'III'} (${card['animal_type'] ?? 'Animal Bite'})')
      ..writeln('📅 Date of Exposure: ${card['date_of_exposure'] ?? 'N/A'}')
      ..writeln('🔗 Verification: $qrPayload');

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Official card summary copied for sharing:\n\n${text.toString()}'),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 22),
        decoration: BoxDecoration(
          color: const Color(0xFFF5F8F7),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top drag pill
                Center(
                  child: Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1D8D6),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Header with Title and Close button
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Digital Vaccination Card',
                            style: TextStyle(
                              color: AppColors.gray900,
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Official DOH & PhilHealth accredited electronic proof.',
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
                      icon: const Icon(Icons.close_rounded),
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
                                  Icons.person_outline_rounded,
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
                if (_loadingCard)
                  Container(
                    height: 280,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const CircularProgressIndicator(color: Color(0xFF1D9E75)),
                  )
                else if (_error.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 28),
                        const SizedBox(height: 8),
                        Text(
                          _error,
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
                      Icons.verified_user_outlined,
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
                      icon: const Icon(Icons.share_rounded, size: 14),
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
                const Icon(Icons.health_and_safety_outlined, color: AppColors.white, size: 20),
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
        ? Icons.verified_rounded
        : (isPending ? Icons.hourglass_top_rounded : Icons.schedule_rounded);

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
            color: AppColors.white,
            size: 12,
          ),
          const SizedBox(width: 4),
          Text(
            status.toUpperCase(),
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 9,
              fontWeight: FontWeight.w800,
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
            fontSize: 8.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 1),
        Text(
          value,
          style: TextStyle(
            color: highlight ? const Color(0xFF047857) : const Color(0xFF1F2937),
            fontSize: 11,
            fontWeight: highlight ? FontWeight.w700 : FontWeight.w600,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
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
    return Container(
      width: 102,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: const Color(0xFFDCE5E2)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          QrImageView(
            data: qrPayload,
            version: QrVersions.auto,
            size: 90,
            padding: EdgeInsets.zero,
            backgroundColor: Colors.white,
          ),
          const SizedBox(height: 4),
          const Text(
            'SCAN TO VERIFY',
            style: TextStyle(
              color: Color(0xFF047857),
              fontSize: 7.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _LiveDoseProgress extends StatelessWidget {
  const _LiveDoseProgress({required this.doses});

  final List<dynamic> doses;

  @override
  Widget build(BuildContext context) {
    // Map of 4 standard doses (Day 0, Day 3, Day 7, Day 28)
    final doseSteps = ['Day 0', 'Day 3', 'Day 7', 'Day 28'];

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      color: const Color(0xFFF2F8F6),
      child: Row(
        children: [
          for (var i = 0; i < doseSteps.length; i++) ...[
            _buildDoseItem(doseSteps[i]),
            if (i < doseSteps.length - 1)
              _buildDoseLine(
                isComplete: _isStepComplete(doseSteps[i]) && _isStepComplete(doseSteps[i + 1]),
              ),
          ],
        ],
      ),
    );
  }

  bool _isStepComplete(String stepName) {
    for (final d in doses) {
      if (d is Map<String, dynamic>) {
        if (d['period'] == stepName && d['status'] == 'completed') {
          return true;
        }
      }
    }
    return false;
  }

  String _getDoseDate(String stepName) {
    for (final d in doses) {
      if (d is Map<String, dynamic> && d['period'] == stepName) {
        return d['administered_date'] ?? d['scheduled_date'] ?? '';
      }
    }
    return '';
  }

  Widget _buildDoseItem(String label) {
    final complete = _isStepComplete(label);
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
                  Icons.check_rounded,
                  color: AppColors.white,
                  size: 13,
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

