class Station {
  const Station({
    required this.id,
    required this.name,
    required this.code,
    this.latitude,
    this.longitude,
  });

  final String id;
  final String name;
  final String code;
  final double? latitude;
  final double? longitude;

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

    return Station(
      id: json['station_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown station',
      code: json['code']?.toString() ?? '-',
      latitude: lat,
      longitude: lng,
    );
  }
}