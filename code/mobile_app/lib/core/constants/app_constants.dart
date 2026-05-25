class AppConstants {
  
  AppConstants._();

  /// Allows overriding the default API base URL at compile time using --dart-define.
  /// ex: flutter run --dart-define=API_BASE_URL=https://production.com/api
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3001/api',
  );
}