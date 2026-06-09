import 'package:flutter/material.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({
    super.key,
    required this.user,
    required this.client,
  });

  final UserProfile user;
  final ApiClient client;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _avatarController;
  late final TextEditingController _backgroundController;
  late final TextEditingController _phoneController;
  late final TextEditingController _jobTitleController;
  late final TextEditingController _bioController;

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.user.name);
    _emailController = TextEditingController(text: widget.user.email);
    _avatarController = TextEditingController(text: widget.user.avatarUrl);
    _backgroundController =
        TextEditingController(text: widget.user.homeBackgroundUrl);
    _phoneController = TextEditingController(text: widget.user.phone);
    _jobTitleController = TextEditingController(text: widget.user.jobTitle);
    _bioController = TextEditingController(text: widget.user.bio);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _avatarController.dispose();
    _backgroundController.dispose();
    _phoneController.dispose();
    _jobTitleController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _saveProfile() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    if (name.isEmpty || email.isEmpty) {
      _show('Name and email are required.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final updatedUser = await widget.client.updateProfile({
        'name': name,
        'email': email,
        'avatarUrl': _avatarController.text.trim(),
        'homeBackgroundUrl': _backgroundController.text.trim(),
        'phone': _phoneController.text.trim(),
        'jobTitle': _jobTitleController.text.trim(),
        'bio': _bioController.text.trim(),
      });
      if (!mounted) return;
      _show('Profile updated successfully.');
      Navigator.of(context).pop(updatedUser);
    } catch (e) {
      _show(e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Edit Profile',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: AppColors.textMain,
          ),
        ),
        iconTheme: const IconThemeData(color: AppColors.textMain),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            _buildField('FULL NAME', _nameController, hint: 'John Doe'),
            const SizedBox(height: 16),
            _buildField('EMAIL ADDRESS', _emailController,
                hint: 'john@example.com', keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 16),
            _buildField('AVATAR IMAGE URL', _avatarController,
                hint: 'https://example.com/avatar.jpg'),
            const SizedBox(height: 16),
            _buildField('HOME BACKGROUND IMAGE URL', _backgroundController,
                hint: 'https://example.com/bg.jpg'),
            const SizedBox(height: 16),
            _buildField('PHONE NUMBER', _phoneController,
                hint: '+94 77 123 4567', keyboardType: TextInputType.phone),
            const SizedBox(height: 16),
            _buildField('JOB TITLE', _jobTitleController, hint: 'Project Manager'),
            const SizedBox(height: 16),
            _buildField('BIO', _bioController,
                hint: 'Tell us about yourself...', maxLines: 3),
            const SizedBox(height: 32),
            SizedBox(
              height: 54,
              child: ElevatedButton(
                onPressed: _submitting ? null : _saveProfile,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.olive,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.olive.withOpacity(0.6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 0,
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'SAVE CHANGES',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(
    String label,
    TextEditingController controller, {
    required String hint,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: AppColors.textLabel,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.fieldBackground,
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            style: const TextStyle(
              fontSize: 15,
              color: AppColors.textField,
              fontWeight: FontWeight.w600,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(
                color: AppColors.textHint,
                fontWeight: FontWeight.w400,
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
