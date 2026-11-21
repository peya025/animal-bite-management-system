import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

import '../utils/external_link_launcher.dart';
import '../utils/video_thumbnail.dart';

class FullscreenVideoPage extends StatefulWidget {
  const FullscreenVideoPage({
    super.key,
    required this.videoUrl,
    this.title,
    this.initialPosition,
    this.isMuted = false,
  });

  final String videoUrl;
  final String? title;
  final Duration? initialPosition;
  final bool isMuted;

  @override
  State<FullscreenVideoPage> createState() => _FullscreenVideoPageState();
}

class _FullscreenVideoPageState extends State<FullscreenVideoPage> {
  VideoPlayerController? _videoController;
  YoutubePlayerController? _youtubeController;

  bool _isYouTube = false;
  bool _isInitialized = false;
  bool _hasError = false;
  bool _showControls = true;
  bool _isMuted = false;
  Timer? _hideControlsTimer;

  @override
  void initState() {
    super.initState();
    _isMuted = widget.isMuted;

    // Enable immersive landscape & portrait mode
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
      DeviceOrientation.portraitUp,
    ]);

    _initPlayer();
  }

  Future<void> _initPlayer() async {
    final youtubeId = VideoThumbnail.extractYoutubeId(widget.videoUrl);

    if (youtubeId != null) {
      _isYouTube = true;
      _youtubeController = YoutubePlayerController.fromVideoId(
        videoId: youtubeId,
        autoPlay: true,
        params: YoutubePlayerParams(
          mute: _isMuted,
          showControls: true,
          showFullscreenButton: false,
          enableCaption: false,
        ),
      );
      if (widget.initialPosition != null) {
        _youtubeController!.seekTo(
          seconds: widget.initialPosition!.inSeconds.toDouble(),
        );
      }
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

        if (widget.initialPosition != null) {
          await _videoController!.seekTo(widget.initialPosition!);
        }
        if (_isMuted) {
          await _videoController!.setVolume(0.0);
        } else {
          await _videoController!.setVolume(1.0);
        }

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
    _hideControlsTimer?.cancel();
    _hideControlsTimer = Timer(const Duration(seconds: 3), () {
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
      _hideControlsTimer?.cancel();
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

  void _seekRelative(int seconds) {
    if (_videoController == null) return;
    final current = _videoController!.value.position;
    final target = current + Duration(seconds: seconds);
    final duration = _videoController!.value.duration;
    if (target < Duration.zero) {
      _videoController!.seekTo(Duration.zero);
    } else if (target > duration) {
      _videoController!.seekTo(duration);
    } else {
      _videoController!.seekTo(target);
    }
    _startHideTimer();
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(1, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _hideControlsTimer?.cancel();
    _videoController?.removeListener(_videoListener);
    _videoController?.dispose();
    _youtubeController?.close();

    // Restore orientation and system UI
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_hasError) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white70, size: 48),
              const SizedBox(height: 12),
              const Text(
                'Unable to play this video.',
                style: TextStyle(color: Colors.white, fontSize: 14),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1D9E75),
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.open_in_new_rounded, size: 16),
                label: const Text('Open Externally'),
                onPressed: () => openExternal(context, widget.videoUrl),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Back', style: TextStyle(color: Colors.white70)),
              ),
            ],
          ),
        ),
      );
    }

    if (!_isInitialized) {
      return const Center(
        child: CircularProgressIndicator(
          color: Color(0xFF1D9E75),
        ),
      );
    }

    if (_isYouTube && _youtubeController != null) {
      return Stack(
        fit: StackFit.expand,
        children: [
          Center(
            child: YoutubePlayer(
              controller: _youtubeController!,
            ),
          ),
          Positioned(
            top: 12,
            left: 12,
            child: IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ],
      );
    }

    if (_videoController == null || !_videoController!.value.isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF1D9E75)),
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
            duration: const Duration(milliseconds: 250),
            child: IgnorePointer(
              ignoring: !_showControls,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Top Gradient with Title and Back button
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0xCC000000), Colors.transparent],
                        ),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.title ?? 'Orientation Video',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.open_in_new_rounded, color: Colors.white, size: 20),
                            tooltip: 'Open in external player',
                            onPressed: () => openExternal(context, widget.videoUrl),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Center Controls: -10s, Play/Pause, +10s
                  Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          iconSize: 36,
                          icon: const Icon(Icons.replay_10_rounded, color: Colors.white),
                          onPressed: () => _seekRelative(-10),
                        ),
                        const SizedBox(width: 24),
                        if (isBuffering)
                          const SizedBox(
                            width: 56,
                            height: 56,
                            child: CircularProgressIndicator(
                              color: Color(0xFF1D9E75),
                              strokeWidth: 3,
                            ),
                          )
                        else
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(32),
                              onTap: _togglePlayPause,
                              child: Container(
                                width: 56,
                                height: 56,
                                decoration: const BoxDecoration(
                                  color: Color(0x66000000),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                  color: Colors.white,
                                  size: 36,
                                ),
                              ),
                            ),
                          ),
                        const SizedBox(width: 24),
                        IconButton(
                          iconSize: 36,
                          icon: const Icon(Icons.forward_10_rounded, color: Colors.white),
                          onPressed: () => _seekRelative(10),
                        ),
                      ],
                    ),
                  ),

                  // Bottom Gradient with Progress Bar, Time, and Actions
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [Color(0xCC000000), Colors.transparent],
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Scrubber
                          SliderTheme(
                            data: SliderTheme.of(context).copyWith(
                              activeTrackColor: const Color(0xFF1D9E75),
                              inactiveTrackColor: Colors.white24,
                              thumbColor: const Color(0xFF1D9E75),
                              trackHeight: 3.0,
                              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6.0),
                              overlayShape: const RoundSliderOverlayShape(overlayRadius: 12.0),
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
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${_formatDuration(position)} / ${_formatDuration(duration)}',
                                style: const TextStyle(color: Colors.white70, fontSize: 11),
                              ),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: Icon(
                                      _isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                                      color: Colors.white,
                                      size: 20,
                                    ),
                                    onPressed: _toggleMute,
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.fullscreen_exit_rounded, color: Colors.white, size: 22),
                                    onPressed: () => Navigator.of(context).pop(),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
