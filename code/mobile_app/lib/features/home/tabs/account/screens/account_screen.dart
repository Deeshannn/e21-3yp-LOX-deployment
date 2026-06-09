import 'package:flutter/material.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';
import 'profile_edit_screen.dart';

import '../../../../../core/services/biometric_service.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    required this.user,
    required this.client,
    required this.onProfileUpdated,
    required this.onLogout,
  });

  final UserProfile user;
  final ApiClient client;
  final ValueChanged<UserProfile> onProfileUpdated;
  final Future<void> Function() onLogout;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _biometricEnabled = false;
  bool _deviceSupportsBiometrics = false;

  @override
  void initState() {
    super.initState();
    _loadBiometricSettings();
  }

  Future<void> _loadBiometricSettings() async {
    final supports = await BiometricService.instance.canAuthenticate();
    final enabled = await BiometricService.instance.isBiometricEnabled();
    setState(() {
      _deviceSupportsBiometrics = supports;
      _biometricEnabled = enabled;
    });
  }

  Future<void> _disableBiometrics() async {
    await BiometricService.instance.clearCredentials();
    setState(() {
      _biometricEnabled = false;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Biometric authentication disabled.'),
        ),
      );
    }
  }

  Future<void> _enableBiometrics() async {
    final passwordController = TextEditingController();
    bool checking = false;
    String? errorMsg;

    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              title: const Text(
                'Confirm Password',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Enter your password to enable biometric login.',
                    style: TextStyle(fontSize: 14, color: AppColors.textLabel),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      hintText: 'Password',
                      errorText: errorMsg,
                      prefixIcon: const Icon(Icons.vpn_key_outlined),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CANCEL'),
                ),
                ElevatedButton(
                  onPressed: checking
                      ? null
                      : () async {
                          final password = passwordController.text;
                          if (password.isEmpty) {
                            setDialogState(() {
                              errorMsg = 'Password cannot be empty.';
                            });
                            return;
                          }

                          setDialogState(() {
                            checking = true;
                            errorMsg = null;
                          });

                          try {
                            // Test credentials by hitting login endpoint
                            final baseUrl = widget.client.baseUrl;
                            final authClient = ApiClient(baseUrl: baseUrl, token: '');
                            await authClient.login(
                              email: widget.user.email,
                              password: password,
                            );

                            // Credentials are correct! Prompt for biometrics
                            final authenticated = await BiometricService.instance.authenticate(
                              'Confirm your biometrics to enable fingerprint login',
                            );

                            if (authenticated) {
                              await BiometricService.instance.saveCredentials(
                                widget.user.email,
                                password,
                              );
                              await BiometricService.instance.setBiometricEnabled(true);
                              if (!context.mounted) return;
                              setState(() {
                                _biometricEnabled = true;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Biometric authentication enabled successfully.'),
                                ),
                              );
                              if (Navigator.canPop(context)) {
                                Navigator.pop(context);
                              }
                            } else {
                              setDialogState(() {
                                checking = false;
                                errorMsg = 'Biometric verification failed.';
                              });
                            }
                          } catch (e) {
                            setDialogState(() {
                              checking = false;
                              errorMsg = 'Invalid password or connection error.';
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.olive,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: checking
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('CONFIRM'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasBackground = widget.user.homeBackgroundUrl.isNotEmpty;
    final hasAvatar = widget.user.avatarUrl.isNotEmpty;

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // Premium Cover and Avatar Header Stack
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              height: 180,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.olive.withOpacity(0.15),
                image: hasBackground
                    ? DecorationImage(
                        image: NetworkImage(widget.user.homeBackgroundUrl),
                        fit: BoxFit.cover,
                      )
                    : null,
                gradient: !hasBackground
                    ? const LinearGradient(
                        colors: [AppColors.olive, AppColors.oliveDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
              ),
            ),
            Positioned(
              bottom: -50,
              left: 24,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: CircleAvatar(
                  radius: 50,
                  backgroundColor: AppColors.fieldBackground,
                  backgroundImage: hasAvatar ? NetworkImage(widget.user.avatarUrl) : null,
                  child: !hasAvatar
                      ? const Icon(Icons.person, size: 50, color: AppColors.textLabel)
                      : null,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 60),

        // User Meta
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.user.name,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textMain,
                ),
              ),
              if (widget.user.jobTitle.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  widget.user.jobTitle,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.olive.withOpacity(0.9),
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.olive.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      widget.user.role,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.1,
                        color: AppColors.olive,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Profile details
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Card(
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: Colors.black.withOpacity(0.06)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CONTACT & DESCRIPTION',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.4,
                      color: AppColors.textLabel,
                    ),
                  ),
                  const Divider(height: 24),
                  _buildDetailItem(Icons.email_outlined, 'Email Address', widget.user.email),
                  if (widget.user.phone.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildDetailItem(Icons.phone_outlined, 'Phone Number', widget.user.phone),
                  ],
                  if (widget.user.bio.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildDetailItem(Icons.info_outline, 'Biography', widget.user.bio),
                  ],
                ],
              ),
            ),
          ),
        ),

        const SizedBox(height: 24),

        // Security Settings Card
        if (_deviceSupportsBiometrics) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: Colors.black.withOpacity(0.06)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SECURITY SETTINGS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                        color: AppColors.textLabel,
                      ),
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.fingerprint_rounded, color: AppColors.olive, size: 24),
                            SizedBox(width: 14),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Biometric Login',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textMain,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Enable fingerprint/face access',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textLabel,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Switch.adaptive(
                          value: _biometricEnabled,
                          activeColor: AppColors.olive,
                          onChanged: (val) {
                            if (val) {
                              _enableBiometrics();
                            } else {
                              _disableBiometrics();
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],

        // Action panel
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final updated = await Navigator.of(context).push<UserProfile>(
                      MaterialPageRoute(
                        builder: (_) => ProfileEditScreen(user: widget.user, client: widget.client),
                      ),
                    );
                    if (updated != null) {
                      widget.onProfileUpdated(updated);
                    }
                  },
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text(
                    'EDIT PROFILE DETAILS',
                    style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.8),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.olive,
                    side: const BorderSide(color: AppColors.olive, width: 1.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: widget.onLogout,
                  icon: const Icon(Icons.logout_rounded, color: Colors.white),
                  label: const Text(
                    'LOGOUT ACCOUNT',
                    style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.8, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFC95454),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 48),
      ],
    );
  }

  Widget _buildDetailItem(IconData icon, String title, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.olive, size: 22),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textLabel,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}