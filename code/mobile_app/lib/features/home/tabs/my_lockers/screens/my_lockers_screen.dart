import 'dart:async';
import 'package:flutter/material.dart';

import '../../../../../../core/errors/api_error.dart';
import '../../../../../../data/models/locker.dart';
import '../../../../../../data/remote/api_client.dart';
import '../widgets/empty_card.dart';
import '../widgets/error_card.dart';
import '../widgets/live_indicator.dart';
import '../widgets/locker_content.dart';

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
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);
  static const _olive = Color(0xFF5B5A3D);
  // static const _successGreen = Color(0xFF42B77A);
  // static const _successGreenLight = Color(0xFFE8F6ED);
  static const _errorRed = Color(0xFFE54B4B);

  Locker? _locker;
  bool _loading = true;
  String? _error;
  Timer? _pollTimer;
  bool _lockingUnlocking = false;
  bool _releasing = false;
  String? _actionMessage;
  Color? _actionMessageColor;

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
      });
    }
  }

  /// Custom date formatter to match the UI: "Tue, 19 May 2026 • 14:35"
  String _formatDateTimeDetailed(DateTime? value) {
    if (value == null) return '—';
    final local = value.toLocal();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final dayName = days[local.weekday - 1];
    final monthName = months[local.month - 1];
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');

    return '$dayName, ${local.day} $monthName ${local.year} • $hh:$mm';
  }

  Future<void> _unlockLocker() async {
    if (_locker == null || _lockingUnlocking) return;
    setState(() {
      _lockingUnlocking = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.unlockLocker(
        stationId: widget.selectedStationId,
        lockerId: _locker!.id,
      );
      if (!mounted) return;
      setState(() {
        _locker = updatedLocker;
        _lockingUnlocking = false;
      });
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _loadLockerDetails(silent: true);
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _lockingUnlocking = false;
        _actionMessage = message;
        _actionMessageColor = _errorRed;
      });
    }
  }

  Future<void> _lockLocker() async {
    if (_locker == null || _lockingUnlocking) return;
    setState(() {
      _lockingUnlocking = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.lockLocker(
        stationId: widget.selectedStationId,
        lockerId: _locker!.id,
      );
      if (!mounted) return;
      setState(() {
        _locker = updatedLocker;
        _lockingUnlocking = false;
      });
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _loadLockerDetails(silent: true);
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _lockingUnlocking = false;
        _actionMessage = message;
        _actionMessageColor = _errorRed;
      });
    }
  }

  Future<void> _requestReleaseLocker() async {
    if (_locker == null || _releasing) return;
    setState(() {
      _releasing = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.requestReleaseLocker(
        stationId: widget.selectedStationId,
        lockerId: _locker!.id,
      );
      if (!mounted) return;
      setState(() {
        _locker = updatedLocker;
        _releasing = false;
      });
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _loadLockerDetails(silent: true);
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _releasing = false;
        _actionMessage = message;
        _actionMessageColor = _errorRed;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: _olive,
          onRefresh: _loadLockerDetails,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverFillRemaining(
                hasScrollBody:
                    false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_loading)
                        const CircularProgressIndicator(
                          strokeWidth: 2,
                          color: _olive,
                        )
                      else if (_error != null)
                        ErrorCard(error: _error!, onRetry: _loadLockerDetails)
                      else if (_locker == null)
                        const EmptyCard()
                      else ...[
                        // Custom Header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [const LiveIndicator()],
                        ),
                        const SizedBox(height: 32),

                        // Station Name
                        Text(
                          widget.selectedStationId.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: _muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 2.0,
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Locker ID
                        Text(
                          'Locker ${_locker!.code}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: _text,
                            letterSpacing: -1.5,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Locker Content Widget
                        LockerContent(
                          locker: _locker!,
                          lockingUnlocking: _lockingUnlocking,
                          releasing: _releasing,
                          onUnlock: _unlockLocker,
                          onLock: _lockLocker,
                          onRelease: _requestReleaseLocker,
                          formatDateTime: _formatDateTimeDetailed,
                        ),

                        // Action Error Display
                        if (_actionMessage != null) ...[
                          const SizedBox(height: 16),
                          Text(
                            _actionMessage!,
                            style: TextStyle(
                              color: _actionMessageColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
