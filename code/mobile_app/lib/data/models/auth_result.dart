import 'user_profile.dart';

/// After user succesfully logs in or registers, we get back the API URL, token, and user data.
class AuthResult {
  const AuthResult({
    required this.baseUrl,
    required this.token,
    required this.user,
  });

  final String baseUrl;
  final String token;
  final UserProfile user;
}


/// Bundles the API URL and the login token.
/// This is used when the app first launches to decide if the user is logged in.
class BootstrapData {
  const BootstrapData({required this.baseUrl, required this.token});

  final String baseUrl;
  final String token;
}