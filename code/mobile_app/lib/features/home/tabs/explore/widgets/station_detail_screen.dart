import 'package:flutter/material.dart';

import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';

class StationDetailScreen extends StatefulWidget {
  const StationDetailScreen({
    super.key,
    required this.client,
    required this.station,
    required this.initialLockers,
    required this.activeRequest,
  });

  final ApiClient client;
  final Station station;
  final List<Locker> initialLockers;
  final AccessRequest? activeRequest;

  @override
  State<StationDetailScreen> createState() => _StationDetailScreenState();
}

class _StationDetailScreenState extends State<StationDetailScreen> {
  late List<Locker> _lockers;
  AccessRequest? _activeRequest;
  bool _loading = false;
  bool _submittingRequest = false;

  @override
  void initState() {
    super.initState();
    _lockers = List<Locker>.from(widget.initialLockers);
    _activeRequest = widget.activeRequest;
  }

  Future<void> _refreshLockers() async {
    setState(() => _loading = true);
    try {
      final lockers = await widget.client.fetchLockers(widget.station.id);
      if (!mounted) return;
      setState(() => _lockers = lockers);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _requestLocker() async {
    final noteController = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request a Locker'),
        content: TextField(
          controller: noteController,
          decoration: const InputDecoration(
            hintText: 'Optional note to local admin',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(context).pop(noteController.text.trim()),
            child: const Text('Send Request'),
          ),
        ],
      ),
    );

    if (note == null) return;

    setState(() => _submittingRequest = true);

    try {
      final request =
          await widget.client.createLockerRequest(widget.station.id, note);
      if (!mounted) return;

      setState(() => _activeRequest = request);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Locker request submitted to local admins.'),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _submittingRequest = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final freeCount = _lockers.where((l) => !l.isBooked).length;
    final reservedCount = _lockers.length - freeCount;
    final canRequest = _activeRequest == null;

    return Scaffold(
      appBar: AppBar(title: Text(widget.station.name)),
      body: RefreshIndicator(
        onRefresh: _refreshLockers,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.station.name,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('Code: ${widget.station.code}'),
                    const SizedBox(height: 6),
                    Text(
                      'Available lockers: $freeCount / ${_lockers.length}',
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            label: 'Available',
                            value: freeCount.toString(),
                            color: const Color(0xFFE4ECE5),
                            borderColor: const Color(0xFFC3D8C6),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            label: 'Reserved',
                            value: reservedCount.toString(),
                            color: const Color(0xFFF3E9E8),
                            borderColor: const Color(0xFFE6C8C6),
                          ),
                        ),
                      ],
                    ),
                    if (_activeRequest != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Request status: ${_activeRequest!.status}',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed:
                            !_submittingRequest && canRequest
                                ? _requestLocker
                                : null,
                        child: _submittingRequest
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                canRequest
                                    ? 'Request Locker'
                                    : 'Request ${_activeRequest!.status}',
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Lockers',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_lockers.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No lockers found for this station.')),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _lockers.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.1,
                ),
                itemBuilder: (context, index) {
                  return _LockerChip(locker: _lockers[index]);
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _LockerChip extends StatelessWidget {
  const _LockerChip({required this.locker});

  final Locker locker;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: locker.isBooked
            ? const Color(0xFFF3E9E8)
            : const Color(0xFFE4ECE5),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: locker.isBooked
              ? const Color(0xFFE6C8C6)
              : const Color(0xFFC3D8C6),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            locker.code,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            locker.isBooked ? 'RESERVED' : 'AVAILABLE',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: locker.isBooked
                  ? Colors.red.shade300
                  : Colors.green.shade700,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
    required this.borderColor,
  });

  final String label;
  final String value;
  final Color color;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}