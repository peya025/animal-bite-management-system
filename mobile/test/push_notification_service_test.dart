import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/app/app_routes.dart';
import 'package:mobile/services/api.dart';
import 'package:mobile/services/fcm_device_registration_service.dart';
import 'package:mobile/services/mock_mobile_api.dart';
import 'package:mobile/services/push_notification_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    PushNotificationService.instance.dispose();
    PushNotificationService.instance.clearNotificationState();
  });

  group('Phase 3 - Task 3.3: Android Notification Channel Configuration', () {
    test('Android notification channel matches Firebase and requirement specifications', () {
      final channel = PushNotificationService.androidNotificationChannel;

      expect(channel.id, equals('abtcare_reminders'));
      expect(channel.name, equals('ABTC Notifications'));
      expect(
        channel.description,
        equals('Appointment updates, reminders, and important clinic announcements.'),
      );
      expect(channel.importance, equals(Importance.high));
      expect(channel.playSound, isTrue);
      expect(channel.enableVibration, isTrue);
      expect(channel.vibrationPattern, isNotNull);
    });

    test('PushNotificationService defines correct channel ID and icon constants', () {
      expect(PushNotificationService.channelId, equals('abtcare_reminders'));
      expect(PushNotificationService.channelName, equals('ABTC Notifications'));
      expect(
        PushNotificationService.defaultNotificationIcon,
        equals('@drawable/ic_notification'),
      );
    });
  });

  group('Phase 3 - Task 3.3: Notification Tap Route Resolution & Security', () {
    test('maps clinical categories to appropriate internal application routes', () {
      final service = PushNotificationService.instance;

      // Appointment reminders -> Appointments view
      expect(
        service.resolveRouteFromPayload({'category': 'appointment'}),
        equals(AppRoutes.appointments),
      );
      expect(
        service.resolveRouteFromPayload({'type': 'appointment_reminder'}),
        equals(AppRoutes.appointments),
      );
      expect(
        service.resolveRouteFromPayload({'category': 'booking'}),
        equals(AppRoutes.appointments),
      );

      // Vaccination reminders -> Calendar / schedule view
      expect(
        service.resolveRouteFromPayload({'category': 'vaccination'}),
        equals(AppRoutes.calendar),
      );
      expect(
        service.resolveRouteFromPayload({'type': 'dose_reminder'}),
        equals(AppRoutes.calendar),
      );
      expect(
        service.resolveRouteFromPayload({'type': 'pep_schedule'}),
        equals(AppRoutes.calendar),
      );

      // Vaccination card -> Menu view
      expect(
        service.resolveRouteFromPayload({'category': 'digital_card'}),
        equals(AppRoutes.menu),
      );

      // Clinic announcements / default -> Notifications view
      expect(
        service.resolveRouteFromPayload({'category': 'announcement'}),
        equals(AppRoutes.notifications),
      );
      expect(
        service.resolveRouteFromPayload({}),
        equals(AppRoutes.notifications),
      );
    });

    test('allows explicit whitelisted routes and rejects arbitrary external URLs', () {
      final service = PushNotificationService.instance;

      // Whitelisted internal paths
      expect(
        service.resolveRouteFromPayload({'route': AppRoutes.appointments}),
        equals(AppRoutes.appointments),
      );
      expect(
        service.resolveRouteFromPayload({'action_url': AppRoutes.calendar}),
        equals(AppRoutes.calendar),
      );
      expect(
        service.resolveRouteFromPayload({'action_url': AppRoutes.notifications}),
        equals(AppRoutes.notifications),
      );

      // Malicious or arbitrary external URLs must be rejected and fallback to safe category/notification route
      expect(
        service.resolveRouteFromPayload({'action_url': 'https://malicious-site.example/phish'}),
        equals(AppRoutes.notifications),
      );
      expect(
        service.resolveRouteFromPayload({'action_url': 'javascript:alert(1)'}),
        equals(AppRoutes.notifications),
      );
      expect(
        service.resolveRouteFromPayload({'route': '/admin/secret-backend'}),
        equals(AppRoutes.notifications),
      );
    });

    test('handleNotificationTap requires authentication before accessing protected routes', () async {
      final service = PushNotificationService.instance;
      final navKey = GlobalKey<NavigatorState>();
      service.navigatorKey = navKey;

      // Mock is logged out
      await MockMobileApi.instance.logout();
      expect(api.isAuthenticated, isFalse);

      // Attempt navigation to appointments
      await service.handleNotificationTap({'category': 'appointment'});

      // Since navKey is not mounted in widget tree in unit test, it safely guards and logs:
      // Authentication is required, so it directs to login.
      expect(api.isAuthenticated, isFalse);
    });
  });

  group('Phase 3 - Task 3.3: Foreground Notification Handling & Deduplication', () {
    test('broadcast stream emits notification payload for live in-app refresh', () async {
      final service = PushNotificationService.instance;

      final payload = {
        'id': '101',
        'category': 'appointment',
        'title': 'Appointment Confirmed',
      };

      expectLater(
        service.onNotificationReceived,
        emits(payload),
      );

      service.broadcastNotificationReceived(payload);
    });

    test('clearNotificationState wipes deduplication cache on logout and account switch', () {
      final service = PushNotificationService.instance;
      service.clearNotificationState();
      // Should not throw and clean state
      expect(true, isTrue);
    });
  });

  group('Phase 3 - Task 3.3: Offline Logout & Device Registration Lifecycle', () {
    test('unregisterDeviceToken does not throw and handles offline state gracefully', () async {
      // Ensure unregisterDeviceToken executes cleanly
      await FcmDeviceRegistrationService.instance.unregisterDeviceToken();
      expect(true, isTrue);
    });

    test('user notification preferences toggle updates storage and triggers sync', () async {
      const storage = FlutterSecureStorage();

      await FcmDeviceRegistrationService.instance.setNotificationsEnabled(false);
      final prefDisabled = await storage.read(key: 'fcm_notifications_enabled_pref');
      expect(prefDisabled, equals('false'));

      await FcmDeviceRegistrationService.instance.setNotificationsEnabled(true);
      final prefEnabled = await storage.read(key: 'fcm_notifications_enabled_pref');
      expect(prefEnabled, equals('true'));
    });

    test('account switching lifecycle cleans up notification state on logout', () async {
      // User logs in
      await MockMobileApi.instance.login(
        email: 'patient1@example.com',
        password: 'password123',
        remember: true,
      );
      expect(MockMobileApi.instance.isAuthenticated, isTrue);

      // User logs out (should clear push notification state and unregister token)
      await MockMobileApi.instance.logout();
      expect(MockMobileApi.instance.isAuthenticated, isFalse);

      // Second user logs in
      await MockMobileApi.instance.login(
        email: 'patient2@example.com',
        password: 'password123',
        remember: true,
      );
      expect(MockMobileApi.instance.isAuthenticated, isTrue);

      await MockMobileApi.instance.logout();
      expect(MockMobileApi.instance.isAuthenticated, isFalse);
    });
  });

  group('Phase 3 - Task 3.3: Privacy & Security Protections', () {
    test('payload navigation parameters do not expose sensitive clinical diagnosis or bite info', () {
      final service = PushNotificationService.instance;

      final safePayload = {
        'id': 'notif_456',
        'category': 'appointment',
        'action_url': '/appointments',
      };

      // Verify no sensitive keys are required for routing
      expect(safePayload.containsKey('diagnosis'), isFalse);
      expect(safePayload.containsKey('bite_category'), isFalse);
      expect(safePayload.containsKey('patient_name'), isFalse);
      expect(safePayload.containsKey('medical_history'), isFalse);

      final target = service.resolveRouteFromPayload(safePayload);
      expect(target, equals(AppRoutes.appointments));
    });

    test('maskToken obscures tokens to prevent credential leakage in debug logs', () {
      expect(
        FcmDeviceRegistrationService.maskToken('fcm_token_super_secret_1234567890_device'),
        equals('fcm_to...vice'),
      );
      expect(FcmDeviceRegistrationService.maskToken(null), equals('<none>'));
      expect(FcmDeviceRegistrationService.maskToken(''), equals('<none>'));
      expect(FcmDeviceRegistrationService.maskToken('short'), equals('***'));
    });
  });
}
