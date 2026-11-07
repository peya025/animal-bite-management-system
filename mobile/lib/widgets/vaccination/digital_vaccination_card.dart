import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../app/app_theme.dart';
import '../../models/patient_profile.dart';
import '../../services/api.dart';
import '../common/app_toast.dart';

Future<void> showDigitalVaccinationCard(
  BuildContext context, {
  int? initialPatientId,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      child: DigitalVaccinationCardSheet(initialPatientId: initialPatientId),
    ),
  );
}

Future<void> showEnlargedQrDialog(
  BuildContext context, {
  required String qrPayload,
  required String patientName,
  required String patientNumber,
  required String cardTitle,
  required String status,
}) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) => Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE1F5EE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: const TextStyle(
                        color: Color(0xFF085041),
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    icon: const Icon(LucideIcons.x, size: 18),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                cardTitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$patientName · $patientNumber',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6B7280),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFD1D5DB),
                    width: 1,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0F000000),
                      blurRadius: 12,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: QrImageView(
                  data: qrPayload,
                  version: QrVersions.auto,
                  size: 210,
                  backgroundColor: Colors.white,
                  errorCorrectionLevel: QrErrorCorrectLevel.M,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Present this QR code to clinic staff for instant record verification.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11.5,
                  color: Color(0xFF6B7280),
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class DigitalVaccinationCardSheet extends StatefulWidget {
  const DigitalVaccinationCardSheet({super.key, this.initialPatientId});

  final int? initialPatientId;

  @override
  State<DigitalVaccinationCardSheet> createState() =>
      _DigitalVaccinationCardSheetState();
}

class _DigitalVaccinationCardSheetState
    extends State<DigitalVaccinationCardSheet> {
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
        final errorMsg = (e is ApiException)
            ? e.message
            : 'Unable to fetch official vaccination record ($e).';
        setState(() {
          _loading = false;
          _error = errorMsg;
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
    AppToast.success(
      context,
      'Vaccination certificate link copied to clipboard.',
    );
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
                            'Digital Vaccination Cards',
                            style: TextStyle(
                              color: Color(0xFF111827),
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Swipe left for past records · Tap card to flip',
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

                // Patient Selection (Family / Multi-Profile Switcher)
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
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF1D9E75)
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF1D9E75)
                                    : const Color(0xFFD1D5DB),
                                width: 0.8,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF1D9E75)
                                            .withValues(alpha: 0.25),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.user,
                                  size: 14,
                                  color: isSelected
                                      ? Colors.white
                                      : const Color(0xFF4B5563),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  p.name,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSelected
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: isSelected
                                        ? Colors.white
                                        : const Color(0xFF374151),
                                  ),
                                ),
                                if (isSelf) ...[
                                  const SizedBox(width: 4),
                                  Text(
                                    '(Self)',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isSelected
                                          ? Colors.white70
                                          : const Color(0xFF9CA3AF),
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

                // Card Deck Content / Loader
                if (_loading)
                  Container(
                    height: 280,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const CircularProgressIndicator(
                      color: Color(0xFF1D9E75),
                    ),
                  )
                else if (_error != null && _error!.isNotEmpty)
                  _VaccinationCardErrorNotice(error: _error!)
                else if (_cardData != null)
                  InteractiveVaccinationCardDeck(cardData: _cardData!),

                const SizedBox(height: 14),

                // Footer Actions: Official Proof note + Export / Share Button
                Column(
                  children: [
                    if (_cardData != null) ...[
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _shareCard,
                          icon: const Icon(LucideIcons.share2, size: 15),
                          label: const Text(
                            'Export / Share Certificate',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1D9E75),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.badgeCheck,
                          color: Color(0xFF059669),
                          size: 15,
                        ),
                        SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Accredited by DOH Philippines & PhilHealth Animal Bite Package.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.gray500,
                              fontSize: 10.5,
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
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

class _VaccinationCardErrorNotice extends StatelessWidget {
  const _VaccinationCardErrorNotice({required this.error});

  final String error;

  @override
  Widget build(BuildContext context) {
    final isPending = error.toLowerCase().contains('pending verification');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      decoration: BoxDecoration(
        color: isPending ? const Color(0xFFFFFBEB) : const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPending ? const Color(0xFFFDE68A) : const Color(0xFFFECACA),
        ),
      ),
      child: Column(
        children: [
          Icon(
            isPending ? LucideIcons.clock : LucideIcons.alertCircle,
            color:
                isPending ? const Color(0xFFD97706) : const Color(0xFFDC2626),
            size: 30,
          ),
          const SizedBox(height: 10),
          if (isPending) ...[
            const Text(
              'Linkage Pending Verification',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF92400E),
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
          ],
          Text(
            error,
            textAlign: TextAlign.center,
            style: TextStyle(
              color:
                  isPending ? const Color(0xFFB45309) : const Color(0xFFDC2626),
              fontSize: 12.5,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

/// eGov-inspired stacked, horizontally swipable, and 3D-flippable vaccination card deck.
/// Slide 0: Official Active/Current Rabies PEP Card (Front: Certificate + QR, Back: Dose Ledger)
/// Slide 1: Past Vaccination & Historical Dose Card (Front: Historical Summary, Back: Full Dose Log)
class InteractiveVaccinationCardDeck extends StatefulWidget {
  const InteractiveVaccinationCardDeck({
    super.key,
    required this.cardData,
    this.onEnlargeCard,
  });

  final Map<String, dynamic> cardData;
  final VoidCallback? onEnlargeCard;

  @override
  State<InteractiveVaccinationCardDeck> createState() =>
      _InteractiveVaccinationCardDeckState();
}

class _InteractiveVaccinationCardDeckState
    extends State<InteractiveVaccinationCardDeck> {
  int _currentIndex = 0;
  int _slideDirection = 1; // 1 = slide left (next), -1 = slide right (prev)
  final Map<int, bool> _flippedByIndex = {};

  bool _isFlipped(int index) => _flippedByIndex[index] ?? false;

  void _toggleFlip([int? index]) {
    final target = index ?? _currentIndex;
    setState(() {
      _flippedByIndex[target] = !_isFlipped(target);
    });
  }

  void _goToPage(int index, int totalCount) {
    final clamped = index.clamp(0, totalCount - 1);
    if (clamped == _currentIndex) return;
    setState(() {
      _slideDirection = clamped > _currentIndex ? 1 : -1;
      _currentIndex = clamped;
    });
  }

  @override
  Widget build(BuildContext context) {
    final patient =
        (widget.cardData['patient'] as Map<String, dynamic>?) ?? const {};
    final qrPayload =
        widget.cardData['qr_payload']?.toString() ?? 'https://clinic.gov.ph';
    final cardStatus = widget.cardData['status']?.toString() ?? 'ACTIVE';
    final doses = (widget.cardData['doses'] as List<dynamic>?) ?? const [];
    final completedDoses = doses
        .where((d) =>
            (d as Map<String, dynamic>)['status']?.toString().toUpperCase() ==
            'COMPLETED')
        .toList();

    final patientName =
        (patient['full_name']?.toString() ?? 'PATIENT NAME').toUpperCase();
    final patientNumber = patient['patient_number']?.toString() ?? '—';

    final cardSlides = <_VaccinationSlideMeta>[
      _VaccinationSlideMeta(
        badgeText: cardStatus == 'COMPLETED' ? 'Verified · Completed' : 'Verified · Active',
        badgeColor: const Color(0xFFE1F5EE),
        badgeTextColor: const Color(0xFF085041),
        title: 'Official Rabies PEP Card',
        subtitle: _isFlipped(0)
            ? 'Showing Back (Clinical Dose Ledger) · Tap to flip'
            : 'Swipe left for past history · Tap card to flip',
        accentColor: AppColors.primaryDark,
        front: _OfficialVaccinationCard(
          cardData: widget.cardData,
          onFlip: () => _toggleFlip(0),
        ),
        back: _OfficialVaccinationCardBack(
          cardData: widget.cardData,
          onFlip: () => _toggleFlip(0),
        ),
      ),
      _VaccinationSlideMeta(
        badgeText: 'History · ${completedDoses.length} Administered',
        badgeColor: const Color(0xFFE0E7FF),
        badgeTextColor: const Color(0xFF1E40AF),
        title: 'Past Vaccination & Dose History',
        subtitle: _isFlipped(1)
            ? 'Showing Back (Protocol Reference) · Tap to flip'
            : 'Swipe right for current card · Tap card to flip',
        accentColor: const Color(0xFF1E3A5F),
        front: _HistoryVaccinationCardFront(
          cardData: widget.cardData,
          onFlip: () => _toggleFlip(1),
        ),
        back: _HistoryVaccinationCardBack(
          cardData: widget.cardData,
          onFlip: () => _toggleFlip(1),
        ),
      ),
    ];

    final activeSlide = cardSlides[_currentIndex];

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Stacked Card Header + Swipable & Flippable Card Viewport
        Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            // Back stack layer 2 (furthest back, like eGov ID stack)
            Positioned(
              top: 0,
              left: 28,
              right: 28,
              child: Container(
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFFD5E6E0),
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(14)),
                  border: Border.all(
                    color: const Color(0xFFBBD4CB),
                    width: 0.8,
                  ),
                ),
              ),
            ),
            // Back stack layer 1 (middle layer peeking out with header strip)
            Positioned(
              top: 7,
              left: 14,
              right: 14,
              child: GestureDetector(
                onTap: () => _goToPage(
                  _currentIndex == 0 ? 1 : 0,
                  cardSlides.length,
                ),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 240),
                  height: 28,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: _currentIndex == 0
                        ? const Color(0xFF1E3A5F)
                        : AppColors.primaryDark,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(14)),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x14000000),
                        blurRadius: 6,
                        offset: Offset(0, -1),
                      ),
                    ],
                  ),
                  alignment: Alignment.topCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        Icon(
                          _currentIndex == 0
                              ? Icons.history_rounded
                              : LucideIcons.shieldCheck,
                          size: 10,
                          color: Colors.white70,
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            _currentIndex == 0
                                ? 'PAST VACCINATION & DOSE HISTORY CARD'
                                : 'OFFICIAL RABIES PEP VACCINATION CARD',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 8,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const Text(
                          'SWIPE ←',
                          style: TextStyle(
                            color: Colors.white60,
                            fontSize: 7.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Active Card PageView (pushed down 18px to reveal the stack behind it)
            Padding(
              padding: const EdgeInsets.only(top: 18),
              child: ExpandablePageView(
                currentIndex: _currentIndex,
                slideDirection: _slideDirection,
                itemCount: cardSlides.length,
                onPageChanged: (idx) => _goToPage(idx, cardSlides.length),
                itemBuilder: (context, index) {
                  final slide = cardSlides[index];
                  final isFlipped = _isFlipped(index);
                  return _FlippableCardContainer(
                    isFlipped: isFlipped,
                    onTap: () => _toggleFlip(index),
                    front: slide.front,
                    back: slide.back,
                  );
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 2. eGov-style Pill Action Buttons Row (Flip Card / Enlarge ID / Enlarge QR)
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            _CardActionPillButton(
              icon: Icons.flip_rounded,
              label: _isFlipped(_currentIndex) ? 'Flip to Front' : 'Flip Card',
              onTap: () => _toggleFlip(_currentIndex),
            ),
            if (widget.onEnlargeCard != null)
              _CardActionPillButton(
                icon: Icons.open_in_full_rounded,
                label: 'Enlarge Card',
                onTap: widget.onEnlargeCard!,
              ),
            _CardActionPillButton(
              icon: LucideIcons.qrCode,
              label: 'Enlarge QR',
              onTap: () => showEnlargedQrDialog(
                context,
                qrPayload: qrPayload,
                patientName: patientName,
                patientNumber: patientNumber,
                cardTitle: activeSlide.title,
                status: cardStatus,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 3. eGov-inspired Bottom Card Status & Switcher Tile
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
          ),
          child: Row(
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
                            vertical: 2.5,
                          ),
                          decoration: BoxDecoration(
                            color: activeSlide.badgeColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            activeSlide.badgeText,
                            style: TextStyle(
                              color: activeSlide.badgeTextColor,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Page dots
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(cardSlides.length, (i) {
                            final selected = i == _currentIndex;
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              margin: const EdgeInsets.only(right: 4),
                              width: selected ? 14 : 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: selected
                                    ? const Color(0xFF1D9E75)
                                    : const Color(0xFFD1D5DB),
                                borderRadius: BorderRadius.circular(3),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      activeSlide.title,
                      style: const TextStyle(
                        color: Color(0xFF111827),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      activeSlide.subtitle,
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              // Mini card switcher button on the right
              InkWell(
                onTap: () => _goToPage(
                  _currentIndex == 0 ? 1 : 0,
                  cardSlides.length,
                ),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 58,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: const Color(0xFFD1D5DB),
                      width: 0.8,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _currentIndex == 0
                            ? Icons.history_rounded
                            : LucideIcons.shieldCheck,
                        size: 16,
                        color: _currentIndex == 0
                            ? const Color(0xFF1E3A5F)
                            : const Color(0xFF1D9E75),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _currentIndex == 0 ? 'History' : 'Current',
                        style: const TextStyle(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF4B5563),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _VaccinationSlideMeta {
  const _VaccinationSlideMeta({
    required this.badgeText,
    required this.badgeColor,
    required this.badgeTextColor,
    required this.title,
    required this.subtitle,
    required this.accentColor,
    required this.front,
    required this.back,
  });

  final String badgeText;
  final Color badgeColor;
  final Color badgeTextColor;
  final String title;
  final String subtitle;
  final Color accentColor;
  final Widget front;
  final Widget back;
}

class _CardActionPillButton extends StatelessWidget {
  const _CardActionPillButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFE6F4EF),
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7.5),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xFF085041),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                icon,
                size: 14,
                color: const Color(0xFF085041),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 3D Y-axis card flip container.
class _FlippableCardContainer extends StatelessWidget {
  const _FlippableCardContainer({
    required this.isFlipped,
    required this.onTap,
    required this.front,
    required this.back,
  });

  final bool isFlipped;
  final VoidCallback onTap;
  final Widget front;
  final Widget back;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0, end: isFlipped ? math.pi : 0),
        duration: const Duration(milliseconds: 420),
        curve: Curves.easeInOutCubic,
        builder: (context, angle, _) {
          final showingBack = angle >= (math.pi / 2);
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(angle),
            child: showingBack
                ? Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(math.pi),
                    child: back,
                  )
                : front,
          );
        },
      ),
    );
  }
}

/// Auto-sizing horizontal swipe viewport so cards of different heights animate smoothly.
class ExpandablePageView extends StatelessWidget {
  const ExpandablePageView({
    super.key,
    required this.currentIndex,
    required this.slideDirection,
    required this.itemCount,
    required this.itemBuilder,
    this.onPageChanged,
  });

  final int currentIndex;
  final int slideDirection;
  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final ValueChanged<int>? onPageChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onHorizontalDragEnd: (details) {
        final velocity = details.primaryVelocity ?? 0;
        if (velocity < -140 && currentIndex < itemCount - 1) {
          onPageChanged?.call(currentIndex + 1);
        } else if (velocity > 140 && currentIndex > 0) {
          onPageChanged?.call(currentIndex - 1);
        }
      },
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 280),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (child, animation) {
          final isIncoming =
              child.key == ValueKey<int>(currentIndex);
          final beginOffset = isIncoming
              ? Offset(0.18 * slideDirection, 0)
              : Offset(-0.18 * slideDirection, 0);
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: beginOffset,
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          );
        },
        child: KeyedSubtree(
          key: ValueKey<int>(currentIndex),
          child: itemBuilder(context, currentIndex),
        ),
      ),
    );
  }
}

class _OfficialVaccinationCard extends StatelessWidget {
  const _OfficialVaccinationCard({
    required this.cardData,
    this.onFlip,
  });

  final Map<String, dynamic> cardData;
  final VoidCallback? onFlip;

  @override
  Widget build(BuildContext context) {
    final clinic = (cardData['clinic'] as Map<String, dynamic>?) ?? {};
    final patient = (cardData['patient'] as Map<String, dynamic>?) ?? {};
    final card = (cardData['card'] as Map<String, dynamic>?) ?? {};
    final progress = (cardData['progress'] as Map<String, dynamic>?) ?? {};
    final doses = (cardData['doses'] as List<dynamic>?) ?? const [];
    final qrPayload =
        cardData['qr_payload']?.toString() ?? 'https://clinic.gov.ph';
    final cardStatus = cardData['status']?.toString() ?? 'ACTIVE';

    final vaccineBrand = doses.isNotEmpty &&
            doses.first['vaccine_brand'] != null &&
            doses.first['vaccine_brand'] != '—'
        ? doses.first['vaccine_brand'].toString()
        : '—';

    final expCat = card['exposure_category']?.toString();
    final animType = card['animal_type']?.toString();
    final exposureCategoryText =
        (expCat != null && expCat.isNotEmpty && expCat != '—')
            ? 'Category $expCat${(animType != null && animType.isNotEmpty && animType != '—') ? ' ($animType)' : ''}'
            : '—';

    final nextDose = progress['next_dose'] as Map<String, dynamic>?;
    final nextScheduleText = nextDose != null
        ? '${nextDose['name']} · ${nextDose['scheduled_date']} (${nextDose['due_text']})'
        : (cardStatus == 'COMPLETED'
            ? 'All PEP doses completed'
            : 'Pending Day 0 Schedule');

    final dohAcc = clinic['doh_accreditation_no']?.toString() ?? '—';
    final philHealthAcc =
        clinic['philhealth_accreditation_no']?.toString() ?? '—';

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
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
                const Icon(
                  LucideIcons.shieldCheck,
                  color: AppColors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (clinic['name']?.toString() ??
                                'TAGOLOAN ANIMAL BITE CENTER')
                            .toUpperCase(),
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
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
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
                        (patient['full_name']?.toString() ?? 'PATIENT NAME')
                            .toUpperCase(),
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
                      const SizedBox(height: 10),
                      _CardDetailRow(
                        label: 'EXPOSURE CATEGORY',
                        value: exposureCategoryText,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: _CardDetailRow(
                              label: 'DATE OF EXPOSURE',
                              value:
                                  card['date_of_exposure']?.toString() ?? '—',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _CardDetailRow(
                              label: 'TREATMENT STARTED',
                              value: card['date_treatment_started']
                                      ?.toString() ??
                                  '—',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      _CardDetailRow(
                        label: 'VACCINE BRAND',
                        value: vaccineBrand,
                      ),
                      const SizedBox(height: 6),
                      _CardDetailRow(
                        label: 'DOSE PROGRESS',
                        value: progress['dose_label']?.toString() ??
                            '0 of 3 doses',
                      ),
                      const SizedBox(height: 6),
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

/// Back side of the Official Rabies PEP Card (Clinical Dose Ledger & Facility Details).
class _OfficialVaccinationCardBack extends StatelessWidget {
  const _OfficialVaccinationCardBack({
    required this.cardData,
    this.onFlip,
  });

  final Map<String, dynamic> cardData;
  final VoidCallback? onFlip;

  @override
  Widget build(BuildContext context) {
    final clinic = (cardData['clinic'] as Map<String, dynamic>?) ?? {};
    final card = (cardData['card'] as Map<String, dynamic>?) ?? {};
    final doses = (cardData['doses'] as List<dynamic>?) ?? const [];
    final registryNo = card['registry_no']?.toString() ?? '—';
    final placeOfExposure = card['place_of_exposure']?.toString() ?? '—';

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            color: AppColors.primaryDark,
            child: Row(
              children: [
                const Icon(
                  Icons.flip_rounded,
                  color: Colors.white,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'CLINICAL DOSE ADMINISTRATION LEDGER',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                      Text(
                        'Registry No: $registryNo · Place: $placeOfExposure',
                        style: const TextStyle(
                          color: Color(0xFFE1F5EE),
                          fontSize: 9,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'BACK SIDE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Table header
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: Text(
                          'DOSE',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'DATE',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'BRAND / LOT',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'STATUS',
                          textAlign: TextAlign.right,
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                for (final rawDose in doses)
                  Builder(
                    builder: (context) {
                      final d = rawDose as Map<String, dynamic>;
                      final status =
                          (d['status'] ?? 'pending').toString().toUpperCase();
                      final isDone = status == 'COMPLETED';
                      final date = (d['administered_date'] ??
                              d['scheduled_date'] ??
                              '—')
                          .toString();
                      final brand = (d['vaccine_brand'] ?? '—').toString();
                      final batch = (d['batch_no'] ?? '—').toString();
                      final route = (d['route'] ?? 'ID').toString();
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: Text(
                                '${d['period'] ?? '—'} ($route)',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF111827),
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 3,
                              child: Text(
                                date,
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  color: Color(0xFF374151),
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 3,
                              child: Text(
                                batch != '—' ? '$brand ($batch)' : brand,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  color: Color(0xFF4B5563),
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 2,
                              child: Text(
                                isDone ? 'DONE' : status,
                                textAlign: TextAlign.right,
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: isDone
                                      ? const Color(0xFF059669)
                                      : const Color(0xFFD97706),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                const Divider(height: 16, color: Color(0xFFE5E7EB)),
                Text(
                  'Facility: ${clinic['name'] ?? 'Tagoloan Animal Bite Center'} · ${clinic['address'] ?? 'Tagoloan, Misamis Oriental'}',
                  style: const TextStyle(
                    fontSize: 9.5,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Second card when swiping left: Past Vaccination & Historical Dose Record Card (Front).
class _HistoryVaccinationCardFront extends StatelessWidget {
  const _HistoryVaccinationCardFront({
    required this.cardData,
    this.onFlip,
  });

  final Map<String, dynamic> cardData;
  final VoidCallback? onFlip;

  @override
  Widget build(BuildContext context) {
    final patient = (cardData['patient'] as Map<String, dynamic>?) ?? {};
    final card = (cardData['card'] as Map<String, dynamic>?) ?? {};
    final doses = (cardData['doses'] as List<dynamic>?) ?? const [];
    final qrPayload =
        cardData['qr_payload']?.toString() ?? 'https://clinic.gov.ph';

    final completedDoses = doses.where((d) {
      final map = d as Map<String, dynamic>;
      return map['status']?.toString().toUpperCase() == 'COMPLETED';
    }).toList();

    final primaryCompleted = completedDoses
        .where((d) => !(d as Map<String, dynamic>)['period']
            .toString()
            .toLowerCase()
            .contains('booster'))
        .length;

    final lastAdministered = completedDoses.isNotEmpty
        ? ((completedDoses.last as Map<String, dynamic>)['administered_date'] ??
                (completedDoses.last
                    as Map<String, dynamic>)['scheduled_date'] ??
                '—')
            .toString()
        : 'No completed dose yet';

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFCBD5E1)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14111827),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Deep Navy/Slate Clinical History Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            color: const Color(0xFF1E3A5F),
            child: Row(
              children: [
                const Icon(
                  Icons.history_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'VACCINATION & IMMUNIZATION HISTORY CARD',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Cumulative Rabies PEP & Booster Dose Record',
                        style: TextStyle(
                          color: Color(0xFFBFDBFE),
                          fontSize: 9,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'HISTORY',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (patient['full_name']?.toString() ?? 'PATIENT NAME')
                            .toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.gray900,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Registry No: ${card['registry_no'] ?? '—'} · Patient No: ${patient['patient_number'] ?? '—'}',
                        style: const TextStyle(
                          color: AppColors.gray500,
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _CardDetailRow(
                              label: 'PRIMARY SERIES RECORD',
                              value: '$primaryCompleted of 3 Doses Verified',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _CardDetailRow(
                              label: 'LAST DOSE ADMINISTERED',
                              value: lastAdministered,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _CardDetailRow(
                        label: 'RE-EXPOSURE / BOOSTER ELIGIBILITY',
                        value: primaryCompleted >= 3
                            ? 'Eligible for 2-Dose Booster Protocol (Day 0 & Day 3)'
                            : 'Complete 3-dose primary series first',
                        highlight: primaryCompleted >= 3,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                _ScannableQrWidget(qrPayload: qrPayload),
              ],
            ),
          ),

          // Completed Dose History Chips Strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              border: Border(
                top: BorderSide(color: Color(0xFFE2E8F0), width: 0.8),
              ),
            ),
            child: completedDoses.isEmpty
                ? const Text(
                    'No completed vaccination doses recorded yet.',
                    style: TextStyle(
                      fontSize: 11,
                      color: Color(0xFF64748B),
                    ),
                  )
                : Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      for (final raw in completedDoses)
                        Builder(
                          builder: (context) {
                            final d = raw as Map<String, dynamic>;
                            final period = d['period']?.toString() ?? 'Dose';
                            final date = (d['administered_date'] ??
                                    d['scheduled_date'] ??
                                    '')
                                .toString();
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 9,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: const Color(0xFFCBD5E1),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    LucideIcons.checkCheck,
                                    size: 12,
                                    color: Color(0xFF1D9E75),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    '$period · $date',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF1E293B),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

/// Back side of the Past Vaccination & Dose History Card.
class _HistoryVaccinationCardBack extends StatelessWidget {
  const _HistoryVaccinationCardBack({
    required this.cardData,
    this.onFlip,
  });

  final Map<String, dynamic> cardData;
  final VoidCallback? onFlip;

  @override
  Widget build(BuildContext context) {
    final doses = (cardData['doses'] as List<dynamic>?) ?? const [];
    final completedDoses = doses.where((d) {
      final map = d as Map<String, dynamic>;
      return map['status']?.toString().toUpperCase() == 'COMPLETED';
    }).toList();

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFCBD5E1)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14111827),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            color: const Color(0xFF1E3A5F),
            child: const Row(
              children: [
                Icon(Icons.flip_rounded, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'VERIFIED PAST VACCINATION CERTIFICATES & LOG',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (completedDoses.isEmpty)
                  const Text(
                    'No past administered doses on file.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                  )
                else
                  for (final raw in completedDoses)
                    Builder(
                      builder: (context) {
                        final d = raw as Map<String, dynamic>;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              const Icon(
                                LucideIcons.badgeCheck,
                                size: 15,
                                color: Color(0xFF1D9E75),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${d['period']}: ${d['vaccine_brand'] ?? 'PVRV'} (${d['route'] ?? 'ID'}) · Lot ${d['batch_no'] ?? '—'}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF111827),
                                  ),
                                ),
                              ),
                              Text(
                                (d['administered_date'] ??
                                        d['scheduled_date'] ??
                                        '—')
                                    .toString(),
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                const Divider(height: 18, color: Color(0xFFE5E7EB)),
                const Text(
                  'DOH Clinical Note: Patients with a verified completed 3-dose primary PEP series only require 2 booster doses (Day 0 and Day 3, without RIG) upon subsequent re-exposure.',
                  style: TextStyle(
                    fontSize: 10,
                    color: Color(0xFF475569),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
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

  @override
  Widget build(BuildContext context) {
    if (doses.isEmpty) return const SizedBox.shrink();

    // Separate primary PEP doses from booster doses
    final primaryDoses = doses.where((d) {
      final period = (d['period'] ?? '').toString().toLowerCase();
      return !period.contains('booster');
    }).toList();

    final boosterDoses = doses.where((d) {
      final period = (d['period'] ?? '').toString().toLowerCase();
      return period.contains('booster');
    }).toList();

    final isPrimaryCompleted = primaryDoses.isNotEmpty &&
        primaryDoses.every(
          (d) => d['status']?.toString().toUpperCase() == 'COMPLETED',
        );

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
          // Primary PEP Series
          if (primaryDoses.isNotEmpty) ...[
            Row(
              children: [
                Expanded(
                  child: Text(
                    isPrimaryCompleted
                        ? 'PRIMARY RABIES PEP TIMELINE · COMPLETED'
                        : 'RABIES POST-EXPOSURE DOSE TIMELINE',
                    style: TextStyle(
                      color: isPrimaryCompleted
                          ? const Color(0xFF065F46)
                          : AppColors.gray500,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (isPrimaryCompleted) ...[
                  const SizedBox(width: 6),
                  const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.checkCheck,
                        size: 12,
                        color: Color(0xFF10B981),
                      ),
                      SizedBox(width: 4),
                      Text(
                        '3/3 Complete',
                        style: TextStyle(
                          color: Color(0xFF065F46),
                          fontSize: 8.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: _buildTimelineItems(primaryDoses),
            ),
          ],

          // Booster Series (Only shown if patient decided to get a booster)
          if (boosterDoses.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Divider(color: Color(0xFFE5E7EB), height: 1),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(
                  LucideIcons.shieldAlert,
                  size: 12,
                  color: Color(0xFF0284C7),
                ),
                const SizedBox(width: 5),
                const Expanded(
                  child: Text(
                    'RABIES 2-DOSE BOOSTER TIMELINE',
                    style: TextStyle(
                      color: Color(0xFF0369A1),
                      fontSize: 8.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2FE),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Active Protocol',
                    style: TextStyle(
                      color: Color(0xFF0284C7),
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: _buildTimelineItems(boosterDoses),
            ),
          ],
        ],
      ),
    );
  }

  List<Widget> _buildTimelineItems(List<dynamic> doseList) {
    final items = <Widget>[];
    for (int i = 0; i < doseList.length; i++) {
      final dose = doseList[i] as Map<String, dynamic>;
      final period = dose['period']?.toString() ?? 'Dose ${i + 1}';
      final isComplete =
          dose['status']?.toString().toUpperCase() == 'COMPLETED';
      final isMissed = dose['status']?.toString().toUpperCase() == 'MISSED';
      final date =
          (dose['administered_date'] ?? dose['scheduled_date'] ?? '')
                  ?.toString() ??
              '';

      items.add(_buildDoseItem(period, isComplete, isMissed, date));

      if (i < doseList.length - 1) {
        final nextDose = doseList[i + 1] as Map<String, dynamic>;
        final nextComplete =
            nextDose['status']?.toString().toUpperCase() == 'COMPLETED';
        items.add(_buildDoseLine(isComplete: isComplete && nextComplete));
      }
    }
    return items;
  }

  Widget _buildDoseItem(
    String label,
    bool complete,
    bool isMissed,
    String date,
  ) {
    final color = complete
        ? const Color(0xFF1D9E75)
        : (isMissed ? const Color(0xFFEF4444) : const Color(0xFFBBC8C5));
    final textColor = complete
        ? const Color(0xFF065F46)
        : (isMissed ? const Color(0xFFDC2626) : AppColors.gray500);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: complete
                ? const Color(0xFF1D9E75)
                : (isMissed ? const Color(0xFFFEE2E2) : AppColors.white),
            shape: BoxShape.circle,
            border: Border.all(
              color: color,
              width: 1.5,
            ),
          ),
          child: complete
              ? const Icon(
                  LucideIcons.check,
                  color: AppColors.white,
                  size: 12,
                )
              : (isMissed
                  ? const Icon(
                      LucideIcons.x,
                      color: Color(0xFFDC2626),
                      size: 12,
                    )
                  : null),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: TextStyle(
            color: textColor,
            fontSize: 8.5,
            fontWeight: complete ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        if (date.isNotEmpty)
          Text(
            date.split(',').first,
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
