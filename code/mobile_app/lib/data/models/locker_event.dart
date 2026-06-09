class LockerEvent {
  const LockerEvent({
    required this.id,
    required this.lockerId,
    required this.lockerCode,
    required this.stationId,
    required this.stationName,
    required this.eventType,
    required this.message,
    this.createdAt,
  });

  final String id;
  final String lockerId;
  final String lockerCode;
  final String stationId;
  final String stationName;
  final String eventType;
  final String message;
  final DateTime? createdAt;

  factory LockerEvent.fromJson(Map<String, dynamic> json) {
    final lockerVal = json['lockerId'];
    String lId = '';
    String lCode = '';
    if (lockerVal is Map<String, dynamic>) {
      lId = lockerVal['_id']?.toString() ?? '';
      lCode = lockerVal['code']?.toString() ?? '';
    } else {
      lId = lockerVal?.toString() ?? '';
    }

    final stationVal = json['stationId'];
    String sId = '';
    String sName = '';
    if (stationVal is Map<String, dynamic>) {
      sId = stationVal['_id']?.toString() ?? '';
      sName = stationVal['name']?.toString() ?? '';
    } else {
      sId = stationVal?.toString() ?? '';
    }

    return LockerEvent(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      lockerId: lId,
      lockerCode: lCode.isEmpty ? 'Locker' : lCode,
      stationId: sId,
      stationName: sName.isEmpty ? 'Station' : sName,
      eventType: json['eventType']?.toString() ?? 'INFO',
      message: json['message']?.toString() ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }
}
