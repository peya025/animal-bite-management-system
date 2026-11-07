import 'dart:math' as math;

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
    tag: 'GUIDE & TUTORIALS',
    title: '',
    description:
        'Watch tutorials or replay this walkthrough anytime on how to use the ABCare app.',
    icon: LucideIcons.compass,
  ),
  WalkthroughStepData(
    tag: 'PEP SCHEDULE',
    title: '',
    description:
        'Track your upcoming Day 0, Day 3, and Day 7 vaccination dates and clinic visit status.',
    icon: LucideIcons.calendarCheck,
  ),
  WalkthroughStepData(
    tag: 'QUICK ACTIONS',
    title: 'Quick actions:',
    description:
        'Perform major activities on the ABCare app such as opening your schedule calendar or managing patient profiles.',
    icon: LucideIcons.clipboardPlus,
  ),
  WalkthroughStepData(
    tag: 'DIGITAL PASS',
    title: 'Digital QR Card:',
    description:
        'Tap the center QR button to open your official vaccination card, flip to the dose ledger, or swipe for history.',
    icon: LucideIcons.qrCode,
  ),
  WalkthroughStepData(
    tag: 'BOOK & BITE INTAKE',
    title: 'Book a consultation:',
    description:
        'Tap Next to open the Book screen and see how to choose a patient profile, service type, and clinic date.',
    icon: LucideIcons.calendarPlus,
  ),
];

const List<WalkthroughStepData> kBookingWalkthroughSteps = [
  WalkthroughStepData(
    tag: 'BOOKING · PATIENT',
    title: '1. Patient profile:',
    description:
        'Select who the appointment is for (Self or a family dependent), or tap Add dependent to register a child.',
    icon: LucideIcons.userCheck,
  ),
  WalkthroughStepData(
    tag: 'BOOKING · SERVICE',
    title: '2. Service type:',
    description:
        'Choose Bite consultation for a new animal bite (5-step intake) or Rabies booster (2-dose Day 0 & Day 3) if primary PEP is complete.',
    icon: LucideIcons.stethoscope,
  ),
  WalkthroughStepData(
    tag: 'BOOKING · SCHEDULE',
    title: '3. Date & intake:',
    description:
        'Pick an open clinic date on the calendar, add optional visit notes, and tap Continue to intake to submit.',
    icon: LucideIcons.calendar,
  ),
];

/// Shows the spotlight walkthrough overlay.
/// Returns `true` if the user stepped through to the end via Next/OK,
/// or `false` if they dismissed early using the close ('X') button.
Future<bool> showAppWalkthrough(
  BuildContext context, {
  Map<int, GlobalKey>? targetKeys,
  List<WalkthroughStepData> steps = kDefaultWalkthroughSteps,
  int stepOffset = 0,
  int? totalStepsOverride,
}) async {
  var completed = false;
  await showGeneralDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierLabel: 'App Guide Walkthrough',
    barrierColor: Colors.transparent,
    transitionDuration: const Duration(milliseconds: 220),
    pageBuilder: (dialogContext, animation, secondaryAnimation) {
      return FadeTransition(
        opacity: animation,
        child: AppWalkthroughOverlay(
          targetKeys: targetKeys,
          steps: steps,
          stepOffset: stepOffset,
          totalStepsOverride: totalStepsOverride,
          onFinish: () async {
            completed = true;
            await WalkthroughService.markCompleted();
            if (dialogContext.mounted) {
              Navigator.of(dialogContext).pop();
            }
          },
          onDismiss: () async {
            completed = false;
            await WalkthroughService.markCompleted();
            if (dialogContext.mounted) {
              Navigator.of(dialogContext).pop();
            }
          },
        ),
      );
    },
  );
  return completed;
}

class AppWalkthroughOverlay extends StatefulWidget {
  const AppWalkthroughOverlay({
    super.key,
    required this.onFinish,
    this.onDismiss,
    this.targetKeys,
    this.steps = kDefaultWalkthroughSteps,
    this.stepOffset = 0,
    this.totalStepsOverride,
  });

  final VoidCallback onFinish;
  final VoidCallback? onDismiss;
  final Map<int, GlobalKey>? targetKeys;
  final List<WalkthroughStepData> steps;
  final int stepOffset;
  final int? totalStepsOverride;

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
      final scrollable = Scrollable.maybeOf(targetContext);
      if (scrollable != null) {
        await Scrollable.ensureVisible(
          targetContext,
          alignment: 0.25,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
        );
      }
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

