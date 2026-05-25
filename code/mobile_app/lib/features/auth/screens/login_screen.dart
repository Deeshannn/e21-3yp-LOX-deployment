import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/url_utils.dart';
import '../../../data/models/auth_result.dart';
import '../../../data/remote/api_client.dart';

/// The user login interface for the Smart Locker application.
///
/// This screen handles user input for email and password, validates the input,
/// and communicates with the [ApiClient] to authenticate the user.

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.onAuthSuccess,
    this.errorMessage,
    this.onJoinTap,
    this.showTabToggle = true,
  });

  /// Callback executed when the API successfully returns an [AuthResult].
  final Future<void> Function(AuthResult result) onAuthSuccess;

  /// An optional error message to display on load (e.g., session expired).
  final String? errorMessage;

  /// Callback to switch the parent [AuthScreen] to the Register tab.
  final VoidCallback? onJoinTap;

  /// Determines if the [ LOGIN | JOIN ] toggle should be rendered.
  final bool showTabToggle;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Controllers manage the text being typed into the text fields
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;

  bool _submitting = false; // Tracks network state to disable buttons and show a loading spinner

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _login() async {
    final baseUrl = normalizeApiBaseUrl(AppConstants.defaultApiBaseUrl);
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      _showError('Email and password are required.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final result = await ApiClient(
        baseUrl: baseUrl,
        token: '',
      ).login(email: email, password: password);
      await widget.onAuthSuccess(result);
    } catch (e) {
      if (mounted) _showError(e.toString());
    }
    if (mounted) setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          children: [
            const SizedBox(height: 28),
            if (widget.showTabToggle)
              Center(
                child: Container(
                  height: 44,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.fieldBackground,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const _TabButton(
                        label: 'LOGIN',
                        selected: true,
                        onTap: null,
                      ),
                      _TabButton(
                        label: 'JOIN',
                        selected: false,
                        onTap: widget.onJoinTap,
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 36),
            SvgPicture.asset(
              'assets/images/lox_logo_auth.svg',
              width: 90,
              height: 90,
            ),
            const Text(
              'Welcome Back',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'ENTER CREDENTIALS TO ACCESS LOCKER',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
                color: AppColors.textLabel,
              ),
            ),
            const SizedBox(height: 36),
            const Text(
              'EMAIL ADDRESS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
                color: AppColors.textLabel,
              ),
            ),
            const SizedBox(height: 8),
            _LockerTextField(
              controller: _emailController,
              hintText: 'you@example.com',
              icon: Icons.mail_outline_rounded,
              keyboardType: TextInputType.emailAddress,
              fieldBg: AppColors.fieldBackground,
              hintColor: AppColors.textHint,
            ),
            const SizedBox(height: 20),
            const Text(
              'PASSWORD',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
                color: AppColors.textLabel,
              ),
            ),
            const SizedBox(height: 8),
            _LockerTextField(
              controller: _passwordController,
              hintText: '••••••••',
              icon: Icons.vpn_key_outlined,
              obscureText: true,
              fieldBg: AppColors.fieldBackground,
              hintColor: AppColors.textHint,
            ),
            const SizedBox(height: 32),
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _submitting ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.olive,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.olive.withOpacity(0.6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(32),
                  ),
                  elevation: 0,
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'SIGN IN',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.8,
                        ),
                      ),
              ),
            ),
            // const SizedBox(height: 28),
            // const Center(
            //   child: Text(
            //     'OR CONTINUE WITH',
            //     style: TextStyle(
            //       fontSize: 10,
            //       fontWeight: FontWeight.w500,
            //       letterSpacing: 1.2,
            //       color: AppColors.textHint,
            //     ),
            //   ),
            // ),
            const SizedBox(height: 10),
            Center(
              child: RichText(
                textAlign: TextAlign.center,
                text: const TextSpan(
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.textHint,
                    letterSpacing: 0.5,
                  ),
                  children: [
                    TextSpan(text: 'BY CONTINUING, YOU AGREE TO OUR '),
                    TextSpan(
                      text: 'SECURITY PROTOCOLS',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.oliveDark,
                      ),
                    ),
                    TextSpan(text: ' & '),
                    TextSpan(
                      text: 'TERMS OF USE',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.oliveDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (widget.errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(
                widget.errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ── Shared Sub-Widgets ──────────────────────────────────────────────────────
// Note: As app grows, these should be moved to lib/features/auth/widgets/
// so they can be easily shared with the RegisterScreen without duplicating code.

/// A custom animated toggle button used for switching between Login and Join.
class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: selected ? AppColors.textMain : AppColors.textMuted,
          ),
        ),
      ),
    );
  }
}


/// A standardized text input field formatted for the locker app's design system.
class _LockerTextField extends StatelessWidget {
  const _LockerTextField({
    required this.controller,
    required this.hintText,
    required this.icon,
    required this.fieldBg,
    required this.hintColor,
    this.keyboardType,
    this.obscureText = false,
  });

  final TextEditingController controller;
  final String hintText;
  final IconData icon;
  final Color fieldBg;
  final Color hintColor;
  final TextInputType? keyboardType;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: fieldBg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        style: const TextStyle(
          fontSize: 16,
          color: AppColors.textField,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(color: hintColor, fontWeight: FontWeight.w400),
          prefixIcon: Icon(icon, color: hintColor, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
      ),
    );
  }
}
