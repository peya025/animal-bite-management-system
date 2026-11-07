import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../app/app_theme.dart';
import '../../services/walkthrough_service.dart';

class WalkthroughStepData {
  const WalkthroughStepData({
    required this.title,
    required this.description,
    required this.icon,
    required this.tag,
  });

  final String title;
  final String description;
  final IconData icon;
  final String tag;
}

const List<WalkthroughStepData> kDefaultWalkthroughSteps = [
  WalkthroughStepData(
    tag: 'PEP SCHEDULE',
    title: 'Track Your PEP Schedule',
    description:
        'View your upcoming Day 0, Day 3, and Day 7 vaccination dates and clinic visit status in real time.',
    icon: LucideIcons.calendarCheck,
  ),
  WalkthroughStepData(
    tag: 'QUICK ACTIONS',
    title: 'Book Bite Consultation & Intake',
    description:
        'Report an animal bite incident in 5 guided steps, view the schedule calendar, or book a follow-up visit.',
    icon: LucideIcons.clipboardPlus,
  ),
  WalkthroughStepData(
    tag: 'DIGITAL PASS',
    title: 'Digital Vaccination Card & QR',
    description:
        'Tap the center QR button anytime to view your official DOH/PhilHealth card, flip to the dose ledger, or swipe left for past records.',
    icon: LucideIcons.qrCode,
  ),
  WalkthroughStepData(
    tag: 'CLINICAL GUIDE',
    title: 'Immediate First-Aid & DOH Guides',
    description:
        'Review the 3-step wound care guide (Wash, Consult, Vaccinate) and watch official clinic orientation videos.',
    icon: LucideIcons.shieldCheck,
  ),
  WalkthroughStepData(
    tag: 'FAMILY & SETTINGS',
    title: 'Manage Dependents & Reminders',
    description:
        'Add children or family members under one account and customize appointment and vaccination notifications.',
    icon: LucideIcons.users,
  ),
];

Future<void> showAppWalkthrough(
  BuildContext context, {
  Map<int, GlobalKey>? targetKeys,
}) async {
  await showGeneralDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierLabel: 'App Guide Walkthrough',
    barrierColor: Colors.transparent,
    transitionDuration: const Duration(milliseconds: 240),
    pageBuilder: (dialogContext, animation, secondaryAnimation) {
      return FadeTransition(
        opacity: animation,
        child: AppWalkthroughOverlay(
          targetKeys: targetKeys,
          onFinish: () async {
            await WalkthroughService.markCompleted();
            if (dialogContext.mounted) {
              Navigator.of(dialogContext).pop();
            }
          },
        ),
      );
    },
  );
}

class AppWalkthroughOverlay extends StatefulWidget {
  const AppWalkthroughOverlay({
    super.key,
    required this.onFinish,
    this.targetKeys,
    this.steps = kDefaultWalkthroughSteps,
  });

  final VoidCallback onFinish;
  final Map<int, GlobalKey>? targetKeys;
  final List<WalkthroughStepData> steps;

  @override
  State<AppWalkthroughOverlay> createState() => _AppWalkthroughOverlayState();
}

