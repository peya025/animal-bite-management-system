import 'package:flutter/foundation.dart';

enum ClinicResourceType {
  video,
  link;

  static ClinicResourceType fromString(Object? raw) {
    final normalized = raw?.toString().trim().toLowerCase();
    if (normalized == 'video') {
      return ClinicResourceType.video;
    }
    return ClinicResourceType.link;
  }
}

@immutable
class ClinicResource {
  const ClinicResource({
    required this.id,
    required this.type,
    required this.title,
    required this.url,
    this.subtitle,
    this.thumbnailUrl,
    this.durationLabel,
  });

  final int id;
  final ClinicResourceType type;
  final String title;
  final String? subtitle;
  final String url;
  final String? thumbnailUrl;
  final String? durationLabel;

  /// Safe parser that never throws. Unknown type falls back to [ClinicResourceType.link].
  /// Missing optional fields become null.
  factory ClinicResource.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final id = rawId is int
        ? rawId
        : int.tryParse(rawId?.toString() ?? '') ?? 0;

    final title = (json['title']?.toString() ?? '').trim();
    final url = (json['url']?.toString() ?? '').trim();

    final rawSubtitle = (json['subtitle'] ?? json['description'])
        ?.toString()
        .trim();
    final subtitle = (rawSubtitle != null && rawSubtitle.isNotEmpty)
        ? rawSubtitle
        : null;

    final rawThumb = json['thumbnail_url']?.toString().trim();
    final thumbnailUrl = (rawThumb != null &&
            rawThumb.isNotEmpty &&
            rawThumb.startsWith('https://'))
        ? rawThumb
        : null;

    final rawDuration = json['duration_label']?.toString().trim();
    final durationLabel = (rawDuration != null && rawDuration.isNotEmpty)
        ? rawDuration
        : null;

    return ClinicResource(
      id: id,
      type: ClinicResourceType.fromString(json['type']),
      title: title,
      subtitle: subtitle,
      url: url,
      thumbnailUrl: thumbnailUrl,
      durationLabel: durationLabel,
    );
  }

  /// Returns true only when [url] is a valid non-empty https:// URL with a host
  /// and is not an unconfigured placeholder URL.
  bool get hasValidHttpsUrl {
    if (url.isEmpty || !url.startsWith('https://')) return false;
    if (url.toLowerCase().contains('replace-with-')) return false;
    final uri = Uri.tryParse(url);
    return uri != null && uri.scheme == 'https' && uri.host.isNotEmpty;
  }

  /// Parses a dynamic JSON list, skipping any item whose [url] is empty
  /// or does not start with `https://` or whose [title] is empty.
  static List<ClinicResource> listFromJson(Object? rawList) {
    if (rawList is! List) return const <ClinicResource>[];
    final result = <ClinicResource>[];
    for (final item in rawList) {
      if (item is Map) {
        final map = Map<String, dynamic>.from(item);
        final resource = ClinicResource.fromJson(map);
        if (resource.hasValidHttpsUrl && resource.title.isNotEmpty) {
          result.add(resource);
        }
      }
    }
    return List<ClinicResource>.unmodifiable(result);
  }
}
