import 'dart:async';
import 'package:flutter/material.dart';

import '../../../../../../core/errors/api_error.dart';
import '../../../../../../data/models/locker.dart';
import '../../../../../../data/models/station.dart';
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
    required this.stations,
    required this.onStationResolved,
  });

  final ApiClient client;
  final String selectedStationId;
  final List<Station> stations;
  final ValueChanged<String> onStationResolved;

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
  DateTime? _freeLimitEndsAt;
  String? _activeStationId;
  bool _loading = true;
  String? _error;
  Timer? _pollTimer;
  Timer? _clockTimer;
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
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _locker != null) {
        setState(() {});
      }
    });
  }

  @override
  void didUpdateWidget(covariant MyLockersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedStationId != widget.selectedStationId ||
        oldWidget.stations != widget.stations) {
      _loadLockerDetails();
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadLockerDetails({bool silent = false}) async {
    final candidateStationIds = <String>{
      if (widget.selectedStationId.isNotEmpty) widget.selectedStationId,
      ...widget.stations.map((station) => station.id),
    }.toList();

    if (candidateStationIds.isEmpty) {
      if (!mounted) return;
      setState(() {
        _locker = null;
        _freeLimitEndsAt = null;
        _activeStationId = null;
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
      Locker? locker;
      DateTime? freeLimitEndsAt;
      String? resolvedStationId;

      for (final stationId in candidateStationIds) {
        try {
          final candidateLocker = await widget.client.fetchReservedLockerDetails(
            stationId,
          );
          resolvedStationId = stationId;
          locker = candidateLocker;

          try {
            final timingPayload = await widget.client.fetchLockerTimeRemaining(
              stationId,
            );
            if (timingPayload['time_limit'] == true) {
              freeLimitEndsAt = DateTime.tryParse(
                timingPayload['expires_at']?.toString() ?? '',
              );
            }
          } catch (_) {
            freeLimitEndsAt = null;
          }
          break;
        } catch (error) {
          final message = error is ApiError
              ? error.message.toLowerCase()
              : error.toString().toLowerCase();
          if (message.contains('no reserved locker') ||
              message.contains('access denied')) {
            continue;
          }
          rethrow;
        }
      }

      if (!mounted) return;
      if (locker == null || resolvedStationId == null) {
        setState(() {
          _locker = null;
          _freeLimitEndsAt = null;
          _activeStationId = null;
          _loading = false;
          _error = null;
        });
        return;
      }

      setState(() {
        _locker = locker;
        _freeLimitEndsAt = freeLimitEndsAt;
        _activeStationId = resolvedStationId;
        _loading = false;
        _error = null;
      });

      if (resolvedStationId != widget.selectedStationId) {
        widget.onStationResolved(resolvedStationId);
      }
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _locker = null;
        _freeLimitEndsAt = null;
        _activeStationId = null;
        _loading = false;
        _error = message.toLowerCase().contains('no reserved locker') ? null : message;
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

  String _formatDuration(Duration duration) {
    final safeDuration = duration.isNegative ? Duration.zero : duration;
    final hours = safeDuration.inHours;
    final minutes = safeDuration.inMinutes.remainder(60);
    final seconds = safeDuration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours}h ${minutes.toString().padLeft(2, '0')}m';
    }

    return '${minutes}m ${seconds.toString().padLeft(2, '0')}s';
  }

  Future<void> _unlockLocker() async {
    if (_locker == null || _lockingUnlocking) return;
    final stationId = _activeStationId ?? widget.selectedStationId;
    if (stationId.isEmpty) return;
    setState(() {
      _lockingUnlocking = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.unlockLocker(
        stationId: stationId,
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
    final stationId = _activeStationId ?? widget.selectedStationId;
    if (stationId.isEmpty) return;
    setState(() {
      _lockingUnlocking = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.lockLocker(
        stationId: stationId,
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
    final stationId = _activeStationId ?? widget.selectedStationId;
    if (stationId.isEmpty) return;
    setState(() {
      _releasing = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.requestReleaseLocker(
        stationId: stationId,
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
    final now = DateTime.now();
    final freeLimitEndsAt = _freeLimitEndsAt;
    final stationLabel = (_activeStationId ?? widget.selectedStationId).toUpperCase();
    
    // Logic to determine timing state
    final bool hasLimit = freeLimitEndsAt != null;
    final bool isOverdue = hasLimit && now.isAfter(freeLimitEndsAt);

    String timingLabel;
    String timingValue;
    String timingSubtext;
    Color timingColor;
    IconData timingIcon;

    if (!hasLimit) {
      timingLabel = 'ACCESS STATUS';
      timingValue = 'UNLIMITED';
      timingSubtext = 'No time limit for this station';
      timingColor = _olive;
      timingIcon = Icons.lock_clock_rounded;
    } else if (isOverdue) {
      timingLabel = 'FREE TIME ENDED';
      timingValue = 'OVERDUE';
      timingSubtext = 'Exceeded by ${_formatDuration(now.difference(freeLimitEndsAt))}';
      timingColor = _errorRed;
      timingIcon = Icons.timer_off_rounded;
    } else {
      timingLabel = 'FREE TIME LEFT';
      timingValue = _formatDuration(freeLimitEndsAt.difference(now));
      timingSubtext = 'Ends at ${_formatDateTimeDetailed(freeLimitEndsAt)}';
      timingColor = _olive;
      timingIcon = Icons.hourglass_top_rounded;
    }

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
                          stationLabel,
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
                          timingLabel: timingLabel,
                          timingValue: timingValue,
                          timingSubtext: timingSubtext,
                          timingColor: isOverdue ? _errorRed : _olive,
                          timingIcon: isOverdue
                              ? Icons.timer_off_rounded
                              : Icons.hourglass_top_rounded,
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
