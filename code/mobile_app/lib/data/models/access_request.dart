class AccessRequest {
  const AccessRequest({
    required this.id,
    required this.stationId,
    required this.stationName,
    required this.status,
    required this.note,
    required this.lockerCode,
    required this.createdAt,
  });

  final String id;
  final String stationId;
  final String stationName;
  final String status;
  final String note;
  final String lockerCode;
  final DateTime? createdAt;

  factory AccessRequest.fromJson(Map<String, dynamic> json) {
    final stationData = json['stationId'];
    final lockerData = json['lockerId'];

    String stationId = '';
    String stationName = '';
    if (stationData is Map<String, dynamic>) {
      stationId =
          stationData['station_id']?.toString() ??
          stationData['_id']?.toString() ??
          '';
      stationName = stationData['name']?.toString() ?? '';
    } else {
      stationId = stationData?.toString() ?? '';
    }

    String lockerCode = '';
    if (lockerData is Map<String, dynamic>) {
      lockerCode = lockerData['code']?.toString() ?? '';
    }

    return AccessRequest(
      id: json['_id']?.toString() ?? '',
      stationId: stationId,
      stationName: stationName,
      status: json['status']?.toString() ?? '-',
      note: json['note']?.toString() ?? '',
      lockerCode: lockerCode,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
    );
  }
}
