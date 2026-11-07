import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../models/patient_profile.dart';
import '../../services/api.dart';
import '../vaccination/digital_vaccination_card.dart';

class ProfileCard extends StatefulWidget {
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

  @override
  State<ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends State<ProfileCard> {
  PatientProfile? _selectedPatient;
  Map<String, dynamic>? _cardData;
  bool _loadingCard = false;
  String? _cardError;

  @override
  void initState() {
    super.initState();
    _initSelectedPatient();
  }

  @override
  void didUpdateWidget(covariant ProfileCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.patients != widget.patients) {
      _initSelectedPatient();
    }
  }

  void _initSelectedPatient() {
    final activePatients = widget.patients.where((p) => p.isActive).toList();
    final list = activePatients.isNotEmpty ? activePatients : widget.patients;
    if (list.isEmpty) {
      setState(() {
        _selectedPatient = null;
        _cardData = null;
        _loadingCard = false;
      });
      return;
    }

    final current = _selectedPatient;
    final resolved = current != null && list.any((p) => p.id == current.id)
        ? list.firstWhere((p) => p.id == current.id)
        : list.firstWhere(
            (p) => p.relationship.toLowerCase() == 'self',
            orElse: () => list.first,
          );

    _selectedPatient = resolved;
    _fetchCard(resolved.id);
  }

  Future<void> _fetchCard(int patientId) async {
    setState(() {
      _loadingCard = true;
      _cardError = null;
    });
    try {
      final dynamic data = await api.vaccinationCard(patientId);
      if (!mounted) return;
      if (data is Map<String, dynamic>) {
        setState(() {
          _cardData = data;
          _loadingCard = false;
        });
      } else {
        setState(() {
          _cardError = 'Unable to load vaccination card.';
          _loadingCard = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      final msg = (e is ApiException)
          ? e.message
          : 'Vaccination card pending clinic verification.';
      setState(() {
        _cardError = msg;
        _loadingCard = false;
      });
    }
  }

  String _buildHandle() {
    final emailPrefix = widget.email.contains('@')
        ? widget.email.split('@').first
        : widget.name;
    final cleanHandle = emailPrefix
        .replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '')
        .toUpperCase();
    final phoneOrId = (widget.phone != null && widget.phone!.trim().isNotEmpty)
        ? widget.phone!.trim()
        : (widget.accountId != null
            ? 'ID #${widget.accountId.toString().padLeft(4, '0')}'
            : 'PATIENT PORTAL');
    return '@${cleanHandle.isEmpty ? 'PATIENT' : cleanHandle} · $phoneOrId';
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = widget.patients.isNotEmpty
        ? widget.patients.where((p) => p.isActive).length
        : widget.patientCount;
    final verifiedCount = widget.patients.where((p) => p.isVerified).length;

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
                        widget.name,
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
                    onTap: widget.onEdit,
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

          // 2. Medical metadata, stats row, action bar, and eGov-style flippable/swipable card deck
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
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
                if (widget.email.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    widget.email,
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
                const SizedBox(height: 16),

                // Primary action button + QR button row
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 44,
                        child: OutlinedButton.icon(
                          onPressed: widget.onAddDependent ?? widget.onEdit,
                          icon: Icon(
                            widget.onAddDependent != null
                                ? LucideIcons.userPlus
                                : LucideIcons.userPen,
                            size: 16,
                            color: const Color(0xFF1F2937),
                          ),
                          label: Text(
                            widget.onAddDependent != null
                                ? 'ADD DEPENDENT'
                                : 'EDIT ACCOUNT',
                            style: const TextStyle(
                              fontSize: 12,
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
                    if (widget.onOpenVaccinationCard != null) ...[
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 44,
                        height: 44,
                        child: OutlinedButton(
                          onPressed: widget.onOpenVaccinationCard,
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
                            size: 19,
                            color: Color(0xFF1D9E75),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),

                // 3. Embedded eGov-style Stacked, Swipable & Flippable Digital Vaccination Card
                if (widget.patients.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  const Divider(height: 1, color: Color(0xFFF3F4F6)),
                  const SizedBox(height: 14),

                  // Family profile selector chips (if more than 1 profile)
                  if (widget.patients.length > 1) ...[
                    SizedBox(
                      height: 32,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: widget.patients.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 6),
                        itemBuilder: (context, index) {
                          final p = widget.patients[index];
                          final selected = p.id == _selectedPatient?.id;
                          return GestureDetector(
                            onTap: () {
                              if (selected) return;
                              setState(() => _selectedPatient = p);
                              _fetchCard(p.id);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 11,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: selected
                                    ? const Color(0xFF085041)
                                    : const Color(0xFFF3F4F6),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    LucideIcons.user,
                                    size: 12,
                                    color: selected
                                        ? Colors.white
                                        : const Color(0xFF4B5563),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    p.name,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: selected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      color: selected
                                          ? Colors.white
                                          : const Color(0xFF374151),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  if (_loadingCard)
                    Container(
                      height: 190,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                      ),
                      child: const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: Color(0xFF1D9E75),
                        ),
                      ),
                    )
                  else if (_cardData != null)
                    InteractiveVaccinationCardDeck(
                      cardData: _cardData!,
                      onEnlargeCard: () => showDigitalVaccinationCard(
                        context,
                        initialPatientId: _selectedPatient?.id,
                      ),
                    )
                  else if (_cardError != null)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            LucideIcons.clock,
                            size: 18,
                            color: Color(0xFFD97706),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _cardError!,
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: Color(0xFF92400E),
                                height: 1.35,
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
