import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../../../core/errors/api_error.dart';
import '../../../../../../data/models/locker.dart';
import '../../../../../../data/remote/api_client.dart';

/// Screen displaying the user's lockers and locker management options.
class MyLockersScreen extends StatefulWidget {
  const MyLockersScreen({
    super.key,
    required this.client,
    required this.selectedStationId,
  });

  final ApiClient client;
  final String selectedStationId;

  @override
  State<MyLockersScreen> createState() => _MyLockersScreenState();
}

class _MyLockersScreenState extends State<MyLockersScreen> {
  static const _bg = Color(0xFFF6F5F1);
  static const _card = Colors.white;
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);
  static const _olive = Color(0xFF5B5A3D);

  Locker? _locker;
  bool _loading = true;
  String? _error;
  DateTime? _lastUpdatedAt;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _loadLockerDetails();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _loadLockerDetails(silent: true);
    });
  }

  @override
  void didUpdateWidget(covariant MyLockersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedStationId != widget.selectedStationId) {
      _loadLockerDetails();
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadLockerDetails({bool silent = false}) async {
    if (widget.selectedStationId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _locker = null;
        _loading = false;
        _error = 'No station selected yet.';
      });
      return;
    }

    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final locker = await widget.client.fetchReservedLockerDetails(
        widget.selectedStationId,
      );
      if (!mounted) return;
      setState(() {
        _locker = locker;
        _loading = false;
        _error = null;
        _lastUpdatedAt = DateTime.now();
      });
    } catch (error) {
      if (!mounted) return;

      final message = error is ApiError ? error.message : error.toString();
      final noReservation = message.toLowerCase().contains(
        'no reserved locker',
      );

      setState(() {
        _locker = null;
        _loading = false;
        _error = noReservation ? null : message;
        _lastUpdatedAt = DateTime.now();
      });
    }
  }

  String _formatDateTime(DateTime? value) {
    if (value == null) return '-';
    final local = value.toLocal();
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');
    final ss = local.second.toString().padLeft(2, '0');
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')} $hh:$mm:$ss';
  }

  Color _availabilityColor(String availability) {
    switch (availability) {
      case 'reserved':
        return const Color(0xFFB85C58);
      case 'overdue':
        return const Color(0xFFA64112);
      case 'available':
        return const Color(0xFF4B8B3B);
      case 'queue_hold':
        return const Color(0xFF8A6E2F);
      default:
        return const Color(0xFF62605A);
    }
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: const TextStyle(
                color: _muted,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: _text, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Locker')),
      body: Container(
        color: _bg,
        child: RefreshIndicator(
          onRefresh: _loadLockerDetails,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 100),
            children: [
              const Text(
                'LIVE STATUS',
                style: TextStyle(
                  color: _muted,
                  fontSize: 12,
                  letterSpacing: 2.0,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: _card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE6E2DA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.hub_outlined, color: _olive),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Station: ${widget.selectedStationId.isEmpty ? '-' : widget.selectedStationId}',
                        style: const TextStyle(
                          color: _text,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (_lastUpdatedAt != null)
                      Text(
                        '${_lastUpdatedAt!.hour.toString().padLeft(2, '0')}:${_lastUpdatedAt!.minute.toString().padLeft(2, '0')}:${_lastUpdatedAt!.second.toString().padLeft(2, '0')}',
                        style: const TextStyle(
                          color: _muted,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(top: 120),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: _card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE6E2DA)),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 38,
                        color: Color(0xFFB85C58),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: _text,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _loadLockerDetails,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              else if (_locker == null)
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: _card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE6E2DA)),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.lock_open_outlined, size: 48, color: _muted),
                      SizedBox(height: 12),
                      Text(
                        'You do not have a reserved locker in this station.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _text,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: _card,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE6E2DA)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 14,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            _locker!.code,
                            style: const TextStyle(
                              fontSize: 34,
                              fontWeight: FontWeight.w900,
                              color: _text,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: _availabilityColor(
                                _locker!.availability,
                              ).withValues(alpha: 0.14),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              _locker!.availability.toUpperCase(),
                              style: TextStyle(
                                color: _availabilityColor(
                                  _locker!.availability,
                                ),
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                                letterSpacing: 0.7,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _detailRow('Locker state', _locker!.state ?? '-'),
                      _detailRow('Lock state', _locker!.lockState ?? '-'),
                      _detailRow('Door state', _locker!.doorState ?? '-'),
                      _detailRow('Reserved by', _locker!.reservedBy ?? '-'),
                      _detailRow(
                        'Reserved at',
                        _formatDateTime(_locker!.reservedAt),
                      ),
                      _detailRow(
                        'Overdue at',
                        _formatDateTime(_locker!.overdueAt),
                      ),
                      _detailRow(
                        'Release requested',
                        ((_locker!.releaseRequested ?? false) ? 'Yes' : 'No'),
                      ),
                      _detailRow(
                        'Release requested at',
                        _formatDateTime(_locker!.releaseRequestedAt),
                      ),
                      _detailRow(
                        'Last reported at',
                        _formatDateTime(_locker!.lastReportedAt),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
