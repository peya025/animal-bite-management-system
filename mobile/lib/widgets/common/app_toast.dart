import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

enum ToastType { info, success, error, warning }

class AppToast {
  static OverlayEntry? _currentEntry;

  /// Shows a sleek, modern floating pill toast at the top of the screen.
  /// Because it uses Overlay, it never displaces or animates the center-docked FAB.
  static void show(
    BuildContext context,
    String message, {
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 3),
    IconData? customIcon,
  }) {
    _currentEntry?.remove();
    _currentEntry = null;

    final overlay = Overlay.of(context, rootOverlay: true);

    final iconData = customIcon ??
        switch (type) {
          ToastType.success => LucideIcons.checkCircle2,
          ToastType.error => LucideIcons.alertCircle,
          ToastType.warning => LucideIcons.alertTriangle,
          ToastType.info => LucideIcons.info,
        };

    final iconColor = switch (type) {
      ToastType.success => const Color(0xFF34D399),
      ToastType.error => const Color(0xFFF87171),
      ToastType.warning => const Color(0xFFFBBF24),
      ToastType.info => const Color(0xFF60A5FA),
    };

    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (context) => _TopToastWidget(
        message: message,
        icon: iconData,
        iconColor: iconColor,
        onDismiss: () {
          if (_currentEntry == entry) {
            entry.remove();
            _currentEntry = null;
          }
        },
      ),
    );

    _currentEntry = entry;
    overlay.insert(entry);

    Future.delayed(duration, () {
      if (_currentEntry == entry) {
        entry.remove();
        _currentEntry = null;
      }
    });
  }

  static void info(BuildContext context, String message) =>
      show(context, message, type: ToastType.info);

  static void success(BuildContext context, String message) =>
      show(context, message, type: ToastType.success);

  static void error(BuildContext context, String message) =>
      show(context, message, type: ToastType.error);

  static void warning(BuildContext context, String message) =>
      show(context, message, type: ToastType.warning);
}

class _TopToastWidget extends StatefulWidget {
  const _TopToastWidget({
    required this.message,
    required this.icon,
    required this.iconColor,
    required this.onDismiss,
  });

  final String message;
  final IconData icon;
  final Color iconColor;
  final VoidCallback onDismiss;

  @override
  State<_TopToastWidget> createState() => _TopToastWidgetState();
}

class _TopToastWidgetState extends State<_TopToastWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -0.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.paddingOf(context).top + 10;

    return Positioned(
      top: topPadding,
      left: 20,
      right: 20,
      child: Material(
        color: Colors.transparent,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: SlideTransition(
            position: _slideAnimation,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x33000000),
                        blurRadius: 16,
                        offset: Offset(0, 6),
                      ),
                    ],
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.1),
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        widget.icon,
                        color: widget.iconColor,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Flexible(
                        child: Text(
                          widget.message,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
