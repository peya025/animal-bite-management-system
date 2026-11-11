import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

import '../utils/external_link_launcher.dart';
import '../utils/video_thumbnail.dart';

class InlineVideoPlayer extends StatefulWidget {
  const InlineVideoPlayer({
    super.key,
    required this.videoUrl,
    this.title,
    required this.onClose,
    required this.onFullscreen,
  });

  final String videoUrl;
  final String? title;
  final VoidCallback onClose;
  final VoidCallback onFullscreen;

  @override
  State<InlineVideoPlayer> createState() => _InlineVideoPlayerState();
}

class _InlineVideoPlayerState extends State<InlineVideoPlayer> {
  VideoPlayerController? _videoController;
  YoutubePlayerController? _youtubeController;

  bool _isYouTube = false;
  bool _isInitialized = false;
  bool _hasError = false;
  bool _showControls = true;
  bool _isMuted = false;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    final youtubeId = VideoThumbnail.extractYoutubeId(widget.videoUrl);

    if (youtubeId != null) {
      _isYouTube = true;
      _youtubeController = YoutubePlayerController.fromVideoId(
        videoId: youtubeId,
        autoPlay: true,
        params: const YoutubePlayerParams(
          mute: false,
          showControls: true,
          showFullscreenButton: false,
          enableCaption: false,
        ),
      );
      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
      }
    } else {
      _isYouTube = false;
      try {
        final uri = Uri.parse(widget.videoUrl);
        _videoController = VideoPlayerController.networkUrl(uri);
        await _videoController!.initialize();
        await _videoController!.play();
        _videoController!.addListener(_videoListener);

        if (mounted) {
          setState(() {
            _isInitialized = true;
          });
          _startHideTimer();
        }
      } catch (_) {
        if (mounted) {
          setState(() {
            _hasError = true;
          });
        }
      }
    }
  }

  void _videoListener() {
    if (!mounted) return;
    setState(() {});
  }

  void _startHideTimer() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && (_videoController?.value.isPlaying ?? false)) {
        setState(() {
          _showControls = false;
        });
      }
    });
  }

  void _toggleControls() {
    setState(() {
      _showControls = !_showControls;
    });
    if (_showControls) {
      _startHideTimer();
    }
  }

  void _togglePlayPause() {
    if (_videoController == null) return;
    if (_videoController!.value.isPlaying) {
      _videoController!.pause();
      _hideTimer?.cancel();
      setState(() {
        _showControls = true;
      });
    } else {
      _videoController!.play();
      _startHideTimer();
      setState(() {});
    }
  }

  void _toggleMute() {
    if (_videoController == null) return;
    setState(() {
      _isMuted = !_isMuted;
    });
    _videoController!.setVolume(_isMuted ? 0.0 : 1.0);
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(1, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _videoController?.removeListener(_videoListener);
    _videoController?.dispose();
    _youtubeController?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 150,
      decoration: const BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      clipBehavior: Clip.antiAlias,
      child: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_hasError) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white70, size: 28),
              const SizedBox(height: 6),
              const Text(
                'Unable to load video',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF1D9E75),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    ),
                    icon: const Icon(Icons.open_in_new_rounded, size: 14),
                    label: const Text('Open Externally', style: TextStyle(fontSize: 12)),
                    onPressed: () => openExternal(context, widget.videoUrl),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.white70,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    ),
                    onPressed: widget.onClose,
                    child: const Text('Close', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    if (!_isInitialized) {
      return Stack(
        fit: StackFit.expand,
        children: [
          const Center(
            child: SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                color: Color(0xFF1D9E75),
                strokeWidth: 2.5,
              ),
            ),
          ),
          Positioned(
            top: 6,
            right: 6,
            child: IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
              onPressed: widget.onClose,
            ),
          ),
        ],
      );
    }

    if (_isYouTube && _youtubeController != null) {
      return Stack(
        fit: StackFit.expand,
        children: [
          YoutubePlayer(
            controller: _youtubeController!,
          ),
          // Top bar overlay for YouTube (Close & Fullscreen)
          Positioned(
            top: 4,
            right: 4,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Color(0x88000000),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    iconSize: 18,
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.fullscreen_rounded, color: Colors.white),
                    tooltip: 'Fullscreen',
                    onPressed: widget.onFullscreen,
                  ),
                ),
                const SizedBox(width: 4),
                Container(
                  decoration: const BoxDecoration(
                    color: Color(0x88000000),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    iconSize: 18,
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.close_rounded, color: Colors.white),
                    tooltip: 'Close player',
                    onPressed: widget.onClose,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (_videoController == null || !_videoController!.value.isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF1D9E75), strokeWidth: 2.5),
      );
    }

    final duration = _videoController!.value.duration;
    final position = _videoController!.value.position;
    final isPlaying = _videoController!.value.isPlaying;
    final isBuffering = _videoController!.value.isBuffering;

    return GestureDetector(
      onTap: _toggleControls,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Center(
            child: AspectRatio(
              aspectRatio: _videoController!.value.aspectRatio,
              child: VideoPlayer(_videoController!),
            ),
          ),

          // Control Overlay
          AnimatedOpacity(
            opacity: _showControls ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 200),
            child: IgnorePointer(
              ignoring: !_showControls,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0x99000000),
                      Colors.transparent,
                      Colors.transparent,
                      Color(0xB3000000),
                    ],
                    stops: [0.0, 0.25, 0.70, 1.0],
                  ),
                ),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Top Bar
                    Positioned(
                      top: 4,
                      left: 10,
                      right: 4,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              widget.title ?? 'Orientation video',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            iconSize: 20,
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(Icons.close_rounded, color: Colors.white),
                            tooltip: 'Close player',
                            onPressed: widget.onClose,
                          ),
                        ],
                      ),
                    ),

                    // Center Play/Pause / Buffering
                    Center(
                      child: isBuffering
                          ? const SizedBox(
                              width: 38,
                              height: 38,
                              child: CircularProgressIndicator(
                                color: Color(0xFF1D9E75),
                                strokeWidth: 3,
                              ),
                            )
                          : Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(26),
                                onTap: _togglePlayPause,
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: const BoxDecoration(
                                    color: Color(0x77000000),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                                ),
                              ),
                            ),
                    ),

                    // Bottom Bar with Scrubber & Actions
                    Positioned(
                      bottom: 0,
                      left: 8,
                      right: 8,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Scrubber
                          SliderTheme(
                            data: SliderTheme.of(context).copyWith(
                              activeTrackColor: const Color(0xFF1D9E75),
                              inactiveTrackColor: Colors.white24,
                              thumbColor: const Color(0xFF1D9E75),
                              trackHeight: 2.5,
                              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5.0),
                              overlayShape: const RoundSliderOverlayShape(overlayRadius: 10.0),
                            ),
                            child: Slider(
                              value: position.inMilliseconds.clamp(0, duration.inMilliseconds).toDouble(),
                              max: duration.inMilliseconds.toDouble() > 0
                                  ? duration.inMilliseconds.toDouble()
                                  : 1.0,
                              onChanged: (val) {
                                _startHideTimer();
                                _videoController!.seekTo(Duration(milliseconds: val.toInt()));
                              },
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4, left: 4, right: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${_formatDuration(position)} / ${_formatDuration(duration)}',
                                  style: const TextStyle(color: Colors.white70, fontSize: 10.5, fontWeight: FontWeight.w500),
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      iconSize: 18,
                                      visualDensity: VisualDensity.compact,
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                      icon: Icon(
                                        _isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                                        color: Colors.white,
                                      ),
                                      onPressed: _toggleMute,
                                    ),
                                    const SizedBox(width: 4),
                                    IconButton(
                                      iconSize: 18,
                                      visualDensity: VisualDensity.compact,
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                      icon: const Icon(Icons.fullscreen_rounded, color: Colors.white),
                                      tooltip: 'Fullscreen',
                                      onPressed: widget.onFullscreen,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
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
