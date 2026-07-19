import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class AppPageHeader extends StatelessWidget {
  const AppPageHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.onBack,
    this.trailing,
    this.centered = false,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onBack;
  final Widget? trailing;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    if (centered) {
      return Stack(
        alignment: Alignment.center,
        children: [
          if (onBack != null)
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                tooltip: 'Back',
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 52),
            child: Column(
              children: [
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.gray900,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.gray500,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null)
            Align(alignment: Alignment.centerRight, child: trailing),
        ],
      );
    }

    return Row(
      children: [
        if (onBack != null) ...[
          IconButton.filledTonal(
            tooltip: 'Back',
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_rounded),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.gray900,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(color: AppColors.gray500, fontSize: 12),
              ),
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}
