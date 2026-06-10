import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../core/utils/reservation_phase.dart';
import '../../../../../core/theme/app_colors.dart';

/// A self-updating widget that shows the reservation phase as a colored badge.
/// Ticks every second as long as it's mounted.
class FreeCountdownBadge extends StatefulWidget {
  const FreeCountdownBadge({
    super.key,
    required this.locker,
    required this.station,
  });

  final Locker locker;
  final Station station;

  @override
  State<FreeCountdownBadge> createState() => _FreeCountdownBadgeState();
}

class _FreeCountdownBadgeState extends State<FreeCountdownBadge> {
  late Timer _timer;
  late ReservationStatus _status;

  @override
  void initState() {
    super.initState();
    _status = computeReservationStatus(widget.locker, widget.station);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _status = computeReservationStatus(widget.locker, widget.station);
        });
      }
    });
  }

  @override
  void didUpdateWidget(FreeCountdownBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Immediately recompute if the locker/station data changed (e.g., after refresh)
    _status = computeReservationStatus(widget.locker, widget.station);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _buildBadge();
  }

  Widget _buildBadge() {
    switch (_status.phase) {
      case ReservationPhase.active:
        return _badge(
          color: const Color(0xFF027A48),
          bgColor: const Color(0xFF027A48),
          icon: Icons.timer_outlined,
          label: 'FREE TIME REMAINING',
          value: formatCountdown(_status.timeRemainingMs),
        );

      case ReservationPhase.overdue:
        return _pulseBadge(
          color: const Color(0xFFB42318),
          bgColor: const Color(0xFFB42318),
          icon: Icons.warning_amber_rounded,
          label: 'OVERDUE',
          value: formatOverdueDuration(_status.overdueMs),
          subtext: 'Fee: \$${_status.chargeAmount.toStringAsFixed(2)}',
        );

      case ReservationPhase.overdueReleased:
        return _badge(
          color: AppColors.olive,
          bgColor: AppColors.olive,
          icon: Icons.check_circle_outline_rounded,
          label: 'GRACE PERIOD',
          value: formatCountdown(_status.timeRemainingMs),
          subtext: 'Unlock & retrieve your items now',
        );
    }
  }

  Widget _badge({
    required Color color,
    required Color bgColor,
    required IconData icon,
    required String label,
    required String value,
    String? subtext,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: bgColor.withOpacity(0.22)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                    color: color.withOpacity(0.75),
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: color,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                if (subtext != null)
                  Text(
                    subtext,
                    style: TextStyle(
                      fontSize: 11,
                      color: color.withOpacity(0.75),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pulseBadge({
    required Color color,
    required Color bgColor,
    required IconData icon,
    required String label,
    required String value,
    String? subtext,
  }) {
    // Use TweenAnimationBuilder for a pulsing alpha effect on overdue
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.08, end: 0.16),
      duration: const Duration(seconds: 1),
      curve: Curves.easeInOut,
      builder: (_, alpha, child) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: bgColor.withOpacity(alpha),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: bgColor.withOpacity(0.3)),
        ),
        child: child,
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                    color: color.withOpacity(0.75),
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: color,
                  ),
                ),
                if (subtext != null)
                  Text(
                    subtext,
                    style: TextStyle(
                      fontSize: 12,
                      color: color,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
