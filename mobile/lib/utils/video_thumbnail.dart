class VideoThumbnail {
  VideoThumbnail._();

  static final RegExp _youtubeIdRegex = RegExp(r'^[A-Za-z0-9_-]{6,20}$');

  /// Resolves the best HTTPS thumbnail URL for a video resource.
  ///
  /// 1. If [thumbnailUrl] is set and starts with `https://`, returns it.
  /// 2. Otherwise, if [videoUrl] is a YouTube link (`youtu.be/ID`,
  ///    `youtube.com/watch?v=ID`, `youtube.com/shorts/ID`), returns
  ///    `https://img.youtube.com/vi/ID/hqdefault.jpg`.
  /// 3. Otherwise returns `null` so the card displays its teal gradient fallback.
  static String? resolve({
    required String videoUrl,
    String? thumbnailUrl,
  }) {
    final trimmedThumb = thumbnailUrl?.trim();
    if (trimmedThumb != null &&
        trimmedThumb.isNotEmpty &&
        (trimmedThumb.startsWith('https://') || trimmedThumb.startsWith('http://'))) {
      final thumbUri = Uri.tryParse(trimmedThumb);
      if (thumbUri != null &&
          (thumbUri.scheme == 'https' || thumbUri.scheme == 'http') &&
          thumbUri.host.isNotEmpty) {
        return trimmedThumb;
      }
    }

    final uri = Uri.tryParse(videoUrl.trim());
    if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http')) {
      return null;
    }

    final host = uri.host.toLowerCase();
    String? videoId;

    if (host == 'youtu.be' || host == 'www.youtu.be') {
      if (uri.pathSegments.isNotEmpty) {
        videoId = uri.pathSegments.first;
      }
    } else if (host == 'youtube.com' ||
        host == 'www.youtube.com' ||
        host == 'm.youtube.com') {
      if (uri.path == '/watch') {
        videoId = uri.queryParameters['v'];
      } else if (uri.pathSegments.length >= 2 &&
          uri.pathSegments.first == 'shorts') {
        videoId = uri.pathSegments[1];
      }
    }

    if (videoId != null && _youtubeIdRegex.hasMatch(videoId)) {
      return 'https://img.youtube.com/vi/$videoId/hqdefault.jpg';
    }

    return null;
  }
}
