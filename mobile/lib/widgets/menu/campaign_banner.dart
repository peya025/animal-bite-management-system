import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class CampaignBanner extends StatelessWidget {
  const CampaignBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 360;
        final imageWidth = compact ? 150.0 : 190.0;

        return Container(
          height: 184,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Stack(
            children: [
              Positioned(
                left: compact ? -40 : -28,
                top: 0,
                bottom: 0,
                width: imageWidth,
                child: Image.asset(
                  'assets/images/anti_rabies_health_worker.png',
                  fit: BoxFit.cover,
                  alignment: Alignment.centerLeft,
                ),
              ),
              Positioned(
                left: compact ? 128 : 170,
                right: 16,
                top: 18,
                bottom: 16,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.white.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'MARCH 2026',
                        style: TextStyle(
                          color: AppColors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Anti-Rabies\nAwareness Month',
                        style: TextStyle(
                          color: AppColors.white,
                          fontSize: compact ? 19 : 23,
                          height: 1.05,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const Spacer(),
                    const _WorkflowButton(),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _WorkflowButton extends StatefulWidget {
  const _WorkflowButton();

  @override
  State<_WorkflowButton> createState() => _WorkflowButtonState();
}

class _WorkflowButtonState extends State<_WorkflowButton> {
  bool _hovered = false;
  bool _pressed = false;

  bool get _arrowActive => _hovered || _pressed;

  void _setHovered(bool value) {
    if (_hovered != value) setState(() => _hovered = value);
  }

  void _setPressed(bool value) {
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => _setHovered(true),
      onExit: (_) => _setHovered(false),
      child: Listener(
        onPointerDown: (_) => _setPressed(true),
        onPointerUp: (_) => _setPressed(false),
        onPointerCancel: (_) => _setPressed(false),
        child: TextButton.icon(
          onPressed: () {},
          style: TextButton.styleFrom(
            backgroundColor: AppColors.white,
            foregroundColor: AppColors.primaryDark,
            elevation: 2,
            shadowColor: const Color(0x33000000),
            side: const BorderSide(color: Color(0x3308766D)),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            shape: const StadiumBorder(),
          ),
          iconAlignment: IconAlignment.end,
          icon: AnimatedSlide(
            duration: const Duration(milliseconds: 140),
            curve: Curves.easeOut,
            offset: Offset(_arrowActive ? 0.18 : 0, 0),
            child: const Icon(Icons.arrow_forward_rounded, size: 17),
          ),
          label: const Text(
            'View workflow',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}
