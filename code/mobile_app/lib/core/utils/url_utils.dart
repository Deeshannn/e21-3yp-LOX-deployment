import 'dart:io';

String normalizeApiBaseUrl(String input) {
  final value = input.trim();
  if (value.isEmpty) return value;

  final uri = Uri.tryParse(value);
  if (uri == null || uri.host.isEmpty || uri.scheme.isEmpty) return value;

  /// IP address hardcoded into the Android Emulator's virtual router.
  if (Platform.isAndroid &&
      (uri.host == 'localhost' || uri.host == '127.0.0.1')) {
    return uri.replace(host: '10.0.2.2').toString();
  }

  return value;
}