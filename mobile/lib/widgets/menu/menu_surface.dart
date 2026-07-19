import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class MenuSurface extends StatelessWidget {
  const MenuSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.height,
    this.onTap,
    this.color = AppColors.white,
    this.showBorder = true,
    this.showShadow = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double? height;
  final VoidCallback? onTap;
  final Color color;
  final bool showBorder;
  final bool showShadow;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: height,
          padding: padding,
          decoration: BoxDecoration(
            border: showBorder ? Border.all(color: AppColors.border) : null,
            borderRadius: BorderRadius.circular(8),
            boxShadow: showShadow
                ? const [
                    BoxShadow(
                      color: Color(0x0D111827),
                      blurRadius: 12,
                      offset: Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: child,
        ),
      ),
    );
  }
}
