import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/url_utils.dart';
import '../../../data/models/auth_result.dart';
import '../../../data/remote/api_client.dart';

/// The user registration interface for the Smart Locker application.
///
/// Handles capturing user details (name, email, password), performing
/// client-side validation (e.g., password matching), and communicating
/// with the [ApiClient] to create a new account.

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.onAuthSuccess,
    this.onLoginTap,
    this.showTabToggle = true,
  });

  /// Callback executed when the API successfully registers the user and returns an [AuthResult].
  final Future<void> Function(AuthResult result) onAuthSuccess;

  /// Callback to switch the parent [AuthScreen] back to the Login tab.
  final VoidCallback? onLoginTap;

  /// Determines if the [ LOGIN | JOIN ] toggle should be rendered.
  final bool showTabToggle;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // Controllers to read the text input from the user
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;
  late final TextEditingController _confirmPasswordController;

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
  }

  @override
  void dispose() {
    // CRITICAL: You must dispose of all controllers when this screen is destroyed
    // to prevent severe memory leaks, especially with this many inputs.
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _register() async {
    final baseUrl = normalizeApiBaseUrl(AppConstants.defaultApiBaseUrl);
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      _showError('Name, email and password are required.');
      return;
    }
    if (password != confirmPassword) {
      _showError('Passwords do not match.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final result = await ApiClient(
        baseUrl: baseUrl,
        token: '',
      ).register(name: name, email: email, password: password);
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
                      _TabButton(
                        label: 'LOGIN',
                        selected: false,
                        onTap:
                            widget.onLoginTap ?? () => Navigator.pop(context),
                      ),
                      const _TabButton(
                        label: 'JOIN',
                        selected: true,
                        onTap: null,
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
              'Create Account',
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
              'JOIN THE SECURE LOCKER NETWORK',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
                color: AppColors.textLabel,
              ),
            ),
            const SizedBox(height: 36),
            const _FieldLabel('FULL NAME'),
            const SizedBox(height: 8),
            _LockerTextField(
              controller: _nameController,
              hintText: 'John Doe',
              icon: Icons.person_outline_rounded,
              fieldBg: AppColors.fieldBackground,
              hintColor: AppColors.textHint,
            ),
            const SizedBox(height: 20),
            const _FieldLabel('EMAIL ADDRESS'),
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
            const _FieldLabel('PASSWORD'),
            const SizedBox(height: 8),
            _LockerTextField(
              controller: _passwordController,
              hintText: '••••••••',
              icon: Icons.vpn_key_outlined,
              obscureText: true,
              fieldBg: AppColors.fieldBackground,
              hintColor: AppColors.textHint,
            ),
            const SizedBox(height: 20),
            const _FieldLabel('CONFIRM PASSWORD'),
            const SizedBox(height: 8),
            _LockerTextField(
              controller: _confirmPasswordController,
              hintText: '••••••••',
              icon: Icons.vpn_key_outlined,
              obscureText: true,
              fieldBg: AppColors.fieldBackground,
              hintColor: AppColors.textHint,
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _submitting ? null : _register,
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
                        'CREATE ACCOUNT',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.8,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 20),
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
            const SizedBox(height: 28),
          ],
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.2,
        color: AppColors.textLabel,
      ),
    );
  }
}

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
