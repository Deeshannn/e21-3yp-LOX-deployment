import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../../core/errors/api_error.dart';
import '../models/access_request.dart';
import '../models/auth_result.dart';
import '../models/locker.dart';
import '../models/station.dart';
import '../models/user_profile.dart';
import '../models/product.dart';
import '../models/order.dart';
import '../models/locker_event.dart';
import '../models/queue_entry.dart';

/// A simple API client to interact with the backend server.
/// This class abstracts away the details of making HTTP requests, handling authentication, and parsing responses.
class ApiClient {
  // Inputs: baseUrl (API base URL) and token (JWT auth token).
  // Both are required to create an instance of ApiClient.
  const ApiClient({required this.baseUrl, required this.token});

  final String baseUrl;
  final String token;

  // Internal helper to make HTTP requests with consistent error handling and auth.
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
        case 'PATCH':
          response = await http.patch(
            uri,
            headers: headers,
            body: jsonEncode(body ?? const {}),
          );
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: headers);
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

  String _getFrontendOrigin() {
    try {
      final uri = Uri.parse(baseUrl);
      final host = uri.host;
      final scheme = uri.scheme;
      if (uri.port == 3001) {
        return '$scheme://$host:3000';
      }
      return uri.port != 0 && uri.port != 80 && uri.port != 443
          ? '$scheme://$host:${uri.port}'
          : '$scheme://$host';
    } catch (_) {
      return 'http://localhost:3000';
    }
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

  Future<MobileLoginResult> mobileLogin({
    required String email,
    required String password,
    required String deviceId,
    required String deviceName,
  }) async {
    final payload = await _request(
      'POST',
      '/auth/mobile/login',
      includeAuth: false,
      body: {
        'email': email,
        'password': password,
        'deviceId': deviceId,
        'deviceName': deviceName,
      },
    );

    final bool otpRequired = payload['otpRequired'] == true;
    final String message = payload['message']?.toString() ?? '';

    if (otpRequired) {
      return MobileLoginResult(
        otpRequired: true,
        message: message,
      );
    }

    final tkn = payload['token']?.toString() ?? '';
    if (tkn.isEmpty) throw const ApiError('Login failed: missing token');

    return MobileLoginResult(
      otpRequired: false,
      message: message,
      authResult: AuthResult(
        baseUrl: baseUrl,
        token: tkn,
        user: UserProfile.fromJson(
          payload['user'] as Map<String, dynamic>? ?? const {},
        ),
      ),
    );
  }

  Future<AuthResult> verifyMobileOtp({
    required String email,
    required String otpCode,
    required String deviceId,
    required String deviceName,
  }) async {
    final payload = await _request(
      'POST',
      '/auth/mobile/verify-otp',
      includeAuth: false,
      body: {
        'email': email,
        'otpCode': otpCode,
        'deviceId': deviceId,
        'deviceName': deviceName,
      },
    );

    final tkn = payload['token']?.toString() ?? '';
    if (tkn.isEmpty) throw const ApiError('Verification failed: missing token');

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

  Future<AuthResult> mobileRegister({
    required String name,
    required String email,
    required String password,
    required String deviceId,
    required String deviceName,
    String stationCode = '',
  }) async {
    final payload = await _request(
      'POST',
      '/auth/mobile/register',
      includeAuth: false,
      body: {
        'name': name,
        'email': email,
        'password': password,
        'stationCode': stationCode,
        'deviceId': deviceId,
        'deviceName': deviceName,
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

  /// Update the logged-in user profile details
  Future<UserProfile> updateProfile(Map<String, dynamic> data) async {
    final payload = await _request('PATCH', '/auth/me', body: data);
    return UserProfile.fromJson(
      payload['user'] as Map<String, dynamic>? ?? const {},
    );
  }

  /// Update the logged-in user profile details with multipart files (avatar/background)
  Future<UserProfile> updateProfileMultipart({
    required String name,
    required String email,
    required String phone,
    required String jobTitle,
    required String bio,
    File? avatarFile,
    File? backgroundFile,
  }) async {
    const path = '/users/profile';
    final uri = Uri.parse('$baseUrl$path');
    final request = http.MultipartRequest('PUT', uri);

    if (token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    request.fields['name'] = name;
    request.fields['email'] = email;
    request.fields['phone'] = phone;
    request.fields['jobTitle'] = jobTitle;
    request.fields['bio'] = bio;

    if (avatarFile != null) {
      final ext = avatarFile.path.split('.').last.toLowerCase();
      final mimeType = ext == 'png' ? 'image/png' : 'image/jpeg';
      request.files.add(await http.MultipartFile.fromPath(
        'avatar',
        avatarFile.path,
        contentType: MediaType.parse(mimeType),
      ));
    }

    if (backgroundFile != null) {
      final ext = backgroundFile.path.split('.').last.toLowerCase();
      final mimeType = ext == 'png' ? 'image/png' : 'image/jpeg';
      request.files.add(await http.MultipartFile.fromPath(
        'background',
        backgroundFile.path,
        contentType: MediaType.parse(mimeType),
      ));
    }

    late final http.StreamedResponse response;
    try {
      response = await request.send();
    } on SocketException {
      throw ApiError(
        'Cannot reach backend at $baseUrl. Check API base URL and network access.',
      );
    }

    final responseBody = await response.stream.bytesToString();
    final payload = jsonDecode(responseBody) as Map<String, dynamic>? ?? const {};

    if (response.statusCode >= 400) {
      throw ApiError(
        payload['message']?.toString() ?? 'Request failed (${response.statusCode})',
      );
    }

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

  // Locker Telemetry Commands
  Future<void> unlockLocker(String lockerId) async {
    await _request('POST', '/lockers/$lockerId/unlock');
  }

  Future<void> lockLocker(String lockerId) async {
    await _request('POST', '/lockers/$lockerId/lock');
  }

  Future<void> releaseLocker(String lockerId) async {
    await _request('POST', '/lockers/$lockerId/release');
  }

  Future<void> ignoreSecurityAlert(String lockerId) async {
    await _request('POST', '/lockers/$lockerId/security-ignore');
  }

  /// Fetch the current reservation phase and countdown data for a locker.
  Future<Map<String, dynamic>> fetchLockerStatus(String lockerId) async {
    return await _request('GET', '/lockers/$lockerId/status');
  }

  /// Create a Stripe overdue checkout session for the given locker.
  /// Returns { checkoutUrl, sessionId, chargeAmount, overdueMinutes, ... }
  /// Uses the loxapp:// deep-link scheme so Stripe redirects back to the app.
  Future<Map<String, dynamic>> createOverdueCheckout(String lockerId) async {
    return await _request(
      'POST',
      '/payments/overdue-checkout',
      body: {
        'lockerId': lockerId,
        'origin': 'loxapp://payment',
        'isMobile': true,
      },
    );
  }

  // Admin Request Handlers
  Future<void> approveRequest(String requestId) async {
    await _request('POST', '/requests/$requestId/approve');
  }

  Future<void> rejectRequest(String requestId) async {
    await _request('POST', '/requests/$requestId/reject');
  }

  Future<void> cancelRequest(String requestId) async {
    await _request('POST', '/requests/$requestId/cancel');
  }

  // Admin Station Management
  Future<void> emergencyUnlockStation(String stationId) async {
    await _request('POST', '/stations/$stationId/emergency-unlock');
  }

  Future<void> lockAllLockersAtStation(String stationId) async {
    await _request('POST', '/stations/$stationId/lock-all');
  }

  Future<void> updateStationSchedule(
    String stationId,
    String openTime,
    String closeTime,
  ) async {
    await _request(
      'PATCH',
      '/stations/$stationId/schedule',
      body: {'openTime': openTime, 'closeTime': closeTime},
    );
  }

  Future<Station> createStation(
    String name,
    String code,
    String openTime,
    String closeTime,
  ) async {
    final payload = await _request(
      'POST',
      '/stations',
      body: {
        'name': name,
        'code': code,
        'openTime': openTime,
        'closeTime': closeTime,
      },
    );
    return Station.fromJson(
      payload['station'] as Map<String, dynamic>? ?? const {},
    );
  }

  Future<Locker> createLocker(
    String stationId,
    String code,
    String controlTopic,
    String stateTopic,
  ) async {
    final payload = await _request(
      'POST',
      '/lockers',
      body: {
        'stationId': stationId,
        'code': code,
        'controlTopic': controlTopic,
        'stateTopic': stateTopic,
      },
    );
    return Locker.fromJson(
      payload['locker'] as Map<String, dynamic>? ?? const {},
    );
  }

  // Event Logs and Queue
  Future<List<LockerEvent>> fetchEvents() async {
    final payload = await _request('GET', '/events?limit=50');
    final data = payload['events'] as List<dynamic>? ?? const [];
    return data
        .map((item) => LockerEvent.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<QueueEntry>> fetchQueue(String stationId) async {
    final payload = await _request('GET', '/queue?stationId=$stationId');
    final data = payload['queueEntries'] as List<dynamic>? ?? const [];
    return data
        .map((item) => QueueEntry.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  // Marketplace Store Endpoints
  Future<List<Product>> fetchProducts() async {
    final payload = await _request('GET', '/products');
    final data = payload['products'] as List<dynamic>? ?? const [];
    return data
        .map((item) => Product.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<Order>> fetchOrders() async {
    final payload = await _request('GET', '/orders');
    final data = payload['orders'] as List<dynamic>? ?? const [];
    return data
        .map((item) => Order.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> createCheckoutSession(
    String productId,
    int quantity,
    String color,
  ) async {
    return await _request(
      'POST',
      '/payments/checkout-session',
      body: {
        'productId': productId,
        'quantity': quantity,
        'selectedColor': color,
        'origin': _getFrontendOrigin(),
        'isMobile': true,
      },
    );
  }

  Future<Product> createProduct(Map<String, dynamic> data) async {
    final payload = await _request('POST', '/products', body: data);
    return Product.fromJson(
      payload['product'] as Map<String, dynamic>? ?? const {},
    );
  }

  Future<Product> updateProduct(
    String productId,
    Map<String, dynamic> data,
  ) async {
    final payload = await _request('PATCH', '/products/$productId', body: data);
    return Product.fromJson(
      payload['product'] as Map<String, dynamic>? ?? const {},
    );
  }

  Future<void> deleteProduct(String productId) async {
    await _request('DELETE', '/products/$productId');
  }

  Future<void> updateOrderStatus(String orderId, String status) async {
    await _request('PATCH', '/orders/$orderId/status', body: {'status': status});
  }

  Future<void> updateFcmToken(String fcmToken) async {
    await _request(
      'POST',
      '/users/fcm-token',
      body: {'fcmToken': fcmToken},
    );
  }
}

class MobileLoginResult {
  const MobileLoginResult({
    required this.otpRequired,
    required this.message,
    this.authResult,
  });

  final bool otpRequired;
  final String message;
  final AuthResult? authResult;
}
