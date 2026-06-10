import 'dart:async';

import 'package:flutter/material.dart';
import 'package:app_links/app_links.dart';

import '../core/constants/app_constants.dart';
import '../core/utils/url_utils.dart';

import '../data/local/local_store.dart';
import '../data/models/auth_result.dart';
import '../data/models/session_data.dart';
import '../data/remote/api_client.dart';

import '../features/auth/screens/auth_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../core/services/notification_service.dart';

/// The root widget of the Smart Locker application.
///
/// This widget acts as the entry point for the UI. It is responsible for:
/// 1. Bootstrapping the app by checking local storage for an existing token.
/// 2. Managing the global authentication state ([_session]).
/// 3. Routing the user to either the [AuthScreen] or [HomeScreen] based on their state

class SmartLockerApp extends StatefulWidget {
  const SmartLockerApp({super.key});

  @override
  State<SmartLockerApp> createState() => _SmartLockerAppState();
}

class _SmartLockerAppState extends State<SmartLockerApp> {
  bool _loading = true;
  SessionData? _session;
  String? _bootError;

  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  final GlobalKey<HomeScreenState> _homeKey = GlobalKey<HomeScreenState>();

  // Deep-link listener for payment callbacks (loxapp://payment?payment=...)
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _deepLinkSub;

  // Get the base url state
  String get _baseUrl => normalizeApiBaseUrl(AppConstants.defaultApiBaseUrl);

  // Immediately check for a saved login token on device startup
  @override
  void initState() {
    super.initState();
    _restoreSession();
    _initDeepLinks();
  }

  @override
  void dispose() {
    _deepLinkSub?.cancel();
    super.dispose();
  }

  /// Listen for incoming deep links from the loxapp:// scheme.
  /// Stripe redirects here after payment success or cancel.
  void _initDeepLinks() {
    _deepLinkSub = _appLinks.uriLinkStream.listen(
      (uri) => _handleDeepLink(uri),
      onError: (err) => debugPrint('[DeepLink] Error: $err'),
    );
  }

  void _handleDeepLink(Uri uri) {
    debugPrint('[DeepLink] Received: $uri');
    
    // Support both direct parameter and URL path formats
    String? payment = uri.queryParameters['payment'];
    if (payment == null) {
      final isSuccess = uri.host == 'payment-success' || uri.path.contains('payment-success');
      final isCancel = uri.host == 'payment-cancel' || uri.path.contains('payment-cancel');
      final type = uri.queryParameters['type'];
      
      if (type == 'overdue') {
        if (isSuccess) {
          payment = 'overdue_success';
        } else if (isCancel) {
          payment = 'overdue_cancel';
        }
      } else if (type == 'store') {
        if (isSuccess) {
          payment = 'store_success';
        } else if (isCancel) {
          payment = 'store_cancel';
        }
      }
    }

    if (payment == null) return;

    // Use a short delay so the app is fully foregrounded before showing UI
    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      final ctx = _navigatorKey.currentContext;
      if (ctx == null) return;
      if (payment == 'overdue_success') {
        _showPaymentResult(
          ctx,
          success: true,
          title: 'Payment Successful',
          message: 'Your overdue fee has been paid. You now have a grace period — unlock your locker and retrieve your items.',
          onDismiss: () {
            _homeKey.currentState?.refreshData();
          },
        );
      } else if (payment == 'overdue_cancel') {
        _showPaymentResult(
          ctx,
          success: false,
          title: 'Payment Cancelled',
          message: 'The payment was cancelled. Your locker is still locked until the overdue fee is paid.',
          onDismiss: () {
            _homeKey.currentState?.refreshData();
          },
        );
      }
    });
  }

  void _showPaymentResult(
    BuildContext ctx, {
    required bool success,
    required String title,
    required String message,
    VoidCallback? onDismiss,
  }) {
    showDialog<void>(
      context: ctx,
      barrierDismissible: false,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        icon: Icon(
          success ? Icons.check_circle_rounded : Icons.cancel_rounded,
          color: success ? const Color(0xFF027A48) : const Color(0xFFC81E1E),
          size: 52,
        ),
        title: Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        content: Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(height: 1.45),
        ),
        actions: [
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: success ? const Color(0xFF027A48) : const Color(0xFF64674B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              minimumSize: const Size(double.infinity, 44),
            ),
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              if (onDismiss != null) onDismiss();
            },
            child: const Text('OK', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  /// Asynchronously check for a saved token and attempt to restore the session.
  /// If successful, set the session data; if not, just stop loading and show the auth screen.
  Future<void> _restoreSession() async {
    try {
      final bootstrap = await LocalStore.loadBootstrap(); // we only need token
      final token = bootstrap.token;

      // Stop load and show auth screen if no token found
      if (token.isEmpty) {
        setState(() => _loading = false);
        return;
      }

      final client = ApiClient(
        baseUrl: _baseUrl, // always from AppConfig now
        token: token,
      );

      final user = await client.fetchMe(); // fetch already logged in user data

      // the user might have closed the app or navigated away before the server responds
      if (!mounted) return;
      setState(() {
        _session = SessionData(client: client, user: user);
        _loading = false;
        _bootError = null;
      });
      FirebaseNotificationService.instance.initialize(client);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _bootError = error.toString();
      });
    }
  }

  /// Handles authentication success from the [AuthScreen].
  /// Called when the user successfully logs in or registers.
  Future<void> _handleAuthSuccess(AuthResult result) async {
    setState(() {
      _loading = true;
      _bootError = null;
    });

    try {
      final client = ApiClient(
        baseUrl: _baseUrl, // always from AppConfig
        token: result.token,
      );

      // Keep your existing LocalStore method. Store baseUrl too if your model requires it.
      await LocalStore.saveBootstrap(baseUrl: _baseUrl, token: result.token);

      if (!mounted) return;
      setState(() {
        _session = SessionData(client: client, user: result.user);
        _loading = false;
      });
      FirebaseNotificationService.instance.initialize(client);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _bootError = error.toString();
      });
    }
  }

  /// Handle logout by clearing the saved token and resetting the session state.
  Future<void> _logout() async {
    if (_session != null) {
      try {
        await _session!.client.updateFcmToken('');
      } catch (e) {
        debugPrint('Error clearing FCM token on logout: $e');
      }
    }
    await LocalStore.clearToken();
    if (!mounted) return;
    setState(() {
      _session = null;
    });
  }

  /// Build the main app widget.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Locker',
      navigatorKey: _navigatorKey,
      scaffoldMessengerKey: FirebaseNotificationService.instance.scaffoldMessengerKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF64674B),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF2F1EF),
        useMaterial3: true,
      ),
      home: _loading
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ) // a loading spinner
          : _session ==
                null // No valid session: Show AuthScreen and pass the success callback
          ? AuthScreen(
              errorMessage: _bootError,
              onAuthSuccess: _handleAuthSuccess,
            )
          // Valid session: Show HomeScreen and pass the logout callback
          : HomeScreen(key: _homeKey, session: _session!, onLogout: _logout),
    );
  }
}

