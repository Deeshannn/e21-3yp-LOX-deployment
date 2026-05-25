import 'package:flutter/material.dart';

import '../../../../../core/extensions/string_extensions.dart';
import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import 'station_lockers_screen.dart';

class RequestsScreen extends StatelessWidget {
  const RequestsScreen({
    super.key,
    required this.requests,
    required this.stations,
    required this.membershipStatuses,
    required this.onRefresh,
    required this.client,
  });

  final List<AccessRequest> requests;
  final List<Station> stations;
  final Map<String, String> membershipStatuses;
  final Future<void> Function() onRefresh;
  final ApiClient client;

  @override
  Widget build(BuildContext context) {
    final stationMap = {for (final s in stations) s.id: s};
    final membershipEntries = membershipStatuses.entries
        .where(
          (entry) => entry.value == 'pending' || entry.value == 'member',
        )
        .toList()
      ..sort((a, b) {
        final aName = stationMap[a.key]?.name ?? '';
        final bName = stationMap[b.key]?.name ?? '';
        return aName.compareTo(bName);
      });

    if (requests.isEmpty && membershipEntries.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 120),
            Icon(Icons.bookmark_border, size: 64),
            SizedBox(height: 8),
            Center(child: Text('No requests yet.')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (membershipEntries.isNotEmpty) ...[
            const Text(
              'Memberships',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            ...membershipEntries.map((entry) {
              final stationName =
                  stationMap[entry.key]?.name ?? 'Unknown station';
              final isPending = entry.value == 'pending';
              final station = stationMap[entry.key];

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: !isPending && station != null
                      ? () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => StationLockersScreen(
                                station: station,
                                client: client,
                              ),
                            ),
                          );
                        }
                      : null,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stationName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          isPending
                              ? 'Membership status: Pending approval'
                              : 'Membership status: Approved member',
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
          if (requests.isNotEmpty) ...[
            if (membershipEntries.isNotEmpty) const SizedBox(height: 8),
            const Text(
              'Locker Requests',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            ...requests.map((request) {
              final station = stationMap[request.stationId];
              final stationName =
                  station?.name ?? request.stationName.ifEmpty('Unknown station');

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        stationName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text('Status: ${request.status}'),
                      if (request.note.isNotEmpty)
                        Text('Note: ${request.note}'),
                      if (request.lockerCode.isNotEmpty)
                        Text('Assigned locker: ${request.lockerCode}'),
                      if (request.createdAt != null)
                        Text(
                          'Created: ${request.createdAt!.toLocal().toString().split('.').first}',
                          style: const TextStyle(color: Colors.black54),
                        ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}