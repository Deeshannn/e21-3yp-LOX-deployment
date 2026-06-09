import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../../data/remote/api_client.dart';

class FirebaseNotificationService {
  FirebaseNotificationService._privateConstructor();
  static final FirebaseNotificationService instance = FirebaseNotificationService._privateConstructor();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
  bool _initialized = false;
  ApiClient? _apiClient;

  /// Initialize Firebase Cloud Messaging settings and listeners.
  Future<void> initialize(ApiClient? apiClient) async {
    _apiClient = apiClient;
    if (_initialized) {
      _registerToken();
      return;
    }

    try {
      // 1. Request notification permission
      final settings = await _fcm.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      debugPrint('User granted permission: ${settings.authorizationStatus}');

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        await _fcm.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
      } else {
        debugPrint('Notification permission not granted. Background notifications may be blocked by OS settings.');
      }

      // 2. Fetch and register token
      await _registerToken();

      // 3. Listen to token refresh
      _fcm.onTokenRefresh.listen((token) {
        debugPrint('FCM Token Refreshed: $token');
        _registerToken();
      });

      // 4. Foreground message listener
      // Do not convert background/system notifications into in-app popups.
      // FCM will show normal system notifications when the app is in background or terminated.
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('Received foreground notification: ${message.notification?.title}');
        // Keep this handler only for logging or app-specific processing.
        // If you want a system notification while the app is in foreground, use a local notifications plugin.
      });

      // 5. Background / Terminated notification click handler
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('Notification opened app: ${message.data}');
      });

      // Check if the app was opened from a terminated state via a notification
      final initialMessage = await _fcm.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('App opened from terminated state via notification: ${initialMessage.data}');
      }

      _initialized = true;
    } catch (e) {
      debugPrint('Failed to initialize Firebase Messaging: $e');
    }
  }

  /// Register FCM token to our backend server
  Future<void> _registerToken() async {
    if (_apiClient == null) {
      debugPrint('[Notification] Cannot register token: ApiClient is null');
      return;
    }
    try {
      final token = await _fcm.getToken();
      if (token != null) {
        debugPrint('[Notification] FCM Token retrieved: $token');
        await _apiClient!.updateFcmToken(token);
        debugPrint('[Notification] FCM Token successfully registered to backend.');
      } else {
        debugPrint('[Notification] FCM Token retrieved is null.');
      }
    } catch (e) {
      debugPrint('[Notification] Error registering FCM token to backend: $e');
    }
  }
}
