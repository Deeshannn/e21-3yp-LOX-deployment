import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BiometricService {
  BiometricService._();

  static final BiometricService instance = BiometricService._();

  final LocalAuthentication _auth = LocalAuthentication();

  static const _keyBiometricEnabled = 'biometric_enabled';
  static const _keySavedEmail = 'biometric_saved_email';
  static const _keySavedPassword = 'biometric_saved_password';

  /// Check if the device has biometric hardware and if any biometrics are enrolled.
  Future<bool> canAuthenticate() async {
    final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
    final bool isSupported = await _auth.isDeviceSupported();
    if (!canAuthenticateWithBiometrics || !isSupported) {
      return false;
    }
    final List<BiometricType> availableBiometrics =
        await _auth.getAvailableBiometrics();
    return availableBiometrics.isNotEmpty;
  }

  /// Prompt the user with OS biometric dialog.
  Future<bool> authenticate(String reason) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } catch (e) {
      return false;
    }
  }

  /// Read the biometric enabled status from SharedPreferences.
  Future<bool> isBiometricEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyBiometricEnabled) ?? false;
  }

  /// Set the biometric enabled status in SharedPreferences.
  Future<void> setBiometricEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyBiometricEnabled, enabled);
  }

  /// Save email and password to SharedPreferences.
  Future<void> saveCredentials(String email, String password) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySavedEmail, email);
    await prefs.setString(_keySavedPassword, password);
  }

  /// Load email and password from SharedPreferences.
  Future<Map<String, String>?> getCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString(_keySavedEmail);
    final password = prefs.getString(_keySavedPassword);
    if (email != null && password != null && email.isNotEmpty && password.isNotEmpty) {
      return {'email': email, 'password': password};
    }
    return null;
  }

  /// Clear biometric credentials and disable biometric login.
  Future<void> clearCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keySavedEmail);
    await prefs.remove(_keySavedPassword);
    await prefs.setBool(_keyBiometricEnabled, false);
  }
}
