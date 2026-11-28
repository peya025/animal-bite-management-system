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
        isRelease: false,
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
      ApiConfig.resolveBaseUrl(
        envUrl: 'https://fallback.example/api/mobile',
        isRelease: true,
      ),
      ApiConfig.buildBaseUrl.isEmpty
          ? 'https://fallback.example/api/mobile'
          : ApiConfig.buildBaseUrl,
    );
  });

  test('release mode strictly rejects cleartext http endpoints', () {
    expect(
      () => ApiConfig.resolveBaseUrl(
        buildUrl: 'http://animal-bite-management.railway.app/api/mobile',
        isRelease: true,
      ),
      throwsA(isA<StateError>().having(
        (e) => e.message,
        'message',
        contains('Insecure cleartext HTTP is prohibited in production builds'),
      )),
    );
  });

  test('release mode strictly rejects local development IP addresses', () {
    for (final localUrl in [
      'https://192.168.1.175:8000/api/mobile',
      'https://127.0.0.1:8000/api/mobile',
      'https://localhost:8000/api/mobile',
      'https://10.0.2.2:8000/api/mobile',
      'https://10.10.0.5:8000/api/mobile',
      'https://172.20.10.3:8000/api/mobile',
      'https://devhost.local:8000/api/mobile',
    ]) {
      expect(
        () => ApiConfig.resolveBaseUrl(
          buildUrl: localUrl,
          isRelease: true,
        ),
        throwsA(isA<StateError>().having(
          (e) => e.message,
          'message',
          contains('must not connect to a local development IP or loopback'),
        )),
      );
    }
  });

  test('release mode accepts public production HTTPS endpoints', () {
    expect(
      ApiConfig.resolveBaseUrl(
        buildUrl: 'https://animal-bite-management-system-production.up.railway.app/api/mobile',
        isRelease: true,
      ),
      'https://animal-bite-management-system-production.up.railway.app/api/mobile',
    );
  });

  test('debug mode allows local development endpoints', () {
    expect(
      ApiConfig.resolveBaseUrl(
        buildUrl: 'http://192.168.1.175:8000/api/mobile',
        isRelease: false,
      ),
      'http://192.168.1.175:8000/api/mobile',
    );
  });
}
