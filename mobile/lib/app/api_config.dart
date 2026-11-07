/// Build-time settings override the bundled .env development settings.
class ApiConfig {
  static const buildBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String resolveBaseUrl({
    String buildUrl = buildBaseUrl,
    String? envUrl,
  }) {
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
    return value;
  }
}
