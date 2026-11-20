import 'package:flutter/foundation.dart';

/// Build-time settings override the bundled .env development settings.
class ApiConfig {
  static const buildBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Determines whether a hostname points to a loopback, emulator alias, or private LAN address.
  static bool isLocalAddress(String host) {
    final lower = host.toLowerCase().trim();
    if (lower == 'localhost' ||
        lower == '127.0.0.1' ||
        lower == '10.0.2.2' ||
        lower == '::1' ||
        lower.endsWith('.local')) {
      return true;
    }

    // Check private IPv4 ranges: 10.x.x.x, 192.168.x.x, 172.16.x.x - 172.31.x.x
    final ipRegex = RegExp(r'^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$');
    final match = ipRegex.firstMatch(lower);
    if (match != null) {
      final octet1 = int.tryParse(match.group(1)!) ?? 0;
      final octet2 = int.tryParse(match.group(2)!) ?? 0;
      if (octet1 == 127 || octet1 == 10) return true;
      if (octet1 == 192 && octet2 == 168) return true;
      if (octet1 == 172 && (octet2 >= 16 && octet2 <= 31)) return true;
    }

    return false;
  }

  static String resolveBaseUrl({
    String buildUrl = buildBaseUrl,
    String? envUrl,
    bool? isRelease,
  }) {
    final releaseMode = isRelease ?? kReleaseMode;

    final value = (buildUrl.trim().isNotEmpty ? buildUrl : envUrl ?? '')
        .trim()
        .replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(value);

    if (uri == null ||
        !uri.hasAuthority ||
        uri.host.isEmpty ||
        !['http', 'https'].contains(uri.scheme) ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        !uri.path.endsWith('/api/mobile')) {
      throw StateError(
        'Set API_BASE_URL to an http(s) URL ending in /api/mobile '
        'using --dart-define or mobile/.env.',
      );
    }

    // Release build security invariants:
    if (releaseMode) {
      if (uri.scheme != 'https') {
        throw StateError(
          'CRITICAL RELEASE SECURITY ERROR: Release builds require an https URL for API_BASE_URL, '
          'but received "$value". Insecure cleartext HTTP is prohibited in production builds.',
        );
      }

      if (isLocalAddress(uri.host)) {
        throw StateError(
          'CRITICAL RELEASE SECURITY ERROR: Release builds must not connect to a local development '
          'IP or loopback ("${uri.host}"). Provide a public production HTTPS URL via '
          '--dart-define=API_BASE_URL=https://your-backend.up.railway.app/api/mobile.',
        );
      }
    }

    return value;
  }
}
