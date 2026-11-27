import 'dart:async';
import 'package:flutter/material.dart';
import '../../app/app_routes.dart';
import '../../app/app_theme.dart';
import '../../models/community_bite_overview.dart';
import '../../services/api.dart';

/// Only approved advisories are displayed; legacy computed areas are ignored.
class CommunityBiteWatchCard extends StatefulWidget {
  const CommunityBiteWatchCard({
    super.key,
    this.onBookVisit,
    this.userBarangay,
    this.clinicId,
    this.clinics = const [],
    this.onClinicChanged,
    this.onOpenAdvisory,
    this.refreshTrigger = 0,
    this.loadOverview,
  });

  final VoidCallback? onBookVisit; // Retained for caller compatibility.
  final String?
  userBarangay; // Retained for caller compatibility; never infers risk.
  final int? clinicId;
  final List<PublicClinicOption> clinics;
  final ValueChanged<int>? onClinicChanged;
  final ValueChanged<CommunityAdvisory>? onOpenAdvisory;
  final int refreshTrigger;
  final Future<CommunityBiteOverview> Function()? loadOverview;

  @override
  State<CommunityBiteWatchCard> createState() => _CommunityBiteWatchCardState();
}

class _CommunityBiteWatchCardState extends State<CommunityBiteWatchCard>
    with WidgetsBindingObserver {
  CommunityBiteOverview? _overview;
  int? _selectedClinicId;
  bool _loaded = false;
  int _request = 0;
  Timer? _refresh;

  @override
  void initState() {
    super.initState();
    _selectedClinicId =
        widget.clinicId ??
        (widget.clinics.isNotEmpty ? widget.clinics.first.id : null);
    WidgetsBinding.instance.addObserver(this);
    _load();
    _refresh = Timer.periodic(const Duration(minutes: 1), (_) => _load());
  }

  @override
  void dispose() {
    _refresh?.cancel();
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
  void didUpdateWidget(covariant CommunityBiteWatchCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.clinicId != widget.clinicId) {
      _selectedClinicId = widget.clinicId;
      _load();
      return;
    }
    if (oldWidget.refreshTrigger != widget.refreshTrigger ||
        oldWidget.userBarangay != widget.userBarangay) {
      _load();
    }
  }

  Future<void> _load() async {
    final request = ++_request;
    // Do not keep presenting a cached publication while its status is unknown.
    if (mounted) {
      setState(() {
        _overview = null;
        _loaded = false;
      });
    }
    try {
      final result =
          await (widget.loadOverview?.call() ??
              api.fetchCommunityBiteOverview(clinicId: _selectedClinicId)
                  as Future<CommunityBiteOverview>);
      if (!mounted || request != _request) {
        return;
      }
      setState(() {
        _overview = result;
        _loaded = true;
      });
    } catch (_) {
      if (!mounted || request != _request) {
        return;
      }
      setState(() {
        _overview = null;
        _loaded = true;
      });
    }
  }

  void _selectClinic(int? nextId) {
    if (nextId == null || nextId == _selectedClinicId) {
      return;
    }
    setState(() {
      _selectedClinicId = nextId;
    });
    widget.onClinicChanged?.call(nextId);
    _load();
  }

  void _openAdvisory(CommunityAdvisory advisory) {
    if (widget.onOpenAdvisory != null) {
      widget.onOpenAdvisory!(advisory);
      return;
    }
    if (advisory.id > 0) {
      Navigator.of(
        context,
      ).pushNamed(AppRoutes.communityAdvisory, arguments: advisory.id);
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
    final overview = _overview;
    final advisories =
        overview?.advisories.where((item) => item.isCurrent).toList() ?? [];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Compact header with top-right refresh icon
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: const Icon(
                    Icons.health_and_safety_outlined,
                    color: AppColors.primaryDark,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Community Bite Awareness',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.2,
                        ),
                      ),
                      if (overview != null)
                        Text(
                          overview.clinicName,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh community updates',
                  onPressed: _load,
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(
                    Icons.refresh_rounded,
                    size: 20,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),

            // Optional multi-clinic selector
            if (widget.clinics.length > 1) ...[
              const SizedBox(height: 10),
              DropdownButtonFormField<int>(
                initialValue: _selectedClinicId,
                decoration: InputDecoration(
                  labelText: 'Clinic',
                  isDense: true,
                  filled: true,
                  fillColor: AppColors.surfaceMuted,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
                items: [
                  for (final clinic in widget.clinics)
                    DropdownMenuItem<int>(
                      value: clinic.id,
                      child: Text(
                        clinic.name,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                ],
                onChanged: _selectClinic,
              ),
            ],

            const SizedBox(height: 12),

            // Single concise status or advisory block
            if (!_loaded)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    SizedBox(
                      width: 15,
                      height: 15,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(width: 10),
                    Text(
                      'Checking clinic updates…',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              )
            else if (overview == null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.cloud_off_outlined,
                      size: 17,
                      color: AppColors.textSecondary,
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Community updates are temporarily unavailable.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else ...[
              if (advisories.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        size: 17,
                        color: AppColors.primaryDark,
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'No current clinic advisory. Bite-prevention information is available.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textPrimary,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              for (final advisory in advisories)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight.withValues(alpha: 0.45),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.28),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.35),
                          ),
                        ),
                        child: Text(
                          _typeLabel(advisory.advisoryType),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        advisory.title,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        advisory.body,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textPrimary,
                          height: 1.4,
                        ),
                      ),
                      if (advisory.source != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Official source: ${advisory.source!.authority} (${advisory.source!.issuedOn})',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(
                            Icons.verified_outlined,
                            size: 14,
                            color: AppColors.primaryDark,
                          ),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              'Reviewed by clinic: ${_date(advisory.reviewedAt!)} · Valid through ${_date(advisory.expiresAt!)} (Manila)',
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (advisory.id > 0 || widget.onOpenAdvisory != null) ...[
                        const SizedBox(height: 4),
                        TextButton.icon(
                          onPressed: () => _openAdvisory(advisory),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 2,
                              vertical: 2,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            foregroundColor: AppColors.primaryDark,
                          ),
                          icon: const Icon(
                            Icons.arrow_forward_rounded,
                            size: 15,
                          ),
                          label: const Text(
                            'Read full advisory',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

              const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: Divider(height: 1, color: AppColors.divider),
              ),

              // Vaccine availability (compact 1-line row)
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.vaccines_outlined,
                    size: 17,
                    color: AppColors.primaryDark,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${overview.vaccineAvailability.statusLabel} · Confirm availability with the clinic.',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // Single concise disclaimer footer (no repetition)
              Text(
                overview.disclaimer.isNotEmpty
                    ? overview.disclaimer
                    : 'Animal bite reports do not by themselves confirm rabies infection. The absence of an advisory does not mean an area is free of risk.',
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textSecondary,
                  height: 1.35,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
