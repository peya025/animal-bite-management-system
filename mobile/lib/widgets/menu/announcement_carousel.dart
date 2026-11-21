import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../app/app_theme.dart';
import '../../models/announcement.dart';
import '../../services/api.dart';

/// The original campaign remains the first page, including its guide actions.
class AnnouncementCarousel extends StatefulWidget {
  const AnnouncementCarousel({
    super.key,
    required this.welcome,
    this.refreshTrigger = 0,
    this.loadAnnouncements,
  });

  final Widget welcome;
  final int refreshTrigger;
  final Future<List<Announcement>> Function()? loadAnnouncements;

  @override
  State<AnnouncementCarousel> createState() => AnnouncementCarouselState();
}

class AnnouncementCarouselState extends State<AnnouncementCarousel> {
  final _controller = PageController();
  List<Announcement> _items = [];
  double? _welcomeHeight;
  final Map<int, double> _pageHeights = {};
  final Set<int> _expandedIds = {};
  int _page = 0;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant AnnouncementCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshTrigger != widget.refreshTrigger) _load();
  }

  Future<void> _load() async {
    final request = ++_request;
    try {
      final items =
          await (widget.loadAnnouncements?.call() ??
              api.fetchAnnouncements() as Future<List<Announcement>>);
      if (!mounted || request != _request) return;
      showWelcome();
      setState(() {
        _items = items;
      });
    } catch (_) {
      // Keep the guide usable offline; pull-to-refresh retries the feed.
    }
  }

  void showWelcome() {
    if (_controller.hasClients) _controller.jumpToPage(0);
    if (mounted) {
      setState(() {
        _page = 0;
        _expandedIds.clear();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _go(int page) {
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.jumpToPage(page);
    } else {
      _controller.animateToPage(
        page,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  }

  double get _currentHeight {
    if (_page == 0) {
      return _welcomeHeight ?? 220;
    }
    final item = _items[_page - 1];
    final isExpanded = _expandedIds.contains(item.id);
    if (isExpanded) {
      return _pageHeights[_page] ?? (_welcomeHeight ?? 220) + 120;
    }
    return _welcomeHeight ?? 220;
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) return widget.welcome;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedSize(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: SizedBox(
            height: _currentHeight,
            child: PageView.builder(
              controller: _controller,
              itemCount: _items.length + 1,
              onPageChanged: (page) => setState(() => _page = page),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return OverflowBox(
                    alignment: Alignment.topCenter,
                    minHeight: 0,
                    maxHeight: double.infinity,
                    child: _MeasureHeight(
                      onHeight: (height) {
                        if (mounted && _welcomeHeight != height) {
                          setState(() => _welcomeHeight = height);
                        }
                      },
                      child: widget.welcome,
                    ),
                  );
                }
                final item = _items[index - 1];
                final isExpanded = _expandedIds.contains(item.id);
                return OverflowBox(
                  alignment: Alignment.topCenter,
                  minHeight: 0,
                  maxHeight: double.infinity,
                  child: _MeasureHeight(
                    onHeight: (height) {
                      if (mounted && _pageHeights[index] != height) {
                        setState(() => _pageHeights[index] = height);
                      }
                    },
                    child: _AnnouncementCard(
                      item: item,
                      minHeight: _welcomeHeight ?? 220,
                      isExpanded: isExpanded,
                      onToggle: () {
                        setState(() {
                          if (isExpanded) {
                            _expandedIds.remove(item.id);
                          } else {
                            _expandedIds.add(item.id);
                          }
                        });
                      },
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        if (_items.isNotEmpty) ...[
          const SizedBox(height: 6),
          Semantics(
            label: 'Home banner ${_page + 1} of ${_items.length + 1}',
            child: Wrap(
              alignment: WrapAlignment.center,
              children: List.generate(
                _items.length + 1,
                (index) => Semantics(
                  button: true,
                  selected: index == _page,
                  label: index == 0
                      ? 'Show patient guide'
                      : 'Show announcement $index: ${_items[index - 1].title}',
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: () => _go(index),
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: Center(
                        child: Container(
                          width: index == _page ? 22 : 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: index == _page
                                ? AppColors.primary
                                : const Color(0xFFC5D5CE),
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard({
    required this.item,
    required this.minHeight,
    required this.isExpanded,
    required this.onToggle,
  });

  final Announcement item;
  final double minHeight;
  final bool isExpanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primaryDark,
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onToggle,
        child: Stack(
          children: [
            // 1. Background image (cropped to fill)
            if (item.imageUrl != null)
              Positioned.fill(
                child: Image.network(
                  item.imageUrl!,
                  fit: BoxFit.cover,
                  excludeFromSemantics: true,
                  errorBuilder: (_, _, _) => const Center(
                    child: Icon(
                      Icons.campaign_outlined,
                      color: Colors.white24,
                      size: 72,
                    ),
                  ),
                ),
              ),

            // 2. Dark gradient overlay for consistent text contrast
            Positioned.fill(
              child: const IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black38,
                        Colors.black26,
                        Color(0xF0000000),
                      ],
                      stops: [0.0, 0.35, 1.0],
                    ),
                  ),
                ),
              ),
            ),

            // 3. Body content
            if (!isExpanded)
              // Collapsed state: exact hero minHeight with badge at top, title & button at bottom
              SizedBox(
                height: minHeight,
                width: double.infinity,
                child: Stack(
                  children: [
                    Positioned(
                      top: 14,
                      left: 16,
                      right: 16,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: _buildCategoryBadge(),
                      ),
                    ),
                    Positioned(
                      left: 16,
                      right: 14,
                      bottom: 14,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                height: 1.25,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          _buildToggleButton(),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            else
              // Expanded state: accordion pushes down with full message and details
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: minHeight),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildCategoryBadge(),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                height: 1.25,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          _buildToggleButton(),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        height: 1,
                        color: Colors.white.withValues(alpha: 0.2),
                      ),
                      const SizedBox(height: 12),
                      if (item.imageUrl != null) ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Image.network(
                            item.imageUrl!,
                            fit: BoxFit.contain,
                            width: double.infinity,
                            errorBuilder: (_, _, _) =>
                                const SizedBox.shrink(),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      SelectableText(
                        item.message,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13.5,
                          height: 1.55,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Material(
                          color: Colors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(20),
                          child: InkWell(
                            onTap: onToggle,
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 6.5,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.35),
                                  width: 0.8,
                                ),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.keyboard_arrow_up_rounded,
                                    size: 15,
                                    color: Colors.white,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'Close',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: item.isUrgent
            ? const Color(0xB3DC2626)
            : const Color(0xB3064E3B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        item.isUrgent ? 'IMPORTANT NOTICE' : 'CLINIC ANNOUNCEMENT',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: .7,
        ),
      ),
    );
  }

  Widget _buildToggleButton() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(16),
        child: Tooltip(
          message: isExpanded ? 'Collapse announcement' : 'View announcement',
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.14),
                  blurRadius: 4,
                  offset: const Offset(0, 1.5),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: AnimatedRotation(
              turns: isExpanded ? 0.5 : 0.0,
              duration: const Duration(milliseconds: 220),
              child: const Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 18,
                color: AppColors.primaryDark,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Measures unconstrained page content, preserving the existing hero's height
/// and allowing large accessibility text without clipping its buttons.
class _MeasureHeight extends SingleChildRenderObjectWidget {
  const _MeasureHeight({required this.onHeight, required super.child});
  final ValueChanged<double> onHeight;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _HeightReporter(onHeight);

  @override
  void updateRenderObject(
    BuildContext context,
    covariant _HeightReporter renderObject,
  ) {
    renderObject.onHeight = onHeight;
  }
}

class _HeightReporter extends RenderProxyBox {
  _HeightReporter(this.onHeight);
  ValueChanged<double> onHeight;
  double? _lastHeight;

  @override
  void performLayout() {
    super.performLayout();
    if (_lastHeight == size.height) return;
    _lastHeight = size.height;
    final height = size.height;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (attached) onHeight(height);
    });
  }
}
