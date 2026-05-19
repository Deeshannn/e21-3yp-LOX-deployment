import 'package:shared_preferences/shared_preferences.dart';

import '../../core/constants/app_constants.dart';
import '../models/auth_result.dart';

/// Bundles the last location and locker station the user was looking at.
/// This ensures that when the user opens the app, they are right back where they left off.
class UiPrefs {
  const UiPrefs({
    required this.savedLocation,
    required this.selectedStationId,
    required this.savedLatitude,
    required this.savedLongitude,
  });

  final String savedLocation;
  final String selectedStationId;
  final double? savedLatitude;
  final double? savedLongitude;
}

/// Asynchronous local storage utility for the Smart Locker app.
/// This class abstracts away the details of how we store and retrieve data on the device.
class LocalStore {
  LocalStore._();

  // Constant variables for shared preferences keys
  static const _keyBaseUrl = 'api_base_url';
  static const _keyToken = 'auth_token';
  static const _keySavedLocation = 'saved_location';
  static const _keySelectedStation = 'selected_station_id';
  static const _keySavedLatitude = 'saved_location_latitude';
  static const _keySavedLongitude = 'saved_location_longitude';

  static Future<BootstrapData> loadBootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    return BootstrapData(
      baseUrl: prefs.getString(_keyBaseUrl) ?? AppConstants.defaultApiBaseUrl,
      token: prefs.getString(_keyToken) ?? '',
    );
  }

  static Future<void> saveBootstrap({
    required String baseUrl,
    required String token,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, baseUrl);
    await prefs.setString(_keyToken, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, '');
  }

  static Future<UiPrefs> loadUiPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    return UiPrefs(
      savedLocation: prefs.getString(_keySavedLocation) ?? '',
      selectedStationId: prefs.getString(_keySelectedStation) ?? '',
      savedLatitude: prefs.getDouble(_keySavedLatitude),
      savedLongitude: prefs.getDouble(_keySavedLongitude),
    );
  }

  static Future<void> saveLocation(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySavedLocation, value);
  }

  static Future<void> saveLocationCoordinates({
    required double latitude,
    required double longitude,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_keySavedLatitude, latitude);
    await prefs.setDouble(_keySavedLongitude, longitude);
  }

  static Future<void> saveSelectedStation(String stationId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySelectedStation, stationId);
  }
}
