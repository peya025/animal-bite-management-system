import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/api_config.dart';

void main() {
  test('build URL overrides a stale bundled local address', () {
    expect(
      ApiConfig.resolveBaseUrl(
        buildUrl: 'https://clinic.example/api/mobile/',
        envUrl: 'http://192.168.1.21:8000/api/mobile',
      ),
      'https://clinic.example/api/mobile',
    );
  });

  test('plain builds retain the .env fallback', () {
    expect(
      ApiConfig.resolveBaseUrl(
        buildUrl: '',
        envUrl: ' http://10.0.2.2:8000/api/mobile/ ',
      ),
      'http://10.0.2.2:8000/api/mobile',
    );
  });

  test('missing and malformed endpoints fail before making requests', () {
    for (final url in [
      '',
      'clinic.example/api/mobile',
      'ftp://clinic.example/api/mobile',
      'https://clinic.example/api',
      'https://clinic.example/api/mobile?server=local',
    ]) {
      expect(() => ApiConfig.resolveBaseUrl(buildUrl: url), throwsStateError);
    }
  });

  test('selected build configuration is available at runtime', () {
    expect(
      ApiConfig.resolveBaseUrl(envUrl: 'http://fallback.example/api/mobile'),
      ApiConfig.buildBaseUrl.isEmpty
          ? 'http://fallback.example/api/mobile'
          : ApiConfig.buildBaseUrl,
    );
  });
}
