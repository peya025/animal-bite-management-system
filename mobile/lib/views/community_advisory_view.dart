import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/community_bite_overview.dart';
import '../services/api.dart';

/// Displays a single clinic-approved community advisory after live revalidation.
/// Withdrawn, expired, or unavailable items always show a neutral state.
class CommunityAdvisoryView extends StatefulWidget {
  const CommunityAdvisoryView({
    super.key,
    required this.advisoryId,
    this.loadDetail,
    this.onBookVisit,
  });

  final int advisoryId;
  final Future<CommunityAdvisoryDetailResult> Function(int advisoryId)?
  loadDetail;
  final VoidCallback? onBookVisit;

  @override
  State<CommunityAdvisoryView> createState() => _CommunityAdvisoryViewState();
}

class _CommunityAdvisoryViewState extends State<CommunityAdvisoryView>
    with WidgetsBindingObserver {
  CommunityAdvisoryDetailResult? _result;
  bool _loaded = false;
  bool _failed = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _load();
    }
  }

  @override
  void didUpdateWidget(covariant CommunityAdvisoryView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.advisoryId != widget.advisoryId) {
      _load();
    }
  }

  Future<void> _load() async {
    final request = ++_request;
    if (mounted) {
      setState(() {
        _result = null;
        _loaded = false;
        _failed = false;
      });
    }
    try {
      final result =
          await (widget.loadDetail?.call(widget.advisoryId) ??
              api.fetchCommunityAdvisoryDetail(widget.advisoryId)
                  as Future<CommunityAdvisoryDetailResult>);
      if (!mounted || request != _request) {
        return;
      }
      setState(() {
        _result = result;
        _loaded = true;
        _failed = false;
      });
    } catch (_) {
      if (!mounted || request != _request) {
        return;
      }
      setState(() {
        _result = null;
        _loaded = true;
        _failed = true;
      });
    }
  }

  String _date(DateTime value) => value
      .toUtc()
      .add(const Duration(hours: 8))
      .toIso8601String()
      .substring(0, 10);

  String _typeLabel(String type) => switch (type) {
    'routine_education' => 'Routine education',
    'official_health_advisory' => 'Official health advisory',
    _ => 'Community awareness',
  };

  @override
  Widget build(BuildContext context) {
    final result = _result;
    final advisory = result?.advisory;
    final isActive = result != null && result.isActive && advisory != null;

    return Scaffold(
      backgroundColor: AppColors.pageBackground,
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: const Text(
          'Community Bite Awareness',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh advisory status',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!_loaded)
                    const Row(
                      children: [
                        SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Checking current advisory status…',
                          style: TextStyle(
                            fontSize: 13.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    )
                  else if (_failed || result == null)
                    const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.cloud_off_outlined,
                          color: AppColors.textSecondary,
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'This advisory is temporarily unavailable. This does not mean an area is free of risk.',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.textPrimary,
                              height: 1.45,
                            ),
                          ),
                        ),
                      ],
                    )
                  else if (!isActive) ...[
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.info_outline_rounded,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            result.status == 'not_found'
                                ? 'This advisory is not available.'
                                : (result.message?.isNotEmpty == true
                                      ? result.message!
                                      : 'This clinic advisory is no longer active. Check current clinic guidance if you need help.'),
                            style: const TextStyle(
                              fontSize: 14.5,
                              color: AppColors.textPrimary,
                              height: 1.45,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.gray50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        result.disclaimer.isNotEmpty
                            ? result.disclaimer
                            : 'Facility-reviewed clinic guidance only. Reports of animal bites do not by themselves confirm rabies infection.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        _typeLabel(advisory.advisoryType),
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      advisory.title,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.verified_outlined,
                          size: 16,
                          color: AppColors.primaryDark,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            '${advisory.scopeLabel} · Reviewed by clinic: ${_date(advisory.reviewedAt!)} · Valid through ${_date(advisory.expiresAt!)} (Manila)',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Divider(height: 1, color: AppColors.divider),
                    ),
                    Text(
                      advisory.body,
                      style: const TextStyle(
                        fontSize: 14.5,
                        color: AppColors.textPrimary,
                        height: 1.55,
                      ),
                    ),
                    if (advisory.source != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Official source attribution',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Authority: ${advisory.source!.authority} · Issued: ${advisory.source!.issuedOn}',
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Reference: ${advisory.source!.reference}',
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Geographical relevance: ${advisory.source!.geographyNote}',
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.gray50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        result.disclaimer.isNotEmpty
                            ? result.disclaimer
                            : 'Facility-reviewed clinic guidance only. Reports of animal bites do not by themselves confirm rabies infection.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed:
                    widget.onBookVisit ??
                    () => Navigator.of(context).pushNamed(AppRoutes.booking),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primaryDark,
                  foregroundColor: AppColors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.medical_services_outlined, size: 18),
                label: const Text(
                  'Contact or book a clinic visit',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ),
            const SizedBox(height: 10),
            const Center(
              child: Text(
                'Do not wait for an advisory or a booked appointment to seek needed care.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
