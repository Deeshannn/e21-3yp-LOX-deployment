class QueueEntry {
  const QueueEntry({
    required this.id,
    required this.stationId,
    required this.requestId,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.status,
    this.createdAt,
  });

  final String id;
  final String stationId;
  final String requestId;
  final String userId;
  final String userName;
  final String userEmail;
  final String status; // WAITING, ASSIGNED, CANCELLED
  final DateTime? createdAt;

  factory QueueEntry.fromJson(Map<String, dynamic> json) {
    final userVal = json['userId'];
    String uId = '';
    String uName = 'User';
    String uEmail = '';
    if (userVal is Map<String, dynamic>) {
      uId = userVal['_id']?.toString() ?? '';
      uName = userVal['name']?.toString() ?? 'User';
      uEmail = userVal['email']?.toString() ?? '';
    } else {
      uId = userVal?.toString() ?? '';
    }

    final requestVal = json['requestId'];
    String rId = '';
    if (requestVal is Map<String, dynamic>) {
      rId = requestVal['_id']?.toString() ?? '';
    } else {
      rId = requestVal?.toString() ?? '';
    }

    return QueueEntry(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      stationId: json['stationId']?.toString() ?? '',
      requestId: rId,
      userId: uId,
      userName: uName,
      userEmail: uEmail,
      status: json['status']?.toString() ?? 'WAITING',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }
}
