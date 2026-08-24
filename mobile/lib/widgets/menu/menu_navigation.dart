import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../app/app_theme.dart';
import '../../l10n/app_localizations.dart';

class MenuNavigation extends StatelessWidget {
  const MenuNavigation({
    super.key,
    required this.selectedIndex,
    required this.onSelected,
    this.showFabNotch = true,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final bool showFabNotch;

  @override
  Widget build(BuildContext context) {
    final items = [
      _NavigationItem(
        LucideIcons.home,
        LucideIcons.home,
        context.tr('nav_home'),
      ),
      _NavigationItem(
        LucideIcons.calendarPlus,
        LucideIcons.calendarPlus,
        context.tr('nav_book'),
      ),
      _NavigationItem(
        LucideIcons.history,
        LucideIcons.history,
        context.tr('nav_history'),
      ),
      _NavigationItem(
        LucideIcons.settings,
        LucideIcons.settings,
        context.tr('nav_settings'),
      ),
    ];

    final bottomPadding = MediaQuery.paddingOf(context).bottom;

    return CustomPaint(
      painter: _CurvedNotchPainter(
        showNotch: showFabNotch,
        backgroundColor: Colors.white,
        borderColor: const Color(0xFFD1D5DB),
        shadowColor: const Color(0x1A000000),
      ),
      child: SizedBox(
        height: 64 + bottomPadding,
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 64,
            child: Row(
              children: [
                Expanded(
                  child: _NavigationDestination(
                    item: items[0],
                    selected: selectedIndex == 0,
                    onTap: () => onSelected(0),
                  ),
                ),
                Expanded(
                  child: _NavigationDestination(
                    item: items[1],
                    selected: selectedIndex == 1,
                    onTap: () => onSelected(1),
                  ),
                ),
                if (showFabNotch) const SizedBox(width: 72),
                Expanded(
                  child: _NavigationDestination(
                    item: items[2],
                    selected: selectedIndex == 2,
                    onTap: () => onSelected(2),
                  ),
                ),
                Expanded(
                  child: _NavigationDestination(
                    item: items[3],
                    selected: selectedIndex == 3,
                    onTap: () => onSelected(3),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CurvedNotchPainter extends CustomPainter {
  const _CurvedNotchPainter({
    required this.showNotch,
    this.backgroundColor = Colors.white,
    this.borderColor = const Color(0xFFD1D5DB),
    this.shadowColor = const Color(0x1A000000),
  });

  static const double notchRadius = 35.0;
  static const double shoulderRadius = 12.0;

  final bool showNotch;
  final Color backgroundColor;
  final Color borderColor;
  final Color shadowColor;

  Path _createTopCurvePath(Size size) {
    final path = Path();
    path.moveTo(0, 0);

    if (showNotch) {
      final cx = size.width / 2;
      const r = notchRadius;
      const s = shoulderRadius;

      path.lineTo(cx - r - s, 0);

      // Smooth shoulder rounding down from top edge into notch
      path.cubicTo(
        cx - r - s * 0.35,
        0,
        cx - r,
        s * 0.25,
        cx - r + 2.0,
        s * 0.75,
      );

      // Circular cradle under floating button (dips to depth r = 35.0, leaving 10px gap below 25px radius button)
      path.cubicTo(
        cx - r * 0.65,
        r * 0.98,
        cx - r * 0.25,
        r,
        cx,
        r,
      );

      // Right side of cradle climbing up
      path.cubicTo(
        cx + r * 0.25,
        r,
        cx + r * 0.65,
        r * 0.98,
        cx + r - 2.0,
        s * 0.75,
      );

      // Smooth shoulder rounding up to top edge
      path.cubicTo(
        cx + r,
        s * 0.25,
        cx + r + s * 0.35,
        0,
        cx + r + s,
        0,
      );
    }

    path.lineTo(size.width, 0);
    return path;
  }

  Path _createBarPath(Size size) {
    final path = _createTopCurvePath(size);
    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final barPath = _createBarPath(size);
    final topBorderPath = _createTopCurvePath(size);

    // 1. Soft top shadow for entire bar including curved notch
    final shadowPaint = Paint()
      ..color = shadowColor
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawPath(barPath.shift(const Offset(0, -2)), shadowPaint);

    // 2. White bar background fill
    final fillPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.fill;
    canvas.drawPath(barPath, fillPaint);

    // 3. Subtle ambient inner depth shadow along the cradle groove
    if (showNotch) {
      final cx = size.width / 2;
      final cradleShadowPath = Path();
      cradleShadowPath.moveTo(cx - notchRadius - shoulderRadius * 0.5, 0);
      cradleShadowPath.cubicTo(
        cx - notchRadius * 0.8,
        notchRadius * 0.35,
        cx - notchRadius * 0.4,
        notchRadius,
        cx,
        notchRadius,
      );
      cradleShadowPath.cubicTo(
        cx + notchRadius * 0.4,
        notchRadius,
        cx + notchRadius * 0.8,
        notchRadius * 0.35,
        cx + notchRadius + shoulderRadius * 0.5,
        0,
      );

      final cradleShadePaint = Paint()
        ..color = const Color(0x14000000)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.5
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);
      canvas.drawPath(cradleShadowPath.shift(const Offset(0, 1.5)), cradleShadePaint);
    }

    // 4. Visible top contour border line following the curve
    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawPath(topBorderPath, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _CurvedNotchPainter oldDelegate) {
    return oldDelegate.showNotch != showNotch ||
        oldDelegate.backgroundColor != backgroundColor ||
        oldDelegate.borderColor != borderColor ||
        oldDelegate.shadowColor != shadowColor;
  }
}

class _NavigationItem {
  const _NavigationItem(this.icon, this.selectedIcon, this.label);
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

class _NavigationDestination extends StatelessWidget {
  const _NavigationDestination({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _NavigationItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            selected ? item.selectedIcon : item.icon,
            size: 20,
            color: selected ? AppColors.primary : const Color(0xFF9CA3AF),
          ),
          const SizedBox(height: 2),
          Text(
            item.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: selected ? FontWeight.w500 : FontWeight.w400,
              color: selected ? AppColors.primary : const Color(0xFF9CA3AF),
            ),
          ),
        ],
      ),
    );
  }
}
