class AccessRequest {
  const AccessRequest({
    required this.id,
    required this.userId,
    required this.stationId,
    required this.stationName,
    required this.stationCode,
    required this.lockerId,
    required this.lockerCode,
    required this.status,
    required this.note,
    this.createdAt,
  });

  final String id;
  final String userId;
  final String stationId;
  final String stationName;
  final String stationCode;
  final String lockerId;
  final String lockerCode;
  final String status;
  final String note;
  final DateTime? createdAt;

  factory AccessRequest.fromJson(Map<String, dynamic> json) {
    // Check if stationId is an object (Map) or a String
    final stationIdVal = json['stationId'];
    String sId = '';
    String sName = '';
    String sCode = '';
    if (stationIdVal is Map<String, dynamic>) {
      sId = stationIdVal['_id']?.toString() ?? '';
      sName = stationIdVal['name']?.toString() ?? '';
      sCode = stationIdVal['code']?.toString() ?? '';
    } else {
      sId = stationIdVal?.toString() ?? '';
    }

    // Check if lockerId is an object (Map) or a String
    final lockerIdVal = json['lockerId'];
    String lId = '';
    String lCode = '';
    if (lockerIdVal is Map<String, dynamic>) {
      lId = lockerIdVal['_id']?.toString() ?? '';
      lCode = lockerIdVal['code']?.toString() ?? '';
    } else {
      lId = lockerIdVal?.toString() ?? '';
    }

    // Check if userId is an object (Map) or a String
    final userIdVal = json['userId'];
    String uId = '';
    if (userIdVal is Map<String, dynamic>) {
      uId = userIdVal['_id']?.toString() ?? '';
    } else {
      uId = userIdVal?.toString() ?? '';
    }

    return AccessRequest(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      userId: uId,
      stationId: sId,
      stationName: sName,
      stationCode: sCode,
      lockerId: lId,
      lockerCode: lCode,
      status: json['status']?.toString() ?? '',
      note: json['note']?.toString() ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }
}
