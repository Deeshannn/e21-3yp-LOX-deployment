class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.avatarUrl,
    required this.homeBackgroundUrl,
    required this.phone,
    required this.jobTitle,
    required this.bio,
    required this.stationIds,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String avatarUrl;
  final String homeBackgroundUrl;
  final String phone;
  final String jobTitle;
  final String bio;
  final List<String> stationIds;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final rawStationIds = json['stationIds'] as List<dynamic>? ?? const [];
    final sIds = rawStationIds.map((item) {
      if (item is Map<String, dynamic>) {
        return item['_id']?.toString() ?? '';
      }
      return item.toString();
    }).where((id) => id.isNotEmpty).toList();

    return UserProfile(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'User',
      email: json['email']?.toString() ?? '-',
      role: json['role']?.toString() ?? '-',
      avatarUrl: json['avatarUrl']?.toString() ?? '',
      homeBackgroundUrl: json['homeBackgroundUrl']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      jobTitle: json['jobTitle']?.toString() ?? '',
      bio: json['bio']?.toString() ?? '',
      stationIds: sIds,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'avatarUrl': avatarUrl,
      'homeBackgroundUrl': homeBackgroundUrl,
      'phone': phone,
      'jobTitle': jobTitle,
      'bio': bio,
      'stationIds': stationIds,
    };
  }
}