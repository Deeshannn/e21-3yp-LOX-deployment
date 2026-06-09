import 'package:flutter/material.dart';

import '../../../../../core/extensions/string_extensions.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../widgets/active_locker_card.dart';

class RequestsScreen extends StatelessWidget {
  const RequestsScreen({
    super.key,
    required this.requests,
    required this.stations,
    required this.client,
    required this.user,
    required this.lockersByStation,
    required this.onRefresh,
  });

  final List<AccessRequest> requests;
  final List<Station> stations;
  final ApiClient client;
  final UserProfile user;
  final Map<String, List<Locker>> lockersByStation;
  final Future<void> Function() onRefresh;

  Locker? _findLockerForRequest(AccessRequest r) {
    if (r.lockerId.isEmpty) return null;
    final lockers = lockersByStation[r.stationId];
    if (lockers == null) return null;
    try {
      return lockers.firstWhere((l) => l.id == r.lockerId);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final stationMap = {for (final s in stations) s.id: s};

    // Find user's active APPROVED request to control
    AccessRequest? activeRequest;
    Locker? activeLocker;
    for (final r in requests) {
      if (r.status == 'APPROVED') {
        final l = _findLockerForRequest(r);
        if (l != null && l.isBooked && (l.currentUserId == user.id || l.activeRequestId == r.id)) {
          activeRequest = r;
          activeLocker = l;
          break;
        }
      }
    }

    if (requests.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          title: const Text(
            'My Bookings',
            style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textMain),
          ),
        ),
        body: RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            children: const [
              SizedBox(height: 120),
              Icon(Icons.bookmark_border, size: 64, color: AppColors.textMuted),
              SizedBox(height: 8),
              Center(
                child: Text(
                  'No locker requests yet.',
                  style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLabel),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Filter requests list to exclude the one being controlled in the active card
    final listRequests = requests.where((r) => r.id != activeRequest?.id).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'My Bookings',
          style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textMain),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            children: [
              // Active locker control card
              if (activeLocker != null && activeRequest != null) ...[
                ActiveLockerCard(
                  locker: activeLocker,
                  stationName: stationMap[activeRequest.stationId]?.name ?? activeRequest.stationName.ifEmpty('Station'),
                  client: client,
                  onRefresh: onRefresh,
                ),
                const SizedBox(height: 20),
                const Text(
                  'REQUEST HISTORY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.8,
                    color: AppColors.textLabel,
                  ),
                ),
                const SizedBox(height: 10),
              ],

              // History list
              ...listRequests.map((request) {
                final station = stationMap[request.stationId];
                final stationName = station?.name ?? request.stationName.ifEmpty('Unknown station');

                Color statusColor = AppColors.textLabel;
                if (request.status == 'APPROVED') statusColor = AppColors.olive;
                if (request.status == 'QUEUED') statusColor = const Color(0xFFD97706);
                if (request.status == 'REJECTED' || request.status == 'CANCELLED') {
                  statusColor = const Color(0xFFC95454);
                }

                return Card(
                  color: Colors.white,
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: Colors.black.withOpacity(0.06)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              stationName,
                              style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textMain),
                            ),
                            Text(
                              request.status,
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                                color: statusColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        if (request.note.isNotEmpty)
                          Text(
                            'Note: ${request.note}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 13,
                                color: AppColors.textLabel),
                          ),
                        if (request.lockerCode.isNotEmpty)
                          Text(
                            'Assigned locker: ${request.lockerCode}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: AppColors.olive),
                          ),
                        if (request.createdAt != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Submitted: ${request.createdAt!.toLocal().toString().split('.').first}',
                            style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 11,
                                fontWeight: FontWeight.w600),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}