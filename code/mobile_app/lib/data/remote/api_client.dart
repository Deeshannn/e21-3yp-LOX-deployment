import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../core/errors/api_error.dart';
import '../models/access_request.dart';
import '../models/auth_result.dart';
import '../models/locker.dart';
import '../models/station.dart';
import '../models/user_profile.dart';


/// A simple API client to interact with the backend server.
/// This class abstracts away the details of making HTTP requests, handling authentication, and parsing responses.
/// It provides methods for logging in, registering, fetching user data, and interacting with stations and lockers.

class ApiClient {
  // Inputs: baseUrl (API base URL) and token (JWT auth token).
  // Both are required to create an instance of ApiClient.
  const ApiClient({required this.baseUrl, required this.token});

  final String baseUrl;
  final String token;

  // Internal helper to make HTTP requests with consistent error handling and auth.
  // Inputs: method (GET/POST), path (endpoint), optional body for POST, and whether to include auth header.
  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool includeAuth = true,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};

    if (includeAuth && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    late final http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: jsonEncode(body ?? const {}),
          );
          break;
        default:
          throw StateError('Unsupported method: $method');
      }
    } on SocketException {
      throw ApiError(
        'Cannot reach backend at $baseUrl. Check API base URL and network access.',
      );
    }

    final payload =
        jsonDecode(response.body) as Map<String, dynamic>? ?? const {};
    if (response.statusCode >= 400) {
      throw ApiError(
        payload['message']?.toString() ??
            'Request failed (${response.statusCode})',
      );
    }

    return payload;
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final payload = await _request(
      'POST',
      '/auth/login',
      includeAuth: false,
      body: {'email': email, 'password': password},
    );

    final tkn = payload['token']?.toString() ?? '';
    if (tkn.isEmpty) throw const ApiError('Login failed: missing token');

    return AuthResult(
      baseUrl: baseUrl,
      token: tkn,
      user: UserProfile.fromJson(
        payload['user'] as Map<String, dynamic>? ?? const {},
      ),
    );
  }

  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
    String stationCode = '',
  }) async {
    final payload = await _request(
      'POST',
      '/auth/register',
      includeAuth: false,
      body: {
        'name': name,
        'email': email,
        'password': password,
        'stationCode': stationCode,
      },
    );

    final tkn = payload['token']?.toString() ?? '';
    if (tkn.isEmpty) throw const ApiError('Registration failed: missing token');

    return AuthResult(
      baseUrl: baseUrl,
      token: tkn,
      user: UserProfile.fromJson(
        payload['user'] as Map<String, dynamic>? ?? const {},
      ),
    );
  }

  /// Call GET request to /auth/me to fetch the current user's profile using the stored token.
  Future<UserProfile> fetchMe() async {
    final payload = await _request('GET', '/auth/me');
    return UserProfile.fromJson(
      payload['user'] as Map<String, dynamic>? ?? const {},
    );
  }

  Future<List<Station>> fetchStations() async {
    final payload = await _request('GET', '/stations/all');
    final data = payload['stations'] as List<dynamic>? ?? const [];
    return data
        .map((item) => Station.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<Locker>> fetchLockers(String stationId) async {
    final payload = await _request('GET', '/lockers?stationId=$stationId');
    final data = payload['lockers'] as List<dynamic>? ?? const [];
    return data
        .map((item) => Locker.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<AccessRequest>> fetchRequests() async {
    final payload = await _request('GET', '/requests');
    final data = payload['requests'] as List<dynamic>? ?? const [];
    return data
        .map((item) => AccessRequest.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<AccessRequest> createLockerRequest(
    String stationId,
    String note,
  ) async {
    final payload = await _request(
      'POST',
      '/requests/access',
      body: {'stationId': stationId, 'note': note},
    );
    return AccessRequest.fromJson(
      payload['request'] as Map<String, dynamic>? ?? const {},
    );
  }
}
