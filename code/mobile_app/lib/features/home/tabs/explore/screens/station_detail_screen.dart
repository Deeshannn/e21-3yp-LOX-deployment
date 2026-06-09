import 'package:flutter/material.dart';

import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';
import '../widgets/locker_chip.dart';
import '../widgets/stat_card.dart';

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

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _refreshLockers() async {
    setState(() => _loading = true);
    try {
      final lockers = await widget.client.fetchLockers(widget.station.id);
      if (!mounted) return;
      setState(() => _lockers = lockers);
    } catch (error) {
      _show(error.toString());
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
      final request = await widget.client.createLockerRequest(
        widget.station.id,
        note,
      );
      if (!mounted) return;
      setState(() => _activeRequest = request);
      _show('Locker request submitted to local admins.');
      Navigator.of(context).pop(true);
    } catch (error) {
      _show(error.toString());
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
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        iconTheme: IconThemeData(color: AppColors.textMain),
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
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F0EC),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          Icons.lock_outline_rounded,
                          color: AppColors.olive,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.station.name,
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: AppColors.textMain,
                              ),
                            ),
                            Text(
                              'Code: ${widget.station.code} • Hours: ${widget.station.openTime} - ${widget.station.closeTime}',
                              style: TextStyle(
                                color: AppColors.textLabel,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  Text(
                    '$freeCount / ${_lockers.length} available',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.olive,
                    ),
                  ),
                  const SizedBox(height: 8),

                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: _lockers.isEmpty
                          ? 0.0
                          : (freeCount / _lockers.length).clamp(0.0, 1.0),
                      minHeight: 8,
                      backgroundColor: AppColors.fieldBackground,
                      valueColor: const AlwaysStoppedAnimation(AppColors.olive),
                    ),
                  ),
                  const SizedBox(height: 16),

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
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMain,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.olive,
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'LOCKERS',
                  style: TextStyle(
                    color: AppColors.textLabel,
                    fontSize: 12,
                    letterSpacing: 2.2,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
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
                itemBuilder: (context, index) {
                  return LockerChip(locker: _lockers[index]);
                },
              ),
          ],
        ),
      ),
    );
  }
}
