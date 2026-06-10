class Locker {
  const Locker({
    required this.id,
    required this.code,
    required this.isBooked,
    required this.lockState,
    required this.doorState,
    required this.securityAlertActive,
    required this.securityAlertMessage,
    this.currentUserId,
    this.activeRequestId,
    this.reservedAt,
    this.overdueReleasedAt,
  });

  final String id;
  final String code;
  final bool isBooked;
  final String lockState; // LOCKED, UNLOCKED, UNKNOWN
  final String doorState; // OPEN, CLOSED, UNKNOWN
  final bool securityAlertActive;
  final String securityAlertMessage;
  final String? currentUserId;
  final String? activeRequestId;
  final DateTime? reservedAt;
  final DateTime? overdueReleasedAt;

  factory Locker.fromJson(Map<String, dynamic> json) {
    final userVal = json['currentUserId'];
    String? uId;
    if (userVal is Map<String, dynamic>) {
      uId = userVal['_id']?.toString();
    } else {
      uId = userVal?.toString();
    }

    final requestVal = json['activeRequestId'];
    String? reqId;
    if (requestVal is Map<String, dynamic>) {
      reqId = requestVal['_id']?.toString();
    } else {
      reqId = requestVal?.toString();
    }

    DateTime? reservedAt;
    final rawReserved = json['reservedAt'];
    if (rawReserved != null) {
      reservedAt = DateTime.tryParse(rawReserved.toString());
    }

    DateTime? overdueReleasedAt;
    final rawOverdueReleased = json['overdueReleasedAt'];
    if (rawOverdueReleased != null) {
      overdueReleasedAt = DateTime.tryParse(rawOverdueReleased.toString());
    }

    return Locker(
      id: json['_id']?.toString() ?? '',
      code: json['code']?.toString() ?? '-',
      isBooked: json['isBooked'] == true,
      lockState: json['lockState']?.toString() ?? 'UNKNOWN',
      doorState: json['doorState']?.toString() ?? 'UNKNOWN',
      securityAlertActive: json['securityAlertActive'] == true,
      securityAlertMessage: json['securityAlertMessage']?.toString() ?? '',
      currentUserId: uId,
      activeRequestId: reqId,
      reservedAt: reservedAt,
      overdueReleasedAt: overdueReleasedAt,
    );
  }
}