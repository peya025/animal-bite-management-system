import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class ReExposureProtocolCard extends StatelessWidget {
  const ReExposureProtocolCard({
    super.key,
    this.onTap,
  });

  /// Optional custom tap handler, defaults to launching the DOH guidance URL.
  final VoidCallback? onTap;

  static const String dohGuidanceUrl =
      'https://doh.gov.ph/rabies-prevention-and-control';

  Future<void> _handleTap() async {
    if (onTap != null) {
      onTap!();
      return;
    }
    final uri = Uri.parse(dohGuidanceUrl);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFE5E7EB), width: 0.5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Icon box
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.info_outline,
                color: Color(0xFFF59E0B),
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            // Text
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Re-exposure protocol',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF111827),
                    ),
                  ),
                  SizedBox(height: 1),
                  Text(
                    'Bitten again? DOH booster guidance applies',
                    style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // View link
            const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'View',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1D9E75),
                  ),
                ),
                SizedBox(width: 4),
                Icon(Icons.open_in_new, size: 13, color: Color(0xFF1D9E75)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
