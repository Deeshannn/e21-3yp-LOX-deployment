import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
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
  // Inputs: baseUrl (API base URL), token (JWT auth token), and optional userId for authenticated endpoints.
  // baseUrl and token are required; userId is optional but needed for some endpoints.
  const ApiClient({
    required this.baseUrl,
    required this.token,
    this.userId = '',
  });

  final String baseUrl;
  final String token;
  final String userId;

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
          case 'PUT':
          response = await http.put(
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

    // Debug: Log raw response
    // debugPrint('🔍 API Response Status: ${response.statusCode}');
    // debugPrint('🔍 API Response Body: ${response.body}');
    // debugPrint('🔍 API Request: $method $uri');

    Map<String, dynamic> payload;
    try {
      payload = jsonDecode(response.body) as Map<String, dynamic>? ?? const {};
    } on FormatException catch (e) {
      debugPrint('❌ JSON Parse Error: $e');
      debugPrint(
        '❌ Response body (first 500 chars): ${response.body.substring(0, response.body.length > 500 ? 500 : response.body.length)}',
      );
      rethrow;
    }

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
      '/api/users/login',
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
    // First, register the user
    await _request(
      'POST',
      '/api/users/add',
      includeAuth: false,
      body: {'name': name, 'email': email, 'password': password},
    );

    // After successful registration, immediately login to get the token
    return login(email: email, password: password);
  }

  /// Call GET request to /api/users/me to fetch the current user's profile using the stored token.
  Future<UserProfile> fetchMe() async {
    debugPrint('📡 Fetching user profile...');
    try {
      final payload = await _request('GET', '/api/users/me');
      // debugPrint('✅ User profile fetched');
      return UserProfile.fromJson(
        payload['user'] as Map<String, dynamic>? ?? const {},
      );
    } catch (e) {
      debugPrint('❌ Error fetching user profile: $e');
      rethrow;
    }
  }

  Future<List<Station>> fetchStations() async {
    debugPrint('📡 Fetching stations...');
    try {
      final payload = await _request('GET', '/api/stations/');
      final data = payload['stations'] as List<dynamic>? ?? const [];
      debugPrint('✅ Fetched ${data.length} stations');
      return data
          .map((item) => Station.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('❌ Error fetching stations: $e');
      rethrow;
    }
  }

  Future<List<Locker>> fetchLockers(String stationId) async {
    debugPrint('📡 Fetching lockers for station: $stationId');
    try {
      final query = userId.isNotEmpty ? '?user_id=$userId' : '';
      final payload = await _request('GET', '/api/lockers/$stationId$query');
      final data = payload['lockers'] as List<dynamic>? ?? const [];
      debugPrint('✅ Fetched ${data.length} lockers for station $stationId');
      return data
          .map((item) => Locker.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('❌ Error fetching lockers for $stationId: $e');
      rethrow;
    }
  }

  Future<List<AccessRequest>> fetchRequests() async {
    debugPrint('📡 Fetching access requests...');
    try {
      final payload = await _request('GET', '/requests');
      final data = payload['requests'] as List<dynamic>? ?? const [];
      debugPrint('✅ Fetched ${data.length} access requests');
      return data
          .map((item) => AccessRequest.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('❌ Error fetching requests: $e');
      rethrow;
    }
  }

  Future<AccessRequest> createLockerRequest(
    String stationId,
    String note,
  ) async {
    debugPrint('📡 Creating access request for station: $stationId');
    try {
      final payload = await _request(
        'POST',
        '/requests/access',
        body: {'stationId': stationId, 'note': note},
      );
      debugPrint('✅ Access request created');
      return AccessRequest.fromJson(
        payload['request'] as Map<String, dynamic>? ?? const {},
      );
    } catch (e) {
      debugPrint('❌ Error creating access request: $e');
      rethrow;
    }
  }

  /// Fetch membership status for the current user at [stationId].
  /// Returns a string: 'none' | 'pending' | 'member'
  Future<String> fetchMembershipStatus(String stationId) async {
    // debugPrint('📡 Fetching membership status for $stationId');
    try {
      if (stationId.isEmpty) {
        throw const ApiError(
          'Missing station ID for membership status request',
        );
      }
      final query = userId.isNotEmpty ? '?user_id=$userId' : '';
      final payload = await _request(
        'GET',
        '/api/memberships/status/$stationId$query',
      );
      final status = payload['status']?.toString() ?? 'none';
      debugPrint('✅ Membership status: $status');
      return status;
    } catch (e) {
      debugPrint('❌ Error fetching membership status: $e');
      rethrow;
    }
  }

  /// Create a membership request for the current user at [stationId].
  Future<Map<String, dynamic>> createMembershipRequest(String stationId) async {
    debugPrint('📡 Creating membership request for $stationId');
    try {
      if (stationId.isEmpty) {
        throw const ApiError('Missing station ID for membership request');
      }
      final payload = await _request(
        'POST',
        '/api/memberships/request',
        body: {'user_id': userId, 'station_id': stationId},
      );
      debugPrint('✅ Membership request created');
      return payload;
    } catch (e) {
      debugPrint('❌ Error creating membership request: $e');
      rethrow;
    }
  }

  /// Reserve a locker for the current user at a station.
  /// Sends an instant reservation request to the backend.
  /// Parameters: stationId, lockerId (the locker_id from backend)
  Future<Locker> reserveLocker({
    required String stationId,
    required String lockerId,
  }) async {
    debugPrint('📡 Reserving locker: $lockerId at station: $stationId');
    try {
      final payload = await _request(
        'POST',
        '/api/lockers/reserve',
        body: {
          'station_id': stationId,
          'user_id': userId,
          'locker_id': lockerId,
        },
      );
      debugPrint('✅ Locker reserved successfully');
      final lockerData = payload['locker'] as Map<String, dynamic>? ?? const {};
      return Locker.fromJson(lockerData);
    } catch (e) {
      debugPrint('❌ Error reserving locker: $e');
      rethrow;
    }
  }

  /// Fetch full details of the locker currently reserved by the logged-in user.
  Future<Locker> fetchReservedLockerDetails(String stationId) async {
    debugPrint('📡 Fetching reserved locker details for station: $stationId');
    debugPrint('Fetching for user id: $userId');
    try {
      if (stationId.isEmpty) {
        throw const ApiError('Missing station ID for locker details request');
      }

      if (userId.isEmpty) {
        throw const ApiError('Missing user ID for locker details request');
      }

      final payload = await _request(
        'GET',
        '/api/lockers/reserved-details/$stationId?user_id=$userId',
      );
      debugPrint("payload is:  $payload");

      final lockerData = payload['locker'] as Map<String, dynamic>? ?? const {};
      debugPrint("✅ Reserved locker details loaded: $lockerData");
      return Locker.fromJson(lockerData);
    } catch (e) {
      debugPrint('❌ Error fetching reserved locker details: $e');
      rethrow;
    }
  }

  /// Fetch the current free-limit timing for the user's reserved locker.
  Future<Map<String, dynamic>> fetchLockerTimeRemaining(String stationId) async {
    try {
      if (stationId.isEmpty) {
        throw const ApiError('Missing station ID for locker time request');
      }

      if (userId.isEmpty) {
        throw const ApiError('Missing user ID for locker time request');
      }

      return _request(
        'GET',
        '/api/lockers/time-remaining/$stationId?user_id=$userId',
      );
    } catch (e) {
      debugPrint('❌ Error fetching locker time remaining: $e');
      rethrow;
    }
  }

  /// Unlock the user's reserved locker.
  /// Only valid when locker is in lock_close state.
  Future<Locker> unlockLocker({
    required String stationId,
    required String lockerId,
  }) async {
    debugPrint('📡 Unlocking locker: $lockerId at station: $stationId');
    try {
      final payload = await _request(
        'POST',
        '/api/lockers/unlock',
        body: {
          'station_id': stationId,
          'user_id': userId,
          'locker_id': lockerId,
        },
      );
      debugPrint('✅ Locker unlocked successfully');
      final lockerData = payload['locker'] as Map<String, dynamic>? ?? const {};
      return Locker.fromJson(lockerData);
    } catch (e) {
      debugPrint('❌ Error unlocking locker: $e');
      rethrow;
    }
  }

  /// Lock the user's reserved locker.
  /// Only valid when locker is in unlock_close or unlock_open state.
  Future<Locker> lockLocker({
    required String stationId,
    required String lockerId,
  }) async {
    debugPrint('📡 Locking locker: $lockerId at station: $stationId');
    try {
      final payload = await _request(
        'POST',
        '/api/lockers/lock',
        body: {
          'station_id': stationId,
          'user_id': userId,
          'locker_id': lockerId,
        },
      );
      debugPrint('✅ Locker locked successfully');
      final lockerData = payload['locker'] as Map<String, dynamic>? ?? const {};
      return Locker.fromJson(lockerData);
    } catch (e) {
      debugPrint('❌ Error locking locker: $e');
      rethrow;
    }
  }

  /// Request release of the user's reserved locker.
  /// This allows the user to indicate they want to release their locker.
  Future<Locker> requestReleaseLocker({
    required String stationId,
    required String lockerId,
  }) async {
    debugPrint('📡 Requesting release for locker: $lockerId at station: $stationId by user id $userId');
    try {
      final payload = await _request(
        'PUT',
        '/api/lockers/release',
        body: {
          'station_id': stationId,
          'user_id': userId,
          'locker_id': lockerId,
        },
      );
      debugPrint('✅ Release request sent successfully');
      final lockerData = payload['locker'] as Map<String, dynamic>? ?? const {};
      return Locker.fromJson(lockerData);
    } catch (e) {
      debugPrint('❌ Error requesting release: $e');
      rethrow;
    }
  }
}
