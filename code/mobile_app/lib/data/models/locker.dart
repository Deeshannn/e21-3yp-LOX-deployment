class Locker {
  const Locker({
    required this.id,
    required this.code,
    required this.isBooked,
  });

  final String id;
  final String code;
  final bool isBooked;

  factory Locker.fromJson(Map<String, dynamic> json) {
    return Locker(
      id: json['_id']?.toString() ?? '',
      code: json['code']?.toString() ?? '-',
      isBooked: json['isBooked'] == true,
    );
  }
}