import 'package:flutter/material.dart';

import '../../app/app_theme.dart';
import '../../models/community_bite_overview.dart';
import '../../services/api.dart';

/// Compact, aggregate-only Community Bite Watch card for the mobile home page.
/// Never displays patient PII or small raw counts; surfaces calm barangay caution
/// notices, clinic vaccine readiness, and a 1-tap booking / first-aid action.
class CommunityBiteWatchCard extends StatefulWidget {
  const CommunityBiteWatchCard({
    super.key,
    required this.onBookVisit,
    this.userBarangay,
    this.refreshTrigger = 0,
    this.loadOverview,
  });

  final VoidCallback onBookVisit;
  final String? userBarangay;
  final int refreshTrigger;
  final Future<CommunityBiteOverview> Function()? loadOverview;

  @override
  State<CommunityBiteWatchCard> createState() => _CommunityBiteWatchCardState();
}

class _CommunityBiteWatchCardState extends State<CommunityBiteWatchCard> {
  CommunityBiteOverview? _overview;
  bool _loaded = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant CommunityBiteWatchCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      _load();
    }
  }

  Future<void> _load() async {
    final req = ++_request;
    try {
      final result =
          await (widget.loadOverview?.call() ??
              api.fetchCommunityBiteOverview()
                  as Future<CommunityBiteOverview>);
      if (!mounted || req != _request) return;
      setState(() {
        _overview = result;
        _loaded = true;
      });
    } catch (_) {
      if (!mounted || req != _request) return;
      setState(() => _loaded = true);
    }
  }

  bool _matchesUserBarangay(String barangay) {
    final userBrgy = widget.userBarangay?.trim().toLowerCase() ?? '';
    if (userBrgy.isEmpty) return false;
    final cleanTarget = barangay.trim().toLowerCase();
    return cleanTarget == userBrgy ||
        userBrgy.contains(cleanTarget) ||
        cleanTarget.contains(userBrgy);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _overview == null) {
      return const SizedBox.shrink();
    }

    final overview = _overview!;
    final hasCaution = overview.hasCaution;
    final accentColor = hasCaution
        ? const Color(0xFFB45309)
        : const Color(0xFF0F766E);
    final softBg = hasCaution
        ? const Color(0xFFFFFBEB)
        : const Color(0xFFF0FDFA);
    final borderColor = hasCaution
        ? const Color(0xFFFDE68A)
        : const Color(0xFFCCFBF1);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: softBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  hasCaution
                      ? Icons.health_and_safety_outlined
                      : Icons.verified_user_outlined,
                  size: 19,
                  color: accentColor,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Community Bite Watch',
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      '${overview.municipality} · Last 7 days',
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 9,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: softBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor),
                ),
                child: Text(
                  hasCaution ? 'Stay Cautious' : 'Normal',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: accentColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            overview.headline,
            style: const TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
              height: 1.35,
            ),
          ),
          if (hasCaution) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: overview.elevatedAreas.map((area) {
                final nearUser = _matchesUserBarangay(area.barangay);
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: nearUser
                        ? const Color(0xFFFEF2F2)
                        : const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: nearUser
                          ? const Color(0xFFFECACA)
                          : const Color(0xFFFDE68A),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        size: 13.5,
                        color: nearUser
                            ? const Color(0xFFB91C1C)
                            : const Color(0xFFB45309),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        nearUser
                            ? 'Brgy. ${area.barangay} (Near you)'
                            : 'Brgy. ${area.barangay}',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: nearUser
                              ? const Color(0xFFB91C1C)
                              : const Color(0xFF92400E),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
          if (overview.guidance.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              overview.guidance,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF475569),
                height: 1.45,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: overview.vaccineAvailability.arvAvailable
                  ? const Color(0xFFECFDF5)
                  : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: overview.vaccineAvailability.arvAvailable
                    ? const Color(0xFFA7F3D0)
                    : const Color(0xFFE2E8F0),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.vaccines_outlined,
                  size: 16,
                  color: overview.vaccineAvailability.arvAvailable
                      ? const Color(0xFF047857)
                      : const Color(0xFF64748B),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    overview.vaccineAvailability.statusLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: overview.vaccineAvailability.arvAvailable
                          ? const Color(0xFF065F46)
                          : const Color(0xFF475569),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: widget.onBookVisit,
              icon: const Icon(Icons.medical_services_outlined, size: 16),
              label: const Text('Bitten or scratched? Book ABTC visit'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 10),
                textStyle: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
