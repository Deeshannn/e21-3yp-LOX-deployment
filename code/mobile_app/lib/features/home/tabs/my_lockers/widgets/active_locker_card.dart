import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/services/biometric_service.dart';
import '../../../../../core/utils/reservation_phase.dart';
import 'free_countdown_badge.dart';

class ActiveLockerCard extends StatefulWidget {
  const ActiveLockerCard({
    super.key,
    required this.locker,
    required this.stationName,
    required this.station,
    required this.client,
    required this.onRefresh,
  });

  final Locker locker;
  final String stationName;
  final Station station;
  final ApiClient client;
  final VoidCallback onRefresh;

  @override
  State<ActiveLockerCard> createState() => _ActiveLockerCardState();
}

class _ActiveLockerCardState extends State<ActiveLockerCard> {
  bool _busy = false;
  ReservationStatus? _status;
  Timer? _phaseTimer;

  @override
  void initState() {
    super.initState();
    _recomputePhase();
    // Update phase every second for responsive UI
    _phaseTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) _recomputePhase();
    });
  }

  @override
  void didUpdateWidget(ActiveLockerCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    _recomputePhase();
  }

  @override
  void dispose() {
    _phaseTimer?.cancel();
    super.dispose();
  }

  void _recomputePhase() {
    if (!mounted) return;
    setState(() {
      _status = computeReservationStatus(widget.locker, widget.station);
    });
  }

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _runCommand(Future<void> Function() command, String successMsg) async {
    setState(() => _busy = true);
    try {
      await command();
      _show(successMsg);
      widget.onRefresh();
    } catch (e) {
      _show(e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _onUnlockPressed() async {
    final isEnabled = await BiometricService.instance.isBiometricEnabled();
    if (isEnabled) {
      final authenticated = await BiometricService.instance.authenticate(
        'Confirm your identity to unlock locker ${widget.locker.code}',
      );
      if (!authenticated) {
        _show('Biometric verification failed. Unlock cancelled.');
        return;
      }
    }

    _runCommand(
      () => widget.client.unlockLocker(widget.locker.id),
      'Locker unlocked successfully.',
    );
  }

  /// Opens the Stripe overdue checkout URL in the browser.
  Future<void> _onPayOverduePressed() async {
    setState(() => _busy = true);
    try {
      final result = await widget.client.createOverdueCheckout(widget.locker.id);
      final checkoutUrl = result['checkoutUrl']?.toString() ?? '';
      if (checkoutUrl.isEmpty) throw Exception('No checkout URL received');

      final uri = Uri.parse(checkoutUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        _show('Complete the payment in the browser, then return here and refresh.');
      } else {
        _show('Could not open payment page. Please try again.');
      }
    } catch (e) {
      _show('Payment error: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lock = widget.locker.lockState;
    final door = widget.locker.doorState;
    final alert = widget.locker.securityAlertActive;
    final phase = _status?.phase;

    final isLocked = lock == 'LOCKED';
    final isClosed = door == 'CLOSED';
    final isOverdue = phase == ReservationPhase.overdue;
    final isOverdueReleased = phase == ReservationPhase.overdueReleased;

    // Card border color based on phase
    Color borderColor;
    if (isOverdue) {
      borderColor = const Color(0xFFB42318).withOpacity(0.4);
    } else if (alert) {
      borderColor = const Color(0xFFF8B4B4);
    } else {
      borderColor = Colors.black.withOpacity(0.06);
    }

    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(
          color: borderColor,
          width: isOverdue ? 1.8 : (alert ? 1.5 : 1),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Code and Station name
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: (isOverdue ? const Color(0xFFB42318) : AppColors.olive).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    widget.locker.code,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: isOverdue ? const Color(0xFFB42318) : AppColors.olive,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MY ASSIGNED LOCKER',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: AppColors.textLabel,
                        ),
                      ),
                      Text(
                        widget.stationName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: AppColors.textMain,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_busy)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.olive),
                  ),
              ],
            ),

            const SizedBox(height: 14),

            // Free countdown / overdue badge
            if (widget.locker.reservedAt != null)
              FreeCountdownBadge(
                locker: widget.locker,
                station: widget.station,
              ),

            const SizedBox(height: 14),

            // Telemetry Badges
            Row(
              children: [
                Expanded(
                  child: _buildStateBadge(
                    'LOCK STATE',
                    lock,
                    isLocked ? Icons.lock_outline_rounded : Icons.lock_open_rounded,
                    isLocked ? AppColors.olive : const Color(0xFFD97706),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildStateBadge(
                    'DOOR STATE',
                    door,
                    isClosed ? Icons.sensor_door_outlined : Icons.sensor_door,
                    isClosed ? AppColors.olive : const Color(0xFFC95454),
                  ),
                ),
              ],
            ),

            // Security Alert Box
            // if (alert) ...[
            //   const SizedBox(height: 14),
            //   Container(
            //     padding: const EdgeInsets.all(12),
            //     decoration: BoxDecoration(
            //       color: const Color(0xFFFDE8E8),
            //       borderRadius: BorderRadius.circular(12),
            //       border: Border.all(color: const Color(0xFFF8B4B4)),
            //     ),
            //     child: Row(
            //       children: [
            //         const Icon(Icons.warning_amber_rounded, color: Color(0xFFC81E1E)),
            //         const SizedBox(width: 10),
            //         Expanded(
            //           child: Text(
            //             widget.locker.securityAlertMessage.isNotEmpty
            //                 ? widget.locker.securityAlertMessage
            //                 : 'Security warning active!',
            //             style: const TextStyle(
            //               color: Color(0xFFC81E1E),
            //               fontWeight: FontWeight.w800,
            //               fontSize: 12,
            //             ),
            //           ),
            //         ),
            //       ],
            //     ),
            //   ),
            // ],

            const Divider(height: 28),

            // --- Action Buttons ---

            // OVERDUE: only show payment button
            if (isOverdue) ...[
              _buildOverduePaySection(),
            ]
            // OVERDUE_RELEASED: show unlock + release only
            else if (isOverdueReleased) ...[
              _buildOverdueReleasedSection(),
            ]
            // ACTIVE: full controls
            else ...[
              _buildNormalControls(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOverduePaySection() {
    final charge = _status?.chargeAmount ?? 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFDE8E8),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFF8B4B4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Payment Required',
                style: TextStyle(
                  color: Color(0xFFC81E1E),
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Your free storage period has expired. Pay the overdue fee to unlock and retrieve your items.',
                style: TextStyle(
                  color: const Color(0xFFC81E1E).withOpacity(0.8),
                  fontSize: 12,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFB42318),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          onPressed: _busy ? null : _onPayOverduePressed,
          icon: const Icon(Icons.credit_card_rounded, size: 20),
          label: Text(
            charge > 0 ? 'Pay \$${charge.toStringAsFixed(2)} Overdue Fee' : 'Pay Overdue Fee',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'After payment, you will have a grace period to retrieve your items.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
        ),
      ],
    );
  }

  Widget _buildOverdueReleasedSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF6EE7B7)),
          ),
          child: const Row(
            children: [
              Icon(Icons.check_circle_rounded, color: Color(0xFF027A48), size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Payment confirmed! Unlock your locker and retrieve your items during the grace period.',
                  style: TextStyle(
                    color: Color(0xFF027A48),
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.olive,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _busy ? null : _onUnlockPressed,
                icon: const Icon(Icons.lock_open, size: 18),
                label: const Text('Unlock', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFC95454),
                  side: const BorderSide(color: Color(0xFFC95454)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _busy
                    ? null
                    : () => _runCommand(
                          () => widget.client.releaseLocker(widget.locker.id),
                          'Locker reservation released.',
                        ),
                icon: const Icon(Icons.close, size: 18),
                label: const Text('Release', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildNormalControls() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.olive,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _busy ? null : _onUnlockPressed,
                icon: const Icon(Icons.lock_open, size: 18),
                label: const Text('Unlock', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.oliveDark,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _busy
                    ? null
                    : () => _runCommand(
                          () => widget.client.lockLocker(widget.locker.id),
                          'Locker locked successfully.',
                        ),
                icon: const Icon(Icons.lock, size: 18),
                label: const Text('Lock', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFC95454),
            side: const BorderSide(color: Color(0xFFC95454)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onPressed: _busy
              ? null
              : () => _runCommand(
                    () => widget.client.releaseLocker(widget.locker.id),
                    'Locker reservation released.',
                  ),
          icon: const Icon(Icons.close, size: 18),
          label: const Text('Release Booking', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildStateBadge(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.18)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textLabel,
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: color,
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
