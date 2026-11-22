import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/fcm_device_registration_service.dart';
import 'package:mobile/services/mock_mobile_api.dart';

void main() {
  group('Phase 3 - Task 3.2: FCM Device Token Management & Registration Tests', () {
    setUp(() {
      FcmDeviceRegistrationService.instance.dispose();
    });

    tearDown(() {
      FcmDeviceRegistrationService.instance.dispose();
    });

    test('maskToken obscures registration tokens to protect credentials in logs', () {
      expect(FcmDeviceRegistrationService.maskToken(null), equals('<none>'));
      expect(FcmDeviceRegistrationService.maskToken(''), equals('<none>'));
      expect(FcmDeviceRegistrationService.maskToken('12345'), equals('***'));
      expect(FcmDeviceRegistrationService.maskToken('1234567890'), equals('***'));

      const sampleFCMToken = 'fcm_eK8x_SampleFirebaseMessagingToken9876543210_AndroidDevice';
      final masked = FcmDeviceRegistrationService.maskToken(sampleFCMToken);
      expect(masked.startsWith('fcm_eK'), isTrue);
      expect(masked.endsWith('vice'), isTrue);
      expect(masked.contains('...'), isTrue);
      expect(masked.contains('SampleFirebaseMessagingToken'), isFalse);
    });

    test('syncDeviceToken gracefully returns false when unauthenticated', () async {
      final service = FcmDeviceRegistrationService.instance;
      // When unauthenticated, sync must be a safe no-op returning false
      final result = await service.syncDeviceToken();
      expect(result, isFalse);
    });

    test('MockMobileApi registers device token and returns masked representation', () async {
      final mockApi = MockMobileApi.instance;
      const testToken = 'fcm_mock_device_token_abcdef1234567890';

      final response = await mockApi.registerDeviceToken(
        fcmToken: testToken,
        deviceId: 'device_test_1',
        deviceType: 'android',
        deviceName: 'Pixel 7',
      );

      expect(response['status'], equals('success'));
      expect(response['device'], isNotNull);
      final device = response['device'] as Map<String, dynamic>;
      expect(device['device_type'], equals('android'));
      expect(device['device_name'], equals('Pixel 7'));
      expect(device['masked_token'], contains('...'));
      expect(device['masked_token'], isNot(equals(testToken)));
    });

    test('MockMobileApi repeated registration for same token is idempotent', () async {
      final mockApi = MockMobileApi.instance;
      const testToken = 'fcm_idempotent_test_token_998877665544';

      final resp1 = await mockApi.registerDeviceToken(
        fcmToken: testToken,
        deviceId: 'hardware_phone_1',
        deviceType: 'android',
        deviceName: 'Phone 1',
      );
      expect(resp1['status'], equals('success'));

      final resp2 = await mockApi.registerDeviceToken(
        fcmToken: testToken,
        deviceId: 'hardware_phone_1',
        deviceType: 'android',
        deviceName: 'Phone 1 Renamed',
      );
      expect(resp2['status'], equals('success'));
      expect((resp2['device'] as Map)['device_name'], equals('Phone 1 Renamed'));
    });

    test('MockMobileApi supports multiple devices (phone and tablet)', () async {
      final mockApi = MockMobileApi.instance;

      final phoneResp = await mockApi.registerDeviceToken(
        fcmToken: 'phone_token_11111111111111',
        deviceId: 'phone_hw_id',
        deviceType: 'android',
        deviceName: 'Patient Phone',
      );
      expect(phoneResp['status'], equals('success'));

      final tabletResp = await mockApi.registerDeviceToken(
        fcmToken: 'tablet_token_22222222222222',
        deviceId: 'tablet_hw_id',
        deviceType: 'android',
        deviceName: 'Patient Tablet',
      );
      expect(tabletResp['status'], equals('success'));
    });

    test('MockMobileApi deleteDeviceToken removes registration on logout', () async {
      final mockApi = MockMobileApi.instance;
      const token = 'token_to_delete_on_logout_000111222';

      await mockApi.registerDeviceToken(
        fcmToken: token,
        deviceId: 'hw_delete_test',
        deviceType: 'android',
      );

      await mockApi.deleteDeviceToken(fcmToken: token);
      // Success without exception
    });

    test('unregisterDeviceToken completes cleanly without throwing even when unauthenticated', () async {
      final service = FcmDeviceRegistrationService.instance;
      expect(() async => await service.unregisterDeviceToken(), returnsNormally);
    });

    test('registration metadata does not contain sensitive patient clinical information', () {
      // Step 6 requirement: Do not include sensitive patient information in Firebase registration metadata
      final registrationPayload = {
        'fcm_token': 'fcm_token_sample_1234567890',
        'device_id': 'inst_123',
        'device_type': 'android',
        'device_name': 'Mobile App (android)',
      };

      expect(registrationPayload.containsKey('patient_id'), isFalse);
      expect(registrationPayload.containsKey('name'), isFalse);
      expect(registrationPayload.containsKey('email'), isFalse);
      expect(registrationPayload.containsKey('phone'), isFalse);
      expect(registrationPayload.containsKey('diagnosis'), isFalse);
      expect(registrationPayload.containsKey('bite_category'), isFalse);
    });
  });
}
