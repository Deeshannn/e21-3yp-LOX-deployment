class Station {
  const Station({
    required this.id,
    required this.name,
    required this.code,
    this.latitude,
    this.longitude,
    this.address,
    this.city,
    this.district,
    this.lockerCount,
  });

  final String id;
  final String name;
  final String code;
  final double? latitude;
  final double? longitude;
  final String? address;
  final String? city;
  final String? district;
  final int? lockerCount;

  factory Station.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>?;
    final coordinates = location?['coordinates'] as List<dynamic>?;
    final idObject = json['_id'] as Map<String, dynamic>?;

    final latitude = (json['latitude'] as num?)?.toDouble() ??
      (location?['latitude'] as num?)?.toDouble() ??
      ((coordinates != null && coordinates.length >= 2)
        ? (coordinates[1] as num?)?.toDouble()
        : null);
    final longitude = (json['longitude'] as num?)?.toDouble() ??
      (location?['longitude'] as num?)?.toDouble() ??
      ((coordinates != null && coordinates.length >= 2)
        ? (coordinates[0] as num?)?.toDouble()
        : null);

    final address = json['address'] as String? ?? location?['address'] as String?;
    final city = json['main_town'] as String? ?? json['city'] as String? ?? location?['city'] as String?;
    final district = location?['district'] as String? ?? json['district'] as String?;

    int? lockerCount;
    if (json['locker_count'] is int) {
      lockerCount = json['locker_count'] as int;
    } else if (json['locker_count'] is num) {
      lockerCount = (json['locker_count'] as num).toInt();
    }

    final idVal = json['station_id']?.toString() ?? idObject?['\$oid']?.toString() ?? json['_id']?.toString() ?? '';

    return Station(
      id: idVal,
      name: json['name']?.toString() ?? 'Unknown station',
      code: json['code']?.toString() ?? json['station_id']?.toString() ?? '-',
      latitude: latitude,
      longitude: longitude,
      address: address,
      city: city,
      district: district,
      lockerCount: lockerCount,
    );
  }

  String get locationSummary {
    final parts = <String>[];
    if (address != null && address!.isNotEmpty) parts.add(address!);
    if (city != null && city!.isNotEmpty) parts.add(city!);
    if (district != null && district!.isNotEmpty) parts.add(district!);
    return parts.isNotEmpty ? parts.join(', ') : 'Unknown location';
  }

  @override
  String toString() => name;
}