class _AppWalkthroughOverlayState extends State<AppWalkthroughOverlay> {
  int _currentStep = 0;
  Rect? _targetRect;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolveTargetRect());
  }

  Future<void> _resolveTargetRect() async {
    final key = widget.targetKeys?[_currentStep];
    final targetContext = key?.currentContext;
    if (targetContext != null && targetContext.mounted) {
      await Scrollable.ensureVisible(
        targetContext,
        alignment: 0.3,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
      );
    }
    if (!mounted) return;
    final refreshedContext = key?.currentContext;
    if (refreshedContext != null && refreshedContext.mounted) {
      final renderObj = refreshedContext.findRenderObject();
      if (renderObj is RenderBox && renderObj.hasSize) {
        final topLeft = renderObj.localToGlobal(Offset.zero);
        setState(() {
          _targetRect = topLeft & renderObj.size;
        });
        return;
      }
    }
    setState(() {
      _targetRect = null;
    });
  }

  void _nextStep() {
    if (_currentStep < widget.steps.length - 1) {
      setState(() {
        _currentStep++;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _resolveTargetRect());
    } else {
      widget.onFinish();
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _resolveTargetRect());
    }
  }

  @override
  Widget build(BuildContext context) {
    final step = widget.steps[_currentStep];
    final isLast = _currentStep == widget.steps.length - 1;
    final screenSize = MediaQuery.of(context).size;
    final rect = _targetRect;

    // Position the card below the spotlight if target is in the upper half,
    // or above if target is in the lower half; otherwise center it.
    final bool showBelow =
        rect != null && rect.center.dy < screenSize.height * 0.52;

    return Material(
      color: Colors.transparent,
      child: Stack(
        children: [
          // 1. Dimmed backdrop with optional spotlight cutout
          Positioned.fill(
            child: GestureDetector(
              onTap: _nextStep,
              child: CustomPaint(
                painter: _SpotlightPainter(targetRect: rect),
              ),
            ),
          ),

          // 2. Walkthrough Tooltip / Guide Card
          SafeArea(
            child: Align(
              alignment: rect == null
                  ? Alignment.center
                  : (showBelow ? Alignment.bottomCenter : Alignment.topCenter),
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  18,
                  rect != null && !showBelow ? 24 : 18,
                  18,
                  rect != null && showBelow ? 28 : 18,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: Container(
                      key: ValueKey<int>(_currentStep),
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFFD5EBE2),
                          width: 1,
                        ),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x33000000),
                            blurRadius: 24,
                            offset: Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top row: Step badge + Skip button
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 9,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE1F5EE),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  'STEP ${_currentStep + 1} OF ${widget.steps.length} · ${step.tag}',
                                  style: const TextStyle(
                                    color: Color(0xFF085041),
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              TextButton(
                                onPressed: widget.onFinish,
                                style: TextButton.styleFrom(
                                  visualDensity: VisualDensity.compact,
                                  foregroundColor: const Color(0xFF6B7280),
                                ),
                                child: const Text(
                                  'Skip',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Icon + Title
                          Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE1F5EE),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                alignment: Alignment.center,
                                child: Icon(
                                  step.icon,
                                  color: AppColors.primary,
                                  size: 21,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  step.title,
                                  style: const TextStyle(
                                    color: Color(0xFF111827),
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    height: 1.2,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Description
                          Text(
                            step.description,
                            style: const TextStyle(
                              color: Color(0xFF4B5563),
                              fontSize: 13,
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Progress dots + Navigation buttons
                          Row(
                            children: [
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: List.generate(
                                  widget.steps.length,
                                  (index) {
                                    final active = index == _currentStep;
                                    return AnimatedContainer(
                                      duration:
                                          const Duration(milliseconds: 200),
                                      margin: const EdgeInsets.only(right: 5),
                                      width: active ? 16 : 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: active
                                            ? AppColors.primary
                                            : const Color(0xFFD1D5DB),
                                        borderRadius: BorderRadius.circular(3),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const Spacer(),
                              if (_currentStep > 0) ...[
                                OutlinedButton(
                                  onPressed: _prevStep,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF374151),
                                    side: const BorderSide(
                                      color: Color(0xFFD1D5DB),
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 10,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  child: const Text(
                                    'Back',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              ElevatedButton(
                                onPressed: _nextStep,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 18,
                                    vertical: 10,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: Text(
                                  isLast ? 'Done' : 'Next',
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
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
            ),
          ),
        ],
      ),
    );
  }
}

class _SpotlightPainter extends CustomPainter {
  const _SpotlightPainter({this.targetRect});

  final Rect? targetRect;

  @override
  void paint(Canvas canvas, Size size) {
    final fullRect = Offset.zero & size;
    final overlayPaint = Paint()..color = const Color(0xAD091E1A);

    if (targetRect == null) {
      canvas.drawRect(fullRect, overlayPaint);
      return;
    }

    final inflated = targetRect!.inflate(6);
    final rrect = RRect.fromRectAndRadius(inflated, const Radius.circular(14));

    final path = Path()
      ..addRect(fullRect)
      ..addRRect(rrect)
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, overlayPaint);

    // Highlight ring around the spotlight cutout
    final borderPaint = Paint()
      ..color = const Color(0xFF1D9E75)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawRRect(rrect, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _SpotlightPainter oldDelegate) {
    return oldDelegate.targetRect != targetRect;
  }
}
