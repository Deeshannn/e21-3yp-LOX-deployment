import 'package:flutter/material.dart';

import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import '../widgets/locker_chip.dart';
import '../widgets/stat_card.dart';

/// A detailed view for a specific [Station], displaying its overall status,
/// available/reserved locker counts, and a grid of individual lockers.
///
/// Allows users to pull-to-refresh real-time locker statuses and submit
/// a new locker access request if they do not already have an active one.
class StationDetailScreen extends StatefulWidget {
  const StationDetailScreen({
    super.key,
    required this.client,
    required this.station,
    required this.initialLockers,
    required this.activeRequest,
  });

  /// The authenticated API client used to perform actions specific to this station.
  final ApiClient client;

  /// The station being viewed.
  final Station station;

  /// The list of lockers passed down from the parent screen. Used for immediate
  /// display before any fresh network calls are made.
  final List<Locker> initialLockers;

  /// The user's current pending or queued request for this specific station, if any.
  final AccessRequest? activeRequest;

  @override
  State<StationDetailScreen> createState() => _StationDetailScreenState();
}

class _StationDetailScreenState extends State<StationDetailScreen> {
  static const _bg = Color(0xFFF6F5F1);
  static const _muted = Color(0xFFA6A39B);
  static const _text = Color(0xFF1F1E1B);
  static const _olive = Color(0xFF5B5A3D);
  static const _track = Color(0xFFE7E4DD);

  /// The current, live list of lockers. Initialized from the widget's properties
  /// but can be updated via pull-to-refresh.
  late List<Locker> _lockers;

  /// The active request associated with this user and station. Kept in local state
  /// so the UI can instantly update once a new request is successfully submitted.
  AccessRequest? _activeRequest;

  bool _loading = false;
  bool _submittingRequest = false;

  @override
  void initState() {
    super.initState();
    // Copy the initial data provided by the parent into local state so we can mutate/update it independently while on this screen.
    _lockers = List<Locker>.from(widget.initialLockers);
    _activeRequest = widget.activeRequest;
  }

  /// Fetches the absolute latest locker data from the backend for this station.
  Future<void> _refreshLockers() async {
    setState(() => _loading = true);
    try {
      final lockers = await widget.client.fetchLockers(widget.station.id);
      if (!mounted) return;
      setState(() => _lockers = lockers);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Opens a dialog to capture an optional note, then submits a locker access request to the backend.
  ///
  /// Pops the screen and returns `true` to the caller if the request was successful,
  /// signaling the parent screen to refresh its master data.
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

    // If the user tapped 'Cancel' or dismissed the dialog, abort the process.
    if (note == null) return;

    setState(() => _submittingRequest = true);
    try {
      final request = await widget.client.createLockerRequest(
        widget.station.id,
        note,
      );
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _submittingRequest = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Calculate live metrics for the UI
    final freeCount = _lockers.where((l) => !l.isBooked).length;
    final reservedCount = _lockers.length - freeCount;
    final canRequest = _activeRequest == null;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        elevation: 0,
        iconTheme: const IconThemeData(color: _text),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshLockers,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(26),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Station icon + name row
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F0EC),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.lock_outline_rounded,
                          color: _olive,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.station.name,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: _text,
                              ),
                            ),
                            Text(
                              widget.station.code,
                              style: const TextStyle(
                                color: _muted,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Availability fraction text
                  Text(
                    '$freeCount / ${_lockers.length} available',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: _olive,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Progress bar (same as StationCard)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: _lockers.isEmpty
                          ? 0.0
                          : (freeCount / _lockers.length).clamp(0.0, 1.0),
                      minHeight: 8,
                      backgroundColor: _track,
                      valueColor: const AlwaysStoppedAnimation(_olive),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Stat cards row  (keep your existing StatCard widgets)
                  Row(
                    children: [
                      Expanded(
                        child: StatCard(
                          label: 'Available',
                          value: freeCount.toString(),
                          color: const Color(0xFFE4ECE5),
                          borderColor: const Color(0xFFC3D8C6),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: StatCard(
                          label: 'Reserved',
                          value: reservedCount.toString(),
                          color: const Color(0xFFF3E9E8),
                          borderColor: const Color(0xFFE6C8C6),
                        ),
                      ),
                    ],
                  ),

                  // Active request status
                  if (_activeRequest != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F0EC),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Request status: ${_activeRequest!.status}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: _text,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // CTA Button
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: _olive,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: !_submittingRequest && canRequest
                          ? _requestLocker
                          : null,
                      child: _submittingRequest
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              canRequest
                                  ? 'Request Locker'
                                  : 'Request ${_activeRequest!.status}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),
            const Text(
              'LOCKERS',
              style: TextStyle(
                color: _muted,
                fontSize: 12,
                letterSpacing: 2.2,
                fontWeight: FontWeight.w800,
              ),
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
                child: Center(
                  child: Text('No lockers found for this station.'),
                ),
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
                itemBuilder: (context, index) =>
                    // LockerChip widget creates to represent each locker in the grid.
                    LockerChip(locker: _lockers[index]),
              ),
          ],
        ),
      ),
    );
  }
}
