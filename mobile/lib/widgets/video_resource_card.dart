import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/clinic_resource.dart';
import '../utils/video_thumbnail.dart';
import 'fullscreen_video_page.dart';
import 'inline_video_player.dart';

class VideoResourceCard extends StatefulWidget {
  const VideoResourceCard({
    super.key,
    required this.resource,
    this.onTapOverride,
  });

  final ClinicResource resource;
  final VoidCallback? onTapOverride;

  /// Global notifier ensuring only one video card plays inline at any given time.
  static final ValueNotifier<int?> activePlayingResourceId = ValueNotifier<int?>(null);

  @override
  State<VideoResourceCard> createState() => _VideoResourceCardState();
}

class _VideoResourceCardState extends State<VideoResourceCard> {
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    VideoResourceCard.activePlayingResourceId.addListener(_onActivePlayerChanged);
  }

  @override
  void dispose() {
    VideoResourceCard.activePlayingResourceId.removeListener(_onActivePlayerChanged);
    super.dispose();
  }

  void _onActivePlayerChanged() {
    if (VideoResourceCard.activePlayingResourceId.value != widget.resource.id && _isPlaying) {
      if (mounted) {
        setState(() {
          _isPlaying = false;
        });
      }
    }
  }

  void _startPlayback() {
    if (widget.onTapOverride != null) {
      widget.onTapOverride!();
      return;
    }

    setState(() {
      _isPlaying = true;
    });
    VideoResourceCard.activePlayingResourceId.value = widget.resource.id;
  }

  void _stopPlayback() {
    setState(() {
      _isPlaying = false;
    });
    if (VideoResourceCard.activePlayingResourceId.value == widget.resource.id) {
      VideoResourceCard.activePlayingResourceId.value = null;
    }
  }

  void _openFullscreen(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FullscreenVideoPage(
          videoUrl: widget.resource.url,
          title: widget.resource.title,
        ),
      ),
    );
  }

  String _buildSpokenDuration(BuildContext context, String? rawDuration) {
    final trimmed = rawDuration?.trim();
    if (trimmed == null || trimmed.isEmpty) return '';

    final parts = trimmed.split(':');
    if (parts.length == 2) {
      final mins = int.tryParse(parts[0]);
      final secs = int.tryParse(parts[1]);
      if (mins != null && secs != null) {
        final minText = context.tr(
          'learn_more_minutes',
          params: {'count': mins.toString()},
        );
        final secText = secs > 0
            ? ' ${context.tr('learn_more_seconds', params: {'count': secs.toString()})}'
            : '';
        return ', $minText$secText';
      }
    }
    return ', $trimmed';
  }

  @override
  Widget build(BuildContext context) {
    final tagLabel = context.tr('learn_more_orientation_video');
    final durationLabel = widget.resource.durationLabel?.trim();
    final hasDuration = durationLabel != null && durationLabel.isNotEmpty;
    final subtitle = widget.resource.subtitle?.trim();
    final hasSubtitle = subtitle != null && subtitle.isNotEmpty;

    final thumbnailUrl = VideoThumbnail.resolve(
      videoUrl: widget.resource.url,
      thumbnailUrl: widget.resource.thumbnailUrl,
    );

    final semanticLabel = context.tr(
      'learn_more_video_semantics',
      params: {
        'title': widget.resource.title,
        'tag': tagLabel,
        'duration': _buildSpokenDuration(context, durationLabel),
      },
    );

    return Semantics(
      button: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
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
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top area: either inline player or thumbnail preview
            if (_isPlaying)
              InlineVideoPlayer(
                videoUrl: widget.resource.url,
                title: widget.resource.title,
                onClose: _stopPlayback,
                onFullscreen: () => _openFullscreen(context),
              )
            else
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _startPlayback,
                  child: SizedBox(
                    height: 150,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        const _TealGradientFallback(),
                        if (thumbnailUrl != null)
                          Image.network(
                            thumbnailUrl,
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return const _TealGradientFallback();
                            },
                            errorBuilder: (context, error, stackTrace) {
                              return const _TealGradientFallback();
                            },
                          ),
                        // Top-left Orientation video tag
                        Positioned(
                          top: 10,
                          left: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color.fromRGBO(0, 0, 0, 0.28),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.videocam_outlined,
                                  size: 14,
                                  color: Colors.white,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  tagLabel,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    height: 1.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        // Center 52x52 white play circle with teal play icon & soft shadow
                        Center(
                          child: Container(
                            width: 52,
                            height: 52,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Color.fromRGBO(0, 0, 0, 0.16),
                                  blurRadius: 12,
                                  offset: Offset(0, 4),
                                ),
                              ],
                            ),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.play_arrow_rounded,
                              size: 28,
                              color: Color(0xFF1D9E75),
                            ),
                          ),
                        ),
                        // Bottom-right duration chip
                        if (hasDuration)
                          Positioned(
                            right: 10,
                            bottom: 10,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: const Color.fromRGBO(0, 0, 0, 0.45),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                durationLabel,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  height: 1.2,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),

            // Card body (padding 12x14)
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _isPlaying ? _stopPlayback : _startPlayback,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 14,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.resource.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF111827),
                                height: 1.3,
                              ),
                            ),
                            if (hasSubtitle) ...[
                              const SizedBox(height: 2),
                              Text(
                                subtitle,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF9CA3AF),
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Action icon button
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: _isPlaying
                              ? const Color(0xFFFEE2E2)
                              : const Color(0xFFE1F5EE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Icon(
                          _isPlaying
                              ? Icons.stop_rounded
                              : Icons.play_arrow_rounded,
                          size: 18,
                          color: _isPlaying
                              ? const Color(0xFFDC2626)
                              : const Color(0xFF1D9E75),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TealGradientFallback extends StatelessWidget {
  const _TealGradientFallback();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1D9E75),
            Color(0xFF5CC7A5),
          ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            top: -36,
            right: -28,
            child: Container(
              width: 140,
              height: 140,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color.fromRGBO(255, 255, 255, 0.10),
              ),
            ),
          ),
          Positioned(
            bottom: -24,
            left: -18,
            child: Container(
              width: 96,
              height: 96,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color.fromRGBO(255, 255, 255, 0.08),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
