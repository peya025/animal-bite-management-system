import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../app/app_theme.dart';

class BookingHeader extends StatelessWidget {
  const BookingHeader({super.key, this.onGuidePressed});

  final VoidCallback? onGuidePressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFE5E7EB), width: 0.5),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Book appointment',
                  style: TextStyle(
                    color: Color(0xFF111827),
                    fontSize: 17,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Select a patient, service, and date',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if (onGuidePressed != null)
            Material(
              color: const Color(0xFFE1F5EE),
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                onTap: onGuidePressed,
                borderRadius: BorderRadius.circular(18),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.compass,
                        size: 13.5,
                        color: AppColors.primaryDark,
                      ),
                      SizedBox(width: 5),
                      Text(
                        'How to book',
                        style: TextStyle(
                          color: AppColors.primaryDark,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
