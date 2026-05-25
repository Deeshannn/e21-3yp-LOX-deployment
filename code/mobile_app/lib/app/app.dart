import 'package:flutter/material.dart';

import '../core/constants/app_constants.dart';
import '../core/utils/url_utils.dart';

import '../data/local/local_store.dart';
import '../data/models/auth_result.dart';
import '../data/models/session_data.dart';
import '../data/remote/api_client.dart';

import '../features/auth/screens/auth_screen.dart';
import '../features/home/screens/home_screen.dart';

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

  // Get the base url state
  String get _baseUrl => normalizeApiBaseUrl(AppConstants.defaultApiBaseUrl);

  // Immediately check for a saved login token on device startup
  @override
  void initState() {
    super.initState();
    _restoreSession();
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
        // Session restored successfully. Update state and trigger a rebuild.
        _session = SessionData(
          client: ApiClient(
            baseUrl: _baseUrl,
            token: token,
            userId: user.id,
          ),
          user: user,
        );
        _loading = false;
        _bootError = null;
      });
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
        userId: result.user.id,
      );

      // Keep your existing LocalStore method. Store baseUrl too if your model requires it.
      await LocalStore.saveBootstrap(baseUrl: _baseUrl, token: result.token);

      if (!mounted) return;
      setState(() {
        _session = SessionData(client: client, user: result.user);
        _loading = false;
      });
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
          : HomeScreen(session: _session!, onLogout: _logout),
    );
  }
}
