class Locker {
  const Locker({
    required this.id,
    required this.code,
    required this.isBooked,
    required this.availability,
    this.lockState,
    this.doorState,
    this.state,
    this.reservedBy,
    this.reservedAt,
    this.overdueAt,
    this.releaseRequested,
    this.releaseRequestedAt,
    this.lastReportedAt,
  });

  final String id;
  final String code;
  final bool isBooked;
  final String availability;
  final String? lockState;
  final String? doorState;
  final String? state;
  final String? reservedBy;
  final DateTime? reservedAt;
  final DateTime? overdueAt;
  final bool? releaseRequested;
  final DateTime? releaseRequestedAt;
  final DateTime? lastReportedAt;

  static DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }

  factory Locker.fromJson(Map<String, dynamic> json) {
    final availability = json['availability']?.toString() ?? 'unavailable';

    return Locker(
      // Your backend uses locker_id
      id: json['locker_id']?.toString() ?? '',

      // Use locker_id as display code too
      code: json['locker_id']?.toString() ?? '-',

      // Reserved/unavailable lockers are considered booked
      isBooked: availability != 'available',

      availability: availability,

      lockState: json['lock_state']?.toString(),

      doorState: json['door_state']?.toString(),

      state: json['state']?.toString(),

      reservedBy: json['reserved_by']?.toString(),

      reservedAt: _parseDate(json['reserved_at']),

      overdueAt: _parseDate(json['overdue_at']),

      releaseRequested: json['release_requested'] as bool?,

      releaseRequestedAt: _parseDate(json['release_requested_at']),

      lastReportedAt: _parseDate(json['last_reported_at']),
    );
  }
}
