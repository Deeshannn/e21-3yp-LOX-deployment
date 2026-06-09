import 'package:flutter/material.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';
import 'profile_edit_screen.dart';

class AccountScreen extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final hasBackground = user.homeBackgroundUrl.isNotEmpty;
    final hasAvatar = user.avatarUrl.isNotEmpty;

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
                        image: NetworkImage(user.homeBackgroundUrl),
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
                  backgroundImage: hasAvatar ? NetworkImage(user.avatarUrl) : null,
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
                user.name,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textMain,
                ),
              ),
              if (user.jobTitle.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  user.jobTitle,
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
                      user.role,
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
                  _buildDetailItem(Icons.email_outlined, 'Email Address', user.email),
                  if (user.phone.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildDetailItem(Icons.phone_outlined, 'Phone Number', user.phone),
                  ],
                  if (user.bio.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildDetailItem(Icons.info_outline, 'Biography', user.bio),
                  ],
                ],
              ),
            ),
          ),
        ),

        const SizedBox(height: 24),

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
                        builder: (_) => ProfileEditScreen(user: user, client: client),
                      ),
                    );
                    if (updated != null) {
                      onProfileUpdated(updated);
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
                  onPressed: onLogout,
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