import '../../data/models/locker.dart';
import '../../data/models/station.dart';

/// The lifecycle phase of a locker reservation.
enum ReservationPhase {
  /// Still within the free window — countdown shows time remaining.
  active,

  /// Free window expired — user must pay before unlocking or releasing.
  overdue,

  /// Payment complete — grace period to physically retrieve items.
  overdueReleased,
}

/// Computed metadata about the current reservation state.
class ReservationStatus {
  const ReservationStatus({
    required this.phase,
    required this.timeRemainingMs,
    required this.overdueMs,
    required this.chargeAmount,
    this.graceEndsAt,
    this.freeEndsAt,
  });

  final ReservationPhase phase;

  /// For ACTIVE: ms until free window ends.
  /// For OVERDUE_RELEASED: ms until grace period ends.
  /// For OVERDUE: 0.
  final int timeRemainingMs;

  /// For OVERDUE: how long the locker has been overdue in ms.
  final int overdueMs;

  /// Calculated overdue charge in USD (minimum $0.50).
  final double chargeAmount;

  /// When the grace period ends (OVERDUE_RELEASED only).
  final DateTime? graceEndsAt;

  /// When the free window ended (or ends).
  final DateTime? freeEndsAt;

  bool get isActive => phase == ReservationPhase.active;
  bool get isOverdue => phase == ReservationPhase.overdue;
  bool get isOverdueReleased => phase == ReservationPhase.overdueReleased;
}

/// Compute the current reservation phase for a locker.
///
/// Pass the [station] for freeDurationMinutes / gracePeriodMinutes / overdueRatePerHour.
ReservationStatus computeReservationStatus(Locker locker, Station station) {
  final now = DateTime.now();
  final freeDuration = Duration(minutes: station.freeDurationMinutes);
  final gracePeriod = Duration(minutes: station.gracePeriodMinutes);

  if (locker.reservedAt == null || !locker.isBooked) {
    // Fallback — should not normally happen for an active locker
    return const ReservationStatus(
      phase: ReservationPhase.active,
      timeRemainingMs: 0,
      overdueMs: 0,
      chargeAmount: 0,
    );
  }

  final reservedAt = locker.reservedAt!;
  final freeEndsAt = reservedAt.add(freeDuration);
  final elapsed = now.difference(reservedAt);

  // OVERDUE_RELEASED: payment done, check if grace period still active
  if (locker.overdueReleasedAt != null) {
    final graceEndsAt = locker.overdueReleasedAt!.add(gracePeriod);
    final graceRemaining = graceEndsAt.difference(now);
    
    if (graceRemaining.isNegative) {
      // Grace period expired! Revert to overdue.
      final overdueElapsed = now.difference(graceEndsAt);
      final overdueHours = overdueElapsed.inMilliseconds / (1000 * 60 * 60);
      final charge = (overdueHours * station.overdueRatePerHour).clamp(0.50, double.infinity);
      return ReservationStatus(
        phase: ReservationPhase.overdue,
        timeRemainingMs: 0,
        overdueMs: overdueElapsed.inMilliseconds,
        chargeAmount: double.parse(charge.toStringAsFixed(2)),
        graceEndsAt: graceEndsAt,
        freeEndsAt: freeEndsAt,
      );
    }

    return ReservationStatus(
      phase: ReservationPhase.overdueReleased,
      timeRemainingMs: graceRemaining.inMilliseconds,
      overdueMs: 0,
      chargeAmount: 0,
      graceEndsAt: graceEndsAt,
      freeEndsAt: freeEndsAt,
    );
  }

  // ACTIVE: still within free window
  if (elapsed < freeDuration) {
    final remaining = freeDuration - elapsed;
    return ReservationStatus(
      phase: ReservationPhase.active,
      timeRemainingMs: remaining.inMilliseconds,
      overdueMs: 0,
      chargeAmount: 0,
      graceEndsAt: null,
      freeEndsAt: freeEndsAt,
    );
  }

  // OVERDUE
  final overdueElapsed = elapsed - freeDuration;
  final overdueHours = overdueElapsed.inMilliseconds / (1000 * 60 * 60);
  final charge = (overdueHours * station.overdueRatePerHour).clamp(0.50, double.infinity);

  return ReservationStatus(
    phase: ReservationPhase.overdue,
    timeRemainingMs: 0,
    overdueMs: overdueElapsed.inMilliseconds,
    chargeAmount: double.parse(charge.toStringAsFixed(2)),
    graceEndsAt: null,
    freeEndsAt: freeEndsAt,
  );
}

/// Format a duration in milliseconds as MM:SS or HH:MM:SS.
String formatCountdown(int ms) {
  if (ms <= 0) return '00:00';
  final d = Duration(milliseconds: ms);
  final h = d.inHours;
  final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (h > 0) return '$h:$m:$s';
  return '$m:$s';
}

/// Format overdue duration as human-readable string (e.g. "2h 15m overdue").
String formatOverdueDuration(int ms) {
  final totalMins = (ms / 60000).floor();
  final h = totalMins ~/ 60;
  final m = totalMins % 60;
  if (h > 0) return '${h}h ${m}m overdue';
  return '${m}m overdue';
}
