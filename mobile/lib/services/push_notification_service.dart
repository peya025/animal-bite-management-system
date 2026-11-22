import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../app/app_routes.dart';
import 'api.dart';

/// Top-level background message handler required by Firebase on Android.
/// Must be annotated with @pragma('vm:entry-point') so it is not tree-shaken by the Dart AOT compiler.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Note: Messages with a `notification` payload are rendered natively by the
  // Android operating system in the system tray via Google Play Services using
  // the channel configured in AndroidManifest.xml (`abtcare_reminders`).
  // We do NOT show a duplicate local notification here to prevent redundant alerts.
  debugPrint('📥 FCM background message received: ${message.messageId}');
}

/// Service responsible for mobile push notification handling, Android notification channel setup,
/// foreground banner display via Flutter Local Notifications, notification tap deep linking,
/// deduplication, and privacy-compliant payload handling.
class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  // Notification Channel Constants (matching Firebase backend configuration)
  static const String channelId = 'abtcare_reminders';
  static const String channelName = 'ABTC Notifications';
  static const String channelDescription =
      'Appointment updates, reminders, and important clinic announcements.';
  static const String defaultNotificationIcon = '@drawable/ic_notification';
  static const String _notificationPrefKey = 'fcm_notifications_enabled_pref';

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  GlobalKey<NavigatorState>? navigatorKey;

  final StreamController<Map<String, dynamic>> _notificationReceivedController =
      StreamController<Map<String, dynamic>>.broadcast();

  /// Stream of incoming foreground notifications for real-time UI refresh (e.g. badge counters, lists).
  Stream<Map<String, dynamic>> get onNotificationReceived =>
      _notificationReceivedController.stream;

  /// Broadcast a notification payload to in-app listeners (used on foreground push arrival or testing).
  void broadcastNotificationReceived(Map<String, dynamic> data) {
    if (!_notificationReceivedController.isClosed) {
      _notificationReceivedController.add(data);
    }
  }

  final Set<String> _processedMessageIds = <String>{};
  static const int _maxDeduplicationCacheSize = 100;

  bool _initialized = false;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _messageOpenedAppSubscription;

  /// Android Notification Channel definition for high-importance clinical reminders.
  static final AndroidNotificationChannel androidNotificationChannel =
      AndroidNotificationChannel(
    channelId,
    channelName,
    description: channelDescription,
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
    vibrationPattern: Int64List.fromList([0, 250, 250, 250]),
  );

  /// Returns true if Firebase has been initialized in this application runtime.
  bool get isFirebaseAvailable => Firebase.apps.isNotEmpty;

  /// Initialize local notifications, create Android channels, and register FCM lifecycle listeners.
  Future<void> initialize({GlobalKey<NavigatorState>? navigatorKey}) async {
    if (navigatorKey != null) {
      this.navigatorKey = navigatorKey;
    }

    if (_initialized) return;
    _initialized = true;

    await _initializeLocalNotifications();

    if (isFirebaseAvailable) {
      await _setupForegroundPresentationOptions();
      _setupForegroundMessageListener();
      _setupMessageOpenedAppListener();
    }
  }

  /// Initialize FlutterLocalNotificationsPlugin with Android & iOS settings.
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings(defaultNotificationIcon);
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
      macOS: darwinSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
    );

    // Register Android notification channel
    if (!kIsWeb) {
      try {
        if (Platform.isAndroid) {
          final androidPlugin = _localNotifications
              .resolvePlatformSpecificImplementation<
                  AndroidFlutterLocalNotificationsPlugin>();
          if (androidPlugin != null) {
            await androidPlugin.createNotificationChannel(androidNotificationChannel);
            debugPrint('🔔 Android notification channel registered: $channelId');
          }
        }
      } catch (e) {
        debugPrint('ℹ️ Android notification channel registration skipped or failed: $e');
      }
    }
  }

  /// Set Firebase foreground presentation options to suppress default OS banners
  /// in favor of our custom FlutterLocalNotifications heads-up display.
  Future<void> _setupForegroundPresentationOptions() async {
    try {
      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: false,
        badge: true,
        sound: true,
      );
    } catch (e) {
      debugPrint('ℹ️ Could not configure foreground notification presentation: $e');
    }
  }

  /// Listen for FCM messages arriving while the application is in the foreground.
  void _setupForegroundMessageListener() {
    _foregroundSubscription?.cancel();
    try {
      _foregroundSubscription =
          FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
        debugPrint('📥 FCM foreground message received: ${message.messageId}');
        await handleForegroundMessage(message);
      }, onError: (Object error) {
        debugPrint('⚠️ FCM foreground listener error: $error');
      });
    } catch (e) {
      debugPrint('ℹ️ Foreground message listener not registered: $e');
    }
  }

  /// Listen for FCM notification taps when the application is brought from background.
  void _setupMessageOpenedAppListener() {
    _messageOpenedAppSubscription?.cancel();
    try {
      _messageOpenedAppSubscription =
          FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('👆 FCM message tapped (from background): ${message.messageId}');
        handleNotificationTap(message.data);
      }, onError: (Object error) {
        debugPrint('⚠️ FCM onMessageOpenedApp listener error: $error');
      });
    } catch (e) {
      debugPrint('ℹ️ onMessageOpenedApp listener not registered: $e');
    }
  }

  /// Process foreground FCM messages: check preferences, deduplicate, display banner, and broadcast.
  Future<void> handleForegroundMessage(RemoteMessage message) async {
    // 1. Deduplication check
    final messageId = message.messageId ??
        '${message.sentTime?.millisecondsSinceEpoch}_${message.data['id']}_${message.data['category']}';
    if (_processedMessageIds.contains(messageId)) {
      debugPrint('ℹ️ Duplicate notification suppressed: $messageId');
      return;
    }
    _addDeduplicationId(messageId);

    // 2. Check notification preferences
    final pref = await _storage.read(key: _notificationPrefKey);
    if (pref == 'false') {
      debugPrint('ℹ️ Foreground notification banner suppressed by user preference.');
      return;
    }

    // 3. Extract notification content
    final notification = message.notification;
    final title = notification?.title ??
        message.data['title']?.toString() ??
        'Clinic Update';
    final body = notification?.body ??
        message.data['body']?.toString() ??
        message.data['message']?.toString() ??
        'You have a new update from the clinic.';

    // 4. Show heads-up banner via flutter_local_notifications
    final notificationId = (message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch) & 0x7fffffff;
    await showLocalNotification(
      id: notificationId,
      title: title,
      body: body,
      payload: message.data,
    );

    // 5. Broadcast received event for in-app UI refresh without navigating away
    _notificationReceivedController.add(message.data);
  }

  /// Display a heads-up local notification banner with chime and vibration.
  Future<void> showLocalNotification({
    required int id,
    required String title,
    required String body,
    Map<String, dynamic>? payload,
  }) async {
    final androidNotificationDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.high,
      priority: Priority.high,
      icon: defaultNotificationIcon,
      playSound: true,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 250, 250, 250]),
      styleInformation: BigTextStyleInformation(
        body,
        contentTitle: title,
      ),
    );

    const darwinNotificationDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final notificationDetails = NotificationDetails(
      android: androidNotificationDetails,
      iOS: darwinNotificationDetails,
      macOS: darwinNotificationDetails,
    );

    final encodedPayload = payload != null ? jsonEncode(payload) : null;

    try {
      await _localNotifications.show(
        id,
        title,
        body,
        notificationDetails,
        payload: encodedPayload,
      );
    } catch (e) {
      debugPrint('⚠️ Could not display local notification: $e');
    }
  }

  /// Handle notification tap callback from FlutterLocalNotificationsPlugin.
  void _onNotificationResponse(NotificationResponse response) {
    debugPrint('👆 Local notification tapped (action: ${response.notificationResponseType})');
    final payloadString = response.payload;
    if (payloadString != null && payloadString.isNotEmpty) {
      try {
        final data = jsonDecode(payloadString) as Map<String, dynamic>;
        handleNotificationTap(data);
      } catch (e) {
        debugPrint('⚠️ Failed to decode notification tap payload: $e');
        handleNotificationTap(const {});
      }
    } else {
      handleNotificationTap(const {});
    }
  }

  /// Check for cold boot launch from an FCM push notification (terminated state).
  Future<void> checkInitialMessage() async {
    if (!isFirebaseAvailable) return;

    try {
      final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('🚀 App launched from terminated state via notification: ${initialMessage.messageId}');
        // Allow the widget tree and auth state to settle before routing
        WidgetsBinding.instance.addPostFrameCallback((_) {
          handleNotificationTap(initialMessage.data);
        });
      }
    } catch (e) {
      debugPrint('ℹ️ getInitialMessage check failed: $e');
    }
  }

  /// Safely resolve target route and navigate user to the relevant screen.
  /// Requires authentication before displaying sensitive patient records.
  Future<void> handleNotificationTap(Map<String, dynamic> data) async {
    final targetRoute = resolveRouteFromPayload(data);

    // Authentication Guard: Protected routes require active patient authentication
    if (!api.isAuthenticated) {
      debugPrint('🔒 Authentication required before navigating to $targetRoute');
      navigatorKey?.currentState?.pushNamed(AppRoutes.login);
      return;
    }

    if (navigatorKey?.currentState == null) {
      debugPrint('⚠️ NavigatorState is not available for notification navigation.');
      return;
    }

    try {
      debugPrint('🧭 Navigating from notification tap to: $targetRoute');
      navigatorKey?.currentState?.pushNamed(targetRoute);
    } catch (e) {
      debugPrint('⚠️ Navigation error on notification tap: $e');
      navigatorKey?.currentState?.pushNamed(AppRoutes.notifications);
    }
  }

  /// Validate and map push notification payload parameters to safe application routes.
  /// Rejects arbitrary URLs, external schemes, and unrecognized destinations.
  String resolveRouteFromPayload(Map<String, dynamic> data) {
    // 1. Explicit validated internal route
    final rawRoute = data['route']?.toString() ?? data['action_url']?.toString();
    if (rawRoute != null && rawRoute.trim().isNotEmpty) {
      final sanitized = rawRoute.trim();
      // Whitelist permitted internal application paths
      final allowedRoutes = <String>{
        AppRoutes.welcome,
        AppRoutes.login,
        AppRoutes.signUp,
        AppRoutes.menu,
        AppRoutes.booking,
        AppRoutes.history,
        AppRoutes.settings,
        AppRoutes.notifications,
        AppRoutes.appointments,
        AppRoutes.calendar,
        AppRoutes.privacySecurity,
        AppRoutes.boosterGuidance,
      };

      if (allowedRoutes.contains(sanitized)) {
        return sanitized;
      }
    }

    // 2. Category / Type mapping
    final category = (data['category'] ?? data['type'] ?? '').toString().toLowerCase();

    switch (category) {
      case 'appointment':
      case 'appointments':
      case 'appointment_reminder':
      case 'appointment_status':
      case 'appointment_changed':
      case 'booking':
        return AppRoutes.appointments;

      case 'vaccination':
      case 'vaccination_schedule':
      case 'dose_reminder':
      case 'pep_reminder':
      case 'pep_schedule':
      case 'calendar':
      case 'schedule':
        return AppRoutes.calendar;

      case 'digital_card':
      case 'vaccination_card':
      case 'card':
        // Routed to menu where the patient card and action buttons are immediately accessible
        return AppRoutes.menu;

      case 'announcement':
      case 'clinic_update':
      case 'notifications':
      default:
        return AppRoutes.notifications;
    }
  }

  /// Maintain deduplication set with size bounds.
  void _addDeduplicationId(String id) {
    if (_processedMessageIds.length >= _maxDeduplicationCacheSize) {
      _processedMessageIds.remove(_processedMessageIds.first);
    }
    _processedMessageIds.add(id);
  }

  /// Clear in-memory notification caches (called upon account switch or logout).
  void clearNotificationState() {
    _processedMessageIds.clear();
  }

  /// Dispose listeners and streams (for testing or lifecycle cleanup).
  void dispose() {
    _foregroundSubscription?.cancel();
    _foregroundSubscription = null;
    _messageOpenedAppSubscription?.cancel();
    _messageOpenedAppSubscription = null;
    _initialized = false;
    _processedMessageIds.clear();
  }
}
