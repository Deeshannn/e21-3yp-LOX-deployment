import 'package:flutter/material.dart';

import '../../../../../core/extensions/string_extensions.dart';
import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/station.dart';

class RequestsScreen extends StatelessWidget {
  const RequestsScreen({
    super.key,
    required this.requests,
    required this.stations,
    required this.onRefresh,
  });

  final List<AccessRequest> requests;
  final List<Station> stations;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final stationMap = {for (final s in stations) s.id: s};

    if (requests.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          children: const [
            SizedBox(height: 120),
            Icon(Icons.bookmark_border, size: 64),
            SizedBox(height: 8),
            Center(child: Text('No locker requests yet.')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: requests.length,
        itemBuilder: (context, index) {
          final request = requests[index];
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
                  if (request.note.isNotEmpty) Text('Note: ${request.note}'),
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
        },
      ),
    );
  }
}