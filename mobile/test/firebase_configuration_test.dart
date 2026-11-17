import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Phase 3 - Task 3.1: Firebase Configuration Verification', () {
    test('google-services.json exists and has valid configuration', () {
      final file = File('android/app/google-services.json');
      expect(file.existsSync(), isTrue, reason: 'google-services.json must exist in android/app/');

      final jsonContent = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      final projectInfo = jsonContent['project_info'] as Map<String, dynamic>?;
      expect(projectInfo, isNotNull);
      expect(projectInfo!['project_id'], equals('abtc-management-system'));

      final clientList = jsonContent['client'] as List<dynamic>?;
      expect(clientList, isNotNull);
      expect(clientList!.isNotEmpty, isTrue);

      final firstClient = clientList.first as Map<String, dynamic>;
      final clientInfo = firstClient['client_info'] as Map<String, dynamic>?;
      expect(clientInfo, isNotNull);

      final androidClientInfo = clientInfo!['android_client_info'] as Map<String, dynamic>?;
      expect(androidClientInfo, isNotNull);
      expect(androidClientInfo!['package_name'], equals('com.example.mobile'));
    });

    test('settings.gradle.kts includes Google Services plugin declaration', () {
      final settingsFile = File('android/settings.gradle.kts');
      expect(settingsFile.existsSync(), isTrue);

      final content = settingsFile.readAsStringSync();
      expect(content.contains('com.google.gms.google-services'), isTrue);
    });

    test('android/app/build.gradle.kts applies Google Services plugin and matches package name', () {
      final appGradleFile = File('android/app/build.gradle.kts');
      expect(appGradleFile.existsSync(), isTrue);

      final content = appGradleFile.readAsStringSync();
      expect(content.contains('id("com.google.gms.google-services")'), isTrue);
      expect(content.contains('namespace = "com.example.mobile"'), isTrue);
      expect(content.contains('applicationId = "com.example.mobile"'), isTrue);
    });

    test('main.dart initializes Firebase on application startup', () {
      final mainFile = File('lib/main.dart');
      expect(mainFile.existsSync(), isTrue);

      final content = mainFile.readAsStringSync();
      expect(content.contains("import 'package:firebase_core/firebase_core.dart';"), isTrue);
      expect(content.contains('Firebase.initializeApp()'), isTrue);
      expect(content.contains('Firebase.apps.isEmpty'), isTrue);
    });
  });
}