  Rect _effectiveTargetRect(Size screenSize, EdgeInsets padding) {
    if (_targetRect != null) {
      return _targetRect!;
    }
    final contentWidth = math.min(screenSize.width - 32.0, 488.0);
    final left = (screenSize.width - contentWidth) / 2;
    return switch (_currentStep) {
      0 => Rect.fromLTWH(left + 16, padding.top + 172, 148, 34),
      1 => Rect.fromLTWH(left, padding.top + 230, contentWidth, 128),
      2 => Rect.fromLTWH(left, padding.top + 380, contentWidth, 145),
      3 => Rect.fromLTWH(
        screenSize.width / 2 - 30,
        screenSize.height - padding.bottom - 86,
        60,
        60,
      ),
      _ => Rect.fromLTWH(
        left + contentWidth * 0.22,
        screenSize.height - padding.bottom - 62,
        74,
        56,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final step = widget.steps[_currentStep];
    final effectiveTotalSteps =
        widget.totalStepsOverride ?? (widget.stepOffset + widget.steps.length);
    final displayStepNumber = widget.stepOffset + _currentStep + 1;
    final isFinalOverallStep = displayStepNumber >= effectiveTotalSteps;

    final mediaQuery = MediaQuery.of(context);
    final screenSize = mediaQuery.size;
    final rect = _effectiveTargetRect(screenSize, mediaQuery.padding);
    final inflatedRect = rect.inflate(6);

    const double cardWidth = 232.0;
    const double minLeft = 16.0;
    final double maxLeft =
        math.max(minLeft, screenSize.width - cardWidth - 16.0);
    final double cardLeft =
        (inflatedRect.center.dx - cardWidth / 2).clamp(minLeft, maxLeft);
    final double caretCenterX =
        (inflatedRect.center.dx - cardLeft).clamp(24.0, cardWidth - 24.0);

    final bool showBelow =
        inflatedRect.bottom + 190 <
            screenSize.height - mediaQuery.padding.bottom - 64;

    return Material(
      color: Colors.transparent,
      child: Stack(
        children: [
          // 1. Neutral dark backdrop with rounded cutout & dashed white border (no green)
          Positioned.fill(
            child: GestureDetector(
              onTap: _nextStep,
              child: CustomPaint(
                painter: _SpotlightPainter(targetRect: rect),
              ),
            ),
          ),

          // 2. Compact white speech-bubble popover card with pointer caret
          Positioned(
            left: cardLeft,
            top: showBelow ? inflatedRect.bottom + 8 : null,
            bottom:
                showBelow ? null : (screenSize.height - inflatedRect.top + 8),
            width: cardWidth,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              child: _SpeechBubblePopover(
                key: ValueKey<int>(displayStepNumber),
                step: step,
                displayStepNumber: displayStepNumber,
                totalSteps: effectiveTotalSteps,
                isLast: isFinalOverallStep,
                caretOnTop: showBelow,
                caretCenterX: caretCenterX,
                onNext: _nextStep,
              ),
            ),
          ),

          // 3. Bottom-right floating circular close ('X') button
          Positioned(
            right: 22,
            bottom: mediaQuery.padding.bottom + 82,
            child: Semantics(
              button: true,
              label: 'Close walkthrough',
              child: GestureDetector(
                onTap: widget.onDismiss ?? widget.onFinish,
                behavior: HitTestBehavior.opaque,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.48),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.16),
                      width: 1,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    LucideIcons.x,
                    color: Colors.white,
                    size: 20,
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

class _SpeechBubblePopover extends StatelessWidget {
  const _SpeechBubblePopover({
    super.key,
    required this.step,
    required this.displayStepNumber,
    required this.totalSteps,
    required this.isLast,
    required this.caretOnTop,
    required this.caretCenterX,
    required this.onNext,
  });

  final WalkthroughStepData step;
  final int displayStepNumber;
  final int totalSteps;
  final bool isLast;
  final bool caretOnTop;
  final double caretCenterX;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    const double caretHeight = 9.0;

    return CustomPaint(
      painter: _SpeechBubbleBackgroundPainter(
        caretOnTop: caretOnTop,
        caretCenterX: caretCenterX,
        caretHeight: caretHeight,
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          caretOnTop ? 15 + caretHeight : 15,
          16,
          caretOnTop ? 14 : 14 + caretHeight,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (step.title.trim().isNotEmpty) ...[
              Text(
                step.title,
                style: const TextStyle(
                  color: Color(0xFF111827),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 8),
            ],
            Text(
              step.description,
              style: const TextStyle(
                color: Color(0xFF1F2937),
                fontSize: 13,
                fontWeight: FontWeight.w500,
                height: 1.36,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '$displayStepNumber',
                        style: const TextStyle(
                          color: Color(0xFF111827),
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextSpan(
                        text: '/$totalSteps',
                        style: const TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Material(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(8),
                  child: InkWell(
                    onTap: onNext,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 7,
                      ),
                      child: Text(
                        isLast ? 'OK' : 'Next',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
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
    );
  }
}

class _SpeechBubbleBackgroundPainter extends CustomPainter {
  const _SpeechBubbleBackgroundPainter({
    required this.caretOnTop,
    required this.caretCenterX,
    required this.caretHeight,
  });

  final bool caretOnTop;
  final double caretCenterX;
  final double caretHeight;

  @override
  void paint(Canvas canvas, Size size) {
    const double caretHalfWidth = 8.0;
    const double radius = 14.0;

    final Rect bodyRect = caretOnTop
        ? Rect.fromLTWH(0, caretHeight, size.width, size.height - caretHeight)
        : Rect.fromLTWH(0, 0, size.width, size.height - caretHeight);

    final Path bubblePath = Path()
      ..addRRect(
          RRect.fromRectAndRadius(bodyRect, const Radius.circular(radius)));

    final Path caretPath = Path();
    if (caretOnTop) {
      caretPath
        ..moveTo(caretCenterX - caretHalfWidth, caretHeight + 1)
        ..lineTo(caretCenterX, 0)
        ..lineTo(caretCenterX + caretHalfWidth, caretHeight + 1)
        ..close();
    } else {
      final double bottomY = size.height - caretHeight;
      caretPath
        ..moveTo(caretCenterX - caretHalfWidth, bottomY - 1)
        ..lineTo(caretCenterX, size.height)
        ..lineTo(caretCenterX + caretHalfWidth, bottomY - 1)
        ..close();
    }

    final Path combined = Path.combine(
      PathOperation.union,
      bubblePath,
      caretPath,
    );

    canvas.drawShadow(combined, const Color(0x40000000), 14, false);
    canvas.drawPath(combined, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant _SpeechBubbleBackgroundPainter oldDelegate) {
    return oldDelegate.caretOnTop != caretOnTop ||
        oldDelegate.caretCenterX != caretCenterX ||
        oldDelegate.caretHeight != caretHeight;
  }
}

class _SpotlightPainter extends CustomPainter {
  const _SpotlightPainter({this.targetRect});

  final Rect? targetRect;

  @override
  void paint(Canvas canvas, Size size) {
    final fullRect = Offset.zero & size;
    // Pure neutral dark overlay (no green tint)
    final overlayPaint = Paint()..color = const Color(0xB8000000);

    if (targetRect == null) {
      canvas.drawRect(fullRect, overlayPaint);
      return;
    }

    final inflated = targetRect!.inflate(6);
    final rrect = RRect.fromRectAndRadius(inflated, const Radius.circular(12));

    final cutoutPath = Path()
      ..addRect(fullRect)
      ..addRRect(rrect)
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(cutoutPath, overlayPaint);

    // Subtle dashed white/neutral border around the cutout (zero green)
    final borderRRect = RRect.fromRectAndRadius(
      inflated.inflate(1.5),
      const Radius.circular(13),
    );
    final borderPath = Path()..addRRect(borderRRect);
    final dashedPath = _createDashedPath(
      borderPath,
      dashLength: 5.0,
      dashGap: 4.0,
    );

    final borderPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.78)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(dashedPath, borderPaint);
  }

  Path _createDashedPath(
    Path source, {
    required double dashLength,
    required double dashGap,
  }) {
    final Path dest = Path();
    for (final metric in source.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        final double next = math.min(distance + dashLength, metric.length);
        dest.addPath(metric.extractPath(distance, next), Offset.zero);
        distance += dashLength + dashGap;
      }
    }
    return dest;
  }

  @override
  bool shouldRepaint(covariant _SpotlightPainter oldDelegate) {
    return oldDelegate.targetRect != targetRect;
  }
}
