import 'package:flutter/material.dart';
import '../../../data/models/auth_result.dart';
import 'login_screen.dart';
import 'register_screen.dart';

/// The entry point for all authentication-related flows.
///
/// Manages the state between the [LoginScreen] and [RegisterScreen] 
/// using an IndexedStack to preserve user input while toggling between forms.

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.onAuthSuccess, this.errorMessage});

  final Future<void> Function(AuthResult result) onAuthSuccess;
  final String? errorMessage;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  int _tabIndex = 0; // Login by default

  @override
  Widget build(BuildContext context) {
    return IndexedStack(
      index: _tabIndex,
      children: [
        LoginScreen(
          onAuthSuccess: widget.onAuthSuccess,
          errorMessage: widget.errorMessage,
          onJoinTap: () => setState(() => _tabIndex = 1),
        ),
        RegisterScreen(
          onAuthSuccess: widget.onAuthSuccess,
          onLoginTap: () => setState(() => _tabIndex = 0),
        ),
      ],
    );
  }
}
