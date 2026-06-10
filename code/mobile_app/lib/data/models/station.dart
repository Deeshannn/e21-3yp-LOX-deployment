class Station {
  const Station({
    required this.id,
    required this.name,
    required this.code,
    required this.timezone,
    required this.openTime,
    required this.closeTime,
    required this.scheduleEnabled,
    required this.emergencyMode,
    this.latitude,
    this.longitude,
    this.freeDurationMinutes = 60,
    this.gracePeriodMinutes = 10,
    this.overdueRatePerHour = 1.0,
  });

  final String id;
  final String name;
  final String code;
  final String timezone;
  final String openTime;
  final String closeTime;
  final bool scheduleEnabled;
  final bool emergencyMode;
  final double? latitude;
  final double? longitude;
  final int freeDurationMinutes;
  final int gracePeriodMinutes;
  final double overdueRatePerHour;

  factory Station.fromJson(Map<String, dynamic> json) {
    final loc = json['location'] as Map<String, dynamic>?;
    final coords = loc?['coordinates'] as List<dynamic>?;

    // GeoJSON order is [longitude, latitude]
    final lng = (coords != null && coords.length >= 2)
        ? (coords[0] as num?)?.toDouble()
        : null;
    final lat = (coords != null && coords.length >= 2)
        ? (coords[1] as num?)?.toDouble()
        : null;

    final schedule = json['schedule'] as Map<String, dynamic>? ?? const {};

    return Station(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown station',
      code: json['code']?.toString() ?? '-',
      timezone: json['timezone']?.toString() ?? 'Asia/Colombo',
      openTime: schedule['openTime']?.toString() ?? '08:00',
      closeTime: schedule['closeTime']?.toString() ?? '20:00',
      scheduleEnabled: schedule['enabled'] != false,
      emergencyMode: json['emergencyMode'] == true,
      latitude: lat,
      longitude: lng,
      freeDurationMinutes: (json['freeDurationMinutes'] as num?)?.toInt() ?? 60,
      gracePeriodMinutes: (json['gracePeriodMinutes'] as num?)?.toInt() ?? 10,
      overdueRatePerHour: (json['overdueRatePerHour'] as num?)?.toDouble() ?? 1.0,
    );
  }
}