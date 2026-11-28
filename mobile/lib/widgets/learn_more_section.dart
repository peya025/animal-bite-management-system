import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/clinic_resource.dart';
import '../services/resources_repository.dart';
import 'link_resource_card.dart';
import 'video_resource_card.dart';

class LearnMoreSection extends StatefulWidget {
  const LearnMoreSection({
    super.key,
    this.repository,
    this.refreshTrigger = 0,
  });

  final ResourcesRepository? repository;
  final int refreshTrigger;

  @override
  State<LearnMoreSection> createState() => LearnMoreSectionState();
}

class LearnMoreSectionState extends State<LearnMoreSection> {
  bool _isLoading = true;
  bool _hasError = false;
  bool _showAll = false;
  List<ClinicResource> _resources = const <ClinicResource>[];

  @override
  void initState() {
    super.initState();
    _loadResources();
  }

  @override
  void didUpdateWidget(covariant LearnMoreSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshTrigger != widget.refreshTrigger ||
        oldWidget.repository != widget.repository) {
      _loadResources();
    }
  }

  @override
  void reassemble() {
    super.reassemble();
    _loadResources();
  }

  Future<void> refresh() => _loadResources();

  Future<void> _loadResources() async {
    final repo = widget.repository ?? ResourcesRepository.instance;
    try {
      final items = await repo.fetchActiveResources();
      if (!mounted) return;
      setState(() {
        _resources = items;
        _isLoading = false;
        _hasError = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _resources = const <ClinicResource>[];
        _isLoading = false;
        _hasError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.only(top: 20),
        child: _LearnMoreSkeleton(),
      );
    }

    if (_hasError || _resources.isEmpty) {
      return const SizedBox.shrink();
    }

    final hasMoreThanTwo = _resources.length > 2;
    final visibleItems =
        (!hasMoreThanTwo || _showAll) ? _resources : _resources.take(2).toList();

    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                context.tr('learn_more_section_title'),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF9CA3AF),
                  letterSpacing: 0.06,
                ),
              ),
              if (hasMoreThanTwo)
                Semantics(
                  button: true,
                  label: _showAll
                      ? context.tr('learn_more_show_less')
                      : context.tr('learn_more_see_all'),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(6),
                    onTap: () {
                      setState(() {
                        _showAll = !_showAll;
                      });
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 2,
                      ),
                      child: Text(
                        _showAll
                            ? context.tr('learn_more_show_less')
                            : context.tr('learn_more_see_all'),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF1D9E75),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < visibleItems.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            _buildResourceCard(visibleItems[i]),
          ],
        ],
      ),
    );
  }

  Widget _buildResourceCard(ClinicResource item) {
    switch (item.type) {
      case ClinicResourceType.video:
        return VideoResourceCard(resource: item);
      case ClinicResourceType.link:
        return LinkResourceCard(resource: item);
    }
  }
}

class _LearnMoreSkeleton extends StatelessWidget {
  const _LearnMoreSkeleton();

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header skeleton row matching 11px header height
          Row(
            children: [
              Container(
                width: 76,
                height: 12,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Video card skeleton matching 150px preview + 58px body
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFFE5E7EB),
                width: 0.5,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  height: 150,
                  color: const Color(0xFFE5E7EB),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 14,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              height: 14,
                              width: 180,
                              decoration: BoxDecoration(
                                color: const Color(0xFFE5E7EB),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              height: 11,
                              width: 130,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3F4F6),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          // Link card skeleton matching 62px height
          Container(
            padding: const EdgeInsets.symmetric(
              vertical: 12,
              horizontal: 14,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: const Color(0xFFE5E7EB),
                width: 0.5,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(11),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 13,
                        width: 160,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5E7EB),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 5),
                      Container(
                        height: 10,
                        width: 90,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
