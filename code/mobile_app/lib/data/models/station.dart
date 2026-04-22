class Station {
  const Station({
    required this.id,
    required this.name,
    required this.code,
  });

  final String id;
  final String name;
  final String code;

  factory Station.fromJson(Map<String, dynamic> json) {
    return Station(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown station',
      code: json['code']?.toString() ?? '-',
    );
  }
}