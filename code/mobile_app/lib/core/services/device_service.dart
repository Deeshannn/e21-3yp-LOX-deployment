import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';

class DeviceService {
  DeviceService._();

  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  /// Retrieves the device fingerprint details.
  /// On Android, uses the hardware build ID.
  /// On iOS, uses the identifierForVendor.
  static Future<Map<String, String>> getDeviceInfo() async {
    String deviceId = '';
    String deviceName = '';

    try {
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        deviceId = androidInfo.id;
        deviceName = '${androidInfo.brand} ${androidInfo.model}';
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? '';
        deviceName = iosInfo.name;
      } else {
        deviceId = 'other_platform';
        deviceName = 'Generic Device';
      }
    } catch (e) {
      deviceId = 'unknown_id';
      deviceName = 'Unknown Device';
    }

    return {
      'deviceId': deviceId,
      'deviceName': deviceName,
    };
  }
}
