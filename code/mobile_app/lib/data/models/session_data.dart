import '../remote/api_client.dart';
import 'user_profile.dart';

class SessionData {
  /// A simple data class to hold the API client and user profile together as a "session".
  const SessionData({required this.client, required this.user});

  final ApiClient client;
  final UserProfile user;
}