import 'dart:async';
import 'dart:io' show Platform;
import 'dart:math';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api.dart';

/// Service responsible for managing FCM device registration, permission requests,
/// token synchronization with the backend, token rotation, and privacy-compliant logout cleanup.
class FcmDeviceRegistrationService {
  FcmDeviceRegistrationService._();

  static final FcmDeviceRegistrationService instance = FcmDeviceRegistrationService._();

  static const _storage = FlutterSecureStorage();
  static const _installationIdKey = 'fcm_device_installation_id';
  static const _notificationPrefKey = 'fcm_notifications_enabled_pref';

  String? _installationId;
  String? _lastRegisteredToken;
  StreamSubscription<String>? _tokenRefreshSubscription;
  Future<bool>? _inFlightSync;
  bool _initialized = false;

  /// Returns true if Firebase has been initialized in this application runtime.
  bool get isFirebaseAvailable => Firebase.apps.isNotEmpty;

  /// Helper to mask FCM token for secure debug logging without exposing credentials or PII.
  static String maskToken(String? token) {
    if (token == null || token.isEmpty) return '<none>';
    if (token.length <= 10) return '***';
    return '${token.substring(0, 6)}...${token.substring(token.length - 4)}';
  }

  /// Initialize the service, persistent device installation ID, and token rotation listeners.
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    try {
      _installationId = await _storage.read(key: _installationIdKey);
      if (_installationId == null) {
        final randomPart = Random().nextInt(0x7fffffff).toRadixString(16);
        final timestamp = DateTime.now().millisecondsSinceEpoch.toRadixString(16);
        _installationId = 'inst_${timestamp}_$randomPart';
        await _storage.write(key: _installationIdKey, value: _installationId);
      }
    } catch (e) {
      debugPrint('ℹ️ Could not access secure storage for installation ID: $e');
    }

    if (isFirebaseAvailable) {
      _setupTokenRefreshListener();
    }
  }

  /// Listen for FCM registration token rotations/updates from Google Play Services.
  void _setupTokenRefreshListener() {
    _tokenRefreshSubscription?.cancel();
    try {
      // ignore: deprecated_member_use
      _tokenRefreshSubscription = FirebaseMessaging.instance.onTokenRefresh.listen(
        (newToken) async {
          debugPrint('🔄 FCM registration token refreshed: ${maskToken(newToken)}');
          if (api.isAuthenticated) {
            await syncDeviceToken(explicitToken: newToken, force: true);
          }
        },
        onError: (Object error) {
          debugPrint('⚠️ FCM token refresh stream encountered an error: $error');
        },
      );
    } catch (e) {
      debugPrint('ℹ️ FCM token refresh listener not registered: $e');
    }
  }

  /// Request notification permission from the user.
  /// Denial does not disrupt application usage or throw unhandled exceptions.
  Future<bool> requestNotificationPermission() async {
    if (!isFirebaseAvailable) return false;

    try {
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      final isAuthorized = settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;

      if (!isAuthorized) {
        debugPrint('ℹ️ Notification permission not granted (${settings.authorizationStatus})');
      }

      return isAuthorized;
    } catch (e) {
      debugPrint('ℹ️ Notification permission check failed: $e');
      return false;
    }
  }

  /// Retrieve the current FCM registration token from the Firebase Messaging SDK.
  Future<String?> getFcmToken() async {
    if (!isFirebaseAvailable) return null;

    try {
      // ignore: deprecated_member_use
      final token = await FirebaseMessaging.instance.getToken();
      return token;
    } catch (e) {
      debugPrint('ℹ️ Unable to retrieve FCM token: $e');
      return null;
    }
  }

  /// Determine the device platform string for backend registration.
  String get _platformName {
    if (kIsWeb) return 'web';
    try {
      if (Platform.isAndroid) return 'android';
      if (Platform.isIOS) return 'ios';
    } catch (_) {}
    return 'android';
  }

  /// Synchronize the FCM device token with the Laravel backend.
  /// Guarded against duplicate registration requests and concurrent calls.
  Future<bool> syncDeviceToken({String? explicitToken, bool force = false}) async {
    if (!api.isAuthenticated) {
      debugPrint('ℹ️ Device token sync skipped: user is not authenticated.');
      return false;
    }

    if (_inFlightSync != null && explicitToken == null && !force) {
      return _inFlightSync!;
    }

    final completer = Completer<bool>();
    _inFlightSync = completer.future;

    try {
      await initialize();

      // Check notification preferences
      final pref = await _storage.read(key: _notificationPrefKey);
      if (pref == 'false') {
        debugPrint('ℹ️ Push notifications disabled in user preferences.');
        completer.complete(false);
        return false;
      }

      // Check permission
      final hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        completer.complete(false);
        return false;
      }

      // Obtain token
      final token = explicitToken ?? await getFcmToken();
      if (token == null || token.trim().isEmpty) {
        debugPrint('ℹ️ No valid FCM registration token available.');
        completer.complete(false);
        return false;
      }

      // Prevent redundant identical registration requests
      if (!force && _lastRegisteredToken == token) {
        completer.complete(true);
        return true;
      }

      // Register with Laravel backend
      await api.registerDeviceToken(
        fcmToken: token,
        deviceId: _installationId,
        deviceType: _platformName,
        deviceName: 'Mobile App ($_platformName)',
      );

      _lastRegisteredToken = token;
      await _storage.delete(key: 'fcm_pending_deregistration_token');
      debugPrint('✅ FCM device token successfully registered with backend: ${maskToken(token)}');
      completer.complete(true);
      return true;
    } catch (error) {
      debugPrint('⚠️ FCM device token registration failed gracefully: $error');
      completer.complete(false);
      return false;
    } finally {
      _inFlightSync = null;
    }
  }

  /// Invalidate and remove device registration from the backend upon patient logout.
  /// Handles network failures gracefully without preventing local logout.
  /// Note: When offline, immediate server-side revocation is not guaranteed;
  /// instead, a pending cleanup flag is recorded locally and server revocation occurs
  /// upon next login, account switch, or server token cleanup.
  Future<void> unregisterDeviceToken() async {
    final tokenToRemove = _lastRegisteredToken;
    final deviceIdToRemove = _installationId;

    _lastRegisteredToken = null;

    if (!api.isAuthenticated) return;

    try {
      await api.deleteDeviceToken(
        fcmToken: tokenToRemove,
        deviceId: deviceIdToRemove,
      );
      await _storage.delete(key: 'fcm_pending_deregistration_token');
      debugPrint('🔒 FCM device token revoked from backend on logout: ${maskToken(tokenToRemove)}');
    } catch (e) {
      if (tokenToRemove != null) {
        await _storage.write(key: 'fcm_pending_deregistration_token', value: tokenToRemove);
      }
      debugPrint('ℹ️ Offline logout: device token could not be revoked from server immediately; local session cleared. Stale registration will be revoked upon next authentication or server token cleanup ($e)');
    }
  }

  /// Update the notification preference. If disabled, deregisters the device token.
  Future<void> setNotificationsEnabled(bool enabled) async {
    await _storage.write(key: _notificationPrefKey, value: enabled.toString());
    if (enabled) {
      await syncDeviceToken(force: true);
    } else {
      await unregisterDeviceToken();
    }
  }

  /// Clean up subscriptions (for unit testing or teardown).
  void dispose() {
    _tokenRefreshSubscription?.cancel();
    _tokenRefreshSubscription = null;
    _initialized = false;
    _lastRegisteredToken = null;
  }
}
