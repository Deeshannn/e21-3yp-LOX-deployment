class Locker {
  const Locker({
    required this.id,
    required this.code,
    required this.isBooked,
    this.lockState,
    this.doorState,
    this.reservedAt,
    this.releaseRequested = false,
    this.releaseRequestedAt,
    this.availability,
    this.state,
  });

  final String id;
  final String code;
  final bool isBooked;
  final String? lockState;
  final String? doorState;
  final DateTime? reservedAt;
  final bool releaseRequested;
  final DateTime? releaseRequestedAt;
  final String? availability;
  final String? state;

  factory Locker.fromJson(Map<String, dynamic> json) {
    final lockerId = json['locker_id']?.toString() ?? json['_id']?.toString() ?? '';
    final reservedAt = DateTime.tryParse(json['reserved_at']?.toString() ?? '');
    final releaseRequestedAt = DateTime.tryParse(json['release_requested_at']?.toString() ?? '');

    return Locker(
      id: lockerId,
      code: json['code']?.toString() ?? lockerId,
      isBooked: json['isBooked'] == true || json['availability']?.toString() == 'reserved',
      lockState: json['lock_state']?.toString(),
      doorState: json['door_state']?.toString(),
      reservedAt: reservedAt,
      releaseRequested: json['release_requested'] == true,
      releaseRequestedAt: releaseRequestedAt,
      availability: json['availability']?.toString(),
      state: json['state']?.toString(),
    );
  }

  String? get lockStateOrNull => lockState;
  String? get doorStateOrNull => doorState;
  DateTime? get reservedAtOrNull => reservedAt;
}